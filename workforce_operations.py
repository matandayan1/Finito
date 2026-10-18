"""Local workforce workflows; all mutations share the parent's revision transaction."""
import copy
from workforce_policy import availability_open
from datetime import timedelta
from uuid import uuid4
from datetime import datetime

def defaults(data):
    for name,value in {'availability_locks':{},'recurring_availability':{},'attendance':[], 'journal':[]}.items():
        data.setdefault(name,copy.deepcopy(value))

def operation(w,action,b,data,people,c,week,result):
    def text(field,minimum=2,maximum=1000):
        value=str(b.get(field,'')).strip()
        w.check(minimum<=len(value)<=maximum,'נדרש טקסט תקין: '+field)
        return value
    def now():return datetime.now().astimezone().isoformat()
    if action=='availability-lock':
        w.check(isinstance(b.get('locked'),bool),'מצב נעילה לא תקין')
        reason=text('reason')
        data['availability_locks'][week]=b['locked']
        data['journal'].append({'id':str(uuid4()),'date':week,'note':('נעילת זמינות: ' if b['locked'] else 'פתיחת זמינות: ')+reason,'at':now()})
    elif action=='recurring-save':
        employee=b.get('employee_id');w.employee(people,employee)
        # Copy only explicitly submitted dates. Unknown stays unknown.
        pattern={str(i):copy.deepcopy(data['availability'].get(employee,{}).get((w.day(week)+timedelta(days=i)).isoformat())) for i in range(7)}
        data['recurring_availability'][employee]=pattern
    elif action=='recurring-apply':
        employee=b.get('employee_id');w.employee(people,employee)
        availability_open(w,data,week)
        pattern=data['recurring_availability'].get(employee)
        w.check(pattern is not None,'טרם נשמרה זמינות קבועה')
        days=data['availability'].setdefault(employee,{})
        for i in range(7):
            day=(w.day(week)+timedelta(days=i)).isoformat()
            submitted=data.get('period_availability',{}).get(employee,{}).get(week,{}).get('days',{})
            if day not in days and day not in submitted and pattern.get(str(i)) is not None:days[day]=copy.deepcopy(pattern[str(i)])
    elif action=='shift-limits':
        employee=b.get('employee_id');w.employee(people,employee)
        limits=b.get('limits');w.check(isinstance(limits,dict),'מכסות לא תקינות')
        w.check(set(limits)<=set(data['periods'])|{'total'},'תקופה לא תקינה')
        for value in limits.values():
            w.check(value is None or isinstance(value,int) and not isinstance(value,bool) and 0<=value<=21,'מכסה חייבת להיות בין 0 ל־21')
        data['profiles'].setdefault(employee,{})['shift_limits']=limits
    elif action=='journal':
        day=b.get('date');w.check(w.week(day)==week,'תאריך מחוץ לשבוע')
        data['journal'].append({'id':str(uuid4()),'date':day,'note':text('note'),'at':now()})
    elif action=='attendance':
        employee=b.get('employee_id');w.employee(people,employee)
        day=b.get('date');w.check(w.week(day)==week,'תאריך מחוץ לשבוע')
        start,end=w.interval(b);w.check((end-start).total_seconds()<=24*3600,'טווח נוכחות לא תקין')
        reason=text('reason')
        row=next((r for r in data['attendance'] if r['id']==b.get('id')),None)
        w.check(not b.get('id') or row,'רישום נוכחות לא נמצא',404)
        for other in data['attendance']:
            if other is row or other['employee_id']!=employee:continue
            a,z=w.interval(other);w.check(not(a<end and start<z),'חפיפה עם רישום נוכחות אחר',409)
        if row:
            w.check(row['employee_id']==employee and w.week(row['date'])==week,'רישום הנוכחות שייך לעובד או לשבוע אחר',409)
            history=row.setdefault('history',[]);history.append({k:copy.deepcopy(v) for k,v in row.items() if k!='history'})
            row.update(date=day,start=b['start'],end=b['end'],reason=reason,at=now(),corrected=True)
        else:data['attendance'].append({'id':str(uuid4()),'employee_id':employee,'date':day,'start':b['start'],'end':b['end'],'reason':reason,'at':now(),'history':[]})
    else:return False
    return True
