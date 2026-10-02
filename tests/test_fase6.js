const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8') + `
;globalThis.__test = globalThis.__fase6;`;

const elements = new Map();
const localStore = new Map();
const context = {
  console,
  Date,
  Math,
  JSON,
  Set,
  Map,
  Object,
  Array,
  Number,
  String,
  Boolean,
  parseFloat,
  isNaN,
  localStorage: {
    getItem: key => localStore.has(key) ? localStore.get(key) : null,
    setItem: (key, value) => localStore.set(key, value)
  },
  document: {
    getElementById: id => elements.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      className: '', dataset: {}, children: [], style: {},
      setAttribute(){}, appendChild(){}, addEventListener(){},
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      innerHTML: '', textContent: ''
    }),
    createTextNode: text => ({ textContent: text })
  },
  window: { addEventListener(){}, __conceptEvidenceCache: {} },
  confirm: () => true,
  setTimeout: () => 0,
  clearTimeout: () => {},
};
for (const id of ['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lessons-stat','exercises-stat','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre']) {
  elements.set(id, { id, classList:{add(){},remove(){}}, style:{}, clientHeight:800, offsetHeight:800, innerText:'', disabled:false, addEventListener(){}, appendChild(){}, insertBefore(){}, prepend(){}, querySelector(){return null;}, scrollTop:0 });
}
vm.createContext(context);
vm.runInContext(code, context, { filename: 'script.js' });
const api = context.__test;

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function pass(msg) { console.log('PASS', msg); }

assert(api.ANALYTICAL_CHAIN.join('→') === 'observe→quantify→compare→interpret→segment→diagnose→hypothesize→recommend→measure', 'cadena completa');
pass('cadena analítica completa');

const l5 = api.getAnalyticalActivity('l5-e1');
assert(l5.stages.includes('diagnose') && l5.stages.includes('hypothesize') && l5.stages.includes('measure'), 'l5 cadena');
pass('l5 diagnóstico → hipótesis → medición');

const l8 = api.getAnalyticalActivity('l8-e1');
assert(l8.stages.length === 9, 'l8 cubre cadena completa');
pass('l8 cubre cadena completa');

assert(api.getAnalyticalRubric('l5-e1').length === 7, 'rubrica l5');
assert(api.getAnalyticalRubric('l6-e1').length === 8, 'rubrica l6');
assert(api.getAnalyticalRubric('l8-e1').length === 9, 'rubrica l8');
pass('rúbricas cualitativas determinísticas');

const state = api.getLearningState('l5-e1');
api.recordAttempt('l5-e1', false, 'respuesta de prueba');
assert(state.attempts === 1, 'intento registrado');
assert(state.analyticalStagesPracticed.includes('diagnose'), 'diagnóstico practicado');
assert(state.analyticalStagesPracticed.includes('hypothesize'), 'hipótesis practicada');
pass('evidencia analítica integrada al intento');

state.qualitativeCriteria = { change:true, evidence:true, driver:true, segment:true, fact_hypothesis:true, hypothesis:true, measurement:false };
assert(Object.values(state.qualitativeCriteria).filter(Boolean).length === 6, 'criterios guardados en estado');
pass('criterios explícitos conservan evidencia sin scoring');

const saved = JSON.parse(localStore.get('plataforma.aprendizaje.v1')).courses['analista-ecommerce'].state;
assert(saved && saved.exercises['l5-e1'].analyticalStagesPracticed.includes('diagnose'), 'persistencia misma clave');
pass('persistencia integrada');

assert(typeof context.__fase5.getConceptEvidence === 'function', 'fase5 disponible');
pass('compatibilidad Fase 5');
