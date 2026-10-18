const request=async(path,options={})=>{const response=await fetch(path,{...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers}});if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||`HTTP ${response.status}`);return response.status===204?null:response.json()};
const entity=name=>({
  list:(sort='',limit=1000)=>request(`/api/entities/${name}?sort=${encodeURIComponent(sort)}&limit=${limit}`),
  filter:(where={},sort='',limit=1000)=>request(`/api/entities/${name}?filter=${encodeURIComponent(JSON.stringify(where))}&sort=${encodeURIComponent(sort)}&limit=${limit}`),
  create:data=>request(`/api/entities/${name}`,{method:'POST',body:JSON.stringify(data)}),
  update:(id,data)=>request(`/api/entities/${name}/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  delete:id=>request(`/api/entities/${name}/${id}`,{method:'DELETE'})
});
const entities=new Proxy({Query:entity('Query')},{get:(target,name)=>target[name]||(target[name]=entity(name))});
const upload=async({file})=>{const body=new FormData();body.append('file',file);return request('/api/upload',{method:'POST',body})};
export const base44={entities,auth:{me:async()=>({id:'local-admin',email:'local@finito.test',full_name:'מנהל מקומי',role:'admin'}),logout:()=>{},redirectToLogin:()=>{}},appLogs:{logUserInApp:async()=>({ok:true})},integrations:{Core:{UploadFile:upload,InvokeLLM:async()=>{throw new Error('שירות התרגום אינו מוגדר בסביבה המקומית')},SendEmail:async()=>({local:true}),SendSMS:async()=>({local:true}),GenerateImage:async()=>{throw new Error('שירות יצירת תמונות אינו מוגדר')},ExtractDataFromUploadedFile:async()=>{throw new Error('חילוץ קבצים אינו מוגדר')}}}};
