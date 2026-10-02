const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test=globalThis.__fase12;';
const elements=new Map(), store=new Map();
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','assessment-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','final-assessment-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'].forEach(id=>elements.set(id,el(id)));
const context={console,Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(parts){this.parts=parts}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
vm.createContext(context);vm.runInContext(code,context,{filename:'script.js'});const api=context.__test;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
let e=api.evaluateFinalAssessment(); assert(e.total===7 && e.metCount===0 && !e.passed,'evaluación nueva'); pass('estructura y estado inicial');
// Post-Fase 13: registrar resultado sin NINGUNA evidencia se rechaza (antes creaba un intento vacío).
api.startFinalAssessment(); let rejected=api.completeFinalAssessment(); assert(rejected&&rejected.ok===false&&rejected.reason==='no-evidence','sin evidencia se rechaza'); assert(api.getFinalAssessmentState().attempts.length===0,'no se crea intento vacío'); pass('intento sin evidencia rechazado');
// Con evidencia parcial sí se registra un intento que requiere refuerzo (intención original del test).
{const s=api.getLearningState('l1-e1');s.completed=true;s.solvedCorrectly=true;} api.completeFinalAssessment(); assert(api.getFinalAssessmentState().attempts.length===1,'intento fallido'); assert(api.getFinalAssessmentState().passed===false,'resultado requiere refuerzo'); pass('intento incompleto conserva resultado');
['l1-e1','l2-e1','l3-e1'].forEach(id=>{const s=api.getLearningState(id);s.completed=true;s.solvedCorrectly=true;});
const l5=api.getLearningState('l5-e1'); l5.qualitativeCriteria={change:true,evidence:true,driver:true,segment:true,fact_hypothesis:true,hypothesis:true,measurement:true};
const l8=api.getLearningState('l8-e1'); l8.qualitativeCriteria={recommendation:true,measurement:true};
const c=api.getCaseState('case-open-analysis-plan'); c.completed=true;
e=api.evaluateFinalAssessment(); assert(e.passed && e.metCount===7,'criterios completos'); pass('rúbrica integral');
api.startFinalAssessment(); api.completeFinalAssessment(); const finalState=api.getFinalAssessmentState(); assert(finalState.attempts.length===2&&finalState.passed===true&&finalState.lastResult.failedCriteria.length===0,'reintento'); pass('reintento conserva historial');
const persisted=api.buildPersistableState(); assert(persisted.finalAssessmentState && persisted.finalAssessmentState.attempts.length===2,'persistencia evaluación'); pass('persistencia');
const sanitized=api.sanitizeFinalAssessmentState({attempts:[{passed:true}],needsReviewCriteria:['bad','diagnose'],passed:true}); assert(sanitized.attempts.length===1&&sanitized.needsReviewCriteria.length===1,'sanitización'); pass('sanitización');
assert(api.FINAL_ASSESSMENT.criteria.some(c=>c.source.kind==='case'&&c.source.id==='case-open-analysis-plan'),'reutiliza caso existente'); pass('sin segundo motor');
console.log('FASE12 OK');
