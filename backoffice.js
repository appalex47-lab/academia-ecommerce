/* =====================================================================
   BACKOFFICE LOCAL · EDITOR DE CONTENIDO (Fase 15)
   Herramienta editorial sin servidor ni login (solo visible con ?editor=1). Crea y edita cursos
   DECLARATIVOS (módulos, lecciones, conceptos, ejercicios numeric y choice) y los guarda como
   borradores en este navegador (root.content.courseDrafts), separados del progreso del alumno.
   Publicar = exportar content/courses/<id>.js y subirlo al sitio.
   Se carga DESPUÉS de script.js y usa sus funciones globales (registry, h(), almacén, validador).
   No puede editar el curso integrado "analista-ecommerce" (HTML estático).
   ===================================================================== */
(function () {
    'use strict';
    const BO_TYPES = [['knowledge', 'Conocimiento'], ['calculation', 'Cálculo'], ['interpretation', 'Interpretación'], ['diagnosis', 'Diagnóstico'], ['hypothesis', 'Hipótesis'], ['recommendation', 'Recomendación'], ['case', 'Caso']];
    const BO_LEVELS = [['understand', 'Comprender'], ['calculate', 'Calcular'], ['interpret', 'Interpretar'], ['diagnose', 'Diagnosticar'], ['hypothesize', 'Formular hipótesis'], ['recommend', 'Recomendar'], ['case', 'Caso']];
    const BLOCK_LABELS = { heading: 'Título', paragraph: 'Párrafo', list: 'Lista', example: 'Ejemplo', exercise: 'Ejercicio' };
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const clone = o => JSON.parse(JSON.stringify(o));
    const nowIso = () => new Date().toISOString();

    // ------------------------------------------------------------------ utilidades puras
    function slugify(text, sep = '-') {
        const base = String(text == null ? '' : text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, sep).replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '').slice(0, 40);
        return base;
    }
    function nextId(prefix, taken) { let n = 1; while (taken.has(`${prefix}${n}`)) n++; return `${prefix}${n}`; }
    const lessonIdsOf = def => new Set(def.lessons.map(l => l.id));
    const exerciseIdsOf = def => new Set(Object.keys(def.exercises || {}));
    const isBuiltIn = id => id === DEFAULT_COURSE_ID;

    function blankExerciseContent(kind) {
        return kind === 'choice'
            ? { kind: 'choice', prompt: 'Escribe el enunciado.', options: [{ id: 'a', text: 'Opción A', correct: true }, { id: 'b', text: 'Opción B' }], successMessage: '¡Correcto!' }
            : { kind: 'numeric', prompt: 'Escribe el enunciado.', fields: [{ id: 'r1', label: 'Resultado', answer: 0, tolerance: 0 }], successMessage: '¡Correcto!' };
    }
    function blankExerciseMeta() { return { hints: [], type: 'calculation', cognitiveLevel: 'calculate', difficulty: 1, concepts: [] }; }
    function blankCourse(id, title) {
        return {
            id, title, description: '', version: '0.1.0', status: 'draft', category: '', author: '', thumbnail: '',
            modules: [{ id: `${id}-m1`, title: 'Módulo 1', lessonIds: [`${id}-l1`] }],
            lessons: [{ id: `${id}-l1`, title: 'Lección 1', exercises: [] }],
            concepts: {}, exercises: {}, exerciseContent: {}, exerciseTitles: {},
            lessonContent: { [`${id}-l1`]: { meta: { topic: '', level: '', duration: '' }, blocks: [{ type: 'heading', text: 'Título de la sección' }, { type: 'paragraph', text: 'Escribe aquí el contenido.' }] } },
            cases: [], videos: {}
        };
    }

    // ------------------------------------------------------------------ borradores
    function validateDraft(def) {
        const errors = [], warnings = [];
        try {
            if (!def || typeof def !== 'object') return { errors: ['curso inválido'], warnings };
            def = normalizeDefinition(clone(def)); // valida lo que se guardará (lesson.exercises sigue a los bloques)
            if (isBuiltIn(def.id)) errors.push('el curso integrado no se puede editar aquí');
            if (def.lessonContent === undefined) errors.push('el curso no es declarativo (falta lessonContent)');
            const check = COURSE_REGISTRY.checkRegistration(def, { ignoreId: def.id });
            if (!check.ok) errors.push(...check.reasons);
            const inModule = new Set((def.modules || []).flatMap(m => m.lessonIds || []));
            (def.lessons || []).forEach(l => { if (!inModule.has(l.id)) warnings.push(`la lección «${l.title}» no está en ningún módulo`); });
            (def.modules || []).forEach(m => { if (!(m.lessonIds || []).length) warnings.push(`el módulo «${m.title}» no tiene lecciones`); });
            const used = new Set(Object.values(def.exercises || {}).flatMap(e => e.concepts || []));
            Object.values(def.concepts || {}).forEach(c => { if (!used.has(c.id)) warnings.push(`el concepto «${c.name}» no se practica en ningún ejercicio`); });
            if (!Object.keys(def.exercises || {}).length) warnings.push('el curso todavía no tiene ejercicios');
        } catch (error) { errors.push('estructura inválida: ' + error.message); }
        return { errors, warnings };
    }
    // Limpia campos opcionales vacíos y recalcula lesson.exercises según el orden de los bloques.
    function normalizeDefinition(def) {
        // La secuencia que recorre el alumno es course.lessons: debe seguir el orden de módulos y lecciones del editor.
        const byId = new Map(def.lessons.map(l => [l.id, l])), seen = new Set(), ordered = [];
        def.modules.forEach(m => m.lessonIds.forEach(id => { if (byId.has(id) && !seen.has(id)) { seen.add(id); ordered.push(byId.get(id)); } }));
        def.lessons.forEach(l => { if (!seen.has(l.id)) { seen.add(l.id); ordered.push(l); } });
        def.lessons = ordered;
        // El orden de navegación del curso (def.lessons) sigue el orden de los módulos; las lecciones sin módulo van al final.
        const order = def.modules.flatMap(m => m.lessonIds);
        const rank = id => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
        def.lessons = def.lessons.map((l, i) => ({ l, i })).sort((x, y) => rank(x.l.id) - rank(y.l.id) || x.i - y.i).map(x => x.l);
        def.lessons.forEach(l => {
            const content = def.lessonContent && def.lessonContent[l.id];
            if (content) l.exercises = content.blocks.filter(b => b.type === 'exercise').map(b => b.exerciseId);
        });
        Object.values(def.exerciseContent || {}).forEach(e => {
            if (Array.isArray(e.solution)) { e.solution = e.solution.map(t => String(t).trim()).filter(Boolean); if (!e.solution.length) delete e.solution; }
            ['successMessage', 'errorMessage'].forEach(k => { if (typeof e[k] === 'string' && !e[k].trim()) delete e[k]; });
        });
        Object.values(def.exercises || {}).forEach(e => { if (Array.isArray(e.hints)) e.hints = e.hints.map(t => String(t).trim()).filter(Boolean); });
        Object.keys(def.exerciseTitles || {}).forEach(k => { if (!String(def.exerciseTitles[k]).trim()) delete def.exerciseTitles[k]; });
        return def;
    }
    function draftEntry(id) { const d = readCourseDrafts(); return has(d, id) ? d[id] : null; }
    // Pendiente = hay una revisión que no se ha exportado (contador, no reloj: dos acciones en el mismo milisegundo no se confunden).
    function isPending(entry) { return Boolean(entry && (entry.exportedRevision == null || entry.exportedRevision !== entry.revision)); }
    function saveDraft(def) {
        if (!def || typeof def.id !== 'string' || !COURSE_ID_PATTERN.test(def.id)) return { ok: false, reason: 'id' };
        if (isBuiltIn(def.id)) return { ok: false, reason: 'builtin' };
        const previous = draftEntry(def.id);
        const stored = normalizeDefinition(clone(def));
        try { writeCourseDraftEntry(def.id, { definition: stored, updatedAt: nowIso(), revision: (previous && previous.revision || 0) + 1, exportedRevision: previous && previous.exportedRevision != null ? previous.exportedRevision : null, exportedAt: previous ? previous.exportedAt || null : null }); }
        catch (error) { return { ok: false, reason: 'storage' }; }
        const validation = validateDraft(stored);
        if (!validation.errors.length) COURSE_REGISTRY.upsert(clone(stored));
        return { ok: true, validation };
    }
    function markExported(id) {
        const entry = draftEntry(id); if (!entry) return false;
        try { writeCourseDraftEntry(id, { ...entry, exportedAt: nowIso(), exportedRevision: entry.revision }); return true; } catch (error) { return false; }
    }
    function deleteDraft(id) {
        if (!draftEntry(id)) return { ok: false };
        const published = PUBLISHED_COURSE_DEFINITIONS[id];
        if (activeCourseId === id && !published) setActiveCourse(DEFAULT_COURSE_ID);
        try { writeCourseDraftEntry(id, undefined); } catch (error) { return { ok: false }; }
        if (published) { COURSE_REGISTRY.upsert(published); if (activeCourseId === id) setActiveCourse(id, { force: true }); }
        else COURSE_REGISTRY.remove(id);
        return { ok: true, restoredPublished: Boolean(published) };
    }
    function getWorkingDefinition(id) {
        const entry = draftEntry(id); if (entry) return clone(entry.definition);
        const c = COURSE_REGISTRY.get(id); return c && c.lessonContent ? clone(c) : null;
    }
    function createCourse(id, title) {
        const cleanTitle = String(title || '').trim();
        if (!COURSE_ID_PATTERN.test(id || '') || isBuiltIn(id)) return { ok: false, reason: 'id' };
        if (!cleanTitle) return { ok: false, reason: 'title' };
        if (COURSE_REGISTRY.has(id) || draftEntry(id)) return { ok: false, reason: 'exists' };
        const saved = saveDraft(blankCourse(id, cleanTitle));
        return saved.ok ? { ok: true, id } : saved;
    }
    function duplicateCourse(sourceId, newId, newTitle) {
        if (!COURSE_ID_PATTERN.test(newId || '') || isBuiltIn(newId)) return { ok: false, reason: 'id' };
        if (COURSE_REGISTRY.has(newId) || draftEntry(newId)) return { ok: false, reason: 'exists' };
        const src = getWorkingDefinition(sourceId); if (!src) return { ok: false, reason: 'source' };
        const lessonMap = {}, exMap = {}; let e = 0;
        src.lessons.forEach((l, i) => { lessonMap[l.id] = `${newId}-l${i + 1}`; (l.exercises || []).forEach(x => { exMap[x] = `${newId}-e${++e}`; }); });
        const out = { ...src, id: newId, title: String(newTitle || `${src.title} (copia)`).trim(), status: 'draft', videos: {} };
        out.modules = src.modules.map((m, i) => ({ ...m, id: `${newId}-m${i + 1}`, lessonIds: m.lessonIds.map(id => lessonMap[id]).filter(Boolean) }));
        out.lessons = src.lessons.map(l => ({ ...l, id: lessonMap[l.id], exercises: (l.exercises || []).map(x => exMap[x]) }));
        out.lessonContent = {};
        src.lessons.forEach(l => { const c = clone(src.lessonContent[l.id]); c.blocks.forEach(b => { if (b.type === 'exercise') b.exerciseId = exMap[b.exerciseId]; }); out.lessonContent[lessonMap[l.id]] = c; });
        ['exercises', 'exerciseContent', 'exerciseTitles'].forEach(k => { out[k] = {}; Object.keys(src[k] || {}).forEach(x => { if (exMap[x]) out[k][exMap[x]] = clone(src[k][x]); }); });
        const saved = saveDraft(out);
        return saved.ok ? { ok: true, id: newId } : saved;
    }

    // ------------------------------------------------------------------ exportar / importar / respaldo
    function buildCourseScript(def) {
        return `// CURSO «${String(def.title).replace(/[\r\n]+/g, ' ')}» — generado por el editor de contenido.\n// Guárdalo como content/courses/${def.id}.js y cárgalo en index.html antes de script.js.\n` +
            `globalThis.COURSE_DEFINITIONS = (globalThis.COURSE_DEFINITIONS || []).concat([${JSON.stringify(def, null, 2)}]);\n`;
    }
    function parseCourseImport(text, filename = '') {
        const raw = String(text == null ? '' : text).replace(/^\uFEFF/, '').trim();
        if (!raw) return { ok: false, error: 'El archivo está vacío.' };
        try {
            let data;
            if (raw[0] === '{' || raw[0] === '[') data = JSON.parse(raw);
            else {
                const m = raw.replace(/^\s*\/\/.*$/gm, '').match(/COURSE_DEFINITIONS[\s\S]*?\.concat\(\s*(\[[\s\S]*\])\s*\)\s*;?\s*$/);
                if (!m) return { ok: false, error: 'No reconocimos el formato. Importa un archivo generado por este editor (.js o .json).' };
                data = JSON.parse(m[1]);
            }
            if (data && data.kind === 'plataforma-backoffice') return { ok: true, backup: data, courses: [] };
            const list = Array.isArray(data) ? data : [data];
            if (!list.length || list.some(c => !c || typeof c !== 'object' || typeof c.id !== 'string')) return { ok: false, error: 'El archivo no contiene cursos válidos.' };
            return { ok: true, courses: list };
        } catch (error) { return { ok: false, error: 'El archivo no se pudo leer: ' + error.message.slice(0, 80) }; }
    }
    function importCourses(courses) {
        const imported = [], skipped = [];
        courses.forEach(def => {
            if (!COURSE_ID_PATTERN.test(def.id) || isBuiltIn(def.id) || def.lessonContent === undefined) { skipped.push(def.id); return; }
            const saved = saveDraft(def);
            if (saved.ok) imported.push(def.id); else skipped.push(def.id);
        });
        return { imported, skipped };
    }
    function buildBackup() {
        const drafts = readCourseDrafts(), courses = {}, videos = {};
        Object.keys(drafts).forEach(id => { if (drafts[id] && drafts[id].definition) courses[id] = drafts[id].definition; });
        COURSE_REGISTRY.list().forEach(c => { const v = localVideos(c.id); if (Object.keys(v).length) videos[c.id] = v; });
        return { kind: 'plataforma-backoffice', version: 1, exportedAt: nowIso(), courses, videos };
    }
    function restoreBackup(backup) {
        if (!backup || backup.kind !== 'plataforma-backoffice' || backup.version !== 1) return { ok: false, error: 'No es un respaldo de este editor.' };
        const result = importCourses(Object.values(backup.courses || {}));
        let videoCount = 0;
        Object.keys(backup.videos || {}).forEach(courseId => {
            if (!COURSE_ID_PATTERN.test(courseId) || !COURSE_REGISTRY.has(courseId)) return;
            const entries = backup.videos[courseId];
            if (!entries || typeof entries !== 'object') return;
            Object.keys(entries).forEach(lessonId => {
                if (lessonId === '__proto__' || !/^[A-Za-z0-9_-]{1,80}$/.test(lessonId)) return;
                const clean = sanitizeVideoEntry(entries[lessonId]);
                if (clean) { try { setLocalVideo(courseId, lessonId, clean); videoCount++; } catch (error) { /* almacén no escribible */ } }
            });
        });
        return { ok: true, ...result, videoCount };
    }
    function pendingExports() { const d = readCourseDrafts(); return Object.keys(d).filter(id => isPending(d[id])); }
    function listCourseRecords() {
        const drafts = readCourseDrafts();
        return COURSE_REGISTRY.list().map(c => {
            const entry = has(drafts, c.id) ? drafts[c.id] : null;
            const origin = isBuiltIn(c.id) ? 'builtin' : entry ? (PUBLISHED_COURSE_DEFINITIONS[c.id] ? 'modified' : 'draft') : 'published';
            return { id: c.id, title: c.title, status: c.status, origin, editable: !isBuiltIn(c.id) && Boolean(c.lessonContent), hasDraft: Boolean(entry), pending: isPending(entry) };
        }).concat(Object.keys(drafts).filter(id => !COURSE_REGISTRY.has(id)).map(id => ({ id, title: (drafts[id].definition || {}).title || id, status: (drafts[id].definition || {}).status || 'draft', origin: 'invalid', editable: true, hasDraft: true, pending: isPending(drafts[id]) })));
    }

    // ------------------------------------------------------------------ operaciones sobre una definición
    const ops = {
        addModule(def, title) { const id = nextId(`${def.id}-m`, new Set(def.modules.map(m => m.id))); def.modules.push({ id, title: title || `Módulo ${def.modules.length + 1}`, lessonIds: [] }); return id; },
        removeModule(def, id) { const m = def.modules.find(x => x.id === id); if (!m || m.lessonIds.length) return false; def.modules = def.modules.filter(x => x.id !== id); return true; },
        addLesson(def, moduleId, title) {
            const id = nextId(`${def.id}-l`, lessonIdsOf(def)), m = def.modules.find(x => x.id === moduleId); if (!m) return null;
            def.lessons.push({ id, title: title || `Lección ${def.lessons.length + 1}`, exercises: [] });
            def.lessonContent[id] = { meta: { topic: '', level: '', duration: '' }, blocks: [{ type: 'paragraph', text: 'Escribe aquí el contenido.' }] };
            m.lessonIds.push(id); return id;
        },
        removeLesson(def, id) {
            if (def.lessons.length <= 1 || !def.lessons.some(l => l.id === id)) return false;
            (def.lessonContent[id] ? def.lessonContent[id].blocks : []).forEach(b => { if (b.type === 'exercise') ops.dropExercise(def, b.exerciseId); });
            def.lessons = def.lessons.filter(l => l.id !== id); delete def.lessonContent[id];
            def.modules.forEach(m => { m.lessonIds = m.lessonIds.filter(x => x !== id); }); return true;
        },
        move(list, index, dir) { const j = index + dir; if (j < 0 || j >= list.length) return false; [list[index], list[j]] = [list[j], list[index]]; return true; },
        moveLessonToModule(def, lessonId, moduleId) { const to = def.modules.find(m => m.id === moduleId); if (!to) return false; def.modules.forEach(m => { m.lessonIds = m.lessonIds.filter(x => x !== lessonId); }); to.lessonIds.push(lessonId); return true; },
        addConcept(def, name, description = '', category = '') {
            const base = slugify(name, '_') || 'concepto'; const taken = new Set(Object.keys(def.concepts)); let id = base, n = 2;
            while (taken.has(id)) id = `${base}_${n++}`;
            def.concepts[id] = { id, name: String(name || 'Concepto').trim(), description, category, relatedConcepts: [] }; return id;
        },
        removeConcept(def, id) { if (Object.values(def.exercises).some(e => (e.concepts || []).includes(id))) return false; delete def.concepts[id]; return true; },
        addBlock(def, lessonId, type) {
            const content = def.lessonContent[lessonId]; if (!content) return null;
            if (type === 'exercise') {
                const id = nextId(`${def.id}-e`, exerciseIdsOf(def));
                def.exercises[id] = blankExerciseMeta(); def.exerciseContent[id] = blankExerciseContent('numeric');
                content.blocks.push({ type: 'exercise', exerciseId: id }); return id;
            }
            content.blocks.push(type === 'list' ? { type, items: ['Elemento'] } : type === 'example' ? { type, title: 'Ejemplo', text: 'Describe el ejemplo.' } : { type, text: type === 'heading' ? 'Nuevo título' : 'Nuevo párrafo.' });
            return content.blocks.length - 1;
        },
        dropExercise(def, id) { delete def.exercises[id]; delete def.exerciseContent[id]; if (def.exerciseTitles) delete def.exerciseTitles[id]; },
        removeBlock(def, lessonId, index) {
            const content = def.lessonContent[lessonId], b = content && content.blocks[index]; if (!b) return false;
            if (b.type === 'exercise') ops.dropExercise(def, b.exerciseId);
            content.blocks.splice(index, 1); return true;
        },
        setExerciseKind(def, id, kind) {
            const old = def.exerciseContent[id]; if (!old || old.kind === kind) return false;
            const fresh = blankExerciseContent(kind); fresh.prompt = old.prompt; if (old.solution) fresh.solution = old.solution; if (old.successMessage) fresh.successMessage = old.successMessage; if (old.errorMessage) fresh.errorMessage = old.errorMessage;
            def.exerciseContent[id] = fresh; return true;
        },
        addField(def, id) { const e = def.exerciseContent[id]; if (!e || e.kind !== 'numeric') return false; e.fields.push({ id: nextId('r', new Set(e.fields.map(f => f.id))), label: `Resultado ${e.fields.length + 1}`, answer: 0, tolerance: 0 }); return true; },
        removeField(def, id, index) { const e = def.exerciseContent[id]; if (!e || e.kind !== 'numeric' || e.fields.length <= 1) return false; e.fields.splice(index, 1); return true; },
        addOption(def, id) { const e = def.exerciseContent[id]; if (!e || e.kind !== 'choice') return false; e.options.push({ id: nextId('o', new Set(e.options.map(o => o.id))), text: `Opción ${e.options.length + 1}` }); return true; },
        removeOption(def, id, index) {
            const e = def.exerciseContent[id]; if (!e || e.kind !== 'choice' || e.options.length <= 2) return false;
            const wasCorrect = e.options[index].correct === true; e.options.splice(index, 1); if (wasCorrect) e.options[0].correct = true; return true;
        },
        setCorrectOption(def, id, optionId) { const e = def.exerciseContent[id]; if (!e || e.kind !== 'choice') return false; e.options.forEach(o => { if (o.id === optionId) o.correct = true; else delete o.correct; }); return true; }
    };

    // ------------------------------------------------------------------ API pública (también para pruebas)
    globalThis.__backoffice = { slugify, nextId, blankCourse, blankExerciseContent, blankExerciseMeta, validateDraft, normalizeDefinition, saveDraft, markExported, deleteDraft, getWorkingDefinition, createCourse, duplicateCourse, buildCourseScript, parseCourseImport, importCourses, buildBackup, restoreBackup, pendingExports, listCourseRecords, ops, isPending, BO_TYPES, BO_LEVELS };
    globalThis.__backofficeInternals = { has, clone, BLOCK_LABELS, draftEntry };
})();

/* ======================================================================
   INTERFAZ DEL BACKOFFICE (pestañas Cursos / Videos y editor de curso)
   ====================================================================== */
(function () {
    'use strict';
    const B = globalThis.__backoffice, { has, clone, BLOCK_LABELS, draftEntry } = globalThis.__backofficeInternals, ops = B.ops;
    const BO = { tab: 'cursos', courseId: null, view: 'datos', lessonId: null, exerciseId: null, preview: false, notice: '', noticeKind: 'ok', work: null, videoCourseId: null, newOpen: false };
    let saveTimer = null;
    const ORIGIN_LABELS = { builtin: 'Integrado (no editable)', published: 'Publicado', modified: 'Publicado + cambios locales', draft: 'Borrador local', invalid: 'Borrador con errores' };
    const STATUS_LABELS = { active: 'Activo', draft: 'Borrador', archived: 'Archivado' };

    // ---- componentes de formulario (todo texto del usuario va por value/textContent, nunca como HTML) ----
    const btn = (label, onClick, cls = 'action-btn secondary', attrs = {}) => h('button', { type: 'button', class: cls, onclick: onClick, ...attrs }, label);
    const field = (label, control, hint, wide) => h('label', { class: `bo-field${wide ? ' bo-wide' : ''}` }, h('span', { class: 'bo-label', text: label }), control, hint ? h('small', { class: 'bo-hint', text: hint }) : null);
    function txt(value, onSet, attrs = {}) { const i = h('input', { type: 'text', value: value == null ? '' : String(value), autocomplete: 'off', ...attrs }); i.addEventListener('input', () => { onSet(i.value); saveSoon(); }); i.addEventListener('change', commitNow); return i; }
    function area(value, onSet, rows = 3, attrs = {}) { const t = h('textarea', { rows: String(rows), value: value == null ? '' : String(value), ...attrs }); t.addEventListener('input', () => { onSet(t.value); saveSoon(); }); t.addEventListener('change', commitNow); return t; }
    function num(value, onSet, attrs = {}) { const i = h('input', { type: 'number', step: 'any', value: Number.isFinite(value) ? String(value) : '', ...attrs }); i.addEventListener('input', () => { onSet(i.value === '' ? NaN : parseFloat(i.value)); saveSoon(); }); i.addEventListener('change', commitNow); return i; }
    function sel(options, value, onSet, attrs = {}) { const s = h('select', attrs, options.map(([v, l]) => h('option', { value: String(v), selected: String(v) === String(value) }, l))); s.addEventListener('change', () => { onSet(s.value); }); return s; }
    const ask = msg => (typeof window.confirm === 'function' ? window.confirm(msg) : true);
    function downloadText(name, text, type) {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    function setNotice(text, kind = 'ok') { BO.notice = text; BO.noticeKind = kind; }

    // ---- guardado ----
    function persist() { const saved = B.saveDraft(BO.work); if (!saved.ok) { setNotice('No pudimos guardar el borrador en este navegador.', 'error'); } return saved; }
    function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(commitNow, 500); }
    function commitNow() { clearTimeout(saveTimer); if (!BO.work) return; persist(); refreshStatus(); }
    function commitStructural() { clearTimeout(saveTimer); if (BO.work) persist(); render(); }

    // ---- ayudas ----
    function uniqueCourseId(base) {
        let id = B.slugify(base) || 'curso'; if (!COURSE_ID_PATTERN.test(id) || id === DEFAULT_COURSE_ID) id = 'curso-nuevo';
        let n = 2, candidate = id; while (COURSE_REGISTRY.has(candidate) || draftEntry(candidate) || candidate === DEFAULT_COURSE_ID) candidate = `${id}-${n++}`;
        return candidate;
    }
    function readFile(file, cb) {
        if (!file) return;
        const r = new FileReader(); r.onload = () => cb(String(r.result), file.name);
        r.onerror = () => { setNotice('No se pudo leer el archivo.', 'error'); render(); }; r.readAsText(file);
    }
    function openAsStudent(def) {
        const v = B.validateDraft(def);
        if (v.errors.length) { setNotice('Corrige los problemas antes de abrir el curso como alumno.', 'error'); render(); return; }
        if (def.status !== 'active') { setNotice('Cambia el estado a «Activo» para abrirlo como alumno.', 'error'); render(); return; }
        COURSE_REGISTRY.upsert(B.normalizeDefinition(clone(def)));
        const r = setActiveCourse(def.id, { force: true });
        if (!r.ok) { setNotice('No se pudo abrir el curso.', 'error'); render(); return; }
        showView('course');
    }
    function exportCourse(def) {
        const v = B.validateDraft(def);
        if (v.errors.length) { setNotice('El curso tiene problemas: corrígelos para exportarlo.', 'error'); render(); return; }
        downloadText(`${def.id}.js`, B.buildCourseScript(def), 'text/javascript');
        B.markExported(def.id);
        setNotice(`Exportado ${def.id}.js. Guárdalo en content/courses/ y cárgalo en index.html antes de script.js.`);
    }

    // ---- punto de entrada ----
    function render() {
        const root = document.getElementById('content-panel'); if (!root) return;
        root.textContent = '';
        const pending = B.pendingExports();
        root.append(
            h('h2', { text: 'Editor de contenido', tabindex: '-1' }),
            h('p', { class: 'bo-banner', id: 'bo-banner', role: 'status', hidden: pending.length === 0, text: pending.length ? `Cambios sin exportar en: ${pending.join(', ')}. Los borradores viven solo en este navegador: exporta o descarga un respaldo.` : '' }),
            h('div', { class: 'bo-tabs', role: 'group', 'aria-label': 'Secciones del editor' },
                btn('Cursos', () => { BO.tab = 'cursos'; render(); }, 'bo-tab', { 'data-bo-tab': 'cursos', 'aria-pressed': String(BO.tab === 'cursos') }),
                btn('Videos', () => { BO.tab = 'videos'; render(); }, 'bo-tab', { 'data-bo-tab': 'videos', 'aria-pressed': String(BO.tab === 'videos') })),
            h('p', { class: 'bo-notice', id: 'bo-notice', role: 'status', 'aria-live': 'polite', 'data-kind': BO.noticeKind, text: BO.notice }));
        BO.notice = '';
        const body = h('div', { class: 'bo-body' }); root.append(body);
        if (BO.tab === 'videos') renderVideosTab(body);
        else if (BO.courseId && BO.work) renderCourseEditor(body);
        else renderCoursesTab(body);
    }

    // ---- pestaña Videos ----
    function renderVideosTab(root) {
        const courses = COURSE_REGISTRY.list();
        if (!BO.videoCourseId || !COURSE_REGISTRY.has(BO.videoCourseId)) BO.videoCourseId = COURSE_REGISTRY.has(activeCourseId) ? activeCourseId : courses[0].id;
        root.append(field('Curso', sel(courses.map(c => [c.id, c.title]), BO.videoCourseId, v => { BO.videoCourseId = v; render(); }, { id: 'bo-video-course' })));
        const host = h('div', { class: 'bo-videos' }); root.append(host);
        renderVideosAdmin(host, BO.videoCourseId);
    }

    // ---- pestaña Cursos ----
    function renderCoursesTab(root) {
        const tools = h('div', { class: 'bo-tools' },
            btn('Nuevo curso', () => { BO.newOpen = !BO.newOpen; render(); }, 'action-btn', { id: 'bo-new' }),
            h('label', { class: 'action-btn secondary bo-file' }, 'Importar curso…', h('input', { type: 'file', id: 'bo-import', accept: '.js,.json,application/json,text/javascript', class: 'sr-only', onchange: ev => { const f = ev.target.files[0]; ev.target.value = ''; readFile(f, handleImport); } })),
            btn('Descargar respaldo', () => { downloadText('respaldo-editor.json', JSON.stringify(B.buildBackup(), null, 2), 'application/json'); setNotice('Respaldo descargado (cursos y videos de este navegador).'); render(); }, 'action-btn secondary', { id: 'bo-backup' }),
            h('label', { class: 'action-btn secondary bo-file' }, 'Restaurar respaldo…', h('input', { type: 'file', id: 'bo-restore', accept: '.json,application/json', class: 'sr-only', onchange: ev => { const f = ev.target.files[0]; ev.target.value = ''; readFile(f, handleRestore); } })));
        root.append(tools);
        if (BO.newOpen) root.append(newCourseForm());
        root.append(h('div', { class: 'bo-list' }, B.listCourseRecords().map(courseCard)));
    }
    function newCourseForm() {
        let title = '', idEdited = false;
        const idInput = h('input', { type: 'text', id: 'bo-new-id', autocomplete: 'off', spellcheck: 'false' });
        const titleInput = h('input', { type: 'text', id: 'bo-new-title', autocomplete: 'off' });
        titleInput.addEventListener('input', () => { title = titleInput.value; if (!idEdited) idInput.value = uniqueCourseId(title); });
        idInput.addEventListener('input', () => { idEdited = true; });
        return h('div', { class: 'bo-card bo-new' },
            h('div', { class: 'bo-grid' }, field('Título del curso', titleInput), field('Identificador', idInput, 'Minúsculas, números y guiones. No se puede cambiar después.')),
            h('div', { class: 'bo-actions' },
                btn('Crear curso', () => {
                    const r = B.createCourse(idInput.value.trim(), titleInput.value);
                    if (!r.ok) { setNotice(r.reason === 'exists' ? 'Ya existe un curso con ese identificador.' : r.reason === 'title' ? 'Escribe un título.' : 'El identificador no es válido (minúsculas, números y guiones).', 'error'); render(); return; }
                    BO.newOpen = false; openEditor(r.id);
                }, 'action-btn', { id: 'bo-create' }),
                btn('Cancelar', () => { BO.newOpen = false; render(); })));
    }
    function courseCard(rec) {
        const def = rec.editable ? B.getWorkingDefinition(rec.id) : null;
        const problems = def ? B.validateDraft(def).errors.length : 0;
        const actions = [];
        if (rec.editable) {
            actions.push(btn('Editar', () => openEditor(rec.id), 'action-btn', { 'data-bo-edit': rec.id }));
            actions.push(btn('Duplicar', () => duplicate(rec), 'action-btn secondary', { 'data-bo-dup': rec.id }));
            actions.push(btn('Exportar .js', () => { exportCourse(def); render(); }, 'action-btn secondary', { 'data-bo-export': rec.id, disabled: problems > 0 || !def }));
            if (rec.status === 'active' && def && !problems) actions.push(btn('Abrir como alumno', () => openAsStudent(def), 'action-btn secondary', { 'data-bo-open': rec.id }));
        }
        if (rec.hasDraft) actions.push(btn(rec.origin === 'modified' ? 'Descartar cambios' : 'Eliminar curso', () => {
            if (!ask(rec.origin === 'modified' ? `¿Descartar tus cambios en «${rec.title}» y volver a la versión publicada?` : `¿Eliminar el curso «${rec.title}» de este navegador? El progreso de alumno que tenga se conserva.`)) return;
            B.deleteDraft(rec.id); setNotice('Listo.'); render();
        }, 'action-btn secondary', { 'data-bo-discard': rec.id }));
        return h('article', { class: 'bo-card', 'data-bo-course': rec.id },
            h('div', { class: 'bo-card-head' }, h('h3', { text: rec.title }),
                h('span', { class: 'bo-badge', text: ORIGIN_LABELS[rec.origin] || rec.origin }),
                h('span', { class: `bo-badge bo-badge-${rec.status}`, text: STATUS_LABELS[rec.status] || rec.status }),
                rec.pending ? h('span', { class: 'bo-badge bo-badge-pending', text: 'Cambios sin exportar' }) : null,
                problems ? h('span', { class: 'bo-badge bo-badge-error', text: `${problems} problema${problems === 1 ? '' : 's'}` }) : null),
            h('p', { class: 'bo-id', text: rec.id }),
            rec.origin === 'builtin' ? h('p', { class: 'bo-hint', text: 'Curso integrado: sus lecciones son HTML estático. Se puede usar, pero no editar desde aquí.' }) : null,
            actions.length ? h('div', { class: 'bo-actions' }, actions) : null);
    }
    function duplicate(rec) {
        const title = window.prompt('Título del curso nuevo', `${rec.title} (copia)`); if (title === null) return;
        const id = uniqueCourseId(title); const r = B.duplicateCourse(rec.id, id, title.trim() || `${rec.title} (copia)`);
        setNotice(r.ok ? `Curso duplicado como «${id}» (borrador).` : 'No se pudo duplicar el curso.', r.ok ? 'ok' : 'error'); render();
    }
    function handleImport(text, name) {
        const parsed = B.parseCourseImport(text, name);
        if (!parsed.ok) { setNotice(parsed.error, 'error'); render(); return; }
        if (parsed.backup) { setNotice('Ese archivo es un respaldo: usa «Restaurar respaldo…».', 'error'); render(); return; }
        const clashes = parsed.courses.map(c => c.id).filter(id => COURSE_REGISTRY.has(id) || draftEntry(id));
        if (clashes.length && !ask(`Ya existe: ${clashes.join(', ')}. ¿Reemplazarlo con el contenido del archivo?`)) return;
        const r = B.importCourses(parsed.courses);
        setNotice(`Importado: ${r.imported.join(', ') || 'nada'}${r.skipped.length ? ` · omitido: ${r.skipped.join(', ')}` : ''}.`, r.imported.length ? 'ok' : 'error'); render();
    }
    function handleRestore(text) {
        let data; try { data = JSON.parse(text); } catch (error) { setNotice('El archivo no es un respaldo válido.', 'error'); render(); return; }
        if (!data || data.kind !== 'plataforma-backoffice') { setNotice('El archivo no es un respaldo de este editor.', 'error'); render(); return; }
        const ids = Object.keys(data.courses || {}).filter(id => COURSE_REGISTRY.has(id) || draftEntry(id));
        if (ids.length && !ask(`El respaldo reemplazará: ${ids.join(', ')}. ¿Continuar?`)) return;
        const r = B.restoreBackup(data);
        setNotice(r.ok ? `Respaldo restaurado: ${r.imported.length} curso(s) y ${r.videoCount} video(s).` : r.error, r.ok ? 'ok' : 'error'); initLessonVideos(); render();
    }

    // ---- editor de curso ----
    function openEditor(id) {
        const def = B.getWorkingDefinition(id); if (!def) { setNotice('Ese curso no se puede editar.', 'error'); render(); return; }
        BO.tab = 'cursos'; BO.work = def; BO.courseId = id; BO.view = 'datos'; BO.lessonId = null; BO.exerciseId = null; BO.preview = false; render();
    }
    function closeEditor() { commitNow(); BO.work = null; BO.courseId = null; BO.preview = false; render(); }
    function go(view, extra = {}) { commitNow(); BO.view = view; BO.preview = false; Object.assign(BO, extra); render(); }

    function renderCourseEditor(root) {
        const def = BO.work;
        const subnav = [['datos', 'Datos'], ['estructura', 'Módulos y lecciones'], ['conceptos', 'Conceptos']];
        root.append(
            h('div', { class: 'bo-crumbs' }, btn('← Todos los cursos', closeEditor, 'action-btn secondary', { id: 'bo-back' }), h('strong', { id: 'bo-crumb-title', text: def.title }), h('span', { class: 'bo-id', text: def.id })),
            h('div', { class: 'bo-tabs', role: 'group', 'aria-label': 'Secciones del curso' }, subnav.map(([v, l]) => btn(l, () => go(v), 'bo-tab', { 'data-bo-view': v, 'aria-pressed': String(BO.view === v || (v === 'estructura' && (BO.view === 'lesson' || BO.view === 'exercise'))) }))));
        if (BO.view === 'datos') viewDatos(root, def);
        else if (BO.view === 'estructura') viewEstructura(root, def);
        else if (BO.view === 'conceptos') viewConceptos(root, def);
        else if (BO.view === 'lesson') viewLesson(root, def);
        else if (BO.view === 'exercise') viewExercise(root, def);
        const validation = h('section', { class: 'bo-validation', id: 'bo-validation', 'aria-live': 'polite' });
        root.append(validation, h('div', { class: 'bo-actions bo-footer' },
            btn('Exportar curso (.js)', () => { commitNow(); exportCourse(def); render(); }, 'action-btn', { id: 'bo-export' }),
            btn('Abrir como alumno', () => { commitNow(); openAsStudent(def); }, 'action-btn secondary', { id: 'bo-open' }),
            h('span', { class: 'bo-status', id: 'bo-status', role: 'status' })));
        refreshStatus();
    }
    function refreshStatus() {
        const def = BO.work; if (!def) return;
        const v = B.validateDraft(def), box = document.getElementById('bo-validation');
        if (box) {
            box.textContent = '';
            box.append(h('h3', { text: v.errors.length ? `Hay ${v.errors.length} problema${v.errors.length === 1 ? '' : 's'} que corregir` : 'Todo en orden: el curso es válido' }));
            if (v.errors.length) box.append(h('ul', { class: 'bo-errors' }, v.errors.map(e => h('li', { text: e }))));
            if (v.warnings.length) box.append(h('p', { class: 'bo-label', text: 'Avisos (no bloquean)' }), h('ul', { class: 'bo-warnings' }, v.warnings.map(w => h('li', { text: w }))));
            box.dataset.state = v.errors.length ? 'error' : 'ok';
        }
        const exp = document.getElementById('bo-export'); if (exp) exp.disabled = v.errors.length > 0;
        const entry = draftEntry(def.id), st = document.getElementById('bo-status');
        if (st) st.textContent = entry ? (B.isPending(entry) ? 'Guardado en este navegador · sin exportar' : 'Guardado y exportado') : '';
        const crumb = document.getElementById('bo-crumb-title'); if (crumb) crumb.textContent = def.title;
        const banner = document.getElementById('bo-banner'), pend = B.pendingExports();
        if (banner) { banner.hidden = pend.length === 0; banner.textContent = pend.length ? `Cambios sin exportar en: ${pend.join(', ')}. Los borradores viven solo en este navegador: exporta o descarga un respaldo.` : ''; }
    }

    function viewDatos(root, def) {
        root.append(h('div', { class: 'bo-card' }, h('div', { class: 'bo-grid' },
            field('Título', txt(def.title, v => { def.title = v; }, { id: 'bo-f-title' })),
            field('Identificador', h('input', { type: 'text', value: def.id, readonly: true, 'aria-readonly': 'true' }), 'No se puede cambiar: identifica el progreso del alumno.'),
            field('Estado', sel([['draft', 'Borrador (oculto para el alumno)'], ['active', 'Activo'], ['archived', 'Archivado']], def.status, v => { def.status = v; commitNow(); }, { id: 'bo-f-status' })),
            field('Categoría', txt(def.category, v => { def.category = v; })),
            field('Autor', txt(def.author, v => { def.author = v; })),
            field('Versión', txt(def.version, v => { def.version = v; })),
            field('Descripción', area(def.description, v => { def.description = v; }, 3, { id: 'bo-f-desc' }), 'Aparece en la tarjeta de «Mis cursos».', true))));
    }

    function viewEstructura(root, def) {
        const lessonOf = id => def.lessons.find(l => l.id === id);
        const lessonRow = (m, id, li) => {
            const l = lessonOf(id); if (!l) return null;
            const others = def.modules.filter(x => x.id !== m.id);
            return h('li', { class: 'bo-row', 'data-bo-lesson-row': id },
                txt(l.title, v => { l.title = v; }, { 'aria-label': `Título de la lección ${li + 1}` }),
                h('span', { class: 'bo-hint', text: `${(l.exercises || []).length} ejercicio(s)` }),
                h('div', { class: 'bo-mini' },
                    btn('↑', () => { ops.move(m.lessonIds, li, -1); commitStructural(); }, 'bo-icon', { 'aria-label': 'Subir lección', disabled: li === 0 }),
                    btn('↓', () => { ops.move(m.lessonIds, li, 1); commitStructural(); }, 'bo-icon', { 'aria-label': 'Bajar lección', disabled: li === m.lessonIds.length - 1 }),
                    others.length ? sel([['', 'Mover a…'], ...others.map(x => [x.id, x.title])], '', v => { if (v) { ops.moveLessonToModule(def, id, v); commitStructural(); } }, { 'aria-label': 'Mover la lección a otro módulo' }) : null,
                    btn('Editar lección', () => go('lesson', { lessonId: id }), 'action-btn', { 'data-bo-lesson': id }),
                    btn('Eliminar', () => { if (def.lessons.length <= 1) { setNotice('El curso necesita al menos una lección.', 'error'); render(); return; } if (ask(`¿Eliminar la lección «${l.title}» y sus ejercicios?`)) { ops.removeLesson(def, id); commitStructural(); } }, 'action-btn secondary', { 'data-bo-del-lesson': id })));
        };
        def.modules.forEach((m, mi) => {
            root.append(h('section', { class: 'bo-card', 'data-bo-module': m.id },
                h('div', { class: 'bo-card-head' },
                    field('Módulo', txt(m.title, v => { m.title = v; }, { 'aria-label': `Título del módulo ${mi + 1}` })),
                    h('div', { class: 'bo-mini' },
                        btn('↑', () => { ops.move(def.modules, mi, -1); commitStructural(); }, 'bo-icon', { 'aria-label': 'Subir módulo', disabled: mi === 0 }),
                        btn('↓', () => { ops.move(def.modules, mi, 1); commitStructural(); }, 'bo-icon', { 'aria-label': 'Bajar módulo', disabled: mi === def.modules.length - 1 }),
                        btn('Eliminar módulo', () => { if (!ops.removeModule(def, m.id)) { setNotice('Solo se puede eliminar un módulo vacío: mueve o elimina antes sus lecciones.', 'error'); render(); return; } commitStructural(); }, 'action-btn secondary', { 'data-bo-del-module': m.id }))),
                h('ul', { class: 'bo-rows' }, m.lessonIds.map((id, li) => lessonRow(m, id, li))),
                btn('Agregar lección', () => { const id = ops.addLesson(def, m.id); commitStructural(); go('lesson', { lessonId: id }); }, 'action-btn secondary', { 'data-bo-add-lesson': m.id })));
        });
        const orphans = def.lessons.filter(l => !def.modules.some(m => m.lessonIds.includes(l.id)));
        if (orphans.length) root.append(h('section', { class: 'bo-card' }, h('h3', { text: 'Lecciones sin módulo' }), h('ul', { class: 'bo-rows' }, orphans.map(l => h('li', { class: 'bo-row' }, h('span', { text: l.title }), def.modules.length ? sel([['', 'Asignar a módulo…'], ...def.modules.map(x => [x.id, x.title])], '', v => { if (v) { ops.moveLessonToModule(def, l.id, v); commitStructural(); } }) : null)))));
        root.append(btn('Agregar módulo', () => { ops.addModule(def); commitStructural(); }, 'action-btn', { id: 'bo-add-module' }));
    }

    function viewConceptos(root, def) {
        const usage = id => Object.values(def.exercises).filter(e => (e.concepts || []).includes(id)).length;
        const rows = Object.values(def.concepts).map(c => h('li', { class: 'bo-card', 'data-bo-concept': c.id },
            h('div', { class: 'bo-grid' },
                field('Nombre', txt(c.name, v => { c.name = v; }, { 'data-bo-concept-name': c.id })),
                field('Categoría', txt(c.category, v => { c.category = v; })),
                field('Descripción', area(c.description, v => { c.description = v; }, 2), '', true)),
            h('div', { class: 'bo-actions' }, h('span', { class: 'bo-hint', text: `${c.id} · usado en ${usage(c.id)} ejercicio(s)` }),
                btn('Eliminar', () => { if (!ops.removeConcept(def, c.id)) { setNotice('Ese concepto se usa en ejercicios: quítalo de ellos primero.', 'error'); render(); return; } commitStructural(); }, 'action-btn secondary', { 'data-bo-del-concept': c.id }))));
        const nameInput = h('input', { type: 'text', id: 'bo-concept-new', autocomplete: 'off' });
        root.append(
            h('p', { class: 'bo-hint', text: 'Los conceptos son las ideas que el curso enseña. Cada ejercicio se asocia a uno o más: así funcionan el dashboard, el repaso y la evidencia.' }),
            h('ul', { class: 'bo-rows' }, rows),
            h('div', { class: 'bo-card bo-new' }, field('Nuevo concepto', nameInput),
                btn('Agregar concepto', () => { if (!nameInput.value.trim()) return; ops.addConcept(def, nameInput.value); commitStructural(); }, 'action-btn', { id: 'bo-concept-add' })));
    }

    function viewLesson(root, def) {
        const lesson = def.lessons.find(l => l.id === BO.lessonId), content = lesson && def.lessonContent[lesson.id];
        if (!lesson || !content) { BO.view = 'estructura'; return viewEstructura(root, def); }
        content.meta = content.meta || {};
        root.append(
            h('div', { class: 'bo-crumbs' }, btn('← Módulos y lecciones', () => go('estructura'), 'action-btn secondary', { id: 'bo-back-structure' }), h('strong', { text: lesson.title })),
            h('div', { class: 'bo-card' }, h('div', { class: 'bo-grid' },
                field('Título de la lección', txt(lesson.title, v => { lesson.title = v; }, { id: 'bo-l-title' })),
                field('Tema', txt(content.meta.topic, v => { content.meta.topic = v; })),
                field('Nivel', txt(content.meta.level, v => { content.meta.level = v; })),
                field('Duración estimada', txt(content.meta.duration, v => { content.meta.duration = v; })))));
        const blocks = content.blocks.map((b, i) => {
            let body;
            if (b.type === 'heading') body = field('Texto del título', txt(b.text, v => { b.text = v; }, { 'data-bo-block-text': i }));
            else if (b.type === 'paragraph') body = field('Texto', area(b.text, v => { b.text = v; }, 4, { 'data-bo-block-text': i }));
            else if (b.type === 'example') body = h('div', { class: 'bo-grid' }, field('Título del ejemplo', txt(b.title, v => { b.title = v; })), field('Texto', area(b.text, v => { b.text = v; }, 3, { 'data-bo-block-text': i }), '', true));
            else if (b.type === 'list') body = field('Elementos (uno por línea)', area((b.items || []).join('\n'), v => { b.items = v.split('\n'); }, 4, { 'data-bo-block-text': i }));
            else { const ec = def.exerciseContent[b.exerciseId] || {}; body = h('div', { class: 'bo-exercise-summary' }, h('p', { text: ec.prompt || '(sin enunciado)' }), h('span', { class: 'bo-hint', text: `${b.exerciseId} · ${ec.kind === 'choice' ? 'Opción múltiple' : 'Respuesta numérica'}` }), btn('Editar ejercicio', () => go('exercise', { exerciseId: b.exerciseId }), 'action-btn', { 'data-bo-exercise': b.exerciseId })); }
            return h('li', { class: 'bo-card bo-block', 'data-bo-block': String(i), 'data-bo-type': b.type },
                h('div', { class: 'bo-card-head' }, h('strong', { text: BLOCK_LABELS[b.type] || b.type }),
                    h('div', { class: 'bo-mini' },
                        btn('↑', () => { ops.move(content.blocks, i, -1); commitStructural(); }, 'bo-icon', { 'aria-label': 'Subir bloque', disabled: i === 0 }),
                        btn('↓', () => { ops.move(content.blocks, i, 1); commitStructural(); }, 'bo-icon', { 'aria-label': 'Bajar bloque', disabled: i === content.blocks.length - 1 }),
                        btn('Eliminar', () => { if (b.type === 'exercise' && !ask('¿Eliminar este bloque y el ejercicio que contiene?')) return; ops.removeBlock(def, lesson.id, i); commitStructural(); }, 'action-btn secondary', { 'data-bo-del-block': String(i) }))),
                body);
        });
        root.append(h('ul', { class: 'bo-rows' }, blocks),
            h('div', { class: 'bo-card' }, h('p', { class: 'bo-label', text: 'Agregar bloque' }), h('div', { class: 'bo-actions' },
                ['heading', 'paragraph', 'list', 'example', 'exercise'].map(t => btn(`+ ${BLOCK_LABELS[t]}`, () => { const r = ops.addBlock(def, lesson.id, t); commitStructural(); if (t === 'exercise') go('exercise', { exerciseId: r }); }, 'action-btn secondary', { 'data-bo-add-block': t })))),
            btn(BO.preview ? 'Ocultar vista previa' : 'Vista previa de la lección', () => { commitNow(); BO.preview = !BO.preview; render(); }, 'action-btn', { id: 'bo-preview-toggle' }));
        if (BO.preview) {
            const norm = B.normalizeDefinition(clone(def));
            root.append(h('div', { class: 'bo-preview', id: 'bo-preview' }, h('p', { class: 'bo-label', text: 'Vista previa — así lo verá el alumno (los ejercicios no guardan intentos).' }), buildDeclarativeLesson(norm, norm.lessons.find(l => l.id === lesson.id), norm.lessonContent[lesson.id], { preview: true })));
        }
    }

    function viewExercise(root, def) {
        const id = BO.exerciseId, ec = def.exerciseContent[id], meta = def.exercises[id];
        const lessonId = def.lessons.find(l => (def.lessonContent[l.id] || { blocks: [] }).blocks.some(b => b.exerciseId === id));
        if (!ec || !meta) { BO.view = 'estructura'; return viewEstructura(root, def); }
        root.append(h('div', { class: 'bo-crumbs' }, btn('← Volver a la lección', () => go('lesson', { lessonId: lessonId ? lessonId.id : BO.lessonId }), 'action-btn secondary', { id: 'bo-back-lesson' }), h('strong', { text: `Ejercicio ${id}` })));
        root.append(h('div', { class: 'bo-card' }, h('div', { class: 'bo-grid' },
            field('Enunciado', area(ec.prompt, v => { ec.prompt = v; }, 3, { id: 'bo-e-prompt' }), '', true),
            field('Tipo de respuesta', sel([['numeric', 'Numérica'], ['choice', 'Opción múltiple']], ec.kind, v => { if (ops.setExerciseKind(def, id, v)) commitStructural(); }, { id: 'bo-e-kind' })),
            field('Título corto (opcional)', txt((def.exerciseTitles || {})[id] || '', v => { def.exerciseTitles = def.exerciseTitles || {}; def.exerciseTitles[id] = v; }), 'Aparece en el repaso y el dashboard.'))));
        if (ec.kind === 'numeric') {
            root.append(h('div', { class: 'bo-card' }, h('h3', { text: 'Respuestas numéricas' }),
                h('ul', { class: 'bo-rows' }, ec.fields.map((f, i) => h('li', { class: 'bo-row bo-grid', 'data-bo-field': f.id },
                    field('Etiqueta', txt(f.label, v => { f.label = v; }, { 'data-bo-f-label': i })),
                    field('Respuesta correcta', num(f.answer, v => { f.answer = v; }, { 'data-bo-f-answer': i })),
                    field('Margen de error', num(f.tolerance, v => { f.tolerance = Number.isFinite(v) ? v : 0; }, { min: '0', 'data-bo-f-tol': i }), 'Diferencia máxima aceptada.'),
                    btn('Quitar', () => { if (ops.removeField(def, id, i)) commitStructural(); }, 'action-btn secondary', { disabled: ec.fields.length <= 1 })))),
                btn('Agregar campo', () => { ops.addField(def, id); commitStructural(); }, 'action-btn secondary', { id: 'bo-add-field' })));
        } else {
            root.append(h('div', { class: 'bo-card' }, h('h3', { text: 'Opciones (marca la correcta)' }),
                h('ul', { class: 'bo-rows' }, ec.options.map((o, i) => h('li', { class: 'bo-row', 'data-bo-option': o.id },
                    h('label', { class: 'bo-radio' }, h('input', { type: 'radio', name: `bo-correct-${id}`, checked: o.correct === true, 'data-bo-correct': i, onchange: () => { ops.setCorrectOption(def, id, o.id); commitNow(); } }), ' Correcta'),
                    txt(o.text, v => { o.text = v; }, { 'aria-label': `Texto de la opción ${i + 1}`, 'data-bo-o-text': i }),
                    btn('Quitar', () => { if (ops.removeOption(def, id, i)) commitStructural(); }, 'action-btn secondary', { disabled: ec.options.length <= 2 })))),
                btn('Agregar opción', () => { ops.addOption(def, id); commitStructural(); }, 'action-btn secondary', { id: 'bo-add-option' })));
        }
        root.append(h('div', { class: 'bo-card' }, h('div', { class: 'bo-grid' },
            field('Mensaje al acertar', txt(ec.successMessage || '', v => { ec.successMessage = v; })),
            field('Mensaje al fallar (opcional)', txt(ec.errorMessage || '', v => { ec.errorMessage = v; })),
            field('Pistas (una por línea)', area((meta.hints || []).join('\n'), v => { meta.hints = v.split('\n'); }, 3, { id: 'bo-e-hints' }), 'El alumno las ve de a una.', true),
            field('Solución (un párrafo por línea)', area((ec.solution || []).join('\n'), v => { ec.solution = v.split('\n'); }, 3, { id: 'bo-e-solution' }), '', true))));
        const conceptList = Object.values(def.concepts);
        root.append(h('div', { class: 'bo-card' }, h('h3', { text: 'Clasificación pedagógica' }), h('div', { class: 'bo-grid' },
            field('Tipo de ejercicio', sel(B.BO_TYPES, meta.type, v => { meta.type = v; commitNow(); }, { id: 'bo-e-type' })),
            field('Nivel cognitivo', sel(B.BO_LEVELS, meta.cognitiveLevel, v => { meta.cognitiveLevel = v; commitNow(); }, { id: 'bo-e-level' })),
            field('Dificultad (1 a 5)', sel([1, 2, 3, 4, 5].map(n => [n, String(n)]), meta.difficulty, v => { meta.difficulty = parseInt(v, 10); commitNow(); }, { id: 'bo-e-diff' }))),
            h('fieldset', { class: 'bo-concepts' }, h('legend', { text: 'Conceptos que practica' }),
                conceptList.length ? conceptList.map(c => h('label', { class: 'bo-radio' }, h('input', { type: 'checkbox', value: c.id, checked: (meta.concepts || []).includes(c.id), 'data-bo-concept-check': c.id, onchange: ev => { const set = new Set(meta.concepts || []); if (ev.target.checked) set.add(c.id); else set.delete(c.id); meta.concepts = [...set]; commitNow(); } }), ` ${c.name}`))
                    : h('p', { class: 'bo-hint', text: 'Todavía no hay conceptos. Créalos en la pestaña «Conceptos».' }))));
        root.append(btn(BO.preview ? 'Ocultar vista previa' : 'Vista previa del ejercicio', () => { commitNow(); BO.preview = !BO.preview; render(); }, 'action-btn', { id: 'bo-preview-toggle' }));
        if (BO.preview) root.append(h('div', { class: 'bo-preview', id: 'bo-preview' }, h('p', { class: 'bo-label', text: 'Vista previa — no guarda intentos.' }), buildDeclarativeExercise(Object.assign({ id }, B.normalizeDefinition(clone(def)).exerciseContent[id]), { preview: true, hints: (meta.hints || []).map(t => String(t).trim()).filter(Boolean) })));
    }

    globalThis.renderBackoffice = render;
    globalThis.__backofficeUI = { state: BO, openEditor };
})();

// Aviso del navegador al cerrar o recargar con cursos sin exportar (solo en modo editor).
window.addEventListener('beforeunload', ev => {
    try {
        if (isEditorMode() && globalThis.__backoffice.pendingExports().length) { ev.preventDefault(); ev.returnValue = ''; }
    } catch (error) { /* sin almacenamiento: nada que avisar */ }
});
