"""Local review server for the imported Base44 applications and workforce modules."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import argparse, base64, csv, hmac, json, mimetypes, os, sqlite3, uuid
csv.field_size_limit(16*1024*1024)

ROOT=Path(__file__).resolve().parent
DB=ROOT/'private/runtime/hospitality.sqlite3'
APPS={'finito':ROOT/'original-apps/finito/dist','academy':ROOT/'original-apps/academy/dist','hostlink':ROOT/'original-apps/hostlink/dist'}

def decode(value):
    if value=='': return None
    if value.lower() in ('true','false'): return value.lower()=='true'
    try:
        if value[:1] in '[{': return json.loads(value)
    except (ValueError,TypeError): pass
    return value

def connect():
    DB.parent.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(DB);c.row_factory=sqlite3.Row
    c.execute('CREATE TABLE IF NOT EXISTS entities(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id))')
    return c

def bootstrap():
    with connect() as c:
        c.execute('CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT)')
        if c.execute("SELECT value FROM metadata WHERE key='base44_import' ").fetchone(): return
        c.execute('DELETE FROM entities')
        for path in (ROOT/'private/base44-exports').rglob('*_export.csv'):
            kind=path.name.removesuffix('_export.csv')
            with path.open(encoding='utf-8-sig',newline='') as f:
                for raw in csv.DictReader(f):
                    row={k:decode(v) for k,v in raw.items()};ident=str(row.get('id') or uuid.uuid4());row['id']=ident
                    c.execute('INSERT OR REPLACE INTO entities VALUES(?,?,?)',(kind,ident,json.dumps(row,ensure_ascii=False)))
        c.execute("INSERT INTO metadata VALUES('base44_import','complete')")

class Handler(SimpleHTTPRequestHandler):
    def authenticated(self):
        username=os.environ.get('APP_USERNAME')
        password=os.environ.get('APP_PASSWORD')
        if not username or not password:
            return True
        supplied=self.headers.get('Authorization','')
        expected='Basic '+base64.b64encode(f'{username}:{password}'.encode()).decode()
        if hmac.compare_digest(supplied,expected):
            return True
        self.send_response(401)
        self.send_header('WWW-Authenticate','Basic realm="Hospitality OS"')
        self.end_headers()
        return False
    def json(self,value,status=200):
        body=json.dumps(value,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',len(body));self.end_headers();self.wfile.write(body)
    def body(self):
        return json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))) or b'{}')
    def entity_route(self):
        parts=urlparse(self.path).path.strip('/').split('/');return (parts[2],parts[3] if len(parts)>3 else None)
    def do_GET(self):
        parsed=urlparse(self.path)
        if parsed.path=='/api/health': return self.json({'ok':True,'mode':'local-review'})
        if not self.authenticated(): return
        if parsed.path.startswith('/api/entities/'):
            kind,_=self.entity_route();query=parse_qs(parsed.query);where=json.loads(query.get('filter',['{}'])[0]);limit=min(int(query.get('limit',['1000'])[0]),5000)
            with connect() as c: rows=[json.loads(r['data']) for r in c.execute('SELECT data FROM entities WHERE kind=?',(kind,))]
            rows=[r for r in rows if all(r.get(k)==v for k,v in where.items())]
            sort=query.get('sort',[''])[0]
            if sort:
                desc=sort.startswith('-');key=sort.lstrip('-');rows.sort(key=lambda r:(r.get(key) is None,str(r.get(key,''))),reverse=desc)
            return self.json(rows[:limit])
        path=parsed.path
        if path=='/':
            body='''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מרחב העבודה · קימוראיה</title><style>body{margin:0;background:#f7f3ed;color:#263b5a;font-family:Arial,sans-serif}.wrap{max-width:980px;margin:auto;padding:60px 24px}h1{font-size:42px;margin:0 0 8px}.sub{color:#758198;margin-bottom:38px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.card{display:block;background:white;border:1px solid #e4ded5;border-radius:20px;padding:26px;text-decoration:none;color:inherit;box-shadow:0 10px 30px #24334a12}.card:hover{transform:translateY(-2px)}.icon{font-size:30px}.card h2{margin:14px 0 8px}.card p{color:#718096;line-height:1.55}.status{margin-top:30px;background:#e9f6ef;border:1px solid #bfe1ce;border-radius:16px;padding:18px}.pending{margin-top:14px;background:#fff7df;border:1px solid #ead593;border-radius:16px;padding:18px}</style><body><main class="wrap"><h1>מרחב העבודה של קימוראיה</h1><div class="sub">הגרסה שהועברה מ־Base44 וחוברה לסביבת הענן</div><section class="grid"><a class="card" href="/finito/"><div class="icon">✓</div><h2>Finito</h2><p>צ׳קליסטים לפתיחה וסגירה, אזורי עבודה, מלאי וניהול.</p></a><a class="card" href="/academy/"><div class="icon">🎓</div><h2>Academy</h2><p>תפריט, מילון מונחים, משקאות, סאקה ומשחקי הדרכה.</p></a><a class="card" href="/hostlink/"><div class="icon">📨</div><h2>HostLink</h2><p>קליטת דוחות Tabit, רשימות שליחה, חסימות והיסטוריה.</p></a></section><div class="status"><b>פעיל כעת:</b> שלוש האפליקציות, שרת מקומי ונתוני Base44 שיובאו ל־SQLite.</div><div class="pending"><b>עדיין בשחזור:</b> הממשק המלא של סידור העבודה וההתאמות המאוחרות ל־Shift Organizer. מנוע כוח האדם כבר נמצא בקוד.</div></main></body></html>'''.encode()
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',len(body));self.end_headers();return self.wfile.write(body)
        app=path.strip('/').split('/')[0]
        if app in APPS:
            rel='/'.join(path.strip('/').split('/')[1:]);target=APPS[app]/rel
            if not rel or not target.is_file(): target=APPS[app]/'index.html'
            if target.is_file():
                data=target.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(target.name)[0] or 'application/octet-stream');self.send_header('Content-Length',len(data));self.end_headers();return self.wfile.write(data)
        self.send_error(404)
    def do_POST(self):
        if not self.authenticated(): return
        if self.path.startswith('/api/entities/'):
            kind,_=self.entity_route();row=self.body();row.setdefault('id',str(uuid.uuid4()))
            with connect() as c:c.execute('INSERT INTO entities VALUES(?,?,?)',(kind,row['id'],json.dumps(row,ensure_ascii=False)))
            return self.json(row,201)
        self.send_error(501)
    def do_PATCH(self):
        if not self.authenticated(): return
        kind,ident=self.entity_route();patch=self.body()
        with connect() as c:
            found=c.execute('SELECT data FROM entities WHERE kind=? AND id=?',(kind,ident)).fetchone()
            if not found:return self.json({'error':'not found'},404)
            row=json.loads(found['data']);row.update(patch);c.execute('UPDATE entities SET data=? WHERE kind=? AND id=?',(json.dumps(row,ensure_ascii=False),kind,ident))
        self.json(row)
    def do_DELETE(self):
        if not self.authenticated(): return
        kind,ident=self.entity_route()
        with connect() as c:c.execute('DELETE FROM entities WHERE kind=? AND id=?',(kind,ident))
        self.send_response(204);self.end_headers()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=int(os.environ.get('PORT','8765')));args=p.parse_args();bootstrap();ThreadingHTTPServer(('0.0.0.0',args.port),Handler).serve_forever()
