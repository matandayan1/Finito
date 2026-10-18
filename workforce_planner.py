"""Explainable, bounded constraint search. Scores are operational priorities, not XP."""
import copy,math,time
from datetime import timedelta
from uuid import uuid4
from workforce_policy import effective_cost
from workforce_availability import has_availability

TAGS=('opening','closing','premium','low_demand','emergency')
WEIGHTS={'hours':3,'preferences':2,'weekends':2,'premium':2,'rotation':2,'development':1,'cost':0}
def defaults(data):
    data.setdefault('planning',{'weights':WEIGHTS.copy(),'weekend_days':[5,6],'budgets':{}})
    data['planning'].setdefault('weights',WEIGHTS.copy());data['planning'].setdefault('weekend_days',[5,6]);data['planning'].setdefault('budgets',{})
    data.setdefault('demand',[])
    data.setdefault('role_cert_requirements',{})
def level(data,e,role):return data['profiles'].get(e,{}).get('role_levels',{}).get(role,0)
def trainee(data,e,role):return role in data['profiles'].get(e,{}).get('trainee_roles',[])
def cost_ready(data,people,day):
    relevant=[p['id'] for p in people if p['active'] and data['profiles'].get(p['id'],{}).get('roles') and has_availability(data,p['id'],day)]
    return all(effective_cost(data,e,day) is not None for e in relevant)

def extra_reasons(w,data,slot,e):
    reasons=[];members=[*slot['employees'],e] if e not in slot['employees'] else slot['employees']
    minimum=slot.get('min_experienced',0)
    seniors=sum(level(data,x,slot['role'])>=4 for x in members)
    if minimum-seniors>slot['required']-len(members):reasons.append('נדרש להשאיר מקום לכמות העובדים המנוסים שהוגדרה')
    if sum(trainee(data,x,slot['role']) for x in members)>slot.get('max_trainees',slot['required']):reasons.append('חריגה מכמות המתלמדים שהוגדרה')
    for title in data.get('role_cert_requirements',{}).get(slot['role'],[]):
        if not any(r['employee_id']==e and r['title'].casefold()==title.casefold() and r['expires']>=slot['date'] for r in data['certifications']):reasons.append('חסרה הכשרה בתוקף: '+title)
    budget=data['planning']['budgets'].get(w.week(slot['date']))
    if budget is not None:
        wage=effective_cost(data,e,slot['date']);cost=0;unknown=False
        for s in data['slots']:
            if w.week(s['date'])!=w.week(slot['date']):continue
            for employee in s['employees']:
                if s['id']==slot['id'] and employee==e:continue
                rate=effective_cost(data,employee,s['date'])
                if rate is None:unknown=True
                else:cost+=w.duration(s)*rate
        if wage is None or unknown:reasons.append('עלות חסרה לאימות תקציב העבודה')
        elif cost+w.duration(slot)*wage>budget+.001:reasons.append('חריגה מתקציב העבודה השבועי שהוגדר')
    return reasons

def crew_issues(w,data,week):
    slots=[s for s in data['slots'] if w.week(s['date'])==week];issues=[]
    for s in slots:
        if sum(level(data,e,s['role'])>=4 for e in s['employees'])<s.get('min_experienced',0):issues.append({'slot_id':s['id'],'kind':'experience','message':'חסרים עובדים ברמת ניסיון מאושרת של 4 ומעלה'})
        for e in s['employees']:
            if not trainee(data,e,s['role']):continue
            start,end=w.interval(s);mentors=[]
            for other in slots:
                if other['role']!=s['role']:continue
                a,z=w.interval(other)
                if a<=start and z>=end:mentors.extend(m for m in other['employees'] if m!=e and s['role'] in data['profiles'].get(m,{}).get('mentor_roles',[]) and not trainee(data,m,s['role']))
            if not mentors:issues.append({'slot_id':s['id'],'employee_id':e,'kind':'mentoring','message':'מתלמד חייב חונך מאושר באותו תפקיד לכל שעות המשמרת'})
    return issues

def opportunities(w,data,week,people):
    start=(w.day(week)-timedelta(days=28)).isoformat()
    historical=[s for key,versions in data['published'].items() if start<=key<week and versions and data.get('publication_status',{}).get(key,True) for s in versions[-1]['slots']]
    current=[s for s in data['slots'] if w.week(s['date'])==week]
    result={p['id']:{'employee_id':p['id'],'historical_hours':0,'hours':0,'shifts':0,'weekends':0,**{tag:0 for tag in TAGS}} for p in people}
    for s in historical+current:
        for e in s['employees']:
            if e not in result:continue
            row=result[e]
            if s in current:row['hours']+=w.duration(s);row['shifts']+=1
            else:row['historical_hours']+=w.duration(s)
            if (w.day(s['date']).weekday()+1)%7 in data['planning']['weekend_days']:row['weekends']+=1
            for tag in s.get('tags',[]):row[tag]+=1
    return list(result.values())

def rank(w,data,slot,e,people):
    weights=data['planning']['weights'];profile=data['profiles'].get(e,{})
    history=next(r for r in opportunities(w,data,w.week(slot['date']),people) if r['employee_id']==e)
    hours=history['hours'];target=max(profile.get('target_hours',24),1)
    value=weights.get('hours',3)*(hours/target+history['historical_hours']/max(4*target,1))
    start,end=w.interval(slot)
    preferred=any(a.get('preferred') and w.interval({'date':slot['date'],**a})[0]<=start and w.interval({'date':slot['date'],**a})[1]>=end for a in data['availability'].get(e,{}).get(slot['date'],[]))
    if preferred:value-=weights.get('preferences',2)
    if (w.day(slot['date']).weekday()+1)%7 in data['planning']['weekend_days']:value+=history['weekends']*weights.get('weekends',2)/4
    if 'premium' in slot.get('tags',[]):value+=history['premium']*weights.get('premium',2)/4
    for tag in ('opening','closing'):
        if tag in slot.get('tags',[]):value+=history[tag]*weights.get('rotation',2)/4
    if slot.get('training_friendly') and trainee(data,e,slot['role']):value-=weights.get('development',1)
    if sum(level(data,x,slot['role'])>=4 for x in slot['employees'])<slot.get('min_experienced',0) and level(data,e,slot['role'])>=4:value-=100
    # Coach placement resolves a real coverage obligation, rather than favoring ratings everywhere.
    if any(trainee(data,x,slot['role']) for x in slot['employees']) and slot['role'] in profile.get('mentor_roles',[]):value-=100
    wage=effective_cost(data,e,slot['date'])
    if wage is not None and weights.get('cost',0) and cost_ready(data,people,slot['date']):value+=weights.get('cost',0)*w.duration(slot)*wage/1000
    return round(value,6),e

def objective(w,data,week,people):
    weights=data['planning']['weights'];stats=opportunities(w,data,week,people);value=0
    for row in stats:
        target=max(data['profiles'].get(row['employee_id'],{}).get('target_hours',24),1)
        value+=weights.get('hours',3)*((row['hours']+row['historical_hours']/4)/target)**2
        value+=weights.get('weekends',2)*row['weekends']**2/16
        value+=weights.get('premium',2)*row['premium']**2/16
        value+=weights.get('rotation',2)*(row['opening']**2+row['closing']**2)/16
    for s in data['slots']:
        if w.week(s['date'])!=week:continue
        start,end=w.interval(s)
        for e in s['employees']:
            for a in data['availability'].get(e,{}).get(s['date'],[]) or []:
                x,z=w.interval({'date':s['date'],**a})
                if a.get('preferred') and x<=start and z>=end:value-=weights.get('preferences',2);break
            if s.get('training_friendly') and trainee(data,e,s['role']):value-=weights.get('development',1)
            rate=effective_cost(data,e,s['date'])
            if rate is not None and weights.get('cost',0) and cost_ready(data,people,s['date']):value+=weights.get('cost',0)*rate*w.duration(s)/1000
    return round(value,6)

def optimize(w,data,week,people,legacy):
    baseline,explanations=w.greedy(data,week,people,legacy)
    original={s['id']:set(s['employees']) for s in data['slots']}
    def metric(candidate):
        report=w.report(candidate,week,people,legacy)
        hard=sum(i['kind']!='coverage' for i in report['issues'])
        return (hard,report['required']-report['assigned'],objective(w,candidate,week,people))
    best=baseline;best_metric=metric(best);deadline=time.monotonic()+2.0;expanded=0
    # Small rosters receive bounded backtracking in addition to four greedy starts.
    initial=[s['id'] for s in data['slots'] if w.week(s['date'])==week and len(s['employees'])<s['required']]
    if sum(s['required']-len(s['employees']) for s in data['slots'] if s['id'] in initial)<=24:
        visited=set()
        def search(candidate,skipped):
            nonlocal best,best_metric,expanded
            if expanded>=1500 or time.monotonic()>deadline:return
            expanded+=1
            signature=tuple((s['id'],tuple(sorted(s['employees']))) for s in candidate['slots'] if s['id'] in initial),tuple(sorted(skipped))
            if signature in visited:return
            visited.add(signature)
            targets=[s for s in candidate['slots'] if s['id'] in initial and s['id'] not in skipped and len(s['employees'])<s['required']]
            if not targets:
                score=metric(candidate)
                if score<best_metric:best,best_metric=copy.deepcopy(candidate),score
                return
            options=[]
            for s in targets:
                eligible=[p['id'] for p in people if p['id'] not in s['employees'] and not w.reasons(candidate,s,p['id'],people,legacy)]
                options.append((s,eligible))
            slot,eligible=min(options,key=lambda pair:(len(pair[1]),pair[0]['date'],pair[0]['start']))
            for e in sorted(eligible,key=lambda e:rank(w,candidate,slot,e,people))[:5]:
                slot['employees'].append(e);search(candidate,skipped);slot['employees'].pop()
                if expanded>=1500 or time.monotonic()>deadline:break
            if best_metric[0]>0 or best_metric[1]>0:search(candidate,skipped|{slot['id']})
        search(copy.deepcopy(data),set())
    # Larger rosters also receive bounded repair: move only proposed assignments,
    # then refill the vacancy. The manager's existing assignments remain pinned.
    repair_targets=[s['id'] for s in best['slots'] if w.week(s['date'])==week]
    for slot_id in repair_targets:
        if expanded>=1500 or time.monotonic()>deadline:break
        target=next(s for s in best['slots'] if s['id']==slot_id)
        improved=False
        movable=[None] if len(target['employees'])<target['required'] else [e for e in target['employees'] if e not in original.get(slot_id,set())]
        for victim in movable:
            for person in people:
                if expanded>=1500 or time.monotonic()>deadline:break
                e=person['id']
                if not person['active'] or e in target['employees'] or target['role'] not in best['profiles'].get(e,{}).get('roles',[]):continue
                trial=copy.deepcopy(best);slot=next(s for s in trial['slots'] if s['id']==slot_id)
                if victim:slot['employees'].remove(victim)
                displaced=[]
                for other in trial['slots']:
                    if other['id']!=slot_id and w.week(other['date'])==week and e in other['employees'] and e not in original.get(other['id'],set()):
                        other['employees'].remove(e);displaced.append(other)
                expanded+=1
                if w.reasons(trial,slot,e,people,legacy):continue
                slot['employees'].append(e)
                for other in displaced:
                    choices=[p['id'] for p in people if p['id'] not in other['employees'] and not w.reasons(trial,other,p['id'],people,legacy)]
                    if choices:other['employees'].append(min(choices,key=lambda person:rank(w,trial,other,person,people)))
                score=metric(trial)
                if score<best_metric:
                    best,best_metric=trial,score;improved=True;break
            if improved:break
    explanations=[]
    for slot in best['slots']:
        if w.week(slot['date'])!=week:continue
        for e in slot['employees']:
            if e in original.get(slot['id'],set()):continue
            messages=['זמינות וכשירות אושרו','איזון שעות והזדמנויות לפי ההגדרות']
            if level(best,e,slot['role'])>=4 and slot.get('min_experienced'):messages.append('מענה לדרישת ניסיון במשמרת')
            if trainee(best,e,slot['role']):messages.append('שיבוץ התפתחות; חניכה נבדקת לפני פרסום')
            explanations.append({'slot_id':slot['id'],'employee_id':e,'message':' · '.join(messages)})
    return best,explanations,{'algorithm':'four greedy starts + bounded constraint search and repair','expanded':expanded,'hard_issues':best_metric[0],'unfilled':best_metric[1],'optimality_proven':False}

def operation(w,action,b,data,people,c,week,result):
    if action=='role-certificates':
        role=b.get('role');titles=b.get('titles');w.check(role in data['roles'] and isinstance(titles,list) and len(titles)<=10,'דרישות הכשרה לא תקינות')
        w.check(all(isinstance(t,str) and 2<=len(t.strip())<=150 for t in titles),'שם הכשרה לא תקין')
        data['role_cert_requirements'][role]=list(dict.fromkeys(t.strip() for t in titles))
    elif action=='planning-settings':
        weights=b.get('weights');w.check(isinstance(weights,dict) and set(weights)<=set(WEIGHTS),'משקלי שיבוץ לא תקינים')
        for value in weights.values():w.number(value,0,10)
        weekend=b.get('weekend_days');w.check(isinstance(weekend,list) and all(isinstance(i,int) and not isinstance(i,bool) and 0<=i<=6 for i in weekend),'ימי סוף שבוע לא תקינים')
        budget=b.get('budget');w.check(budget is None or isinstance(budget,(int,float)),'תקציב לא תקין')
        if budget is not None:w.number(budget,0,1000000)
        data['planning']['weights']={**WEIGHTS,**weights};data['planning']['weekend_days']=list(dict.fromkeys(weekend));data['planning']['budgets'][week]=budget
    elif action=='employee-development':
        e=b.get('employee_id');w.employee(people,e);profile=data['profiles'].setdefault(e,{})
        levels=b.get('role_levels');w.check(isinstance(levels,dict) and set(levels)<=set(profile.get('roles',[])),'ניתן להגדיר רמות רק בתפקידים מאושרים')
        for value in levels.values():w.check(isinstance(value,int) and not isinstance(value,bool) and 1<=value<=5,'רמת ניסיון חייבת להיות בין 1 ל־5')
        for field in ('mentor_roles','trainee_roles'):
            roles=b.get(field,[]);w.check(isinstance(roles,list) and set(roles)<=set(profile.get('roles',[])),'תפקידי חניכה חייבים להיות מאושרים')
        w.check(not set(b.get('mentor_roles',[]))&set(b.get('trainee_roles',[])),'עובד לא יכול להיות חונך ומתלמד באותו תפקיד')
        profile.update(role_levels=levels,mentor_roles=b.get('mentor_roles',[]),trainee_roles=b.get('trainee_roles',[]))
    elif action=='slot-quality':
        slot=next((s for s in data['slots'] if s['id']==b.get('slot_id') and w.week(s['date'])==week),None);w.check(slot,'משמרת לא נמצאה',404)
        for field in ('min_experienced','max_trainees'):
            value=b.get(field);w.check(isinstance(value,int) and not isinstance(value,bool) and 0<=value<=slot['required'],'דרישת תמהיל מחוץ לכמות המשמרת');slot[field]=value
        tags=b.get('tags',[]);w.check(isinstance(tags,list) and set(tags)<=set(TAGS),'סוגי משמרות לא תקינים')
        slot.update(tags=list(dict.fromkeys(tags)),training_friendly=b.get('training_friendly') is True)
    elif action=='demand-save':
        day=b.get('date');w.check(w.week(day)==week,'תחזית מחוץ לשבוע')
        role,period=b.get('role'),b.get('period');w.check(role in data['roles'] and period in data['periods'],'תפקיד או תקופה לא תקינים')
        guests=w.number(b.get('guests'),0,10000);ratio=w.number(b.get('guests_per_employee'),1,1000)
        start,end=b.get('start'),b.get('end');a,z=w.interval({'date':day,'start':start,'end':end})
        w.check((z-a).total_seconds()/3600<=data['rules']['max_shift'],'טווח הביקוש ארוך ממגבלת המשמרת')
        source=str(b.get('source','')).strip();w.check(2<=len(source)<=300,'נדרש מקור להערכת הביקוש')
        old=next((r for r in data['demand'] if (r['date'],r['role'],r['period'],r['start'],r['end'])==(day,role,period,start,end)),None)
        record={'id':old['id'] if old else str(uuid4()),'date':day,'role':role,'period':period,'start':start,'end':end,'guests':guests,'guests_per_employee':ratio,'recommended':math.ceil(guests/ratio),'source':source,'method':'manager-entered demand and service ratio'}
        if old:data['demand'].remove(old)
        data['demand'].append(record)
    elif action=='apply-demand':
        demand=next((r for r in data['demand'] if r['id']==b.get('id') and w.week(r['date'])==week),None);w.check(demand,'הערכת ביקוש לא נמצאה',404)
        start,end=w.interval(demand);covered=0
        for slot in data['slots']:
            if (slot['date'],slot['period'],slot['role'])!=(demand['date'],demand['period'],demand['role']):continue
            a,z=w.interval(slot)
            if a<=start and z>=end:covered+=slot['required']
        gap=demand['recommended']-covered;w.check(0<gap<=30,'אין פער להוספה או שהפער גדול מ־30 עובדים')
        data['slots'].append({'id':str(uuid4()),**{k:demand[k] for k in ('date','period','role','start','end')},'required':gap,'employees':[],'demand_id':demand['id']})
    else:return False
    return True
