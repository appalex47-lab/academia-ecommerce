# Cómo agregar un nuevo curso (por ejemplo "SQL")

**Forma recomendada: el backoffice.** Abre `index.html?editor=1` → Contenido → *Nuevo curso*, arma módulos, lecciones, conceptos y ejercicios con formularios, revisa la vista previa y pulsa *Exportar .js*. Luego sube el archivo a `content/courses/` y agrega el `<script>` (pasos 2 y 3 de abajo). Lo que sigue explica el formato por si prefieres escribirlo a mano.

Un curso nuevo es **contenido**, no lógica: no se toca el motor pedagógico (intentos, pistas, feedback, evidencia, repaso, dashboard, persistencia).

## 1. Crea el archivo del curso

`content/courses/sql.js` (copia `curso-demo.js` como punto de partida). Solo datos:

```js
globalThis.COURSE_DEFINITIONS = (globalThis.COURSE_DEFINITIONS || []).concat([{
  id: 'sql',                        // minúsculas, números y guiones; único
  title: 'SQL para analistas', description: '…', version: '1.0.0', status: 'active', // 'draft' lo oculta de Mis cursos
  category: 'Analítica', author: '', thumbnail: '',
  modules: [{ id: 'sql-m1', title: 'Módulo 1', lessonIds: ['sql-l1'] }],
  lessons: [{ id: 'sql-l1', title: 'Lección 1: SELECT', exercises: ['sql-e1'] }],
  concepts: { sql_select: { id: 'sql_select', name: 'SELECT', description: '…', category: 'consultas', relatedConcepts: [] } },
  exercises: { 'sql-e1': { hints: ['…'], type: 'calculation', cognitiveLevel: 'calculate', difficulty: 1, concepts: ['sql_select'] } },
  exerciseContent: { 'sql-e1': { kind: 'numeric', prompt: '…', fields: [{ id: 'r', label: 'Filas', answer: 3, tolerance: 0 }], solution: ['…'] } },
  lessonContent: { 'sql-l1': { meta: { topic: '…', level: '…', duration: '…' }, blocks: [
    { type: 'heading', text: '…' }, { type: 'paragraph', text: '…' }, { type: 'list', items: ['…'] },
    { type: 'example', title: 'Ejemplo', text: '…' }, { type: 'exercise', exerciseId: 'sql-e1' } ] } },
  cases: [], videos: {}
}]);
```

Bloques de lección: `heading`, `paragraph`, `list`, `example`, `exercise`. Ejercicios: `numeric` (campos con `answer` y `tolerance`) o `choice` (opciones, exactamente una con `correct: true`).

## 2. Cárgalo antes de `script.js`

En `index.html`, junto al del Demo:

```html
<script src="content/courses/sql.js"></script>
```

## 3. Reglas que valida el registry (si falla, el curso se omite y la consola dice por qué)

- `id` válido y único; título, versión y estado (`active | draft | archived`).
- Los **ids de lección y de ejercicio no pueden repetirse entre cursos** (son ids del DOM y de la evidencia). Usa un prefijo (`sql-l1`, `sql-e1`).
- Cada ejercicio de una lección debe tener metadatos (`exercises`), contenido (`exerciseContent`) y aparecer como bloque `exercise`.

## 4. Videos

Abre la app con `?editor=1` → **Contenido**: ya lista las lecciones del curso activo. Configura, descarga `videos.js` y reemplaza `content/videos.js`.

## 5. Verifica

Abre **Mis cursos** (aparece la tarjeta nueva) y corre los tests. El progreso del curso nuevo queda aislado del resto automáticamente.

## Qué NO hace falta

Duplicar el motor, tocar `index.html` (salvo el `<script>`), migrar datos ni agregar lógica de persistencia. Casos analíticos, evaluación final y pensamiento analítico siguen siendo opcionales (`cases: []` oculta el botón de evaluación y muestra un estado vacío).

## Límites actuales

Los cursos declarativos admiten ejercicios `numeric` y `choice`. Tipos con validación propia (como los del curso Analista) requieren agregar un tipo al renderizador, una sola vez, no por curso.
