// Fase 14 · paso 3: validación de videos, capas de configuración y exportación (lógica, sin navegador).
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test={...globalThis.__fase11,...globalThis.__videos,...globalThis.__platform};';
const IDS=['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'];
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
function boot(store,shipped){
  const elements=new Map(IDS.map(id=>[id,el(id)]));
  const context={console:{...console,warn(){}},Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(p){this.parts=p}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
  if(shipped) context.COURSE_VIDEOS=shipped; // content/videos.js define globalThis.COURSE_VIDEOS
  vm.createContext(context); if(shipped) vm.runInContext('globalThis.COURSE_VIDEOS=COURSE_VIDEOS',context);
  vm.runInContext(script,context,{filename:'script.js'});return context.__test;
}
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
const ID='11111111111', A='analista-ecommerce', KEY='plataforma.aprendizaje.v1';
let api=boot(new Map()); const V=api.validateVideoUrl;

// YouTube: formatos comunes → embed seguro (youtube-nocookie)
['https://www.youtube.com/watch?v='+ID,'https://youtube.com/watch?feature=share&v='+ID+'&t=5','https://youtu.be/'+ID,'https://www.youtube.com/embed/'+ID,'https://www.youtube.com/shorts/'+ID,'https://m.youtube.com/watch?v='+ID,'https://www.youtube-nocookie.com/embed/'+ID].forEach(u=>{
  const r=V(u); assert(r.status==='valid'&&r.provider==='youtube'&&r.youtubeId===ID,'youtube: '+u); assert(r.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/'+ID+'?'),'nocookie: '+u);});
pass('YouTube: watch, youtu.be, embed, shorts → ID correcto y embed nocookie');

// Archivos
let r=V('https://cdn.ejemplo.com/v/leccion-1.mp4?x=1'); assert(r.status==='valid'&&r.provider==='mp4','mp4');
r=V('https://cdn.ejemplo.com/v/leccion-1.WEBM'); assert(r.status==='valid'&&r.provider==='webm','webm');
r=V('videos/leccion-1.mp4'); assert(r.status==='valid'&&r.provider==='mp4'&&r.src==='videos/leccion-1.mp4','ruta relativa');
r=V('https://github.com/u/r/blob/main/v.mp4'); assert(r.status==='valid'&&r.src==='https://github.com/u/r/raw/main/v.mp4','blob de GitHub → raw');
pass('MP4 y WebM válidos (absolutos, relativos, GitHub blob)');

// Rechazos
['javascript:alert(1)','JAVASCRIPT:alert(1)','data:text/html,<script>alert(1)</script>','vbscript:msgbox(1)','blob:https://x/abc','file:///etc/passwd.mp4','//evil.com/v.mp4','ftp://x.com/v.mp4','https://user:pw@x.com/v.mp4','https://example.com/pagina','https://example.com/video.avi','https://youtu.be/corto','https://evil.com/watch?v='+ID,'https://youtube.com.evil.com/watch?v='+ID,'https://www.youtube.com/watch?v='+ID+'XX','no es una url','https://x.com/a b.mp4','PON AQUÍ TU VIDEO DE LA SECCIÓN 1'].forEach(u=>{
  const x=V(u); assert(x.status==='invalid','debe rechazar: '+u+' → '+x.status);});
assert(V('').status==='empty'&&V('   ').status==='empty'&&V(null).status==='empty'&&V(undefined).status==='empty','vacío');
assert(V('https://x.com/'+'a'.repeat(2100)+'.mp4').status==='invalid','URL demasiado larga');
pass('URLs peligrosas o inválidas rechazadas; vacío = sin configurar');

// Mensajes de estado exactos
const M=api.VIDEO_STATUS_MESSAGES;
assert(M.valid==='Video listo para usar'&&M.invalid==='No pudimos reconocer esta URL como un video compatible.'&&M.unavailable==='La URL tiene un formato válido, pero el recurso no pudo cargarse.'&&M.empty==='Esta sección todavía no tiene video.','mensajes');
pass('mensajes de estado');

// Sanitización de entradas
const e=api.sanitizeVideoEntry({title:'<b>Hola</b>\u0001',url:' https://youtu.be/'+ID+' ',enabled:'yes'});
assert(e.title==='bHola/b'&&e.url==='https://youtu.be/'+ID&&e.enabled===false&&e.provider==='youtube','sanitiza título/url/enabled estricto');
assert(api.sanitizeVideoEntry(null)===null&&api.sanitizeVideoEntry({removed:true}).removed===true,'null y removed');
pass('sanitización de entradas');

// Capas: sin config → none; guardar → local; publicado < local; eliminar
let r0=api.resolveLessonVideo(A,'l1'); assert(r0.source==='none'&&r0.validation.status==='empty'&&!r0.active,'sin configurar');
let st=new Map(); api=boot(st);
let s1=api.saveVideoConfig(A,'l1',{title:'L1',url:'https://youtu.be/'+ID,enabled:true}); assert(s1.ok,'guardar');
r0=api.resolveLessonVideo(A,'l1'); assert(r0.source==='local'&&r0.active&&r0.validation.provider==='youtube','local activo');
assert(JSON.parse(st.get(KEY)).content[A].videos.l1.url==='https://youtu.be/'+ID,'guardado en content del almacén');
assert(!api.saveVideoConfig(A,'l1',{title:'x',url:'javascript:alert(1)',enabled:true}).ok,'no guarda URL peligrosa');
assert(!api.saveVideoConfig(A,'l1',{title:'x',url:'https://example.com/pagina',enabled:true}).ok,'no guarda URL no compatible');
assert(!api.saveVideoConfig(A,'no-existe',{title:'x',url:'https://youtu.be/'+ID,enabled:true}).ok,'lección inexistente');
assert(!api.saveVideoConfig('curso-x','l1',{title:'x',url:'https://youtu.be/'+ID,enabled:true}).ok,'curso inexistente');
assert(api.resolveLessonVideo(A,'l1').entry.url==='https://youtu.be/'+ID,'rechazos no pisan lo guardado');
api.saveVideoConfig(A,'l2',{title:'L2',url:'videos/l2.mp4',enabled:false}); r0=api.resolveLessonVideo(A,'l2'); assert(r0.source==='local'&&!r0.active&&r0.validation.status==='valid','desactivado: válido pero no activo');
api.removeVideoConfig(A,'l1'); assert(api.resolveLessonVideo(A,'l1').source==='none','eliminar (sin publicado) borra el borrador');
pass('guardar, rechazar, desactivar y eliminar configuración');

// Publicada (content/videos.js) + borrador local que la reemplaza o la elimina
const shipped={[A]:{l3:{title:'Pub L3',provider:'mp4',url:'videos/l3.mp4',enabled:true},l4:{title:'Pub L4',url:'https://youtu.be/'+ID,enabled:true}}};
st=new Map(); api=boot(st,shipped);
r0=api.resolveLessonVideo(A,'l3'); assert(r0.source==='published'&&r0.active,'publicado activo');
api.saveVideoConfig(A,'l3',{title:'Borrador',url:'videos/otro.mp4',enabled:true}); assert(api.resolveLessonVideo(A,'l3').entry.title==='Borrador','el borrador local reemplaza al publicado');
api.removeVideoConfig(A,'l4'); r0=api.resolveLessonVideo(A,'l4'); assert(r0.source==='none'&&!r0.active,'eliminar un publicado lo oculta (marca removed)');
assert(JSON.parse(st.get(KEY)).content[A].videos.l4.removed===true,'removed persistido');
api.discardLocalVideos(A); assert(api.resolveLessonVideo(A,'l3').source==='published'&&api.resolveLessonVideo(A,'l4').source==='published','descartar borrador vuelve a lo publicado');
pass('capas publicado/local, eliminar publicado y descartar borrador');

// El borrador de videos no es progreso: reiniciar progreso no lo borra, ni viaja en el respaldo
st=new Map(); api=boot(st); api.saveVideoConfig(A,'l1',{title:'L1',url:'https://youtu.be/'+ID,enabled:true});
api.saveLearningState({force:true}); const rootNow=JSON.parse(st.get(KEY)); assert(rootNow.content[A].videos.l1&&rootNow.courses[A],'convive con el progreso');
assert(!JSON.stringify(rootNow.courses[A].state).includes('youtu.be'),'el estado del curso no contiene videos');
pass('videos separados del progreso del alumno');

// Exportación de content/videos.js
st=new Map(); api=boot(st,shipped); api.saveVideoConfig(A,'l5',{title:'L5',url:'https://youtu.be/'+ID,enabled:true}); api.removeVideoConfig(A,'l4');
const out=api.buildVideosScript(); assert(out.includes('globalThis.COURSE_VIDEOS = '),'cabecera');
const ctx={globalThis:{}}; vm.runInNewContext(out,ctx); const cfg=ctx.globalThis.COURSE_VIDEOS[A];
assert(cfg.l3&&cfg.l5&&!cfg.l4,'incluye publicado + local y excluye eliminado'); assert(cfg.l5.provider==='youtube'&&cfg.l5.enabled===true,'campos del entry');
pass('exportación de videos.js ejecutable y coherente');

// Persistencia protegida: con almacén dañado no se escribe
st=new Map([[KEY,'{bad']]); api=boot(st); assert(!api.saveVideoConfig(A,'l1',{title:'x',url:'https://youtu.be/'+ID,enabled:true}).ok&&st.get(KEY)==='{bad','no escribe sobre un almacén dañado');
pass('almacén dañado protegido');
