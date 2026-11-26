// اتزان | ETIZAN — static app + optional encrypted cloud backup (D1). The server only ever sees ciphertext.
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
let ready=false;
async function schema(db){if(ready)return;await db.prepare('CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL, size INTEGER NOT NULL)').run();ready=true}
export default {
 async fetch(req,env){const url=new URL(req.url);
  if(url.pathname.startsWith('/api/')){
   try{
    if(url.pathname==='/api/health')return J({ok:true});
    const m=url.pathname.match(/^\/api\/backup\/([a-f0-9]{64})$/);
    if(!m)return J({ok:false,error:'not_found'},404);
    if(!env.DB)return J({ok:false,error:'no_db'},503);
    await schema(env.DB);const id=m[1];
    if(req.method==='GET'){const r=await env.DB.prepare('SELECT data,updated,size FROM backups WHERE id=?').bind(id).first();if(!r)return J({ok:false,error:'missing'},404);return J({ok:true,data:r.data,updated:r.updated,size:r.size})}
    if(req.method==='PUT'){const body=await req.text();if(body.length>4000000)return J({ok:false,error:'too_large'},413);let o;try{o=JSON.parse(body)}catch(e){return J({ok:false,error:'bad_json'},400)}if(!o.iv||!o.ct)return J({ok:false,error:'bad_shape'},400);
     const now=Date.now();await env.DB.prepare('INSERT INTO backups (id,data,updated,size) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated, size=excluded.size').bind(id,body,now,body.length).run();return J({ok:true,updated:now})}
    if(req.method==='DELETE'){await env.DB.prepare('DELETE FROM backups WHERE id=?').bind(id).run();return J({ok:true})}
    return J({ok:false,error:'method'},405)
   }catch(e){return J({ok:false,error:'server',detail:String(e&&e.message||e).slice(0,200)},500)}}
  const r=await env.ASSETS.fetch(req);const h=new Headers(r.headers);h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','same-origin');
  if(url.pathname==='/sw.js'||url.pathname==='/'||url.pathname.endsWith('.html')||url.pathname.endsWith('.webmanifest'))h.set('Cache-Control','no-cache');
  return new Response(r.body,{status:r.status,headers:h})}
};