// Estructura de datos del curso y requerimientos por lección
const lessons = [
   { id: 'l1', title: 'Lección 1: Meta Omnicanal', exercises: ['l1-e1', 'l1-e2'] },
   { id: 'l2', title: 'Lección 2: ¿Vamos al ritmo correcto?', exercises: ['l2-e1', 'l2-e2'] },
   { id: 'l3', title: 'Lección 3: Descomponiendo las ventas', exercises: ['l3-e1'] },
   { id: 'l4', title: 'Lección 4: ¿Qué tráfico aporta?', exercises: ['l4-e1'] },
   { id: 'l5', title: 'Lección 5: Causas de caída', exercises: ['l5-e1'] },
   { id: 'l6', title: 'Lección 6: Funnel', exercises: ['l6-e1'] },
   { id: 'l7', title: 'Lección 7: Clientes', exercises: ['l7-e1'] },
   { id: 'l8', title: 'Lección 8: Proyecto Integrador', exercises: ['l8-e1'] },
   { id: 'cierre', title: 'Cierre: Mapa Final', exercises: [] }
];

// ================================================================
// FASE 1 — MODELO PEDAGÓGICO
// Extensión compatible: los IDs y el flujo actual se conservan.
// ================================================================

const COGNITIVE_LEVELS = Object.freeze({
    UNDERSTAND: 'understand',
    CALCULATE: 'calculate',
    INTERPRET: 'interpret',
    DIAGNOSE: 'diagnose',
    HYPOTHESIZE: 'hypothesize',
    RECOMMEND: 'recommend',
    CASE: 'case'
});

const EXERCISE_TYPES = Object.freeze({
    KNOWLEDGE: 'knowledge',
    CALCULATION: 'calculation',
    INTERPRETATION: 'interpretation',
    DIAGNOSIS: 'diagnosis',
    HYPOTHESIS: 'hypothesis',
    RECOMMENDATION: 'recommendation',
    CASE: 'case'
});

// Catálogo inicial construido únicamente con conceptos presentes en el contenido actual.
const concepts = Object.freeze({
    annual_goal: { id: 'annual_goal', name: 'Meta anual', description: 'Objetivo anual de ventas que se distribuye en el tiempo.', category: 'goals', relatedConcepts: ['seasonality', 'channels'] },
    seasonality: { id: 'seasonality', name: 'Estacionalidad', description: 'Distribución histórica de la demanda a lo largo del periodo.', category: 'goals', relatedConcepts: ['annual_goal'] },
    channels: { id: 'channels', name: 'Canales', description: 'Fuentes o canales mediante los que se genera tráfico y ventas.', category: 'acquisition', relatedConcepts: ['traffic', 'acquisition', 'rps'] },
    pacing: { id: 'pacing', name: 'Pacing', description: 'Relación entre avance de ventas y avance del tiempo.', category: 'forecast', relatedConcepts: ['run_rate', 'target', 'forecast'] },
    run_rate: { id: 'run_rate', name: 'Run Rate', description: 'Ritmo de ventas observado por unidad de tiempo.', category: 'forecast', relatedConcepts: ['pacing', 'forecast'] },
    forecast: { id: 'forecast', name: 'Forecast', description: 'Proyección de cierre basada en el ritmo observado y los datos disponibles.', category: 'forecast', relatedConcepts: ['run_rate', 'target'] },
    target: { id: 'target', name: 'Target diario', description: 'Ritmo diario necesario para alcanzar una meta restante.', category: 'forecast', relatedConcepts: ['pacing', 'forecast'] },
    sales: { id: 'sales', name: 'Ventas', description: 'Valor de ventas utilizado para analizar desempeño y variaciones.', category: 'sales', relatedConcepts: ['orders', 'aov', 'traffic'] },
    traffic: { id: 'traffic', name: 'Tráfico', description: 'Volumen de sesiones o visitas disponibles para generar pedidos.', category: 'acquisition', relatedConcepts: ['orders', 'conversion_rate', 'channels'] },
    orders: { id: 'orders', name: 'Pedidos', description: 'Cantidad de órdenes generadas en un periodo.', category: 'sales', relatedConcepts: ['traffic', 'conversion_rate', 'aov'] },
    conversion_rate: { id: 'conversion_rate', name: 'Conversion Rate', description: 'Relación entre pedidos y tráfico utilizada para evaluar conversión.', category: 'conversion', relatedConcepts: ['traffic', 'orders', 'funnel', 'checkout'] },
    aov: { id: 'aov', name: 'AOV', description: 'Valor promedio de cada pedido.', category: 'sales', relatedConcepts: ['orders', 'sales', 'ltv'] },
    rps: { id: 'rps', name: 'RPS', description: 'Ventas generadas por unidad de tráfico.', category: 'acquisition', relatedConcepts: ['sales', 'traffic', 'channels'] },
    acquisition: { id: 'acquisition', name: 'Adquisición', description: 'Conjunto de fuentes y acciones que generan tráfico.', category: 'acquisition', relatedConcepts: ['channels', 'traffic'] },
    funnel: { id: 'funnel', name: 'Funnel', description: 'Secuencia de etapas que conduce desde el tráfico hasta la compra.', category: 'conversion', relatedConcepts: ['checkout', 'purchase', 'conversion_rate'] },
    checkout: { id: 'checkout', name: 'Checkout', description: 'Etapa del proceso de compra donde el usuario completa el pedido.', category: 'conversion', relatedConcepts: ['funnel', 'purchase'] },
    purchase: { id: 'purchase', name: 'Purchase', description: 'Evento final de compra dentro del funnel.', category: 'conversion', relatedConcepts: ['checkout', 'orders'] },
    retention: { id: 'retention', name: 'Retención', description: 'Persistencia de clientes o cohortes a lo largo del tiempo.', category: 'customers', relatedConcepts: ['cohorts', 'ltv'] },
    cohorts: { id: 'cohorts', name: 'Cohortes', description: 'Agrupaciones de clientes analizadas por periodo de adquisición o comportamiento.', category: 'customers', relatedConcepts: ['retention', 'ltv'] },
    ltv: { id: 'ltv', name: 'LTV', description: 'Valor acumulado esperado o observado de un cliente.', category: 'customers', relatedConcepts: ['retention', 'aov'] },
    diagnosis: { id: 'diagnosis', name: 'Diagnóstico', description: 'Identificación estructurada del driver o zona donde se concentra una variación.', category: 'analysis', relatedConcepts: ['hypothesis', 'evidence'] },
    hypothesis: { id: 'hypothesis', name: 'Hipótesis', description: 'Explicación verificable que relaciona una señal con una posible causa.', category: 'analysis', relatedConcepts: ['diagnosis', 'evidence'] },
    evidence: { id: 'evidence', name: 'Evidencia', description: 'Dato o comprobación utilizada para confirmar o debilitar una explicación.', category: 'analysis', relatedConcepts: ['diagnosis', 'hypothesis'] }
});

const EVIDENCE_STATES = Object.freeze({
    NOT_STARTED: 'not_started',
    EXPOSED: 'exposed',
    PRACTICED: 'practiced',
    DEMONSTRATED: 'demonstrated',
    NEEDS_REVIEW: 'needs_review'
});
const EVIDENCE_STATE_LABELS = Object.freeze({
    [EVIDENCE_STATES.NOT_STARTED]: 'Sin evidencia',
    [EVIDENCE_STATES.EXPOSED]: 'Expuesto',
    [EVIDENCE_STATES.PRACTICED]: 'Practicado',
    [EVIDENCE_STATES.DEMONSTRATED]: 'Demostrado',
    [EVIDENCE_STATES.NEEDS_REVIEW]: 'Necesita revisión'
});

// Metadata pedagógica de los ejercicios existentes.
// Las preguntas, respuestas y explicaciones siguen viviendo donde ya estaban:
// HTML y funciones de validación. No se duplican aquí.
const exerciseMetadata = Object.freeze({
    'l1-e1': {
        hints: [
            'Calcula primero la meta mensual usando Meta anual × peso mensual.',
            'Distribuye la meta mensual por canal usando el porcentaje de cada canal.',
            'Comprueba que la suma de los cuatro canales coincide con la meta mensual.'
        ],
        type: EXERCISE_TYPES.CALCULATION,
        cognitiveLevel: COGNITIVE_LEVELS.CALCULATE,
        difficulty: 1,
        concepts: ['annual_goal', 'seasonality', 'channels']
    },
    'l1-e2': {
        hints: [
            'La meta mensual se obtiene multiplicando la meta anual por el peso histórico.',
            'Enero y noviembre utilizan sus respectivos porcentajes históricos.',
            'Comprueba que estás aplicando 7% a enero y 12% a noviembre.'
        ],
        type: EXERCISE_TYPES.CALCULATION,
        cognitiveLevel: COGNITIVE_LEVELS.CALCULATE,
        difficulty: 1,
        concepts: ['annual_goal', 'seasonality', 'channels']
    },
    'l2-e1': {
        hints: [
            'Compara el porcentaje de cumplimiento con el tiempo transcurrido.',
            'Run Rate usa la venta acumulada dividida entre los días transcurridos.',
            'Forecast y Target deben derivarse de los datos acumulados y del tiempo restante.'
        ],
        type: EXERCISE_TYPES.CALCULATION,
        cognitiveLevel: COGNITIVE_LEVELS.CALCULATE,
        difficulty: 1,
        concepts: ['pacing', 'run_rate', 'forecast', 'target']
    },
    'l2-e2': {
        hints: [
            'El cumplimiento debe compararse contra el tiempo transcurrido.',
            'Para el target, divide la brecha restante entre los días restantes.',
            'Revisa la solución solo después de comprobar tus unidades y periodos.'
        ],
        type: EXERCISE_TYPES.CALCULATION,
        cognitiveLevel: COGNITIVE_LEVELS.INTERPRET,
        difficulty: 2,
        concepts: ['pacing', 'run_rate', 'forecast', 'target']
    },
    'l3-e1': {
        hints: [
            'Descompón ventas en volumen de pedidos y valor medio.',
            'Calcula RPS relacionando ventas con tráfico.',
            'Compara ambos periodos antes de formular una interpretación.'
        ],
        type: EXERCISE_TYPES.CALCULATION,
        cognitiveLevel: COGNITIVE_LEVELS.INTERPRET,
        difficulty: 2,
        concepts: ['sales', 'traffic', 'orders', 'conversion_rate', 'aov', 'rps']
    },
    'l4-e1': {
        hints: [
            'RPS relaciona ventas con sesiones/tráfico.',
            'Calcula primero los indicadores del canal antes de compararlos.',
            'Usa la comparación de canales para formular tus preguntas de investigación.'
        ],
        type: EXERCISE_TYPES.INTERPRETATION,
        cognitiveLevel: COGNITIVE_LEVELS.INTERPRET,
        difficulty: 2,
        concepts: ['traffic', 'channels', 'acquisition', 'conversion_rate', 'aov', 'rps']
    },
    'l5-e1': {
        hints: [
            'Separa brecha, driver, segmento y señal antes de formular una hipótesis.',
            'Una señal no demuestra por sí sola una causa.',
            'Indica qué evidencia necesitarías para confirmar o debilitar la hipótesis.'
        ],
        type: EXERCISE_TYPES.DIAGNOSIS,
        cognitiveLevel: COGNITIVE_LEVELS.DIAGNOSE,
        difficulty: 2,
        concepts: ['sales', 'traffic', 'conversion_rate', 'aov', 'diagnosis', 'hypothesis', 'evidence']
    },
    'l6-e1': {
        hints: [
            'Localiza primero la etapa del funnel con mayor deterioro.',
            'Después segmenta la señal para identificar dónde se concentra.',
            'Conecta la hipótesis con evidencia adicional y un KPI de seguimiento.'
        ],
        type: EXERCISE_TYPES.DIAGNOSIS,
        cognitiveLevel: COGNITIVE_LEVELS.DIAGNOSE,
        difficulty: 2,
        concepts: ['funnel', 'checkout', 'purchase', 'conversion_rate', 'diagnosis', 'hypothesis', 'evidence']
    },
    'l7-e1': {
        hints: [
            'Frecuencia = órdenes / clientes y AOV = ventas / órdenes.',
            'Compara las cohortes usando el mismo periodo de retención.',
            'Una retención menor es una señal para investigar, no una causa definitiva.'
        ],
        type: EXERCISE_TYPES.INTERPRETATION,
        cognitiveLevel: COGNITIVE_LEVELS.INTERPRET,
        difficulty: 2,
        concepts: ['retention', 'cohorts', 'ltv', 'orders', 'sales', 'aov']
    },
    'l8-e1': {
        hints: [
            'Empieza definiendo el objetivo y la brecha que quieres explicar.',
            'Selecciona datos y fuentes que permitan validar tu diagnóstico.',
            'Termina conectando recomendación con KPI y método de medición.'
        ],
        type: EXERCISE_TYPES.CASE,
        cognitiveLevel: COGNITIVE_LEVELS.CASE,
        difficulty: 3,
        concepts: [
            'sales', 'traffic', 'conversion_rate', 'aov', 'channels',
            'funnel', 'retention', 'diagnosis', 'hypothesis', 'evidence'
        ]
    }
});

/**
 * Normaliza un ejercicio legacy (string/objeto parcial) a una estructura
 * pedagógica estándar sin obligar al motor actual a cambiar su contrato.
 */
function normalizeExercise(exercise) {
    const base = typeof exercise === 'string' ? { id: exercise } : { ...(exercise || {}) };
    const metadata = exerciseMetadata[base.id] || {};

    return {
        ...base,
        type: base.type ?? metadata.type ?? null,
        cognitiveLevel: base.cognitiveLevel ?? metadata.cognitiveLevel ?? null,
        difficulty: base.difficulty ?? metadata.difficulty ?? null,
        concepts: Array.isArray(base.concepts)
            ? base.concepts
            : (metadata.concepts ? [...metadata.concepts] : []),
        hints: Array.isArray(base.hints) ? base.hints : (Array.isArray(metadata.hints) ? [...metadata.hints] : []),
        analystThinking: Array.isArray(base.analystThinking) ? base.analystThinking : [],
        rubric: base.rubric ?? null,
        errorPatterns: Array.isArray(base.errorPatterns) ? base.errorPatterns : [],
        tags: Array.isArray(base.tags) ? base.tags : []
    };
}

function getExercise(exerciseId) {
    return normalizeExercise(exerciseId);
}


// ================================================================
// FASE 4 — FLUJO DE APRENDIZAJE Y PROGRESIÓN COGNITIVA
// La progresión se deriva del modelo de ejercicios existente y de la
// estructura pedagógica ya presente en las lecciones. No introduce
// mastery, scoring ni bloqueos nuevos.
// ================================================================
const COGNITIVE_STAGE_ORDER = Object.freeze([
    COGNITIVE_LEVELS.UNDERSTAND,
    COGNITIVE_LEVELS.CALCULATE,
    COGNITIVE_LEVELS.INTERPRET,
    COGNITIVE_LEVELS.DIAGNOSE,
    COGNITIVE_LEVELS.HYPOTHESIZE,
    COGNITIVE_LEVELS.RECOMMEND,
    'apply'
]);

const COGNITIVE_STAGE_LABELS = Object.freeze({
    [COGNITIVE_LEVELS.UNDERSTAND]: 'Comprender',
    [COGNITIVE_LEVELS.CALCULATE]: 'Calcular',
    [COGNITIVE_LEVELS.INTERPRET]: 'Interpretar',
    [COGNITIVE_LEVELS.DIAGNOSE]: 'Diagnosticar',
    [COGNITIVE_LEVELS.HYPOTHESIZE]: 'Formular hipótesis',
    [COGNITIVE_LEVELS.RECOMMEND]: 'Recomendar',
    apply: 'Aplicar'
});

// El contenido de L5–L8 ya contiene estos pasos explícitos; aquí solo se
// representan para hacer visible el recorrido sin crear ejercicios nuevos.
const LESSON_COGNITIVE_FLOW = Object.freeze({
    l1: {
        stages: [COGNITIVE_LEVELS.CALCULATE],
        transition: 'Ya puedes calcular la meta. El siguiente paso es interpretar el ritmo y saber si el negocio avanza como debería.'
    },
    l2: {
        stages: [COGNITIVE_LEVELS.CALCULATE, COGNITIVE_LEVELS.INTERPRET],
        transition: 'Ya puedes medir el ritmo. Ahora vas a convertir los números en señales que permitan investigar qué está cambiando.'
    },
    l3: {
        stages: [COGNITIVE_LEVELS.INTERPRET],
        transition: 'Ya puedes interpretar una variación de ventas. El siguiente salto es localizar qué driver o segmento puede explicarla.'
    },
    l4: {
        stages: [COGNITIVE_LEVELS.INTERPRET],
        transition: 'Ya puedes comparar la aportación de los canales. El siguiente paso es pasar de una señal a un diagnóstico.'
    },
    l5: {
        stages: [COGNITIVE_LEVELS.DIAGNOSE, COGNITIVE_LEVELS.HYPOTHESIZE],
        transition: 'Ya identificaste una posible causa. Ahora debes convertirla en una hipótesis verificable y definir qué evidencia la confirmaría o debilitaría.'
    },
    l6: {
        stages: [COGNITIVE_LEVELS.DIAGNOSE, COGNITIVE_LEVELS.HYPOTHESIZE],
        transition: 'Ya puedes localizar dónde se pierde la conversión. El siguiente paso es conectar el diagnóstico con una hipótesis y una acción medible.'
    },
    l7: {
        stages: [COGNITIVE_LEVELS.INTERPRET],
        transition: 'Esta lección refuerza la interpretación desde el comportamiento de clientes. En el proyecto integrador tendrás que conectar interpretación, diagnóstico, hipótesis y recomendación.'
    },
    l8: {
        stages: [COGNITIVE_LEVELS.DIAGNOSE, COGNITIVE_LEVELS.HYPOTHESIZE, COGNITIVE_LEVELS.RECOMMEND, 'apply'],
        transition: 'El proyecto integra el recorrido completo: medir, descomponer, segmentar, diagnosticar, formular hipótesis, recomendar y aplicar el análisis al negocio.'
    },
    cierre: {
        stages: COGNITIVE_STAGE_ORDER,
        transition: 'El mapa final reúne el recorrido cognitivo del curso y prepara las siguientes fases.'
    }
});

function toCognitiveStage(level) {
    return level === COGNITIVE_LEVELS.CASE ? 'apply' : level;
}

function getLessonCognitiveStages(lessonId) {
    const configured = LESSON_COGNITIVE_FLOW[lessonId]?.stages;
    if (configured?.length) return [...configured];
    return [...new Set(getLessonExercises(lessonId).map(ex => toCognitiveStage(ex.cognitiveLevel)).filter(Boolean))];
}

function getExerciseCognitiveStage(exerciseId) {
    const level = getExercise(exerciseId).cognitiveLevel;
    return level ? toCognitiveStage(level) : null;
}

function getPracticedCognitiveStages() {
    const practiced = new Set();
    lessons.forEach(lesson => {
        lesson.exercises.forEach(exerciseId => {
            const state = getLearningState(exerciseId);
            if (state.attempts > 0) {
                const stage = getExerciseCognitiveStage(exerciseId);
                if (stage) practiced.add(stage);
            }
        });
    });
    return practiced;
}

function getCompletedCognitiveStages() {
    const completed = new Set();
    lessons.forEach(lesson => {
        lesson.exercises.forEach(exerciseId => {
            const state = getLearningState(exerciseId);
            if (state.completed && state.solvedCorrectly) {
                const stage = getExerciseCognitiveStage(exerciseId);
                if (stage) completed.add(stage);
            }
        });
    });
    return completed;
}

function getCurrentCognitiveStage(lessonId = lessons[currentIndex]?.id) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return null;
    const unfinished = lesson.exercises.find(exerciseId => !getLearningState(exerciseId).completed);
    if (unfinished) return getExerciseCognitiveStage(unfinished);
    const stages = getLessonCognitiveStages(lessonId);
    return stages[stages.length - 1] || null;
}

function renderConceptEvidenceSummary(lessonId) {
    const entries = getEvidenceForLesson(lessonId);
    if (!entries.length) return '';
    const rows = entries.slice(0, 8).map(entry => {
        const evidence = entry.evidence || createConceptEvidenceRecord(entry.concept.id, entry.level);
        const label = EVIDENCE_STATE_LABELS[evidence.state] || EVIDENCE_STATE_LABELS.not_started;
        const levelLabel = COGNITIVE_STAGE_LABELS[entry.level] || 'Nivel no definido';
        return `<li class="concept-evidence-row"><span><strong>${entry.concept.name}</strong><small>${levelLabel}</small></span><span class="evidence-state evidence-${evidence.state}">${label}</span></li>`;
    }).join('');
    return `<section class="concept-evidence" aria-label="Evidencia de aprendizaje de conceptos"><strong>Evidencia en esta lección</strong><span class="concept-evidence-note">Describe la evidencia disponible; no es una calificación.</span><ul>${rows}</ul></section>`;
}

function renderCognitiveProgression() {
    const lesson = lessons[currentIndex];
    if (!lesson) return;
    const lessonEl = document.getElementById(lesson.id);
    if (!lessonEl || typeof lessonEl.querySelector !== 'function') return;

    let panel = lessonEl.querySelector('.cognitive-progression');
    if (!panel) {
        panel = document.createElement('section');
        panel.className = 'cognitive-progression';
        panel.setAttribute('aria-label', 'Ruta de aprendizaje');
        const heading = lessonEl.querySelector('h2');
        if (heading?.nextSibling) lessonEl.insertBefore(panel, heading.nextSibling);
        else lessonEl.prepend(panel);
    }

    const currentStage = getCurrentCognitiveStage(lesson.id);
    const stages = getLessonCognitiveStages(lesson.id);
    const practiced = getPracticedCognitiveStages();
    const completed = getCompletedCognitiveStages();
    const transition = LESSON_COGNITIVE_FLOW[lesson.id]?.transition || '';

    const stageChips = COGNITIVE_STAGE_ORDER.map(stage => {
        const coveredHere = stages.includes(stage);
        const isCurrent = stage === currentStage;
        const isCompleted = completed.has(stage);
        const isPracticed = practiced.has(stage);
        let stateClass = 'upcoming';
        if (isCompleted) stateClass = 'completed';
        else if (isCurrent) stateClass = 'current';
        else if (isPracticed) stateClass = 'practiced';
        return `<span role="listitem" class="cognitive-stage ${stateClass}${coveredHere ? ' covered-here' : ''}" title="${coveredHere ? 'Presente en esta lección' : ''}">${isCompleted ? '✓ ' : ''}${COGNITIVE_STAGE_LABELS[stage]}</span>`;
    }).join('');

    const currentLabel = currentStage ? COGNITIVE_STAGE_LABELS[currentStage] : 'Recorrido integrado';
    const coveredLabel = stages.length ? stages.map(stage => COGNITIVE_STAGE_LABELS[stage]).join(' → ') : 'Mapa final';

    panel.innerHTML = `
        <div class="cognitive-progression-head">
            <div>
                <strong>Ruta de aprendizaje</strong>
                <span>Estás practicando: <b>${currentLabel}</b></span>
            </div>
            <span class="cognitive-progression-note">No es una puntuación ni una medida de dominio.</span>
        </div>
        <div class="cognitive-stage-list" role="list" aria-label="Progresión cognitiva">
            ${stageChips}
        </div>
        <p class="cognitive-progression-detail"><strong>En esta lección:</strong> ${coveredLabel}</p>
        ${transition ? `<p class="cognitive-transition"><strong>Qué sigue:</strong> ${transition}</p>` : ''}
        ${renderConceptEvidenceSummary(lesson.id)}
    `;
}

// Relación lección → ejercicio → conceptos sin cambiar la estructura legacy de lessons.
function getLessonExercises(lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    return lesson ? lesson.exercises.map(getExercise) : [];
}

// Ejemplo mínimo de la nueva estructura. No se agrega al flujo del curso.
const fase1TestExercise = normalizeExercise({
    id: 'fase1-test-exercise',
    type: EXERCISE_TYPES.CALCULATION,
    cognitiveLevel: COGNITIVE_LEVELS.INTERPRET,
    difficulty: 1,
    concepts: ['conversion_rate'],
    question: 'Ejercicio técnico de compatibilidad Fase 1',
    expectedValue: 0.042,
    tolerance: 0.001,
    explanation: 'Solo verifica que la estructura pueda transportar metadata pedagógica.',
    application: 'Prueba interna de arquitectura'
});

// Validación estructural mínima de Fase 1; no afecta el flujo del alumno.
function validatePedagogicalModel() {
    const exerciseIds = lessons.flatMap(lesson => lesson.exercises);
    const missing = exerciseIds.filter(id => !exerciseMetadata[id]);
    const invalid = exerciseIds.filter(id => {
        const exercise = getExercise(id);
        return !Array.isArray(exercise.concepts) || !('difficulty' in exercise) || !('cognitiveLevel' in exercise);
    });

    return {
        ok: missing.length === 0 && invalid.length === 0 && fase1TestExercise.id === 'fase1-test-exercise',
        missing,
        invalid
    };
}

let currentIndex = 0;
let lessonStatus = {}; // Rastrea lectura y completado
let exerciseStatus = {}; // Compatibilidad: true = resuelto correctamente

const PROGRESS_STORAGE_KEY = 'cursoAnalista.fase2.progress.v1';
let exerciseLearningState = {};

function createExerciseLearningState() {
    return {
        attempts: 0,
        attemptResults: [],
        hintsUsed: 0,
        revealedHints: [],
        firstAttemptCorrect: false,
        completed: false,
        solvedCorrectly: false,
        solutionViewed: false,
        errorHistory: [],
        lastErrorType: null
    };
}

function createInitialState() {
    const lessonsState = {};
    const exercisesState = {};
    lessons.forEach(l => {
        lessonsState[l.id] = { read: false, completed: false };
        l.exercises.forEach(ex => {
            exercisesState[ex] = createExerciseLearningState();
        });
    });
    return { currentIndex: 0, lessonStatus: lessonsState, exercises: exercisesState, conceptEvidence: {} };
}

function sanitizeExerciseState(raw) {
    const base = createExerciseLearningState();
    if (!raw || typeof raw !== 'object') return base;
    const attempts = Number.isInteger(raw.attempts) && raw.attempts >= 0 ? raw.attempts : 0;
    const hintsUsed = Number.isInteger(raw.hintsUsed) && raw.hintsUsed >= 0 ? raw.hintsUsed : 0;
    const revealedHints = Array.isArray(raw.revealedHints)
        ? [...new Set(raw.revealedHints.filter(Number.isInteger).filter(i => i >= 0))].sort((a,b) => a-b)
        : [];
    const results = Array.isArray(raw.attemptResults) ? raw.attemptResults.slice(-50) : [];
    return {
        attempts,
        attemptResults: results,
        hintsUsed: Math.min(hintsUsed, revealedHints.length),
        revealedHints,
        firstAttemptCorrect: attempts > 0 ? raw.firstAttemptCorrect === true : false,
        completed: raw.completed === true && raw.solvedCorrectly === true,
        solvedCorrectly: raw.solvedCorrectly === true,
        solutionViewed: raw.solutionViewed === true,
        errorHistory: Array.isArray(raw.errorHistory) ? raw.errorHistory.slice(-50) : [],
        lastErrorType: typeof raw.lastErrorType === 'string' ? raw.lastErrorType : null
    };
}

function createConceptEvidenceRecord(conceptId, cognitiveLevel) {
    return {
        conceptId,
        cognitiveLevel,
        state: EVIDENCE_STATES.NOT_STARTED,
        exerciseIds: [],
        attempts: 0,
        correct: false,
        firstAttemptCorrect: false,
        hintsUsed: 0,
        solutionViewed: false,
        errorTypes: [],
        difficultEvidence: false,
        lastActivityAt: null
    };
}

function normalizeConceptId(id) {
    return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function getConceptDefinition(conceptId) {
    const id = normalizeConceptId(conceptId);
    return id ? (concepts[id] || null) : null;
}

function getExerciseConcepts(exerciseId) {
    const metadata = exerciseMetadata[exerciseId];
    const normalized = getExercise(exerciseId);
    const raw = Array.isArray(normalized.concepts) ? normalized.concepts : (metadata?.concepts || []);
    return [...new Set(raw.map(normalizeConceptId).filter(Boolean))];
}

function deriveEvidenceState(record, exposed = false) {
    if (!record || record.attempts === 0) {
        return exposed ? EVIDENCE_STATES.EXPOSED : EVIDENCE_STATES.NOT_STARTED;
    }
    if (record.difficultEvidence) return EVIDENCE_STATES.NEEDS_REVIEW;
    if (record.correct) return EVIDENCE_STATES.DEMONSTRATED;
    return EVIDENCE_STATES.PRACTICED;
}

function rebuildConceptEvidence() {
    const aggregate = {};
    const ensure = (conceptId, cognitiveLevel) => {
        const key = `${conceptId}::${cognitiveLevel || 'unknown'}`;
        if (!aggregate[key]) aggregate[key] = createConceptEvidenceRecord(conceptId, cognitiveLevel || null);
        return aggregate[key];
    };

    lessons.forEach(lesson => {
        const lessonExposed = lessonStatus[lesson.id]?.read === true;
        lesson.exercises.forEach(exerciseId => {
            const state = getLearningState(exerciseId);
            const level = getExerciseCognitiveStage(exerciseId) || getExercise(exerciseId).cognitiveLevel || null;
            getExerciseConcepts(exerciseId).forEach(conceptId => {
                const record = ensure(conceptId, level);
                const definitionExists = Boolean(getConceptDefinition(conceptId));
                // Los conceptos desconocidos se conservan como referencia segura; no se inventa su descripción.
                void definitionExists;
                if (!record.exerciseIds.includes(exerciseId)) record.exerciseIds.push(exerciseId);
                if (state.attempts > 0) {
                    const hadPreviousAttempts = record.attempts > 0;
                    record.attempts += state.attempts;
                    record.correct = record.correct || state.solvedCorrectly === true;
                    record.firstAttemptCorrect = hadPreviousAttempts
                        ? (record.firstAttemptCorrect === true && state.firstAttemptCorrect === true)
                        : state.firstAttemptCorrect === true;
                    record.hintsUsed += Number(state.hintsUsed) || 0;
                    record.solutionViewed = record.solutionViewed || state.solutionViewed === true;
                    if (Array.isArray(state.errorHistory)) {
                        state.errorHistory.forEach(error => {
                            if (error?.type && !record.errorTypes.includes(error.type)) record.errorTypes.push(error.type);
                        });
                    }
                    const difficult = (Number(state.hintsUsed) || 0) > 0 || state.solutionViewed === true ||
                        (Array.isArray(state.errorHistory) && state.errorHistory.length > 0) ||
                        (Array.isArray(state.attemptResults) && state.attemptResults.some(result => result && result.correct === false));
                    record.difficultEvidence = record.difficultEvidence || difficult;
                    const results = Array.isArray(state.attemptResults) ? state.attemptResults : [];
                    const latest = results.length ? results[results.length - 1] : null;
                    if (latest?.timestamp) record.lastActivityAt = latest.timestamp;
                }
                if (lessonExposed && !record.lastActivityAt) record.lastActivityAt = null;
                record.state = deriveEvidenceState(record, lessonExposed);
            });
        });
    });

    // Los conceptos definidos por el catálogo quedan disponibles con estado explícito solo al ser usados.
    Object.values(aggregate).forEach(record => {
        record.errorTypes.sort();
        record.exerciseIds.sort();
    });
    exerciseLearningState.__conceptEvidenceRebuilt = undefined;
    return aggregate;
}

function syncConceptEvidence() {
    const aggregate = rebuildConceptEvidence();
    window.__conceptEvidenceCache = aggregate;
    return aggregate;
}

function getConceptEvidence(conceptId, cognitiveLevel = null) {
    const aggregate = syncConceptEvidence();
    const id = normalizeConceptId(conceptId);
    if (!id) return null;
    if (cognitiveLevel) return aggregate[`${id}::${cognitiveLevel}`] || createConceptEvidenceRecord(id, cognitiveLevel);
    return Object.values(aggregate).filter(record => record.conceptId === id);
}

function getEvidenceForLesson(lessonId) {
    const lesson = lessons.find(item => item.id === lessonId);
    if (!lesson) return [];
    const pairs = [];
    lesson.exercises.forEach(exerciseId => {
        const level = getExerciseCognitiveStage(exerciseId) || getExercise(exerciseId).cognitiveLevel || null;
        getExerciseConcepts(exerciseId).forEach(conceptId => pairs.push({ conceptId, level }));
    });
    const unique = new Map(pairs.map(pair => [`${pair.conceptId}::${pair.level || 'unknown'}`, pair]));
    return [...unique.values()].map(({conceptId, level}) => ({
        concept: getConceptDefinition(conceptId) || { id: conceptId, name: conceptId, category: 'unknown' },
        evidence: getConceptEvidence(conceptId, level),
        level
    }));
}

function registerConceptExposureForLesson(lessonId) {
    // La exposición se deriva de la lectura persistida de la lección; no se crea un segundo evento histórico.
    if (lessonStatus[lessonId]?.read === true) syncConceptEvidence();
}

function loadLearningState() {
    const initial = createInitialState();
    try {
        const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || 'null');
        if (!saved || typeof saved !== 'object') {
            lessonStatus = initial.lessonStatus;
            exerciseLearningState = initial.exercises;
            lessons.forEach(l => l.exercises.forEach(ex => { exerciseStatus[ex] = false; }));
            return;
        }
        currentIndex = Number.isInteger(saved.currentIndex) && saved.currentIndex >= 0 && saved.currentIndex < lessons.length
            ? saved.currentIndex : 0;
        for (const lesson of lessons) {
            const rawLesson = saved.lessonStatus?.[lesson.id];
            if (rawLesson) {
                initial.lessonStatus[lesson.id].read = rawLesson.read === true;
                initial.lessonStatus[lesson.id].completed = rawLesson.completed === true;
            }
            for (const ex of lesson.exercises) {
                initial.exercises[ex] = sanitizeExerciseState(saved.exercises?.[ex]);
            }
        }
    } catch (error) {
        console.warn('No se pudo recuperar el progreso Fase 2:', error);
        currentIndex = 0;
    }
    lessonStatus = initial.lessonStatus;
    exerciseLearningState = initial.exercises;
    syncConceptEvidence();
    lessons.forEach(l => l.exercises.forEach(ex => {
        exerciseStatus[ex] = exerciseLearningState[ex].solvedCorrectly;
    }));
}

function saveLearningState() {
    try {
        const conceptEvidence = syncConceptEvidence();
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
            version: 1,
            currentIndex,
            lessonStatus,
            exercises: exerciseLearningState,
            conceptEvidence
        }));
    } catch (error) {
        console.warn('No se pudo guardar el progreso Fase 2:', error);
    }
}

loadLearningState();

// Elementos del DOM
const mainContainer = document.getElementById('main-content');
const progressBar = document.getElementById('reading-progress-bar');
const titleEl = document.getElementById('lesson-title');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// --- SISTEMA DE NAVEGACIÓN Y RENDERIZADO ---
function updateUI() {
    document.querySelectorAll('.lesson').forEach(el => el.classList.remove('active'));
    document.getElementById(lessons[currentIndex].id).classList.add('active');

    titleEl.innerText = lessons[currentIndex].title;

    // Controles de botones para evitar desbordes
    prevBtn.disabled = currentIndex === 0;

    if (currentIndex === lessons.length - 1) {
        nextBtn.innerText = 'Finalizado';
        nextBtn.disabled = true;
    } else {
        nextBtn.innerText = 'Siguiente →';
        nextBtn.disabled = false;
    }

    mainContainer.scrollTop = 0;
    updateScrollProgress();
    updateStatsPanel();
    renderCognitiveProgression();
}

function navigate(direction) {
    // 1. Topes de seguridad
    if (direction === -1 && currentIndex === 0) return;
    if (direction === 1 && currentIndex === lessons.length - 1) return;

    // 2. Lógica para avanzar de lección
    if (direction === 1) {
        const currentL = lessons[currentIndex];
        const isRead = lessonStatus[currentL.id].read;
        const allExercisesDone = currentL.exercises.every(ex => exerciseStatus[ex] === true);

        // Se conserva exactamente el comportamiento actual de compatibilidad:
        // el usuario puede avanzar aunque la lección esté incompleta.
        if (!isRead || !allExercisesDone) {
            const msg = [];
            if (!isRead) msg.push('leer hasta el final');
            if (!allExercisesDone) msg.push('resolver los ejercicios de forma exacta');

            const advertencia = '⚠️ AÚN NO TERMINAS\n\nTe falta ' + msg.join(' y ') +
                '.\n\n¿Quieres avanzar de todos modos? (Esta lección quedará marcada como incompleta).';

            if (!confirm(advertencia)) return;
        } else {
            lessonStatus[currentL.id].completed = true;
        }
    }

    // 3. Cambiamos el índice y actualizamos
    currentIndex += direction;
    saveLearningState();
    updateUI();
}

// Ya no necesitamos las funciones viejas del modal; se mantienen como no-op
// para que el HTML legacy no falle si conserva sus handlers.
function closeModal() { /* compatibilidad legacy */ }
function forceNextLesson() { /* compatibilidad legacy */ }

// --- RASTREO DE LECTURA (SCROLL) ---
mainContainer.addEventListener('scroll', updateScrollProgress);

function updateScrollProgress() {
    const container = document.getElementById(lessons[currentIndex].id);
    const totalHeight = container.offsetHeight;
    const visibleHeight = mainContainer.clientHeight;
    const scrollTop = mainContainer.scrollTop;

    if (totalHeight <= visibleHeight + 20) {
        progressBar.style.width = '100%';
        lessonStatus[lessons[currentIndex].id].read = true;
        registerConceptExposureForLesson(lessons[currentIndex].id);
        saveLearningState();
        return;
    }

    let progress = (scrollTop / (totalHeight - visibleHeight)) * 100;
    progress = Math.min(progress, 100);
    progressBar.style.width = progress + '%';

    if (progress > 95) {
        lessonStatus[lessons[currentIndex].id].read = true;
        registerConceptExposureForLesson(lessons[currentIndex].id);
        saveLearningState();
    }
}

// --- ESTADÍSTICAS GLOBALES ---
function updateStatsPanel() {
    const totalLessons = lessons.length - 1; // Excluimos cierre
    const completedLessons = Object.values(lessonStatus).filter(s => s.completed).length;

    let totalExercises = 0;
    let completedExercises = 0;
    for (const key in exerciseStatus) {
        totalExercises++;
        if (exerciseStatus[key]) completedExercises++;
    }

    const l_pct = Math.round((completedLessons / totalLessons) * 100) || 0;
    const e_pct = Math.round((completedExercises / (totalExercises || 1)) * 100) || 0;

    document.getElementById('lessons-stat').innerText = `${l_pct}% (${completedLessons}/${totalLessons})`;
    document.getElementById('exercises-stat').innerText = `${e_pct}% (${completedExercises}/${totalExercises})`;
}

// --- VALIDACIÓN DE EJERCICIOS (CON CIFRAS EXACTAS) ---
function isCorrect(inputVal, expectedVal, tolerance = 1) {
    if (isNaN(inputVal)) return false;
    return Math.abs(inputVal - expectedVal) <= tolerance;
}


// ================================================================
// FASE 3 — FEEDBACK PEDAGÓGICO Y DIAGNÓSTICO DETERMINÍSTICO
// No intenta inferir el pensamiento del alumno: solo clasifica señales
// que pueden demostrarse a partir de los datos del ejercicio y la respuesta.
// ================================================================
const analystThinking = Object.freeze({
    'l1-e1': ['Una meta mensual debe distribuirse respetando la estacionalidad y el mix de canales.'],
    'l1-e2': ['Una meta anual no debería dividirse en partes iguales si existe estacionalidad histórica.'],
    'l2-e1': ['Compara el ritmo actual con el tiempo transcurrido y con el target necesario para interpretar la trayectoria.'],
    'l2-e2': ['Un forecast simple describe el ritmo actual; un analista también incorpora eventos conocidos que pueden alterar ese ritmo.'],
    'l3-e1': ['El cálculo muestra qué cambió; la investigación debe explicar qué driver podría estar detrás de la variación.'],
    'l4-e1': ['Un RPS alto puede ser una señal para investigar, pero por sí solo no demuestra que un canal deba recibir más inversión.']
});

const errorProfiles = Object.freeze({
    'l1-e1': {
        expected: { m: 9000000, e: 4500000, a: 2700000, w: 900000, c: 900000 },
        fields: ['m', 'e', 'a', 'w', 'c']
    },
    'l1-e2': {
        expected: { e: 8400000, n: 14400000 },
        fields: ['e', 'n']
    },
    'l2-e1': {
        expected: { c: 40, t: 50, p: -10, r: 266666.67, f: 8000000, tr: 400000 },
        fields: ['c', 't', 'p', 'r', 'f', 'tr'],
        percentageFields: ['c', 't', 'p']
    },
    'l2-e2': {
        expected: { c: 54.7, tr: 680000 },
        fields: ['c', 'tr'],
        percentageFields: ['c'],
        candidateErrors: {
            formula: { tr: 1500000 }
        }
    },
    'l3-e1': {
        expected: { va: 9000000, vb: 8379000, ra: 45, rb: 39.9 },
        fields: ['va', 'vb', 'ra', 'rb'],
        candidateErrors: {
            conceptual: { ra: 1800, rb: 1900 }
        }
    },
    'l4-e1': {
        expected: { e_rps: 200 },
        fields: ['e_rps'],
        candidateErrors: {
            conceptual: { e_rps: 2666.67 }
        }
    }
});

function getAnalystThinking(exerciseId) {
    const metadata = exerciseMetadata[exerciseId];
    if (metadata && Array.isArray(metadata.analystThinking)) return metadata.analystThinking;
    return analystThinking[exerciseId] ? [...analystThinking[exerciseId]] : [];
}

function classifyQuantitativeError(exerciseId, answers) {
    const profile = errorProfiles[exerciseId];
    if (!profile) return { type: 'unknown', confidence: 'low' };

    for (const field of profile.fields) {
        const value = answers?.[field];
        if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
            return { type: 'invalid', field, confidence: 'high' };
        }
    }

    // Porcentaje / escala: solo se diagnostica cuando el campo es explícitamente porcentual.
    for (const field of (profile.percentageFields || [])) {
        const expected = profile.expected[field];
        const value = Number(answers[field]);
        if (Math.abs(value - expected / 100) <= Math.max(0.01, Math.abs(expected) * 0.01)) {
            return { type: 'percentage_scale', field, confidence: 'high' };
        }
        if (Math.abs(value - expected * 100) <= Math.max(1, Math.abs(expected) * 0.01)) {
            return { type: 'percentage_scale', field, confidence: 'high' };
        }
    }

    // Señales concretas conocidas del ejercicio: no generalizamos a partir de una sola cercanía.
    const candidates = profile.candidateErrors || {};
    for (const type of ['formula', 'conceptual', 'substitution', 'arithmetic', 'unit', 'sign', 'range']) {
        const map = candidates[type] || {};
        for (const field of Object.keys(map)) {
            if (Math.abs(Number(answers[field]) - Number(map[field])) <= Math.max(0.01, Math.abs(Number(map[field])) * 0.001)) {
                return { type, field, confidence: 'high' };
            }
        }
    }

    // Rango / plausibilidad: solo para métricas con límites inequívocos.
    if (exerciseId === 'l2-e1' && Number(answers.c) > 100) {
        return { type: 'range', field: 'c', confidence: 'high' };
    }
    if (exerciseId === 'l2-e2' && Number(answers.c) > 100) {
        return { type: 'range', field: 'c', confidence: 'high' };
    }

    // Si no hay evidencia suficiente, no sobrediagnosticamos.
    return { type: 'unknown', confidence: 'low' };
}

const ERROR_FEEDBACK = Object.freeze({
    formula: {
        title: 'Parece que el problema puede estar en la fórmula.',
        body: 'Revisa la relación matemática antes de sustituir los valores.'
    },
    substitution: {
        title: 'La fórmula parece correcta; revisa los valores utilizados.',
        body: 'Comprueba que cada dato corresponda al periodo, variable y unidad solicitados.'
    },
    percentage_scale: {
        title: 'Parece que el problema puede estar en la escala del porcentaje.',
        body: 'Revisa la conversión entre porcentaje y decimal. Por ejemplo, 2.5% = 0.025.'
    },
    arithmetic: {
        title: 'La fórmula y los valores parecen estar bien.',
        body: 'Revisa la operación aritmética paso a paso.'
    },
    unit: {
        title: 'Parece que puede haber una diferencia de unidad o formato.',
        body: 'Revisa si estás utilizando porcentaje, decimal, pesos, miles, millones, pedidos o sesiones.'
    },
    sign: {
        title: 'Revisa el sentido de la variación.',
        body: 'Identifica primero cuál es el valor actual y cuál es la referencia.'
    },
    range: {
        title: 'Revisa el rango esperado de esta métrica.',
        body: 'Comprueba si el resultado es compatible con la definición del indicador.'
    },
    invalid: {
        title: 'Necesitamos una respuesta numérica válida para continuar.',
        body: 'Revisa el formato solicitado e introduce un valor interpretable.'
    },
    conceptual: {
        title: 'Parece que puede haber una confusión entre conceptos.',
        body: 'Revisa qué representa cada indicador antes de volver a calcular.'
    },
    unknown: {
        title: 'No podemos determinar el tipo de error todavía.',
        body: 'Revisa nuevamente la fórmula, los valores utilizados y la operación. Puedes utilizar una pista para continuar.'
    }
});

function buildPedagogicalFeedback(exerciseId, diagnostic) {
    const template = ERROR_FEEDBACK[diagnostic.type] || ERROR_FEEDBACK.unknown;
    const profile = exerciseMetadata[exerciseId];
    const conceptNames = (profile?.concepts || [])
        .map(id => concepts[id]?.name || id)
        .slice(0, 2);
    const context = conceptNames.length ? ` Concepto relacionado: ${conceptNames.join(' y ')}.` : '';
    return `${template.title} ${template.body}${context}`;
}

function recordErrorDiagnosis(exerciseId, diagnostic, feedback) {
    const state = getLearningState(exerciseId);
    state.errorHistory = Array.isArray(state.errorHistory) ? state.errorHistory : [];
    state.lastErrorType = diagnostic.type;
    state.errorHistory.push({
        attempt: state.attempts,
        type: diagnostic.type,
        feedback,
        timestamp: new Date().toISOString()
    });
    state.errorHistory = state.errorHistory.slice(-50);
    saveLearningState();
}

function diagnoseAndRenderFeedback(exerciseId, answers, feedbackEl) {
    const diagnostic = classifyQuantitativeError(exerciseId, answers);
    const feedback = buildPedagogicalFeedback(exerciseId, diagnostic);
    recordErrorDiagnosis(exerciseId, diagnostic, feedback);
    if (feedbackEl) {
        feedbackEl.innerHTML = `<div class="error-box"><strong>❌ Todavía no.</strong><br>${feedback}<br><br>Intenta nuevamente o utiliza una pista.</div>`;
        feedbackEl.setAttribute('aria-live', 'polite');
    }
    renderExerciseLearningUI(exerciseId);
    return diagnostic;
}

function renderAnalystThinking(exerciseId, host) {
    const thoughts = getAnalystThinking(exerciseId);
    if (!thoughts.length) return;
    const box = document.createElement('div');
    box.className = 'analyst-thinking';
    box.setAttribute('aria-live', 'polite');
    box.innerHTML = `<strong>PIENSA COMO ANALISTA</strong>${thoughts.map(t => `<p>${t}</p>`).join('')}`;
    host.appendChild(box);
}

function getLearningState(exerciseId) {
    if (!exerciseLearningState[exerciseId]) {
        exerciseLearningState[exerciseId] = createExerciseLearningState();
    }
    return exerciseLearningState[exerciseId];
}

function markExerciseDone(exerciseId) {
    const state = getLearningState(exerciseId);
    state.completed = true;
    state.solvedCorrectly = true;
    exerciseStatus[exerciseId] = true;
    updateStatsPanel();
    saveLearningState();
    renderExerciseLearningUI(exerciseId);
    renderCognitiveProgression();
}

function markSolutionViewed(exerciseId) {
    const state = getLearningState(exerciseId);
    state.solutionViewed = true;
    saveLearningState();
}

// Revelar bloque HTML de solución original. Ver la solución no completa el ejercicio.
function revealSolution(divId, exerciseId = null) {
    document.getElementById(divId).classList.add('show');
    if (exerciseId) markSolutionViewed(exerciseId);
    setTimeout(updateScrollProgress, 300);
}

function recordAttempt(exerciseId, isCorrect, answerSummary = null) {
    const state = getLearningState(exerciseId);
    if (state.completed && state.solvedCorrectly) return state;

    state.attempts += 1;
    if (state.attempts === 1) state.firstAttemptCorrect = isCorrect === true;
    else if (!state.firstAttemptCorrect) state.firstAttemptCorrect = false;

    state.attemptResults.push({
        attempt: state.attempts,
        correct: isCorrect === true,
        answer: answerSummary,
        timestamp: new Date().toISOString()
    });

    if (isCorrect) {
        markExerciseDone(exerciseId);
    } else {
        state.solvedCorrectly = false;
        state.completed = false;
        exerciseStatus[exerciseId] = false;
        saveLearningState();
        renderCognitiveProgression();
    }
    renderExerciseLearningUI(exerciseId);
    return state;
}

function getHints(exerciseId) {
    return normalizeExercise(exerciseId).hints || [];
}

function revealNextHint(exerciseId) {
    const state = getLearningState(exerciseId);
    const hints = getHints(exerciseId);
    if (!hints.length || state.completed) return null;
    const nextIndex = hints.findIndex((_, index) => !state.revealedHints.includes(index));
    if (nextIndex === -1) return null;
    state.revealedHints.push(nextIndex);
    state.revealedHints.sort((a,b) => a-b);
    state.hintsUsed = state.revealedHints.length;
    saveLearningState();
    renderExerciseLearningUI(exerciseId);
    return { index: nextIndex, text: hints[nextIndex] };
}

function renderExerciseLearningUI(exerciseId) {
    const state = getLearningState(exerciseId);
    const hints = getHints(exerciseId);
    const host = document.querySelector(`[data-learning-controls=\"${exerciseId}\"]`);
    if (!host) return;

    const revealed = state.revealedHints.map(index => hints[index]).filter(Boolean);
    const feedback = state.completed
        ? '✓ Ejercicio resuelto correctamente.'
        : state.solutionViewed
            ? 'ℹ Solución revisada. Ver la solución no cuenta como respuesta correcta.'
            : state.attempts > 0
                ? '❌ Todavía no. Revisa tu respuesta y vuelve a intentarlo.'
                : 'Responde el reto.';

    host.innerHTML = '';
    const status = document.createElement('div');
    status.className = 'learning-status';
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = `<strong>${feedback}</strong><br>Intentos: ${state.attempts} · Pistas utilizadas: ${state.hintsUsed}`;
    host.appendChild(status);

    if (state.completed) renderAnalystThinking(exerciseId, host);

    if (revealed.length) {
        const hintsBox = document.createElement('div');
        hintsBox.className = 'hints-box';
        hintsBox.innerHTML = revealed.map((hint, i) => `<p><strong>💡 Pista ${state.revealedHints[i] + 1}:</strong> ${hint}</p>`).join('');
        host.appendChild(hintsBox);
    }

    if (!state.completed && hints.length && state.revealedHints.length < hints.length) {
        const hintBtn = document.createElement('button');
        hintBtn.className = 'action-btn outline learning-btn';
        hintBtn.type = 'button';
        hintBtn.textContent = `💡 Ver pista ${state.revealedHints.length + 1}`;
        hintBtn.addEventListener('click', () => revealNextHint(exerciseId));
        host.appendChild(hintBtn);
    }

    if (!state.completed && state.attempts > 0 && state.revealedHints.length >= hints.length) {
        const solutionBtn = document.createElement('button');
        solutionBtn.className = 'action-btn outline learning-btn';
        solutionBtn.type = 'button';
        solutionBtn.textContent = hints.length ? 'Ver solución paso a paso' : (getSolutionId(exerciseId) ? 'Revisar solución' : 'Revisar criterios de solución');
        solutionBtn.addEventListener('click', () => revealExerciseSolution(exerciseId));
        host.appendChild(solutionBtn);
    }

    if (!state.completed && state.solutionViewed && isQualitativeExercise(exerciseId)) {
        const solvedBtn = document.createElement('button');
        solvedBtn.className = 'action-btn learning-btn';
        solvedBtn.type = 'button';
        solvedBtn.textContent = 'Marcar como resuelto';
        solvedBtn.addEventListener('click', () => selfAssessQualitative(exerciseId));
        host.appendChild(solvedBtn);
    }
}

function revealExerciseSolution(exerciseId) {
    const solutionId = getSolutionId(exerciseId);
    if (solutionId) {
        revealSolution(solutionId, exerciseId);
    } else {
        // L8 no tiene un bloque de solución único: la propia sección de autoevaluación
        // funciona como criterios de revisión. Registrar esta revisión no equivale a resolver.
        const state = getLearningState(exerciseId);
        state.solutionViewed = true;
        saveLearningState();
    }
    renderExerciseLearningUI(exerciseId);
}

function getSolutionId(exerciseId) {
    return ({
        'l1-e1': 'sol-l1', 'l1-e2': 'sol-l1-reto', 'l2-e1': 'sol-l2-p',
        'l2-e2': 'sol-l2-r', 'l3-e1': 'sol-l3', 'l4-e1': 'sol-l4',
        'l5-e1': 'sol-l5', 'l6-e1': 'sol-l6', 'l7-e1': 'sol-l7'
    })[exerciseId] || null;
}

function isQualitativeExercise(exerciseId) {
    return ['l1-e2', 'l2-e2', 'l3-e1', 'l4-e1', 'l5-e1', 'l6-e1', 'l7-e1', 'l8-e1'].includes(exerciseId);
}

function selfAssessQualitative(exerciseId) {
    // La autoevaluación cualitativa no inventa una validación automática ni crea un intento nuevo.
    // Solo permite cerrar el ejercicio después de que el alumno revisó la solución.
    const state = getLearningState(exerciseId);
    if (state.attempts < 1 || (!state.solutionViewed && exerciseId !== 'l8-e1')) return;
    markExerciseDone(exerciseId);
}

function registerQualitativeAttempt(exerciseId) {
    const textareaSelectors = {
        'l5-e1': '#l5 textarea',
        'l6-e1': '#l6 textarea',
        'l7-e1': '#l7 textarea'
    };
    const textInput = textareaSelectors[exerciseId] ? document.querySelector(textareaSelectors[exerciseId]) : null;
    const answer = textInput ? textInput.value.trim() : '';
    if (!answer) return { ok: false, state: getLearningState(exerciseId) };
    const state = recordAttempt(exerciseId, false, answer);
    renderExerciseLearningUI(exerciseId);
    return { ok: true, state };
}

// L1 Práctica
function checkL1() {
    const exerciseId = 'l1-e1';
    const m = parseFloat(document.getElementById('l1-meta').value);
    const e = parseFloat(document.getElementById('l1-eco').value);
    const a = parseFloat(document.getElementById('l1-app').value);
    const w = parseFloat(document.getElementById('l1-wa').value);
    const c = parseFloat(document.getElementById('l1-cc').value);
    const fb = document.getElementById('feedback-l1');

    const correct = isCorrect(m, 9000000) && isCorrect(e, 4500000) && isCorrect(a, 2700000) &&
        isCorrect(w, 900000) && isCorrect(c, 900000);
    const state = recordAttempt(exerciseId, correct, { m, e, a, w, c });
    if (correct) {
        fb.innerHTML = '<div class="success-box">¡Correctos! Calculaste las cifras exactas. Revisa el desglose original completo.</div>';
        markExerciseDone('l1-e1');
        revealSolution('sol-l1', exerciseId);
    } else {
        diagnoseAndRenderFeedback(exerciseId, { m, e, a, w, c }, fb);
    }
}

// L1 Reto
function checkL1Reto() {
    const exerciseId = 'l1-e2';
    const e = parseFloat(document.getElementById('l1-reto-enero').value);
    const n = parseFloat(document.getElementById('l1-reto-nov').value);
    const fb = document.getElementById('feedback-l1-reto');

    const correct = isCorrect(e, 8400000) && isCorrect(n, 14400000);
    const state = recordAttempt(exerciseId, correct, { e, n });
    if (correct) {
        fb.innerHTML = '<div class="success-box">¡Correcto! Respetaste el peso histórico de cada mes usando cifras exactas.</div>';
        markExerciseDone('l1-e2');
        revealSolution('sol-l1-reto', exerciseId);
    } else {
        diagnoseAndRenderFeedback(exerciseId, { e, n }, fb);
    }
}

// L2 Práctica
function checkL2Practica() {
    const exerciseId = 'l2-e1';
    const c = parseFloat(document.getElementById('l2-p-cump').value);
    const t = parseFloat(document.getElementById('l2-p-tiempo').value);
    const p = parseFloat(document.getElementById('l2-p-pacing').value);
    const r = parseFloat(document.getElementById('l2-p-run').value);
    const f = parseFloat(document.getElementById('l2-p-fore').value);
    const tr = parseFloat(document.getElementById('l2-p-target').value);
    const fb = document.getElementById('feedback-l2-p');

    const correct = isCorrect(c, 40) && isCorrect(t, 50) && isCorrect(p, -10) &&
        (isCorrect(r, 266666.67, 100) || isCorrect(r, 266667, 100)) &&
        isCorrect(f, 8000000, 10) && isCorrect(tr, 400000);
    const state = recordAttempt(exerciseId, correct, { c, t, p, r, f, tr });
    if (correct) {
        fb.innerHTML = '<div class="success-box">Bien hecho calculando con las cifras completas. Revisa la solución detallada abajo.</div>';
        markExerciseDone('l2-e1');
        revealSolution('sol-l2-p', exerciseId);
    } else {
        diagnoseAndRenderFeedback(exerciseId, { c, t, p, r, f, tr }, fb);
    }
}

// L2 Reto
function checkL2Reto() {
    const exerciseId = 'l2-e2';
    const c = parseFloat(document.getElementById('l2-r-cump').value);
    const tr = parseFloat(document.getElementById('l2-r-target').value);
    const fb = document.getElementById('feedback-l2-r');

    const correct = isCorrect(c, 54.7, 0.5) && isCorrect(tr, 680000, 10);
    const state = recordAttempt(exerciseId, correct, { c, tr });
    if (correct) {
        fb.innerHTML = '<div class="success-box">¡Cálculos precisos! Lee el análisis completo a continuación.</div>';
        markExerciseDone('l2-e2');
        revealSolution('sol-l2-r', exerciseId);
    } else {
        diagnoseAndRenderFeedback(exerciseId, { c, tr }, fb);
    }
}

// L3 Reto
function checkL3Reto() {
    const exerciseId = 'l3-e1';
    const va = parseFloat(document.getElementById('l3-va').value);
    const vb = parseFloat(document.getElementById('l3-vb').value);
    const ra = parseFloat(document.getElementById('l3-rpsa').value);
    const rb = parseFloat(document.getElementById('l3-rpsb').value);
    const fb = document.getElementById('feedback-l3');

    const correct = isCorrect(va, 9000000) && isCorrect(vb, 8379000) && isCorrect(ra, 45) && isCorrect(rb, 39.9, 0.5);
    const state = recordAttempt(exerciseId, correct, { va, vb, ra, rb });
    if (correct) {
        fb.innerHTML = '<div class="success-box">¡Correcto! Lee la interpretación final.</div>';
        markExerciseDone('l3-e1');
        revealSolution('sol-l3', exerciseId);
    } else {
        diagnoseAndRenderFeedback(exerciseId, { va, vb, ra, rb }, fb);
    }
}

// L4 Reto
function checkL4() {
    const exerciseId = 'l4-e1';
    const e_rps = parseFloat(document.getElementById('l4-em-rps').value);
    const fb = document.getElementById('feedback-l4');

    const correct = isCorrect(e_rps, 200);
    const state = recordAttempt(exerciseId, correct, { e_rps });
    if (correct) {
        fb.innerHTML = '<div class="success-box">¡Cálculo correcto! Compara tus respuestas cualitativas.</div>';
        markExerciseDone('l4-e1');
        revealSolution('sol-l4', exerciseId);
    } else {
        diagnoseAndRenderFeedback(exerciseId, { e_rps }, fb);
    }
}

// Ejercicios cualitativos: no evaluamos lenguaje natural automáticamente.
// Registrar respuesta crea un intento fallido/pendiente; la solución y la autoevaluación quedan separadas.
function checkQualitative(exerciseId, solutionId) {
    const result = registerQualitativeAttempt(exerciseId);
    const fb = document.querySelector(`#${solutionId.replace('sol-', 'feedback-')}`);
    if (!result.ok) {
        if (fb) fb.innerHTML = '<div class=\"error-box\">Escribe primero tu respuesta y vuelve a intentarlo.</div>';
        return;
    }
    if (fb) {
        const diagnostic = { type: 'unknown', confidence: 'low' };
        const feedback = 'No podemos determinar el tipo de error de una respuesta libre de forma automática. Revisa los criterios, utiliza una pista y compara tu razonamiento con la solución.';
        recordErrorDiagnosis(exerciseId, diagnostic, feedback);
        fb.innerHTML = `<div class=\"error-box\"><strong>❌ Autoevaluación pendiente.</strong><br>${feedback}</div>`;
        fb.setAttribute('aria-live', 'polite');
    }
}

function checkL5() { checkQualitative('l5-e1', 'sol-l5'); }
function checkL6() { checkQualitative('l6-e1', 'sol-l6'); }
function checkL7() { checkQualitative('l7-e1', 'sol-l7'); }
function checkL8() {
    const state = getLearningState('l8-e1');
    const textareas = document.querySelectorAll('#l8 textarea');
    const answer = Array.from(textareas).map(t => t.value.trim()).filter(Boolean).join('\n');
    if (!answer) return;
    recordAttempt('l8-e1', false, answer);
    renderExerciseLearningUI('l8-e1');
}

function initializeLearningUI() {
    const exerciseContainers = {
        'l1-e1':'feedback-l1', 'l1-e2':'feedback-l1-reto', 'l2-e1':'feedback-l2-p',
        'l2-e2':'feedback-l2-r', 'l3-e1':'feedback-l3', 'l4-e1':'feedback-l4',
        'l5-e1':'sol-l5', 'l6-e1':'sol-l6', 'l7-e1':'sol-l7', 'l8-e1':null
    };
    Object.entries(exerciseContainers).forEach(([exerciseId, anchorId]) => {
        const anchor = anchorId ? document.getElementById(anchorId) : document.getElementById('l8');
        if (!anchor) return;
        const host = document.createElement('div');
        host.className = 'learning-controls';
        host.dataset.learningControls = exerciseId;
        if (anchorId) anchor.parentNode.insertBefore(host, anchor);
        else anchor.appendChild(host);
        const savedState = getLearningState(exerciseId);
        const savedSolutionId = getSolutionId(exerciseId);
        if (savedState.solutionViewed && savedSolutionId) {
            const solutionEl = document.getElementById(savedSolutionId);
            if (solutionEl) solutionEl.classList.add('show');
        }
        renderExerciseLearningUI(exerciseId);
    });

    // Las acciones originales de ejercicios cualitativos pasan a registrar respuesta, no a revelar solución.
    const qualitativeButtons = {
        'l1-e2': ['l1-reto-enero'], 'l2-e2': ['l2-r-cump'], 'l3-e1': ['l3-va'],
        'l4-e1': ['l4-em-rps']
    };
    // Estos cuatro siguen teniendo validación numérica, por lo que no se modifican.
    void qualitativeButtons;
}

window.addEventListener('beforeunload', saveLearningState);

// Inicializa el estado visual al cargar
updateUI();
initializeLearningUI();

// API interna de evidencia expuesta solo para tests/regresión; no crea un motor paralelo.
globalThis.__fase5 = { concepts, EVIDENCE_STATES, EVIDENCE_STATE_LABELS, getExerciseConcepts, getConceptDefinition, getConceptEvidence, getEvidenceForLesson, syncConceptEvidence, rebuildConceptEvidence, deriveEvidenceState, getLearningState, recordAttempt, recordErrorDiagnosis, revealNextHint, markSolutionViewed, saveLearningState, loadLearningState, exerciseLearningState };

// Diagnóstico disponible para pruebas de desarrollo, sin modificar el flujo del alumno.
const pedagogicalModelValidation = validatePedagogicalModel();
if (!pedagogicalModelValidation.ok) {
    console.warn('Modelo pedagógico Fase 1 incompleto:', pedagogicalModelValidation);
}
