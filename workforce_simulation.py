"""Server-side scheduling proposals, explicit apply, strict base-revision checks."""
import json,secrets
from datetime import datetime,timedelta,timezone
from workforce_planner import optimize

def initialize(store):
    with store.connect(write=True) as c:c.execute('CREATE TABLE IF NOT EXISTS workforce_simulations(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,week TEXT NOT NULL,expires TEXT NOT NULL,data TEXT NOT NULL)')

def simulate(w,body,week):
    with w.store.connect() as c:
        data,revision,people=w.read(c);legacy=[dict(r) for r in c.execute('SELECT * FROM shifts')]
    w.check(body.get('revision')==revision,'הסידור השתנה בחלון אחר. רענן ונסה שוב',409)
    result,explanations,diagnostics=optimize(w,data,week,people,legacy)
    slots=[s for s in result['slots'] if w.week(s['date'])==week]
    report=w.report(result,week,people,legacy);key=secrets.token_hex(16)
    with w.store.connect(write=True) as c:
        w.check(c.execute('SELECT revision FROM workforce_state WHERE id=1').fetchone()[0]==revision,'הסידור השתנה בזמן החישוב. יש להריץ הדמיה מחדש',409)
        c.execute('DELETE FROM workforce_simulations WHERE expires<?',(datetime.now(timezone.utc).isoformat(),))
        c.execute('INSERT INTO workforce_simulations VALUES(?,?,?,?,?)',(key,revision,week,(datetime.now(timezone.utc)+timedelta(minutes=10)).isoformat(),json.dumps(slots)))
    return {'id':key,'revision':revision,'slots':slots,'report':report,'explanations':explanations,'diagnostics':diagnostics,'saved_to_draft':False}

def apply(w,body,data,c,week,revision):
    row=c.execute('SELECT * FROM workforce_simulations WHERE id=? AND week=?',(body.get('id'),week)).fetchone()
    w.check(row and row['expires']>datetime.now(timezone.utc).isoformat(),'ההדמיה חסרה או שפג תוקפה; יש לחשב מחדש',409)
    w.check(row['revision']==revision,'הנתונים השתנו מאז ההדמיה. יש לחשב מחדש',409)
    data['slots']=[s for s in data['slots'] if w.week(s['date'])!=week]+json.loads(row['data'])
    c.execute('DELETE FROM workforce_simulations WHERE id=?',(body.get('id'),))
