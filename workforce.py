"""Versioned local workforce planning. Operational rules, not a payroll/legal engine."""
import copy, json, math, uuid, hashlib
from workforce_reference import defaults as reference_defaults, operation as reference_operation, profile_fields
from workforce_availability import defaults as period_defaults, operation as period_operation, decision as period_decision
from workforce_marketplace import defaults as marketplace_defaults, operation as marketplace_operation
from workforce_planner import defaults as planner_defaults, operation as planner_operation, extra_reasons, crew_issues, opportunities, rank as plan_rank, optimize, objective
from workforce_import import operation as import_operation, preview as import_preview
from workforce_tips import defaults as tips_defaults, operation as tips_operation, stale as tips_stale, guard_attendance
from pathlib import Path
from workforce_operations import defaults, operation
from workforce_policy import defaults as policy_defaults, operation as policy_operation, guard, unlocked, availability_open, effective_cost, publication_messages
from datetime import date, datetime, timedelta

ROLES={'manager':'מנהל','shift_manager':'מנהל משמרת','waiter':'מלצר','runner':'ראנר','bar':'בר','host':'אירוח','kitchen':'מטבח','cleaning':'ניקיון'}
def key(): return str(uuid.uuid4())
def stamp(): return datetime.now().astimezone().isoformat()
def initial(): return {'restaurant':'קימוראיה','roles':ROLES.copy(),'periods':{'morning':'בוקר','evening':'ערב'},'profiles':{},'availability':{},'slots':[],'published':{},'requests':[],'points':[],'claims':[],'rewards':[{'id':'wine-500','title':'בקבוק יין','threshold':500}], 'rules':{'min_rest':11,'max_shift':12}}

class Workforce:
    def __init__(self,store,error):
        self.store,self.error=store,error
        from workforce_files import initialize
        initialize(store)
        from workforce_simulation import initialize as initialize_simulations
        initialize_simulations(store)
        manifest=Path(__file__).parent/'private/workforce-imports/manifest.json'
        self.sources=json.loads(manifest.read_text(encoding='utf8'))['sources'] if manifest.exists() else []
        with store.connect(write=True) as c:
            c.execute('CREATE TABLE IF NOT EXISTS workforce_state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL)')
            c.execute('INSERT OR IGNORE INTO workforce_state VALUES(1,1,?)',(json.dumps(initial()),))

    def check(self,ok,message,status=400):
        if not ok: raise self.error(message,status)

    def day(self,value):
        try:
            self.check(isinstance(value,str) and len(value)==10,'תאריך לא תקין')
            return date.fromisoformat(value)
        except (ValueError,TypeError): raise self.error('תאריך לא תקין')

    def week(self,value):
        d=self.day(value);return (d-timedelta(days=(d.weekday()+1)%7)).isoformat()

    def number(self,value,low,high):
        self.check(isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value) and low<=value<=high,'ערך מספרי מחוץ לטווח')
        return value

    def interval(self,s):
        d=self.day(s.get('date'));values=[]
        for field in ('start','end'):
            value=s.get(field)
            try:
                self.check(isinstance(value,str) and len(value)==5,'שעה לא תקינה')
                values.append(datetime.combine(d,datetime.strptime(value,'%H:%M').time()))
            except (ValueError,TypeError):raise self.error('שעה לא תקינה')
        self.check(values[0]!=values[1],'משמרת אינה יכולה להיות באורך אפס')
        if values[1]<values[0]:values[1]+=timedelta(days=1)
        return values

    def duration(self,row):
        if row.get('actual_start') and row.get('actual_end') and not row.get('corrected'):
            return (datetime.fromisoformat(row['actual_end'])-datetime.fromisoformat(row['actual_start'])).total_seconds()/3600
        start,end=self.interval(row);return (end-start).total_seconds()/3600

    def read(self,c):
        r=c.execute('SELECT * FROM workforce_state WHERE id=1').fetchone()
        data=json.loads(r['data'])
        for field,value in initial().items():data.setdefault(field,copy.deepcopy(value))
        defaults(data)
        policy_defaults(data)
        tips_defaults(data)
        planner_defaults(data)
        marketplace_defaults(data)
        reference_defaults(data)
        period_defaults(data)
        people=[dict(r) for r in c.execute('SELECT id,name,role,active FROM employees ORDER BY name')]
        return data,r['revision'],people

    def state(self,week):
        week=self.week(week)
        with self.store.connect() as c:
            data,revision,people=self.read(c)
            legacy=[dict(r) for r in c.execute('SELECT * FROM shifts')]
        for row in data['tips']:row['stale']=tips_stale(row,data['attendance'])
        return {**data,'revision':revision,'employees':people,'sources':self.sources,'week':week,'report':self.report(data,week,people,legacy),'local_review':True,'fairness':opportunities(self,data,week,people)}

    def export_report(self,kind,start,end,employee=None,source='published'):
        from workforce_reports import build
        with self.store.connect() as c:
            data,revision,people=self.read(c)
        return {**build(self,data,people,kind,start,end,employee,source),'revision':revision}

    def employee(self,people,employee):
        self.check(any(p['id']==employee and p['active'] for p in people),'יש לבחור עובד פעיל',404)

    def occupied(self,data,employee,exclude=None,legacy=(),planning_week=None):
        result=[]
        for s in data['slots']:
            if s['id']!=exclude and employee in s['employees']:result.append(s)
        # Adjacent published weeks remain commitments even if their next draft changed.
        signatures={(s['id'],s['date'],s['start'],s['end']) for s in result}
        for week,versions in data['published'].items():
            if not versions or week==planning_week or not data.get('publication_status',{}).get(week,True):continue
            for s in versions[-1]['slots']:
                signature=(s['id'],s['date'],s['start'],s['end'])
                if employee in s['employees'] and signature not in signatures and s['id']!=exclude:
                    result.append(s);signatures.add(signature)
        result.extend(s for s in legacy if s['employee_id']==employee)
        return result

    def reasons(self,data,slot,employee,people,legacy=()):
        reasons=[];p=data['profiles'].get(employee,{})
        if not any(x['id']==employee and x['active'] for x in people):return ['עובד לא פעיל']
        if slot['role'] not in p.get('roles',[]):reasons.append('אין כשירות לתפקיד')
        if any(r['employee_id']==employee and r['kind']=='leave' and r['status']=='approved' and r['date']<=slot['date']<=r.get('end_date',r['date']) for r in data['requests']):reasons.append('חופשה מאושרת')
        start,end=self.interval(slot);hours=(end-start).total_seconds()/3600
        if hours>data['rules']['max_shift']:reasons.append('חריגה מאורך משמרת שהוגדר')
        availability=data['availability'].get(employee,{}).get(slot['date'])
        period_status=period_decision(data,employee,slot['date'],slot['period'])
        if period_status is False:reasons.append('לא זמין במשמרת זו')
        elif period_status is True:pass
        elif availability is None:reasons.append('זמינות לא הוגשה')
        elif not availability:reasons.append('לא זמין ביום זה')
        elif not any(self.interval({'date':slot['date'],**a})[0]<=start and self.interval({'date':slot['date'],**a})[1]>=end for a in availability):reasons.append('מחוץ לשעות הזמינות')
        total=hours;week=self.week(slot['date'])
        assigned=[s for s in self.occupied(data,employee,slot['id'],legacy,week) if self.week(s['date'])==week]
        limits=p.get('shift_limits',{})
        if limits.get('total') is not None and len(assigned)+1>limits['total']:reasons.append('חריגה ממכסת משמרות שבועית')
        if limits.get(slot['period']) is not None and sum(s.get('period')==slot['period'] for s in assigned)+1>limits[slot['period']]:reasons.append('חריגה ממכסת משמרות לתקופה')
        for other in self.occupied(data,employee,slot['id'],legacy,self.week(slot['date'])):
            a,b=self.interval(other)
            if a<end and start<b:reasons.append('חפיפה עם משמרת קיימת')
            elif min(abs((start-b).total_seconds()),abs((a-end).total_seconds()))<data['rules']['min_rest']*3600:reasons.append('פחות משעות המנוחה שהוגדרו')
            if self.week(other['date'])==week:total+=(b-a).total_seconds()/3600
        if total>p.get('max_hours',40)+0.0001:reasons.append('חריגה ממכסת שעות שבועית')
        reasons.extend(extra_reasons(self,data,slot,employee))
        return list(dict.fromkeys(reasons))

    def report(self,data,week,people,legacy=()):
        slots=[s for s in data['slots'] if self.week(s['date'])==week];issues=[];hours={};cost=0;unknown_cost=0
        for s in slots:
            duration=(self.interval(s)[1]-self.interval(s)[0]).total_seconds()/3600
            if len(s['employees'])<s['required']:issues.append({'slot_id':s['id'],'kind':'coverage','message':'חסרים עובדים','missing':s['required']-len(s['employees'])})
            for employee in s['employees']:
                failures=self.reasons(data,s,employee,people,legacy)
                if failures:issues.append({'slot_id':s['id'],'employee_id':employee,'kind':'constraint','message':' · '.join(failures)})
                hours[employee]=round(hours.get(employee,0)+duration,2)
                wage=effective_cost(data,employee,s['date'])
                if wage is None:unknown_cost+=1
                else:cost+=duration*wage
        issues.extend(crew_issues(self,data,week))
        for cell in data.get('pending_cells',[]):
            if self.week(cell['date'])==week:issues.append({'slot_id':cell['id'],'kind':'configuration','message':'תא טיוטה ללא שעות; יש להשלים זמני תכנון לפני פרסום'})
        return {'issues':issues,'hours':hours,'cost':round(cost,2),'unknown_cost_assignments':unknown_cost,'required':sum(s['required'] for s in slots),'assigned':sum(len(s['employees']) for s in slots),'slots':len(slots)}

    def greedy(self,data,week,people,legacy):
        # Try several scarcity-first orderings. Never relax hard constraints or change filled slots.
        targets=[s for s in data['slots'] if self.week(s['date'])==week and len(s['employees'])<s['required']]
        self.check(targets,'אין משמרות פתוחות בשבוע הזה')
        best=None;best_metric=None
        for trial in range(4):
            trial_data=copy.deepcopy(data);explanations=[]
            target_ids={s['id'] for s in targets}
            queue=[s for s in trial_data['slots'] if s['id'] in target_ids]
            def candidates(s):return [p['id'] for p in people if p['id'] not in s['employees'] and not self.reasons(trial_data,s,p['id'],people,legacy)]
            queue.sort(key=lambda s:(len(candidates(s)),s['date'] if trial%2==0 else s['role'],s['start']),reverse=trial==3)
            for slot in queue:
                while len(slot['employees'])<slot['required']:
                    eligible=candidates(slot)
                    if not eligible:break
                    def ranking(e):return plan_rank(self,trial_data,slot,e,people)
                    chosen=min(eligible,key=ranking);slot['employees'].append(chosen)
                    explanations.append({'slot_id':slot['id'],'employee_id':chosen,'message':'זמין וכשיר; איזון שעות ביחס ליעד ולהיסטוריה, והתחשבות בהעדפה'})
            report=self.report(trial_data,week,people,legacy)
            metric=(sum(i['kind']!='coverage' for i in report['issues']),report['required']-report['assigned'],objective(self,trial_data,week,people))
            if best_metric is None or metric<best_metric:best_metric=metric;best=(trial_data,explanations)
        return best

    def action(self,action,body):
        week=self.week(body.get('week'));result={}
        if action=='simulate':
            from workforce_simulation import simulate
            return simulate(self,body,week)
        if action=='attendance-preview':
            with self.store.connect() as c:data,revision,people=self.read(c)
            return {**import_preview(self,data,people,body.get('csv'),week),'revision':revision}
        with self.store.connect(write=True) as c:
            data,revision,people=self.read(c)
            self.check(body.get('revision')==revision,'הסידור השתנה בחלון אחר. רענן ונסה שוב',409)
            legacy=[dict(r) for r in c.execute('SELECT * FROM shifts')]
            guard(self,action,body,data,week)
            if action=='attendance':guard_attendance(self,body,data)
            handled=period_operation(self,action,body,data,people,c,week,result) or reference_operation(self,action,body,data,people,c,week,result) or marketplace_operation(self,action,body,data,people,c,week,result) or planner_operation(self,action,body,data,people,c,week,result) or import_operation(self,action,body,data,people,c,week,result) or tips_operation(self,action,body,data,people,c,week,result) or policy_operation(self,action,body,data,people,c,week,result) or operation(self,action,body,data,people,c,week,result)
            if action=='apply-simulation':
                from workforce_simulation import apply
                apply(self,body,data,c,week,revision)
            elif handled:pass
            elif action=='employee':
                employee=body.get('id');name=str(body.get('name','')).strip();self.check(0<len(name)<=100,'נדרש שם עובד')
                roles=body.get('roles',[]);self.check(isinstance(roles,list) and (roles or employee) and all(r in data['roles'] for r in roles),'יש לבחור תפקידים תקינים')
                maximum=self.number(body.get('max_hours',40),1,84);target=self.number(body.get('target_hours',24),0,maximum)
                wage=body.get('hourly_cost');self.check(wage is None or isinstance(wage,(int,float)),'עלות שעה לא תקינה')
                if wage is not None:self.number(wage,0,2000)
                if employee:
                    self.employee(people,employee);canonical_role=roles[0] if roles else next(p['role'] for p in people if p['id']==employee)
                    c.execute('UPDATE employees SET name=?,role=? WHERE id=?',(name,canonical_role,employee))
                else:
                    employee=key();c.execute('INSERT INTO employees VALUES(?,?,?,?,1)',(employee,name,roles[0],'[]'))
                previous=data['profiles'].get(employee)
                if previous and previous.get('hourly_cost')!=wage:
                    self.check(wage is not None,'להסרת עלות יש להשתמש בערך תחולה מתאים; אין למחוק עלות היסטורית')
                    data['cost_baselines'].setdefault(employee,previous.get('hourly_cost'))
                    today=date.today().isoformat();unlocked(self,data,[today]);rows=data['cost_history'].setdefault(employee,[])
                    old_cost=next((r for r in rows if r['from']==today),None)
                    entry={'id':key(),'from':today,'value':wage,'reason':'עדכון עלות בפרופיל','at':stamp()}
                    if old_cost:
                        entry['previous']=copy.deepcopy(old_cost);rows.remove(old_cost)
                    rows.append(entry)
                data['profiles'][employee]={**data['profiles'].get(employee,{}),**profile_fields(self,body),'roles':list(dict.fromkeys(roles)),'max_hours':maximum,'target_hours':target,'hourly_cost':wage}
                # Profile edits can create invalid drafts; publish always revalidates.
                result['employee_id']=employee
            elif action=='availability':
                employee=body.get('employee_id');self.employee(people,employee);days=body.get('days')
                availability_open(self,data,week)
                self.check(isinstance(days,dict) and len(days)<=7,'זמינות שבועית לא תקינה')
                for day,ranges in days.items():
                    self.check(self.week(day)==week,'זמינות מחוץ לשבוע הנבחר')
                    data['period_availability'].get(employee,{}).get(week,{}).get('days',{}).pop(day,None)
                    if ranges is None:
                        data['availability'].setdefault(employee,{}).pop(day,None);continue
                    self.check(isinstance(ranges,list) and len(ranges)<=4,'טווחי שעות לא תקינים')
                    for a in ranges:
                        self.check(isinstance(a,dict),'טווח לא תקין');self.interval({'date':day,**a})
                        self.check(set(a)<= {'start','end','preferred'},'שדה זמינות לא תקין')
                    data['availability'].setdefault(employee,{})[day]=ranges
            elif action=='slot':
                slot_id=body.get('id');old=next((s for s in data['slots'] if s['id']==slot_id),None)
                self.check(not(slot_id and body.get('cell_id')),'לא ניתן למזג שני תאי טיוטה בפעולה אחת')
                self.check(not slot_id or old,'המשמרת לא נמצאה',404)
                cell=next((s for s in data['pending_cells'] if s['id']==body.get('cell_id')),None)
                self.check(not body.get('cell_id') or cell and self.week(cell['date'])==week,'תא טיוטה לא נמצא',404)
                if cell:unlocked(self,data,[cell['date']])
                slot={k:body.get(k) for k in ('date','start','end','role','period','required')}
                self.check(self.week(slot['date'])==week,'משמרת מחוץ לשבוע')
                self.check(slot['role'] in data['roles'] and slot['period'] in data['periods'],'תפקיד או תקופה לא תקינים')
                self.check(isinstance(slot['required'],int) and not isinstance(slot['required'],bool) and 1<=slot['required']<=30,'כמות עובדים לא תקינה')
                start,end=self.interval(slot);self.check((end-start).total_seconds()<=data['rules']['max_shift']*3600,'משמרת ארוכה מהמגבלה שהוגדרה')
                slot.update(id=slot_id or (cell['id'] if cell else key()),employees=old['employees'][:] if old else cell['employees'][:] if cell else [])
                if old:
                    for field in ('min_experienced','max_trainees','tags','training_friendly','time_history'):
                        if field in old:slot[field]=copy.deepcopy(old[field])
                    if any(old[k]!=slot[k] for k in ('date','start','end')):
                        slot.setdefault('time_history',[]).append({'date':old['date'],'start':old['start'],'end':old['end'],'at':stamp(),'reason':'עדכון זמני תכנון'})
                    self.check(slot.get('min_experienced',0)<=slot['required'],'כמות העובדים קטנה מדרישת המנוסים שהוגדרה')
                self.check(len(slot['employees'])<=slot['required'],'יש להסיר שיבוצים לפני הקטנת הכמות')
                if old:data['slots'].remove(old)
                if cell:data['pending_cells'].remove(cell)
                data['slots'].append(slot);result['slot_id']=slot['id']
            elif action in ('assign','remove','delete-slot'):
                slot=next((s for s in data['slots'] if s['id']==body.get('slot_id') and self.week(s['date'])==week),None);self.check(slot,'המשמרת לא נמצאה',404)
                if action=='delete-slot':data['slots'].remove(slot)
                else:
                    employee=body.get('employee_id')
                    if action=='remove':self.check(employee in slot['employees'],'העובד אינו משובץ');slot['employees'].remove(employee)
                    else:
                        self.employee(people,employee);self.check(employee not in slot['employees'],'העובד כבר משובץ',409)
                        self.check(len(slot['employees'])<slot['required'],'המשמרת מלאה',409)
                        failures=self.reasons(data,slot,employee,people,legacy);self.check(not failures,' · '.join(failures),409);slot['employees'].append(employee)
            elif action=='suggest':
                data,explanations,diagnostics=optimize(self,data,week,people,legacy);result.update(explanations=explanations,diagnostics=diagnostics)
            elif action=='copy-week':
                source=self.week(body.get('source'));self.check(source!=week,'יש לבחור שבוע אחר')
                self.check(not any(self.week(s['date'])==week for s in data['slots']),'אפשר להעתיק רק לשבוע ריק',409)
                source_slots=[s for s in data['slots'] if self.week(s['date'])==source];self.check(source_slots,'אין תבנית בשבוע המקור')
                offset=self.day(week)-self.day(source)
                for s in source_slots:data['slots'].append({**s,'id':key(),'date':(self.day(s['date'])+offset).isoformat(),'employees':[]})
            elif action=='template':
                self.check(not any(self.week(s['date'])==week for s in data['slots']),'אפשר ליצור תבנית רק בשבוע ריק',409)
                rows=body.get('rows');self.check(isinstance(rows,list) and 1<=len(rows)<=16,'נדרשת לפחות שורת תפקיד אחת')
                for row in rows:
                    self.check(row.get('role') in data['roles'] and row.get('period') in data['periods'],'תפקיד או תקופה לא תקינים')
                    count=row.get('required');self.check(isinstance(count,int) and not isinstance(count,bool) and 1<=count<=30,'כמות לא תקינה')
                    for offset in range(7):
                        slot={'id':key(),'date':(self.day(week)+timedelta(days=offset)).isoformat(),'start':row.get('start'),'end':row.get('end'),'role':row['role'],'period':row['period'],'required':count,'employees':[]}
                        start,end=self.interval(slot);self.check((end-start).total_seconds()<=data['rules']['max_shift']*3600,'משמרת ארוכה מהמגבלה שהוגדרה')
                        data['slots'].append(slot)
            elif action=='rules':
                data['rules']={'min_rest':self.number(body.get('min_rest'),0,48),'max_shift':self.number(body.get('max_shift'),1,16)}
            elif action=='configure':
                title=str(body.get('restaurant','')).strip();self.check(1<len(title)<=100,'שם מסעדה לא תקין');data['restaurant']=title
                for field in ('roles','periods'):
                    label=str(body.get(field,'')).strip()
                    if label:
                        self.check(len(label)<=60,'שם ארוך מדי')
                        if label not in data[field].values():data[field]['custom-'+hashlib.sha256(label.encode()).hexdigest()[:12]]=label
            elif action=='import-team':
                source=next((s for s in self.sources if s['id']==body.get('source_id')),None);self.check(source,'מקור לא נמצא',404)
                created=0
                for row in source['records']:
                    name=row['name']
                    if not name:continue
                    person=next((p for p in people if p['name']==name),None)
                    if person:employee=person['id']
                    else:
                        employee=key();c.execute('INSERT INTO employees VALUES(?,?,?,?,1)',(employee,name,'unverified','[]'));people.append({'id':employee,'name':name,'active':1});created+=1
                    profile=data['profiles'].setdefault(employee,{'roles':[],'max_hours':40,'target_hours':24,'hourly_cost':None})
                    observed=profile.setdefault('observed_roles',[])
                    if row['role'] not in observed:observed.append(row['role'])
                    role=row['role']
                    if role!='ללא תפקיד' and role not in data['roles'].values():data['roles']['source-'+hashlib.sha256(role.encode()).hexdigest()[:12]]=role
                result['created_employees']=created
            elif action=='publish':
                report=self.report(data,week,people,legacy)
                self.check(not any(self.week(r['date'])==week for r in data['pending_cells']),'יש להשלים שעות בתאי הטיוטה לפני פרסום',409)
                self.check(report['slots']>0,'אין משמרות לפרסום')
                self.check(not report['issues'],'לא ניתן לפרסם: יש חוסרים או התנגשויות',409)
                version=len(data['published'].get(week,[]))+1
                data['published'].setdefault(week,[]).append({'version':version,'at':stamp(),'slots':copy.deepcopy([s for s in data['slots'] if self.week(s['date'])==week])})
                publication_messages(data,week,version,data['published'][week][-1]['slots'])
                result['published_version']=version
                data['publication_status'][week]=True
            elif action=='request':
                employee=body.get('employee_id');self.employee(people,employee);kind=body.get('kind');self.check(kind in ('leave','replacement'),'בקשה לא תקינה')
                request={'id':key(),'employee_id':employee,'kind':kind,'status':'pending','date':body.get('date'),'note':str(body.get('note',''))[:500],'at':stamp()}
                self.check(self.week(request['date'])==week,'תאריך מחוץ לשבוע')
                if kind=='leave':
                    end=body.get('end_date') or request['date'];end_day=self.day(end)
                    self.check(0<=(end_day-self.day(request['date'])).days<=90,'חופשה מוגבלת לטווח של 91 ימים')
                    self.check(not any(r['start']<=end and r['end']>=request['date'] for r in data['blocked_leave']),'חלק מתאריכי החופשה חסומים להגשה',409)
                    self.check(not any(r['employee_id']==employee and r['kind']=='leave' and r['status'] in ('pending','approved') and r['date']<=end and r.get('end_date',r['date'])>=request['date'] for r in data['requests']),'קיימת בקשת חופשה חופפת',409)
                    request['end_date']=end
                if kind=='replacement':
                    slot=next((s for s in data['slots'] if s['id']==body.get('slot_id')),None)
                    self.check(slot and employee in slot['employees'] and slot['date']==request['date'],'העובד אינו משובץ למשמרת')
                    request['slot_id']=slot['id']
                data['requests'].append(request)
            elif action=='resolve-request':
                r=next((r for r in data['requests'] if r['id']==body.get('id')),None);self.check(r and r['status']=='pending','הבקשה כבר טופלה או חסרה',409)
                self.check(body.get('decision') in ('approved','rejected'),'החלטה לא תקינה')
                if body['decision']=='approved':
                    if r['kind']=='leave':
                        self.check(not any(x['start']<=r.get('end_date',r['date']) and x['end']>=r['date'] for x in data['blocked_leave']),'תאריכי החופשה נחסמו מאז ההגשה',409)
                        for offset in range((self.day(r.get('end_date',r['date']))-self.day(r['date'])).days+1):
                            leave_day=(self.day(r['date'])+timedelta(days=offset)).isoformat()
                            data['availability'].setdefault(r['employee_id'],{})[leave_day]=[]
                        for s in data['slots']:
                            if r['date']<=s['date']<=r.get('end_date',r['date']) and r['employee_id'] in s['employees']:s['employees'].remove(r['employee_id'])
                    else:
                        slot=next((s for s in data['slots'] if s['id']==r['slot_id']),None);self.check(slot and r['employee_id'] in slot['employees'],'השיבוץ השתנה',409)
                        target=body.get('replacement_id');self.employee(people,target);self.check(target!=r['employee_id'],'יש לבחור מחליף אחר')
                        self.check(target not in slot['employees'],'המחליף כבר משובץ במשמרת',409)
                        slot['employees'].remove(r['employee_id'])
                        failures=self.reasons(data,slot,target,people,legacy);self.check(not failures,' · '.join(failures),409)
                        slot['employees'].append(target)
                r.update(status=body['decision'],resolved_at=stamp())
            elif action=='points':
                employee=body.get('employee_id');self.employee(people,employee)
                source=str(body.get('source','')).strip();self.check(3<=len(source)<=160,'נדרש מזהה אירוע ייחודי למניעת ניקוד כפול')
                self.check(not any(p['employee_id']==employee and p['source']==source for p in data['points']),'האירוע הזה כבר זוכה בנקודות',409)
                amount=body.get('amount');self.check(isinstance(amount,int) and not isinstance(amount,bool) and 1<=amount<=500,'ניקוד חייב להיות בין 1 ל־500')
                reason=str(body.get('reason','')).strip();self.check(2<=len(reason)<=200,'נדרשת סיבה לניקוד')
                data['points'].append({'id':key(),'employee_id':employee,'source':source,'amount':amount,'reason':reason,'at':stamp(),'approval':'manager-local-review'})
            elif action=='reward':
                title=str(body.get('title','')).strip();self.check(1<len(title)<=100,'נדרש שם פרס')
                threshold=body.get('threshold');self.check(isinstance(threshold,int) and not isinstance(threshold,bool) and 1<=threshold<=100000,'סף נקודות לא תקין')
                data['rewards'].append({'id':key(),'title':title,'threshold':threshold,'at':stamp()})
            elif action=='claim-reward':
                employee=body.get('employee_id');self.employee(people,employee)
                reward=next((r for r in data['rewards'] if r['id']==body.get('reward_id')),None);self.check(reward,'הפרס לא נמצא',404)
                total=sum(p['amount'] for p in data['points'] if p['employee_id']==employee)
                self.check(total>=reward['threshold'],'טרם הושג סף הנקודות',409)
                claims=data.setdefault('claims',[])
                self.check(not any(r['employee_id']==employee and r['reward_id']==reward['id'] for r in claims),'הפרס כבר התבקש',409)
                claims.append({'id':key(),'employee_id':employee,'reward_id':reward['id'],'title':reward['title'],'status':'pending','at':stamp()})
            elif action=='resolve-claim':
                claim=next((r for r in data.setdefault('claims',[]) if r['id']==body.get('id')),None)
                self.check(claim and claim['status']=='pending','הבקשה כבר טופלה או חסרה',409)
                self.check(body.get('decision') in ('fulfilled','rejected'),'החלטה לא תקינה')
                claim.update(status=body['decision'],resolved_at=stamp())
            else:raise self.error('הפעולה לא נמצאה',404)
            c.execute('UPDATE workforce_state SET data=?,revision=revision+1 WHERE id=1',(json.dumps(data,ensure_ascii=False),))
            self.store.audit(c,action,'workforce',week,{'revision':revision+1,'local_review':True,'actor':body.get('_actor','local-review')})
        return {'ok':True,'revision':revision+1,**result}
