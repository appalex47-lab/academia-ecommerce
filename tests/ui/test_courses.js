// Fase 14 · paso 4: plataforma multi-curso en Chromium real (Mis cursos, curso Demo, aislamiento, persistencia).
const { chromium } = require('playwright'); const path = require('path'); const http = require('http'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let BASE = ''; let passed = 0, failed = 0;
function assert(c, m) { if (!c) throw new Error(m); }
async function test(name, fn, browser, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport }); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  try { await fn(page); assert(errors.length === 0, 'errores de consola: ' + errors.join(' | ')); console.log('PASS', name); passed++; }
  catch (e) { console.log('FAIL', name, '\n     ', e.message.split('\n')[0]); failed++; }
  await ctx.close();
}
const A = 'analista-ecommerce', D = 'curso-demo';
const open = async page => { await page.goto(BASE); await page.waitForSelector('#lesson-title'); };
const courses = async page => { if (await page.locator('#tools-toggle').isVisible() && !(await page.locator('#nav-tools').isVisible())) await page.click('#tools-toggle'); await page.click('#courses-btn'); await page.waitForSelector('#courses-panel:not(.hidden) .course-card'); };
const status = (page, id) => page.locator(`[data-course-status="${id}"]`).innerText();
const card = (page, id) => page.locator(`[data-course-card="${id}"]`).innerText();
const openCourseBtn = (page, id) => page.click(`[data-open-course="${id}"]`);
const stat = (page, id) => page.locator('#' + id).innerText();
async function solveL1(page) { // ejercicio real de la Lección 1 del curso Analista
  for (const [id, v] of [['l1-meta', 9000000], ['l1-eco', 4500000], ['l1-app', 2700000], ['l1-wa', 900000], ['l1-cc', 900000]]) await page.fill('#' + id, String(v));
  await page.click('#l1 button[onclick="checkL1()"]');
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); BASE = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();

  await test('Plataforma: Mis cursos lista Analista y Demo sin iniciar; el curso abierto es Analista', async page => {
    await open(page); await courses(page);
    assert(await page.locator('.course-card').count() === 2, 'dos cursos');
    assert(await status(page, A) === 'No iniciado' && await status(page, D) === 'No iniciado', 'ambos no iniciados');
    assert((await card(page, A)).includes('Curso abierto') && !(await card(page, D)).includes('Curso abierto'), 'curso abierto');
    assert((await card(page, D)).includes('No es contenido real') && (await card(page, D)).includes('2 ejercicios por resolver'), 'descripción del Demo');
    assert(await page.locator('[data-open-course]').first().innerText() === 'Comenzar →', 'botón Comenzar');
    assert(!/punto|ranking|nivel \d|racha/i.test(await page.locator('#courses-panel').innerText()), 'sin gamificación');
    await page.click('#courses-btn'); assert(await page.locator('#courses-panel').isHidden(), 'vuelve al curso');
  }, browser);

  await test('Flujo completo del curso Analista y de vuelta a Mis cursos', async page => {
    await open(page); await courses(page); await openCourseBtn(page, A);
    assert((await page.locator('#lesson-title').innerText()).includes('Módulo 0'), 'abre el Módulo 0');
    await page.click('#next-btn'); await page.waitForTimeout(100);
    if (await page.locator('#warning-modal').isVisible()) await page.click('#warning-confirm');
    assert((await page.locator('#lesson-title').innerText()).includes('Lección 1') || (await page.locator('#lesson-title').innerText()).includes('LECCIÓN 1'), 'Lección 1: ' + await page.locator('#lesson-title').innerText());
    await solveL1(page); assert((await page.locator('#feedback-l1').innerText()).includes('Correctos'), 'l1 resuelto');
    assert(await stat(page, 'exercises-stat') === '10% (1/10)', 'estadística 1/10');
    for (const [btn, panel] of [['dashboard-btn', 'dashboard-panel'], ['review-btn', 'review-panel'], ['lab-btn', 'case-lab'], ['assessment-btn', 'final-assessment-panel']]) {
      await page.click('#' + btn); assert(await page.locator('#' + panel).isVisible(), 'abre ' + panel);
      await page.click('#' + btn); assert(await page.locator('#' + panel).isHidden(), 'cierra ' + panel);
    }
    await courses(page);
    assert(await status(page, A) === 'En progreso' && (await card(page, A)).includes('1 de 10 ejercicios resueltos · 1 intento') && (await card(page, A)).includes('Continuarás en:'), 'resumen descriptivo: ' + await card(page, A));
    assert(await status(page, D) === 'No iniciado', 'Demo intacto');
    assert(await page.locator(`[data-open-course="${A}"]`).innerText() === 'Continuar →', 'botón Continuar');
  }, browser);

  await test('Curso Demo: navegación propia, ejercicios con el mismo motor y evidencia propia', async page => {
    await open(page); await courses(page); await solveL1Prelude(page);
    async function solveL1Prelude(p) { await openCourseBtn(p, A); await p.click('#next-btn'); await p.waitForTimeout(100); if (await p.locator('#warning-modal').isVisible()) await p.click('#warning-confirm'); await solveL1(p); await courses(p); }
    await openCourseBtn(page, D);
    assert(await page.locator('.course-label').textContent() === 'Curso Demo (prueba del motor)', 'encabezado del curso');
    assert(await page.locator('#lesson-title').innerText() === 'Lección demo: ritmo de ventas', 'lección del Demo');
    assert(await page.locator('#demo-l1.active').count() === 1 && await page.locator('.lesson.active').count() === 1, 'una sola lección activa');
    assert(await page.locator('[data-exercise-block]').count() === 2, 'dos ejercicios');
    assert(await stat(page, 'exercises-stat') === '0% (0/2)', 'Demo parte en 0: ' + await stat(page, 'exercises-stat'));
    assert(await page.locator('#assessment-btn').isHidden(), 'sin evaluación final');
    assert(await page.locator('#prev-btn').isDisabled() && await page.locator('#next-btn').isDisabled(), 'navegación propia: una sola lección');
    // vacío no cuenta como intento
    await page.click('[data-exercise-block="demo-e1"] button.action-btn');
    assert((await page.locator('#feedback-demo-e1').innerText()).includes('Completa todas'), 'pide completar');
    assert((await page.locator('[data-learning-controls="demo-e1"]').innerText()).includes('Intentos: 0'), 'sin intento por enviar vacío');
    // incorrecto → pista → correcto
    await page.fill('#demo-e1-dia', '700'); await page.click('[data-exercise-block="demo-e1"] button.action-btn');
    assert((await page.locator('#feedback-demo-e1').innerText()).includes('Todavía no'), 'incorrecto');
    assert((await page.locator('[data-learning-controls="demo-e1"]').innerText()).includes('Intentos: 1'), 'cuenta el intento');
    await page.click('[data-learning-controls="demo-e1"] button:has-text("Ver pista 1")');
    assert((await page.locator('[data-learning-controls="demo-e1"]').innerText()).includes('Pista 1'), 'pista del motor');
    await page.fill('#demo-e1-dia', '800'); await page.click('[data-exercise-block="demo-e1"] button.action-btn');
    assert((await page.locator('#feedback-demo-e1').innerText()).includes('$800 por día'), 'correcto');
    assert((await page.locator('[data-learning-controls="demo-e1"]').innerText()).includes('Ejercicio resuelto'), 'estado resuelto');
    assert(await stat(page, 'exercises-stat') === '50% (1/2)', '1/2');
    // opción múltiple
    await page.click('[data-exercise-block="demo-e2"] button.action-btn'); assert((await page.locator('#feedback-demo-e2').innerText()).includes('Elige una opción'), 'pide elegir');
    await page.check('input[name="demo-e2"][value="a"]'); await page.click('[data-exercise-block="demo-e2"] button.action-btn');
    assert((await page.locator('#feedback-demo-e2').innerText()).includes('Todavía no'), 'opción incorrecta');
    await page.check('input[name="demo-e2"][value="b"]'); await page.click('[data-exercise-block="demo-e2"] button.action-btn');
    assert(await stat(page, 'exercises-stat') === '100% (2/2)', '2/2');
    // evidencia propia en Mi aprendizaje
    await page.click('#dashboard-btn'); const dash = await page.locator('#dashboard-panel').innerText();
    assert(dash.includes('Ritmo de ventas'), 'concepto del Demo en su dashboard');
    const foreign = await page.evaluate(() => { const c = __platform.COURSE_REGISTRY.get('analista-ecommerce').concepts; const stages = ['Hipótesis']; /* nombre que coincide con una etapa genérica del motor, no es una fuga */ return Object.values(c).map(x => x.name).filter(n => !stages.includes(n) && document.getElementById('dashboard-panel').innerText.includes(n)); });
    assert(/1 conceptos con evidencia/.test(dash), 'el dashboard del Demo cuenta solo su concepto: ' + dash.slice(0, 400));
    assert(foreign.length === 0, 'el dashboard del Demo no muestra conceptos del Analista: ' + foreign.join(','));
    // repaso y casos del Demo no traen contenido del Analista
    await page.click('#dashboard-btn'); await page.click('#lab-btn'); assert(!(await page.locator('#case-lab').innerText()).includes('Caso 1'), 'sin casos del Analista'); await page.click('#lab-btn');
    // Mis cursos: ambos con su propio resumen
    await courses(page);
    assert((await card(page, D)).includes('2 de 2 ejercicios resueltos · 4 intentos'), 'Demo: ' + await card(page, D));
    assert((await card(page, A)).includes('1 de 10 ejercicios resueltos · 1 intento'), 'Analista no cambió: ' + await card(page, A));
  }, browser);

  await test('Volver al Analista conserva su progreso; el Demo no lo contamina; sobrevive a recargar', async page => {
    await open(page); await courses(page); await openCourseBtn(page, A); await page.click('#next-btn'); await page.waitForTimeout(100); if (await page.locator('#warning-modal').isVisible()) await page.click('#warning-confirm');
    await solveL1(page); await courses(page); await openCourseBtn(page, D);
    await page.fill('#demo-e1-dia', '800'); await page.click('[data-exercise-block="demo-e1"] button.action-btn');
    await courses(page); await openCourseBtn(page, A);
    assert((await page.locator('#lesson-title').innerText()).toUpperCase().includes('LECCIÓN 1'), 'vuelve a la lección donde estaba');
    assert(await stat(page, 'exercises-stat') === '10% (1/10)', 'Analista conserva 1/10: ' + await stat(page, 'exercises-stat'));
    await page.click('#dashboard-btn'); assert(!(await page.locator('#dashboard-panel').innerText()).includes('Ritmo de ventas'), 'el dashboard del Analista no muestra evidencia del Demo'); await page.click('#dashboard-btn');
    assert(await page.locator('#demo-l1').count() === 0, 'el DOM del Demo se retira al salir');
    // recargar con el Demo abierto
    await courses(page); await openCourseBtn(page, D); await page.reload(); await page.waitForSelector('#lesson-title');
    assert(await page.locator('#lesson-title').innerText() === 'Lección demo: ritmo de ventas', 'recarga abre el curso activo (Demo)');
    assert((await page.locator('[data-learning-controls="demo-e1"]').innerText()).includes('Ejercicio resuelto'), 'progreso del Demo restaurado');
    assert(await stat(page, 'exercises-stat') === '50% (1/2)', 'estadística restaurada');
    await courses(page); await openCourseBtn(page, A); await page.reload(); await page.waitForSelector('#lesson-title');
    assert(await stat(page, 'exercises-stat') === '10% (1/10)' && (await page.locator('.course-label').textContent()) === 'Curso Autodidacta de Analista', 'recarga con el Analista');
  }, browser);

  await test('Videos por curso: el editor configura el video del Demo sin afectar al Analista', async page => {
    await page.goto(BASE + '?editor=1'); await page.waitForSelector('#lesson-title'); await courses(page); await openCourseBtn(page, D);
    await page.click('#content-btn'); await page.waitForSelector('#content-panel .video-admin-row');
    assert(await page.locator('.video-admin-row').count() === 1 && (await page.locator('#content-panel').innerText()).includes('Curso Demo'), 'el editor lista las secciones del Demo');
    await page.fill('#video-demo-l1-url', 'https://youtu.be/dQw4w9WgXcQ'); await page.click('[data-video-validate="demo-l1"]'); await page.check('#video-demo-l1-enabled'); await page.click('[data-video-save="demo-l1"]');
    await page.click('#content-btn'); assert(await page.locator('#demo-l1 .lesson-video iframe').count() === 1, 'el Demo muestra su video');
    await courses(page); await openCourseBtn(page, A);
    assert(await page.locator('#l0 .lesson-video iframe').count() === 0 && await page.locator('iframe').count() === 0, 'el Analista no recibe ese video');
  }, browser);

  for (const w of [390, 768, 1280, 1920]) await test(`Responsive ${w}px: Mis cursos y lección Demo sin desbordar su propio contenedor`, async page => {
    await open(page); await courses(page);
    const m = await page.evaluate(() => { const p = document.getElementById('courses-panel'); return { sw: p.scrollWidth, cw: p.clientWidth }; });
    assert(m.sw <= m.cw + 1, 'panel Mis cursos: ' + JSON.stringify(m));
    await openCourseBtn(page, D);
    const l = await page.evaluate(() => { const e = document.getElementById('demo-l1'); return { sw: e.scrollWidth, cw: e.clientWidth }; });
    assert(l.sw <= l.cw + 1, 'lección Demo: ' + JSON.stringify(l));
  }, browser, { width: w, height: 900 });

  await browser.close(); server.close(); console.log(`\n${passed}/${passed + failed} pruebas de plataforma multi-curso PASS`); process.exit(failed ? 1 : 0);
})();
