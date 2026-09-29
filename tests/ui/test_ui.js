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
    for (let i = 1; i < n; i++) {
        await page.click('#next-btn');
        if (await page.locator('#warning-modal:not([hidden])').count()) await page.click('#warning-confirm');
    }
}
const visible = (page, sel) => page.locator(sel).isVisible();
const LABELS = { '#lab-btn': 'Casos', '#review-btn': 'Repaso', '#dashboard-btn': 'Mi aprendizaje', '#assessment-btn': 'Evaluación final' };
async function labels(page) { const o = {}; for (const sel of Object.keys(LABELS)) o[sel] = (await page.locator(sel).innerText()).trim(); return o; }

(async () => {
    const browser = await chromium.launch();

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
        assert(await visible(page, '#l1'), 'la lección vuelve a verse');
    }, browser);

    await test('Paneles: "Siguiente" con un panel abierto vuelve al curso y el aviso se ve sobre la lección', async (page) => {
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
