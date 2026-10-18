"""Read-only reports from explicit planning, attendance and tip records."""
from datetime import timedelta
from workforce_policy import effective_cost
from workforce_tips import stale

KINDS={'planned-detail','planned-summary','actual-detail','actual-summary','deviations','absence','tips-detail','tips-summary'}

def build(w,data,people,kind,start,end,employee=None,source='published'):
    w.check(kind in KINDS,'סוג דוח לא תקין')
    a,z=w.day(start),w.day(end);w.check(0<=(z-a).days<=366,'טווח הדוח מוגבל לשנה')
    w.check(source in ('published','draft'),'מקור תכנון לא תקין')
    names={p['id']:p['name'] for p in people}
    w.check(not employee or employee in names,'עובד לא נמצא',404)
    def within(r):return start<=r['date']<=end
    def duration(r):
        return w.duration(r)
    planned=data['slots'] if source=='draft' else [s for week,versions in data['published'].items() if versions and data.get('publication_status',{}).get(week,True) for s in versions[-1]['slots']]
    planned=[{**s,'employee_id':e} for s in planned if within(s) for e in s['employees'] if not employee or e==employee]
    actual=[r for r in data['attendance'] if within(r) and (not employee or r['employee_id']==employee)]
    warnings=[];rows=[]
    if kind.startswith(('planned','actual')):
        records=planned if kind.startswith('planned') else actual
        for r in records:
            hours=duration(r);cost=effective_cost(data,r['employee_id'],r['date'])
            rows.append({'employee_id':r['employee_id'],'name':names.get(r['employee_id'],r['employee_id']),'date':r['date'],'start':r['start'],'end':r['end'],'hours':round(hours,4),'base_cost':round(cost*hours,2) if cost is not None else None,'role':data['roles'].get(r.get('role'),''),'record_id':r['id']})
        if kind.endswith('summary'):
            groups={}
            for r in rows:
                g=groups.setdefault(r['employee_id'],{'employee_id':r['employee_id'],'name':r['name'],'records':0,'hours':0,'known_base_cost':0,'missing_cost_records':0})
                g['records']+=1;g['hours']+=r['hours']
                if r['base_cost'] is None:g['missing_cost_records']+=1
                else:g['known_base_cost']+=r['base_cost']
            rows=list(groups.values())
    elif kind=='deviations':
        pairs=sorted({(r['employee_id'],r['date']) for r in planned+actual})
        for e,day in pairs:
            p=[r for r in planned if r['employee_id']==e and r['date']==day];v=[r for r in actual if r['employee_id']==e and r['date']==day]
            ph=sum(duration(r) for r in p);vh=sum(duration(r) for r in v)
            late=None
            if len(p)==len(v)==1:late=round((w.interval(v[0])[0]-w.interval(p[0])[0]).total_seconds()/60)
            rows.append({'employee_id':e,'name':names.get(e,e),'date':day,'planned_hours':round(ph,4),'actual_hours':round(vh,4),'difference_hours':round(vh-ph,4),'arrival_difference_minutes':late,'status':'אין דיווח נוכחות' if not v else 'אין שיבוץ מתוכנן' if not p else 'מספר רשומות; נדרשת בדיקה' if len(p)!=1 or len(v)!=1 else 'ניתן להשוואה'})
        warnings.append('אין דיווח נוכחות אינו אישור להיעדרות. הפרש כניסה מחושב רק כשיש משמרת אחת ודיווח אחד ביום.')
    elif kind=='absence':
        for r in data['requests']:
            if r['kind']!='leave' or r['status']!='approved' or employee and r['employee_id']!=employee:continue
            begin=max(a,w.day(r['date']));finish=min(z,w.day(r.get('end_date',r['date'])))
            for offset in range(max(0,(finish-begin).days+1)):
                rows.append({'employee_id':r['employee_id'],'name':names.get(r['employee_id'],r['employee_id']),'date':(begin+timedelta(days=offset)).isoformat(),'status':'חופשה מאושרת','request_id':r['id']})
    else:
        for r in data['tips']:
            calc=r.get('calculation')
            if not within(r) or not calc:continue
            outdated=stale(r,data['attendance'])
            if outdated:warnings.append('חישוב טיפים עם נתוני מקור שהשתנו: '+r['date']+' / '+data['periods'][r['period']])
            for e,cents in calc['allocation'].items():
                if employee and e!=employee:continue
                rows.append({'employee_id':e,'name':names.get(e,e),'date':r['date'],'period':data['periods'][r['period']],'minutes':calc['minutes'][e],'weight':calc['weights'][e],'tip_amount':cents/100,'locked':r['locked'],'stale':outdated,'version':calc['version']})
        if kind=='tips-summary':
            groups={}
            for r in rows:
                g=groups.setdefault(r['employee_id'],{'employee_id':r['employee_id'],'name':r['name'],'tip_amount':0,'minutes':0,'unlocked_records':0,'stale_records':0})
                g['tip_amount']=round(g['tip_amount']+r['tip_amount'],2);g['minutes']+=r['minutes'];g['unlocked_records']+=not r['locked'];g['stale_records']+=r['stale']
            rows=list(groups.values())
    return {'kind':kind,'start':start,'end':end,'source':source,'rows':rows,'warnings':warnings,'disclaimer':'נתוני תפעול מקומיים. עלות בסיס אינה חישוב שכר, שעות נוספות או מס.'}
