"""Restaurant-defined scheduling policy. No assumed employment-law rules."""
import copy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import uuid4

TZ=ZoneInfo('Asia/Jerusalem')

def defaults(data):
    for field,value in {'deadlines':{},'history_lock':None,'blocked_leave':[], 'staffing_templates':[], 'cost_history':{}, 'cost_baselines':{}, 'messages':[], 'documents':[], 'certifications':[], 'reminders':[]}.items():
        data.setdefault(field,copy.deepcopy(value))

def availability_open(w,data,week):
    w.check(not data['availability_locks'].get(week),'הגשת הזמינות לשבוע נעולה',409)
    deadline=data['deadlines'].get(week)
    if deadline:
        w.check(datetime.now(TZ)<datetime.fromisoformat(deadline),'המועד האחרון להגשת זמינות עבר. מנהל יכול לעדכן את מועד ההגשה',409)

def unlocked(w,data,days):
    lock=data.get('history_lock')
    w.check(not lock or all(day>lock for day in days),'התאריך נעול לעריכה היסטורית. יש לפתוח את הנעילה בהגדרות עם סיבה',409)

def effective_cost(data,employee,day):
    records=[r for r in data.get('cost_history',{}).get(employee,[]) if r['from']<=day]
    return max(records,key=lambda r:r['from'])['value'] if records else data.get('cost_baselines',{}).get(employee,data['profiles'].get(employee,{}).get('hourly_cost'))

def guard(w,action,b,data,week):
    # Resolve affected dates from persisted rows, never trust only the client's week.
    if action in ('period-default-save','period-default-delete','history-lock','deadline','availability-lock','employee-status','employee','configure','rules','shift-limits','recurring-save','cost-value','message','message-state','document','document-state','document-ack','certification','reminder','reminder-dismiss','reward','points','claim-reward','resolve-claim','blocked-leave','remove-blocked-leave','save-staffing-template'):
        return
    if action in ('attendance','journal','slot','request','cell-create','tip-save','tip-calculate','tip-lock','tip-unlock','tip-clear'):
        dates=[b.get('date',week)]
        if b.get('id'):
            dates += [r['date'] for r in data['slots']+data['attendance'] if r['id']==b['id']]
    elif action in ('assign','remove','delete-slot'):
        dates=[s['date'] for s in data['slots'] if s['id']==b.get('slot_id')]
    elif action in ('cell-assign','cell-remove','cell-delete'):
        dates=[s['date'] for s in data.get('pending_cells',[]) if s['id']==b.get('slot_id')]
    elif action in ('resolve-request','cancel-leave'):
        row=next((r for r in data['requests'] if r['id']==b.get('id')),None)
        dates=[row['date']] if row else []
    elif action in ('availability','period-availability'):dates=list((b.get('days') or {}).keys())
    else:dates=[week]
    for day in dates:w.day(day)
    unlocked(w,data,dates)

def operation(w,action,b,data,people,c,week,result):
    stamp=lambda:datetime.now(TZ).isoformat()
    def txt(field,minimum=2,maximum=1000):
        value=str(b.get(field,'')).strip();w.check(minimum<=len(value)<=maximum,'נדרש טקסט תקין: '+field);return value
    def journal(note,day=week):
        data['journal'].append({'id':str(uuid4()),'date':day,'note':note,'at':stamp()})
    if action=='deadline':
        value=b.get('deadline')
        if value:
            try:
                dt=datetime.fromisoformat(value)
                w.check(dt.tzinfo is not None,'מועד הגשה חייב לכלול אזור זמן')
            except (ValueError,TypeError):raise w.error('מועד הגשה לא תקין')
            data['deadlines'][week]=dt.astimezone(TZ).isoformat()
        else:data['deadlines'].pop(week,None)
        journal('עדכון מועד הגשה: '+txt('reason'))
    elif action=='history-lock':
        value=b.get('date')
        if value:w.day(value)
        data['history_lock']=value or None;journal('עדכון נעילת היסטוריה: '+txt('reason'))
    elif action=='employee-status':
        employee=b.get('employee_id');person=next((p for p in people if p['id']==employee),None)
        w.check(person,'עובד לא נמצא',404)
        status=b.get('status');w.check(status in ('active','dormant','deleted'),'מצב עובד לא תקין')
        reason=txt('reason')
        c.execute('UPDATE employees SET active=? WHERE id=?',(int(status=='active'),employee))
        data['profiles'].setdefault(employee,{})['status']=status
        journal('שינוי מצב עובד: '+person['name']+' · '+status+' · '+reason)
    elif action=='blocked-leave':
        start=w.day(b.get('start'));end=w.day(b.get('end'))
        w.check(0<=(end-start).days<=366,'טווח תאריכים לא תקין')
        data['blocked_leave'].append({'id':str(uuid4()),'start':start.isoformat(),'end':end.isoformat(),'reason':txt('reason'),'at':stamp()})
    elif action=='remove-blocked-leave':
        row=next((r for r in data['blocked_leave'] if r['id']==b.get('id')),None);w.check(row,'חסימה לא נמצאה',404)
        journal('הסרת חסימת חופשות: '+txt('reason'));data['blocked_leave'].remove(row)
    elif action=='save-staffing-template':
        slots=[s for s in data['slots'] if w.week(s['date'])==week];w.check(slots,'אין דרישות בשבוע הנבחר')
        rows=[{**{k:s[k] for k in ('start','end','period','role','required','min_experienced','max_trainees','tags','training_friendly') if k in s},'day':(w.day(s['date'])-w.day(week)).days} for s in slots]
        data['staffing_templates'].append({'id':str(uuid4()),'title':txt('title',2,100),'rows':rows,'at':stamp()})
    elif action=='apply-staffing-template':
        template=next((r for r in data['staffing_templates'] if r['id']==b.get('id')),None);w.check(template,'תבנית לא נמצאה',404)
        w.check(not any(w.week(s['date'])==week for s in data['slots']),'יש להחיל תבנית על שבוע ריק',409)
        for row in template['rows']:
            slot={k:v for k,v in row.items() if k!='day'}
            slot.update(id=str(uuid4()),date=(w.day(week)+timedelta(days=row['day'])).isoformat(),employees=[])
            a,z=w.interval(slot);w.check((z-a).total_seconds()/3600<=data['rules']['max_shift'],'תבנית חורגת ממגבלת אורך המשמרת')
            data['slots'].append(slot)
    elif action=='restore-published':
        versions=data['published'].get(week,[]);version=b.get('version')
        source=next((v for v in versions if v['version']==version),None);w.check(source,'גרסה לא נמצאה',404)
        reason=txt('reason');before=copy.deepcopy([s for s in data['slots'] if w.week(s['date'])==week])
        data.setdefault('draft_history',[]).append({'week':week,'slots':before,'at':stamp(),'reason':reason})
        data['slots']=[s for s in data['slots'] if w.week(s['date'])!=week]+copy.deepcopy(source['slots'])
        journal('שחזור גרסה לטיוטה: '+str(version)+' · '+reason)
    elif action=='cancel-leave':
        row=next((r for r in data['requests'] if r['id']==b.get('id')),None)
        w.check(row and row['kind']=='leave' and row['status'] in ('pending','approved'),'בקשת חופשה אינה ניתנת לביטול',409)
        row.update(status='cancelled',cancel_reason=txt('reason'),resolved_at=stamp())
        journal('ביטול חופשה: '+row['employee_id']+' · '+row['cancel_reason'])
        # Keep explicit unavailability and vacant slots; never invent employee consent.
    elif action=='cost-value':
        employee=b.get('employee_id');w.employee(people,employee);day=b.get('from');w.day(day)
        unlocked(w,data,[day]);value=w.number(b.get('value'),0,2000)
        rows=data['cost_history'].setdefault(employee,[])
        w.check(not any(r['from']==day for r in rows),'כבר קיימת עלות לתאריך זה; יש לבחור תאריך תחולה אחר',409)
        rows.append({'id':str(uuid4()),'from':day,'value':value,'reason':txt('reason'),'at':stamp()})
    elif action=='message':
        recipients=b.get('recipients');w.check(isinstance(recipients,list) and recipients,'יש לבחור נמענים')
        for employee in recipients:w.employee(people,employee)
        priority=b.get('priority','normal');w.check(priority in ('low','normal','high'),'עדיפות לא תקינה')
        data['messages'].append({'id':str(uuid4()),'title':txt('title',2,150),'body':txt('body',2,4000),'recipients':list(dict.fromkeys(recipients)),'priority':priority,'pinned':b.get('pinned') is True,'read':[],'hidden':[],'at':stamp(),'channel':'local'})
    elif action=='message-state':
        row=next((r for r in data['messages'] if r['id']==b.get('id')),None);w.check(row,'הודעה לא נמצאה',404)
        employee=b.get('employee_id');w.employee(people,employee);w.check(employee in row['recipients'],'העובד אינו נמען',403)
        field=b.get('field');w.check(field in ('read','hidden'),'פעולה לא תקינה')
        if employee not in row[field]:row[field].append(employee)
    elif action=='document':
        role=b.get('role');w.check(not role or role in data['roles'],'תפקיד לא תקין')
        from workforce_files import save
        attachment=save(w,c,b['file']) if b.get('file') else None
        content=txt('body',0 if attachment else 2,20000)
        record={'id':str(uuid4()),'title':txt('title',2,150),'body':content,'role':role or None,'at':stamp(),'ack':[],'archived':False,'pinned':b.get('pinned') is True}
        if attachment:record['file']=attachment
        data['documents'].append(record)
    elif action=='document-state':
        row=next((r for r in data['documents'] if r['id']==b.get('id')),None);w.check(row,'מסמך לא נמצא',404)
        field=b.get('field');w.check(field in ('archived','pinned') and isinstance(b.get('value'),bool),'עדכון מסמך לא תקין')
        row[field]=b['value']
    elif action=='document-ack':
        row=next((r for r in data['documents'] if r['id']==b.get('id')),None);w.check(row and not row.get('archived'),'מסמך לא נמצא או הועבר לארכיון',404)
        employee=b.get('employee_id');w.employee(people,employee)
        w.check(not row['role'] or row['role'] in data['profiles'].get(employee,{}).get('roles',[]),'המסמך שייך לתפקיד אחר',403)
        if not any(a['employee_id']==employee for a in row['ack']):row['ack'].append({'employee_id':employee,'at':stamp()})
    elif action=='certification':
        employee=b.get('employee_id');w.employee(people,employee)
        expires=b.get('expires');w.day(expires)
        data['certifications'].append({'id':str(uuid4()),'employee_id':employee,'title':txt('title',2,150),'expires':expires,'evidence':txt('evidence',2,1000),'at':stamp()})
    elif action=='reminder':
        employee=b.get('employee_id');w.employee(people,employee);due=b.get('due');w.day(due)
        data['reminders'].append({'id':str(uuid4()),'employee_id':employee,'title':txt('title',2,150),'due':due,'at':stamp(),'dismissed':False})
    elif action=='reminder-dismiss':
        row=next((r for r in data['reminders'] if r['id']==b.get('id')),None);w.check(row,'תזכורת לא נמצאה',404);row['dismissed']=True
    else:return False
    return True

def publication_messages(data,week,version,slots):
    recipients=sorted({e for s in slots for e in s['employees']})
    # Include staff removed since the previous publication, so they see the change too.
    versions=data['published'].get(week,[])
    if len(versions)>1:recipients=sorted(set(recipients)|{e for s in versions[-2]['slots'] for e in s['employees']})
    if recipients:data['messages'].append({'id':str(uuid4()),'title':'פורסם סידור עבודה','body':f'{week} · גרסה {version}. יש לבדוק את המשמרות בפורטל המקומי.','recipients':recipients,'priority':'normal','pinned':False,'read':[],'hidden':[],'at':datetime.now(TZ).isoformat(),'channel':'local','week':week,'version':version})
