// Estructura de datos del curso y requerimientos por lección
const ANALISTA_LESSONS = [
   { id: 'l0', title: 'Módulo 0: Introducción al curso', exercises: [], intro: true },
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
// Enlaces de contenido del motor: los reasigna applyCourseContext() según el curso activo.
let lessons = ANALISTA_LESSONS;

// ================================================================
// PERSONALIZACIÓN — nombre del alumno (opcional)
// El nombre solo se escribe con textContent (nunca innerHTML) y se guarda
// en el mismo respaldo local que el progreso. Sin nombre, el protagonista
// de los ejemplos es DEFAULT_LEARNER_NAME.
// ================================================================
const DEFAULT_LEARNER_NAME = 'Manuel';
const LEARNER_NAME_MAX = 30;
let learnerProfile = { name: '' };
function sanitizeLearnerName(raw) {
    if (typeof raw !== 'string') return '';
    return raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LEARNER_NAME_MAX);
}
function sanitizeLearnerProfile(raw) { return { name: sanitizeLearnerName(raw && raw.name) }; }
function getLearnerName() { return learnerProfile.name || DEFAULT_LEARNER_NAME; }
function applyLearnerName() {
    if (typeof document === 'undefined') return;
    const name = getLearnerName();
    document.querySelectorAll('[data-learner-name]').forEach(el => { el.textContent = name; });
    const greeting = document.getElementById('intro-greeting');
    if (greeting) greeting.textContent = learnerProfile.name
        ? `Hola, ${learnerProfile.name}. Este curso está pensado para ti.`
        : 'Hola. Cuéntanos cómo te llamas para personalizar el curso (es opcional).';
    const input = document.getElementById('learner-name');
    if (input && document.activeElement !== input) input.value = learnerProfile.name;
}
function saveLearnerName(rawValue) {
    const input = document.getElementById('learner-name');
    learnerProfile = { name: sanitizeLearnerName(rawValue !== undefined ? rawValue : (input ? input.value : '')) };
    applyLearnerName();
    saveLearningState();
    const fb = document.getElementById('learner-name-feedback');
    if (fb) {
        const box = document.createElement('div');
        box.className = 'success-box';
        box.textContent = learnerProfile.name
            ? `Listo, ${learnerProfile.name}. Verás tu nombre en los ejemplos del curso.`
            : `Sin nombre: ${DEFAULT_LEARNER_NAME} será el protagonista de los ejemplos.`;
        fb.textContent = '';
        fb.appendChild(box);
    }
}
function initLearnerNameInput() {
    const input = document.getElementById('learner-name');
    if (!input) return;
    input.addEventListener('input', () => {
        const preview = sanitizeLearnerName(input.value) || DEFAULT_LEARNER_NAME;
        document.querySelectorAll('[data-learner-name]').forEach(el => { el.textContent = preview; });
    });
    input.addEventListener('change', () => saveLearnerName());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveLearnerName(); } });
}

// ================================================================
// VIDEO DE INTRODUCCIÓN POR SECCIÓN
// Cada <figure class="lesson-video"> del HTML lleva su URL en data-video-url.
// Mientras el atributo conserve el texto "PON AQUÍ…" se muestra una tarjeta
// "Próximamente". La URL nunca se inserta como HTML: se asigna al atributo src.
// ================================================================
function normalizeVideoUrl(raw) {
    const v = String(raw == null ? '' : raw).trim();
    if (!v || /\s/.test(v) || /^(javascript|data|vbscript):/i.test(v)) return '';
    // Enlace "blob" de GitHub (página HTML) → enlace directo al archivo.
    const u = v.replace(/^(https?:\/\/github\.com\/[^/]+\/[^/]+)\/blob\//i, '$1/raw/');
    if (/^https?:\/\//i.test(u) || /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(u)) return u;
    return '';
}
// Acepta enlaces de YouTube (watch, youtu.be, shorts, live, embed) y devuelve el ID de 11 caracteres, o ''.
function parseYouTubeId(raw) {
    const v = String(raw == null ? '' : raw).trim();
    if (!v || /\s/.test(v)) return '';
    const m = v.match(/^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i);
    return m ? m[1] : '';
}
function youTubeEmbedUrl(id) {
    const params = ['rel=0', 'modestbranding=1', 'playsinline=1', 'enablejsapi=1'];
    if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) params.push('origin=' + encodeURIComponent(location.origin));
    return `https://www.youtube-nocookie.com/embed/${id}?${params.join('&')}`;
}
// ---- Validación de proveedores compatibles (YouTube, MP4, WebM) ----
const VIDEO_STATUS_MESSAGES = Object.freeze({
    valid: 'Video listo para usar',
    invalid: 'No pudimos reconocer esta URL como un video compatible.',
    unavailable: 'La URL tiene un formato válido, pero el recurso no pudo cargarse.',
    empty: 'Esta sección todavía no tiene video.'
});
function validateVideoUrl(raw) {
    const v = String(raw == null ? '' : raw).trim();
    if (!v) return { status: 'empty' };
    if (/\s/.test(v) || v.length > 2048 || /^(javascript|data|vbscript|blob|file):/i.test(v)) return { status: 'invalid', reason: 'unsafe' };
    const youtubeId = parseYouTubeId(v);
    if (youtubeId) return { status: 'valid', provider: 'youtube', youtubeId, embedUrl: youTubeEmbedUrl(youtubeId), url: v };
    const direct = v.replace(/^(https?:\/\/github\.com\/[^/]+\/[^/]+)\/blob\//i, '$1/raw/');
    const absolute = /^https?:\/\//i.test(direct);
    const relative = !/^[a-z][a-z0-9+.-]*:/i.test(direct) && !direct.startsWith('//');
    if (!absolute && !relative) return { status: 'invalid', reason: 'scheme' };
    if (absolute && /^https?:\/\/[^/?#]*@/i.test(direct)) return { status: 'invalid', reason: 'credentials' };
    const ext = (direct.split(/[?#]/)[0].match(/\.(mp4|webm)$/i) || [])[1];
    if (!ext) return { status: 'invalid', reason: 'format' };
    return { status: 'valid', provider: ext.toLowerCase(), src: direct, url: v };
}

// ---- Configuración de videos por curso y lección (contenido, no progreso) ----
// Capas: publicada (content/videos.js y course.videos) < borrador local del editor (platform root.content).
// El borrador local vive fuera del estado de aprendizaje: reiniciar o exportar progreso no lo toca.
// ---- Borradores de curso del editor (contenido, no progreso): root.content.courseDrafts[id] = { definition, updatedAt, exportedAt } ----
function readCourseDrafts() {
    try {
        const store = readPlatformStore();
        const drafts = store.status === 'ok' && store.root.content && store.root.content.courseDrafts;
        return drafts && typeof drafts === 'object' && !Array.isArray(drafts) ? drafts : {};
    } catch (error) { return {}; }
}
function writeCourseDraftEntry(courseId, entry) {
    if (!COURSE_ID_PATTERN.test(courseId)) throw new Error('id de curso inválido');
    mutatePlatformRoot(root => {
        if (!root.content.courseDrafts || typeof root.content.courseDrafts !== 'object' || Array.isArray(root.content.courseDrafts)) root.content.courseDrafts = {};
        if (entry === undefined) delete root.content.courseDrafts[courseId]; else root.content.courseDrafts[courseId] = entry;
    });
}
const PUBLISHED_COURSE_DEFINITIONS = {};
// Al arrancar: el borrador local reemplaza al curso publicado del mismo id (o agrega un curso nuevo). Un borrador inválido se omite.
function applyCourseDrafts() {
    const drafts = readCourseDrafts();
    Object.keys(drafts).forEach(id => {
        const definition = drafts[id] && drafts[id].definition;
        if (!COURSE_ID_PATTERN.test(id) || id === DEFAULT_COURSE_ID || !definition || definition.id !== id) return;
        const result = COURSE_REGISTRY.upsert(definition);
        if (!result.ok) console.warn(`Borrador omitido (${id}):`, result.reasons);
    });
}

function sanitizeVideoEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.removed === true) return { removed: true };
    const url = String(raw.url == null ? '' : raw.url).trim().slice(0, 2048);
    const title = String(raw.title == null ? '' : raw.title).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 120);
    return { title, url, provider: validateVideoUrl(url).provider || '', enabled: raw.enabled === true };
}
function publishedVideos(courseId) {
    const course = COURSE_REGISTRY.get(courseId);
    const shipped = (typeof globalThis.COURSE_VIDEOS === 'object' && globalThis.COURSE_VIDEOS && globalThis.COURSE_VIDEOS[courseId]) || {};
    return { ...((course && course.videos) || {}), ...shipped };
}
function localVideos(courseId) {
    try {
        const store = readPlatformStore();
        const entry = store.status === 'ok' && store.root.content && store.root.content[courseId];
        return (entry && entry.videos && typeof entry.videos === 'object') ? entry.videos : {};
    } catch (error) { return {}; }
}
function courseLessonIds(courseId) { const c = COURSE_REGISTRY.get(courseId); return c ? c.lessons.map(l => l.id) : []; }
function resolveLessonVideo(courseId, lessonId) {
    const local = Object.prototype.hasOwnProperty.call(localVideos(courseId), lessonId) ? localVideos(courseId)[lessonId] : undefined;
    const pub = publishedVideos(courseId);
    let entry = null, source = 'none';
    if (local !== undefined) {
        const clean = sanitizeVideoEntry(local);
        if (clean && !clean.removed) { entry = clean; source = 'local'; }
    } else if (Object.prototype.hasOwnProperty.call(pub, lessonId)) {
        const clean = sanitizeVideoEntry(pub[lessonId]);
        if (clean && !clean.removed) { entry = clean; source = 'published'; }
    }
    const validation = entry ? validateVideoUrl(entry.url) : { status: 'empty' };
    return { source, entry, validation, active: Boolean(entry && entry.enabled && validation.status === 'valid') };
}
function mutatePlatformRoot(mutator) {
    const store = readPlatformStore();
    if (store.status === 'corrupt' || store.status === 'unsupported') throw new Error('El almacenamiento de la plataforma no es escribible.');
    const root = store.root || createPlatformRoot();
    if (!root.content || typeof root.content !== 'object' || Array.isArray(root.content)) root.content = {};
    mutator(root);
    localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(root));
}
function setLocalVideo(courseId, lessonId, value) {
    mutatePlatformRoot(root => {
        const content = Object.prototype.hasOwnProperty.call(root.content, courseId) && root.content[courseId] ? root.content[courseId] : (root.content[courseId] = {});
        if (!content.videos || typeof content.videos !== 'object' || Array.isArray(content.videos)) content.videos = {};
        if (value === undefined) delete content.videos[lessonId]; else content.videos[lessonId] = value;
    });
}
function saveVideoConfig(courseId, lessonId, input) {
    if (!COURSE_REGISTRY.has(courseId) || !courseLessonIds(courseId).includes(lessonId)) return { ok: false, status: 'invalid', reason: 'lesson' };
    const validation = validateVideoUrl(input && input.url);
    if (validation.status !== 'valid') return { ok: false, status: validation.status, reason: validation.reason || null };
    const entry = sanitizeVideoEntry({ title: input.title, url: input.url, enabled: input.enabled === true });
    try { setLocalVideo(courseId, lessonId, entry); } catch (error) { return { ok: false, status: 'storage', reason: 'write' }; }
    return { ok: true, entry };
}
function removeVideoConfig(courseId, lessonId) {
    if (!COURSE_REGISTRY.has(courseId) || !courseLessonIds(courseId).includes(lessonId)) return { ok: false };
    const hasPublished = Object.prototype.hasOwnProperty.call(publishedVideos(courseId), lessonId);
    try { setLocalVideo(courseId, lessonId, hasPublished ? { removed: true } : undefined); } catch (error) { return { ok: false }; }
    return { ok: true };
}
function discardLocalVideos(courseId) {
    try { mutatePlatformRoot(root => { if (root.content[courseId]) delete root.content[courseId].videos; }); return true; } catch (error) { return false; }
}
// Texto de content/videos.js con la configuración efectiva (publicada + borrador local).
function buildVideosScript() {
    const out = {};
    Object.keys(globalThis.COURSE_VIDEOS || {}).forEach(id => { out[id] = { ...globalThis.COURSE_VIDEOS[id] }; });
    COURSE_REGISTRY.list().forEach(course => {
        const merged = {};
        course.lessons.forEach(l => {
            const r = resolveLessonVideo(course.id, l.id);
            if (r.entry && r.entry.url) merged[l.id] = { title: r.entry.title, provider: r.entry.provider, url: r.entry.url, enabled: r.entry.enabled };
        });
        if (Object.keys(merged).length || out[course.id]) out[course.id] = merged;
    });
    return '// Configuración de videos por curso y lección. Generado por el administrador de contenido.\n// Reemplaza content/videos.js por este archivo y publica el sitio.\nglobalThis.COURSE_VIDEOS = ' + JSON.stringify(out, null, 2) + ';\n';
}

// ---- Reproductor y tarjeta de respaldo (compartidos por la lección y la vista previa del editor) ----
function renderVideoFallback(frame, opts = {}) {
    frame.textContent = '';
    const msg = document.createElement('div');
    msg.className = 'lesson-video-error'; msg.setAttribute('role', 'alert');
    const strong = document.createElement('strong'); strong.textContent = 'Video no disponible';
    const p = document.createElement('span'); p.textContent = 'Este contenido multimedia no pudo cargarse. Puedes continuar con la lección normalmente.';
    msg.append(strong, p);
    if (opts.detail) { // solo en el editor: el alumno no ve detalles técnicos
        const code = opts.code;
        const small = document.createElement('small'); small.className = 'lesson-video-code';
        small.textContent = code ? `Código del navegador ${code}${code === 4 ? ': formato o códec no compatible' : code === 3 ? ': archivo dañado o códec no decodificable' : code === 2 ? ': error de red' : ''}.` : '';
        if (small.textContent) msg.append(small);
        if (opts.url) { const a = document.createElement('a'); a.href = opts.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Abrir en una pestaña nueva'; msg.append(a); }
    }
    frame.appendChild(msg);
}
function createVideoPlayer({ validation, title, poster = '', detail = false, onLoaded = null, onFailed = null }) {
    const frame = document.createElement('div');
    frame.className = 'lesson-video-frame';
    if (validation.provider === 'youtube') {
        const iframe = document.createElement('iframe');
        iframe.src = validation.embedUrl; iframe.title = title; iframe.loading = 'lazy';
        iframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.className = 'lesson-video-embed';
        frame.appendChild(iframe);
    } else {
        const video = document.createElement('video');
        video.controls = true; video.preload = 'metadata'; video.playsInline = true;
        video.setAttribute('playsinline', ''); video.setAttribute('aria-label', title);
        if (poster) video.poster = poster;
        video.addEventListener('error', () => {
            const code = video.error && video.error.code;
            renderVideoFallback(frame, { detail, code, url: validation.src });
            if (onFailed) onFailed(code);
        }, { once: true });
        video.addEventListener('loadedmetadata', () => { if (onLoaded) onLoaded(); }, { once: true });
        video.src = validation.src;
        frame.appendChild(video);
    }
    return frame;
}
function renderLessonVideo(fig) {
    if (!fig || typeof fig.appendChild !== 'function') return;
    const attrTitle = fig.getAttribute('data-video-title') || 'Video de introducción';
    const lessonEl = typeof fig.closest === 'function' ? fig.closest('.lesson') : null;
    const lessonId = lessonEl && lessonEl.id;
    const courseId = (fig.dataset && fig.dataset.courseId) || DEFAULT_COURSE_ID; // el HTML estático es del curso Analista
    let rawUrl = fig.getAttribute('data-video-url'), title = attrTitle;
    const resolved = lessonId ? resolveLessonVideo(courseId, lessonId) : null;
    // La configuración manda cuando trae URL; si no, se conserva el atributo data-video-url como respaldo antiguo.
    if (resolved && resolved.entry && resolved.entry.url) { rawUrl = resolved.active ? resolved.entry.url : ''; title = resolved.entry.title || attrTitle; }
    const validation = validateVideoUrl(rawUrl);
    const poster = normalizeVideoUrl(fig.getAttribute('data-video-poster'));
    fig.textContent = '';
    fig.classList.toggle('has-video', validation.status === 'valid');
    fig.classList.remove('video-failed');
    fig.setAttribute('aria-label', `Video de introducción: ${title}`);
    let frame;
    if (validation.status === 'valid') {
        frame = createVideoPlayer({ validation, title, poster, onFailed: () => fig.classList.add('video-failed') });
    } else {
        frame = document.createElement('div');
        frame.className = 'lesson-video-frame';
        const ph = document.createElement('div');
        ph.className = 'lesson-video-placeholder';
        const play = document.createElement('span'); play.className = 'lesson-video-play'; play.setAttribute('aria-hidden', 'true');
        const t = document.createElement('strong'); t.textContent = 'Video de introducción';
        const s2 = document.createElement('span'); s2.textContent = 'Próximamente';
        ph.append(play, t, s2);
        frame.appendChild(ph);
    }
    const cap = document.createElement('figcaption');
    cap.textContent = `Video de introducción · ${title}`;
    fig.append(frame, cap);
}
function initLessonVideos() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    document.querySelectorAll('.lesson-video').forEach(renderLessonVideo);
}
// Un video no debe seguir sonando al cambiar de lección o abrir un panel.
function pauseLessonVideos() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    document.querySelectorAll('.lesson-video video').forEach(v => { try { v.pause(); } catch (e) { /* sin acción */ } });
    // YouTube: la orden de pausa se envía con postMessage (el iframe se creó con enablejsapi=1).
    document.querySelectorAll('.lesson-video iframe').forEach(f => {
        try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube-nocookie.com'); } catch (e) { /* sin acción */ }
    });
}

// ================================================================
// ADMINISTRADOR DE CONTENIDO · VIDEOS (herramienta local/editorial, sin autenticación)
// Visible solo con ?editor=1. Flujo por sección: URL → Validar → Vista previa → Confirmar.
// Todo el texto del usuario se escribe con textContent / value, nunca como HTML.
// ================================================================
function isEditorMode() {
    try {
        const q = (typeof location !== 'undefined' && location.search) || '';
        if (/[?&]editor=1(&|$)/.test(q)) localStorage.setItem('plataforma.editor', '1');
        else if (/[?&]editor=0(&|$)/.test(q)) localStorage.removeItem('plataforma.editor');
        return localStorage.getItem('plataforma.editor') === '1';
    } catch (error) { return false; }
}
function initEditorMode() {
    const btn = document.getElementById('content-btn');
    if (btn) btn.hidden = !isEditorMode();
}
function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'value') node.value = v;
        else if (k === 'checked') node.checked = true;
        else if (k === 'disabled') node.disabled = true;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    });
    children.flat().forEach(c => { if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return node;
}
let videoAdminNotice = '';
const VIDEO_PROVIDER_LABELS = Object.freeze({ youtube: 'YouTube', mp4: 'Archivo MP4', webm: 'Archivo WebM' });
function videoRowBadge(resolved) {
    const { entry, validation, source } = resolved;
    if (!entry || !entry.url) return { text: 'Sin configurar', tone: 'empty' };
    if (validation.status !== 'valid') return { text: 'URL no válida', tone: 'invalid' };
    const origin = source === 'local' ? 'borrador local' : 'publicado';
    return entry.enabled ? { text: `Activo · ${origin}`, tone: 'valid' } : { text: `Desactivado · ${origin}`, tone: 'off' };
}
function videoAdminRow(courseId, lesson) {
    const resolved = resolveLessonVideo(courseId, lesson.id);
    const entry = resolved.entry || { title: '', url: '', enabled: false };
    const badge = videoRowBadge(resolved);
    const idBase = `video-${lesson.id}`;
    const msg = h('p', { class: 'video-admin-msg', id: `${idBase}-msg`, role: 'status', 'aria-live': 'polite' });
    const preview = h('div', { class: 'video-admin-preview' });
    const urlInput = h('input', { type: 'url', id: `${idBase}-url`, value: entry.url, placeholder: 'https://youtu.be/… o enlace a .mp4 / .webm', autocomplete: 'off', spellcheck: 'false' });
    const titleInput = h('input', { type: 'text', id: `${idBase}-title`, value: entry.title || lesson.title, maxlength: '120' });
    const enabledInput = h('input', { type: 'checkbox', id: `${idBase}-enabled`, checked: entry.enabled });
    const saveBtn = h('button', { type: 'button', class: 'action-btn', disabled: true, 'data-video-save': lesson.id }, 'Confirmar y guardar');
    let validated = null; // { url, validation } de la última validación exitosa
    const setMsg = (status, text) => { msg.textContent = text || VIDEO_STATUS_MESSAGES[status] || ''; msg.dataset.status = status; };

    const validate = () => {
        const url = urlInput.value.trim();
        const validation = validateVideoUrl(url);
        validated = null; saveBtn.disabled = true; preview.textContent = '';
        if (validation.status !== 'valid') { setMsg(validation.status); return; }
        const title = titleInput.value.trim() || lesson.title;
        if (validation.provider === 'youtube') {
            preview.appendChild(createVideoPlayer({ validation, title, detail: true }));
            setMsg('valid', `${VIDEO_STATUS_MESSAGES.valid}. YouTube no permite comprobar desde aquí si el video está disponible: confírmalo en la vista previa.`);
            validated = { url, validation }; saveBtn.disabled = false;
        } else {
            setMsg('checking', 'Comprobando que el archivo carga…');
            preview.appendChild(createVideoPlayer({
                validation, title, detail: true,
                onLoaded: () => { setMsg('valid'); validated = { url, validation }; saveBtn.disabled = false; },
                onFailed: () => { setMsg('unavailable'); validated = null; saveBtn.disabled = true; }
            }));
        }
    };
    urlInput.addEventListener('input', () => { validated = null; saveBtn.disabled = true; setMsg('stale', 'Vuelve a validar la URL antes de guardar.'); });
    const validateBtn = h('button', { type: 'button', class: 'action-btn', 'data-video-validate': lesson.id, onclick: validate }, 'Validar y previsualizar');
    saveBtn.addEventListener('click', () => {
        if (!validated || validated.url !== urlInput.value.trim()) return;
        const result = saveVideoConfig(courseId, lesson.id, { title: titleInput.value, url: validated.url, enabled: enabledInput.checked });
        videoAdminNotice = result.ok ? `Guardado: ${lesson.title}.` : 'No pudimos guardar este video en el navegador.';
        initLessonVideos(); renderContentAdmin();
    });
    enabledInput.addEventListener('change', () => { // activar/desactivar una configuración ya guardada
        if (!resolved.entry || !resolved.entry.url || validateVideoUrl(resolved.entry.url).status !== 'valid') return;
        saveVideoConfig(courseId, lesson.id, { title: resolved.entry.title, url: resolved.entry.url, enabled: enabledInput.checked });
        videoAdminNotice = `${enabledInput.checked ? 'Activado' : 'Desactivado'}: ${lesson.title}.`;
        initLessonVideos(); renderContentAdmin();
    });
    const removeBtn = h('button', { type: 'button', class: 'action-btn secondary', disabled: !resolved.entry, 'data-video-remove': lesson.id, onclick: () => {
        removeVideoConfig(courseId, lesson.id); videoAdminNotice = `Configuración eliminada: ${lesson.title}.`; initLessonVideos(); renderContentAdmin();
    } }, 'Eliminar configuración');
    if (!resolved.entry || !resolved.entry.url) setMsg('empty'); else setMsg(resolved.validation.status === 'valid' ? 'valid' : resolved.validation.status);

    return h('li', { class: 'video-admin-row', 'data-video-row': lesson.id },
        h('div', { class: 'video-admin-head' },
            h('h3', { text: lesson.title }),
            h('span', { class: `video-badge video-badge-${badge.tone}`, text: badge.text })),
        resolved.validation.provider ? h('p', { class: 'video-admin-provider', text: `Proveedor: ${VIDEO_PROVIDER_LABELS[resolved.validation.provider]}` }) : null,
        h('div', { class: 'video-admin-fields' },
            h('label', { for: `${idBase}-title` }, 'Título', titleInput),
            h('label', { for: `${idBase}-url` }, 'URL del video', urlInput),
            h('label', { class: 'video-admin-check', for: `${idBase}-enabled` }, enabledInput, ' Mostrar al alumno')),
        h('div', { class: 'video-admin-actions' }, validateBtn, saveBtn, removeBtn),
        msg, preview);
}
function renderContentAdmin() {
    if (typeof renderBackoffice === 'function') return renderBackoffice(); // backoffice.js (pestañas Cursos / Videos)
    return renderVideosAdmin(document.getElementById('content-panel'));
}
function renderVideosAdmin(root, courseId = activeCourseId) {
    if (!root) return;
    const course = COURSE_REGISTRY.get(courseId);
    if (!course) return;
    root.textContent = '';
    const downloadBtn = h('button', { type: 'button', class: 'action-btn', id: 'video-download', onclick: () => {
        const blob = new Blob([buildVideosScript()], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'videos.js'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    } }, 'Descargar videos.js');
    const discardBtn = h('button', { type: 'button', class: 'action-btn secondary', id: 'video-discard', onclick: () => {
        discardLocalVideos(courseId); videoAdminNotice = 'Se descartó el borrador local de este curso.'; initLessonVideos(); renderContentAdmin();
    } }, 'Descartar borrador local');
    root.append(
        h('h2', { text: 'Videos', tabindex: '-1' }),
        h('p', { class: 'content-course', text: course ? course.title : '' }),
        h('p', { class: 'content-guide', text: 'Los cambios se guardan como borrador en este navegador y los ves de inmediato. Para publicarlos a todos los alumnos, descarga videos.js y reemplaza content/videos.js en el sitio. Se aceptan YouTube, MP4 y WebM.' }),
        h('div', { class: 'video-admin-tools' }, downloadBtn, discardBtn),
        h('p', { class: 'video-admin-notice', id: 'video-admin-notice', role: 'status', 'aria-live': 'polite', text: videoAdminNotice }),
        h('ul', { class: 'video-admin-list' }, course.lessons.map(l => videoAdminRow(courseId, l)))
    );
    videoAdminNotice = '';
}

// ================================================================
// GUÍA DE SECCIONES — qué es cada panel, cuándo usarlo y cómo funciona
// ================================================================
const PANEL_GUIDES = Object.freeze({
    cases: {
        what: 'El laboratorio reúne situaciones de negocio completas, con contexto, datos y una pregunta, para que practiques todo el razonamiento del analista en un solo lugar y no solo un cálculo suelto.',
        when: 'Cuando termines una lección y quieras practicar con un escenario más completo, o cuando busques un reto extra.',
        how: 'Lee el contexto y los datos, responde cada componente y registra tu análisis. Puedes pedir pistas; los intentos y las pistas quedan como evidencia. No bloquea el avance entre lecciones, pero el caso abierto cuenta para la Evaluación final.'
    },
    review: {
        what: 'El repaso detecta qué conviene reforzar a partir de lo que ya hiciste: errores repetidos, pistas usadas, soluciones vistas, práctica incompleta o temas que llevan tiempo sin revisarse.',
        when: 'Después de varias lecciones, cuando te equivocas seguido en un mismo tema o cuando vuelves al curso tras unos días.',
        how: 'Verás una lista priorizada (alta, media o baja). Pulsa Iniciar para trabajar un tema: ve al contenido y marca el repaso como completado, o pospónlo unos días. Si la lista está vacía, no hay señales de refuerzo por ahora.'
    },
    dashboard: {
        what: 'Es tu tablero de progreso: resume dónde vas, qué has practicado y qué te falta, con base en tu actividad real en el curso. No es una calificación.',
        when: 'Cuando quieras saber qué hacer a continuación o revisar cómo vas.',
        how: 'Empieza por Siguiente paso, revisa tus fortalezas y áreas de práctica y, al final, exporta tu progreso para guardarlo, importarlo en otro dispositivo o reiniciarlo.'
    }
});
function panelGuideHtml(view) {
    const g = PANEL_GUIDES[view];
    if (!g) return '';
    return `<section class="panel-guide" aria-label="Qué es esta sección"><h3>¿Qué es esta sección?</h3><p>${g.what}</p><ul><li><strong>Cuándo usarla:</strong> ${g.when}</li><li><strong>Cómo funciona:</strong> ${g.how}</li></ul></section>`;
}

// ================================================================
// NAVEGACIÓN DE PANELES — única fuente de verdad
// Un solo lugar decide qué panel está visible, qué etiqueta lleva cada
// botón y qué se guarda en navigationState. Las funciones open*/close*
// son envoltorios finos para conservar los onclick del HTML.
// ================================================================
const PANEL_VIEWS = Object.freeze({
    cases:      Object.freeze({ panelId:'case-lab',               btnId:'lab-btn',        label:'Casos' }),
    review:     Object.freeze({ panelId:'review-panel',           btnId:'review-btn',     label:'Repaso' }),
    dashboard:  Object.freeze({ panelId:'dashboard-panel',        btnId:'dashboard-btn',  label:'Mi aprendizaje' }),
    assessment: Object.freeze({ panelId:'final-assessment-panel', btnId:'assessment-btn', label:'Evaluación final' }),
    content:    Object.freeze({ panelId:'content-panel',          btnId:'content-btn',    label:'Contenido' }),
    courses:    Object.freeze({ panelId:'courses-panel',          btnId:'courses-btn',    label:'Mis cursos' })
});
function setElementClass(el, className, on) {
    if (!el || !el.classList) return;
    const fn = on ? el.classList.add : el.classList.remove;
    if (typeof fn === 'function') fn.call(el.classList, className);
}
function setElementHidden(el, hidden) { setElementClass(el, 'hidden', hidden); }
function currentPanelView() {
    for (const [name, cfg] of Object.entries(PANEL_VIEWS)) {
        const panel = document.getElementById(cfg.panelId);
        if (panel && panel.classList && typeof panel.classList.contains === 'function' && !panel.classList.contains('hidden')) return name;
    }
    return 'course';
}
function showView(view, options = {}) {
    const { save = true, track = true, focus = true } = options;
    toggleToolsMenu(false);
    const target = Object.prototype.hasOwnProperty.call(PANEL_VIEWS, view) ? view : 'course';
    const previous = currentPanelView();
    Object.entries(PANEL_VIEWS).forEach(([name, cfg]) => {
        const open = name === target;
        setElementHidden(document.getElementById(cfg.panelId), !open);
        const btn = document.getElementById(cfg.btnId);
        if (!btn) return;
        btn.textContent = open ? 'Volver al curso' : cfg.label;
        if (typeof btn.setAttribute === 'function') {
            btn.setAttribute('aria-expanded', String(open));
            if (open) btn.setAttribute('aria-label', `Volver al curso desde ${cfg.label}`);
            else if (typeof btn.removeAttribute === 'function') btn.removeAttribute('aria-label');
        }
    });
    document.querySelectorAll('.lesson').forEach(el => setElementClass(el, 'active', target === 'course' && el.id === lessons[currentIndex].id));
    if (track) {
        navigationState.activeView = target;
        if (target === 'assessment') navigationState.activeActivityId = FINAL_ASSESSMENT.id;
        else if (previous === 'assessment') navigationState.activeActivityId = null;
        if (save) saveLearningState();
    }
    if (target !== 'course') pauseLessonVideos();
    if (target !== 'course') {
        const renderers = { cases: renderCaseLab, review: renderReviewPanel, dashboard: renderDashboard, assessment: renderFinalAssessment, content: renderContentAdmin, courses: renderCoursesPanel };
        if (typeof renderers[target] === 'function') renderers[target]();
        mainContainer.scrollTop = 0;
        if (focus) setTimeout(() => { const id = PANEL_VIEWS[target].panelId; document.querySelector(`#${id} h2, #${id} button`)?.focus(); }, 0);
    }
    return target;
}
function togglePanel(view) { return showView(currentPanelView() === view ? 'course' : view); }
function openReviewPanel() { return togglePanel('review'); }
function openCaseLab() { return togglePanel('cases'); }
function openDashboard() { return togglePanel('dashboard'); }
function openFinalAssessment() { return togglePanel('assessment'); }
function closeDashboard() { return showView('course'); }
function closeFinalAssessment() { return showView('course'); }
function openContentAdmin() { return togglePanel('content'); }
function openCoursesPanel() { return togglePanel('courses'); }


// ================================================================
// FASE 12 — EVALUACIÓN FINAL INTEGRAL
// Orquestación de evidencia existente. No crea un segundo motor de ejercicios.
// ================================================================
let FINAL_ASSESSMENT = Object.freeze({
    id: 'final-analyst-assessment',
    title: 'Evaluación final integral del Analista',
    criteria: [
        { id:'understand', label:'Comprender', description:'Interpreta correctamente el problema y sus datos base.', source:{kind:'exercise', id:'l1-e1'}, check:()=>getLearningState('l1-e1').completed },
        { id:'calculate', label:'Calcular', description:'Obtiene correctamente las métricas y variaciones solicitadas.', source:{kind:'exercise', id:'l2-e1'}, check:()=>getLearningState('l2-e1').completed },
        { id:'interpret', label:'Interpretar', description:'Convierte resultados numéricos en una lectura analítica.', source:{kind:'exercise', id:'l3-e1'}, check:()=>getLearningState('l3-e1').completed },
        { id:'diagnose', label:'Diagnosticar', description:'Identifica driver y segmento separando evidencia de causa.', source:{kind:'exercise', id:'l5-e1'}, check:()=>rubricCriteriaMet('l5-e1',['change','evidence','driver','segment']) },
        { id:'hypothesize', label:'Hipotetizar', description:'Formula una hipótesis verificable y define evidencia para contrastarla.', source:{kind:'exercise', id:'l5-e1'}, check:()=>rubricCriteriaMet('l5-e1',['fact_hypothesis','hypothesis','measurement']) },
        { id:'recommend', label:'Recomendar', description:'Conecta una recomendación con el hallazgo y una medición concreta.', source:{kind:'exercise', id:'l8-e1'}, check:()=>rubricCriteriaMet('l8-e1',['recommendation','measurement']) },
        { id:'integral_case', label:'Caso integral', description:'Resuelve una situación analítica de principio a fin.', source:{kind:'case', id:'case-open-analysis-plan'}, check:()=>getCaseState('case-open-analysis-plan').completed }
    ],
    rubric: [
        ['understand','Interpreta correctamente el problema y la información disponible.'],
        ['calculate','Obtiene el resultado correcto en los cálculos requeridos.'],
        ['interpret','Explica qué significan los resultados para el negocio.'],
        ['diagnose','Identifica un driver y el segmento donde se concentra la señal.'],
        ['hypothesize','Formula una causa posible que pueda comprobarse con evidencia.'],
        ['recommend','Propone una acción analítica coherente y cómo medirla.'],
        ['integral_case','Integra contexto, datos, hallazgo, diagnóstico, hipótesis, recomendación y medición en un caso.']
    ]
});
function createFinalAssessmentState(){return {attempts:[],activeAttempt:null,lastResult:null,completed:false,passed:false,needsReviewCriteria:[],lastActivityAt:null};}
let finalAssessmentState=createFinalAssessmentState();
function rubricCriteriaMet(exerciseId, ids){const values=getLearningState(exerciseId).qualitativeCriteria||{};return ids.every(id=>values[id]===true);}
function getFinalAssessmentCriteria(){return FINAL_ASSESSMENT.criteria.map(c=>({...c,met:Boolean(c.check())}));}
function evaluateFinalAssessment(){const criteria=getFinalAssessmentCriteria();const passed=criteria.length>0&&criteria.every(c=>c.met);return {criteria,passed,metCount:criteria.filter(c=>c.met).length,total:criteria.length};}
function startFinalAssessment(){
    if(!finalAssessmentState.activeAttempt){finalAssessmentState.activeAttempt={id:`fa-${Date.now()}`,startedAt:new Date().toISOString()};navigationState.activeView='assessment';navigationState.activeActivityId=FINAL_ASSESSMENT.id;saveLearningState();}
    renderFinalAssessment();
}
let finalAssessmentNotice=null;
function completeFinalAssessment(){
    const evaluation=evaluateFinalAssessment();
    // Un resultado sin ninguna evidencia no informa nada y contaminaba el historial con "intentos" vacíos.
    if(evaluation.metCount===0){
        finalAssessmentNotice='Aún no hay evidencia registrada. Resuelve al menos un ejercicio o caso y vuelve a registrar el resultado.';
        renderFinalAssessment();
        return {ok:false,reason:'no-evidence'};
    }
    const now=new Date().toISOString();
    const failed=evaluation.criteria.filter(c=>!c.met).map(c=>c.id);
    const attempt={id:finalAssessmentState.activeAttempt?.id||`fa-${Date.now()}`,startedAt:finalAssessmentState.activeAttempt?.startedAt||now,completedAt:now,passed:evaluation.passed,criteria:Object.fromEntries(evaluation.criteria.map(c=>[c.id,c.met])),failedCriteria:failed};
    finalAssessmentState.attempts=[...(finalAssessmentState.attempts||[]),attempt].slice(-20);
    finalAssessmentState.lastResult={...attempt,metCount:evaluation.metCount,total:evaluation.total};
    finalAssessmentState.completed=true;finalAssessmentState.passed=evaluation.passed;finalAssessmentState.needsReviewCriteria=failed;finalAssessmentState.activeAttempt=null;finalAssessmentState.lastActivityAt=now;
    navigationState.activeView='assessment';navigationState.activeActivityId=FINAL_ASSESSMENT.id;
    saveLearningState();renderFinalAssessment();renderDashboard();
    return {ok:true,attempt};
}
function openFinalSource(source){
    if(source.kind==='case'){showView('cases');setTimeout(()=>document.querySelector(`[data-case-id="${source.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),0);return;}
    const idx=lessons.findIndex(l=>l.exercises.includes(source.id));if(idx<0)return;currentIndex=idx;closeFinalAssessment();updateUI();setTimeout(()=>document.getElementById(source.id)?.scrollIntoView({behavior:'smooth',block:'center'}),0);
}
function renderFinalAssessment(){
    const root=document.getElementById('final-assessment-panel');if(!root)return;
    const ev=evaluateFinalAssessment();const result=finalAssessmentState.lastResult;
    const noticeText=finalAssessmentNotice||(finalAssessmentState.activeAttempt&&ev.metCount===0?'Todavía no hay evidencia: resuelve al menos un ejercicio o caso antes de registrar un resultado.':'');finalAssessmentNotice=null;
    const status=result?(result.passed?'Superada según los criterios definidos':'Requiere refuerzo antes de volver a intentarlo'):'Pendiente';
    const criteriaHtml=ev.criteria.map(c=>`<article class="assessment-criterion ${c.met?'is-met':'is-pending'}"><div><strong>${c.label}</strong><p>${c.description}</p></div><span>${c.met?'✓ Evidencia disponible':'○ Pendiente'}</span><button type="button" class="action-btn outline" data-assessment-source="${c.source.id}" data-assessment-kind="${c.source.kind}">Ir a evidencia</button></article>`).join('');
    const history=(finalAssessmentState.attempts||[]).map((a,i)=>`<li>Intento ${i+1}: ${a.passed?'criterios completos':'requiere refuerzo'} · ${a.completedAt?new Date(a.completedAt).toLocaleString('es-MX'):''}</li>`).join('')||'<li>Aún no hay intentos completos.</li>';
    const resultHtml=result?`<section class="assessment-result ${result.passed?'assessment-pass':'assessment-retry'}"><h3>${result.passed?'Evaluación completada':'Antes de reintentar'}</h3><p>${result.passed?'La evidencia disponible cubre las siete competencias definidas. Esto describe el criterio medido; no es un score global de dominio.':'Estas son las competencias que conviene reforzar antes de volver a intentarlo.'}</p><ul>${result.failedCriteria.length?result.failedCriteria.map(id=>`<li>${FINAL_ASSESSMENT.criteria.find(c=>c.id===id)?.label||id}</li>`).join(''):'<li>No quedan competencias pendientes.</li>'}</ul>${result.passed?'':`<button type="button" class="action-btn outline" id="assessment-review">Abrir repaso</button>`}</section>`:'';
    root.innerHTML=`<div class="assessment-head"><div><h2>EVALUACIÓN FINAL INTEGRAL</h2><p>Comprueba si puedes pasar de recibir información a analizarla, encontrar un hallazgo, diagnosticarlo, formular una hipótesis, recomendar una acción y definir cómo medirla.</p></div><button type="button" class="action-btn outline" id="assessment-close">Cerrar</button></div>
      <section class="assessment-intro"><strong>Cómo funciona</strong><p>La evaluación reutiliza evidencia de ejercicios, rúbricas y el caso integral existentes. No crea un segundo motor de evaluación ni añade una nota arbitraria.</p><p><strong>Estado:</strong> ${status}</p></section>
      <section class="assessment-rubric"><h3>Rúbrica</h3><ul>${FINAL_ASSESSMENT.rubric.map(([id,text])=>`<li><strong>${FINAL_ASSESSMENT.criteria.find(c=>c.id===id)?.label||id}:</strong> ${text}</li>`).join('')}</ul></section>
      <section class="assessment-criteria"><h3>Evidencia requerida</h3>${criteriaHtml}</section>
      ${resultHtml}
      <section class="assessment-actions"><button type="button" class="action-btn" id="assessment-start">${result&&!result.passed?'Reintentar evaluación':'Iniciar evaluación'}</button>${result&&!result.passed?'<p class="assessment-note">La evidencia anterior se conserva. El nuevo intento se registrará por separado.</p>':''}${noticeText?`<p class="assessment-note" role="status">${noticeText}</p>`:''}</section>
      <section class="assessment-history"><h3>Historial</h3><ul>${history}</ul></section>`;
    root.querySelector('#assessment-close')?.addEventListener('click',closeFinalAssessment);
    root.querySelector('#assessment-start')?.addEventListener('click',startFinalAssessment);
    root.querySelector('#assessment-review')?.addEventListener('click',()=>showView('review'));
    root.querySelectorAll('[data-assessment-source]').forEach(btn=>btn.addEventListener('click',()=>openFinalSource({kind:btn.dataset.assessmentKind,id:btn.dataset.assessmentSource})));
    if(finalAssessmentState.activeAttempt){
        const activeStart=root.querySelector('#assessment-start');
        if(activeStart){ activeStart.textContent='Registrar resultado actual'; activeStart.addEventListener('click',completeFinalAssessment); }
    }
}
function sanitizeFinalAssessmentState(raw){const base=createFinalAssessmentState();if(!raw||typeof raw!=='object')return base;return {attempts:Array.isArray(raw.attempts)?raw.attempts.slice(-20):[],activeAttempt:raw.activeAttempt&&typeof raw.activeAttempt==='object'?{id:String(raw.activeAttempt.id||''),startedAt:typeof raw.activeAttempt.startedAt==='string'?raw.activeAttempt.startedAt:null}:null,lastResult:raw.lastResult&&typeof raw.lastResult==='object'?raw.lastResult:null,completed:raw.completed===true,passed:raw.passed===true,needsReviewCriteria:Array.isArray(raw.needsReviewCriteria)?[...new Set(raw.needsReviewCriteria.filter(id=>FINAL_ASSESSMENT.criteria.some(c=>c.id===id)))]:[],lastActivityAt:typeof raw.lastActivityAt==='string'?raw.lastActivityAt:null};}


// ================================================================
// FASE 7 — LABORATORIO DE CASOS ANALÍTICOS
// Casos integrados que reutilizan persistencia, evidencia y criterios
// existentes; no son ejercicios independientes ni crean un motor paralelo.
// ================================================================
let ANALYTICAL_CASES = Object.freeze([
    {
        id: 'case-guided-sales-drop',
        level: 1,
        title: 'Caso 1 — Caída semanal de ventas',
        mode: 'guided',
        concepts: ['sales','traffic','conversion_rate','aov','diagnosis','hypothesis','evidence'],
        context: 'El ecommerce registró una caída de ventas durante la última semana y la dirección pide identificar qué cambió antes de decidir una acción.',
        data: [
            ['Periodo', 'Ventas', 'Sesiones', 'CR', 'AOV'],
            ['Referencia', '$10,000,000', '400,000', '2.50%', '$10,000'],
            ['Actual', '$8,400,000', '400,000', '2.10%', '$10,000']
        ],
        prompt: 'Determina qué cambió, cuánto cambió y qué driver explica matemáticamente la caída.',
        components: [
            { id:'change', label:'Identificación del cambio', type:'select', options:['Ventas cayeron; sesiones se mantuvieron; CR cayó; AOV se mantuvo.','Ventas subieron; sesiones cayeron; CR subió.','AOV cayó y explica todo el cambio.'], answer:0, stage:'observe' },
            { id:'quantify', label:'Cuantificación', type:'select', options:['Ventas -16%; CR -0.4 puntos porcentuales.','Ventas -4%; CR -16 puntos porcentuales.','Ventas -16 puntos porcentuales; CR -0.4%.'], answer:0, stage:'quantify' },
            { id:'driver', label:'Driver principal', type:'select', options:['La caída de CR, porque tráfico y AOV permanecen constantes.','El tráfico, porque aumentó.','El AOV, porque disminuyó.'], answer:0, stage:'diagnose' },
            { id:'hypothesis', label:'Hipótesis verificable', type:'text', stage:'hypothesize', keywords:['cr','checkout','mobile'], minKeywords:1 },
            { id:'recommendation', label:'Siguiente análisis', type:'select', options:['Segmentar CR por dispositivo y etapa del funnel.','Aumentar presupuesto sin investigar la causa.','Cambiar el AOV objetivo.'], answer:0, stage:'recommend' },
            { id:'measurement', label:'Medición', type:'text', stage:'measure', keywords:['cr','mobile','checkout'], minKeywords:1 }
        ],
        hints: [
            'Empieza comparando ventas, sesiones, CR y AOV contra el periodo de referencia.',
            'Si sesiones y AOV permanecen constantes, identifica qué variable de la fórmula de ventas cambió.',
            'Una hipótesis debe incluir una explicación posible y la evidencia que permitiría comprobarla.'
        ]
    },
    {
        id: 'case-partial-mobile-checkout',
        level: 2,
        title: 'Caso 2 — La caída está concentrada',
        mode: 'partial',
        concepts: ['traffic','conversion_rate','funnel','checkout','diagnosis','hypothesis','evidence'],
        context: 'Las ventas bajaron y el equipo ya detectó que la señal de conversión no es uniforme. Tu trabajo es localizar el segmento y convertir el hallazgo en una hipótesis.',
        data: [
            ['Segmento', 'Sesiones', 'CR', 'Pedidos'],
            ['Desktop', '200,000', '2.8%', '5,600'],
            ['Mobile', '300,000', '1.8%', '5,400'],
            ['Mobile — semana anterior', '300,000', '2.2%', '6,600']
        ],
        prompt: 'Localiza dónde ocurre el cambio, separa hecho de hipótesis y define qué evidencia adicional necesitas.',
        components: [
            { id:'change', label:'Hallazgo', type:'select', options:['Mobile CR cayó 0.4 puntos porcentuales con el mismo volumen de sesiones.','Desktop perdió todo el volumen.','El AOV explica la diferencia.'], answer:0, stage:'observe' },
            { id:'comparison', label:'Comparación', type:'select', options:['Comparar mobile actual contra mobile anterior y luego contra desktop.','Comparar solo ventas totales.','Comparar mobile actual contra una meta anual.'], answer:0, stage:'compare' },
            { id:'driver', label:'Diagnóstico', type:'select', options:['La señal está concentrada en la conversión mobile; aún no demuestra la causa.','El checkout es definitivamente la causa.','Desktop es el principal problema.'], answer:0, stage:'diagnose' },
            { id:'hypothesis', label:'Hipótesis', type:'text', stage:'hypothesize', keywords:['mobile','checkout'], minKeywords:1 },
            { id:'evidence', label:'Evidencia necesaria', type:'select', options:['Abandono por etapa del checkout mobile y errores de pago por dispositivo/navegador.','Solo revisar ventas totales.','Cambiar precios inmediatamente.'], answer:0, stage:'measure' },
            { id:'recommendation', label:'Recomendación', type:'text', stage:'recommend', keywords:['checkout','mobile'], minKeywords:1 }
        ],
        hints: [
            'Primero localiza la señal: compara el mismo segmento contra su referencia.',
            'Que mobile tenga una caída no demuestra que checkout sea la causa.',
            'Busca una evidencia que pueda confirmar o debilitar la hipótesis.'
        ]
    },
    {
        id: 'case-open-analysis-plan',
        level: 3,
        title: 'Caso 3 — Investigación abierta',
        mode: 'open',
        concepts: ['sales','traffic','conversion_rate','aov','funnel','checkout','diagnosis','hypothesis','evidence'],
        context: 'La dirección solo informa: «Las ventas están abajo. Averigua qué está pasando». No existe un único camino analítico correcto.',
        data: [
            ['Fuente disponible', 'Dimensiones'],
            ['Ventas', 'Fecha, Canal, Pedido, Venta'],
            ['Ecommerce', 'Sesiones, Fuente, Dispositivo, Navegador, Pedido'],
            ['Funnel', 'View Item, Add Cart, Checkout, Purchase'],
            ['Cliente', 'Customer ID, Primera compra, Órdenes, Venta'],
            ['Producto', 'Categoría, SKU, Views, Add Cart, Orders, Revenue'],
            ['Tecnología', 'Browser, Device, Error, Tiempo de carga']
        ],
        prompt: 'Construye un plan de análisis que empiece por definir la comparación y termine en una recomendación y una medición verificable.',
        components: [
            { id:'objective', label:'Objetivo y referencia', type:'select', options:['Definir qué resultado cayó y contra qué periodo comparable se evaluará.','Empezar buscando una causa específica.','Elegir primero una herramienta.'], answer:0, stage:'observe' },
            { id:'data', label:'Datos iniciales', type:'select', options:['Ventas, tráfico, CR, AOV y dimensiones para segmentar.','Solo ventas totales.','Solo errores técnicos.'], answer:0, stage:'quantify' },
            { id:'segmentation', label:'Segmentación inicial', type:'multi', options:['Canal','Dispositivo','Funnel','Producto','Cliente','Fuente'], minSelections:2, stage:'segment' },
            { id:'diagnosis', label:'Diagnóstico', type:'text', stage:'diagnose', keywords:['driver','segment'], minKeywords:1 },
            { id:'hypothesis', label:'Hipótesis verificable', type:'text', stage:'hypothesize', keywords:['hipótesis','evidencia'], minKeywords:1 },
            { id:'recommendation', label:'Recomendación', type:'text', stage:'recommend', keywords:['investigar','analizar'], minKeywords:1 },
            { id:'measurement', label:'Medición', type:'text', stage:'measure', keywords:['kpi','periodo'], minKeywords:1 }
        ],
        hints: [
            'No empieces con una causa. Define primero el resultado y la referencia comparable.',
            'Después cuantifica la brecha y descompón sus posibles drivers.',
            'Una recomendación útil debe decir qué analizar y cómo medir si el hallazgo cambia.'
        ]
    }
]);

function createCaseLearningState() {
    return { attempts: 0, attemptResults: [], hintsUsed: 0, revealedHints: [], completed: false, componentResults: {}, evidenceStages: [], errorHistory: [], lastActivityAt: null };
}
function getCase(caseId) { return ANALYTICAL_CASES.find(item => item.id === caseId) || null; }
function sanitizeCaseState(raw) {
    const base = createCaseLearningState();
    if (!raw || typeof raw !== 'object') return base;
    return {
        attempts: Number.isInteger(raw.attempts) && raw.attempts >= 0 ? raw.attempts : 0,
        attemptResults: Array.isArray(raw.attemptResults) ? raw.attemptResults.slice(-50) : [],
        hintsUsed: Number.isInteger(raw.hintsUsed) && raw.hintsUsed >= 0 ? raw.hintsUsed : 0,
        revealedHints: Array.isArray(raw.revealedHints) ? [...new Set(raw.revealedHints.filter(Number.isInteger).filter(i => i >= 0))].sort((a,b)=>a-b) : [],
        completed: raw.completed === true,
        componentResults: raw.componentResults && typeof raw.componentResults === 'object' ? {...raw.componentResults} : {},
        evidenceStages: Array.isArray(raw.evidenceStages) ? [...new Set(raw.evidenceStages.filter(stage => ANALYTICAL_CHAIN.includes(stage)))] : [],
        errorHistory: Array.isArray(raw.errorHistory) ? raw.errorHistory.slice(-50) : [],
        lastActivityAt: typeof raw.lastActivityAt === 'string' ? raw.lastActivityAt : null,
        reviewCount: Number.isInteger(raw.reviewCount) && raw.reviewCount >= 0 ? raw.reviewCount : 0,
        lastReviewAt: typeof raw.lastReviewAt === 'string' ? raw.lastReviewAt : null
    };
}
let caseLearningState = {};
function createInitialCaseState() { const state={}; ANALYTICAL_CASES.forEach(c=>state[c.id]=createCaseLearningState()); return state; }
function getCaseState(caseId) { if (!caseLearningState[caseId]) caseLearningState[caseId]=createCaseLearningState(); return caseLearningState[caseId]; }
// Validación determinística de texto: coincide por palabras completas (con raíz para plurales y conjugaciones),
// sin acentos, con sinónimos explícitos y con un mínimo de palabras. Antes era `includes` sobre la cadena:
// "cr" coincidía con casi cualquier texto ("descripción", "escribir"...).
const CASE_KEYWORD_SYNONYMS = Object.freeze({
    cr: ['conversion', 'convertir'],
    mobile: ['movil', 'moviles', 'celular', 'celulares', 'smartphone'],
    checkout: ['pago', 'pagos'],
    kpi: ['indicador', 'indicadores', 'metrica', 'metricas'],
    periodo: ['semana', 'semanas', 'mes', 'meses', 'trimestre']
});
function normalizeCaseText(value) {
    return String(value == null ? '' : value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function caseKeywordMatches(tokens, keyword) {
    const k = normalizeCaseText(keyword);
    if (!k) return false;
    const variants = [k, ...(CASE_KEYWORD_SYNONYMS[k] || [])];
    return variants.some(v => tokens.some(t => {
        if (v.length <= 3) return t === v || t === v + 's';          // siglas: palabra completa
        const stem = v.length >= 8 ? v.slice(0, v.length - 2) : v;    // raíz: investigar → investig(aría)
        return t.startsWith(stem);
    }));
}
function evaluateCaseComponent(component, value) {
    if (component.type === 'select') {
        // Number('') === 0: una selección vacía contaba como la opción 0 (que era siempre la correcta).
        if (value === '' || value === null || value === undefined) return false;
        return Number(value) === component.answer;
    }
    if (component.type === 'multi') return Array.isArray(value) && value.length >= (component.minSelections || 1);
    if (component.type === 'text') {
        const tokens = normalizeCaseText(value).split(' ').filter(Boolean);
        if (tokens.length < (component.minWords || 3)) return false;
        const hits = (component.keywords || []).filter(k => caseKeywordMatches(tokens, k));
        return hits.length >= (component.minKeywords || 1);
    }
    return false;
}
// Orden de opciones estable por caso/componente, pero no siempre con la correcta primero.
function caseOptionOrder(caseId, component) {
    const n = component.options.length, order = [...Array(n).keys()];
    let h = 2166136261;
    for (const ch of `${caseId}:${component.id}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; const j = h % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    return order;
}
function recordCaseAttempt(caseId, results) {
    const state=getCaseState(caseId), c=getCase(caseId); if (!c) return state;
    state.attempts += 1;
    const correctCount=Object.values(results).filter(Boolean).length;
    const result={attempt:state.attempts, results:{...results}, correctCount, total:c.components.length, timestamp:new Date().toISOString()};
    state.attemptResults.push(result); state.attemptResults=state.attemptResults.slice(-50);
    const failedComponents = c.components.filter(comp => results[comp.id] !== true).map(comp => comp.id);
    if (failedComponents.length) state.errorHistory.push({ attempt: state.attempts, components: failedComponents, timestamp: result.timestamp });
    state.errorHistory = state.errorHistory.slice(-50);
    Object.entries(results).forEach(([id, value]) => { state.componentResults[id] = state.componentResults[id] === true || value === true; });
    c.components.forEach(comp=>{ if(results[comp.id]) state.evidenceStages=[...new Set([...state.evidenceStages, comp.stage])]; });
    state.completed=Object.values(state.componentResults).filter(Boolean).length===c.components.length;
    state.lastActivityAt=result.timestamp;
    syncConceptEvidence();
    saveLearningState();
    return state;
}
function revealCaseHint(caseId) { const c=getCase(caseId), s=getCaseState(caseId); if(!c || s.completed || s.revealedHints.length>=c.hints.length)return; const idx=s.revealedHints.length; s.revealedHints.push(idx); s.hintsUsed+=1; saveLearningState(); renderCaseLab(); focusCaseHints(caseId); }
function caseEvidence(caseId) { const s=getCaseState(caseId), c=getCase(caseId); return { caseId, level:c?.level || null, attempts:s.attempts, hintsUsed:s.hintsUsed, completed:s.completed, components:s.componentResults, stages:s.evidenceStages, reviewCount:s.reviewCount||0, lastReviewAt:s.lastReviewAt||null }; }
// Estado de interfaz del laboratorio (solo memoria): lo escrito y el último mensaje sobreviven a cada re-render.
const caseDrafts = {};
const caseFeedbackHtml = {};
function captureCaseDrafts(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('[data-case-form]').forEach(form => {
        const draft = {};
        form.querySelectorAll('[data-case-input]').forEach(node => {
            const key = node.dataset.caseInput;
            if (node.type === 'checkbox') { draft[key] = draft[key] || []; if (node.checked) draft[key].push(node.value); }
            else draft[key] = node.value;
        });
        caseDrafts[form.dataset.caseForm] = draft;
    });
}
function restoreCaseDrafts(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('[data-case-form]').forEach(form => {
        const draft = caseDrafts[form.dataset.caseForm]; if (!draft) return;
        form.querySelectorAll('[data-case-input]').forEach(node => {
            const v = draft[node.dataset.caseInput];
            if (node.type === 'checkbox') node.checked = Array.isArray(v) && v.includes(node.value);
            else if (typeof v === 'string') node.value = v;
        });
    });
}
function caseCardElement(caseId) {
    const root = document.getElementById('case-lab');
    return root && typeof root.querySelector === 'function' ? root.querySelector(`[data-case-id="${caseId}"]`) : null;
}
function focusCaseElement(el) {
    if (!el) return;
    if (typeof el.setAttribute === 'function' && !/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName || '')) el.setAttribute('tabindex', '-1');
    if (typeof el.focus === 'function') el.focus();
}
function focusCaseFeedback(caseId) { const card = caseCardElement(caseId); if (card) focusCaseElement(card.querySelector('.case-feedback')); }
function focusCaseHints(caseId) { const card = caseCardElement(caseId); if (card) focusCaseElement(card.querySelector('[data-case-hint]') || card.querySelector('.hints-box')); }
function renderCaseLab() {
    const root=document.getElementById('case-lab'); if(!root)return;
    captureCaseDrafts(root);
    root.innerHTML=`<div class="case-lab-head"><div><h2>LABORATORIO DE CASOS ANALÍTICOS</h2><p>Resuelve situaciones completas: contexto → datos → pregunta → análisis → hallazgo → diagnóstico → hipótesis → recomendación → medición.</p></div><span class="case-lab-note">No es una calificación global.</span></div>${panelGuideHtml('cases')}`;
    if(!ANALYTICAL_CASES.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='Este curso todavía no tiene casos de práctica.';root.appendChild(empty);}
    ANALYTICAL_CASES.forEach(c=>{
        const s=getCaseState(c.id); const card=document.createElement('article'); card.className='case-card'; card.dataset.caseId=c.id;
        const componentRows=c.components.map((comp,i)=>{
            const inputId=`case-input-${c.id}-${comp.id}`, title=`${i+1}. ${comp.label}`;
            let control='';
            if(comp.type==='select') control=`<label for="${inputId}"><strong>${title}</strong></label><select id="${inputId}" data-case-input="${comp.id}"><option value="">Selecciona…</option>${caseOptionOrder(c.id,comp).map(j=>`<option value="${j}">${comp.options[j]}</option>`).join('')}</select>`;
            else if(comp.type==='multi') control=`<fieldset class="case-fieldset"><legend><strong>${title}</strong></legend>${comp.options.map((o,j)=>`<label class="case-check"><input type="checkbox" data-case-input="${comp.id}" value="${j}">${o}</label>`).join('')}</fieldset>`;
            else control=`<label for="${inputId}"><strong>${title}</strong></label><textarea id="${inputId}" data-case-input="${comp.id}" rows="2" placeholder="Escribe una respuesta verificable…"></textarea>`;
            return `<div class="case-component">${control}<span class="case-component-state">${s.componentResults[comp.id]===true?'✓ Evidencia registrada':'Pendiente'}</span></div>`;
        }).join('');
        const hints=c.hints.filter((_,i)=>s.revealedHints.includes(i)).map((h,i)=>`<p><strong>💡 Pista ${i+1}:</strong> ${h}</p>`).join('');
        card.innerHTML=`<div class="case-level">Nivel ${c.level} · ${c.mode==='guided'?'Guiado':c.mode==='partial'?'Parcialmente guiado':'Abierto'}</div><h3>${c.title}</h3><p>${c.context}</p><h4>Datos</h4><div class="case-data"><table>${c.data.map((row,r)=>`<tr>${row.map((cell,j)=>r===0?`<th>${cell}</th>`:`<td>${cell}</td>`).join('')}</tr>`).join('')}</table></div><h4>Pregunta de negocio</h4><p>${c.prompt}</p><form class="case-form" data-case-form="${c.id}">${componentRows}<button class="action-btn" type="submit">Registrar análisis</button></form><div class="case-feedback" aria-live="polite">${caseFeedbackHtml[c.id]||''}</div>${hints?`<div class="hints-box">${hints}</div>`:''}<div class="case-actions">${!s.completed && s.revealedHints.length<c.hints.length?`<button class="action-btn outline" type="button" data-case-hint="${c.id}">💡 Ver pista ${s.revealedHints.length+1}</button>`:''}</div><div class="case-evidence"><strong>Evidencia del caso</strong><span>${s.attempts} intento(s) · ${s.hintsUsed} pista(s) · ${s.completed?'caso completado':'en progreso'}</span><div>${ANALYTICAL_CHAIN.map(stage=>`<span class="case-stage ${s.evidenceStages.includes(stage)?'done':''}">${s.evidenceStages.includes(stage)?'✓ ':''}${ANALYTICAL_STAGE_LABELS[stage]}</span>`).join('')}</div></div>`;
        root.appendChild(card);
    });
    if (typeof root.querySelectorAll !== 'function') return;
    restoreCaseDrafts(root);
    root.querySelectorAll('[data-case-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault(); submitCase(form.dataset.caseForm,form);}));
    root.querySelectorAll('[data-case-hint]').forEach(btn=>btn.addEventListener('click',()=>revealCaseHint(btn.dataset.caseHint)));
}
function submitCase(caseId, form) {
    const c=getCase(caseId); if(!c)return; const values={};
    c.components.forEach(comp=>{ const nodes=[...form.querySelectorAll(`[data-case-input="${comp.id}"]`)]; values[comp.id]=comp.type==='multi'?nodes.filter(n=>n.checked).map(n=>n.value):nodes[0]?.value || ''; });
    const answered=c.components.some(comp=>Array.isArray(values[comp.id])?values[comp.id].length>0:String(values[comp.id]).trim()!=='');
    if(!answered){
        // Un envío vacío no es un intento: contaminaba el historial de errores y el repaso.
        caseFeedbackHtml[c.id]='<div class="error-box">Responde al menos un componente antes de registrar el análisis. Un envío vacío no cuenta como intento.</div>';
        renderCaseLab(); focusCaseFeedback(c.id); return;
    }
    const results={}; c.components.forEach(comp=>results[comp.id]=evaluateCaseComponent(comp,values[comp.id]));
    const state=recordCaseAttempt(caseId,results);
    const correct=Object.values(results).filter(Boolean).length;
    const pending=c.components.filter(comp=>results[comp.id]!==true).map(comp=>comp.label);
    caseFeedbackHtml[c.id]=state.completed?`<div class="success-box">Caso completado. Conservaste evidencia por componente; revisa especialmente las hipótesis que marcaste como verificables.</div>`:`<div class="error-box">${correct}/${c.components.length} componentes muestran evidencia suficiente. Pendientes: ${pending.join(', ') || 'ninguno'}. Revisa los elementos pendientes y utiliza las pistas para avanzar sin recibir la respuesta completa.</div>`;
    renderCaseLab(); focusCaseFeedback(c.id);   // el mensaje se guarda ANTES de re-renderizar: antes se borraba al instante
}
function loadCaseState(saved) { caseLearningState=createInitialCaseState(); Object.keys(caseLearningState).forEach(id=>caseLearningState[id]=sanitizeCaseState(saved?.[id])); Object.keys(caseDrafts).forEach(k=>delete caseDrafts[k]); Object.keys(caseFeedbackHtml).forEach(k=>delete caseFeedbackHtml[k]); }

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
let concepts = Object.freeze({
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
let exerciseMetadata = Object.freeze({
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

// ================================================================
// FASE 6 — PENSAMIENTO ANALÍTICO
// Capa pedagógica determinística: no interpreta lenguaje natural ni usa IA.
// ================================================================
const ANALYTICAL_STAGES = Object.freeze({
    OBSERVE: 'observe', QUANTIFY: 'quantify', COMPARE: 'compare',
    INTERPRET: 'interpret', SEGMENT: 'segment', DIAGNOSE: 'diagnose',
    HYPOTHESIZE: 'hypothesize', RECOMMEND: 'recommend', MEASURE: 'measure'
});
const ANALYTICAL_STAGE_LABELS = Object.freeze({
    observe: 'Observar', quantify: 'Cuantificar', compare: 'Comparar',
    interpret: 'Interpretar', segment: 'Segmentar', diagnose: 'Diagnosticar',
    hypothesize: 'Hipotetizar', recommend: 'Recomendar', measure: 'Medir'
});
const ANALYTICAL_CHAIN = Object.freeze([
    'observe','quantify','compare','interpret','segment','diagnose','hypothesize','recommend','measure'
]);
let analyticalActivityMetadata = Object.freeze({
    'l1-e1': { stages:['observe','quantify'], nextQuestion:'¿Qué cambia cuando comparas la meta calculada contra el periodo o canal de referencia?' },
    'l1-e2': { stages:['observe','quantify','compare'], nextQuestion:'¿Qué referencia usarías para saber si la distribución mensual es razonable?' },
    'l2-e1': { stages:['quantify','compare','interpret'], nextQuestion:'¿Qué significa el pacing observado frente al ritmo necesario para cerrar la meta?' },
    'l2-e2': { stages:['quantify','compare','interpret'], nextQuestion:'¿Qué dato adicional revisarías antes de convertir el forecast en una conclusión?' },
    'l3-e1': { stages:['observe','quantify','compare','interpret'], nextQuestion:'¿Qué componente explica principalmente el cambio y qué segmento investigarías después?' },
    'l4-e1': { stages:['quantify','compare','interpret','segment'], nextQuestion:'¿Dónde se concentra la diferencia y qué dato necesitarías para explicar por qué?' },
    'l5-e1': { stages:['observe','compare','segment','diagnose','hypothesize','measure'], nextQuestion:'¿Qué evidencia permitiría confirmar o debilitar la hipótesis sin presentarla como un hecho?' },
    'l6-e1': { stages:['observe','quantify','segment','diagnose','hypothesize','recommend','measure'], nextQuestion:'¿Qué evidencia adicional y qué KPI permitirían validar la hipótesis de fricción?' },
    'l7-e1': { stages:['quantify','compare','interpret','segment','hypothesize','measure'], nextQuestion:'¿Qué diferencia entre cohortes investigarías y qué evidencia usarías para explicarla?' },
    'l8-e1': { stages:['observe','quantify','compare','interpret','segment','diagnose','hypothesize','recommend','measure'], nextQuestion:'¿Cómo conectarías hallazgo, hipótesis, acción y KPI para comprobar si el análisis produjo una decisión útil?' }
});
let ANALYTICAL_RUBRICS = Object.freeze({
    'l5-e1': [['change','Identifiqué claramente la brecha o cambio observado.'],['evidence','Usé los datos del caso como evidencia.'],['driver','Identifiqué el driver principal.'],['segment','Localicé el segmento donde se concentra la señal.'],['fact_hypothesis','Separé el hecho observado de la hipótesis.'],['hypothesis','Formulé una hipótesis verificable.'],['measurement','Definí qué evidencia permitiría confirmarla o debilitarla.']],
    'l6-e1': [['change','Identifiqué la brecha principal.'],['driver','Identifiqué la etapa del funnel que explica la variación.'],['segment','Localicé el segmento más afectado.'],['evidence','Usé la señal de errores de pago como evidencia adicional.'],['fact_hypothesis','Separé señal observada de causa hipotética.'],['hypothesis','Formulé una hipótesis verificable.'],['recommendation','Propuse una acción de investigación concreta.'],['measurement','Definí KPI(s) para seguir el resultado.']],
    'l7-e1': [['calculation','Incluí los cálculos de frecuencia y AOV.'],['comparison','Comparé cohortes usando periodos equivalentes.'],['change','Identifiqué el cambio relevante de retención.'],['segment','Consideré diferencias entre cohortes.'],['fact_hypothesis','Separé el patrón observado de su posible causa.'],['hypothesis','Propuse qué investigaría para explicar la diferencia.']],
    'l8-e1': [['objective','Definí el objetivo y la referencia de comparación.'],['data','Identifiqué los datos y fuentes necesarios.'],['validation','Definí cómo validar la calidad de los datos.'],['quantify','Incluí brecha y métricas de ritmo/proyección.'],['segment','Propuse segmentación para localizar la señal.'],['diagnosis','Separé driver, segmento y evidencia.'],['hypothesis','Formulé una hipótesis verificable.'],['recommendation','Conecté la recomendación con el hallazgo.'],['measurement','Definí KPI, segmento, periodo y resultado esperado.']]
});
function getAnalyticalActivity(exerciseId) { return analyticalActivityMetadata[exerciseId] || { stages:[], nextQuestion:'' }; }
function getAnalyticalRubric(exerciseId) { return ANALYTICAL_RUBRICS[exerciseId] || []; }

let EXERCISE_TITLES = Object.freeze({
    'l1-e1': 'Lección 1 · Meta mensual por canal',
    'l1-e2': 'Lección 1 · Reto de metas por mes',
    'l2-e1': 'Lección 2 · Cumplimiento y pacing',
    'l2-e2': 'Lección 2 · Reto de cumplimiento y forecast',
    'l3-e1': 'Lección 3 · Descomposición de ventas',
    'l4-e1': 'Lección 4 · CR, AOV y RPS de Email',
    'l5-e1': 'Lección 5 · Causas de caída',
    'l6-e1': 'Lección 6 · Análisis del funnel',
    'l7-e1': 'Lección 7 · Clientes y cohortes',
    'l8-e1': 'Lección 8 · Proyecto integrador'
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
        title: base.title ?? EXERCISE_TITLES[base.id] ?? null,
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
        tags: Array.isArray(base.tags) ? base.tags : [],
        analyticalStages: Array.isArray(base.analyticalStages) ? base.analyticalStages : [...getAnalyticalActivity(base.id).stages],
        analyticalRubric: Array.isArray(base.analyticalRubric) ? base.analyticalRubric : [...getAnalyticalRubric(base.id)]
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
let LESSON_COGNITIVE_FLOW = Object.freeze({
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
        return `<li class="concept-evidence-row"><span><strong>${ct(entry.concept.name)}</strong><small>${levelLabel}</small></span><span class="evidence-state evidence-${evidence.state}">${label}</span></li>`;
    }).join('');
    return `<section class="concept-evidence" aria-label="Evidencia de aprendizaje de conceptos"><strong>Evidencia en esta lección</strong><span class="concept-evidence-note">Describe la evidencia disponible; no es una calificación.</span><ul>${rows}</ul></section>`;
}

function renderCognitiveProgression() {
    const lesson = lessons[currentIndex];
    if (!lesson) return;
    const lessonEl = document.getElementById(lesson.id);
    if (!lessonEl || typeof lessonEl.querySelector !== 'function') return;
    if (lesson.intro) return; // la introducción no tiene ruta cognitiva

    let panel = lessonEl.querySelector('.cognitive-progression');
    if (!panel) {
        panel = document.createElement('section');
        panel.className = 'cognitive-progression';
        panel.setAttribute('aria-label', 'Ruta de aprendizaje');
        // El video de introducción va primero, justo bajo el título; la ruta de aprendizaje va después.
        const heading = lessonEl.querySelector('.lesson-video') || lessonEl.querySelector('h2');
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
const PERSISTENCE_SCHEMA_VERSION = 2;
const PERSISTENCE_MAX_HISTORY = 100;

// ================================================================
// PLATAFORMA MULTI-CURSO (Fase 14)
// El curso es la unidad principal. COURSE_REGISTRY lista y valida cursos;
// el almacenamiento guarda UN blob de estado por courseId. El blob por curso
// conserva el formato v2 existente (PERSISTENCE_SCHEMA_VERSION), de modo que
// el motor actual no cambia. La clave anterior se conserva como respaldo.
// ================================================================
// Contenido del curso que el motor consulta (se reasigna en applyCourseContext). Valores iniciales = curso Analista.
let QUALITATIVE_EXERCISE_IDS = ['l5-e1', 'l6-e1', 'l7-e1', 'l8-e1'];
let SOLUTION_ELEMENT_IDS = {
    'l1-e1': 'sol-l1', 'l1-e2': 'sol-l1-reto', 'l2-e1': 'sol-l2-p', 'l2-e2': 'sol-l2-r', 'l3-e1': 'sol-l3',
    'l4-e1': 'sol-l4', 'l5-e1': 'sol-l5', 'l6-e1': 'sol-l6', 'l7-e1': 'sol-l7'
};
let exerciseContent = {}; // contenido declarativo de ejercicios (cursos sin HTML propio)
// Solo el curso integrado puede llevar marcado HTML en sus textos; el contenido de los cursos editables es texto plano
// y se escapa donde el motor lo escribe con innerHTML. (No es una propiedad del curso: un archivo importado no puede activarla.)
const TRUSTED_HTML_COURSES = new Set(['analista-ecommerce']);
function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function ct(value) { return TRUSTED_HTML_COURSES.has(activeCourseId) ? String(value == null ? '' : value) : escapeHtml(value); }
const DECLARATIVE_ALLOWED_KEYS = Object.freeze(['id', 'title', 'description', 'version', 'status', 'category', 'author', 'thumbnail', 'modules', 'lessons', 'concepts', 'exercises', 'exerciseContent', 'exerciseTitles', 'lessonContent', 'cases', 'videos']);
const DECLARATIVE_BLOCKS = Object.freeze(['heading', 'paragraph', 'list', 'example', 'exercise']);
const LEGACY_PROGRESS_KEY = PROGRESS_STORAGE_KEY;
const PLATFORM_STORAGE_KEY = 'plataforma.aprendizaje.v1';
const PLATFORM_SCHEMA_VERSION = 3;
const DEFAULT_COURSE_ID = 'analista-ecommerce';
const COURSE_STATUSES = Object.freeze(['active', 'draft', 'archived']);
const COURSE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateExerciseContent(id, def, reasons) {
    if (!def || typeof def !== 'object') { reasons.push(`ejercicio ${id}: contenido inválido`); return; }
    if (typeof def.prompt !== 'string' || !def.prompt.trim()) reasons.push(`ejercicio ${id}: sin enunciado`);
    if (def.kind === 'numeric') {
        const fields = Array.isArray(def.fields) ? def.fields : [];
        const ids = fields.map(f => f && f.id);
        if (!fields.length || fields.some(f => !f || typeof f.id !== 'string' || !COURSE_ID_PATTERN.test(f.id) || typeof f.label !== 'string' || !Number.isFinite(f.answer)) || new Set(ids).size !== ids.length) reasons.push(`ejercicio ${id}: campos numéricos inválidos`);
    } else if (def.kind === 'choice') {
        const options = Array.isArray(def.options) ? def.options : [];
        const ids = options.map(o => o && o.id);
        if (options.length < 2 || options.some(o => !o || typeof o.id !== 'string' || !o.id || typeof o.text !== 'string') || new Set(ids).size !== ids.length || options.filter(o => o.correct === true).length !== 1) reasons.push(`ejercicio ${id}: opciones inválidas (mínimo 2 y exactamente una correcta)`);
    } else reasons.push(`ejercicio ${id}: tipo no soportado`);
    if (def.solution !== undefined && (!Array.isArray(def.solution) || def.solution.some(t => typeof t !== 'string'))) reasons.push(`ejercicio ${id}: solución inválida`);
}
function validateLessonContent(course, courseLessons, reasons) {
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    Object.keys(course).forEach(k => { if (!DECLARATIVE_ALLOWED_KEYS.includes(k)) reasons.push(`propiedad no soportada en cursos editables: ${k}`); });
    if (Array.isArray(course.cases) ? course.cases.length : course.cases !== undefined && course.cases !== null) reasons.push('los cursos editables todavía no admiten casos analíticos');
    const lc = course.lessonContent;
    if (!lc || typeof lc !== 'object' || Array.isArray(lc)) { reasons.push('contenido de lecciones inválido'); return; }
    const ec = course.exerciseContent && typeof course.exerciseContent === 'object' ? course.exerciseContent : {};
    courseLessons.forEach(l => {
        if (!l || !has(lc, l.id)) { reasons.push(`lección sin contenido: ${l && l.id}`); return; }
        const blocks = Array.isArray(lc[l.id].blocks) ? lc[l.id].blocks : [];
        const rendered = [];
        blocks.forEach(b => {
            if (!b || !DECLARATIVE_BLOCKS.includes(b.type)) { reasons.push(`lección ${l.id}: bloque no soportado`); return; }
            if (b.type === 'exercise') { rendered.push(b.exerciseId); if (!(l.exercises || []).includes(b.exerciseId)) reasons.push(`lección ${l.id}: ejercicio ajeno ${b.exerciseId}`); }
            else if (b.type === 'list') { if (!Array.isArray(b.items) || b.items.some(t => typeof t !== 'string')) reasons.push(`lección ${l.id}: lista inválida`); }
            else if (typeof b.text !== 'string') reasons.push(`lección ${l.id}: bloque sin texto`);
        });
        (l.exercises || []).forEach(ex => {
            const meta = course.exercises && has(course.exercises, ex) ? course.exercises[ex] : null;
            if (meta) {
                if (!Object.values(EXERCISE_TYPES).includes(meta.type)) reasons.push(`ejercicio ${ex}: tipo pedagógico inválido`);
                if (!Object.values(COGNITIVE_LEVELS).includes(meta.cognitiveLevel)) reasons.push(`ejercicio ${ex}: nivel cognitivo inválido`);
                if (!Number.isInteger(meta.difficulty) || meta.difficulty < 1 || meta.difficulty > 5) reasons.push(`ejercicio ${ex}: dificultad inválida (1 a 5)`);
                if (!Array.isArray(meta.hints) || meta.hints.some(t => typeof t !== 'string')) reasons.push(`ejercicio ${ex}: pistas inválidas`);
                const known = course.concepts && typeof course.concepts === 'object' ? course.concepts : {};
                (Array.isArray(meta.concepts) ? meta.concepts : []).forEach(cid => { if (!has(known, cid)) reasons.push(`ejercicio ${ex}: concepto inexistente ${cid}`); });
            }
            if (!rendered.includes(ex)) reasons.push(`ejercicio ${ex} no aparece en la lección ${l.id}`);
            if (!has(ec, ex)) reasons.push(`ejercicio ${ex}: sin contenido`); else validateExerciseContent(ex, ec[ex], reasons);
        });
    });
}
function validateCourseDefinition(course) {
    const reasons = [];
    if (!course || typeof course !== 'object') return { ok: false, reasons: ['curso inválido'] };
    if (typeof course.id !== 'string' || !COURSE_ID_PATTERN.test(course.id)) reasons.push('id inválido');
    if (typeof course.title !== 'string' || !course.title.trim()) reasons.push('título faltante');
    if (typeof course.version !== 'string' || !course.version) reasons.push('versión faltante');
    if (!COURSE_STATUSES.includes(course.status)) reasons.push('estado inválido');
    const courseLessons = Array.isArray(course.lessons) ? course.lessons : [];
    if (!courseLessons.length) reasons.push('sin lecciones');
    const lessonIds = courseLessons.map(l => l && l.id);
    if (lessonIds.some(id => typeof id !== 'string' || !id) || new Set(lessonIds).size !== lessonIds.length) reasons.push('ids de lección inválidos o repetidos');
    const defs = course.exercises && typeof course.exercises === 'object' ? course.exercises : {};
    courseLessons.forEach(l => (l && l.exercises || []).forEach(ex => { if (!defs[ex]) reasons.push(`ejercicio sin definición: ${ex}`); }));
    (Array.isArray(course.modules) ? course.modules : []).forEach(m => (m.lessonIds || []).forEach(id => { if (!lessonIds.includes(id)) reasons.push(`módulo ${m.id} apunta a lección inexistente: ${id}`); }));
    if (course.lessonContent !== undefined) validateLessonContent(course, courseLessons, reasons);
    return { ok: reasons.length === 0, reasons };
}

const COURSE_REGISTRY = (() => {
    const items = new Map();
    // Los ids de lección son ids del DOM y los de ejercicio identifican evidencia: no pueden repetirse entre cursos.
    function checkRegistration(course, ignoreId) {
        const check = validateCourseDefinition(course);
        if (!check.ok) return check;
        const clashes = [];
        items.forEach(other => {
            if (other.id === ignoreId) return;
            course.lessons.forEach(l => { if (other.lessons.some(o => o.id === l.id)) clashes.push(`id de lección ya usado en ${other.id}: ${l.id}`); });
            Object.keys(course.exercises || {}).forEach(ex => { if (other.exercises && Object.prototype.hasOwnProperty.call(other.exercises, ex)) clashes.push(`id de ejercicio ya usado en ${other.id}: ${ex}`); });
        });
        return { ok: clashes.length === 0, reasons: clashes };
    }
    return Object.freeze({
        validate: validateCourseDefinition,
        checkRegistration(course, options = {}) { return checkRegistration(course, options.ignoreId); },
        register(course) {
            const check = validateCourseDefinition(course);
            if (!check.ok) return check;
            if (items.has(course.id)) return { ok: false, reasons: ['id duplicado'] };
            const result = checkRegistration(course, null);
            if (result.ok) items.set(course.id, course);
            return result;
        },
        // Inserta o reemplaza (uso del editor de contenido): valida igual que register, ignorando al propio curso.
        upsert(course) {
            const result = checkRegistration(course, course && course.id);
            if (result.ok) items.set(course.id, course);
            return result;
        },
        remove(id) { return items.delete(id); },
        get(id) { return items.get(id) || null; },
        has(id) { return items.has(id); },
        list(filter = {}) { return [...items.values()].filter(c => !filter.status || c.status === filter.status); },
        isActivatable(id) { const c = items.get(id); return Boolean(c && c.status === 'active'); }
    });
})();


let activeCourseId = DEFAULT_COURSE_ID;
function getActiveCourseId() { return activeCourseId; }
function resolveActiveCourseId(candidate) {
    return typeof candidate === 'string' && COURSE_REGISTRY.isActivatable(candidate) ? candidate : DEFAULT_COURSE_ID;
}

// Contexto del motor: ÚNICO punto donde el contenido de un curso se enlaza al motor.
// El motor (intentos, pistas, feedback, evidencia, repaso, dashboard, evaluación) no conoce cursos concretos.
function emptyAssessment(course) { return Object.freeze({ id: `${course.id}-assessment`, title: '', criteria: [], rubric: [] }); }
function applyCourseContext(course) {
    lessons = course.lessons;
    concepts = course.concepts || {};
    exerciseMetadata = course.exercises || {};
    ANALYTICAL_CASES = course.cases || [];
    FINAL_ASSESSMENT = course.assessment || emptyAssessment(course);
    EXERCISE_TITLES = course.exerciseTitles || {};
    analyticalActivityMetadata = course.analyticalActivities || {};
    ANALYTICAL_RUBRICS = course.analyticalRubrics || {};
    errorProfiles = course.errorProfiles || {};
    analystThinking = course.analystThinking || {};
    LESSON_COGNITIVE_FLOW = course.cognitiveFlow || {};
    exerciseContent = course.exerciseContent || {};
    QUALITATIVE_EXERCISE_IDS = course.qualitativeExercises || [];
    SOLUTION_ELEMENT_IDS = course.solutionElements || {};
}
function getEngineContext() { return { courseId: activeCourseId, lessons, concepts, exerciseMetadata, cases: ANALYTICAL_CASES, assessment: FINAL_ASSESSMENT }; }
function courseHasAssessment() { return Array.isArray(FINAL_ASSESSMENT.criteria) && FINAL_ASSESSMENT.criteria.length > 0; }

// Elementos que dependen del curso (título, evaluación disponible).
function renderCourseChrome() {
    const course = COURSE_REGISTRY.get(activeCourseId);
    if (!course || typeof document === 'undefined') return;
    const label = document.querySelector('.course-label'); if (label) label.textContent = course.title;
    const orientation = document.getElementById('orientation-course'); if (orientation) orientation.textContent = course.title;
    const assessmentBtn = document.getElementById('assessment-btn'); if (assessmentBtn) assessmentBtn.hidden = !courseHasAssessment();
}

function setStoredActiveCourse(courseId) {
    const store = readPlatformStore();
    if (store.status !== 'ok' && store.status !== 'empty') return false;
    const root = store.root || createPlatformRoot();
    root.activeCourseId = courseId;
    localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(root));
    return true;
}

// Cambia de curso: guarda el actual, enlaza el contenido del nuevo y carga SU estado.
function setActiveCourse(courseId, options = {}) {
    if (!COURSE_REGISTRY.isActivatable(courseId)) return { ok: false, reason: 'unavailable' };
    if (courseId === activeCourseId && !options.force) return { ok: true, changed: false, courseId };
    if (persistenceState.status === 'corrupt' || persistenceState.status === 'unsupported') return { ok: false, reason: 'storage_unwritable' };
    pauseLessonVideos();
    saveLearningState();
    loadLearningState(courseId);
    try { setStoredActiveCourse(courseId); } catch (error) { console.warn('No se pudo guardar el curso activo:', error); }
    if (typeof updateUI === 'function' && mainContainer) { bindCourseToDom(); updateUI(); renderCaseLab(); renderReviewPanel(); renderDashboard(); }
    return { ok: true, changed: true, courseId };
}

// ================================================================
// RENDERIZADOR DECLARATIVO DE LECCIONES Y EJERCICIOS
// Un curso sin HTML propio describe lecciones (bloques) y ejercicios (numeric | choice) como datos.
// El renderizador los convierte en el mismo marcado que usa el motor (exercise-box, learning-controls,
// feedback, solución) y reutiliza intentos, pistas, solución y evidencia del motor: no hay lógica por curso.
// ================================================================
function lessonsHostElement() { const first = document.getElementById('l0'); return first ? first.parentNode : null; }
function clearDynamicLessons() { document.querySelectorAll('[data-dynamic-lesson]').forEach(node => node.remove()); }
function evaluateDeclarativeExercise(def, readField, readChoice) {
    if (def.kind === 'numeric') {
        const answers = {}; let correct = true, empty = false;
        def.fields.forEach(f => {
            const value = parseFloat(readField(f.id));
            if (Number.isNaN(value)) empty = true;
            answers[f.id] = value;
            if (!isCorrect(value, f.answer, Number.isFinite(f.tolerance) ? f.tolerance : 1)) correct = false;
        });
        return empty ? { empty: true } : { empty: false, correct, answers };
    }
    const picked = readChoice();
    if (!picked) return { empty: true };
    return { empty: false, correct: def.options.some(o => o.id === picked && o.correct === true), answers: picked };
}
// opts.preview: vista previa del editor (ids con prefijo, sin intentos ni evidencia, pistas y solución visibles).
function buildDeclarativeExercise(def, opts = {}) {
    const id = def.id, pre = opts.preview ? 'pv-' : '';
    const box = h('div', { class: 'exercise-box', 'data-exercise-block': id });
    box.append(h('h4', { text: def.prompt }));
    if (def.kind === 'numeric') {
        box.append(h('div', { class: 'input-grid' }, def.fields.map(f => h('label', {}, `${f.label} `, h('input', { type: 'number', step: 'any', id: `${pre}${id}-${f.id}` })))));
    } else {
        box.append(h('div', { class: 'choice-group', role: 'radiogroup', 'aria-label': def.prompt },
            def.options.map(o => h('label', { class: 'choice-option' }, h('input', { type: 'radio', name: `${pre}${id}`, value: o.id }), ` ${o.text}`))));
    }
    const fb = h('div', { class: 'feedback', id: `${pre}feedback-${id}`, 'aria-live': 'polite' });
    const onCheck = opts.preview ? () => {
        const r = evaluateDeclarativeExercise(def, fid => { const el = document.getElementById(`${pre}${id}-${fid}`); return el ? el.value : ''; },
            () => { const el = document.querySelector(`input[name="${pre}${id}"]:checked`); return el ? el.value : null; });
        fb.textContent = '';
        if (r.empty) fb.append(h('div', { class: 'error-box', text: 'Completa la respuesta antes de comprobar.' }));
        else fb.append(h('div', { class: r.correct ? 'success-box' : 'error-box', text: r.correct ? (def.successMessage || '¡Correcto!') : (def.errorMessage || 'Todavía no. Revisa tu respuesta y vuelve a intentarlo.') }));
    } : () => checkDeclarativeExercise(id);
    box.append(h('button', { type: 'button', class: 'action-btn', onclick: onCheck }, 'Comprobar respuesta'));
    if (opts.preview) {
        if (opts.hints && opts.hints.length) box.append(h('details', { class: 'preview-hints' }, h('summary', { text: `Pistas (${opts.hints.length})` }), h('ol', {}, opts.hints.map(t => h('li', { text: t })))));
        box.append(fb);
        if (def.solution) box.append(h('details', { class: 'preview-solution' }, h('summary', { text: 'Solución' }), def.solution.map(t => h('p', { text: t }))));
    } else {
        box.append(h('div', { class: 'learning-controls', 'data-learning-controls': id }));
        box.append(fb);
        if (def.solution) box.append(h('div', { class: 'hidden-solution', id: `sol-${id}` }, h('h4', { text: 'Solución' }), def.solution.map(t => h('p', { text: t }))));
    }
    return box;
}
function buildDeclarativeLesson(course, lesson, content, opts = {}) {
    const el = h('div', opts.preview ? { class: 'lesson-preview' } : { class: 'lesson', id: lesson.id, 'data-dynamic-lesson': course.id });
    el.append(h('h2', { text: lesson.title }));
    if (!opts.preview) el.append(h('figure', { class: 'lesson-video', 'data-video-slot': lesson.id, 'data-video-title': lesson.title, 'data-course-id': course.id }));
    if (content.meta) {
        const m = content.meta, parts = [];
        if (m.topic) parts.push(h('strong', { text: 'Tema:' }), ` ${m.topic}`, h('br'));
        if (m.level) parts.push(h('strong', { text: 'Nivel:' }), ` ${m.level}`, h('br'));
        if (m.duration) parts.push(h('strong', { text: 'Duración estimada:' }), ` ${m.duration}`);
        if (parts.length) el.append(h('div', { class: 'meta-info' }, h('p', {}, parts)));
    }
    content.blocks.forEach(b => {
        if (b.type === 'heading') el.append(h('h3', { text: b.text }));
        else if (b.type === 'paragraph') el.append(h('p', { text: b.text }));
        else if (b.type === 'list') el.append(h('ul', {}, b.items.map(t => h('li', { text: t }))));
        else if (b.type === 'example') el.append(h('blockquote', {}, b.title ? h('strong', { text: `${b.title}: ` }) : null, b.text));
        else if (b.type === 'exercise') {
            const def = course.exerciseContent && course.exerciseContent[b.exerciseId];
            if (def) el.append(buildDeclarativeExercise(Object.assign({ id: b.exerciseId }, def), { preview: Boolean(opts.preview), hints: ((course.exercises || {})[b.exerciseId] || {}).hints }));
        }
    });
    return el;
}
function refreshExerciseUIs() {
    lessons.forEach(l => (l.exercises || []).forEach(id => {
        const sid = getSolutionId(id), solutionEl = sid && document.getElementById(sid);
        if (solutionEl && getLearningState(id).solutionViewed) solutionEl.classList.add('show');
        renderExerciseLearningUI(id);
    }));
}
// Enlaza el curso activo con el DOM: construye sus lecciones declarativas (si las tiene) y refresca controles.
function bindCourseToDom() {
    const course = COURSE_REGISTRY.get(activeCourseId);
    if (!course || typeof document === 'undefined' || !document.querySelectorAll) return;
    clearDynamicLessons();
    const host = lessonsHostElement();
    if (course.lessonContent && host) {
        course.lessons.forEach(lesson => { if (course.lessonContent[lesson.id]) host.appendChild(buildDeclarativeLesson(course, lesson, course.lessonContent[lesson.id])); });
        initLessonVideos(); applyLearnerName();
    }
    refreshExerciseUIs();
}
function checkDeclarativeExercise(exerciseId) {
    const def = Object.prototype.hasOwnProperty.call(exerciseContent, exerciseId) ? exerciseContent[exerciseId] : null;
    if (!def) return null;
    const fb = document.getElementById(`feedback-${exerciseId}`);
    const say = (cls, text) => { if (fb) { fb.textContent = ''; fb.append(h('div', { class: cls, text })); } };
    const result = evaluateDeclarativeExercise(def,
        fid => { const el = document.getElementById(`${exerciseId}-${fid}`); return el ? el.value : ''; },
        () => { const el = document.querySelector(`input[name="${exerciseId}"]:checked`); return el ? el.value : null; });
    if (result.empty) { say('error-box', def.kind === 'numeric' ? 'Completa todas las respuestas antes de comprobar.' : 'Elige una opción antes de comprobar.'); return { ok: false, reason: 'empty' }; }
    const state = recordAttempt(exerciseId, result.correct, result.answers);
    if (result.correct) { say('success-box', def.successMessage || '¡Correcto!'); markExerciseDone(exerciseId); }
    else { say('error-box', def.errorMessage || 'Todavía no. Revisa tu respuesta y vuelve a intentarlo.'); renderExerciseLearningUI(exerciseId); }
    return { ok: true, correct: result.correct, state };
}

// ================================================================
// MIS CURSOS — vista de plataforma (descriptiva: sin puntos, rankings ni competencia)
// ================================================================
function summarizeCourse(courseId) {
    const course = COURSE_REGISTRY.get(courseId);
    if (!course) return null;
    let state = null;
    if (courseId === activeCourseId) state = buildPersistableState();
    else { const store = readPlatformStore(); const entry = store.status === 'ok' && Object.prototype.hasOwnProperty.call(store.root.courses, courseId) ? store.root.courses[courseId] : null; state = entry && entry.state; }
    const ex = state && state.exercises && typeof state.exercises === 'object' ? state.exercises : {};
    const ids = course.lessons.flatMap(l => l.exercises || []);
    const stat = id => (Object.prototype.hasOwnProperty.call(ex, id) && ex[id] && typeof ex[id] === 'object') ? ex[id] : {};
    const completedExercises = ids.filter(id => stat(id).completed === true).length;
    const attempts = ids.reduce((n, id) => n + (Number.isFinite(stat(id).attempts) ? stat(id).attempts : 0), 0);
    const index = Math.max(0, course.lessons.findIndex(l => state && l.id === state.currentLessonId));
    const started = attempts > 0 || completedExercises > 0 || index > 0;
    return { courseId, title: course.title, description: course.description, totalExercises: ids.length, completedExercises, attempts, started, resumeLesson: course.lessons[index], isActive: courseId === activeCourseId };
}
function openCourse(courseId) {
    const result = setActiveCourse(courseId);
    if (result.ok && !result.changed) showView('course');
    return result;
}
function renderCoursesPanel() {
    const root = document.getElementById('courses-panel');
    if (!root) return;
    root.textContent = '';
    const cards = COURSE_REGISTRY.list({ status: 'active' }).map(c => {
        const sum = summarizeCourse(c.id);
        const status = sum.started ? 'En progreso' : 'No iniciado';
        return h('article', { class: `course-card${sum.isActive ? ' is-active' : ''}`, 'data-course-card': c.id },
            h('div', { class: 'course-card-head' }, h('h3', { text: c.title }), sum.isActive ? h('span', { class: 'course-pill', text: 'Curso abierto' }) : null),
            h('p', { class: 'course-category', text: c.category || '' }),
            h('p', { class: 'course-description', text: c.description || '' }),
            h('p', { class: 'course-status', 'data-course-status': c.id, text: status }),
            h('p', { class: 'course-progress', text: sum.started ? `${sum.completedExercises} de ${sum.totalExercises} ejercicios resueltos · ${sum.attempts} intento${sum.attempts === 1 ? '' : 's'}` : `${sum.totalExercises} ejercicios por resolver` }),
            sum.started ? h('p', { class: 'course-resume', text: `Continuarás en: ${sum.resumeLesson.title}` }) : null,
            h('button', { type: 'button', class: 'action-btn', 'data-open-course': c.id, onclick: () => openCourse(c.id) }, sum.started ? 'Continuar →' : 'Comenzar →'));
    });
    root.append(
        h('h2', { text: 'Mis cursos', tabindex: '-1' }),
        h('p', { class: 'content-guide', text: 'Cada curso guarda su propio progreso, evidencia, repaso y evaluación. Elige uno para continuar donde te quedaste.' }),
        h('div', { class: 'course-grid' }, cards));
}

// ---- Menú de herramientas (móvil) y ruta del curso (escritorio ancho) ----
function toggleToolsMenu(force) {
    const tools = document.getElementById('nav-tools'), btn = document.getElementById('tools-toggle');
    if (!tools || !btn) return false;
    const open = typeof force === 'boolean' ? force : !tools.classList.contains('is-open');
    if (open) tools.classList.add('is-open'); else tools.classList.remove('is-open');
    btn.setAttribute('aria-expanded', String(open));
    return open;
}
function goToLesson(index) {
    // Solo hacia atrás o a la lección actual: avanzar sigue pasando por "Siguiente" y sus avisos.
    if (!Number.isInteger(index) || index < 0 || index > currentIndex) return false;
    if (currentPanelView() !== 'course') showView('course');
    if (index !== currentIndex) { currentIndex = index; saveLearningState(); updateUI(); }
    return true;
}
function renderCourseOutline() {
    const host = document.getElementById('course-outline');
    const course = COURSE_REGISTRY.get(activeCourseId);
    if (!host || !course || typeof host.append !== 'function') return; // sin DOM real (pruebas simuladas) no hay ruta que dibujar
    host.textContent = '';
    host.append(h('p', { class: 'outline-course', text: course.title }));
    const modules = (course.modules && course.modules.length) ? course.modules : [{ id: 'all', title: 'Lecciones', lessonIds: course.lessons.map(l => l.id) }];
    modules.forEach(m => {
        const items = m.lessonIds.map(id => ({ lesson: course.lessons.find(l => l.id === id), index: lessons.findIndex(l => l.id === id) })).filter(x => x.lesson && x.index >= 0);
        if (!items.length) return;
        host.append(h('p', { class: 'outline-module', text: m.title }));
        host.append(h('ul', { class: 'outline-list' }, items.map(({ lesson, index }) => {
            const done = Boolean(lessonStatus[lesson.id] && lessonStatus[lesson.id].completed);
            const mark = h('span', { class: 'outline-mark', 'aria-hidden': 'true', text: done ? '✓' : '' });
            const label = h('span', { text: lesson.title });
            const current = index === currentIndex, reachable = index <= currentIndex;
            return h('li', {}, reachable
                ? h('button', { type: 'button', class: 'outline-item', 'aria-current': current ? 'step' : null, 'data-outline-lesson': lesson.id, onclick: () => goToLesson(index) }, mark, label, done ? h('span', { class: 'sr-only', text: ' (completada)' }) : null)
                : h('span', { class: 'outline-item is-locked', 'data-outline-lesson': lesson.id }, mark, label));
        })));
    });
}

function createPlatformRoot() { return { schemaVersion: PLATFORM_SCHEMA_VERSION, activeCourseId: DEFAULT_COURSE_ID, courses: {}, migrations: [], content: {} }; }

// Lee el almacén de plataforma. Si no existe pero hay progreso anterior, lo migra UNA vez
// (copia al curso analista-ecommerce y registra la migración); la clave anterior no se borra.
function readPlatformStore() {
    const rawText = localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (rawText === null || rawText === undefined) {
        const legacyText = localStorage.getItem(LEGACY_PROGRESS_KEY);
        if (legacyText === null || legacyText === undefined) return { status: 'empty', root: null, rawText: null };
        let legacy;
        try { legacy = JSON.parse(legacyText); } catch (error) { return { status: 'corrupt', root: null, rawText: legacyText }; }
        if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return { status: 'corrupt', root: null, rawText: legacyText };
        const now = new Date().toISOString();
        const root = createPlatformRoot();
        root.courses[DEFAULT_COURSE_ID] = { state: legacy, updatedAt: now };
        root.migrations.push({ id: 'legacy-progress-to-multicourse', from: LEGACY_PROGRESS_KEY, courseId: DEFAULT_COURSE_ID, at: now, legacyKeyKept: true });
        const serialized = JSON.stringify(root);
        try { localStorage.setItem(PLATFORM_STORAGE_KEY, serialized); } catch (error) { console.warn('No se pudo registrar la migración:', error); }
        return { status: 'ok', root, rawText: serialized, migratedFromLegacy: true };
    }
    let root;
    try { root = JSON.parse(rawText); } catch (error) { return { status: 'corrupt', root: null, rawText }; }
    if (!root || typeof root !== 'object' || Array.isArray(root) || !Number.isInteger(root.schemaVersion)) return { status: 'corrupt', root: null, rawText };
    if (root.schemaVersion > PLATFORM_SCHEMA_VERSION) return { status: 'unsupported', root: null, rawText, unsupportedVersion: root.schemaVersion };
    if (root.schemaVersion < PLATFORM_SCHEMA_VERSION || !root.courses || typeof root.courses !== 'object' || Array.isArray(root.courses)) return { status: 'corrupt', root: null, rawText };
    if (!Array.isArray(root.migrations)) root.migrations = [];
    return { status: 'ok', root, rawText };
}

function writeCourseStateText(courseId, payloadText) {
    const store = readPlatformStore();
    if (store.status === 'corrupt' || store.status === 'unsupported') throw new Error('El almacenamiento de la plataforma no es escribible.');
    const root = store.root || createPlatformRoot();
    root.activeCourseId = courseId;
    root.courses[courseId] = { state: JSON.parse(payloadText), updatedAt: new Date().toISOString() };
    localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(root));
}

function clearCourseState(courseId) {
    const store = readPlatformStore();
    if (store.status !== 'ok') return;
    delete store.root.courses[courseId];
    localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(store.root));
}
let exerciseLearningState = {};
let navigationState = { activeView: 'course', activeActivityId: null };
let persistenceState = { status: 'healthy', schemaVersion: PERSISTENCE_SCHEMA_VERSION, migratedFrom: null, error: null };
let lastPersistedSignature = null;
let persistenceMetrics = { writes: 0, skippedWrites: 0, lastWriteMs: 0, lastPayloadBytes: 0 };
let pendingImportText = null;

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
        lastErrorType: null,
        qualitativeCriteria: {},
        analyticalStagesPracticed: [],
        reviewCount: 0,
        lastReviewAt: null
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
    return { currentIndex: 0, learnerProfile: { name: '' }, lessonStatus: lessonsState, exercises: exercisesState, conceptEvidence: {}, caseLearningState: createInitialCaseState(), reviewLearningState: createReviewState(), finalAssessmentState: createFinalAssessmentState() };
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
        lastErrorType: typeof raw.lastErrorType === 'string' ? raw.lastErrorType : null,
        qualitativeCriteria: raw.qualitativeCriteria && typeof raw.qualitativeCriteria === 'object' ? { ...raw.qualitativeCriteria } : {},
        analyticalStagesPracticed: Array.isArray(raw.analyticalStagesPracticed) ? [...new Set(raw.analyticalStagesPracticed.filter(stage => ANALYTICAL_CHAIN.includes(stage)))] : [],
        reviewCount: Number.isInteger(raw.reviewCount) && raw.reviewCount >= 0 ? raw.reviewCount : 0,
        lastReviewAt: typeof raw.lastReviewAt === 'string' ? raw.lastReviewAt : null
    };
}

function createConceptEvidenceRecord(conceptId, cognitiveLevel) {
    return {
        conceptId,
        cognitiveLevel,
        state: EVIDENCE_STATES.NOT_STARTED,
        exerciseIds: [],
        caseIds: [],
        attempts: 0,
        correct: false,
        firstAttemptCorrect: false,
        hintsUsed: 0,
        solutionViewed: false,
        errorTypes: [],
        errorTypeCounts: {},
        analyticalStagesPracticed: [],
        criteriaMet: [],
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

const DIFFICULTY_MIN_FAILURES = 2;
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
                            if (error?.type) {
                                if (!record.errorTypes.includes(error.type)) record.errorTypes.push(error.type);
                                record.errorTypeCounts[error.type] = (record.errorTypeCounts[error.type] || 0) + 1;
                            }
                        });
                    }
                    record.reviewCount += Number(state.reviewCount) || 0;
                    if (state.lastReviewAt) record.lastActivityAt = state.lastReviewAt;
                    if (Array.isArray(state.analyticalStagesPracticed)) {
                        state.analyticalStagesPracticed.forEach(stage => {
                            if (ANALYTICAL_CHAIN.includes(stage) && !record.analyticalStagesPracticed.includes(stage)) record.analyticalStagesPracticed.push(stage);
                        });
                    }
                    if (state.qualitativeCriteria && typeof state.qualitativeCriteria === 'object') {
                        Object.entries(state.qualitativeCriteria).forEach(([criterion, checked]) => {
                            if (checked === true && !record.criteriaMet.includes(criterion)) record.criteriaMet.push(criterion);
                        });
                    }
                    // Un primer intento fallido es práctica normal, no dificultad: hace falta ayuda, solución vista o fallos repetidos.
                    // (Los ejercicios de texto libre siempre se registran como pendientes en su primer intento.)
                    const failedAttempts = Array.isArray(state.attemptResults) ? state.attemptResults.filter(result => result && result.correct === false).length : 0;
                    const errorCount = Array.isArray(state.errorHistory) ? state.errorHistory.length : 0;
                    const difficult = (Number(state.hintsUsed) || 0) > 0 || state.solutionViewed === true ||
                        errorCount >= DIFFICULTY_MIN_FAILURES || failedAttempts >= DIFFICULTY_MIN_FAILURES;
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

    // Los casos también generan evidencia de conceptos, sin convertirse en ejercicios independientes.
    ANALYTICAL_CASES.forEach(caseItem => {
        const state = caseLearningState[caseItem.id] || createCaseLearningState();
        if (state.attempts === 0) return;
        caseItem.concepts.forEach(conceptId => {
            caseItem.components.forEach(component => {
                const key = `${conceptId}::${component.stage}`;
                const record = ensure(conceptId, component.stage);
                if (!record.caseIds.includes(caseItem.id)) record.caseIds.push(caseItem.id);
                record.attempts += state.attempts;
                const componentCorrect = state.componentResults?.[component.id] === true;
                record.correct = record.correct || componentCorrect;
                if (componentCorrect && state.attempts === 1) record.firstAttemptCorrect = true;
                record.hintsUsed += Number(state.hintsUsed) || 0;
                if (Array.isArray(state.errorHistory)) {
                    state.errorHistory.forEach(error => {
                        const type = error?.type || `case:${caseItem.id}`;
                        if (!record.errorTypes.includes(type)) record.errorTypes.push(type);
                        record.errorTypeCounts[type] = (record.errorTypeCounts[type] || 0) + 1;
                    });
                }
                record.reviewCount += Number(state.reviewCount) || 0;
                if (state.lastReviewAt) record.lastActivityAt = state.lastReviewAt;
                record.analyticalStagesPracticed = [...new Set([...record.analyticalStagesPracticed, component.stage])];
                if (state.completed) record.state = EVIDENCE_STATES.DEMONSTRATED;
                else if (record.state !== EVIDENCE_STATES.DEMONSTRATED) record.state = EVIDENCE_STATES.PRACTICED;
                record.lastActivityAt = state.lastActivityAt || record.lastActivityAt;
                void key;
            });
        });
    });

    // Los conceptos definidos por el catálogo quedan disponibles con estado explícito solo al ser usados.
    Object.values(aggregate).forEach(record => {
        record.errorTypes.sort();
        record.exerciseIds.sort();
        record.caseIds.sort();
        record.analyticalStagesPracticed.sort((a, b) => ANALYTICAL_CHAIN.indexOf(a) - ANALYTICAL_CHAIN.indexOf(b));
        record.criteriaMet.sort();
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

// ================================================================
// FASE 8 — REPASO INTELIGENTE Y REFUERZO
// Prioridad determinística basada únicamente en evidencia observable.
// ================================================================
const REVIEW_RULES = Object.freeze({ RECENT_DAYS: 7, STALE_DAYS: 14, COOLDOWN_DAYS: 3, HIGH_ERROR_COUNT: 2, MEDIUM_HINTS: 1 });
const REVIEW_PRIORITIES = Object.freeze({ HIGH: 'alta', MEDIUM: 'media', LOW: 'baja' });
const REVIEW_PRIORITY_ORDER = Object.freeze({ alta: 3, media: 2, baja: 1 });
let reviewLearningState = { history: [], deferredUntil: {}, activeItemId: null };
function createReviewState() { return { history: [], deferredUntil: {}, activeItemId: null }; }
function sanitizeReviewState(raw) {
    const base = createReviewState();
    if (!raw || typeof raw !== 'object') return base;
    return { history: Array.isArray(raw.history) ? raw.history.slice(-100) : [], deferredUntil: raw.deferredUntil && typeof raw.deferredUntil === 'object' ? { ...raw.deferredUntil } : {}, activeItemId: typeof raw.activeItemId === 'string' ? raw.activeItemId : null };
}
function daysSince(iso) { const t=Date.parse(iso||''); return Number.isFinite(t) ? Math.max(0,(Date.now()-t)/86400000) : Infinity; }
function countReviewErrors(state) { return Array.isArray(state?.errorHistory) ? state.errorHistory.length : 0; }
function hasRepeatedErrorType(state) {
    // Repetido = el mismo tipo de error (ejercicios) o el mismo componente (casos) fallando 2+ veces.
    // Los errores sin tipo conocido no se agrupan: dos fallos cualesquiera no son "el mismo error".
    const counts = {};
    const bump = key => { counts[key] = (counts[key] || 0) + 1; };
    (state?.errorHistory || []).forEach(error => {
        if (Array.isArray(error?.components)) error.components.forEach(id => bump(`component:${id}`));
        else if (error?.component) bump(`component:${error.component}`);
        else if (error?.type && error.type !== 'unknown') bump(`type:${error.type}`);
    });
    return Object.values(counts).some(n => n >= 2);
}
function lastActivityOf(state) {
    const results = Array.isArray(state?.attemptResults) ? state.attemptResults : [];
    return state?.lastActivityAt || (results.length ? results[results.length - 1]?.timestamp : null) || null;
}
function reviewCooldownActive(itemId) { const until=reviewLearningState.deferredUntil?.[itemId]; return Boolean(until && Date.parse(until)>Date.now()); }
function classifyReviewPriority({errors=0,repeatedError=false,recent=false,incomplete=false,hints=0,solutionViewed=false,stale=false}) {
    if ((errors>=REVIEW_RULES.HIGH_ERROR_COUNT && recent) || repeatedError || errors>=REVIEW_RULES.HIGH_ERROR_COUNT) return REVIEW_PRIORITIES.HIGH;
    if (incomplete && (hints>=REVIEW_RULES.MEDIUM_HINTS || solutionViewed)) return REVIEW_PRIORITIES.MEDIUM;
    if (hints>=REVIEW_RULES.MEDIUM_HINTS || solutionViewed || incomplete) return REVIEW_PRIORITIES.MEDIUM;
    if (stale) return REVIEW_PRIORITIES.LOW;
    return null;
}
function buildReviewCandidate(id,kind,title,concepts,cognitiveLevel,state,extra={}) {
    // Sin actividad real no hay nada que repasar: antes daysSince(null) = Infinity marcaba todo como "refuerzo preventivo".
    if (!((state.attempts||0)>0 || (state.hintsUsed||0)>0 || state.solutionViewed===true)) return null;
    const lastActivity=lastActivityOf(state);
    const errors=countReviewErrors(state), recent=lastActivity?daysSince(lastActivity)<=REVIEW_RULES.RECENT_DAYS:false, stale=lastActivity?daysSince(lastActivity)>=REVIEW_RULES.STALE_DAYS:false;
    const priority=classifyReviewPriority({errors,repeatedError:hasRepeatedErrorType(state),recent,incomplete:!state.completed&&(state.attempts||0)>0,hints:state.hintsUsed||0,solutionViewed:state.solutionViewed===true,stale});
    if (!priority || reviewCooldownActive(id)) return null;
    const lastReview=[...reviewLearningState.history].reverse().find(item=>item.itemId===id&&item.action==='completed');
    if (lastReview && daysSince(lastReview.timestamp)<REVIEW_RULES.COOLDOWN_DAYS) return null;
    return { itemId:id,kind,title,concepts:[...new Set(concepts||[])],cognitiveLevel:cognitiveLevel||null,priority,reason:hasRepeatedErrorType(state)?'error repetido':errors?'errores registrados':state.hintsUsed?'uso de pistas':state.solutionViewed?'solución revisada':stale?'refuerzo preventivo':'práctica incompleta',attempts:state.attempts||0,hintsUsed:state.hintsUsed||0,errors,solutionViewed:state.solutionViewed===true,lastActivityAt:lastActivity,reviewCount:state.reviewCount||0,...extra };
}
function generateReviewPlan() {
    const candidates=[];
    lessons.forEach(lesson=>lesson.exercises.forEach(exerciseId=>{ const state=getLearningState(exerciseId), ex=getExercise(exerciseId); const c=buildReviewCandidate(`exercise:${exerciseId}`,'exercise',`Repaso: ${ex?.title||exerciseId}`,getExerciseConcepts(exerciseId),ex?.cognitiveLevel,state,{sourceId:exerciseId,sourceLabel:'Ejercicio del curso'}); if(c)candidates.push(c); }));
    ANALYTICAL_CASES.forEach(c=>{ const state=getCaseState(c.id), item=buildReviewCandidate(`case:${c.id}`,'case',`Repaso: ${c.title}`,c.concepts,`caso-nivel-${c.level}`,state,{sourceId:c.id,sourceLabel:'Caso del laboratorio'}); if(item)candidates.push(item); });
    return candidates.sort((a,b)=>REVIEW_PRIORITY_ORDER[b.priority]-REVIEW_PRIORITY_ORDER[a.priority]||b.errors-a.errors||b.hintsUsed-a.hintsUsed||a.itemId.localeCompare(b.itemId));
}
function deferReview(itemId) { const until=new Date(Date.now()+REVIEW_RULES.COOLDOWN_DAYS*86400000).toISOString(); reviewLearningState.deferredUntil[itemId]=until; reviewLearningState.activeItemId=null; reviewLearningState.history.push({itemId,action:'deferred',timestamp:new Date().toISOString(),until}); reviewLearningState.history=reviewLearningState.history.slice(-100); saveLearningState(); renderReviewPanel(); }
function completeReview(itemId) {
    const sep=itemId.indexOf(':'), kind=itemId.slice(0,sep), sourceId=itemId.slice(sep+1), now=new Date().toISOString();
    if(kind==='exercise'){ const state=getLearningState(sourceId); state.reviewCount=(state.reviewCount||0)+1; state.lastReviewAt=now; }
    else if(kind==='case'){ const state=getCaseState(sourceId); state.reviewCount=(state.reviewCount||0)+1; state.lastReviewAt=now; }
    reviewLearningState.history.push({itemId,action:'completed',timestamp:now}); reviewLearningState.history=reviewLearningState.history.slice(-100); reviewLearningState.activeItemId=null; syncConceptEvidence(); saveLearningState(); renderReviewPanel();
}
function startReview(itemId){ if(generateReviewPlan().some(item=>item.itemId===itemId)){reviewLearningState.activeItemId=itemId;saveLearningState();renderReviewPanel();} }
function openReviewSource(candidate){
    if(candidate.kind==='exercise'){ const ex=candidate.sourceId; navigationState.activeActivityId=ex; navigationState.activeView='course'; const lessonIndex=lessons.findIndex(l=>l.exercises.includes(ex)); if(lessonIndex>=0){ currentIndex=lessonIndex; saveLearningState(); updateUI(); setTimeout(()=>{const el=document.getElementById(ex); if(el&&typeof el.scrollIntoView==='function')el.scrollIntoView({behavior:'smooth',block:'center'});},0); } }
    else { navigationState.activeActivityId=candidate.sourceId; showView('cases'); setTimeout(()=>{const el=document.querySelector(`[data-case-id="${candidate.sourceId}"]`); if(el&&typeof el.scrollIntoView==='function')el.scrollIntoView({behavior:'smooth',block:'center'});},0); }
}
function renderReviewPanel(){
    const root=document.getElementById('review-panel'); if(!root)return; const plan=generateReviewPlan(), active=plan.find(x=>x.itemId===reviewLearningState.activeItemId)||null;
    if(active){ root.innerHTML=`<div class="review-head"><div><h2>REPASO INTELIGENTE</h2><p>Refuerzo basado en evidencia: ${ct(active.reason)}. No es una calificación global.</p></div><span class="review-priority review-${active.priority}">Necesidad ${active.priority}</span></div>${panelGuideHtml('review')}<div class="review-card"><p><strong>${ct(active.title)}</strong></p><p>${active.sourceLabel} · conceptos: ${ct(active.concepts.join(', ')||'no definidos')} · nivel: ${active.cognitiveLevel||'no definido'}</p><p>Historial: ${active.attempts} intento(s), ${active.hintsUsed} pista(s), ${active.errors} error(es).</p><div class="review-actions"><button class="action-btn" type="button" data-review-open="${active.itemId}">Ir al contenido</button><button class="action-btn" type="button" data-review-complete="${active.itemId}">Completar repaso</button><button class="action-btn outline" type="button" data-review-defer="${active.itemId}">Posponer</button></div></div>`; }
    else if(plan.length){ root.innerHTML=`<div class="review-head"><div><h2>REPASO INTELIGENTE</h2><p>Hay oportunidades de refuerzo detectadas a partir de errores, pistas, soluciones, práctica incompleta o antigüedad.</p></div><span class="review-count">${plan.length} oportunidad(es)</span></div>${panelGuideHtml('review')}<div class="review-list">${plan.map(item=>`<article class="review-item"><div><strong>${ct(item.title)}</strong><small>${item.sourceLabel} · ${item.reason} · ${item.concepts.slice(0,4).join(', ')}</small></div><span class="review-priority review-${item.priority}">${item.priority}</span><button class="action-btn outline" type="button" data-review-start="${item.itemId}">Iniciar</button></article>`).join('')}</div>`; }
    else { root.innerHTML=`<div class="review-empty"><h2>REPASO INTELIGENTE</h2><p>No hay una necesidad de repaso activa según las reglas actuales. Puedes continuar el curso y volver posteriormente.</p></div>${panelGuideHtml('review')}`; }
    if (typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('[data-review-start]').forEach(btn=>btn.addEventListener('click',()=>startReview(btn.dataset.reviewStart)));
    root.querySelectorAll('[data-review-open]').forEach(btn=>btn.addEventListener('click',()=>openReviewSource(plan.find(x=>x.itemId===btn.dataset.reviewOpen))));
    root.querySelectorAll('[data-review-complete]').forEach(btn=>btn.addEventListener('click',()=>completeReview(btn.dataset.reviewComplete)));
    root.querySelectorAll('[data-review-defer]').forEach(btn=>btn.addEventListener('click',()=>deferReview(btn.dataset.reviewDefer)));
}


// ================================================================
// FASE 9 — DASHBOARD DE APRENDIZAJE DEL ALUMNO
// Vista descriptiva construida únicamente a partir de evidencia existente.
// No calcula mastery, ranking, predicciones ni score global.
// ================================================================
const DASHBOARD_STAGE_ORDER = Object.freeze(['understand','calculate','interpret','diagnose','hypothesize','recommend']);
const DASHBOARD_STAGE_LABELS = Object.freeze({
    understand:'Comprender', calculate:'Calcular', interpret:'Interpretar', diagnose:'Diagnosticar',
    hypothesize:'Hipótesis', recommend:'Recomendación'
});
const ERROR_TYPE_LABELS = Object.freeze({
    percentage_scale:'escala porcentual', formula:'fórmula', substitution:'sustitución',
    arithmetic:'aritmética', unit:'unidades', sign:'signo', range:'rango', conceptual:'concepto',
    invalid:'entrada inválida', unknown:'respuesta abierta'
});
function dashboardEvidenceRecords(){
    syncConceptEvidence();
    return Object.values(exerciseLearningState.__conceptEvidenceRebuilt || window.__conceptEvidenceCache || {});
}
function getDashboardData(){
    const records=dashboardEvidenceRecords();
    const uniqueConcepts=[...new Set(records.map(r=>r.conceptId).filter(Boolean))];
    const practicedConcepts=uniqueConcepts.filter(id=>records.some(r=>r.conceptId===id && ['practiced','demonstrated','needs_review'].includes(r.state)));
    const difficultConcepts=uniqueConcepts.filter(id=>records.some(r=>r.conceptId===id && (r.difficultEvidence || r.state==='needs_review')));
    const levels={};
    records.forEach(r=>{if(r.cognitiveLevel && r.attempts>0) levels[r.cognitiveLevel]=true;});
    const completedLessons=lessons.filter(l=>l.id!=='cierre' && !l.intro && lessonStatus[l.id]?.completed).length;
    const totalLessons=lessons.filter(l=>l.id!=='cierre' && !l.intro).length;
    const exerciseIds=lessons.flatMap(l=>l.exercises);
    const completedExercises=exerciseIds.filter(id=>getLearningState(id).solvedCorrectly).length;
    const pendingActivities=exerciseIds.filter(id=>!getLearningState(id).solvedCorrectly).length;
    const casesAvailable=ANALYTICAL_CASES.length;
    const casesCompleted=ANALYTICAL_CASES.filter(c=>getCaseState(c.id).completed).length;
    const casesPending=casesAvailable-casesCompleted;
    const reviewPlan=generateReviewPlan();
    const stages={};
    DASHBOARD_STAGE_ORDER.forEach(stage=>stages[stage]=records.some(r=>r.attempts>0 && (r.analyticalStagesPracticed?.includes(stage)||r.cognitiveLevel===stage)));
    const errorCounts={};
    records.forEach(r=>Object.entries(r.errorTypeCounts||{}).forEach(([type,n])=>errorCounts[type]=(errorCounts[type]||0)+n));
    const strengths=[];
    exerciseIds.forEach(id=>{const st=getLearningState(id);if(st.firstAttemptCorrect) strengths.push({id,title:getExercise(id)?.title||id});});
    return {records,uniqueConcepts,practicedConcepts,difficultConcepts,levels,completedLessons,totalLessons,completedExercises,totalExercises:exerciseIds.length,pendingActivities,casesAvailable,casesCompleted,casesPending,reviewPlan,stages,errorCounts,strengths};
}
function dashboardNextStep(data){
    const fa=evaluateFinalAssessment();
    if(fa.passed || finalAssessmentState.lastResult?.passed) return {text:'La evaluación final ya tiene evidencia completa. Puedes revisar tu resultado o continuar practicando.',action:'assessment'};
    if(data.reviewPlan.length) return {text:`Tienes ${data.reviewPlan.length} actividad(es) de repaso disponible(s).`,action:'review'};
    if(fa.metCount >= 5) return {text:'Ya tienes evidencia suficiente para intentar la evaluación final integral.',action:'assessment'};
    const pendingExercise=lessons.flatMap(l=>l.exercises).find(id=>!getLearningState(id).solvedCorrectly);
    if(pendingExercise){const lessonIndex=lessons.findIndex(l=>l.exercises.includes(pendingExercise));return {text:`Continúa con ${ct(getExercise(pendingExercise)?.title||'la siguiente actividad')}.`,action:'exercise',exerciseId:pendingExercise,lessonIndex};}
    const pendingCase=ANALYTICAL_CASES.find(c=>!getCaseState(c.id).completed);
    if(pendingCase) return {text:`Tu siguiente actividad es ${ct(pendingCase.title)}.`,action:'case'};
    return {text:'Has recorrido todas las actividades disponibles. Puedes volver a practicar o revisar tus casos.',action:'course'};
}
function dashboardConceptName(id){return ct(getConceptDefinition(id)?.name || id);}
function renderDashboard(){
    const root=document.getElementById('dashboard-panel');if(!root)return;
    const d=getDashboardData(), next=dashboardNextStep(d);
    const lessonPct=d.totalLessons?Math.round(d.completedLessons/d.totalLessons*100):0;
    const exercisePct=d.totalExercises?Math.round(d.completedExercises/d.totalExercises*100):0;
    const levelLabels=['understand','calculate','interpret','diagnose','hypothesize','recommend'];
    const levelsHtml=levelLabels.map(level=>`<span class="dashboard-stage ${d.stages[level]?'done':''}">${d.stages[level]?'✓ ':''}${DASHBOARD_STAGE_LABELS[level]}</span>`).join('');
    const strengthsHtml=d.strengths.length?d.strengths.slice(0,4).map(x=>`<li>Resolviste correctamente al primer intento: <strong>${ct(x.title)}</strong>.</li>`).join(''):'<li>Aún no hay evidencia suficiente de fortalezas al primer intento.</li>';
    const practiceHtml=d.difficultConcepts.length?d.difficultConcepts.slice(0,6).map(id=>`<li>El concepto <strong>${dashboardConceptName(id)}</strong> tiene evidencia de dificultad.</li>`).join(''):'<li>No hay conceptos con evidencia de dificultad acumulada.</li>';
    const errors=Object.entries(d.errorCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const errorHtml=errors.length?errors.map(([type,n])=>`<li>Has registrado ${n} señal(es) relacionadas con <strong>${ERROR_TYPE_LABELS[type]||type}</strong>.</li>`).join(''):'';
    root.innerHTML=`<div class="dashboard-head"><div><h2>DASHBOARD DE APRENDIZAJE</h2><p class="dashboard-course"><strong>${ct((COURSE_REGISTRY.get(activeCourseId)||{}).title||'')}</strong></p><p>Una lectura de tu progreso basada en evidencia real del curso. No es una calificación global.</p></div><button class="action-btn outline" type="button" id="dashboard-close">Cerrar</button></div>
      ${panelGuideHtml('dashboard')}
      <section class="dashboard-section dashboard-next"><h3>Siguiente paso</h3><p>${next.text}</p><div class="dashboard-actions">${next.action==='review'?'<button class="action-btn" type="button" data-dashboard-review="1">Abrir repaso</button>':next.action==='assessment'?'<button class="action-btn" type="button" data-dashboard-assessment="1">Abrir evaluación final</button>':next.action==='exercise'?'<button class="action-btn" type="button" data-dashboard-exercise="'+next.exerciseId+'">Ir a la actividad</button>':next.action==='case'?'<button class="action-btn" type="button" data-dashboard-case="1">Abrir laboratorio</button>':''}</div></section>
      <div class="dashboard-grid">
        <section class="dashboard-section"><h3>¿Dónde estoy?</h3><div class="dashboard-metrics"><div><strong>${lessonPct}%</strong><span>lecciones completadas (${d.completedLessons}/${d.totalLessons})</span></div><div><strong>${exercisePct}%</strong><span>ejercicios resueltos (${d.completedExercises}/${d.totalExercises})</span></div><div><strong>${d.pendingActivities}</strong><span>actividades pendientes</span></div></div></section>
        <section class="dashboard-section"><h3>Conceptos</h3><ul class="dashboard-list"><li>${d.uniqueConcepts.length} conceptos con evidencia o exposición.</li><li>${d.practicedConcepts.length} conceptos practicados.</li><li>${d.difficultConcepts.length} conceptos con evidencia de dificultad.</li></ul></section>
      </div>
      <section class="dashboard-section"><h3>Pensamiento analítico</h3><div class="dashboard-stages">${levelsHtml}</div><p class="dashboard-note">Las etapas muestran evidencia de práctica; no representan una nota.</p></section>
      <div class="dashboard-grid">
        <section class="dashboard-section"><h3>Fortalezas observables</h3><ul class="dashboard-list">${strengthsHtml}</ul></section>
        <section class="dashboard-section"><h3>Áreas de práctica</h3><ul class="dashboard-list">${practiceHtml}${errorHtml}</ul></section>
      </div>
      <div class="dashboard-grid">
        <section class="dashboard-section"><h3>Casos</h3><ul class="dashboard-list"><li>${d.casesCompleted} casos completados.</li><li>${d.casesAvailable} casos disponibles.</li><li>${d.casesPending} casos pendientes.</li></ul></section>
        <section class="dashboard-section"><h3>Repaso</h3><p>${d.reviewPlan.length?`${d.reviewPlan.length} actividad(es) de repaso disponibles.`:'No hay actividades de repaso disponibles según las reglas actuales.'}</p></section>
      </div>
      <section class="dashboard-section"><h3>Evaluación final</h3><p>${finalAssessmentState.lastResult ? (finalAssessmentState.lastResult.passed ? 'Completada y superada según los criterios definidos.' : 'Completada y requiere refuerzo antes de reintentar.') : (evaluateFinalAssessment().metCount ? 'Disponible: ya existe evidencia parcial.' : 'Pendiente: primero desarrolla la evidencia de las competencias del curso.')}</p><div class="dashboard-actions"><button class="action-btn outline" type="button" data-dashboard-assessment="1">Abrir evaluación final</button></div></section>
      <section class="dashboard-section dashboard-tools"><h3>Continuidad del aprendizaje</h3><p>Puedes guardar una copia de tu progreso para retomarlo más adelante o trasladarlo a otra sesión. El respaldo contiene solo datos necesarios para reconstruir tu aprendizaje.</p><div class="dashboard-actions dashboard-tool-actions"><button class="action-btn outline" type="button" id="export-progress">Exportar progreso</button><button class="action-btn outline" type="button" id="import-progress">Importar progreso</button><button class="action-btn danger" type="button" id="reset-progress">Reiniciar progreso</button><input id="import-progress-file" type="file" accept="application/json,.json" hidden></div></section>`;
    if (typeof root.querySelector !== 'function') return;
    const close=root.querySelector('#dashboard-close'); if(close)close.addEventListener('click',closeDashboard);
    const rb=root.querySelector('[data-dashboard-review]'); if(rb)rb.addEventListener('click',()=>showView('review'));
    const cb=root.querySelector('[data-dashboard-case]'); if(cb)cb.addEventListener('click',()=>showView('cases'));
    const ab=root.querySelector('[data-dashboard-assessment]'); if(ab)ab.addEventListener('click',()=>showView('assessment'));
    const eb=root.querySelector('[data-dashboard-exercise]'); if(eb)eb.addEventListener('click',()=>{const id=eb.dataset.dashboardExercise;const idx=lessons.findIndex(l=>l.exercises.includes(id));if(idx>=0){currentIndex=idx;closeDashboard();updateUI();setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'}),0);}});
    const exportBtn=root.querySelector('#export-progress'); if(exportBtn)exportBtn.addEventListener('click',exportLearningProgress);
    const importBtn=root.querySelector('#import-progress'), fileInput=root.querySelector('#import-progress-file'); if(importBtn&&fileInput)importBtn.addEventListener('click',()=>fileInput.click()); if(fileInput)fileInput.addEventListener('change',()=>handleImportFile(fileInput.files?.[0]));
    const resetBtn=root.querySelector('#reset-progress'); if(resetBtn)resetBtn.addEventListener('click',()=>{ pendingNavigationDirection=null; openPersistenceResetModal(); });
}

function sanitizeNavigationState(raw) {
    const validActivityIds = new Set(lessons.flatMap(lesson => lesson.exercises || []));
    ANALYTICAL_CASES.forEach(item => validActivityIds.add(item.id));
    const candidateActivityId = typeof raw?.activeActivityId === 'string' ? raw.activeActivityId.trim() : '';
    return {
        activeView: ['course','dashboard','review','cases','assessment'].includes(raw?.activeView) ? raw.activeView : 'course',
        activeActivityId: validActivityIds.has(candidateActivityId) ? candidateActivityId : null
    };
}

function buildPersistableState() {
    syncConceptEvidence();
    return {
        schemaVersion: PERSISTENCE_SCHEMA_VERSION,
        currentIndex,
        currentLessonId: lessons[currentIndex] ? lessons[currentIndex].id : null,
        learnerProfile: sanitizeLearnerProfile(learnerProfile),
        lessonStatus,
        exercises: exerciseLearningState,
        caseLearningState,
        reviewLearningState,
        finalAssessmentState,
        navigation: sanitizeNavigationState(navigationState)
    };
}

function migratePersistedState(raw) {
    if (!raw || typeof raw !== 'object') return { state: null, migratedFrom: null };
    const version = Number.isInteger(raw.schemaVersion) ? raw.schemaVersion : (Number.isInteger(raw.version) ? raw.version : 1);
    if (version > PERSISTENCE_SCHEMA_VERSION) return { state: null, migratedFrom: null, unsupportedVersion: version };
    if (version === PERSISTENCE_SCHEMA_VERSION) return { state: raw, migratedFrom: null };
    return {
        state: {
            schemaVersion: PERSISTENCE_SCHEMA_VERSION,
            currentIndex: raw.currentIndex,
            currentLessonId: raw.currentLessonId,
            learnerProfile: raw.learnerProfile,
            lessonStatus: raw.lessonStatus,
            exercises: raw.exercises,
            caseLearningState: raw.caseLearningState,
            reviewLearningState: raw.reviewLearningState,
            finalAssessmentState: raw.finalAssessmentState,
            navigation: sanitizeNavigationState(raw.navigation)
        },
        migratedFrom: version
    };
}

function validatePersistedState(raw) {
    if (!raw || typeof raw !== 'object') return { ok: true, reasons: [] };
    const reasons = [];
    if (!Number.isInteger(raw.currentIndex) || raw.currentIndex < 0 || raw.currentIndex >= lessons.length) reasons.push('lección actual inválida');
    if (raw.lessonStatus !== undefined && (typeof raw.lessonStatus !== 'object' || Array.isArray(raw.lessonStatus))) reasons.push('estado de lecciones inválido');
    if (raw.exercises !== undefined && (typeof raw.exercises !== 'object' || Array.isArray(raw.exercises))) reasons.push('estado de ejercicios inválido');
    if (raw.caseLearningState !== undefined && (typeof raw.caseLearningState !== 'object' || Array.isArray(raw.caseLearningState))) reasons.push('estado de casos inválido');
    if (raw.reviewLearningState !== undefined && (typeof raw.reviewLearningState !== 'object' || Array.isArray(raw.reviewLearningState))) reasons.push('estado de repaso inválido');
    if (raw.finalAssessmentState !== undefined && (typeof raw.finalAssessmentState !== 'object' || Array.isArray(raw.finalAssessmentState))) reasons.push('estado de evaluación final inválido');
    return { ok: reasons.length === 0, reasons };
}

function showPersistenceNotice(message, severity='warning') {
    const el = document.getElementById('persistence-notice');
    if (!el) return;
    el.textContent = message;
    el.dataset.severity = severity;
    el.hidden = false;
}

function clearPersistenceNotice() {
    const el = document.getElementById('persistence-notice');
    if (el) el.hidden = true;
}

function serializePersistableState() {
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const payload = JSON.stringify(buildPersistableState());
    const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    persistenceMetrics.lastWriteMs = Math.max(0, ended-started);
    persistenceMetrics.lastPayloadBytes = payload.length;
    return payload;
}

function saveLearningState(options={}) {
    if (persistenceState.status === 'corrupt' || persistenceState.status === 'unsupported') return false;
    try {
        const payload = serializePersistableState();
        if (!options.force && payload === lastPersistedSignature) {
            persistenceMetrics.skippedWrites += 1;
            return true;
        }
        writeCourseStateText(activeCourseId, payload);
        lastPersistedSignature = payload;
        persistenceMetrics.writes += 1;
        persistenceState.status = 'healthy';
        persistenceState.error = null;
        if (typeof renderDashboard === 'function' && document.getElementById('dashboard-panel')) renderDashboard();
        return true;
    } catch (error) {
        persistenceState.status = 'write_error';
        persistenceState.error = error?.message || 'No se pudo guardar el progreso.';
        showPersistenceNotice('No pudimos guardar tu progreso en este momento. Evita cerrar la aplicación hasta reintentarlo.', 'error');
        console.warn('No se pudo guardar el progreso:', error);
        return false;
    }
}

function loadLearningState(forCourseId) {
    let store;
    try { store = readPlatformStore(); } catch (error) { store = { status: 'corrupt', root: null, rawText: '{' }; }
    const wanted = forCourseId || (store.status === 'ok' ? store.root.activeCourseId : activeCourseId);
    activeCourseId = resolveActiveCourseId(wanted);
    applyCourseContext(COURSE_REGISTRY.get(activeCourseId));
    Object.keys(exerciseStatus).forEach(k => delete exerciseStatus[k]); // en sitio: otros módulos conservan la referencia
    const initial = createInitialState();
    try {
        let rawText = null;
        if (store.status === 'ok') {
            const entry = store.root.courses[activeCourseId];
            rawText = entry && entry.state && typeof entry.state === 'object' ? JSON.stringify(entry.state) : null;
        } else if (store.status === 'corrupt') rawText = store.rawText || '{';
        else if (store.status === 'unsupported') rawText = JSON.stringify({ schemaVersion: store.unsupportedVersion });
        if (!rawText) {
            currentIndex = 0;
            lessonStatus = initial.lessonStatus;
            exerciseLearningState = initial.exercises;
            learnerProfile = { name: '' };
            loadCaseState(null);
            reviewLearningState = createReviewState();
            finalAssessmentState = createFinalAssessmentState();
            navigationState = { activeView:'course', activeActivityId:null };
            persistenceState = { status:'healthy', schemaVersion:PERSISTENCE_SCHEMA_VERSION, migratedFrom:null, error:null };
            lastPersistedSignature = null;
            return;
        }
        let raw;
        try { if (store.status === 'corrupt') throw new Error('almacén inválido'); raw = JSON.parse(rawText); }
        catch (error) {
            lessonStatus = initial.lessonStatus; exerciseLearningState = initial.exercises; loadCaseState(null); reviewLearningState=createReviewState(); finalAssessmentState=createFinalAssessmentState();
            navigationState={activeView:'course',activeActivityId:null};
            persistenceState={status:'corrupt',schemaVersion:PERSISTENCE_SCHEMA_VERSION,migratedFrom:null,error:'JSON inválido'};
            showPersistenceNotice('No pudimos leer tu progreso guardado. No lo sobrescribiremos automáticamente; puedes importar un respaldo válido o reiniciar de forma explícita.', 'error');
            return;
        }
        const migrated = migratePersistedState(raw);
        if (migrated.unsupportedVersion) {
            lessonStatus = initial.lessonStatus; exerciseLearningState = initial.exercises; loadCaseState(null); reviewLearningState=createReviewState(); finalAssessmentState=createFinalAssessmentState();
            navigationState={activeView:'course',activeActivityId:null};
            persistenceState={status:'unsupported',schemaVersion:PERSISTENCE_SCHEMA_VERSION,migratedFrom:null,error:`Versión ${migrated.unsupportedVersion} no compatible`};
            showPersistenceNotice('Este progreso pertenece a una versión más reciente del curso. No lo sobrescribiremos.', 'error');
            return;
        }
        const saved=migrated.state;
        const validation=validatePersistedState(saved);
        if (!validation.ok) {
            lessonStatus=initial.lessonStatus; exerciseLearningState=initial.exercises; loadCaseState(null); reviewLearningState=createReviewState(); finalAssessmentState=createFinalAssessmentState(); navigationState={activeView:'course',activeActivityId:null};
            persistenceState={status:'corrupt',schemaVersion:PERSISTENCE_SCHEMA_VERSION,migratedFrom:migrated.migratedFrom,error:validation.reasons.join(', ')};
            showPersistenceNotice('Encontramos datos de progreso incompletos o inválidos. Conservamos el archivo guardado y evitaremos sobrescribirlo automáticamente.', 'error');
            return;
        }
        if (typeof saved.currentLessonId === 'string') {
            const byId = lessons.findIndex(l => l.id === saved.currentLessonId);
            currentIndex = byId >= 0 ? byId : 0;
        } else if (Number.isInteger(saved.currentIndex) && saved.currentIndex >= 0) {
            // Progreso guardado antes del Módulo 0: su índice no contaba la introducción.
            const legacy = saved.currentIndex + 1;
            currentIndex = legacy < lessons.length ? legacy : 0;
        } else currentIndex = 0;
        learnerProfile = sanitizeLearnerProfile(saved.learnerProfile);
        for (const lesson of lessons) {
            const rawLesson=saved.lessonStatus?.[lesson.id];
            if (rawLesson) { initial.lessonStatus[lesson.id].read=rawLesson.read===true; initial.lessonStatus[lesson.id].completed=rawLesson.completed===true; }
            for (const ex of lesson.exercises) initial.exercises[ex]=sanitizeExerciseState(saved.exercises?.[ex]);
        }
        loadCaseState(saved.caseLearningState);
        reviewLearningState=sanitizeReviewState(saved.reviewLearningState);
        finalAssessmentState=sanitizeFinalAssessmentState(saved.finalAssessmentState);
        navigationState=sanitizeNavigationState(saved.navigation);
        lessonStatus=initial.lessonStatus; exerciseLearningState=initial.exercises;
        syncConceptEvidence();
        lessons.forEach(l=>l.exercises.forEach(ex=>{exerciseStatus[ex]=exerciseLearningState[ex].solvedCorrectly;}));
        persistenceState={status:'healthy',schemaVersion:PERSISTENCE_SCHEMA_VERSION,migratedFrom:migrated.migratedFrom,error:null};
        lastPersistedSignature=rawText;
        if (migrated.migratedFrom) {
            saveLearningState({force:true});
            persistenceState.migratedFrom=migrated.migratedFrom;
        }
    } catch (error) {
        console.warn('No se pudo recuperar el progreso:', error);
        persistenceState={status:'corrupt',schemaVersion:PERSISTENCE_SCHEMA_VERSION,migratedFrom:null,error:error?.message||'recuperación fallida'};
        showPersistenceNotice('No pudimos recuperar el progreso guardado. No se sobrescribirá automáticamente.', 'error');
    }
}


function setActiveView(view, activeActivityId=navigationState.activeActivityId) {
    navigationState={activeView:['course','dashboard','review','cases','assessment'].includes(view)?view:'course',activeActivityId:activeActivityId||null};
    saveLearningState();
}

function exportLearningProgress() {
    const payload=serializePersistableState();
    const blob=new Blob([payload],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='curso-analista-progreso.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
    return payload;
}

function importLearningProgressFromText(text) {
    let parsed;
    try { parsed=JSON.parse(text); } catch(error) { throw new Error('El archivo no contiene JSON válido.'); }
    const migrated=migratePersistedState(parsed);
    if (migrated.unsupportedVersion) throw new Error(`La versión ${migrated.unsupportedVersion} no es compatible con esta aplicación.`);
    const validation=validatePersistedState(migrated.state);
    if (!validation.ok) throw new Error(`El respaldo no es válido: ${validation.reasons.join(', ')}.`);
    writeCourseStateText(activeCourseId, JSON.stringify(migrated.state));
    lastPersistedSignature=null;
    loadLearningState();
    updateUI();
    renderCaseLab(); renderReviewPanel(); renderDashboard();
    restoreLastView();
    clearPersistenceNotice();
    return true;
}

function resetLearningProgress() {
    clearCourseState(activeCourseId);
    currentIndex=0; lessonStatus=createInitialState().lessonStatus; exerciseLearningState=createInitialState().exercises;
    exerciseStatus={}; lessons.forEach(l=>l.exercises.forEach(ex=>exerciseStatus[ex]=false));
    loadCaseState(null); reviewLearningState=createReviewState(); finalAssessmentState=createFinalAssessmentState(); navigationState={activeView:'course',activeActivityId:null};
    persistenceState={status:'healthy',schemaVersion:PERSISTENCE_SCHEMA_VERSION,migratedFrom:null,error:null}; lastPersistedSignature=null;
    saveLearningState({force:true}); updateUI(); renderCaseLab(); renderReviewPanel(); renderDashboard(); clearPersistenceNotice();
    return true;
}

function requestImportProgress(text) { pendingImportText=String(text||''); pendingNavigationDirection='__import__'; openPersistenceImportModal(); }

function openPersistenceImportModal() { const modal=document.getElementById('warning-modal'); if(!modal)return false; const title=document.getElementById('warning-title'), message=document.getElementById('warning-message'), confirmBtn=document.getElementById('warning-confirm'), cancelBtn=document.getElementById('warning-cancel'); warningPreviousFocus=document.activeElement; if(title)title.textContent='Importar progreso'; if(message)message.textContent='Esto reemplazará el progreso actual por el respaldo seleccionado. Primero validaremos su versión y estructura. ¿Quieres continuar?'; if(cancelBtn)cancelBtn.textContent='No, conservar progreso'; if(confirmBtn){confirmBtn.textContent='Sí, importar';confirmBtn.focus();} modal.hidden=false; modal.classList.add('is-open'); return true; }

function handleImportFile(file) {
    if (!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ requestImportProgress(String(reader.result||'')); };
    reader.onerror=()=>showPersistenceNotice('No se pudo leer el archivo de respaldo.','error');
    reader.readAsText(file);
}

function restoreLastView() {
    showView(navigationState.activeView);
}


// Elementos del DOM
const mainContainer = document.getElementById('main-content');
const progressBar = document.getElementById('reading-progress-bar');
const titleEl = document.getElementById('lesson-title');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const orientationLessonEl = document.getElementById('orientation-lesson');
const orientationStepEl = document.getElementById('orientation-step');
let pendingNavigationDirection = null;
let warningPreviousFocus = null;

// --- SISTEMA DE NAVEGACIÓN Y RENDERIZADO ---
function updateUI() {
    pauseLessonVideos();
    // La vista guardada no se toca aquí (restoreLastView la usa al cargar); solo se muestra el curso.
    showView('course', { track:false, save:false, focus:false });
    document.querySelectorAll('.lesson').forEach(el => el.classList.remove('active'));
    const lessonEl = document.getElementById(lessons[currentIndex].id);
    if (lessonEl) lessonEl.classList.add('active');
    renderCourseChrome();
    renderCourseOutline();

    titleEl.innerText = lessons[currentIndex].title;
    if (orientationLessonEl) orientationLessonEl.textContent = lessons[currentIndex].title;
    if (orientationStepEl) {
        const exerciseCount = lessons[currentIndex].exercises.length;
        if (lessons[currentIndex].intro) orientationStepEl.textContent = 'Introducción · sin ejercicios';
        else orientationStepEl.textContent = exerciseCount ? `${exerciseCount} actividad${exerciseCount === 1 ? '' : 'es'} en esta lección` : 'Cierre del curso';
    }

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
    applyLearnerName();
    updateScrollProgress();
    updateStatsPanel();
    renderCognitiveProgression();
}

function openPersistenceResetModal() {
    const modal=document.getElementById('warning-modal'); if(!modal)return false;
    const title=document.getElementById('warning-title'), message=document.getElementById('warning-message'), confirmBtn=document.getElementById('warning-confirm'), cancelBtn=document.getElementById('warning-cancel');
    warningPreviousFocus=document.activeElement; pendingNavigationDirection='__reset__';
    if(title)title.textContent='Reiniciar progreso';
    if(message)message.textContent='Esta acción eliminará tus lecciones, intentos, pistas, errores, evidencia, casos, repasos y ubicación guardada. No se puede deshacer desde la aplicación.';
    if(cancelBtn)cancelBtn.textContent='No, conservar progreso';
    if(confirmBtn){confirmBtn.textContent='Sí, reiniciar';confirmBtn.focus();}
    modal.hidden=false; modal.classList.add('is-open'); return true;
}

function openWarningModal(message) {
    const modal = document.getElementById('warning-modal');
    const messageEl = document.getElementById('warning-message');
    const confirmBtn = document.getElementById('warning-confirm');
    if (!modal) return false;
    if (messageEl) messageEl.textContent = message;
    warningPreviousFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add('is-open');
    if (confirmBtn) confirmBtn.focus();
    return true;
}
function closeModal() {
    const modal = document.getElementById('warning-modal');
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('is-open');
    pendingNavigationDirection = null;
    const title=document.getElementById('warning-title'), cancelBtn=document.getElementById('warning-cancel'), confirmBtn=document.getElementById('warning-confirm');
    if(title)title.textContent='Aún no terminas'; if(cancelBtn)cancelBtn.textContent='No, me quedo'; if(confirmBtn)confirmBtn.textContent='Sí, continuar';
    if (warningPreviousFocus && typeof warningPreviousFocus.focus === 'function') warningPreviousFocus.focus();
    warningPreviousFocus = null;
}
function forceNextLesson() {
    const direction = pendingNavigationDirection;
    if (direction === '__reset__') { closeModal(); resetLearningProgress(); return; }
    if (direction === '__import__') { const text=pendingImportText; pendingImportText=null; closeModal(); try { importLearningProgressFromText(text); showPersistenceNotice('Progreso importado correctamente. Puedes continuar donde lo dejaste.','success'); } catch(error) { showPersistenceNotice(error.message||'No se pudo importar el progreso.','error'); } return; }
    closeModal();
    if (direction !== 1) return;
    const currentL = lessons[currentIndex];
    lessonStatus[currentL.id].completed = false;
    currentIndex += 1;
    saveLearningState();
    updateUI();
}

function navigate(direction) {
    if (direction === -1 && currentIndex === 0) return;
    if (direction === 1 && currentIndex === lessons.length - 1) return;
    // Con un panel abierto, primero se vuelve al curso: el aviso de lección incompleta debe verse sobre la lección, no sobre el panel.
    if (currentPanelView() !== 'course') showView('course');

    if (direction === 1 && lessons[currentIndex].intro) {
        // La introducción no tiene ejercicios ni exige lectura completa.
        lessonStatus[lessons[currentIndex].id].completed = true;
    } else if (direction === 1) {
        const currentL = lessons[currentIndex];
        const isRead = lessonStatus[currentL.id].read;
        const allExercisesDone = currentL.exercises.every(ex => exerciseStatus[ex] === true);
        if (!isRead || !allExercisesDone) {
            const msg = [];
            if (!isRead) msg.push('leer hasta el final');
            if (!allExercisesDone) msg.push('resolver los ejercicios de forma exacta');
            pendingNavigationDirection = direction;
            openWarningModal('Te falta ' + msg.join(' y ') + '. Puedes continuar ahora; la lección quedará como incompleta.');
            return;
        }
        lessonStatus[currentL.id].completed = true;
    }

    currentIndex += direction;
    saveLearningState();
    updateUI();
}


// --- RASTREO DE LECTURA (SCROLL) ---
mainContainer.addEventListener('scroll', updateScrollProgress);

function updateScrollProgress() {
    const container = document.getElementById(lessons[currentIndex].id);
    if (!container) return; // lección sin vista renderizada todavía (p. ej. curso sin HTML propio)
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
    const countable = lessons.filter(l => l.id !== 'cierre' && !l.intro); // Excluimos introducción y cierre
    const totalLessons = countable.length;
    const completedLessons = countable.filter(l => lessonStatus[l.id] && lessonStatus[l.id].completed).length;

    // Total real del curso (no solo los ejercicios que ya tienen estado), igual que el dashboard.
    const exerciseIds = lessons.flatMap(l => l.exercises);
    const totalExercises = exerciseIds.length;
    const completedExercises = exerciseIds.filter(id => exerciseStatus[id] === true).length;

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
let analystThinking = Object.freeze({
    'l1-e1': ['Una meta mensual debe distribuirse respetando la estacionalidad y el mix de canales.'],
    'l1-e2': ['Una meta anual no debería dividirse en partes iguales si existe estacionalidad histórica.'],
    'l2-e1': ['Compara el ritmo actual con el tiempo transcurrido y con el target necesario para interpretar la trayectoria.'],
    'l2-e2': ['Un forecast simple describe el ritmo actual; un analista también incorpora eventos conocidos que pueden alterar ese ritmo.'],
    'l3-e1': ['El cálculo muestra qué cambió; la investigación debe explicar qué driver podría estar detrás de la variación.'],
    'l4-e1': ['Un RPS alto puede ser una señal para investigar, pero por sí solo no demuestra que un canal deba recibir más inversión.']
});

let errorProfiles = Object.freeze({
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
        .map(id => ct(concepts[id]?.name || id))
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

function markAnalyticalStagesPracticed(exerciseId) {
    const state = getLearningState(exerciseId);
    const stages = getExercise(exerciseId).analyticalStages || [];
    state.analyticalStagesPracticed = [...new Set([...(state.analyticalStagesPracticed || []), ...stages])];
    saveLearningState();
}
function renderAnalyticalChain(exerciseId, host) {
    const activity = getAnalyticalActivity(exerciseId);
    if (!activity.stages.length) return;
    const practiced = new Set(getLearningState(exerciseId).analyticalStagesPracticed || []);
    const steps = ANALYTICAL_CHAIN.map(stage => {
        const active = activity.stages.includes(stage), done = practiced.has(stage);
        return `<span class="analytic-step ${active ? (done ? 'done' : 'current') : ''}">${done ? '✓ ' : ''}${ANALYTICAL_STAGE_LABELS[stage]}</span>`;
    }).join('<span class="analytic-arrow" aria-hidden="true">→</span>');
    const box = document.createElement('section');
    box.className = 'analytical-chain'; box.setAttribute('aria-label','Cadena de pensamiento analítico');
    box.innerHTML = `<strong>CADENA DE PENSAMIENTO ANALÍTICO</strong><div class="analytical-chain-list">${steps}</div>${activity.nextQuestion ? `<p><strong>Pregunta siguiente:</strong> ${activity.nextQuestion}</p>` : ''}`;
    host.appendChild(box);
}
function renderQualitativeRubric(exerciseId, host) {
    const rubric = getAnalyticalRubric(exerciseId);
    if (!rubric.length) return;
    const state = getLearningState(exerciseId), values = state.qualitativeCriteria || {};
    const box = document.createElement('section');
    box.className = 'analytical-rubric'; box.setAttribute('aria-label','Criterios de autoevaluación analítica');
    box.innerHTML = `<strong>Autoevaluación con criterios explícitos</strong><span class="rubric-note">Marca solo los criterios que tu respuesta realmente cumple. Esto registra evidencia; no es una calificación automática.</span><div class="rubric-list">${rubric.map(([id,label]) => `<label class="rubric-item"><input type="checkbox" data-rubric="${id}" ${values[id] === true ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div><button type="button" class="action-btn outline learning-btn" data-save-rubric="${exerciseId}">Guardar autoevaluación</button><div class="rubric-feedback" aria-live="polite"></div>`;
    box.querySelector('[data-save-rubric]').addEventListener('click', () => {
        const criteria = {}; box.querySelectorAll('[data-rubric]').forEach(input => { criteria[input.dataset.rubric] = input.checked; });
        state.qualitativeCriteria = criteria; markAnalyticalStagesPracticed(exerciseId); saveLearningState();
        const count = Object.values(criteria).filter(Boolean).length;
        box.querySelector('.rubric-feedback').textContent = `${count} de ${rubric.length} criterios marcados. Revisa especialmente los que dejaste sin marcar.`;
        renderExerciseLearningUI(exerciseId);
    });
    host.appendChild(box);
}

function renderAnalystThinking(exerciseId, host) {
    const thoughts = getAnalystThinking(exerciseId), activity = getAnalyticalActivity(exerciseId);
    if (!thoughts.length && !activity.nextQuestion) return;
    const box = document.createElement('div'); box.className = 'analyst-thinking'; box.setAttribute('aria-live','polite');
    box.innerHTML = `<strong>PIENSA COMO ANALISTA</strong>${thoughts.map(t => `<p>${t}</p>`).join('')}${activity.nextQuestion ? `<p><strong>Qué preguntaría un analista después:</strong> ${activity.nextQuestion}</p>` : ''}`;
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
    navigationState.activeActivityId=exerciseId; navigationState.activeView='course';
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
    state.analyticalStagesPracticed = [...new Set([...(state.analyticalStagesPracticed || []), ...(getExercise(exerciseId).analyticalStages || [])])];

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
    if (state.attempts > 0) {
        renderAnalyticalChain(exerciseId, host);
        renderQualitativeRubric(exerciseId, host);
    }

    if (revealed.length) {
        const hintsBox = document.createElement('div');
        hintsBox.className = 'hints-box';
        hintsBox.innerHTML = revealed.map((hint, i) => `<p><strong>💡 Pista ${state.revealedHints[i] + 1}:</strong> ${ct(hint)}</p>`).join('');
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
    if (Object.prototype.hasOwnProperty.call(SOLUTION_ELEMENT_IDS, exerciseId)) return SOLUTION_ELEMENT_IDS[exerciseId];
    const def = Object.prototype.hasOwnProperty.call(exerciseContent, exerciseId) ? exerciseContent[exerciseId] : null;
    return def && def.solution ? `sol-${exerciseId}` : null;
}

function isQualitativeExercise(exerciseId) {
    // Solo texto libre. l1-e2, l2-e2, l3-e1 y l4-e1 tienen validación numérica: verlos no debe permitir cerrarlos.
    return QUALITATIVE_EXERCISE_IDS.includes(exerciseId);
}

function selfAssessQualitative(exerciseId) {
    // La autoevaluación cualitativa no inventa una validación automática ni crea un intento nuevo.
    // Solo permite cerrar el ejercicio después de que el alumno revisó la solución.
    if (!isQualitativeExercise(exerciseId)) return;
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
        const feedback = 'La respuesta libre no se interpreta automáticamente. Usa los criterios explícitos para revisar si identificaste el cambio, la evidencia, el driver, la hipótesis y la medición que correspondan a este ejercicio.';
        recordErrorDiagnosis(exerciseId, diagnostic, feedback);
        fb.innerHTML = `<div class=\"error-box\"><strong>❌ Autoevaluación pendiente.</strong><br>${feedback}</div>`;
        fb.setAttribute('aria-live', 'polite');
    }
}

function checkL5() { checkQualitative('l5-e1', 'sol-l5'); }
function checkL6() { checkQualitative('l6-e1', 'sol-l6'); }
function checkL7() { checkQualitative('l7-e1', 'sol-l7'); }
function checkL8() {
    const textareas = document.querySelectorAll('#l8 textarea');
    const answer = Array.from(textareas).map(t => t.value.trim()).filter(Boolean).join('\n');
    const fb = document.querySelector('#feedback-l8');
    if (!answer) {
        // Antes salía en silencio: el alumno pulsaba el botón y no pasaba nada.
        if (fb) fb.innerHTML = '<div class="error-box">Escribe primero tu respuesta y vuelve a intentarlo.</div>';
        return;
    }
    recordAttempt('l8-e1', false, answer);
    renderExerciseLearningUI('l8-e1');
    const diagnostic = { type: 'unknown', confidence: 'low' };
    const feedback = 'La respuesta libre no se interpreta automáticamente. Usa los criterios explícitos para revisar si tu análisis cubre objetivo, datos, validación, brecha, segmentación, diagnóstico, hipótesis, recomendación y medición.';
    recordErrorDiagnosis('l8-e1', diagnostic, feedback);
    if (fb) {
        fb.innerHTML = `<div class="error-box"><strong>❌ Autoevaluación pendiente.</strong><br>${feedback}</div>`;
        if (typeof fb.setAttribute === 'function') fb.setAttribute('aria-live', 'polite');
    }
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

// Curso actual: el contenido existente se registra tal cual (misma referencia, mismos IDs).
const analistaEcommerceCourse = Object.freeze({
    id: DEFAULT_COURSE_ID,
    title: 'Curso Autodidacta de Analista',
    description: 'Aprende a analizar un negocio de ecommerce: metas, ritmo, descomposición de ventas, tráfico, causas de caída, funnel y clientes.',
    version: '1.0.0',
    status: 'active',
    category: 'Analítica',
    author: '',
    thumbnail: '',
    modules: Object.freeze([
        { id: 'm0', title: 'Módulo 0: Introducción', lessonIds: ['l0'] },
        { id: 'm1', title: 'Lecciones 1 a 8', lessonIds: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'] },
        { id: 'm2', title: 'Cierre', lessonIds: ['cierre'] }
    ]),
    lessons: ANALISTA_LESSONS, concepts, exercises: exerciseMetadata, cases: ANALYTICAL_CASES, assessment: FINAL_ASSESSMENT, videos: {},
    exerciseTitles: EXERCISE_TITLES, analyticalActivities: analyticalActivityMetadata, analyticalRubrics: ANALYTICAL_RUBRICS,
    errorProfiles, analystThinking, cognitiveFlow: LESSON_COGNITIVE_FLOW,
    qualitativeExercises: QUALITATIVE_EXERCISE_IDS, solutionElements: SOLUTION_ELEMENT_IDS
});
const courseRegistration = COURSE_REGISTRY.register(analistaEcommerceCourse);
if (!courseRegistration.ok) console.warn('Curso no registrado:', courseRegistration.reasons);

// Cursos definidos como datos (content/courses/*.js → globalThis.COURSE_DEFINITIONS). Un curso inválido se omite con aviso.
(Array.isArray(globalThis.COURSE_DEFINITIONS) ? globalThis.COURSE_DEFINITIONS : []).forEach(definition => {
    const registered = COURSE_REGISTRY.register(definition);
    if (!registered.ok) console.warn(`Curso omitido (${definition && definition.id}):`, registered.reasons);
    else PUBLISHED_COURSE_DEFINITIONS[definition.id] = definition;
});
applyCourseDrafts();
// Carga inicial: ya existen el registro y todo el contenido del curso.
loadLearningState();

window.addEventListener('keydown', e => { if (e.key === 'Escape') toggleToolsMenu(false); });
window.addEventListener('beforeunload', saveLearningState);

// Inicializa el estado visual al cargar
initLearnerNameInput();
initEditorMode();
bindCourseToDom();
initLessonVideos();
updateUI();
initializeLearningUI();
loadCaseState(caseLearningState);
renderCaseLab();
renderReviewPanel();
renderDashboard();
restoreLastView();

// API interna de evidencia expuesta solo para tests/regresión; no crea un motor paralelo.
globalThis.__fase5 = { concepts, EVIDENCE_STATES, EVIDENCE_STATE_LABELS, getExerciseConcepts, getConceptDefinition, getConceptEvidence, getEvidenceForLesson, syncConceptEvidence, rebuildConceptEvidence, deriveEvidenceState, getLearningState, recordAttempt, recordErrorDiagnosis, revealNextHint, markSolutionViewed, saveLearningState, loadLearningState, exerciseLearningState };
globalThis.__fase6 = { ANALYTICAL_STAGES, ANALYTICAL_STAGE_LABELS, ANALYTICAL_CHAIN, analyticalActivityMetadata, ANALYTICAL_RUBRICS, getAnalyticalActivity, getAnalyticalRubric, markAnalyticalStagesPracticed, renderAnalyticalChain, renderQualitativeRubric, renderAnalystThinking, getLearningState, recordAttempt };
globalThis.__fase7 = { ANALYTICAL_CASES, getCase, getCaseState, evaluateCaseComponent, recordCaseAttempt, revealCaseHint, caseEvidence, sanitizeCaseState, renderCaseLab };
globalThis.__fase8 = { REVIEW_RULES, REVIEW_PRIORITIES, REVIEW_PRIORITY_ORDER, generateReviewPlan, classifyReviewPriority, sanitizeReviewState, getReviewState:()=>reviewLearningState, deferReview, completeReview, startReview, renderReviewPanel };
globalThis.__fase10 = { openWarningModal, closeModal, forceNextLesson, navigate, updateUI };
globalThis.__fase9 = { DASHBOARD_STAGE_ORDER, DASHBOARD_STAGE_LABELS, getDashboardData, dashboardNextStep, renderDashboard, openDashboard, closeDashboard, dashboardConceptName };
globalThis.__fase12 = { FINAL_ASSESSMENT, getFinalAssessmentCriteria, evaluateFinalAssessment, startFinalAssessment, completeFinalAssessment, sanitizeFinalAssessmentState, getFinalAssessmentState:()=>finalAssessmentState, getLearningState, getCaseState, buildPersistableState };

globalThis.__fase11 = { PERSISTENCE_SCHEMA_VERSION, PROGRESS_STORAGE_KEY, migratePersistedState, validatePersistedState, sanitizeNavigationState, saveLearningState, loadLearningState, exportLearningProgress, importLearningProgressFromText, resetLearningProgress, getPersistenceState:()=>persistenceState, getNavigationState:()=>navigationState, getPersistenceMetrics:()=>persistenceMetrics, buildPersistableState };

// Diagnóstico disponible para pruebas de desarrollo, sin modificar el flujo del alumno.
const pedagogicalModelValidation = validatePedagogicalModel();
if (!pedagogicalModelValidation.ok) {
    console.warn('Modelo pedagógico Fase 1 incompleto:', pedagogicalModelValidation);
}

// Expuesto solo para pruebas.
globalThis.__platform = { renderVideosAdmin, PLATFORM_STORAGE_KEY, PLATFORM_SCHEMA_VERSION, LEGACY_PROGRESS_KEY, DEFAULT_COURSE_ID, COURSE_REGISTRY, validateCourseDefinition, readPlatformStore, getActiveCourseId, resolveActiveCourseId, applyCourseContext, readCourseDrafts, writeCourseDraftEntry, applyCourseDrafts, PUBLISHED_COURSE_DEFINITIONS, toggleToolsMenu, goToLesson, renderCourseOutline, setActiveCourse, summarizeCourse, validateExerciseContent, checkDeclarativeExercise, getEngineContext, courseHasAssessment, getLearningState, recordAttempt, getDashboardData, generateReviewPlan, getCaseState, getFinalAssessmentState:()=>finalAssessmentState, getNavigationState:()=>navigationState };
globalThis.__videos = { parseYouTubeId, youTubeEmbedUrl, normalizeVideoUrl, renderLessonVideo, initLessonVideos, pauseLessonVideos, validateVideoUrl, VIDEO_STATUS_MESSAGES, sanitizeVideoEntry, resolveLessonVideo, saveVideoConfig, removeVideoConfig, discardLocalVideos, buildVideosScript, publishedVideos, isEditorMode, renderContentAdmin, openContentAdmin };
