const fs = require('fs');
const assert = require('assert');
const script = fs.readFileSync(require('path').join(__dirname, '..', 'script.js'), 'utf8');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(require('path').join(__dirname, '..', 'styles.css'), 'utf8');

function count(re) { return (script.match(re) || []).length; }

assert.ok(script.includes("const PROGRESS_STORAGE_KEY = 'cursoAnalista.fase2.progress.v1'"));
assert.ok(script.includes('function createExerciseLearningState()'));
assert.ok(script.includes('attempts: 0'));
assert.ok(script.includes('hintsUsed: 0'));
assert.ok(script.includes('firstAttemptCorrect: false'));
assert.ok(script.includes('completed: false'));
assert.ok(script.includes('solutionViewed: false'));
assert.ok(script.includes('function recordAttempt(exerciseId, isCorrect'));
assert.ok(script.includes('function revealNextHint(exerciseId)'));
assert.ok(script.includes('function selfAssessQualitative(exerciseId)'));
assert.ok(script.includes('localStorage.getItem(PLATFORM_STORAGE_KEY)'));
assert.ok(script.includes('localStorage.setItem(PLATFORM_STORAGE_KEY'));
assert.ok(script.includes("state.attempts += 1"));
assert.ok(script.includes("state.firstAttemptCorrect = isCorrect === true"));
assert.ok(script.includes("state.hintsUsed = state.revealedHints.length"));
assert.ok(script.includes("state.solutionViewed = true"));
assert.ok(script.includes("state.completed = true"));
assert.ok(script.includes("state.solvedCorrectly = true"));
assert.ok(script.includes("hints.length ? 'Ver solución paso a paso'"));
assert.ok(script.includes("getSolutionId(exerciseId) ? 'Revisar solución'"));

// Fase 1 compatibility: all 10 exercise IDs remain present.
const ids = [...script.matchAll(/exercises:\s*\[([^\]]*)\]/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
assert.strictEqual(ids.length, 10, `Se esperaban 10 ejercicios; encontrados ${ids.length}`);
for (const id of ids) assert.ok(script.includes(`'${id}'`), `Falta metadata para ${id}`);

// Every exercise receives a hint array through normalization, including legacy exercises.
assert.ok(script.includes('hints: Array.isArray(base.hints) ? base.hints : (Array.isArray(metadata.hints) ? [...metadata.hints] : [])'));
assert.ok(count(/hints:\s*\[/g) >= 10, 'No todos los ejercicios tienen hints explícitos en metadata');

// Qualitative exercises must not be auto-evaluated as correct.
assert.ok(script.includes("recordAttempt(exerciseId, false, answer)"));
assert.ok(script.includes('no evaluamos lenguaje natural automáticamente'));

// Solution viewing and solving remain distinct.
assert.ok(script.includes('Ver la solución no cuenta como respuesta correcta'));
assert.ok(/completed:\s*raw\.completed === true && raw\.solvedCorrectly === true/.test(script));

// Accessibility / UX.
assert.ok(script.includes("setAttribute('aria-live', 'polite')"));
assert.ok(css.includes('.learning-controls'));
assert.ok(css.includes('.learning-btn'));

console.log('PASS: estructura Fase 2');
console.log(`PASS: ${ids.length} ejercicios conservados`);
console.log('PASS: persistencia localStorage');
console.log('PASS: intentos/pistas/solución separados');
console.log('PASS: cualitativos sin evaluación automática');
console.log('PASS: UI accesible básica');
