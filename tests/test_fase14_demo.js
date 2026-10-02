// Fase 14 · paso 4: registry con el curso Demo real, validación del contenido declarativo y aislamiento (Parte 24).
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const demoSrc=fs.readFileSync(path.join(root,'content','courses','curso-demo.js'),'utf8');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test={...globalThis.__fase11,...globalThis.__fase5,...globalThis.__fase12,...globalThis.__platform};';
const IDS=['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','assessment-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','final-assessment-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'];
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
function boot(store,withDemo=true){
  const elements=new Map(IDS.map(id=>[id,el(id)]));
  const context={console:{...console,warn(){}},Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(p){this.parts=p}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
  vm.createContext(context); if(withDemo) vm.runInContext(demoSrc,context,{filename:'curso-demo.js'}); // como el <script> de index.html
  vm.runInContext(script,context,{filename:'script.js'}); return context.__test;
}
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
const A='analista-ecommerce', D='curso-demo', KEY='plataforma.aprendizaje.v1';
let store=new Map(), api=boot(store); const reg=api.COURSE_REGISTRY;

// --- Registry con dos cursos reales
const ids=reg.list().map(c=>c.id); assert(ids.includes(A)&&ids.includes(D)&&new Set(ids).size===ids.length,'ambos registrados, ids únicos: '+ids);
assert(reg.get(D).status==='active'&&reg.validate(reg.get(D)).ok,'Demo válido'); assert(reg.get(D).lessons.length===1&&Object.keys(reg.get(D).exercises).length===2&&Object.keys(reg.get(D).concepts).length===1&&reg.get(D).modules.length===1,'1 módulo, 1 lección, 1 concepto, 2 ejercicios');
assert(reg.list({status:'active'}).length===2,'filtro por estado');
assert(boot(new Map(),false).COURSE_REGISTRY.list().length===1,'sin el archivo del Demo solo existe el Analista (el motor no depende de él)');
pass('registry: Analista + Demo, ids únicos, motor independiente del archivo de contenido');

// --- Validación del contenido declarativo
const base=JSON.parse(JSON.stringify(reg.get(D)));
const bad=(mut,expect)=>{const c=JSON.parse(JSON.stringify(base));c.id='curso-malo';c.lessons=[{id:'malo-l1',title:'x',exercises:['malo-e1','malo-e2']}];c.modules=[];const cl=o=>JSON.parse(JSON.stringify(o));c.exercises={'malo-e1':cl(base.exercises['demo-e1']),'malo-e2':cl(base.exercises['demo-e2'])};c.exerciseContent={'malo-e1':cl(base.exerciseContent['demo-e1']),'malo-e2':cl(base.exerciseContent['demo-e2'])};c.lessonContent={'malo-l1':{blocks:[{type:'exercise',exerciseId:'malo-e1'},{type:'exercise',exerciseId:'malo-e2'}]}};mut(c);const r=reg.validate(c);assert(!r.ok,'debía rechazarse: '+expect);assert(r.reasons.some(x=>x.includes(expect)),'razón esperada "'+expect+'" en '+r.reasons.join(' | '));};
const okCourse=()=>{const c=JSON.parse(JSON.stringify(base));return c;};
bad(c=>{delete c.lessonContent['malo-l1']},'lección sin contenido');
bad(c=>{c.lessonContent['malo-l1'].blocks.pop()},'no aparece en la lección');
bad(c=>{c.lessonContent['malo-l1'].blocks.push({type:'script',text:'x'})},'bloque no soportado');
bad(c=>{c.lessonContent['malo-l1'].blocks.push({type:'paragraph'})},'bloque sin texto');
bad(c=>{c.lessonContent['malo-l1'].blocks.push({type:'list',items:[1]})},'lista inválida');
bad(c=>{c.lessonContent['malo-l1'].blocks.push({type:'exercise',exerciseId:'otro'})},'ejercicio ajeno');
bad(c=>{delete c.exerciseContent['malo-e1']},'sin contenido');
bad(c=>{c.exerciseContent['malo-e1'].kind='drag'},'tipo no soportado');
bad(c=>{c.exerciseContent['malo-e1'].fields=[]},'campos numéricos inválidos');
bad(c=>{c.exerciseContent['malo-e1'].fields[0].answer='800'},'campos numéricos inválidos');
bad(c=>{c.exerciseContent['malo-e2'].options.forEach(o=>o.correct=false)},'opciones inválidas');
bad(c=>{c.exerciseContent['malo-e2'].options.forEach(o=>o.correct=true)},'opciones inválidas');
bad(c=>{c.exerciseContent['malo-e2'].options.length=1},'opciones inválidas');
bad(c=>{c.exerciseContent['malo-e1'].prompt=''},'sin enunciado');
bad(c=>{c.exerciseContent['malo-e1'].solution='texto'},'solución inválida');
assert(!reg.register(okCourse()).ok,'reinscribir el Demo: id duplicado'); const dup=okCourse(); dup.id='otro-demo'; assert(reg.register(dup).reasons.some(r=>r.includes('lección ya usado')),'ids de lección compartidos entre cursos se rechazan');
pass('contenido declarativo malformado rechazado con razones claras');

// --- Aislamiento (Parte 24) con los cursos reales
const exA=reg.get(A).exercises, conceptsOf=ids=>new Set(ids.flatMap(i=>exA[i].concepts));
api.recordAttempt('l1-e1',false,{}); api.recordAttempt('l1-e1',true,{}); api.recordAttempt('l1-e2',true,{}); api.recordAttempt('l2-e1',false,{}); api.recordAttempt('l2-e1',false,{});
const sumA0=api.summarizeCourse(A); assert(sumA0.attempts===5&&sumA0.completedExercises===2&&sumA0.started,'A: 5 intentos, 2 completados');
const dashA0=api.getDashboardData(); const practicedA=[...new Set(dashA0.records.filter(r=>r.attempts>0).map(r=>r.conceptId))];
assert(practicedA.length===conceptsOf(['l1-e1','l1-e2','l2-e1']).size&&practicedA.length>=3,'A: conceptos practicados = '+practicedA.length);
const snapA=JSON.stringify(dashA0.records.map(r=>[r.conceptId,r.attempts,r.state]));
api.saveLearningState({force:true});
// B (Demo) parte en cero
let sumD=api.summarizeCourse(D); assert(sumD.attempts===0&&sumD.completedExercises===0&&!sumD.started&&sumD.totalExercises===2,'Demo antes de abrirlo: 0 intentos, 0 completados, no iniciado');
assert(api.setActiveCourse(D).ok,'abrir Demo');
let dashD=api.getDashboardData(); assert(dashD.uniqueConcepts.length===1&&dashD.uniqueConcepts[0]==='demo_run_rate'&&dashD.records.every(r=>r.conceptId==='demo_run_rate'&&r.attempts===0),'Demo: solo su concepto, sin evidencia');
assert(api.getDashboardData().completedExercises===0&&api.generateReviewPlan().length===0,'Demo: sin completados ni repaso');
assert(api.summarizeCourse(A).attempts===5,'el dashboard global ve A intacto mientras se abre B');
// Práctica en Demo
api.recordAttempt('demo-e1',false,{}); api.recordAttempt('demo-e1',true,{}); api.recordAttempt('demo-e2',true,{});
sumD=api.summarizeCourse(D); assert(sumD.attempts===3&&sumD.completedExercises===2&&sumD.started,'Demo: 3 intentos, 2 completados');
dashD=api.getDashboardData(); assert(dashD.uniqueConcepts.length===1&&dashD.uniqueConcepts[0]==='demo_run_rate'&&dashD.records.every(r=>r.conceptId==='demo_run_rate')&&dashD.records.reduce((n,r)=>n+r.attempts,0)===3,'dashboard del Demo: solo sus datos');
api.saveLearningState({force:true});
// Dashboard global: ambos correctos; A no cambió
let sumA=api.summarizeCourse(A); assert(sumA.attempts===5&&sumA.completedExercises===2,'global: A sin cambios');
assert(sumD.attempts===3&&api.summarizeCourse(D).completedExercises===2,'global: Demo con lo suyo');
const rootJson=JSON.parse(store.get(KEY)); assert(Object.keys(rootJson.courses[A].state.exercises).every(k=>!k.startsWith('demo-'))&&Object.keys(rootJson.courses[D].state.exercises).every(k=>k.startsWith('demo-')),'en disco, cada curso solo tiene sus ejercicios');
// Volver a A
assert(api.setActiveCourse(A).ok,'volver a A'); const dashA1=api.getDashboardData();
assert(JSON.stringify(dashA1.records.map(r=>[r.conceptId,r.attempts,r.state]))===snapA,'A: evidencia idéntica');
assert(!dashA1.records.some(r=>r.conceptId==='demo_run_rate'),'A: sin evidencia del Demo');
// Reiniciar el Demo no toca A; reiniciar A no toca el Demo
api.setActiveCourse(D); api.resetLearningProgress(); assert(api.summarizeCourse(D).attempts===0&&api.summarizeCourse(A).attempts===5,'reiniciar Demo no toca A');
api.setActiveCourse(A); api.recordAttempt('l3-e1',false,{}); api.saveLearningState({force:true}); assert(api.summarizeCourse(D).attempts===0,'practicar A no toca Demo');
pass('aislamiento A↔Demo: intentos, completados, conceptos, repaso, dashboard global y por curso');

// --- Persistencia: el curso activo y su progreso sobreviven a "recargar"
api.setActiveCourse(D); api.recordAttempt('demo-e1',true,{}); api.saveLearningState({force:true});
const api2=boot(store); assert(api2.getActiveCourseId()===D&&api2.getEngineContext().lessons[0].id==='demo-l1','recarga abre el curso activo');
assert(api2.summarizeCourse(D).completedExercises===1&&api2.summarizeCourse(A).attempts===6,'recarga: ambos progresos intactos');
// Si el archivo del Demo deja de cargarse, el curso activo cae al predeterminado y NO se borra su progreso
const api3=boot(store,false); assert(api3.getActiveCourseId()===A,'sin el Demo registrado se abre el Analista'); api3.saveLearningState({force:true});
assert(JSON.parse(store.get(KEY)).courses[D].state.exercises['demo-e1'].completed===true,'el progreso del Demo sigue en disco');
pass('persistencia entre recargas y curso retirado sin pérdida de datos');
