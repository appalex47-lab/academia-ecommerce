// Fase 15: capa de datos del backoffice (borradores, validación, duplicar, exportar/importar, respaldo, operaciones).
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const demoSrc=fs.readFileSync(path.join(root,'content','courses','curso-demo.js'),'utf8');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'backoffice.js'),'utf8')+'\n;globalThis.__test={...globalThis.__fase11,...globalThis.__fase5,...globalThis.__platform,...globalThis.__videos,bo:globalThis.__backoffice};';
const IDS=['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','assessment-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','final-assessment-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'];
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
function boot(store,withDemo=true){
  const elements=new Map(IDS.map(id=>[id,el(id)]));
  const context={console:{...console,warn(){}},Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,RegExp,parseFloat,isNaN,Blob:class Blob{constructor(p){this.parts=p}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
  vm.createContext(context); if(withDemo) vm.runInContext(demoSrc,context,{filename:'curso-demo.js'});
  vm.runInContext(script,context,{filename:'script.js+backoffice.js'}); return context.__test;
}
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
const KEY='plataforma.aprendizaje.v1', A='analista-ecommerce', D='curso-demo';
let store=new Map(), api=boot(store), bo=api.bo, reg=api.COURSE_REGISTRY;

// --- Curso nuevo
assert(bo.slugify('Curso de SQL para Analistas ¡Ñandú!')==='curso-de-sql-para-analistas-nandu','slugify');
let r=bo.createCourse('sql','SQL para analistas'); assert(r.ok,'crear'); assert(reg.has('sql')&&reg.get('sql').status==='draft','registrado como borrador');
assert(bo.validateDraft(reg.get('sql')).errors.length===0,'el curso en blanco es válido');
assert(!bo.createCourse('sql','Otra vez').ok&&bo.createCourse('sql','x').reason==='exists','id duplicado');
assert(bo.createCourse(A,'x').reason==='id'&&bo.createCourse('Mal Id','x').reason==='id'&&bo.createCourse('ok','  ').reason==='title','id inválido, builtin y título vacío');
assert(JSON.parse(store.get(KEY)).content.courseDrafts.sql.definition.id==='sql','guardado en content.courseDrafts');
assert(!JSON.stringify(JSON.parse(store.get(KEY)).courses).includes('sql-l1'),'los borradores no entran al progreso');
pass('crear curso en blanco: válido, registrado y separado del progreso');

// --- Operaciones
let def=bo.getWorkingDefinition('sql'); const o=bo.ops;
const m2=o.addModule(def,'Módulo 2'); const l2=o.addLesson(def,m2,'Lección 2'); const l1=def.lessons[0].id;
assert(def.modules.length===2&&def.lessons.length===2&&def.lessonContent[l2],'módulo y lección');
const c1=o.addConcept(def,'Cláusula SELECT','Qué columnas traer','consultas'); assert(c1==='clausula_select'&&o.addConcept(def,'Cláusula SELECT')==='clausula_select_2','ids de concepto únicos');
const e1=o.addBlock(def,l1,'exercise'); const e2=o.addBlock(def,l1,'exercise'); assert(e1==='sql-e1'&&e2==='sql-e2','ids de ejercicio');
def.exerciseContent[e1].prompt='¿Cuántas filas devuelve?'; def.exerciseContent[e1].fields[0]={id:'r1',label:'Filas',answer:3,tolerance:0}; def.exercises[e1].concepts=[c1]; def.exercises[e1].hints=['Cuenta las filas'];
assert(o.setExerciseKind(def,e2,'choice')&&def.exerciseContent[e2].kind==='choice'&&def.exerciseContent[e2].options.length===2,'cambiar a opción múltiple');
def.exerciseContent[e2].prompt='¿Cuál columna?'; assert(o.addOption(def,e2)&&o.setCorrectOption(def,e2,'o1')&&def.exerciseContent[e2].options.filter(x=>x.correct).length===1,'opción correcta única');
assert(o.removeOption(def,e2,2),'quitar opción'); assert(def.exerciseContent[e2].options.length===2&&def.exerciseContent[e2].options.filter(x=>x.correct).length===1,'sigue habiendo una correcta'); assert(!o.removeOption(def,e2,1),'mínimo 2 opciones');
assert(!o.removeConcept(def,c1),'no se borra un concepto en uso'); assert(o.addBlock(def,l1,'list')!==null&&o.addBlock(def,l1,'example')!==null&&o.addBlock(def,l1,'heading')!==null,'bloques de texto');
let s=bo.saveDraft(def); assert(s.ok&&s.validation.errors.length===0,'guarda y valida: '+JSON.stringify(s.validation.errors));
assert(reg.get('sql').lessons.find(l=>l.id===l1).exercises.join()==='sql-e1,sql-e2','lesson.exercises sigue el orden de los bloques');
// mover bloques cambia el orden de ejercicios
def=bo.getWorkingDefinition('sql'); const blocks=def.lessonContent[l1].blocks; const i1=blocks.findIndex(b=>b.exerciseId==='sql-e1'); o.move(blocks,i1,1); bo.saveDraft(def);
assert(reg.get('sql').lessons.find(l=>l.id===l1).exercises.join()==='sql-e2,sql-e1','mover bloques reordena lesson.exercises');
// eliminar
def=bo.getWorkingDefinition('sql'); assert(o.removeBlock(def,l1,def.lessonContent[l1].blocks.findIndex(b=>b.exerciseId==='sql-e2')),'quitar bloque de ejercicio'); assert(!def.exercises['sql-e2']&&!def.exerciseContent['sql-e2'],'se borra el ejercicio con su bloque');
assert(o.removeLesson(def,l2)&&!def.lessonContent[l2]&&def.modules.find(m=>m.id===m2).lessonIds.length===0,'quitar lección'); assert(o.removeModule(def,m2),'quitar módulo vacío'); assert(!o.removeModule(def,def.modules[0].id),'no se quita un módulo con lecciones'); assert(!o.removeLesson(def,def.lessons[0].id),'no se quita la única lección');
assert(o.moveLessonToModule(def,l1,def.modules[0].id),'mover lección'); assert(bo.saveDraft(def).ok,'guarda');
pass('operaciones: módulos, lecciones, conceptos, bloques y ejercicios');

// --- Validación (errores bloqueantes y avisos)
const base=bo.getWorkingDefinition('sql');
const bad=(mut,text)=>{const c=JSON.parse(JSON.stringify(base));mut(c);const v=bo.validateDraft(c);assert(v.errors.some(x=>x.includes(text)),'esperaba error "'+text+'": '+JSON.stringify(v.errors));};
bad(c=>{c.title=''},'título faltante'); bad(c=>{c.exercises['sql-e1'].type='otro'},'tipo pedagógico inválido'); bad(c=>{c.exercises['sql-e1'].cognitiveLevel='x'},'nivel cognitivo inválido');
bad(c=>{c.exercises['sql-e1'].difficulty=9},'dificultad inválida'); bad(c=>{c.exercises['sql-e1'].concepts=['fantasma']},'concepto inexistente'); bad(c=>{c.exerciseContent['sql-e1'].prompt=''},'sin enunciado');
bad(c=>{c.lessons.push({id:'sql-l9',title:'x',exercises:[]})},'sin contenido'); bad(c=>{c.lessonContent=undefined;delete c.lessonContent},'no es declarativo'); bad(c=>{c.id=A},'integrado');
bad(c=>{c.lessons[0].id=api.getEngineContext().lessons[0].id; c.modules=[]; c.lessonContent={[c.lessons[0].id]:c.lessonContent['sql-l1']}},'ya usado en '+A);
let w=bo.validateDraft(base).warnings.join('|'); assert(w.includes('no se practica'),'aviso: concepto sin práctica');
assert(bo.validateDraft({id:'x',modules:[null],lessons:[]}).errors.length>0,'estructura rota no revienta');
pass('validación: errores bloqueantes y avisos');

// --- Recarga: los borradores se aplican al arrancar; el publicado se reemplaza y se restaura
bo.saveDraft(Object.assign(bo.getWorkingDefinition('sql'),{status:'active'}));
api=boot(store); bo=api.bo; reg=api.COURSE_REGISTRY; assert(reg.has('sql')&&reg.get('sql').status==='active','recarga: el borrador vuelve a registrarse');
let demo=bo.getWorkingDefinition(D); demo.title='Demo editado'; demo.exerciseContent['demo-e1'].prompt='Enunciado nuevo'; assert(bo.saveDraft(demo).ok,'editar curso publicado');
assert(reg.get(D).title==='Demo editado','la edición reemplaza al publicado en el registro'); assert(bo.listCourseRecords().find(c=>c.id===D).origin==='modified','origen: modificado');
api=boot(store); bo=api.bo; reg=api.COURSE_REGISTRY; assert(reg.get(D).title==='Demo editado','tras recargar sigue el borrador');
assert(bo.deleteDraft(D).restoredPublished&&reg.get(D).title==='Curso Demo (prueba del motor)','descartar borrador restaura el publicado');
assert(api.setActiveCourse('sql').ok&&bo.deleteDraft('sql').ok&&!reg.has('sql')&&api.getActiveCourseId()===A,'borrar un curso nuevo activo vuelve al Analista');
let bad2=boot(new Map([[KEY,JSON.stringify({schemaVersion:3,activeCourseId:A,courses:{},migrations:[],content:{courseDrafts:{broken:{definition:{id:'broken',title:'x',version:'1',status:'active',lessons:[]},updatedAt:'2026-01-01T00:00:00.000Z'},__proto__x:{},'analista-ecommerce':{definition:{id:'analista-ecommerce'}}}}})]]));
assert(!bad2.COURSE_REGISTRY.has('broken')&&bad2.COURSE_REGISTRY.list().length===2,'borrador inválido o del curso integrado se omite sin romper el arranque');
pass('borradores al arrancar: reemplazo, restauración y tolerancia a datos inválidos');

// --- Duplicar
store=new Map(); api=boot(store); bo=api.bo; reg=api.COURSE_REGISTRY;
r=bo.duplicateCourse(D,'demo-copia','Demo copia'); assert(r.ok,'duplicar: '+JSON.stringify(r)); const cp=reg.get('demo-copia');
assert(cp.status==='draft'&&cp.lessons[0].id==='demo-copia-l1'&&Object.keys(cp.exercises).join()==='demo-copia-e1,demo-copia-e2','ids remapeados');
assert(cp.lessonContent['demo-copia-l1'].blocks.filter(b=>b.type==='exercise').map(b=>b.exerciseId).join()==='demo-copia-e1,demo-copia-e2','bloques apuntan a los ids nuevos');
assert(JSON.stringify(reg.get(D))===JSON.stringify(boot(new Map()).COURSE_REGISTRY.get(D)),'el original no cambió'); assert(bo.validateDraft(cp).errors.length===0,'la copia es válida');
assert(api.setActiveCourse('demo-copia').ok===false,'la copia es borrador: no se abre como alumno hasta activarla');
assert(!bo.duplicateCourse(D,D,'x').ok&&!bo.duplicateCourse(A,'x-y','x').ok&&bo.duplicateCourse('nada','x-y','x').reason==='source','duplicar: id repetido, builtin y origen inexistente');
pass('duplicar curso con ids remapeados y sin pisar al original');

// --- Exportar / importar
const exp=bo.buildCourseScript(cp); const ctx={globalThis:{}}; vm.runInNewContext(exp,ctx); assert(ctx.globalThis.COURSE_DEFINITIONS[0].id==='demo-copia','el .js exportado es ejecutable y define el curso');
let pj=bo.parseCourseImport(exp,'demo-copia.js'); assert(pj.ok&&pj.courses[0].id==='demo-copia'&&JSON.stringify(pj.courses[0])===JSON.stringify(cp),'importar .js reproduce el curso exacto');
assert(bo.parseCourseImport(JSON.stringify(cp)).courses[0].id==='demo-copia'&&bo.parseCourseImport(JSON.stringify([cp,cp])).courses.length===2,'importar .json objeto o lista');
['','   ','no es nada','{"x":1}','[]','[1]','{"id":5}','{bad','globalThis.COURSE_DEFINITIONS = 1;'].forEach(t=>assert(!bo.parseCourseImport(t).ok,'rechaza: '+JSON.stringify(t)));
const evil=`globalThis.COURSE_DEFINITIONS = (globalThis.COURSE_DEFINITIONS || []).concat([]);require('child_process')`; assert(!bo.parseCourseImport(evil).ok,'no ejecuta ni acepta código arbitrario');
let ni=boot(new Map()); let imp=ni.bo.importCourses(pj.courses); assert(imp.imported.join()==='demo-copia'&&ni.COURSE_REGISTRY.has('demo-copia'),'importar crea el curso en otro navegador');
assert(ni.bo.importCourses([{id:A,lessonContent:{}},{id:'sin-contenido'},{id:'Mal Id',lessonContent:{}}]).imported.length===0,'no importa el curso integrado, no declarativos ni ids inválidos');
pass('exportar/importar: ida y vuelta exacta y sin ejecutar código');

// --- Pendientes de exportar
store=new Map(); api=boot(store); bo=api.bo; bo.createCourse('p1','P1'); assert(bo.pendingExports().join()==='p1','nuevo = pendiente');
bo.markExported('p1'); assert(bo.pendingExports().length===0,'exportado = no pendiente'); let d1=bo.getWorkingDefinition('p1'); d1.title='P1 v2'; bo.saveDraft(d1); assert(bo.pendingExports().join()==='p1','editar tras exportar = pendiente de nuevo');
pass('cambios sin exportar');

// --- Respaldo (cursos + videos locales)
api.saveVideoConfig('p1','p1-l1',{title:'V',url:'https://youtu.be/dQw4w9WgXcQ',enabled:true}); const bk=bo.buildBackup(); assert(bk.kind==='plataforma-backoffice'&&bk.courses.p1&&bk.videos.p1['p1-l1'].enabled===true,'respaldo incluye cursos y videos');
let fresh=boot(new Map()); const res=fresh.bo.restoreBackup(JSON.parse(JSON.stringify(bk))); assert(res.ok&&res.imported.join()==='p1'&&res.videoCount===1&&fresh.resolveLessonVideo('p1','p1-l1').active,'restaurar respaldo');
assert(!fresh.bo.restoreBackup({kind:'otro'}).ok&&!fresh.bo.restoreBackup(null).ok,'respaldo ajeno rechazado');
const evilBk={kind:'plataforma-backoffice',version:1,courses:{},videos:{p1:{'__proto__':{title:'x',url:'https://youtu.be/dQw4w9WgXcQ',enabled:true},'ok-1':{title:'y',url:'javascript:alert(1)',enabled:true}}}};
const r3=fresh.bo.restoreBackup(evilBk); assert(r3.ok&&({}).title===undefined&&fresh.resolveLessonVideo('p1','ok-1').validation.status==='invalid'&&!fresh.resolveLessonVideo('p1','ok-1').active,'respaldo malicioso: sin contaminación de prototipo y sin URL peligrosa activa');
pass('respaldo y restauración, incluidos videos y entradas maliciosas');

// --- El Analista no se toca y el progreso sigue aislado
assert(reg.get(A)&&!bo.listCourseRecords().find(c=>c.id===A).editable&&bo.listCourseRecords().find(c=>c.id===A).origin==='builtin','Analista integrado y no editable');
api.recordAttempt('l1-e1',true,{}); api.saveLearningState({force:true}); const before=JSON.stringify(JSON.parse(store.get(KEY)).courses[A]);
bo.createCourse('otro-curso','Otro'); assert(JSON.stringify(JSON.parse(store.get(KEY)).courses[A])===before,'editar contenido no altera el progreso del Analista');
pass('el backoffice no altera el curso Analista ni su progreso');

// --- La secuencia del alumno sigue el orden de módulos y lecciones del editor
store=new Map(); api=boot(store); bo=api.bo; reg=api.COURSE_REGISTRY; bo.createCourse('orden','Orden');
let od=bo.getWorkingDefinition('orden'); const m1=od.modules[0].id; const lb=bo.ops.addLesson(od,m1,'B'); const m2b=bo.ops.addModule(od,'Módulo 2'); const lc=bo.ops.addLesson(od,m2b,'C');
bo.saveDraft(od); assert(reg.get('orden').lessons.map(l=>l.id).join()==='orden-l1,orden-l2,orden-l3','orden inicial');
od=bo.getWorkingDefinition('orden'); bo.ops.move(od.modules[0].lessonIds,1,-1); bo.saveDraft(od); assert(reg.get('orden').lessons.map(l=>l.id).join()==='orden-l2,orden-l1,orden-l3','subir una lección cambia la secuencia');
od=bo.getWorkingDefinition('orden'); bo.ops.move(od.modules,1,-1); bo.saveDraft(od); assert(reg.get('orden').lessons.map(l=>l.id).join()==='orden-l3,orden-l2,orden-l1','subir un módulo mueve sus lecciones');
od=bo.getWorkingDefinition('orden'); bo.ops.moveLessonToModule(od,'orden-l1',od.modules[0].id); bo.saveDraft(od); assert(reg.get('orden').lessons.map(l=>l.id).join()==='orden-l3,orden-l1,orden-l2'&&bo.validateDraft(reg.get('orden')).errors.length===0,'mover entre módulos: la secuencia sigue a los módulos');
pass('el orden del editor define la secuencia del alumno');
