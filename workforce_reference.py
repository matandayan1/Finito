"""Reference scheduling settings and reversible publication/draft actions."""
import copy
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from uuid import uuid4

def defaults(data):
    for field,value in {'publication_status':{},'holidays':[],'shift_priorities':{},'reminder_definitions':[],'draft_history':[],'time_defaults':{},'pending_cells':[]}.items():
        data.setdefault(field,copy.deepcopy(value))
    if 'reference_layout' not in data:
        path=Path(__file__).parent/'private/workforce-imports/reference-layout.json'
        if path.exists():
            config=json.loads(path.read_text(encoding='utf-8'))
            if config.get('restaurant')==data.get('restaurant'):
                layout=[]
                for row in config.get('rows',[])[:200]:
                    role=next((key for key,label in data['roles'].items() if label==row['role']),None)
                    if not role:
                        role='source-'+hashlib.sha256(row['role'].encode()).hexdigest()[:12];data['roles'][role]=row['role']
                    period=next((key for key,label in data['periods'].items() if label==row['period']),None)
                    if period:layout.append({'role':role,'period':period})
                data['reference_layout']=layout

def profile_fields(w,body):
    result={}
    for name,maximum in {'phone':40,'email':254,'clock_id':80,'address':500,'notes':2000,'groups':300}.items():
        if name in body:
            value=body[name];w.check(isinstance(value,str) and len(value)<=maximum,'שדה לא תקין: '+name);result[name]=value.strip()
    for name in ('birth_date','employment_date'):
        if name in body:
            if body[name]:w.day(body[name])
            result[name]=body[name] or ''
    if 'priority' in body:result['priority']=w.number(body['priority'],1,100)
    if 'shift_limits' in body:
        limits=body['shift_limits'];w.check(isinstance(limits,dict),'מכסות משמרות לא תקינות')
        for value in limits.values():w.check(value is None or isinstance(value,int) and not isinstance(value,bool) and 0<=value<=100,'מכסת משמרות לא תקינה')
        result['shift_limits']=copy.deepcopy(limits)
    if 'notification_preferences' in body:
        prefs=body['notification_preferences'];w.check(isinstance(prefs,dict) and len(prefs)<=20,'העדפות התראה לא תקינות')
        for event,channels in prefs.items():w.check(isinstance(event,str) and len(event)<=50 and isinstance(channels,list) and all(ch in ('portal','email','mobile') for ch in channels),'ערוץ התראות לא תקין')
        result['notification_preferences']=copy.deepcopy(prefs)
    return result

def operation(w,action,b,data,people,c,week,result):
    def text(name,maximum=1000):
        value=b.get(name,'');w.check(isinstance(value,str) and 2<=len(value.strip())<=maximum,'נדרש טקסט תקין: '+name);return value.strip()
    def journal(note):data['journal'].append({'id':str(uuid4()),'date':week,'note':note,'at':datetime.now().astimezone().isoformat()})
    if action=='cell-create':
        day=b.get('date');w.check(w.week(day)==week,'תא מחוץ לשבוע');w.check(b.get('role') in data['roles'] and b.get('period') in data['periods'],'תפקיד או משמרת לא תקינים')
        row={'id':str(uuid4()),'date':day,'role':b['role'],'period':b['period'],'start':'','end':'','required':1,'employees':[],'pending':True}
        times=data['time_defaults'].get(row['period']+':'+row['role'])
        if times:
            a,z=w.interval({'date':day,**times});w.check((z-a).total_seconds()<=data['rules']['max_shift']*3600,'ברירת המחדל ארוכה מהמגבלה')
            row.update(times);row.pop('pending');data['slots'].append(row)
        else:data['pending_cells'].append(row)
        result['cell']=copy.deepcopy(row);journal('יצירת תא בטיוטת הסידור')
    elif action in ('cell-assign','cell-remove','cell-delete'):
        row=next((r for r in data['pending_cells'] if r['id']==b.get('slot_id')),None)
        w.check(row and w.week(row['date'])==week,'תא טיוטה לא נמצא',404)
        from workforce_policy import unlocked
        unlocked(w,data,[row['date']])
        if action=='cell-delete':data['pending_cells'].remove(row)
        else:
            employee=b.get('employee_id');w.employee(people,employee)
            if action=='cell-remove':w.check(employee in row['employees'],'העובד אינו משובץ');row['employees'].remove(employee)
            else:
                w.check(employee not in row['employees'] and len(row['employees'])<row['required'],'התא מלא או העובד כבר משובץ',409);row['employees'].append(employee)
        journal('עדכון תא טיוטה ללא שעות; נדרש אימות לפני פרסום')
    elif action=='quota-save':
        from workforce_policy import unlocked
        rows=b.get('rows');w.check(isinstance(rows,list) and 1<=len(rows)<=500,'נדרשות מכסות לעדכון')
        ids=[r.get('id') for r in rows if r.get('id')];w.check(len(ids)==len(set(ids)),'משמרת מופיעה פעמיים')
        for row in rows:
            day=row.get('date');w.check(w.week(day)==week,'מכסה מחוץ לשבוע');unlocked(w,data,[day])
            count=row.get('required');w.check(isinstance(count,int) and not isinstance(count,bool) and 0<=count<=30,'מכסה לא תקינה')
            old=next((s for s in data['slots'] if s['id']==row.get('id')),None)
            w.check(not row.get('id') or old and old['date']==day,'משמרת לא נמצאה ביום שנבחר',404)
            if not count:
                w.check(not old or not old['employees'],'יש להסיר שיבוצים לפני מחיקת מכסה',409)
                if old:data['slots'].remove(old)
                continue
            w.check(row.get('role') in data['roles'] and row.get('period') in data['periods'],'תפקיד או תקופה לא תקינים')
            a,z=w.interval(row);w.check((z-a).total_seconds()<=data['rules']['max_shift']*3600,'משמרת ארוכה מהמגבלה שהוגדרה')
            w.check(not old or len(old['employees'])<=count,'המכסה קטנה ממספר המשובצים',409)
            if old:
                if old['start']!=row['start'] or old['end']!=row['end']:
                    old.setdefault('time_history',[]).append({'date':old['date'],'start':old['start'],'end':old['end'],'at':datetime.now().astimezone().isoformat(),'reason':'עדכון מכסות ושעות'})
                old.update({k:row[k] for k in ('start','end','role','period','required')})
            else:data['slots'].append({**{k:row[k] for k in ('date','start','end','role','period','required')},'id':str(uuid4()),'employees':[]})
        journal('עדכון מכסות עובדים לשבוע')
    elif action=='period-times':
        from workforce_policy import unlocked
        period=b.get('period');role=b.get('role')
        w.check(period in data['periods'] and (not role or role in data['roles']),'תקופה או תפקיד לא תקינים')
        start=b.get('from',week);end=b.get('to',(w.day(week)+timedelta(days=6)).isoformat())
        w.check(w.week(start)==week and w.week(end)==week and start<=end,'טווח חייב להיות בשבוע הנבחר')
        a,z=w.interval({'date':start,'start':b.get('start'),'end':b.get('end')});w.check((z-a).total_seconds()<=data['rules']['max_shift']*3600,'משמרת ארוכה מהמגבלה שהוגדרה')
        rows=[s for s in data['slots'] if start<=s['date']<=end and s['period']==period and (not role or s['role']==role)]
        w.check(rows or b.get('save_default') is True,'אין משמרות בטיוטה בטווח שנבחר')
        unlocked(w,data,[s['date'] for s in rows])
        reason=text('reason')
        for row in rows:
            row.setdefault('time_history',[]).append({'start':row['start'],'end':row['end'],'at':datetime.now().astimezone().isoformat(),'reason':reason})
            row.update(start=b['start'],end=b['end'])
        if b.get('save_default') is True:
            for role_id in ([role] if role else data['roles']):data['time_defaults'][period+':'+role_id]={'start':b['start'],'end':b['end']}
        result['changed_slots']=len(rows);journal('עדכון זמני משמרות בטיוטה: '+reason)
    elif action=='message-manager-state':
        row=next((r for r in data['messages'] if r['id']==b.get('id')),None);w.check(row,'הודעה לא נמצאה',404)
        field=b.get('field');w.check(field in ('read','hidden'),'פעולה לא תקינה');actor=b.get('_actor','local-review')
        values=row.setdefault('manager_'+field,[])
        if actor not in values:values.append(actor)
    elif action=='manager-announcement':
        value=b.get('body');w.check(isinstance(value,str) and len(value)<=4000,'הודעת מנהל לא תקינה')
        data['manager_announcement']=value;journal('עדכון הודעת מנהל')
    elif action=='unpublish':
        w.check(data['published'].get(week) and data['publication_status'].get(week,True),'אין סידור מפורסם לשבוע זה',409)
        reason=text('reason');data['publication_status'][week]=False;journal('ביטול פרסום הסידור: '+reason)
    elif action=='delete-week':
        from workforce_policy import unlocked
        slots=[s for s in data['slots'] if w.week(s['date'])==week]
        cells=[s for s in data['pending_cells'] if w.week(s['date'])==week]
        unlocked(w,data,[s['date'] for s in slots+cells]+[week])
        reason=text('reason');w.check(slots or cells,'אין משמרות בטיוטה לשבוע זה',409)
        data['draft_history'].append({'id':str(uuid4()),'week':week,'at':datetime.now().astimezone().isoformat(),'reason':reason,'slots':copy.deepcopy(slots),'pending_cells':copy.deepcopy(cells)})
        data['slots']=[s for s in data['slots'] if w.week(s['date'])!=week];journal('מחיקת טיוטת השבוע, נשמר עותק היסטורי: '+reason)
        data['pending_cells']=[s for s in data['pending_cells'] if w.week(s['date'])!=week]
    elif action=='shift-priorities':
        values=b.get('values');w.check(isinstance(values,dict) and len(values)<=30,'מטריצת עדיפות לא תקינה')
        allowed=set(data['periods'])|{'opening','closing','reinforcement'}
        for period,row in values.items():
            w.check(period in allowed and isinstance(row,list) and len(row)==7,'מטריצת עדיפות לא תקינה')
            for value in row:w.check(isinstance(value,int) and not isinstance(value,bool) and 1<=value<=100,'עדיפות חייבת להיות מספר שלם בין 1 ל־100')
        data['shift_priorities']=copy.deepcopy(values);journal('עדכון עדיפות משמרות')
    elif action=='holiday':
        start=b.get('start');end=b.get('end');w.check(w.day(start)<=w.day(end),'טווח תאריכים לא תקין')
        w.check((w.day(end)-w.day(start)).days<=370,'טווח ארוך מדי')
        row={'id':b.get('id') or str(uuid4()),'title':text('title',150),'start':start,'end':end,'start_time':b.get('start_time','00:00'),'end_time':b.get('end_time','23:59'),'region':b.get('region',''),'religion':b.get('religion',''),'priority':b.get('priority',1),'active':b.get('active',True)}
        w.interval({'date':start,'start':row['start_time'],'end':row['end_time']})
        w.number(row['priority'],1,100);w.check(isinstance(row['active'],bool),'מצב לא תקין')
        w.check(all(isinstance(row[k],str) and len(row[k])<=150 for k in ('region','religion')),'אזור או דת לא תקינים')
        if b.get('id'):w.check(any(r['id']==b['id'] for r in data['holidays']),'הגדרה לא נמצאה',404)
        data['holidays']=[r for r in data['holidays'] if r['id']!=row['id']]+[row];journal('עדכון חג / יום מנוחה: '+row['title'])
    elif action=='delete-holiday':
        w.check(any(r['id']==b.get('id') for r in data['holidays']),'הגדרה לא נמצאה',404)
        data['holidays']=[r for r in data['holidays'] if r['id']!=b['id']];journal('מחיקת הגדרת חג / יום מנוחה')
    elif action=='reminder-definition':
        alerts=b.get('alerts');w.check(isinstance(alerts,list) and 1<=len(alerts)<=2,'נדרשות התראה אחת או שתיים')
        for alert in alerts:
            w.check(isinstance(alert,dict),'התראה לא תקינה');w.number(alert.get('days'),0,365)
            w.check(isinstance(alert['days'],int) and not isinstance(alert['days'],bool),'מספר ימים חייב להיות שלם')
            try:datetime.strptime(alert.get('time',''),'%H:%M')
            except (ValueError,TypeError):raise w.error('שעת התראה לא תקינה')
            w.check(alert.get('target') in ('employee','managers','both'),'נמען התראה לא תקין')
        row={'id':b.get('id') or str(uuid4()),'name':text('name',150),'title':text('title',150),'body':text('body',2000),'alerts':copy.deepcopy(alerts),'active':b.get('active',True)}
        w.check(isinstance(row['active'],bool),'מצב לא תקין')
        if b.get('id'):w.check(any(r['id']==b['id'] for r in data['reminder_definitions']),'תזכורת לא נמצאה',404)
        data['reminder_definitions']=[r for r in data['reminder_definitions'] if r['id']!=row['id']]+[row];journal('עדכון הגדרת תזכורת: '+row['name'])
    elif action=='configured-reminder':
        definition=next((r for r in data['reminder_definitions'] if r['id']==b.get('definition_id') and r['active']),None)
        w.check(definition,'יש לבחור הגדרת תזכורת פעילה',404);w.employee(people,b.get('employee_id'));w.day(b.get('due'))
        data['reminders'].append({'id':str(uuid4()),'employee_id':b['employee_id'],'definition_id':definition['id'],'title':definition['title'],'due':b['due'],'at':datetime.now().astimezone().isoformat(),'dismissed':False,'delivered':[]})
    elif action=='delete-reminder-definition':
        w.check(any(r['id']==b.get('id') for r in data['reminder_definitions']),'תזכורת לא נמצאה',404)
        data['reminder_definitions']=[r for r in data['reminder_definitions'] if r['id']!=b['id']];journal('מחיקת הגדרת תזכורת')
    else:return False
    return True

def deliver_reminders(w,now=None):
    """Deliver due notifications to the local portal, once per reminder/alert."""
    from zoneinfo import ZoneInfo
    tz=ZoneInfo('Asia/Jerusalem');now=now or datetime.now(tz)
    w.check(now.tzinfo is not None,'נדרש אזור זמן');now=now.astimezone(tz);count=0
    with w.store.connect(write=True) as c:
        data,revision,people=w.read(c);active={p['id'] for p in people if p['active']}
        definitions={r['id']:r for r in data['reminder_definitions'] if r['active']}
        for reminder in data['reminders']:
            definition=definitions.get(reminder.get('definition_id'))
            if not definition or reminder['dismissed'] or reminder['employee_id'] not in active:continue
            for index,alert in enumerate(definition['alerts']):
                key=str(index);due=datetime.combine(w.day(reminder['due'])-timedelta(days=alert['days']),datetime.strptime(alert['time'],'%H:%M').time(),tzinfo=tz)
                if due>now or now.date()>w.day(reminder['due']) or key in reminder.get('delivered',[]):continue
                recipients=[reminder['employee_id']] if alert['target']!='managers' else []
                data['messages'].append({'id':str(uuid4()),'title':definition['title'],'body':definition['body'],'recipients':recipients,'priority':'normal','pinned':False,'read':[],'hidden':[],'at':now.isoformat(),'channel':'local','reminder_id':reminder['id'],'alert_index':index,'manager_notice':alert['target']!='employee'})
                reminder.setdefault('delivered',[]).append(key);count+=1
        if count:
            c.execute('UPDATE workforce_state SET revision=?,data=? WHERE id=1',(revision+1,json.dumps(data,ensure_ascii=False)))
    return count
