"""Explicitly shared shift offers; accepting is a request, manager approval revalidates."""
import copy
from datetime import datetime
from uuid import uuid4
FIELDS=('date','start','end','period','role')
def defaults(data):data.setdefault('offers',[]);data.setdefault('offer_requests',[])
def matching(offer,slot):return bool(slot and all(offer[k]==slot[k] for k in FIELDS))
def operation(w,action,b,data,people,c,week,result):
    stamp=lambda:datetime.now().astimezone().isoformat()
    if action=='offer-shift':
        slot=next((s for s in data['slots'] if s['id']==b.get('slot_id') and w.week(s['date'])==week),None)
        w.check(slot and len(slot['employees'])<slot['required'],'יש לבחור משמרת עם מקום פנוי')
        w.check(not any(r['slot_id']==slot['id'] and r['status']=='open' for r in data['offers']),'כבר קיימת הצעה פתוחה למשמרת',409)
        data['offers'].append({'id':str(uuid4()),'slot_id':slot['id'],**{k:slot[k] for k in FIELDS},'status':'open','at':stamp(),'note':str(b.get('note',''))[:300]})
    elif action=='close-offer':
        row=next((r for r in data['offers'] if r['id']==b.get('id')),None);w.check(row,'הצעה לא נמצאה',404);row.update(status='closed',closed_at=stamp())
    elif action=='request-offer':
        employee=b.get('employee_id');w.employee(people,employee)
        offer=next((r for r in data['offers'] if r['id']==b.get('offer_id') and r['status']=='open'),None);w.check(offer,'ההצעה נסגרה או חסרה',409)
        slot=next((s for s in data['slots'] if s['id']==offer['slot_id']),None)
        w.check(matching(offer,slot) and w.week(slot['date'])==week,'פרטי המשמרת השתנו; יש לפנות למנהל',409)
        w.check(employee not in slot['employees'] and len(slot['employees'])<slot['required'],'העובד כבר משובץ או שהמשמרת מלאה',409)
        legacy=[dict(r) for r in c.execute('SELECT * FROM shifts')]
        w.check(not w.reasons(data,slot,employee,people,legacy),'הבקשה אינה עומדת בכל כללי השיבוץ; ניתן לפנות למנהל לבדיקה',409)
        w.check(not any(r['offer_id']==offer['id'] and r['employee_id']==employee and r['status']=='pending' for r in data['offer_requests']),'כבר קיימת בקשה ממתינה',409)
        data['offer_requests'].append({'id':str(uuid4()),'offer_id':offer['id'],'employee_id':employee,'status':'pending','at':stamp()})
    elif action=='resolve-offer':
        request=next((r for r in data['offer_requests'] if r['id']==b.get('id') and r['status']=='pending'),None);w.check(request,'הבקשה חסרה או כבר טופלה',409)
        decision=b.get('decision');w.check(decision in ('approved','rejected'),'החלטה לא תקינה')
        if decision=='approved':
            offer=next((r for r in data['offers'] if r['id']==request['offer_id'] and r['status']=='open'),None);w.check(offer,'ההצעה נסגרה',409)
            slot=next((s for s in data['slots'] if s['id']==offer['slot_id']),None)
            w.check(matching(offer,slot) and w.week(slot['date'])==week,'פרטי המשמרת השתנו; יש לפרסם הצעה מעודכנת',409)
            employee=request['employee_id'];w.employee(people,employee)
            w.check(employee not in slot['employees'] and len(slot['employees'])<slot['required'],'המשמרת כבר מלאה או שהעובד כבר משובץ',409)
            legacy=[dict(r) for r in c.execute('SELECT * FROM shifts')];reasons=w.reasons(data,slot,employee,people,legacy);w.check(not reasons,' · '.join(reasons),409)
            slot['employees'].append(employee)
            if len(slot['employees'])==slot['required']:offer['status']='filled'
        request.update(status=decision,resolved_at=stamp())
    else:return False
    return True
