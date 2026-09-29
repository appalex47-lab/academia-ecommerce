const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let source = fs.readFileSync(scriptPath, 'utf8');
source += `\n;globalThis.__fase4 = { COGNITIVE_STAGE_ORDER, COGNITIVE_STAGE_LABELS, LESSON_COGNITIVE_FLOW, toCognitiveStage, getLessonCognitiveStages, getExerciseCognitiveStage, getPracticedCognitiveStages, getCompletedCognitiveStages, getCurrentCognitiveStage, getLearningState, saveLearningState, exerciseLearningState };\n`;

const storage = new Map();
const noopElement = () => ({
  classList:{add(){},remove(){}}, style:{}, dataset:{}, disabled:false, innerText:'',
  addEventListener(){}, setAttribute(){}, appendChild(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; },
  parentNode:{insertBefore(){}}, prepend(){}
});
const context = {
  console, Date, Math, Number, JSON, Object, Array, String, Set, isNaN,
  localStorage:{ getItem:k=>storage.get(k) ?? null, setItem:(k,v)=>storage.set(k,String(v)) },
  window:{ addEventListener(){} },
  document:{
    querySelectorAll(){ return []; }, querySelector(){ return null; },
    getElementById(){ return noopElement(); },
    createElement(){ return noopElement(); }
  },
  setTimeout(){}, confirm(){ return true; }
};
vm.createContext(context);
vm.runInContext(source, context);
const f = context.__fase4;

assert.deepStrictEqual(Array.from(f.COGNITIVE_STAGE_ORDER), ['understand','calculate','interpret','diagnose','hypothesize','recommend','apply']);
assert.strictEqual(f.toCognitiveStage('case'), 'apply');
assert.deepStrictEqual(Array.from(f.getLessonCognitiveStages('l2')),  ['calculate','interpret']);
assert.deepStrictEqual(Array.from(f.getLessonCognitiveStages('l5')),  ['diagnose','hypothesize']);
assert.deepStrictEqual(Array.from(f.getLessonCognitiveStages('l8')),  ['diagnose','hypothesize','recommend','apply']);
assert.strictEqual(f.getExerciseCognitiveStage('l1-e1'), 'calculate');
assert.strictEqual(f.getExerciseCognitiveStage('l8-e1'), 'apply');
assert.strictEqual(f.getCurrentCognitiveStage('l1'), 'calculate');
assert.strictEqual(f.getPracticedCognitiveStages().size, 0);

// Practicado y completado se derivan del estado existente; no son mastery ni scoring.
const l1 = f.getLearningState('l1-e1');
l1.attempts = 1;
assert.ok(f.getPracticedCognitiveStages().has('calculate'));
assert.ok(!f.getCompletedCognitiveStages().has('calculate'));
l1.completed = true;
l1.solvedCorrectly = true;
assert.ok(f.getCompletedCognitiveStages().has('calculate'));

// La estructura de progresión no altera la persistencia existente.
f.saveLearningState();
const saved = JSON.parse(storage.get('cursoAnalista.fase2.progress.v1'));
assert.strictEqual(saved.version, 1);
assert.ok(saved.exercises['l1-e1']);

console.log('PASS: taxonomía cognitiva completa');
console.log('PASS: case se presenta como aplicación sin cambiar metadata Fase 1');
console.log('PASS: flujo L2 calcular → interpretar');
console.log('PASS: flujo L5 diagnóstico → hipótesis');
console.log('PASS: flujo L8 diagnóstico → hipótesis → recomendación → aplicación');
console.log('PASS: practicado y completado se derivan del estado existente');
console.log('PASS: persistencia Fase 2 permanece compatible');
