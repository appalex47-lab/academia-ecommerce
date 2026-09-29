const fs = require('fs');
const vm = require('vm');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8') + `\n;globalThis.__test = globalThis.__fase7;`;
const elements = new Map(); const localStore = new Map();
const context = {
  console, Date, Math, JSON, Set, Map, Object, Array, Number, String, Boolean, parseFloat, isNaN,
  localStorage:{getItem:k=>localStore.has(k)?localStore.get(k):null,setItem:(k,v)=>localStore.set(k,v)},
  document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({className:'',dataset:{},children:[],style:{},setAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},innerHTML:'',textContent:''})},
  window:{addEventListener(){},__conceptEvidenceCache:{}}, confirm:()=>true, setTimeout:()=>0, clearTimeout:()=>{}
};
for(const id of ['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','lessons-stat','exercises-stat','l1','l2','l3','l4','l5','l6','l7','l8','cierre','case-lab']) elements.set(id,{id,classList:{add(){},remove(){},toggle(){return false;}},style:{},clientHeight:800,offsetHeight:800,innerText:'',disabled:false,addEventListener(){},appendChild(){},insertBefore(){},prepend(){},querySelector(){return null;},querySelectorAll(){return [];},scrollTop:0});
vm.createContext(context); vm.runInContext(code,context,{filename:'script.js'}); const api=context.__test;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
assert(api.ANALYTICAL_CASES.length===3,'3 casos'); pass('casos progresivos');
assert(api.ANALYTICAL_CASES[0].mode==='guided' && api.ANALYTICAL_CASES[1].mode==='partial' && api.ANALYTICAL_CASES[2].mode==='open','niveles'); pass('guiado → parcialmente guiado → abierto');
assert(api.evaluateCaseComponent(api.ANALYTICAL_CASES[0].components[0],'0')===true,'select correcto');
assert(api.evaluateCaseComponent(api.ANALYTICAL_CASES[0].components[3],'CR mobile checkout')===true,'texto por criterio explícito');
assert(api.evaluateCaseComponent(api.ANALYTICAL_CASES[2].components[2],['0','2'])===true,'multi selección'); pass('evaluación determinística');
const c=api.ANALYTICAL_CASES[0];
const partial={}; c.components.forEach((x,i)=>partial[x.id]=i===0); let s=api.recordCaseAttempt(c.id,partial); assert(s.attempts===1 && s.completed===false,'primer intento parcial');
const all={}; c.components.forEach(x=>all[x.id]=true); s=api.recordCaseAttempt(c.id,all); assert(s.errorHistory.length===1,'error de componentes conservado');
assert(s.attempts===2 && s.completed===true,'segundo intento completa'); assert(s.componentResults.change===true,'evidencia acumulada'); pass('intentos y evidencia acumulada');
const conceptRecord = context.__fase5.getConceptEvidence('sales','observe');
assert(conceptRecord && conceptRecord.caseIds && conceptRecord.caseIds.includes(c.id), 'caso alimenta evidencia de concepto');
pass('integración caso → evidencia Fase 5');
s=api.getCaseState(c.id); assert(s.attemptResults.length===2,'historial de intentos');
const hintCase=api.ANALYTICAL_CASES[1]; api.revealCaseHint(hintCase.id); const hs=api.getCaseState(hintCase.id); assert(hs.hintsUsed===1 && hs.revealedHints.includes(0),'pista registrada');
assert(hs.hintsUsed===1,'pista registrada en estado');
const saved=JSON.parse(localStore.get('cursoAnalista.fase2.progress.v1')); assert(saved.caseLearningState[c.id].completed===true,'persistencia misma clave'); pass('persistencia integrada');
const sanitized=api.sanitizeCaseState({attempts:2,componentResults:{change:true},evidenceStages:['observe','fake'],hintsUsed:2,revealedHints:[0,1]}); assert(sanitized.evidenceStages.length===1 && sanitized.evidenceStages[0]==='observe','sanitización'); pass('compatibilidad y sanitización');
assert(typeof context.__fase5.getConceptEvidence==='function','fase5 disponible'); pass('regresión Fase 5');
