"""Explicit period availability, separate from optional precise time ranges."""
import copy
from datetime import date, timedelta, datetime

def defaults(data):
    data.setdefault('period_availability',{})
    data.setdefault('period_availability_defaults',{})

def week_of(day):
    value=date.fromisoformat(day);return (value-timedelta(days=(value.weekday()+1)%7)).isoformat()

def decision(data,employee,day,period):
    return data.get('period_availability',{}).get(employee,{}).get(week_of(day),{}).get('days',{}).get(day,{}).get(period)

def has_availability(data,employee,day):
    return bool(data['availability'].get(employee,{}).get(day)) or any(data.get('period_availability',{}).get(employee,{}).get(week_of(day),{}).get('days',{}).get(day,{}).values())

def operation(w,action,b,data,people,c,week,result):
    if action not in ('period-availability','period-default-save','period-default-delete'):return False
    employee=b.get('employee_id');w.employee(people,employee)
    if action=='period-default-delete':
        data['period_availability_defaults'].pop(employee,None);return True
    days=b.get('days');note=b.get('note','')
    w.check(isinstance(note,str) and len(note)<=2000,'הערה שבועית ארוכה מדי')
    w.check(isinstance(days,dict) and len(days)==7,'יש להגדיר את שבעת ימי השבוע')
    for day,values in days.items():
        w.check(w.week(day)==week,'זמינות מחוץ לשבוע הנבחר')
        w.check(isinstance(values,dict) and set(values)==set(data['periods']) and all(isinstance(v,bool) for v in values.values()),'סימון זמינות לא תקין')
    record={'days':copy.deepcopy(days),'note':note,'at':datetime.now().astimezone().isoformat()}
    if action=='period-availability':
        from workforce_policy import availability_open,unlocked
        availability_open(w,data,week);unlocked(w,data,list(days))
        data['period_availability'].setdefault(employee,{})[week]=record
    else:
        record['days']={str((w.day(day)-w.day(week)).days):copy.deepcopy(values) for day,values in days.items()}
        data['period_availability_defaults'][employee]=record
    return True
