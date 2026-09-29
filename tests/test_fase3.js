const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let source = fs.readFileSync(scriptPath, 'utf8');
source += `\n;globalThis.__fase3 = { classifyQuantitativeError, buildPedagogicalFeedback, recordErrorDiagnosis, getLearningState, createExerciseLearningState, errorProfiles, ERROR_FEEDBACK };\n`;

const storage = new Map();
const context = {
  console,
  Date,
  Math,
  Number,
  JSON,
  Object,
  Array,
  String,
  isNaN,
  localStorage: { getItem:k=>storage.get(k) ?? null, setItem:(k,v)=>storage.set(k,String(v)) },
  window: { addEventListener(){} },
  document: {
    querySelectorAll(){ return []; },
    querySelector(){ return null; },
    getElementById(){ return { classList:{add(){},remove(){}}, style:{}, disabled:false, innerText:'', addEventListener(){}, setAttribute(){}, appendChild(){}, parentNode:{insertBefore(){}} }; },
    createElement(){ return { className:'', type:'', textContent:'', innerHTML:'', dataset:{}, classList:{add(){},remove(){}}, setAttribute(){}, addEventListener(){}, appendChild(){}, parentNode:{insertBefore(){}} }; }
  },
  setTimeout(){},
  confirm(){ return true; }
};
vm.createContext(context);
vm.runInContext(source, context);
const f = context.__fase3;

// 1. Primer intento correcto / estado base de Fase 2 no se rompe.
const state = f.getLearningState('l2-e1');
assert.strictEqual(state.attempts, 0);
assert.strictEqual(state.errorHistory.length, 0);

// 2. Percentage scale.
let d = f.classifyQuantitativeError('l2-e1', {c:0.4,t:50,p:-10,r:266666.67,f:8000000,tr:400000});
assert.strictEqual(d.type, 'percentage_scale');

// 3. Formula candidate.
d = f.classifyQuantitativeError('l2-e2', {c:54.7,tr:1500000});
assert.strictEqual(d.type, 'formula');

// 4. Conceptual candidate.
d = f.classifyQuantitativeError('l3-e1', {va:9000000,vb:8379000,ra:1800,rb:39.9});
assert.strictEqual(d.type, 'conceptual');

// 5. Invalid response.
d = f.classifyQuantitativeError('l4-e1', {e_rps:NaN});
assert.strictEqual(d.type, 'invalid');

// 6. Unknown fallback — no overdiagnosis.
d = f.classifyQuantitativeError('l1-e1', {m:9000001,e:4500001,a:2700001,w:900001,c:900001});
assert.strictEqual(d.type, 'unknown');

// 7. History records diagnostic without changing attempts.
const beforeAttempts = state.attempts;
f.recordErrorDiagnosis('l2-e1', {type:'percentage_scale', confidence:'high'}, 'feedback test');
const after = f.getLearningState('l2-e1');
assert.strictEqual(after.attempts, beforeAttempts);
assert.strictEqual(after.errorHistory.length, 1);
assert.strictEqual(after.errorHistory[0].type, 'percentage_scale');
assert.strictEqual(after.lastErrorType, 'percentage_scale');

// 8. Feedback is contextual and cautious.
const msg = f.buildPedagogicalFeedback('l2-e1', {type:'percentage_scale'});
assert.ok(msg.includes('escala del porcentaje'));
assert.ok(msg.includes('Pacing') || msg.includes('Conversion'));
const unknown = f.buildPedagogicalFeedback('l1-e1', {type:'unknown'});
assert.ok(unknown.includes('No podemos determinar'));

console.log('PASS: clasificación percentage_scale');
console.log('PASS: clasificación formula');
console.log('PASS: clasificación conceptual');
console.log('PASS: clasificación invalid');
console.log('PASS: fallback unknown sin sobrediagnóstico');
console.log('PASS: historial de errores persistible');
console.log('PASS: feedback contextual');
