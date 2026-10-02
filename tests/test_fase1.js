const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync(require('path').join(__dirname, '..', 'script.js'), 'utf8');

const elements = {};
function el(id) {
  if (!elements[id]) elements[id] = {
    id, value: '', innerText: '', innerHTML: '', disabled: false,
    style: {}, classList: { add(){}, remove(){} }, offsetHeight: 0,
    parentNode: { insertBefore(){}, appendChild(){} },
    appendChild(){}, setAttribute(){}, addEventListener(){}, dataset: {}, textContent: ''
  };
  return elements[id];
}
const lessonsEls = Array.from({length: 10}, (_, i) => el(['l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'][i]));
lessonsEls.forEach(x => x.classList = {add(){}, remove(){}});
const main = el('main-content');
main.clientHeight = 1000; main.scrollTop = 0; main.addEventListener = ()=>{};
el('reading-progress-bar'); el('lesson-title'); el('prev-btn'); el('next-btn'); el('lessons-stat'); el('exercises-stat');

const document = {
  getElementById: id => el(id),
  querySelectorAll: selector => {
    if (selector === '.lesson') return lessonsEls;
    if (selector === '#l8 textarea') return [el('l8-answer')];
    return [];
  },
  querySelector: selector => null,
  createElement: tag => el('created-' + tag)
};
const context = {
  console,
  document,
  confirm: () => true,
  setTimeout: fn => fn(),
  clearTimeout,
  localStorage: {
    _data: {},
    getItem(k){ return Object.prototype.hasOwnProperty.call(this._data,k) ? this._data[k] : null; },
    setItem(k,v){ this._data[k] = String(v); },
    removeItem(k){ delete this._data[k]; }
  },
  window: { addEventListener(){} }
};
vm.createContext(context);
vm.runInContext(code + '\n;globalThis.__F1 = { lessons, getExercise, pedagogicalModelValidation, exerciseStatus, navigate, checkL1, checkL5, checkL6, checkL7, checkL8, currentIndex, revealExerciseSolution, selfAssessQualitative, getLearningState, loadLearningState };', context);

const checks = [];
checks.push(['modelo pedagógico', context.__F1.pedagogicalModelValidation.ok]);
checks.push(['10 ejercicios', context.__F1.lessons.flatMap(x=>x.exercises).length === 10]);
checks.push(['10 nodos lesson incluido introducción y cierre', context.__F1.lessons.length === 10]);
checks.push(['l1-e1 normalizado', context.__F1.getExercise('l1-e1').concepts.includes('conversion_rate') === false && context.__F1.getExercise('l1-e1').difficulty === 1]);
checks.push(['l3-e1 interpretativo', context.__F1.getExercise('l3-e1').cognitiveLevel === 'interpret']);
checks.push(['l8-e1 caso avanzado', context.__F1.getExercise('l8-e1').type === 'case' && context.__F1.getExercise('l8-e1').difficulty === 3]);
checks.push(['legacy string compatible', context.__F1.getExercise('legacy').id === 'legacy' && context.__F1.getExercise('legacy').concepts.length === 0 && context.__F1.getExercise('legacy').difficulty === null]);

// Validación de un ejercicio numérico existente con la misma tolerancia.
el('l1-meta').value = '9000000'; el('l1-eco').value='4500000'; el('l1-app').value='2700000'; el('l1-wa').value='900000'; el('l1-cc').value='900000';
context.__F1.checkL1();

checks.push(['validación L1', context.__F1.exerciseStatus['l1-e1'] === true]);
// Simulación de recarga: alterar memoria y rehidratar desde localStorage.
context.__F1.getLearningState('l1-e1').completed = false;
context.__F1.getLearningState('l1-e1').solvedCorrectly = false;
context.__F1.exerciseStatus['l1-e1'] = false;
context.__F1.loadLearningState();
checks.push(['rehidratación desde persistencia', context.__F1.exerciseStatus['l1-e1'] === true && context.__F1.getLearningState('l1-e1').completed === true]);

// L1 reto
el('l1-reto-enero').value='8400000'; el('l1-reto-nov').value='14400000';
context.checkL1Reto();
checks.push(['validación L1 reto', context.__F1.exerciseStatus['l1-e2'] === true]);

// L2 práctica
el('l2-p-cump').value='40'; el('l2-p-tiempo').value='50'; el('l2-p-pacing').value='-10'; el('l2-p-run').value='266666.67'; el('l2-p-fore').value='8000000'; el('l2-p-target').value='400000';
context.checkL2Practica();
checks.push(['validación L2 práctica', context.__F1.exerciseStatus['l2-e1'] === true]);

// L2 reto
el('l2-r-cump').value='54.7'; el('l2-r-target').value='680000';
context.checkL2Reto();
checks.push(['validación L2 reto', context.__F1.exerciseStatus['l2-e2'] === true]);

// L3 reto
el('l3-va').value='9000000'; el('l3-vb').value='8379000'; el('l3-rpsa').value='45'; el('l3-rpsb').value='39.9';
context.checkL3Reto();
checks.push(['validación L3', context.__F1.exerciseStatus['l3-e1'] === true]);

// L4 reto conserva la validación numérica existente
el('l4-em-rps').value='200';
context.checkL4();
checks.push(['validación L4', context.__F1.exerciseStatus['l4-e1'] === true]);


// Cualitativos: registrar respuesta no evalúa lenguaje natural; revisar solución + autoevaluar permite completar.
['l5-e1','l6-e1','l7-e1'].forEach((id, i) => {
  el('answer-'+id).value = 'respuesta cualitativa de prueba';
});
// querySelector especial para los tres ejercicios cualitativos.
context.document.querySelector = selector => {
  const map = {'#l5 textarea':'answer-l5-e1','#l6 textarea':'answer-l6-e1','#l7 textarea':'answer-l7-e1'};
  return map[selector] ? el(map[selector]) : null;
};
context.__F1.checkL5(); context.__F1.checkL6(); context.__F1.checkL7();
['l5-e1','l6-e1','l7-e1'].forEach(id => { context.__F1.revealExerciseSolution(id); context.__F1.selfAssessQualitative(id); });
el('l8-answer').value = 'respuesta integradora de prueba';
context.__F1.checkL8(); context.__F1.revealExerciseSolution('l8-e1'); context.__F1.selfAssessQualitative('l8-e1');
checks.push(['ejercicios cualitativos iterativos', context.__F1.exerciseStatus['l5-e1'] && context.__F1.exerciseStatus['l6-e1'] && context.__F1.exerciseStatus['l7-e1'] && context.__F1.exerciseStatus['l8-e1']]);

const before = context.__F1.currentIndex;
context.__F1.navigate(1);
checks.push(['navegación', context.__F1.lessons[1].id === 'l1']);

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
if (checks.some(([,ok]) => !ok)) process.exit(1);
