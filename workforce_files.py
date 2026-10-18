"""Bounded local document attachments, served as downloads and never executable."""
import base64, binascii
from uuid import uuid4

def initialize(store):
    with store.connect(write=True) as c:c.execute('CREATE TABLE IF NOT EXISTS workforce_files(id TEXT PRIMARY KEY,name TEXT NOT NULL,content BLOB NOT NULL)')

def save(w,c,file):
    w.check(isinstance(file,dict),'קובץ לא תקין')
    name=str(file.get('name','')).replace('\\','/').rsplit('/',1)[-1]
    w.check(1<=len(name)<=150 and not any(ord(ch)<32 for ch in name),'שם קובץ לא תקין')
    w.check(name.lower().endswith(('.pdf','.png','.jpg','.jpeg','.webp','.txt','.csv','.docx','.xlsx')),'סוג הקובץ אינו נתמך')
    value=file.get('base64');w.check(isinstance(value,str) and len(value)<=4200000,'קובץ גדול מדי')
    try:content=base64.b64decode(value,validate=True)
    except (binascii.Error,ValueError):raise w.error('קובץ לא תקין')
    w.check(0<len(content)<=3000000,'קובץ מוגבל ל־3MB')
    file_id=str(uuid4());c.execute('INSERT INTO workforce_files VALUES(?,?,?)',(file_id,name,content))
    return {'id':file_id,'name':name,'bytes':len(content)}

def read(w,file_id,identity):
    with w.store.connect() as c:
        data,_,_=w.read(c)
        document=next((d for d in data['documents'] if d.get('file',{}).get('id')==file_id),None)
        w.check(document,'קובץ לא נמצא',404)
        if identity and identity['role']=='employee':
            roles=data['profiles'].get(identity['employee_id'],{}).get('roles',[])
            w.check(not document.get('archived') and (not document['role'] or document['role'] in roles),'אין הרשאה לקובץ',403)
        row=c.execute('SELECT * FROM workforce_files WHERE id=?',(file_id,)).fetchone();w.check(row,'קובץ לא נמצא',404)
        return bytes(row['content']),row['name']
