const fs=require('fs'),vm=require('vm'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','script.js'),'utf8')+'\n;globalThis.__test=globalThis.__fase8;';
const elements=new Map(), store=new Map();
const context={console,Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},
 document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({className:'',dataset:{},style:{},setAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''})},
 window:{addEventListener(){},__conceptEvidenceCache:{}},confirm:()=>true,setTimeout:()=>0,clearTimeout:()=>{}};
for(const id of ['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','lessons-stat','exercises-stat','l1','l2','l3','l4','l5','l6','l7','l8','cierre','case-lab','review-panel']) elements.set(id,{id,classList:{add(){},remove(){},toggle(){return false}},style:{},clientHeight:800,offsetHeight:800,innerText:'',disabled:false,addEventListener(){},appendChild(){},insertBefore(){},prepend(){},querySelector(){return null},querySelectorAll(){return []},scrollTop:0});
vm.createContext(context);vm.runInContext(code,context,{filename:'script.js'});const api=context.__test;const f5=context.__fase5;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
assert(api.classifyReviewPriority({errors:2,recent:true})==='alta','errores repetidos/próximos => alta');
assert(api.classifyReviewPriority({errors:0,hints:1,incomplete:true})==='media','pistas/práctica incompleta => media');
assert(api.classifyReviewPriority({stale:true})==='baja','antigüedad => baja'); assert(api.classifyReviewPriority({solutionViewed:true})==='media','solución vista => media'); pass('priorización determinística');
const ex='l1-e1', st=f5.getLearningState(ex); st.attempts=3; st.completed=false; st.solvedCorrectly=false; st.hintsUsed=1; st.lastActivityAt=new Date().toISOString(); st.errorHistory=[{type:'formula'},{type:'formula'}];
const plan=api.generateReviewPlan(); const item=plan.find(x=>x.itemId==='exercise:l1-e1'); assert(item && item.priority==='alta' && item.reason==='error repetido','genera repaso por error repetido'); pass('generación de repaso');
api.startReview('exercise:l1-e1'); assert(api.getReviewState().activeItemId==='exercise:l1-e1','inicio registrado');
api.deferReview('exercise:l1-e1'); assert(!api.getReviewState().activeItemId,'posponer limpia activo'); assert(api.getReviewState().deferredUntil['exercise:l1-e1'],'posponer persistido'); pass('posponer');
api.getReviewState().deferredUntil['exercise:l1-e1']=new Date(Date.now()-86400000).toISOString(); api.startReview('exercise:l1-e1'); api.completeReview('exercise:l1-e1'); assert(f5.getLearningState(ex).reviewCount===1,'refuerzo registrado en ejercicio'); pass('completar y alimentar evidencia');
const saved=JSON.parse(store.get('cursoAnalista.fase2.progress.v1')); assert(saved.reviewLearningState.history.length>0,'persistencia misma clave'); assert(saved.exercises[ex].reviewCount===1,'persistencia del refuerzo'); pass('persistencia');
assert(!api.generateReviewPlan().some(x=>x.itemId==='exercise:l1-e1'),'no duplica inmediatamente por cooldown'); pass('no duplicación inmediata');
const caseState=context.__fase7.getCaseState('case-guided-sales-drop'); caseState.attempts=2; caseState.completed=false; caseState.errorHistory=[{components:['change']},{components:['change']}]; caseState.lastActivityAt=new Date().toISOString(); const casePlan=api.generateReviewPlan(); assert(casePlan.some(x=>x.itemId==='case:case-guided-sales-drop'),'caso difícil genera repaso'); pass('repaso de caso');
const sr=api.sanitizeReviewState({history:[1,2],deferredUntil:{x:'y'},activeItemId:'x'}); assert(sr.history.length===2&&sr.activeItemId==='x','sanitización'); pass('sanitización y compatibilidad');
