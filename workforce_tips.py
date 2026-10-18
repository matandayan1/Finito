"""Explicit local tip pool allocation, in integer cents. Not payroll calculation."""
import copy, hashlib, json
from decimal import Decimal, InvalidOperation
from datetime import datetime
from uuid import uuid4

def defaults(data):data.setdefault('tips',[])

def fingerprint(row,attendance):
    ids=set(row.get('attendance_ids',[]))
    records=sorted([{k:r.get(k) for k in ('id','employee_id','date','start','end','actual_start','actual_end','corrected')} for r in attendance if r['id'] in ids],key=lambda r:r['id'])
    value={'records':records,'ids':sorted(ids),'cash':row['cash'],'card':row['card'],'weights':row['weights']}
    return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()

def stale(row,attendance):
    return bool(row.get('calculation') and row['calculation']['fingerprint']!=fingerprint(row,attendance))

def operation(w,action,b,data,people,c,week,result):
    if action not in ('tip-save','tip-calculate','tip-lock','tip-unlock','tip-clear'):return False
    date=b.get('date');w.check(w.week(date)==week,'תאריך מחוץ לשבוע')
    period=b.get('period');w.check(period in data['periods'],'תקופה לא תקינה')
    row=next((r for r in data['tips'] if r['date']==date and r['period']==period),None)
    stamp=lambda:datetime.now().astimezone().isoformat()
    if action=='tip-unlock':
        w.check(row and row['locked'],'הרישום אינו נעול',409)
        reason=str(b.get('reason','')).strip();w.check(2<=len(reason)<=1000,'נדרשת סיבה לפתיחת נעילה')
        row['locked']=False;row['events'].append({'action':'unlock','reason':reason,'at':stamp()});return True
    w.check(not row or not row['locked'],'הטיפים נעולים לעריכה',409)
    if action=='tip-save':
        def money(field):
            try:
                value=Decimal(str(b.get(field,'')))
                w.check(value.is_finite() and 0<=value<=1000000 and value==value.quantize(Decimal('.01')),'סכום חייב להיות חיובי או אפס, עם עד שתי ספרות אחרי הנקודה')
                return int(value*100)
            except (InvalidOperation,ValueError,TypeError):raise w.error('סכום לא תקין')
        ids=b.get('attendance_ids');w.check(isinstance(ids,list) and ids and len(ids)==len(set(ids)),'יש לבחור דיווחי נוכחות ללא כפילויות')
        records=[r for r in data['attendance'] if r['id'] in ids and r['date']==date]
        w.check(len(records)==len(ids),'דיווח נוכחות חסר או מתאריך אחר')
        employees={r['employee_id'] for r in records};weights=b.get('weights',{})
        w.check(isinstance(weights,dict) and set(weights)<=employees,'מקדמי חלוקה לא תקינים')
        for value in weights.values():w.number(value,.01,100)
        if row is None:
            row={'id':str(uuid4()),'date':date,'period':period,'locked':False,'events':[],'calculations':[]};data['tips'].append(row)
        row.update(cash=money('cash'),card=money('card'),attendance_ids=ids,weights={e:weights.get(e,1) for e in employees})
        row['events'].append({'action':'save','cash':row['cash'],'card':row['card'],'attendance_ids':ids[:],'weights':copy.deepcopy(row['weights']),'at':stamp()})
    elif action=='tip-calculate':
        w.check(row,'יש לשמור סכומים ונוכחות לפני חישוב',409)
        records=[r for r in data['attendance'] if r['id'] in row['attendance_ids']]
        w.check(len(records)==len(row['attendance_ids']),'נוכחות חסרה',409)
        for other in data['tips']:
            if other is row or not other.get('calculation'):continue
            w.check(not(set(other['calculation']['attendance_ids'])&set(row['attendance_ids'])),'דיווח נוכחות כבר נכלל בחישוב טיפים אחר. יש לפצל את דיווח הנוכחות או להסיר את החישוב הקודם',409)
        minutes={}
        for r in records:
            minutes[r['employee_id']]=minutes.get(r['employee_id'],0)+round(w.duration(r)*60)
        weighted={e:Decimal(n)*Decimal(str(row['weights'][e])) for e,n in minutes.items()};total=sum(weighted.values())
        pool=row['cash']+row['card'];exact={e:Decimal(pool)*n/total for e,n in weighted.items()};allocation={e:int(n) for e,n in exact.items()}
        remainder=pool-sum(allocation.values())
        for e in sorted(exact,key=lambda e:(-(exact[e]-allocation[e]),e))[:remainder]:allocation[e]+=1
        calculation={'version':len(row['calculations'])+1,'at':stamp(),'pool':pool,'allocation':allocation,'minutes':minutes,'weights':copy.deepcopy(row['weights']),'attendance_ids':row['attendance_ids'][:],'fingerprint':fingerprint(row,data['attendance'])}
        row['calculation']=calculation;row['calculations'].append(copy.deepcopy(calculation));row['events'].append({'action':'calculate','version':calculation['version'],'at':stamp()})
        result['calculation']=calculation
    elif action=='tip-lock':
        w.check(row and row.get('calculation'),'אין חישוב לנעילה',409)
        w.check(not stale(row,data['attendance']),'נתוני המקור השתנו; יש לחשב מחדש לפני נעילה',409)
        row['locked']=True;row['events'].append({'action':'lock','at':stamp()})
    elif action=='tip-clear':
        w.check(row and row.get('calculation'),'אין חישוב פעיל',409)
        row.pop('calculation');row['events'].append({'action':'clear','at':stamp()})
    return True

def guard_attendance(w,b,data):
    if b.get('id'):
        w.check(not any(r['locked'] and b['id'] in r.get('calculation',{}).get('attendance_ids',[]) for r in data['tips']),'הנוכחות כלולה בטיפים נעולים. יש לפתוח את נעילת הטיפים עם סיבה לפני תיקון',409)
