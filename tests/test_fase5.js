const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const elements = {};
function el(id) {
  if (!elements[id]) elements[id] = {
    id, value:'', innerText:'', innerHTML:'', disabled:false, style:{}, offsetHeight:1000,
    clientHeight:1000, scrollTop:0,
    classList:{add(){},remove(){}}, parentNode:{insertBefore(){},appendChild(){}},
    appendChild(){}, setAttribute(){}, addEventListener(){}, prepend(){}, dataset:{},
    querySelector(){return null;}, querySelectorAll(){return []}
  };
  return elements[id];
}
const lessonEls = ['l1','l2','l3','l4','l5','l6','l7','l8','cierre'].map(el);
const storage = {};
const document = {
  getElementById:id=>el(id),
  querySelectorAll:selector=>selector === '.lesson' ? lessonEls : [],
  querySelector:()=>null,
  createElement:tag=>el('created-'+tag)
};
const context = {
  console, Date, Math, Number, JSON, Object, Array, String, Set, isNaN,
  document, confirm:()=>true, setTimeout:fn=>fn(), clearTimeout,
  localStorage:{ getItem(k){return storage[k] ?? null;}, setItem(k,v){storage[k]=String(v);} },
  window:{addEventListener(){}}
};
vm.createContext(context);
vm.runInContext(script, context);
const f = context.__fase5;

assert.ok(f.concepts.conversion_rate);
assert.ok(f.concepts.conversion_rate.description);
assert.ok(Array.isArray(f.concepts.conversion_rate.relatedConcepts));
assert.strictEqual(f.getConceptDefinition('missing_concept'), null);
assert.deepStrictEqual(Array.from(f.getExerciseConcepts('legacy')), []);
assert.ok(f.getExerciseConcepts('l3-e1').includes('sales'));

const fresh = f.getConceptEvidence('conversion_rate', 'interpret');
assert.strictEqual(fresh.state, 'not_started');

// Caso A: correcto al primer intento.
const a = f.getLearningState('l3-e1');
f.recordAttempt('l3-e1', true, {answer:'correct'});
let ev = f.getConceptEvidence('conversion_rate', 'interpret');
assert.strictEqual(ev.attempts, 1);
assert.strictEqual(ev.correct, true);
assert.strictEqual(ev.firstAttemptCorrect, true);
assert.strictEqual(ev.state, 'demonstrated');

// Caso B: otro ejercicio del mismo concepto con error + pista + corrección.
const b = f.getLearningState('l4-e1');
f.recordAttempt('l4-e1', false, {e_rps:2666.67});
f.recordErrorDiagnosis('l4-e1', {type:'conceptual', confidence:'high'}, 'Confusión entre RPS y otra métrica.');
f.revealNextHint('l4-e1');
f.recordAttempt('l4-e1', true, {e_rps:200});
ev = f.getConceptEvidence('rps', 'interpret');
assert.ok(ev.attempts >= 2);
assert.ok(ev.hintsUsed >= 1);
assert.ok(ev.errorTypes.includes('conceptual'));
assert.strictEqual(ev.firstAttemptCorrect, false);
assert.strictEqual(ev.state, 'needs_review');
assert.strictEqual(b.attemptResults.length, 2);

// Caso C: solución vista sin convertirla en correcto.
const c = f.getLearningState('l5-e1');
f.recordAttempt('l5-e1', false, 'respuesta inicial');
f.markSolutionViewed('l5-e1');
ev = f.getConceptEvidence('diagnosis', 'diagnose');
assert.strictEqual(c.solvedCorrectly, false);
assert.strictEqual(c.solutionViewed, true);
assert.strictEqual(ev.state, 'needs_review');

// Acumulación entre ejercicios/lecciones: conversion_rate tiene evidencia en varios ejercicios.
const allCr = f.getConceptEvidence('conversion_rate');
assert.ok(allCr.length >= 2);
assert.ok(allCr.some(x => x.cognitiveLevel === 'interpret'));

// Estados sin scoring numérico.
for (const record of allCr) assert.ok(['not_started','exposed','practiced','demonstrated','needs_review'].includes(record.state));
assert.ok(!script.includes('mastery = 0.73'));
assert.ok(!script.includes('score = 73'));

// Persistencia en la misma clave y recuperación.
f.saveLearningState();
const saved = JSON.parse(storage['cursoAnalista.fase2.progress.v1']);
assert.strictEqual(saved.version, 1);
assert.ok(saved.conceptEvidence);
assert.ok(saved.exercises['l4-e1'].attemptResults.length >= 2);

const before = JSON.stringify(saved.conceptEvidence);
f.loadLearningState();
const after = JSON.stringify(f.syncConceptEvidence());
assert.strictEqual(after, before);

console.log('PASS: catálogo de conceptos estable y descriptivo');
console.log('PASS: ejercicio con concepto y ejercicio legacy sin concepto');
console.log('PASS: evidencia correcto al primer intento');
console.log('PASS: evidencia error → pista → correcto');
console.log('PASS: solución vista no se convierte en correcto');
console.log('PASS: evidencia acumulada por concepto y nivel');
console.log('PASS: estados not_started/exposed/practiced/demonstrated/needs_review');
console.log('PASS: persistencia y recuperación sin duplicación');
console.log('PASS: sin mastery score ni scoring global');
