const fs=require('fs'),vm=require('vm'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','script.js'),'utf8')+'\n;globalThis.__test=globalThis.__fase9;';
const elements=new Map(), store=new Map();
function el(id){return {id,classList:{add(){},remove(){},toggle(){return false},contains(){return true}},style:{},clientHeight:800,offsetHeight:800,innerText:'',disabled:false,dataset:{},setAttribute(){},addEventListener(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
const context={console,Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},
 document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},
 window:{addEventListener(){},__conceptEvidenceCache:{}},confirm:()=>true,setTimeout:()=>0,clearTimeout:()=>{}};
['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','lessons-stat','exercises-stat','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre','case-lab','review-panel','dashboard-panel'].forEach(id=>elements.set(id,el(id)));
vm.createContext(context);vm.runInContext(code,context,{filename:'script.js'});const api=context.__test;const f5=context.__fase5;const f7=context.__fase7;const f8=context.__fase8;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
let d=api.getDashboardData(); assert(d.totalLessons===8&&d.totalExercises===10,'totales correctos'); assert(d.completedLessons===0&&d.completedExercises===0,'alumno nuevo'); pass('alumno nuevo y estados vacíos');
const st=f5.getLearningState('l1-e1'); st.attempts=2; st.firstAttemptCorrect=false; st.hintsUsed=1; st.errorHistory=[{type:'percentage_scale'},{type:'percentage_scale'}]; st.analyticalStagesPracticed=['observe','quantify']; st.lastActivityAt=new Date().toISOString();
context.__fase5.syncConceptEvidence(); d=api.getDashboardData(); assert(d.practicedConcepts.length>0,'conceptos practicados'); assert(d.difficultConcepts.length>0,'conceptos difíciles'); assert(d.errorCounts.percentage_scale>=2,'errores'); assert(d.stages.calculate===true,'nivel/etapa calcular'); pass('conceptos, niveles y dificultad');
const cs=f7.getCaseState('case-guided-sales-drop'); cs.attempts=1; cs.completed=true; cs.componentResults={change:true,quantify:true,driver:true,hypothesis:true,recommendation:true,measurement:true}; cs.evidenceStages=['observe','quantify','diagnose','hypothesize','recommend','measure']; context.__fase5.syncConceptEvidence(); d=api.getDashboardData(); assert(d.casesCompleted===1&&d.casesPending===2,'casos'); pass('casos');
assert(api.dashboardNextStep(d).action==='review','siguiente paso prioriza repaso'); pass('siguiente paso');
f8.startReview('exercise:l1-e1'); assert(f8.getReviewState().activeItemId==='exercise:l1-e1','compatibilidad repaso'); pass('integración fase 8');
assert(api.DASHBOARD_STAGE_ORDER.length===6,'progresión dashboard'); pass('reglas de dashboard');
console.log('FASE9 OK');
