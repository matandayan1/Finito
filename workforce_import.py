"""Strict CSV attendance preview and atomic import; no name/clock guessing."""
import csv, io, hashlib, json
from uuid import uuid4
from datetime import datetime
from workforce_policy import unlocked

def preview(w,data,people,text,week):
    w.check(isinstance(text,str) and 0<len(text)<=500000,'קובץ CSV חסר או גדול מדי')
    try:
        reader=csv.DictReader(io.StringIO(text.lstrip('\ufeff')))
        w.check(reader.fieldnames and {'date','start','end'}<=set(reader.fieldnames),'נדרשות עמודות date,start,end ובנוסף employee_id או name')
        w.check('employee_id' in reader.fieldnames or 'name' in reader.fieldnames,'נדרשת עמודת employee_id או name')
        w.check(len(reader.fieldnames)==len(set(reader.fieldnames)),'עמודות כפולות בקובץ אינן מותרות')
        raw=list(reader);w.check(1<=len(raw)<=500,'ייבוא מוגבל ל־500 שורות')
    except csv.Error:raise w.error('קובץ CSV לא תקין')
    rows=[];errors=[];duplicates=[]
    existing=data['attendance'][:]
    for index,row in enumerate(raw,2):
        try:
            employee=(row.get('employee_id') or '').strip()
            if not employee:
                matches=[p for p in people if p['active'] and p['name']==(row.get('name') or '').strip()]
                w.check(len(matches)==1,'שם עובד חסר, לא נמצא או אינו חד משמעי; יש להשתמש במזהה עובד')
                employee=matches[0]['id']
            w.employee(people,employee)
            record={'employee_id':employee,**{k:(row.get(k) or '').strip() for k in ('date','start','end')}}
            w.check(w.week(record['date'])==week,'תאריך מחוץ לשבוע הנבחר')
            unlocked(w,data,[record['date']]);start,end=w.interval(record)
            signature=hashlib.sha256(json.dumps(record,sort_keys=True).encode()).hexdigest()
            if any(r.get('import_signature')==signature or all(r.get(k)==record[k] for k in record) for r in existing):
                duplicates.append(index);continue
            for other in existing:
                if other['employee_id']!=employee:continue
                a,z=w.interval(other);w.check(not(a<end and start<z),'חפיפה עם נוכחות קיימת או שורה אחרת בקובץ')
            record.update(import_signature=signature,line=index);rows.append(record);existing.append(record)
        except w.error as e:errors.append({'line':index,'message':e.message})
    return {'rows':rows,'errors':errors,'duplicates':duplicates,'fingerprint':hashlib.sha256(text.encode()).hexdigest(),'can_import':bool(rows) and not errors}

def operation(w,action,b,data,people,c,week,result):
    if action!='attendance-import':return False
    check=preview(w,data,people,b.get('csv'),week)
    w.check(check['fingerprint']==b.get('fingerprint'),'הקובץ השתנה מאז הבדיקה; יש לבדוק שוב',409)
    w.check(not check['errors'],'קיימות שגיאות בקובץ. לא יובאה אף שורה',409)
    w.check(check['rows'],'אין דיווחים חדשים לייבוא',409)
    reason=str(b.get('reason','')).strip();w.check(2<=len(reason)<=1000,'נדרשת אסמכתא לייבוא')
    for row in check['rows']:
        data['attendance'].append({**{k:v for k,v in row.items() if k!='line'},'id':str(uuid4()),'reason':reason,'at':datetime.now().astimezone().isoformat(),'history':[],'import_file':check['fingerprint']})
    result['imported']=len(check['rows']);result['skipped_duplicates']=len(check['duplicates'])
    return True
