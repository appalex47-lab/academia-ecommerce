// CURSO DEMO — contenido de PRUEBA para demostrar que el motor aloja varios cursos. No es contenido real.
// Agregar un curso = agregar un archivo como este (datos, sin lógica) y cargarlo antes de script.js.
globalThis.COURSE_DEFINITIONS = (globalThis.COURSE_DEFINITIONS || []).concat([{
  id: 'curso-demo',
  title: 'Curso Demo (prueba del motor)',
  description: 'Curso mínimo de prueba para comprobar que la plataforma aloja varios cursos con el mismo motor. No es contenido real.',
  version: '0.1.0',
  status: 'active',
  category: 'Demostración',
  author: '',
  thumbnail: '',
  modules: [{ id: 'demo-m1', title: 'Módulo demo', lessonIds: ['demo-l1'] }],
  lessons: [{ id: 'demo-l1', title: 'Lección demo: ritmo de ventas', exercises: ['demo-e1', 'demo-e2'] }],
  concepts: {
    demo_run_rate: { id: 'demo_run_rate', name: 'Ritmo de ventas', description: 'Cuánto se vende en promedio por unidad de tiempo.', category: 'demostración', relatedConcepts: [] }
  },
  exercises: {
    'demo-e1': { hints: ['Divide el total vendido entre los días transcurridos.', '2.400 ÷ 3 = ?'], type: 'calculation', cognitiveLevel: 'calculate', difficulty: 1, concepts: ['demo_run_rate'] },
    'demo-e2': { hints: ['Una semana tiene 7 días: multiplica el ritmo diario por 7.'], type: 'interpretation', cognitiveLevel: 'interpret', difficulty: 2, concepts: ['demo_run_rate'] }
  },
  exerciseContent: {
    'demo-e1': {
      kind: 'numeric',
      prompt: 'Una tienda vendió $2.400 en 3 días. ¿Cuánto vende por día en promedio?',
      fields: [{ id: 'dia', label: 'Venta diaria ($)', answer: 800, tolerance: 0.5 }],
      successMessage: '¡Correcto! El ritmo es de $800 por día.',
      solution: ['$2.400 ÷ 3 días = $800 por día.']
    },
    'demo-e2': {
      kind: 'choice',
      prompt: 'Si la tienda mantiene $800 por día, ¿cuánto venderá en una semana?',
      options: [
        { id: 'a', text: '$2.400' },
        { id: 'b', text: '$5.600', correct: true },
        { id: 'c', text: '$8.000' }
      ],
      successMessage: '¡Correcto! $800 × 7 = $5.600.',
      solution: ['$800 por día × 7 días = $5.600 por semana.']
    }
  },
  lessonContent: {
    'demo-l1': {
      meta: { topic: 'Ritmo de ventas', level: 'Demostración', duration: '5 minutos' },
      blocks: [
        { type: 'heading', text: '1. ¿Qué es el ritmo de ventas?' },
        { type: 'paragraph', text: 'El ritmo de ventas es lo que se vende, en promedio, por cada día (o semana, o mes).' },
        { type: 'example', title: 'Ejemplo', text: 'Si una tienda vende $1.000 en 2 días, su ritmo es de $500 por día.' },
        { type: 'heading', text: '2. Practica' },
        { type: 'exercise', exerciseId: 'demo-e1' },
        { type: 'exercise', exerciseId: 'demo-e2' }
      ]
    }
  },
  cases: [],
  videos: {}
}]);
