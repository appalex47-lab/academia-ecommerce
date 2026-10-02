// Pruebas de INTERFAZ en Chromium real (Playwright).
// Los tests de Fases 1-13 usan un DOM simulado y solo cubren lógica; estos ejercitan la app cargada de verdad.
//
// Uso (desde la carpeta del proyecto):
//   npm i -D playwright && npx playwright install chromium   # una sola vez
//   node tests/ui/test_ui.js
// Si Playwright está instalado de forma global:  NODE_PATH=$(npm root -g) node tests/ui/test_ui.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');

const results = [];
async function test(name, fn, browser) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    try {
        await page.goto(URL);
        await fn(page, ctx);
        if (errors.length) throw new Error('errores de consola: ' + errors.join(' | '));
        results.push([name, true]); console.log('PASS', name);
    } catch (e) {
        results.push([name, false]); console.log('FAIL', name, '\n     ', e.message.split('\n')[0]);
    } finally { await ctx.close(); }
}
function assert(c, m) { if (!c) throw new Error(m); }

async function goToLesson(page, n) {
    // La app abre en el Módulo 0: n clics llevan a la lección n.
    for (let i = 0; i < n; i++) {
        await page.click('#next-btn');
        if (await page.locator('#warning-modal:not([hidden])').count()) await page.click('#warning-confirm');
    }
}
const visible = (page, sel) => page.locator(sel).isVisible();
const LABELS = { '#lab-btn': 'Casos', '#review-btn': 'Repaso', '#dashboard-btn': 'Mi aprendizaje', '#assessment-btn': 'Evaluación final' };
async function labels(page) { const o = {}; for (const sel of Object.keys(LABELS)) o[sel] = (await page.locator(sel).innerText()).trim(); return o; }

(async () => {
    const browser = await chromium.launch();

    // ---------- 0. Módulo 0 y personalización ----------
    await test('Módulo 0: la app abre en la introducción, sin ejercicios, y "Siguiente" no pide confirmación', async (page) => {
        assert(await visible(page, '#l0') && !(await visible(page, '#l1')), 'debe abrir en el Módulo 0');
        assert((await page.locator('#lesson-title').innerText()).includes('Módulo 0'), 'título del Módulo 0');
        assert(await page.locator('#l0 .exercise-box, #l0 textarea').count() === 0, 'la introducción no tiene ejercicios ni textareas');
        assert(await page.locator('#prev-btn').isDisabled(), 'no hay lección anterior al Módulo 0');
        assert((await page.locator('#lessons-stat').innerText()).includes('(0/8)'), 'la introducción no cuenta como lección');
        await page.click('#next-btn');
        assert(await page.locator('#warning-modal:not([hidden])').count() === 0, 'la introducción no debe mostrar aviso de incompleta');
        assert(await visible(page, '#l1'), 'debe pasar a la Lección 1');
        assert((await page.locator('#lessons-stat').innerText()).includes('(0/8)'), 'completar la introducción no suma al progreso de lecciones');
    }, browser);

    await test('Personalización: el nombre aparece en los casos, persiste y se puede borrar', async (page) => {
        assert((await page.locator('#l1 .scenario').innerText()).includes('Manuel'), 'sin nombre se usa el protagonista por defecto');
        await page.fill('#learner-name', 'Ana');
        await page.click('#l0 .profile-box button');
        assert((await page.locator('#intro-greeting').innerText()).includes('Ana'), 'el saludo usa el nombre');
        await page.click('#next-btn');
        assert((await page.locator('#l1 .scenario').innerText()).includes('Ana') && !(await page.locator('#l1 .scenario').innerText()).includes('Manuel'), 'el caso de L1 usa el nombre');
        await page.reload(); // la app retoma en la Lección 1
        assert(await visible(page, '#l1'), 'debe retomar en la Lección 1');
        assert((await page.locator('#l1 .scenario').innerText()).includes('Ana'), 'el nombre persiste al recargar');
        await page.click('#prev-btn');
        await page.fill('#learner-name', '   ');
        await page.click('#l0 .profile-box button');
        assert((await page.locator('#intro-greeting').innerText()).includes('opcional'), 'sin nombre vuelve al saludo neutro');
    }, browser);

    await test('Personalización: un nombre con HTML se muestra como texto, no se interpreta', async (page) => {
        await page.fill('#learner-name', '<img src=x onerror=window.__pwned=1>Luz');
        await page.click('#l0 .profile-box button');
        assert(await page.evaluate(() => window.__pwned === undefined && document.querySelectorAll('#l0 img').length === 0), 'no debe inyectarse HTML');
        assert((await page.locator('#learner-name').inputValue()).length <= 30, 'el nombre se limita a 30 caracteres');
    }, browser);

    await test('Persistencia: progreso guardado antes del Módulo 0 conserva la lección donde estaba', async (page) => {
        await page.evaluate(() => {
            const st = JSON.parse(JSON.stringify(__fase11.buildPersistableState()));
            delete st.currentLessonId; delete st.learnerProfile; st.currentIndex = 2; // antes: Lección 3
            // Navegador anterior a la Fase 14: solo existe la clave antigua; la plataforma debe migrarla.
            localStorage.removeItem('plataforma.aprendizaje.v1');
            localStorage.setItem(__fase11.PROGRESS_STORAGE_KEY, JSON.stringify(st));
        });
        await page.reload();
        assert((await page.locator('#lesson-title').innerText()).includes('Lección 3'), 'debe abrir en la Lección 3, no en la 2');
    }, browser);

    await test('Secciones: Casos, Repaso y Mi aprendizaje explican qué son', async (page) => {
        for (const [btn, panel] of [['#lab-btn', '#case-lab'], ['#review-btn', '#review-panel'], ['#dashboard-btn', '#dashboard-panel']]) {
            await page.click(btn);
            const guide = page.locator(`${panel} .panel-guide`);
            assert(await guide.count() === 1, `${panel} debe tener su guía`);
            const t = await guide.innerText();
            assert(t.includes('¿Qué es esta sección?') && t.includes('Cuándo usarla') && t.includes('Cómo funciona'), `${panel} guía incompleta`);
            await page.click(btn);
        }
    }, browser);

    // ---------- Video de introducción por sección ----------
    await test('Video: cada sección (0 a 8 y cierre) tiene su espacio, justo bajo el título, con tarjeta "Próximamente"', async (page) => {
        const slots = await page.evaluate(() => [...document.querySelectorAll('.lesson')].map(l => ({
            id: l.id,
            num: l.querySelector('.lesson-video')?.dataset.videoSlot,
            url: l.querySelector('.lesson-video')?.dataset.videoUrl,
            afterTitle: l.querySelector('h2 + .lesson-video') !== null,
            placeholder: l.querySelector('.lesson-video .lesson-video-placeholder') !== null,
            videos: l.querySelectorAll('.lesson-video video').length
        })));
        assert(slots.length === 10, 'debe haber 10 secciones: ' + slots.length);
        slots.forEach(x => {
            assert(x.afterTitle, x.id + ': el video debe ir justo bajo el título');
            assert(x.placeholder && x.videos === 0, x.id + ': sin URL debe mostrar la tarjeta, no un <video>');
            assert(/^PON AQUÍ TU VIDEO DE/.test(x.url), x.id + ': texto de reemplazo: ' + x.url);
        });
        assert(slots.slice(0, 9).every((x, i) => x.num === String(i)), 'numeración 0..8: ' + slots.map(x => x.num));
        assert((await page.locator('#l0 .lesson-video').innerText()).includes('Próximamente'), 'la tarjeta dice Próximamente');
        const box = await page.locator('#l0 .lesson-video-frame').boundingBox();
        assert(Math.abs(box.width / box.height - 16 / 9) < 0.05, 'proporción 16:9: ' + box.width / box.height);
    }, browser);

    await test('Video: con una URL válida se crea el reproductor; enlaces de GitHub /blob/ se convierten; URLs peligrosas se rechazan', async (page) => {
        const r = await page.evaluate(() => {
            const f = document.querySelector('#l1 .lesson-video');
            f.dataset.videoUrl = 'https://github.com/usuario/repo/blob/main/videos/leccion-1.mp4';
            __videos.renderLessonVideo(f);
            const v = f.querySelector('video');
            return {
                src: v && v.getAttribute('src'), controls: v && v.controls,
                bad: ['javascript:alert(1)', 'PON AQUÍ TU VIDEO DE LA SECCIÓN 1', '', 'data:text/html,x'].map(__videos.normalizeVideoUrl)
            };
        });
        assert(r.src === 'https://github.com/usuario/repo/raw/main/videos/leccion-1.mp4', 'blob → raw: ' + r.src);
        assert(r.controls === true, 'el reproductor tiene controles');
        assert(r.bad.every(x => x === ''), 'valores no válidos deben ignorarse: ' + JSON.stringify(r.bad));
    }, browser);

    await test('Video: los enlaces de YouTube se convierten en reproductor incrustado seguro y no rompen la pausa', async (page) => {
        await page.route('**/*youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
        const id = 'dQw4w9WgXcQ';
        const r = await page.evaluate((id) => {
            const ok = ['https://youtu.be/' + id, 'https://www.youtube.com/watch?v=' + id, 'https://youtube.com/watch?feature=share&v=' + id + '&t=5', 'https://www.youtube.com/shorts/' + id, 'https://www.youtube.com/embed/' + id].map(__videos.parseYouTubeId);
            const bad = ['https://youtu.be/corto', 'https://evil.com/watch?v=' + id, 'javascript:alert(1)', 'https://www.youtube.com/watch?v=' + id + 'XX', 'PON AQUÍ TU VIDEO DE LA SECCIÓN 0', ''].map(__videos.parseYouTubeId);
            const f = document.querySelector('#l2 .lesson-video');
            f.dataset.videoUrl = 'https://youtu.be/' + id;
            __videos.renderLessonVideo(f);
            const i = f.querySelector('iframe');
            let threw = false; try { __videos.pauseLessonVideos(); } catch (e) { threw = true; }
            return { ok, bad, src: i && i.src, videos: f.querySelectorAll('video').length, fullscreen: i && i.allowFullscreen, threw };
        }, id);
        assert(r.ok.every(x => x === id), 'formatos válidos: ' + JSON.stringify(r.ok));
        assert(r.bad.every(x => x === ''), 'no válidos: ' + JSON.stringify(r.bad));
        assert(r.src && r.src.startsWith('https://www.youtube-nocookie.com/embed/' + id + '?') && r.src.includes('enablejsapi=1'), 'src del iframe: ' + r.src);
        assert(r.videos === 0 && r.fullscreen === true && r.threw === false, 'sin <video>, con pantalla completa y pausa sin errores');
    }, browser);

    await test('Video: si el archivo no carga se avisa con un enlace, y cambiar de lección pausa el video', async (page) => {
        await page.evaluate(() => {
            // Se anula la carga real (evita ruido de red) y se simula el evento de error del navegador.
            Object.defineProperty(HTMLMediaElement.prototype, 'src', { set() {}, get() { return ''; }, configurable: true });
            const f = document.querySelector('#l0 .lesson-video');
            f.dataset.videoUrl = 'videos/no-existe.mp4';
            __videos.renderLessonVideo(f);
            f.querySelector('video').dispatchEvent(new Event('error'));
        });
        await page.locator('#l0 .lesson-video-error').waitFor({ timeout: 5000 });
        const failText = await page.locator('#l0 .lesson-video-error').innerText();
        assert(failText.includes('Video no disponible') && failText.includes('Puedes continuar con la lección normalmente') && !/Código|\.mp4/.test(failText), 'tarjeta de respaldo sin detalles técnicos: ' + failText);
        const paused = await page.evaluate(() => {
            const v = document.createElement('video'); document.querySelector('#l0 .lesson-video-frame').appendChild(v);
            let calls = 0; v.pause = () => { calls++; };
            document.getElementById('next-btn').click();
            return calls;
        });
        assert(paused >= 1, 'al navegar se debe pausar el video');
    }, browser);

    // ---------- 1. Lección 8 ----------
    await test('L8: tiene campo, registra intento, muestra rúbrica y se puede resolver', async (page) => {
        await goToLesson(page, 8);
        assert(await page.locator('#l8 textarea').count() === 1, 'la lección 8 debe tener un textarea');
        await page.click('#l8 .exercise-box button:has-text("Registrar respuesta")');
        assert((await page.locator('#feedback-l8').innerText()).includes('Escribe primero'), 'un envío vacío debe avisar, no salir en silencio');
        await page.fill('#l8-answer', 'Resumen: la venta está 12% bajo la meta. Driver: conversión en checkout mobile. Medición: CR por dispositivo, semanal.');
        await page.click('#l8 .exercise-box button:has-text("Registrar respuesta")');
        const ctl = page.locator('[data-learning-controls="l8-e1"]');
        assert((await ctl.innerText()).includes('Intentos: 1'), 'debe registrar 1 intento');
        assert((await page.locator('#feedback-l8').innerText()).includes('Autoevaluación pendiente'), 'debe mostrar feedback');
        assert(await ctl.locator('[data-rubric]').count() === 9, 'debe aparecer la rúbrica de 9 criterios');
        for (const box of await ctl.locator('[data-rubric]').all()) await box.check();
        await ctl.locator('[data-save-rubric]').click();
        while (await ctl.locator('button:has-text("Ver pista")').count()) await ctl.locator('button:has-text("Ver pista")').first().click();
        await ctl.locator('button:has-text("Ver solución paso a paso")').click();
        await ctl.locator('button:has-text("Marcar como resuelto")').click();
        assert((await ctl.innerText()).includes('Ejercicio resuelto correctamente'), 'la lección 8 debe poder completarse');
    }, browser);

    // ---------- 2. Evaluación final ----------
    await test('Evaluación final: un alumno con toda la evidencia puede pasar (Recomendar ya es alcanzable)', async (page) => {
        await goToLesson(page, 8);
        await page.fill('#l8-answer', 'Análisis integrador completo con recomendación y medición.');
        await page.click('#l8 .exercise-box button:has-text("Registrar respuesta")');
        const ctl = page.locator('[data-learning-controls="l8-e1"]');
        for (const box of await ctl.locator('[data-rubric]').all()) await box.check();
        await ctl.locator('[data-save-rubric]').click();
        await page.evaluate(() => {
            ['l1-e1', 'l2-e1', 'l3-e1'].forEach(id => { const s = __fase12.getLearningState(id); s.completed = true; s.solvedCorrectly = true; });
            __fase12.getLearningState('l5-e1').qualitativeCriteria = { change: true, evidence: true, driver: true, segment: true, fact_hypothesis: true, hypothesis: true, measurement: true };
            __fase12.getCaseState('case-open-analysis-plan').completed = true;
        });
        await page.click('#assessment-btn');
        assert(await page.locator('.assessment-criterion.is-met').count() === 7, 'los 7 criterios deben poder cumplirse');
        await page.click('#assessment-start');
        await page.click('#assessment-start');
        assert((await page.locator('.assessment-result').innerText()).includes('Evaluación completada'), 'debe aprobar');
    }, browser);

    await test('Evaluación final: registrar resultado sin evidencia se rechaza y avisa', async (page) => {
        await page.click('#assessment-btn');
        await page.click('#assessment-start');
        await page.click('#assessment-start');
        assert((await page.locator('.assessment-history').innerText()).includes('Aún no hay intentos completos'), 'no debe crearse un intento vacío');
        assert(await page.locator('.assessment-note[role="status"]').isVisible(), 'debe explicar por qué');
    }, browser);

    // ---------- 3. Laboratorio ----------
    const CASE1 = '[data-case-id="case-guided-sales-drop"]';
    await test('Laboratorio: el mensaje de feedback permanece tras registrar', async (page) => {
        await page.click('#lab-btn');
        await page.locator(`${CASE1} select[data-case-input="change"]`).selectOption('0');
        await page.locator(`${CASE1} button[type="submit"]`).click();
        const fb = await page.locator(`${CASE1} .case-feedback`).innerText();
        assert(fb.includes('componentes'), 'el feedback debe seguir visible (antes se borraba al instante): "' + fb + '"');
    }, browser);

    await test('Laboratorio: pedir una pista conserva lo escrito', async (page) => {
        await page.click('#lab-btn');
        await page.locator(`${CASE1} textarea[data-case-input="hypothesis"]`).fill('texto que no debe perderse');
        await page.locator(`${CASE1} select[data-case-input="driver"]`).selectOption('0');
        await page.locator(`${CASE1} [data-case-hint]`).click();
        assert(await page.locator(`${CASE1} .hints-box`).count() === 1, 'la pista debe mostrarse');
        assert(await page.locator(`${CASE1} textarea[data-case-input="hypothesis"]`).inputValue() === 'texto que no debe perderse', 'el textarea se borró');
        assert(await page.locator(`${CASE1} select[data-case-input="driver"]`).inputValue() === '0', 'el select se reinició');
    }, browser);

    await test('Laboratorio: un envío vacío no cuenta como intento', async (page) => {
        await page.click('#lab-btn');
        await page.locator(`${CASE1} button[type="submit"]`).click();
        assert(await page.evaluate(() => __fase7.getCaseState('case-guided-sales-drop').attempts) === 0, 'no debe registrar intento');
        assert((await page.locator(`${CASE1} .case-feedback`).innerText()).includes('Responde al menos un componente'), 'debe avisar');
    }, browser);

    await test('Laboratorio: validación de texto por palabras, sin falsos positivos', async (page) => {
        const r = await page.evaluate(() => {
            const comp = __fase7.ANALYTICAL_CASES[0].components.find(c => c.id === 'hypothesis');
            const ev = t => __fase7.evaluateCaseComponent(comp, t);
            return {
                falsoPositivoCr: ev('escribir una descripción cualquiera larga'),
                soloUnaPalabra: ev('mobile'),
                acentosYSinonimos: ev('La conversión bajó en móvil durante el pago'),
                original: ev('CR mobile checkout'),
                selectVacio: __fase7.evaluateCaseComponent(__fase7.ANALYTICAL_CASES[0].components[0], '')
            };
        });
        assert(r.falsoPositivoCr === false, '"cr" no debe coincidir dentro de otras palabras');
        assert(r.soloUnaPalabra === false, 'una sola palabra no basta');
        assert(r.acentosYSinonimos === true, 'debe aceptar sinónimos y acentos');
        assert(r.original === true, 'debe conservar el caso original');
        assert(r.selectVacio === false, 'un select sin elegir no es la respuesta 0');
    }, browser);

    await test('Laboratorio: la respuesta correcta no está siempre primero (y el orden es estable)', async (page) => {
        await page.click('#lab-btn');
        const read = () => page.evaluate(() => {
            const pos = [];
            __fase7.ANALYTICAL_CASES.forEach(c => c.components.filter(k => k.type === 'select').forEach(k => {
                const opts = [...document.querySelectorAll(`[data-case-id="${c.id}"] select[data-case-input="${k.id}"] option`)].filter(o => o.value !== '');
                pos.push(opts.findIndex(o => Number(o.value) === k.answer));
            }));
            return pos;
        });
        const a = await read();
        assert(a.length >= 6 && a.some(p => p !== 0), 'la correcta no puede estar siempre en la primera posición: ' + a);
        await page.click('#lab-btn'); await page.click('#lab-btn');
        assert(JSON.stringify(await read()) === JSON.stringify(a), 'el orden debe ser estable entre renders');
    }, browser);

    // ---------- 4. Paneles ----------
    await test('Paneles: solo uno visible a la vez y etiquetas coherentes', async (page) => {
        assert(JSON.stringify(await labels(page)) === JSON.stringify(LABELS), 'etiquetas iniciales');
        await page.click('#review-btn');
        await page.click('#lab-btn');
        assert(!(await visible(page, '#review-panel')) && await visible(page, '#case-lab'), 'Repaso y Casos no deben verse a la vez');
        const l = await labels(page);
        assert(l['#lab-btn'] === 'Volver al curso' && l['#review-btn'] === 'Repaso', 'etiquetas tras cambiar de panel: ' + JSON.stringify(l));
        await page.click('#dashboard-btn');
        assert(!(await visible(page, '#case-lab')) && await visible(page, '#dashboard-panel'), 'dashboard reemplaza a casos');
        assert((await labels(page))['#lab-btn'] === 'Casos', 'el botón de casos no debe quedarse en "Volver al curso" ni llamarse "Laboratorio"');
        await page.click('#dashboard-btn');
        assert(JSON.stringify(await labels(page)) === JSON.stringify(LABELS), 'al volver al curso todo queda en su etiqueta');
        assert(await visible(page, '#l0'), 'la lección vuelve a verse');
    }, browser);

    await test('Paneles: "Siguiente" con un panel abierto vuelve al curso y el aviso se ve sobre la lección', async (page) => {
        await goToLesson(page, 1);
        await page.click('#lab-btn');
        await page.click('#next-btn');
        assert(!(await visible(page, '#case-lab')), 'el panel no debe quedar debajo del modal');
        assert(await visible(page, '#l1'), 'debe verse la lección');
        assert(await page.locator('#warning-modal:not([hidden])').count() === 1, 'el aviso de lección incompleta debe aparecer');
    }, browser);

    await test('Paneles: "Ir al contenido" de un caso oculta Repaso', async (page) => {
        await page.evaluate(() => {
            const st = __fase7.getCaseState('case-guided-sales-drop'); st.attempts = 1; st.completed = false; st.lastActivityAt = new Date().toISOString();
            __fase8.startReview('case:case-guided-sales-drop');
        });
        await page.click('#review-btn');
        await page.click('[data-review-open]');
        assert(!(await visible(page, '#review-panel')), 'Repaso debe ocultarse');
        assert(await visible(page, '#case-lab'), 'Casos debe mostrarse');
    }, browser);

    await test('Paneles: la vista abierta se restaura al recargar', async (page) => {
        await page.click('#lab-btn');
        await page.reload();
        assert(await visible(page, '#case-lab') && !(await visible(page, '#l1')), 'debe reabrir Casos');
        assert((await labels(page))['#lab-btn'] === 'Volver al curso', 'la etiqueta debe corresponder');
    }, browser);

    // ---------- 5. Repaso ----------
    await test('Repaso: un alumno nuevo no tiene oportunidades de repaso', async (page) => {
        await page.click('#review-btn');
        assert((await page.locator('#review-panel').innerText()).includes('No hay una necesidad de repaso'), 'debe estar vacío');
        assert(await page.evaluate(() => __fase8.generateReviewPlan().length) === 0, 'plan vacío');
    }, browser);

    await test('Repaso: título legible y sin "error repetido" falso en casos', async (page) => {
        await page.evaluate(() => { document.querySelector('#l5 textarea').value = 'mi respuesta'; checkL5(); });
        await page.click('#review-btn');
        const t = await page.locator('.review-item strong').allInnerTexts();
        assert(t.length === 1 && t[0] === 'Repaso: Lección 5 · Causas de caída', 'título: ' + JSON.stringify(t));
        const reason = await page.evaluate(() => {
            const id = 'case-guided-sales-drop', all = Object.fromEntries(__fase7.getCase(id).components.map(c => [c.id, true]));
            __fase7.recordCaseAttempt(id, { ...all, quantify: false });
            __fase7.recordCaseAttempt(id, { ...all, driver: false });
            return __fase8.generateReviewPlan().find(x => x.itemId === 'case:' + id).reason;
        });
        assert(reason !== 'error repetido', 'fallar componentes distintos no es un error repetido (razón: ' + reason + ')');
        const same = await page.evaluate(() => {
            const id = 'case-partial-mobile-checkout', all = Object.fromEntries(__fase7.getCase(id).components.map(c => [c.id, true]));
            __fase7.recordCaseAttempt(id, { ...all, driver: false }); __fase7.recordCaseAttempt(id, { ...all, driver: false });
            return __fase8.generateReviewPlan().find(x => x.itemId === 'case:' + id).reason;
        });
        assert(same === 'error repetido', 'el mismo componente fallando dos veces sí lo es (razón: ' + same + ')');
    }, browser);

    // ---------- 6. Mi aprendizaje ----------
    await test('Mi aprendizaje: alumno nuevo sin etapas ni repaso y totales coherentes con el encabezado', async (page) => {
        assert((await page.locator('#exercises-stat').innerText()).includes('(0/10)'), 'encabezado: ' + await page.locator('#exercises-stat').innerText());
        await page.click('#dashboard-btn');
        assert((await page.locator('.dashboard-metrics').innerText()).includes('(0/10)'), 'dashboard 0/10');
        assert(await page.locator('.dashboard-stage.done').count() === 0, 'sin actividad no debe haber etapas con ✓');
        assert(!(await page.locator('.dashboard-next').innerText()).includes('repaso'), 'el siguiente paso no debe ser repasar');
    }, browser);

    await test('Mi aprendizaje: un intento fallido no marca dificultad ni etapas ajenas', async (page) => {
        await page.evaluate(() => { document.querySelector('#l5 textarea').value = 'mi respuesta'; checkL5(); });
        await page.click('#dashboard-btn');
        const stages = await page.locator('.dashboard-stage.done').allInnerTexts();
        assert(!stages.some(t => /Comprender|Calcular|Interpretar/.test(t)), 'etapas: ' + JSON.stringify(stages));
        assert((await page.locator('.dashboard-grid').first().innerText()).includes('0 conceptos con evidencia de dificultad'), 'un solo intento no es dificultad');
        assert((await page.locator('#exercises-stat').innerText()).includes('(0/10)'), 'encabezado sigue en total del curso');
    }, browser);

    // ---------- 7. Trampa en ejercicios numéricos ----------
    for (const id of ['l1-e2', 'l2-e2', 'l3-e1', 'l4-e1']) {
        await test(`Ejercicio numérico ${id}: ver la solución no permite marcarlo como resuelto`, async (page) => {
            await page.evaluate(async (ex) => {
                __fase5.recordAttempt(ex, false, 'respuesta incorrecta');
                while (__fase5.revealNextHint(ex)) { /* agota pistas */ }
                revealExerciseSolution(ex);
                selfAssessQualitative(ex);
            }, id);
            const host = page.locator(`[data-learning-controls="${id}"]`);
            assert(await host.locator('button:has-text("Marcar como resuelto")').count() === 0, 'no debe existir el botón');
            assert(await page.evaluate(ex => __fase5.getLearningState(ex).completed, id) === false, 'no debe quedar completado');
        }, browser);
    }
    await test('Ejercicio de texto libre l5-e1: sí puede autoevaluarse (control positivo)', async (page) => {
        await page.evaluate(() => { document.querySelector('#l5 textarea').value = 'mi respuesta'; checkL5(); __fase5.revealNextHint('l5-e1'); while (__fase5.revealNextHint('l5-e1')) { } revealExerciseSolution('l5-e1'); });
        assert(await page.locator('[data-learning-controls="l5-e1"] button:has-text("Marcar como resuelto")').count() === 1, 'debe existir el botón');
    }, browser);

    await browser.close();
    const failed = results.filter(r => !r[1]).length;
    console.log(`\n${results.length - failed}/${results.length} pruebas de interfaz PASS`);
    process.exit(failed ? 1 : 0);
})();
