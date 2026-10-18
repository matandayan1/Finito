"""Restaurant-selectable attendance entry. No biometric templates are collected."""
import hashlib,hmac,json,secrets,re,os
from datetime import datetime,timedelta,timezone
from zoneinfo import ZoneInfo
from http.cookies import SimpleCookie
from workforce_policy import unlocked

TZ=ZoneInfo('Asia/Jerusalem')
def now():return datetime.now(timezone.utc)
def sha(value):return hashlib.sha256(value.encode()).hexdigest()

class Clock:
    def __init__(self,store,error):
        self.store,self.error=store,error
        with store.connect(write=True) as c:
            c.executescript('''
            CREATE TABLE IF NOT EXISTS clock_pins(employee_id TEXT PRIMARY KEY,salt TEXT NOT NULL,hash TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS clock_stations(id TEXT PRIMARY KEY,name TEXT NOT NULL,enrollment TEXT,token TEXT,expires TEXT,active INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS clock_pin_failures(station TEXT,at TEXT);
            CREATE TABLE IF NOT EXISTS clock_events(id TEXT PRIMARY KEY,employee_id TEXT NOT NULL,direction TEXT NOT NULL,at TEXT NOT NULL,source TEXT NOT NULL,data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS clock_open(employee_id TEXT PRIMARY KEY,at TEXT NOT NULL,source TEXT NOT NULL,event_id TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS clock_devices(id TEXT PRIMARY KEY,name TEXT NOT NULL,secret BLOB NOT NULL,active INTEGER NOT NULL DEFAULT 1);
            ''')
    def check(self,ok,message,status=400):
        if not ok:raise self.error(message,status)
    def cookie(self,cookie,name):
        jar=SimpleCookie()
        try:jar.load(cookie or '');return jar[name].value if name in jar else ''
        except Exception:return ''
    def station(self,cookie):
        value=self.cookie(cookie,'hospitality_station')
        with self.store.connect() as c:row=c.execute('SELECT id,name FROM clock_stations WHERE token=? AND active=1',(sha(value),)).fetchone() if value else None
        return dict(row) if row else None
    def status(self,identity,cookie):
        station=self.station(cookie)
        self.check(identity or station or not self.store.security.enabled(),'נדרשת התחברות או עמדת נוכחות מורשית',401)
        with self.store.connect() as c:
            data,_,people=self.store.workforce.read(c)
            opened=[dict(r) for r in c.execute('SELECT employee_id,at,source FROM clock_open')]
            configured=[r[0] for r in c.execute('SELECT employee_id FROM clock_pins')]
            devices=[dict(r) for r in c.execute('SELECT id,name,active FROM clock_devices')]
            stations=[dict(r) for r in c.execute('SELECT id,name,active FROM clock_stations')]
        manager=bool(identity and identity['role']=='manager')
        employee=identity.get('employee_id') if identity and identity['role']=='employee' else None
        if employee:self.store.workforce.employee(people,employee)
        if employee:opened=[r for r in opened if r['employee_id']==employee]
        return {'methods':data.get('clock_methods',[]),'station':station,'employees':[{'id':p['id'],'name':p['name']} for p in people if p['active'] and (manager or station or p['id']==employee)],'open':opened if identity else [],'pin_configured':configured if manager else [],'devices':devices if manager else [],'stations':stations if manager else [],'identity':identity,'server_time':now().isoformat(),'biometric_data_stored':False}
    def manager(self,identity):self.check(identity and identity['role']=='manager','נדרשת התחברות של מנהל',403)
    def action(self,action,b,identity,cookie):
        w=self.store.workforce
        if action=='enroll':
            token=str(b.get('token',''))
            with self.store.connect(write=True) as c:
                row=c.execute('SELECT * FROM clock_stations WHERE enrollment=? AND active=1 AND expires>?',(sha(token),now().isoformat())).fetchone()
                self.check(row,'קישור הפעלת העמדה אינו תקף',403)
                session=secrets.token_urlsafe(32);c.execute('UPDATE clock_stations SET enrollment=NULL,token=? WHERE id=?',(sha(session),row['id']))
                # A shared tablet must not retain its owner's manager session.
                owner_token=self.cookie(cookie,'hospitality_session')
                if owner_token:c.execute('DELETE FROM sessions WHERE token=?',(sha(owner_token),))
                self.store.audit(c,'enroll','clock-station',row['id'],{})
            return {'ok':True},['hospitality_station='+session+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000','hospitality_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0']
        if action=='pin':
            station=self.station(cookie);self.check(station,'נדרשת עמדת נוכחות מורשית',403)
            employee=b.get('employee_id');pin=b.get('pin');self.check(isinstance(pin,str) and re.fullmatch(r'[0-9]{6,12}',pin),'קוד עובד חייב להכיל 6–12 ספרות')
            with self.store.connect(write=True) as c:
                c.execute('DELETE FROM clock_pin_failures WHERE at<?',((now()-timedelta(minutes=5)).isoformat(),))
                count=c.execute('SELECT count(*) FROM clock_pin_failures WHERE station=?',(station['id'],)).fetchone()[0];self.check(count<5,'יותר מדי ניסיונות בעמדה. יש להמתין חמש דקות',429)
                row=c.execute('SELECT * FROM clock_pins WHERE employee_id=?',(employee,)).fetchone()
                valid=bool(row and hmac.compare_digest(row['hash'],self.store.security.password_hash(pin,row['salt'])))
                if not valid:c.execute('INSERT INTO clock_pin_failures VALUES(?,?)',(station['id'],now().isoformat()))
            self.check(valid,'פרטי העובד או הקוד אינם תקינים',403)
            return self.punch(employee,b.get('direction'),'pin:'+station['id'],b.get('request_id')),None
        if action=='punch':
            self.check(identity and identity['role']=='employee','הדיווח מתוך המערכת דורש חשבון עובד אישי',403)
            return self.punch(identity['employee_id'],b.get('direction'),'account',b.get('request_id')),None
        if action=='device-event':return self.device_event(b),None
        self.manager(identity)
        if action=='configure':
            methods=b.get('methods');self.check(isinstance(methods,list) and set(methods)<={'pin','account','device'},'שיטות דיווח לא תקינות')
            with self.store.connect(write=True) as c:
                data,_,_=w.read(c);data['clock_methods']=list(dict.fromkeys(methods))
                c.execute('UPDATE workforce_state SET data=?,revision=revision+1 WHERE id=1',(json.dumps(data,ensure_ascii=False),))
                self.store.audit(c,'configure','clock','methods',{'actor':identity['id'],'methods':methods})
            return {'ok':True},None
        if action=='set-pin':
            employee=b.get('employee_id');pin=b.get('pin');self.check(isinstance(pin,str) and re.fullmatch(r'[0-9]{6,12}',pin),'קוד עובד חייב להכיל 6–12 ספרות')
            with self.store.connect(write=True) as c:
                _,_,people=w.read(c);w.employee(people,employee);salt=secrets.token_hex(16)
                c.execute('INSERT INTO clock_pins VALUES(?,?,?) ON CONFLICT(employee_id) DO UPDATE SET salt=excluded.salt,hash=excluded.hash',(employee,salt,self.store.security.password_hash(pin,salt)))
                self.store.audit(c,'set-pin','clock',employee,{'actor':identity['id']})
            return {'ok':True},None
        if action=='create-station':
            name=str(b.get('name','')).strip();self.check(2<=len(name)<=100,'נדרש שם לעמדה');token=secrets.token_urlsafe(24);key=secrets.token_hex(16)
            with self.store.connect(write=True) as c:
                c.execute('INSERT INTO clock_stations VALUES(?,?,?,?,?,1)',(key,name,sha(token),None,(now()+timedelta(hours=24)).isoformat()))
                self.store.audit(c,'create','clock-station',key,{'actor':identity['id']})
            return {'ok':True,'enrollment':token},None
        if action=='revoke-station':
            with self.store.connect(write=True) as c:
                c.execute('UPDATE clock_stations SET active=0,token=NULL,enrollment=NULL WHERE id=?',(b.get('id'),))
                self.store.audit(c,'revoke','clock-station',str(b.get('id')),{'actor':identity['id']})
            return {'ok':True},None
        if action=='create-device':
            self.check(os.name=='nt','אחסון מפתח התקן דורש מנהל סודות מוגדר בסביבת השרת')
            from language_service import LanguageService
            name=str(b.get('name','')).strip();self.check(2<=len(name)<=100,'נדרש שם התקן')
            key=secrets.token_hex(16);secret=secrets.token_urlsafe(32)
            with self.store.connect(write=True) as c:
                c.execute('INSERT INTO clock_devices VALUES(?,?,?,1)',(key,name,LanguageService.crypt(secret.encode(),True)))
                self.store.audit(c,'create','clock-device',key,{'actor':identity['id']})
            return {'ok':True,'device_id':key,'secret':secret},None
        if action=='revoke-device':
            with self.store.connect(write=True) as c:c.execute('UPDATE clock_devices SET active=0 WHERE id=?',(b.get('id'),));self.store.audit(c,'revoke','clock-device',str(b.get('id')),{'actor':identity['id']})
            return {'ok':True},None
        if action=='cancel-open':
            employee=b.get('employee_id');reason=str(b.get('reason','')).strip();self.check(2<=len(reason)<=1000,'נדרשת סיבת ביטול')
            with self.store.connect(write=True) as c:
                row=c.execute('SELECT * FROM clock_open WHERE employee_id=?',(employee,)).fetchone();self.check(row,'אין כניסה פתוחה',404)
                data,_,_=w.read(c);unlocked(w,data,[datetime.fromisoformat(row['at']).astimezone(TZ).date().isoformat()])
                c.execute('DELETE FROM clock_open WHERE employee_id=?',(employee,));self.store.audit(c,'cancel-open','clock',employee,{'actor':identity['id'],'reason':reason,'original':dict(row)})
            return {'ok':True},None
        raise self.error('פעולת נוכחות לא נמצאה',404)

    def punch(self,employee,direction,source,event_id,instant=None):
        self.check(direction in ('in','out'),'יש לבחור כניסה או יציאה')
        self.check(isinstance(event_id,str) and re.fullmatch(r'[A-Za-z0-9:_-]{8,160}',event_id),'נדרש מזהה דיווח ייחודי')
        instant=instant or now();self.check(instant.tzinfo is not None,'דיווח חייב לכלול אזור זמן');w=self.store.workforce
        with self.store.connect(write=True) as c:
            old=c.execute('SELECT * FROM clock_events WHERE id=?',(event_id,)).fetchone()
            if old:
                self.check(old['employee_id']==employee and old['direction']==direction and old['source']==source,'מזהה דיווח כבר שימש לפעולה אחרת',409)
                if source.startswith('device:'):self.check(datetime.fromisoformat(old['at'])==instant,'מזהה אירוע התקן שימש לזמן אחר',409)
                return {'ok':True,'duplicate':True,'direction':direction,'at':old['at']}
            data,_,people=w.read(c);w.employee(people,employee)
            method=source.split(':')[0];method='device' if method=='device' else method
            self.check(method in data.get('clock_methods',[]),'שיטת הנוכחות אינה פעילה במסעדה',403)
            local=instant.astimezone(TZ);unlocked(w,data,[local.date().isoformat()])
            opened=c.execute('SELECT * FROM clock_open WHERE employee_id=?',(employee,)).fetchone()
            if direction=='in':
                self.check(not opened,'כבר קיימת כניסה פתוחה. יש לדווח יציאה או לבקש תיקון ממנהל',409)
                c.execute('INSERT INTO clock_open VALUES(?,?,?,?)',(employee,instant.isoformat(),source,event_id))
            else:
                self.check(opened,'אין כניסה פתוחה לדיווח יציאה',409)
                start=datetime.fromisoformat(opened['at']);duration=(instant-start).total_seconds()
                self.check(60<=duration<24*3600,'טווח נוכחות חייב להיות בין דקה לפחות מ־24 שעות; אחרת נדרש תיקון מנהל',409)
                a=start.astimezone(TZ);record={'employee_id':employee,'date':a.date().isoformat(),'start':a.strftime('%H:%M'),'end':local.strftime('%H:%M')}
                unlocked(w,data,[record['date']]);x,z=w.interval(record)
                for other in data['attendance']:
                    if other['employee_id']!=employee:continue
                    u,v=w.interval(other);self.check(not(u<z and x<v),'הדיווח חופף לנוכחות קיימת. נדרש תיקון מנהל',409)
                record.update(id=secrets.token_hex(16),reason='דיווח שעון נוכחות',at=now().isoformat(),history=[],clock_source=source,clock_entry=opened['event_id'],clock_exit=event_id,actual_start=start.isoformat(),actual_end=instant.isoformat())
                data['attendance'].append(record);c.execute('DELETE FROM clock_open WHERE employee_id=?',(employee,))
            c.execute('INSERT INTO clock_events VALUES(?,?,?,?,?,?)',(event_id,employee,direction,instant.isoformat(),source,json.dumps({'received_at':now().isoformat()})))
            c.execute('UPDATE workforce_state SET data=?,revision=revision+1 WHERE id=1',(json.dumps(data,ensure_ascii=False),))
            self.store.audit(c,'punch','clock',event_id,{'employee_id':employee,'direction':direction,'source':source,'at':instant.isoformat()})
        return {'ok':True,'direction':direction,'at':instant.isoformat()}

    def device_event(self,b):
        from language_service import LanguageService
        with self.store.connect() as c:device=c.execute('SELECT * FROM clock_devices WHERE id=? AND active=1',(b.get('device_id'),)).fetchone()
        self.check(device,'התקן לא מורשה',403)
        try:sent=datetime.fromisoformat(b.get('sent_at',''));instant=datetime.fromisoformat(b.get('at',''))
        except (ValueError,TypeError):raise self.error('זמן אירוע לא תקין')
        self.check(sent.tzinfo is not None and instant.tzinfo is not None,'נדרש אזור זמן באירוע')
        self.check(abs((now()-sent).total_seconds())<=300,'חתימת האירוע פגה',403)
        self.check(-300<=(now()-instant).total_seconds()<=48*3600,'אירוע ההתקן מחוץ לטווח הקליטה המותר')
        signed={k:b.get(k) for k in ('device_id','event_id','employee_id','direction','at','sent_at')}
        secret=LanguageService.crypt(device['secret'],False)
        signature=hmac.new(secret,json.dumps(signed,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode(),hashlib.sha256).hexdigest()
        self.check(isinstance(b.get('signature'),str) and hmac.compare_digest(signature,b['signature']),'חתימת התקן לא תקינה',403)
        event_id='device:'+device['id']+':'+str(b.get('event_id',''))
        self.check(not any(k in b for k in ('fingerprint','biometric','template')),'אין לשלוח מידע ביומטרי למערכת')
        return self.punch(b.get('employee_id'),b.get('direction'),'device:'+device['id'],event_id,instant)
