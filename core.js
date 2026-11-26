'use strict';
/* اتزان | ETIZAN — core: store (IndexedDB), dates, prayer times, schedule engine, UI kit, router */
const VERSION='1.0.0';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,'0');
const dk=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d,12)};
const addD=(k,n)=>{const d=pd(k);d.setDate(d.getDate()+n);return dk(d)};
const todayK=()=>dk();
const dow=k=>pd(k).getDay();
const t2m=t=>{if(!t)return 0;const [h,m]=t.split(':').map(Number);return h*60+(m||0)};
const m2t=m=>{m=((Math.round(m)%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60)};
const nowM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60};
const fmtT=m=>{if(m==null||isNaN(m))return '—';m=((Math.round(m)%1440)+1440)%1440;let h=Math.floor(m/60),mi=m%60;const ap=h<12?'ص':'م';h=h%12||12;return h+':'+pad(mi)+' '+ap};
const fmtDur=mins=>{mins=Math.max(0,Math.round(mins||0));const h=Math.floor(mins/60),m=mins%60;if(!h)return m+' د';if(!m)return h+' س';return h+' س '+m+' د'};
const fmtH=mins=>(Math.round((mins||0)/6)/10).toString();
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const DSH=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const PR=[['fajr','الفجر'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']];
const PRN={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
const gFmt=new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'});
let hFmt;try{hFmt=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'})}catch(e){hFmt=null}
const hijri=d=>{try{return hFmt?hFmt.format(d).replace(/\s?هـ$/,'')+' هـ':''}catch(e){return ''}};
const weekStart=k=>addD(k,-dow(k)); // week starts Sunday
const monthKey=k=>k.slice(0,7);
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);
const avg=a=>{a=a.filter(x=>x!=null&&!isNaN(x));return a.length?sum(a)/a.length:null};

/* ---------------- default state ---------------- */
function B(title,start,end,o={}){return Object.assign({id:uid(),title,start,end,remind:false,cat:'general'},o)}
function defaultNormal(){return [
 B('صلاة الفجر وأذكار الصباح','fajr','fajr+40',{cat:'worship',remind:true}),
 B('المدرسة','06:00','12:40',{cat:'study'}),
 B('العودة والغداء والراحة وصلاة الظهر','12:40','13:30',{cat:'rest'}),
 B('القيلولة','13:30','15:00',{cat:'sleep'}),
 B('القرآن والمراجعة','15:00','15:30',{cat:'worship',remind:true}),
 B('العمل والدراسة والمشي والمهام الشخصية','15:30','maghrib',{cat:'work',buffer:true}),
 B('معهد تحفيظ القرآن','maghrib','isha',{cat:'worship',remind:true}),
 B('العشاء والعمل والمهام','isha','21:30',{cat:'work'}),
 B('الترفيه والتواصل','21:30','22:30',{cat:'fun'}),
 B('الاستعداد للنوم','22:30','23:00',{cat:'rest',remind:true}),
 B('النوم','23:00','fajr-15',{cat:'sleep'})]}
function defaultHoliday(){return [
 B('صلاة الفجر وأذكار الصباح','fajr','fajr+40',{cat:'worship',remind:true}),
 B('راحة ونوم إضافي','fajr+40','08:30',{cat:'sleep'}),
 B('وقت العائلة والهوايات والرياضة','08:30','12:00',{cat:'fun'}),
 B('صلاة الظهر والغداء','dhuhr','13:30',{cat:'rest'}),
 B('القيلولة','13:30','15:00',{cat:'sleep'}),
 B('القرآن والمراجعة','15:00','15:30',{cat:'worship',remind:true}),
 B('العمل والقراءة والمهام الشخصية','15:30','maghrib',{cat:'work',buffer:true}),
 B('معهد تحفيظ القرآن أو مراجعة','maghrib','isha',{cat:'worship'}),
 B('العشاء ووقت العائلة','isha','21:30',{cat:'rest'}),
 B('الترفيه والتواصل','21:30','22:30',{cat:'fun'}),
 B('الاستعداد للنوم','22:30','23:00',{cat:'rest',remind:true}),
 B('النوم','23:00','fajr-15',{cat:'sleep'})]}
function defaultState(){return {v:1,created:Date.now(),
 settings:{name:'عمار',loc:null,asr:'shafi',holidayDays:[5,6],simple:false,phoneGoal:180,sleepGoal:8,waterGoal:8,stepsGoal:6000,pagesGoal:10,learnGoal:30,bedtime:'22:30',notif:{on:false,sched:true,prayer:true,bed:true,lead:10},snapshots:true,weekStart:0},
 schedule:{normal:defaultNormal(),holiday:defaultHoliday()},
 overrides:{},events:[],tasks:[],projects:[],days:{},sleep:[],weight:[],qlogs:[],qplan:[],habits:[],goals:[],achievements:[],books:[],skills:[],hobbies:[],
 workouts:[{id:uid(),name:'ضغط',amount:'3 × 10',days:[0,2,4]},{id:uid(),name:'سكوات',amount:'3 × 15',days:[0,2,4]},{id:uid(),name:'بلانك',amount:'3 × 30 ث',days:[1,3,6]},{id:uid(),name:'تمارين البطن',amount:'3 × 15',days:[1,3,6]},{id:uid(),name:'تمدد خفيف',amount:'10 د',days:[0,1,2,3,4,5,6]}],
 challenges:[{id:uid(),title:'ساعة كاملة بدون جوال',mins:60},{id:uid(),title:'أول ساعة بعد الاستيقاظ بدون جوال',mins:60},{id:uid(),title:'الوجبة بدون جوال',mins:30},{id:uid(),title:'آخر ساعة قبل النوم بدون جوال',mins:60}],
 run:{},notified:{},lastSnap:null}}
let S=defaultState();
const day=(k=todayK())=>S.days[k]||(S.days[k]={});

/* ---------------- storage: IndexedDB + mirror ---------------- */
const DB={db:null,
 open(){return new Promise(res=>{if(!('indexedDB' in window))return res(null);const r=indexedDB.open('etizan',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv')};r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>res(null)})},
 get(k){return new Promise(res=>{if(!this.db)return res(undefined);try{const q=this.db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(undefined)}catch(e){res(undefined)}})},
 set(k,v){return new Promise(res=>{if(!this.db)return res(false);try{const t=this.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res(true);t.onerror=()=>res(false)}catch(e){res(false)}})},
 del(k){return new Promise(res=>{if(!this.db)return res(false);const t=this.db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>res(true)})},
 keys(){return new Promise(res=>{if(!this.db)return res([]);const q=this.db.transaction('kv').objectStore('kv').getAllKeys();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([])})}};
let saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(flush,250)}
async function flush(){clearTimeout(saveT);const json=JSON.stringify(S);await DB.set('state',json);try{localStorage.setItem('etizan-state',json)}catch(e){}}
function migrate(o){const d=defaultState();for(const k in d)if(o[k]===undefined)o[k]=d[k];for(const k in d.settings)if(o.settings[k]===undefined)o.settings[k]=d.settings[k];for(const k in d.settings.notif)if(o.settings.notif[k]===undefined)o.settings.notif[k]=d.settings.notif[k];return o}
async function load(){await DB.open();let j=await DB.get('state');if(!j){try{j=localStorage.getItem('etizan-state')}catch(e){}}if(j){try{S=migrate(JSON.parse(j))}catch(e){}}else{await flush()}
 // daily local snapshot (keeps 7)
 if(S.settings.snapshots&&S.lastSnap!==todayK()&&j){await DB.set('snap-'+todayK(),j);S.lastSnap=todayK();const ks=(await DB.keys()).filter(k=>String(k).startsWith('snap-')).sort();for(const k of ks.slice(0,Math.max(0,ks.length-7)))await DB.del(k);save()}}
window.addEventListener('pagehide',()=>{try{localStorage.setItem('etizan-state',JSON.stringify(S))}catch(e){}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();else{render();}});

/* ---------------- prayer times (on device, Umm al-Qura) ---------------- */
const ptCache={};
function prayerTimes(k=todayK()){const L=S.settings.loc;if(!L||!window.adhan)return null;const ck=k+L.lat+','+L.lng+S.settings.asr;if(ptCache[ck])return ptCache[ck];
 const A=window.adhan,d=pd(k);const p=A.CalculationMethod.UmmAlQura();p.madhab=S.settings.asr==='hanafi'?A.Madhab.Hanafi:A.Madhab.Shafi;
 try{const hm=+new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{month:'numeric'}).format(d);if(hm===9)p.ishaInterval=120}catch(e){}
 const t=new A.PrayerTimes(new A.Coordinates(+L.lat,+L.lng),d,p);const r={};for(const n of ['fajr','sunrise','dhuhr','asr','maghrib','isha']){const x=t[n];r[n]=x.getHours()*60+x.getMinutes();r[n+'D']=x}
 return ptCache[ck]=r}
function nextPrayer(){const now=new Date();for(let i=0;i<2;i++){const k=addD(todayK(),i),t=prayerTimes(k);if(!t)return null;for(const [n,l] of PR){if(t[n+'D']>now)return {n,l,at:t[n+'D'],m:t[n]}}}return null}
const FALLBACK={fajr:290,sunrise:375,dhuhr:705,asr:900,maghrib:1025,isha:1110};

/* ---------------- schedule engine ---------------- */
const ANC=/^(fajr|sunrise|dhuhr|asr|maghrib|isha)([+-]\d+)?$/;
function resolveT(spec,k){if(!spec)return null;const m=String(spec).match(ANC);if(m){const t=prayerTimes(k)||FALLBACK;return t[m[1]]+(+m[2]||0)}return t2m(spec)}
function specLabel(spec){const m=String(spec||'').match(ANC);if(!m)return '';const o=+m[2]||0;return PRN[m[1]]+(o?(o>0?' + ':' − ')+Math.abs(o)+' د':'')}
function isHoliday(k){const o=S.overrides[k];if(o&&o.mode)return o.mode==='holiday';return S.settings.holidayDays.includes(dow(k))}
function eventsOn(k){return S.events.filter(e=>{if(e.date>k)return false;if(e.until&&e.until<k)return false;if(e.rep==='daily')return true;if(e.rep==='weekly')return dow(e.date)===dow(k);if(e.rep==='monthly')return e.date.slice(8)===k.slice(8);return e.date===k}).filter(e=>!(e.skip||[]).includes(k))}
function blocksFor(k){const base=(isHoliday(k)?S.schedule.holiday:S.schedule.normal);const out=base.map(b=>({...b,src:'base',s:resolveT(b.start,k),e:resolveT(b.end,k)}));
 for(const e of eventsOn(k))out.push({...e,src:'event',s:t2m(e.start),e:t2m(e.end||e.start)});
 out.forEach(b=>{if(b.e==null||isNaN(b.e))b.e=b.s;b.len=b.e>=b.s?b.e-b.s:b.e+1440-b.s});
 return out.sort((a,b)=>a.s-b.s)}
function currentBlock(k,list){const n=nowM();let cur=null;for(const b of list){const inside=b.e>=b.s?(n>=b.s&&n<b.e):(n>=b.s||n<b.e);if(inside&&b.len>0)cur=b}return cur}
const CATC={worship:'#d6b67f',study:'#7fa7c9',rest:'#a3b38f',sleep:'#8b84b8',work:'#c99a6a',fun:'#c98c9a',general:'#b08d57',event:'#7fc9b8'};
const CATN={worship:'عبادة',study:'دراسة',rest:'راحة',sleep:'نوم',work:'عمل ومهام',fun:'ترفيه',general:'عام'};

/* ---------------- day score ---------------- */
function dayParts(k){const d=S.days[k]||{};const parts=[];
 const pr=d.pr||{};PR.forEach(([n])=>parts.push(!!pr[n]));
 const bl=d.blk||{};blocksFor(k).filter(b=>b.cat!=='sleep'&&b.src==='base').forEach(b=>parts.push(!!bl[b.id]));
 tasksForDay(k).forEach(t=>parts.push(!!t.done));
 S.habits.filter(h=>h.freq==='daily'&&!h.archived&&h.created<=k).forEach(h=>parts.push(!!(h.log||{})[k]));
 return parts}
function dayScore(k){const p=dayParts(k);return p.length?Math.round(100*p.filter(Boolean).length/p.length):0}
function hasData(k){const d=S.days[k];return !!(d&&Object.keys(d).length)||S.tasks.some(t=>t.doneAt&&dk(new Date(t.doneAt))===k)}
function tasksForDay(k){return S.tasks.filter(t=>(t.date===k)||(t.due===k&&!t.date)||(t.done&&t.doneAt&&dk(new Date(t.doneAt))===k&&(t.date===k||t.due===k)))}
function openTasks(){return S.tasks.filter(t=>!t.done)}
function topTasks(n=3){const tk=todayK();return openTasks().slice().sort((a,b)=>(b.em?1:0)-(a.em?1:0)||(b.prio||1)-(a.prio||1)||((a.due||'9999')<(b.due||'9999')?-1:(a.due||'9999')>(b.due||'9999')?1:0)||(a.order||0)-(b.order||0)).slice(0,n)}

/* ---------------- sleep helpers ---------------- */
function sleepMins(r){if(!r||!r.bed||!r.wake)return 0;let a=t2m(r.bed),b=t2m(r.wake);let m=b-a;if(m<=0)m+=1440;return m}
function sleepOn(k){return S.sleep.find(r=>r.date===k)}
function totalSleep(k){const r=sleepOn(k);return r?sleepMins(r)+(+r.nap||0):null}
function phoneMins(k){const p=(S.days[k]||{}).phone;if(!p)return null;const apps=sum((p.apps||[]).map(a=>a.m));return (+p.total||0)||apps||(+p.work||0)+(+p.ent||0)||null}

/* ---------------- icons ---------------- */
const IC={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',task:'<path d="M9 11l3 3 8-8"/><path d="M20 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9"/>',moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',mosque:'<path d="M12 3c2 2 4 3 4 6H8c0-3 2-4 4-6z"/><path d="M5 21V12h14v9M3 21h18M10 21v-4a2 2 0 0 1 4 0v4"/>',phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',plus:'<path d="M12 5v14M5 12h14"/>',heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',brief:'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',spark:'<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',grip:'<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',chevL:'<path d="M15 6l-6 6 6 6"/>',chevR:'<path d="M9 6l6 6-6 6"/>',pin:'<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',scale:'<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8.5 10a5 5 0 0 1 7 0l-2.5 2.5"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',quran:'<path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14"/>',timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',down:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',up:'<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',walk:'<circle cx="13" cy="4" r="2"/><path d="M10 22l2-7 3 3v6M8 12l2-4 4 1 2 4M10 8l-3 2v3"/>',bath:'<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0"/>'};
const ic=(n,s='')=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${s}>${IC[n]||''}</svg>`;

/* ---------------- UI kit ---------------- */
function toast(msg,ms=2200){$$('.toast').forEach(x=>x.remove());const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),ms)}
function closeSheet(){$$('.ov').forEach(x=>x.remove())}
function sheet(title,html,mount){closeSheet();const ov=document.createElement('div');ov.className='ov';ov.innerHTML=`<div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="grab"></div><div class="row" style="margin-bottom:6px"><h3 class="sp" style="margin:0">${esc(title)}</h3><button class="ib" data-x aria-label="إغلاق">${ic('x')}</button></div><div class="sb">${html}</div></div>`;
 ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))closeSheet()});document.body.appendChild(ov);const sh=$('.sheet',ov);if(mount)mount(sh);const f=$('input:not([type=checkbox]),textarea',sh);if(f&&matchMedia('(min-width:1000px)').matches)setTimeout(()=>f.focus(),50);return sh}
/* form: fields = [{k,l,t:'text'|'number'|'date'|'time'|'select'|'textarea'|'check'|'tspec', v, o:[[val,label]], ph, req}] */
function fieldH(f){const v=f.v==null?'':f.v;const nm=`name="${f.k}"`;let inp;
 if(f.t==='select')inp=`<select ${nm}>${f.o.map(([a,b])=>`<option value="${esc(a)}" ${String(a)===String(v)?'selected':''}>${esc(b)}</option>`).join('')}</select>`;
 else if(f.t==='textarea')inp=`<textarea ${nm} placeholder="${esc(f.ph||'')}">${esc(v)}</textarea>`;
 else if(f.t==='check')return `<label class="row" style="margin:6px 0 12px;gap:8px"><input type="checkbox" ${nm} ${v?'checked':''}> <span>${esc(f.l)}</span></label>`;
 else if(f.t==='tspec'){const m=String(v).match(ANC);const mode=m?m[1]:'time';return `<label class="f tspec" data-k="${f.k}"><span>${esc(f.l)}</span><div class="frow"><select data-mode>${[['time','وقت محدد'],...PR.map(([a,b])=>[a,'مرتبط بـ'+b])].map(([a,b])=>`<option value="${a}" ${a===mode?'selected':''}>${b}</option>`).join('')}</select><input type="time" data-time value="${m?'':esc(v)}" ${m?'style="display:none"':''}><input type="number" data-off placeholder="± دقائق" value="${m?(+m[2]||0):''}" ${m?'':'style="display:none"'}></div></label>`}
 else inp=`<input type="${f.t||'text'}" ${nm} value="${esc(v)}" placeholder="${esc(f.ph||'')}" ${f.t==='number'?'inputmode="decimal" step="any"':''} ${f.min!=null?`min="${f.min}"`:''}>`;
 return `<label class="f"><span>${esc(f.l)}</span>${inp}</label>`}
function formSheet(title,fields,onSave,opts={}){const rows=[];for(let i=0;i<fields.length;i++){const f=fields[i];if(f.half&&fields[i+1]&&fields[i+1].half){rows.push(`<div class="frow">${fieldH(f)}${fieldH(fields[i+1])}</div>`);i++}else rows.push(fieldH(f))}
 const sh=sheet(title,`<form>${rows.join('')}${opts.extra||''}<div class="row" style="margin-top:8px"><button class="btn solid sp" type="submit">${opts.ok||'حفظ'}</button>${opts.onDelete?`<button type="button" class="btn dang" data-del>${ic('trash','width=18')}حذف</button>`:''}</div></form>`,sh=>{
  $$('.tspec',sh).forEach(w=>{const s=$('[data-mode]',w),t=$('[data-time]',w),o=$('[data-off]',w);s.onchange=()=>{const tm=s.value==='time';t.style.display=tm?'':'none';o.style.display=tm?'none':''}});
  if(opts.mount)opts.mount(sh)});
 const form=$('form',sh);form.onsubmit=e=>{e.preventDefault();const o={};for(const f of fields){if(f.t==='tspec'){const w=$(`.tspec[data-k="${f.k}"]`,form),m=$('[data-mode]',w).value;if(m==='time')o[f.k]=$('[data-time]',w).value;else{const off=+$('[data-off]',w).value||0;o[f.k]=m+(off?(off>0?'+':'')+off:'')}continue}
  const el=form.elements[f.k];if(!el)continue;o[f.k]=f.t==='check'?el.checked:f.t==='number'?(el.value===''?null:+el.value):el.value.trim()}
  for(const f of fields)if(f.req&&!o[f.k]){toast('أكمل حقل «'+f.l+'»');return}
  if(onSave(o)!==false){closeSheet();save();render()}};
 if(opts.onDelete)$('[data-del]',sh).onclick=()=>{confirmSheet('هل تريد الحذف؟',()=>{opts.onDelete();save();render()})};
 return sh}
function confirmSheet(msg,yes){sheet(msg,`<div class="row"><button class="btn dang sp" data-y>نعم</button><button class="btn ghost sp" data-x>إلغاء</button></div>`,sh=>{$('[data-y]',sh).onclick=()=>{closeSheet();yes()}})}
function ring(p,size=86,label){const r=size/2-7,c=2*Math.PI*r;return `<div class="ring" style="width:${size}px;height:${size}px;flex-basis:${size}px"><svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="rgba(255,255,255,.08)" stroke-width="7" fill="none"/><circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="url(#gb)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-Math.min(100,p)/100)}"/></svg><b style="font-size:${size<70?15:20}px">${label!=null?label:p+'٪'}</b></div>`}
const barH=(p)=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`;
/* charts */
function chart(o){/* o:{labels,series:[{v:[],c,type:'bar'|'line',name}],h,goal,fmt,min,max} */
 const W=340,H=o.h||150,pl=30,pb=20,pt=10;const n=o.labels.length;const all=o.series.flatMap(s=>s.v).filter(v=>v!=null);
 if(!all.length)return `<div class="empty">${o.empty||'لا توجد بيانات بعد — ستظهر هنا بمجرد التسجيل.'}</div>`;
 let mx=o.max!=null?o.max:Math.max(...all,o.goal||0);let mn=o.min!=null?o.min:Math.min(0,...all);if(o.autoMin){mn=Math.min(...all);mx=Math.max(...all);const pd_=Math.max((mx-mn)*.25,o.pad||1);mn-=pd_;mx+=pd_}if(mx===mn)mx=mn+1;
 const X=i=>pl+(W-pl-6)*(n===1?.5:(i+.5)/n),Y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn));const bw=Math.max(4,(W-pl-6)/n*.55/o.series.filter(s=>s.type!=='line').length||1);
 let g=`<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6b67f"/><stop offset="1" stop-color="#7d6238"/></linearGradient></defs>`;
 for(let i=0;i<=3;i++){const v=mn+(mx-mn)*i/3,y=Y(v);g+=`<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.06)"/><text x="${pl-4}" y="${y+3}" text-anchor="end">${o.fmt?o.fmt(v):Math.round(v)}</text>`}
 if(o.goal){const y=Y(o.goal);g+=`<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="#b08d57" stroke-dasharray="4 4" opacity=".7"/>`}
 const bars=o.series.filter(s=>s.type!=='line');bars.forEach((s,si)=>s.v.forEach((v,i)=>{if(v==null)return;const x=X(i)-bars.length*bw/2+si*bw,y=Y(Math.max(v,mn)),y0=Y(Math.max(mn,0));g+=`<rect x="${x}" y="${Math.min(y,y0)}" width="${bw-1}" height="${Math.max(1.5,Math.abs(y0-y))}" rx="3" fill="${s.c||'url(#bg1)'}"/>`}));
 o.series.filter(s=>s.type==='line').forEach(s=>{const pts=s.v.map((v,i)=>v==null?null:[X(i),Y(v)]).filter(Boolean);if(pts.length>1)g+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${s.c||'#d6b67f'}" stroke-width="2.2" stroke-linejoin="round"/>`;pts.forEach(p=>g+=`<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#121212" stroke="${s.c||'#d6b67f'}" stroke-width="2"/>`)});
 const step=Math.ceil(n/8);o.labels.forEach((l,i)=>{if(i%step===0||i===n-1)g+=`<text x="${X(i)}" y="${H-5}" text-anchor="middle">${esc(l)}</text>`});
 return g+'</svg>'+(o.series.length>1?`<div class="legend">${o.series.map(s=>`<span><i style="background:${s.c||'#b08d57'}"></i>${esc(s.name||'')}</span>`).join('')}</div>`:'')}
const lastDays=(n,end=todayK())=>Array.from({length:n},(_,i)=>addD(end,i-n+1));
const shortD=k=>DSH[dow(k)];
const numD=k=>+k.slice(8)+'/'+ +k.slice(5,7);

/* ---------------- router ---------------- */
const ROUTES={};let cur='home',curArg='';
function route(){const h=(location.hash||'#/home').slice(2).split('/');cur=ROUTES[h[0]]?h[0]:'home';curArg=decodeURIComponent(h.slice(1).join('/')||'');render();window.scrollTo(0,0)}
const NAV=[['home','الرئيسية','home'],['schedule','الجدول','cal'],['tasks','المهام','task'],['prayer','الصلاة','mosque'],['phone','الهاتف','phone']];
const ALL=[['home','الرئيسية','home'],['schedule','الجدول الذكي','cal'],['prayer','الصلاة والقرآن','mosque'],['tasks','العمل والدراسة','brief'],['habits','العادات والأهداف','spark'],['phone','الهاتف','phone'],['sleep','النوم','moon'],['health','الصحة والرياضة','heart'],['learn','القراءة والتعلم','book'],['reports','التقارير','chart'],['settings','الإعدادات','gear']];
function shell(){document.body.innerHTML=`<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c48f"/><stop offset="1" stop-color="#8f6d3d"/></linearGradient></defs></svg>
<div class="app"><aside class="side"><div class="brand"><div class="mark">ا</div><div><b>اتزان</b><div class="sub mu sm">ETIZAN</div></div></div>${ALL.map(([r,l,i])=>`<button class="sl" data-r="${r}">${ic(i)}<span>${l}</span></button>`).join('')}<div class="sp"></div><div class="foot">صُنع بواسطة <b>عمار الشمري</b></div></aside>
<main id="main"></main></div>
<nav class="nav">${NAV.map(([r,l,i])=>`<button class="nv" data-r="${r}">${ic(i)}<span>${l}</span></button>`).join('')}<button class="nv" data-r="more">${ic('more')}<span>المزيد</span></button></nav>
<button class="fab" id="fab" aria-label="إضافة سريعة">${ic('plus')}</button>`;
 document.addEventListener('click',e=>{const r=e.target.closest('[data-r]');if(r){location.hash='#/'+r.dataset.r;return}const g=e.target.closest('[data-go]');if(g){location.hash='#/'+g.dataset.go}});
 $('#fab').onclick=()=>quickAdd()}
function navState(){const m=['sleep','health','learn','reports','settings','habits','more'].includes(cur)?'more':cur;$$('.nv').forEach(b=>b.classList.toggle('on',b.dataset.r===m||b.dataset.r===cur));$$('.sl').forEach(b=>b.classList.toggle('on',b.dataset.r===cur))}
function render(){const m=$('#main');if(!m)return;const fn=ROUTES[cur];m.innerHTML=fn.html();navState();if(fn.mount)fn.mount(m);m.insertAdjacentHTML('beforeend',`<div class="foot">صُنع بواسطة <b>عمار الشمري</b> · اتزان ${VERSION}</div>`);tickUI()}
const header=(t,sub,right='')=>`<div class="top"><div><h1>${t}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div><div class="row">${right}</div></div>`;

/* ---------------- live tick ---------------- */
function tickUI(){const now=new Date();$$('[data-clock]').forEach(e=>e.textContent=pad(now.getHours()%12||12)+':'+pad(now.getMinutes())+':'+pad(now.getSeconds()));$$('[data-ampm]').forEach(e=>e.textContent=now.getHours()<12?'صباحًا':'مساءً');
 const np=nextPrayer();$$('[data-np]').forEach(e=>{if(!np){e.textContent='—';return}const s=Math.max(0,Math.round((np.at-now)/1000));e.textContent=pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60)});
 $$('[data-ent]').forEach(e=>{const r=S.run.ent;if(!r)return;const s=Math.round((Date.now()-r.start)/1000);e.textContent=pad(Math.floor(s/60))+':'+pad(s%60)});
 $$('[data-free]').forEach(e=>{const r=S.run.free;if(!r)return;const left=Math.round(r.mins*60-(Date.now()-r.start)/1000);const s=Math.abs(left);e.textContent=(left<0?'+':'')+pad(Math.floor(s/60))+':'+pad(s%60)})}
let lastMin=-1;
setInterval(()=>{tickUI();const m=new Date().getMinutes();if(m!==lastMin){lastMin=m;if(lastMin>=0&&!$('.ov')&&(cur==='home'||cur==='schedule'))render();checkReminders();checkTimers()}},1000);

/* ---------------- notifications (quiet, toggleable) ---------------- */
async function notify(title,body,tag){if(!S.settings.notif.on||!('Notification' in window)||Notification.permission!=='granted')return false;try{const reg=await navigator.serviceWorker?.getRegistration();if(reg){await reg.showNotification(title,{body,tag,icon:'icons/icon-192.png',badge:'icons/icon-192.png',lang:'ar',dir:'rtl',silent:false});return true}new Notification(title,{body,tag,dir:'rtl'});return true}catch(e){return false}}
function checkReminders(){const N=S.settings.notif;if(!N.on)return;const k=todayK(),n=nowM();const fire=(key,title,body)=>{if(S.notified[key])return;S.notified[key]=1;save();notify(title,body,key)};
 if(N.sched){for(const b of blocksFor(k)){if(!b.remind)continue;const at=b.s-(+N.lead||0);if(n>=at&&n<at+2)fire(k+b.id,'اتزان · '+b.title,'يبدأ عند '+fmtT(b.s))}}
 if(N.prayer){const t=prayerTimes(k);if(t)for(const [p,l] of PR){if(n>=t[p]&&n<t[p]+2)fire(k+p,'حان وقت صلاة '+l,'حيّ على الصلاة')}}
 if(N.bed){const bt=t2m(S.settings.bedtime);if(n>=bt&&n<bt+2)fire(k+'bed','الاستعداد للنوم','حان وقت الاستعداد للنوم — نومٌ هانئ.')}
 // prune
 const ks=Object.keys(S.notified);if(ks.length>300){S.notified={}}}
function checkTimers(){const r=S.run.ent;if(r&&r.limit&&!r.warned&&(Date.now()-r.start)/60000>=r.limit){r.warned=1;save();toast('انتهى وقت الترفيه الذي حددته — أحسنت إن توقفت الآن.',4000);notify('انتهى وقت الترفيه','الوقت الذي حددته انتهى.','ent')}
 const f=S.run.free;if(f&&!f.warned&&(Date.now()-f.start)/60000>=f.mins){f.warned=1;save();toast('أتممت التحدي! 🌟 سجّله من صفحة الهاتف.',4000);notify('أتممت التحدي','أحسنت، أكملت '+f.title,'free')}}