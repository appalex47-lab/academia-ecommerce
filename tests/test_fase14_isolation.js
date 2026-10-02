// Fase 14 · paso 2: el motor usa el contexto del curso activo y los datos no se mezclan entre cursos.
// El curso B es SOLO de prueba (se registra en el test); el curso Demo real llega en un paso posterior.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test={...globalThis.__fase11,...globalThis.__platform,...globalThis.__fase5,...globalThis.__fase12};';
const IDS=['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','assessment-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','final-assessment-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'];
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
const store=new Map(), elements=new Map(IDS.map(id=>[id,el(id)]));
const context={console:{...console,warn(){}},Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(p){this.parts=p}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
vm.createContext(context);vm.runInContext(script,context,{filename:'script.js'});const api=context.__test;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
const A='analista-ecommerce', B='curso-prueba-b', KEY='plataforma.aprendizaje.v1';
const stateOf=id=>JSON.parse(store.get(KEY)).courses[id]&&JSON.parse(store.get(KEY)).courses[id].state;

// Curso B mínimo, con IDs de ejercicio y concepto propios y sin evaluación ni casos.
const courseB={id:B,title:'Curso de prueba B',description:'Solo para tests',version:'0.0.1',status:'active',category:'Prueba',author:'',thumbnail:'',
  modules:[{id:'mb1',title:'Módulo B1',lessonIds:['b1']}],
  lessons:[{id:'b1',title:'Lección B1',exercises:['b1-e1','b1-e2']}],
  concepts:{b_concept:{id:'b_concept',name:'Concepto B',description:'x',category:'prueba',relatedConcepts:[]}},
  exercises:{'b1-e1':{hints:['pista b1'],type:'calculation',cognitiveLevel:'calculate',difficulty:1,concepts:['b_concept']},'b1-e2':{hints:['pista b2'],type:'interpretation',cognitiveLevel:'interpret',difficulty:2,concepts:['b_concept']}},
  cases:[],videos:{}};
assert(api.COURSE_REGISTRY.register(courseB).ok,'curso B registrable');

// Curso A: 5 intentos, 2 ejercicios resueltos
const ctxA=api.getEngineContext(); assert(ctxA.courseId===A&&ctxA.lessons.length===10,'contexto inicial = analista');
for(let i=0;i<3;i++) api.recordAttempt('l1-e1',false,{v:i});
api.recordAttempt('l1-e1',true,{v:9}); api.recordAttempt('l1-e2',true,{v:1});
const snapA=JSON.stringify(api.getDashboardData().records.map(r=>[r.conceptId,r.attempts,r.state]));
const dashA=api.getDashboardData();
assert(dashA.completedExercises===2&&dashA.totalExercises===10,'A: 2 de 10 completados');
const attemptsA=api.getLearningState('l1-e1').attempts+api.getLearningState('l1-e2').attempts; assert(attemptsA===5,'A: 5 intentos');
api.saveLearningState({force:true});
pass('curso A con actividad propia');

// Cambio a B: arranca en cero y usa su propio contenido
const sw=api.setActiveCourse(B); assert(sw.ok&&sw.changed,'cambio a B');
const ctxB=api.getEngineContext();
assert(ctxB.courseId===B&&ctxB.lessons.length===1&&ctxB.lessons[0].id==='b1','motor enlazado al contenido de B');
assert(!ctxB.concepts.annual_goal&&ctxB.concepts.b_concept,'conceptos de B, sin los de A');
assert(ctxB.cases.length===0,'B sin casos de A'); assert(!api.courseHasAssessment(),'B sin evaluación');
const dashB0=api.getDashboardData();
assert(dashB0.completedExercises===0&&dashB0.totalExercises===2&&dashB0.records.every(r=>r.attempts===0),'B inicia en 0');
assert(api.getLearningState('b1-e1').attempts===0,'B: 0 intentos');
assert(api.getFinalAssessmentState().completed===false&&api.getFinalAssessmentState().attempts.length===0,'B: evaluación vacía');
assert(api.generateReviewPlan().length===0,'B: repaso vacío (nada de A)');
assert(JSON.parse(store.get(KEY)).activeCourseId===B,'curso activo persistido');
pass('curso B arranca en cero y no ve contenido de A');

// Práctica en B
api.recordAttempt('b1-e1',false,{v:1}); api.recordAttempt('b1-e1',true,{v:2});
assert(api.getLearningState('b1-e1').attempts===2,'B: 2 intentos'); assert(api.getDashboardData().completedExercises===1,'B: 1 completado');
api.saveLearningState({force:true});
assert(stateOf(A).exercises['l1-e1'].attempts===4&&stateOf(A).exercises['l1-e2'].attempts===1,'A en disco sin cambios');
assert(!stateOf(A).exercises['b1-e1']&&Object.keys(stateOf(B).exercises).every(k=>k.startsWith('b1')),'ids no mezclados en disco');
pass('práctica en B no altera A en disco');

// Volver a A: conserva su progreso
assert(api.setActiveCourse(A).ok,'volver a A');
assert(api.getEngineContext().lessons.length===10,'A recuperó su contenido');
assert(api.getLearningState('l1-e1').attempts===4&&api.getLearningState('l1-e2').attempts===1,'A: intentos intactos');
const dashA2=api.getDashboardData();
assert(dashA2.completedExercises===2&&dashA2.totalExercises===10,'A: 2 de 10 tras volver');
assert(JSON.stringify(dashA2.records.map(r=>[r.conceptId,r.attempts,r.state]))===snapA,'A: evidencia idéntica');
assert(!dashA2.records.some(r=>r.conceptId==='b_concept'),'A: sin evidencia de B');
assert(api.courseHasAssessment(),'A conserva su evaluación');
pass('volver a A conserva progreso y evidencia');

// Reinicio de un curso no toca el otro
api.setActiveCourse(B); api.resetLearningProgress();
assert(api.getLearningState('b1-e1').attempts===0,'B reiniciado'); assert(stateOf(A).exercises['l1-e1'].attempts===4,'reiniciar B no toca A');
api.setActiveCourse(A); assert(api.getLearningState('l1-e1').attempts===4,'A intacto tras reiniciar B');
pass('reinicio aislado');

// Recarga con B como curso activo restaura B; curso inexistente o en borrador no se activa
assert(!api.setActiveCourse('no-existe').ok,'curso inexistente'); assert(api.getActiveCourseId()===A,'sigue en A');
assert(api.COURSE_REGISTRY.register({...courseB,id:'curso-borrador',status:'draft',lessons:[{id:'bd1',title:'Borrador',exercises:[]}],modules:[],exercises:{},concepts:{}}).ok&&!api.setActiveCourse('curso-borrador').ok,'borrador no activable');
assert(api.setActiveCourse(A).changed===false,'mismo curso: sin cambio');
// Evaluación sin criterios nunca aprueba
api.setActiveCourse(B); assert(api.evaluateFinalAssessment().passed===false,'evaluación vacía no aprueba');
assert(!api.COURSE_REGISTRY.register({...courseB,id:'copia-b'}).ok,'ids de lección/ejercicio repetidos entre cursos se rechazan');
pass('curso activo: validaciones');
