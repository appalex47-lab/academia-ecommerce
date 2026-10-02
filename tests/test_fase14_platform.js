// Fase 14 · paso 1: registry de cursos, almacén por curso y migración del progreso anterior.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test={...globalThis.__fase11,...globalThis.__platform};';
const IDS=['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'];
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
// Cada entorno es una "recarga" del navegador con el almacenamiento dado (Map compartido).
function boot(store){
  const elements=new Map(IDS.map(id=>[id,el(id)]));
  const context={console:{...console,warn(){}},Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(p){this.parts=p}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
  vm.createContext(context);vm.runInContext(script,context,{filename:'script.js'});return context.__test;
}
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
const KEY='plataforma.aprendizaje.v1', LEGACY='cursoAnalista.fase2.progress.v1', ID='analista-ecommerce';

// --- Registry
let api=boot(new Map());
const reg=api.COURSE_REGISTRY, course=reg.get(ID);
assert(course&&course.id===ID&&course.status==='active','curso actual registrado'); assert(reg.list().length>=1,'lista');
assert(reg.validate(course).ok,'curso actual válido');
assert(reg.register(course).reasons.includes('id duplicado'),'ids únicos');
assert(reg.get('no-existe')===null,'get inexistente');
assert(!reg.validate({id:'Mal Id',title:'x',version:'1',status:'active',lessons:[{id:'a',exercises:[]}]}).ok,'id inválido rechazado');
assert(!reg.validate({id:'ok',title:'x',version:'1',status:'active',lessons:[{id:'a',exercises:['zz']}],exercises:{}}).ok,'ejercicio sin definición rechazado');
assert(!reg.validate({id:'ok',title:'x',version:'1',status:'active',lessons:[{id:'a',exercises:[]},{id:'a',exercises:[]}]}).ok,'lecciones repetidas rechazadas');
assert(!reg.validate({id:'ok',title:'x',version:'1',status:'raro',lessons:[{id:'a',exercises:[]}]}).ok,'estado inválido rechazado');
assert(api.resolveActiveCourseId('no-existe')===ID&&api.resolveActiveCourseId(ID)===ID,'curso actual por defecto');
pass('registry: registro, validación, ids únicos, curso por defecto');

// --- Migración desde el estado anterior
const legacyState={schemaVersion:2,currentLessonId:'l3',currentIndex:3,learnerProfile:{name:'Luz'},lessonStatus:{l1:{read:true,completed:true}},exercises:{'l1-e1':{attempts:5,solvedCorrectly:true}},caseLearningState:{},reviewLearningState:{history:[],deferredUntil:{},activeItemId:null},finalAssessmentState:{},navigation:{activeView:'course',activeActivityId:null}};
const legacyText=JSON.stringify(legacyState);
let store=new Map([[LEGACY,legacyText]]);
api=boot(store);
let root1=JSON.parse(store.get(KEY));
assert(root1.schemaVersion===3&&root1.activeCourseId===ID,'raíz v3'); assert(root1.courses[ID].state.exercises['l1-e1'].attempts===5,'datos conservados');
assert(root1.migrations.length===1&&root1.migrations[0].courseId===ID,'migración registrada');
assert(store.get(LEGACY)===legacyText,'clave anterior intacta (reversible)');
assert(api.getPersistenceState().status==='healthy','estado sano tras migrar');
pass('migración legacy → analista-ecommerce, sin pérdida y reversible');
// Segunda carga: no repite la migración aunque la clave anterior siga ahí.
store.set(LEGACY,JSON.stringify({...legacyState,currentLessonId:'l5'}));
api=boot(store);
let root2=JSON.parse(store.get(KEY));
assert(root2.migrations.length===1&&root2.courses[ID].state.currentLessonId==='l3','no se migra dos veces');
pass('migración única');

// --- Escritura: solo el curso activo; otros cursos no se tocan
const other={state:{schemaVersion:2,marker:'otro'},updatedAt:'2026-01-01T00:00:00.000Z'};
root2.courses['curso-x']=other; store.set(KEY,JSON.stringify(root2));
api=boot(store); api.saveLearningState({force:true});
let r=JSON.parse(store.get(KEY)); assert(r.courses['curso-x'].state.marker==='otro','guardar no toca otros cursos');
api.resetLearningProgress(); r=JSON.parse(store.get(KEY));
assert(r.courses['curso-x'].state.marker==='otro','reiniciar no toca otros cursos'); assert(r.courses[ID].state.currentIndex===0,'reinicia solo el activo');
pass('almacén namespaced por curso');

// --- Curso activo persistido y valor inválido
r.activeCourseId='no-registrado'; store.set(KEY,JSON.stringify(r)); api=boot(store);
assert(api.getActiveCourseId()===ID,'curso activo inválido vuelve al predeterminado'); pass('curso activo');

// --- Datos dañados o de versión futura no se sobrescriben
store=new Map([[KEY,'{bad']]); api=boot(store); assert(api.getPersistenceState().status==='corrupt','corrupto'); api.saveLearningState({force:true}); assert(store.get(KEY)==='{bad','no sobrescribe');
store=new Map([[KEY,JSON.stringify({schemaVersion:3,courses:[]})]]); api=boot(store); assert(api.getPersistenceState().status==='corrupt','estructura inválida = corrupto'); assert(!store.has(LEGACY),'sin legacy');
store=new Map([[KEY,JSON.stringify({schemaVersion:9,courses:{}})]]); api=boot(store); assert(api.getPersistenceState().status==='unsupported','versión futura');
store=new Map([[LEGACY,'{bad']]); api=boot(store); assert(api.getPersistenceState().status==='corrupt'&&!store.has(KEY)&&store.get(LEGACY)==='{bad','legacy corrupto: no migra ni borra');
pass('datos dañados protegidos');
