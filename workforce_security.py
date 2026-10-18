"""Local account/session protection. First owner setup is performed by the human."""
import hashlib, hmac, secrets, json
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie

def digest(value):return hashlib.sha256(value.encode()).hexdigest()
def clock():return datetime.now(timezone.utc)

class Security:
    def __init__(self,store,error):
        self.store,self.error=store,error
        with store.connect(write=True) as c:
            c.executescript('''
            CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT UNIQUE,password TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL,employee_id TEXT,active INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS login_failures(username TEXT,at TEXT);
            CREATE TABLE IF NOT EXISTS account_invites(token TEXT PRIMARY KEY,role TEXT NOT NULL,employee_id TEXT,expires TEXT NOT NULL,used INTEGER DEFAULT 0);
            ''')
    def check(self,ok,message,status=400):
        if not ok:raise self.error(message,status)
    def enabled(self):
        with self.store.connect() as c:return bool(c.execute('SELECT 1 FROM accounts LIMIT 1').fetchone())
    def identity(self,cookie):
        token=''
        try:
            jar=SimpleCookie();jar.load(cookie or '');token=jar['hospitality_session'].value if 'hospitality_session' in jar else ''
        except Exception:pass
        if not token:return None
        with self.store.connect() as c:
            row=c.execute('SELECT a.id,a.username,a.role,a.employee_id FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token=? AND s.expires>? AND a.active=1',(digest(token),clock().isoformat())).fetchone()
        return dict(row) if row else None
    def status(self,cookie):
        identity=self.identity(cookie);accounts=[]
        if identity and identity['role']=='manager':
            with self.store.connect() as c:accounts=[dict(r) for r in c.execute('SELECT id,username,role,employee_id,active FROM accounts')]
        return {'enabled':self.enabled(),'identity':identity,'accounts':accounts,'scope':'local-workspace; employee accounts currently cover workforce portal'}
    def credentials(self,b):
        username=str(b.get('username','')).strip().casefold();password=b.get('password')
        self.check(3<=len(username)<=80 and isinstance(password,str) and 12<=len(password)<=256,'נדרש שם משתמש באורך 3–80 תווים וסיסמה באורך 12–256 תווים')
        return username,password
    def password_hash(self,password,salt):return hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1,maxmem=64*1024*1024).hex()
    def session(self,c,account):
        token=secrets.token_urlsafe(32)
        c.execute('DELETE FROM sessions WHERE expires<?',(clock().isoformat(),))
        c.execute('INSERT INTO sessions VALUES(?,?,?)',(digest(token),account,(clock()+timedelta(hours=12)).isoformat()))
        return token
    def action(self,action,b,cookie):
        identity=self.identity(cookie);token=None
        if action in ('bootstrap','register'):
            username,password=self.credentials(b)
            with self.store.connect(write=True) as c:
                if action=='bootstrap':
                    self.check(not c.execute('SELECT 1 FROM accounts LIMIT 1').fetchone(),'כבר הוגדר חשבון מנהל',409)
                    role,employee='manager',None
                else:
                    invite=c.execute('SELECT * FROM account_invites WHERE token=? AND used=0 AND expires>?',(digest(str(b.get('invite',''))),clock().isoformat())).fetchone()
                    self.check(invite,'קישור ההזמנה אינו תקף',403);role,employee=invite['role'],invite['employee_id']
                    if employee:self.check(c.execute('SELECT 1 FROM employees WHERE id=? AND active=1',(employee,)).fetchone(),'העובד אינו פעיל',403)
                    if employee:self.check(not c.execute('SELECT 1 FROM accounts WHERE employee_id=? AND active=1',(employee,)).fetchone(),'כבר קיים חשבון פעיל לעובד',409)
                    c.execute('UPDATE account_invites SET used=1 WHERE token=?',(invite['token'],))
                self.check(not c.execute('SELECT 1 FROM accounts WHERE username=?',(username,)).fetchone(),'שם המשתמש אינו זמין',409)
                account=secrets.token_hex(16);salt=secrets.token_hex(16)
                c.execute('INSERT INTO accounts VALUES(?,?,?,?,?,?,1)',(account,username,self.password_hash(password,salt),salt,role,employee))
                token=self.session(c,account);self.store.audit(c,action,'account',account,{'role':role})
        elif action=='login':
            username,password=self.credentials(b)
            with self.store.connect(write=True) as c:
                cutoff=(clock()-timedelta(minutes=5)).isoformat()
                c.execute('DELETE FROM login_failures WHERE at<?',(cutoff,))
                count=c.execute('SELECT count(*) FROM login_failures WHERE username=?',(username,)).fetchone()[0]
                self.check(count<5,'יותר מדי ניסיונות. יש להמתין חמש דקות',429)
                row=c.execute('SELECT * FROM accounts WHERE username=?',(username,)).fetchone()
                valid=bool(row and row['active'] and hmac.compare_digest(row['password'],self.password_hash(password,row['salt'])))
                if valid:
                    c.execute('DELETE FROM login_failures WHERE username=?',(username,));token=self.session(c,row['id'])
                else:c.execute('INSERT INTO login_failures VALUES(?,?)',(username,clock().isoformat()))
            self.check(valid,'פרטי ההתחברות אינם תקינים',401)
        elif action=='logout':
            with self.store.connect(write=True) as c:
                if identity:c.execute('DELETE FROM sessions WHERE account_id=?',(identity['id'],))
            return {'ok':True},''
        elif action=='invite':
            self.check(identity and identity['role']=='manager','נדרשת הרשאת מנהל',403)
            role=b.get('role');self.check(role in ('employee','manager'),'הרשאה לא תקינה')
            employee=b.get('employee_id') if role=='employee' else None
            with self.store.connect(write=True) as c:
                if role=='employee':
                    self.check(c.execute('SELECT 1 FROM employees WHERE id=? AND active=1',(employee,)).fetchone(),'יש לבחור עובד פעיל')
                    self.check(not c.execute('SELECT 1 FROM accounts WHERE employee_id=? AND active=1',(employee,)).fetchone(),'כבר קיים חשבון פעיל לעובד',409)
                invitation=secrets.token_urlsafe(24)
                c.execute('INSERT INTO account_invites VALUES(?,?,?,?,0)',(digest(invitation),role,employee,(clock()+timedelta(hours=24)).isoformat()))
                self.store.audit(c,'invite','account',employee or 'manager',{'role':role})
            return {'ok':True,'invite':invitation},None
        elif action=='revoke':
            self.check(identity and identity['role']=='manager','נדרשת הרשאת מנהל',403)
            account=b.get('id');self.check(account!=identity['id'],'אין לבטל את החשבון המחובר')
            with self.store.connect(write=True) as c:
                self.check(c.execute('SELECT 1 FROM accounts WHERE id=?',(account,)).fetchone(),'חשבון לא נמצא',404)
                c.execute('UPDATE accounts SET active=0 WHERE id=?',(account,));c.execute('DELETE FROM sessions WHERE account_id=?',(account,))
                self.store.audit(c,'revoke','account',account,{'actor':identity['id']})
            return {'ok':True},None
        elif action=='password':
            self.check(identity,'נדרשת התחברות',401)
            old=b.get('current_password');new=b.get('password')
            self.check(isinstance(old,str) and len(old)<=256 and isinstance(new,str) and 12<=len(new)<=256,'סיסמה חדשה חייבת לכלול 12–256 תווים')
            with self.store.connect(write=True) as c:
                row=c.execute('SELECT * FROM accounts WHERE id=?',(identity['id'],)).fetchone()
                self.check(hmac.compare_digest(row['password'],self.password_hash(old,row['salt'])),'הסיסמה הנוכחית אינה נכונה',403)
                salt=secrets.token_hex(16)
                c.execute('UPDATE accounts SET password=?,salt=? WHERE id=?',(self.password_hash(new,salt),salt,identity['id']))
                c.execute('DELETE FROM sessions WHERE account_id=?',(identity['id'],));self.store.audit(c,'password','account',identity['id'],{})
            return {'ok':True},''
        else:raise self.error('פעולה לא נמצאה',404)
        return {'ok':True},token

    def authorize(self,identity,path,body=None):
        if not self.enabled():return
        self.check(identity,'נדרשת התחברות למערכת',401)
        if identity['role']=='manager':return
        employee=identity['employee_id']
        with self.store.connect() as c:self.check(c.execute('SELECT 1 FROM employees WHERE id=? AND active=1',(employee,)).fetchone(),'חשבון העובד אינו פעיל',403)
        if body is None:
            self.check(path in ('/api/workforce','/api/workforce/report','/api/workforce/file','/api/languages','/api/academy/game-catalog') or path.startswith('/api/quiz/'),'המידע זמין למנהל בלבד',403);return
        action=path.removeprefix('/api/workforce/')
        self.check(action in ('period-availability','period-default-save','period-default-delete','request-offer','availability','recurring-save','recurring-apply','request','claim-reward','document-ack','message-state','reminder-dismiss') or path=='/api/languages/translate','נדרשת הרשאת מנהל',403)
        if path=='/api/languages/translate':return
        self.check(body.get('employee_id')==employee,'אין הרשאה לשינוי נתוני עובד אחר',403)
        if action=='reminder-dismiss':
            with self.store.connect() as c:
                data,_,_=self.store.workforce.read(c)
            self.check(any(r['id']==body.get('id') and r['employee_id']==employee for r in data['reminders']),'תזכורת אינה שייכת לעובד',403)

def employee_state(data,identity):
    if not identity or identity['role']=='manager':return {**data,'identity':identity}
    data={**data,'pending_cells':[],'reminder_definitions':[],'shift_priorities':{},'draft_history':[]}
    e=identity['employee_id'];profile=data['profiles'].get(e,{})
    result={**data,'identity':identity,'sources':[],'profiles':{e:{k:v for k,v in profile.items() if k in ('roles','max_hours','target_hours','shift_limits')}},'period_availability':{e:data.get('period_availability',{}).get(e,{})},'period_availability_defaults':{e:data.get('period_availability_defaults',{}).get(e,{})},'availability':{e:data['availability'].get(e,{})},'recurring_availability':{e:data['recurring_availability'].get(e,{})},'cost_history':{},'cost_baselines':{},'planning':{'weights':{},'weekend_days':data.get('planning',{}).get('weekend_days',[]),'budgets':{}},'fairness':[],'demand':[],'journal':[],'draft_history':[],'staffing_templates':[],'tips':[],'blocked_leave':[{k:v for k,v in r.items() if k!='reason'} for r in data['blocked_leave']]}
    for field in ('requests','offer_requests','points','claims','attendance','certifications','reminders'):result[field]=[r for r in data[field] if r['employee_id']==e]
    result['messages']=[{**r,'manager_read':[],'manager_hidden':[],'recipients':[e],'read':[e] if e in r['read'] else [],'hidden':[e] if e in r['hidden'] else []} for r in data['messages'] if e in r['recipients']]
    result['documents']=[{**r,'ack':[a for a in r['ack'] if a['employee_id']==e]} for r in data['documents'] if not r.get('archived') and (not r['role'] or r['role'] in profile.get('roles',[]))]
    result['published']={week:[{**v,'slots':[{k:s[k] for k in ('id','date','start','end','role','period','required','employees')} for s in v['slots']]} for v in versions] for week,versions in data['published'].items() if data.get('publication_status',{}).get(week,True)}
    result['slots']=[s for versions in result['published'].values() if versions for s in versions[-1]['slots']]
    hours=0
    for slot in result['slots']:
        if e not in slot['employees'] or not data['week']<=slot['date']<=(datetime.fromisoformat(data['week'])+timedelta(days=6)).date().isoformat():continue
        start=datetime.fromisoformat(slot['date']+'T'+slot['start']);end=datetime.fromisoformat(slot['date']+'T'+slot['end'])
        if end<start:end+=timedelta(days=1)
        hours+=(end-start).total_seconds()/3600
    result['report']={'issues':[],'hours':{e:round(hours,2)},'cost':0,'unknown_cost_assignments':0,'required':0,'assigned':0,'slots':0}
    return result
