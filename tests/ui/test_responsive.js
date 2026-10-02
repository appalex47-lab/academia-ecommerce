// Fase 14 · paso 5: responsive real en 390, 430, 768, 1024, 1280, 1440 y 1920 px (Chromium).
const { chromium } = require('playwright'); const path = require('path'); const http = require('http'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let BASE = ''; let passed = 0, failed = 0;
function assert(c, m) { if (!c) throw new Error(m); }
async function test(name, fn, browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 900 } }); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  try { await page.goto(BASE + '?editor=1'); await page.waitForSelector('#lesson-title'); await fn(page, width); assert(errors.length === 0, 'errores de consola: ' + errors.join(' | ')); console.log('PASS', name); passed++; }
  catch (e) { console.log('FAIL', name, '\n     ', e.message.split('\n')[0]); failed++; }
  await ctx.close();
}
const noOverflow = async (page, where) => { const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw: window.innerWidth })); assert(m.sw <= m.iw && m.bw <= m.iw, `overflow horizontal en ${where}: ${JSON.stringify(m)}`); };
const tools = ['dashboard-btn', 'review-btn', 'lab-btn', 'courses-btn', 'assessment-btn', 'content-btn'];
async function openTools(page, w) { if (w <= 620) { await page.click('#tools-toggle'); assert(await page.locator('#nav-tools').isVisible(), 'el menú abre las herramientas'); } }
async function skipWarning(page) { await page.waitForTimeout(80); if (await page.locator('#warning-modal').isVisible()) await page.click('#warning-confirm'); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); BASE = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  for (const w of [390, 430, 768, 1024, 1280, 1440, 1920]) {
    await test(`${w}px · cabecera usable y sin overflow en todas las vistas`, async (page, w) => {
      await noOverflow(page, 'Módulo 0');
      // botones principales accesibles y con tamaño táctil
      for (const id of ['prev-btn', 'next-btn']) { const b = await page.locator('#' + id).boundingBox(); assert(b && b.x >= 0 && b.x + b.width <= w + 0.5 && b.height >= 38, `${id} dentro de pantalla y táctil: ${JSON.stringify(b)}`); }
      if (w <= 620) { assert(await page.locator('#tools-toggle').isVisible() && await page.locator('#nav-tools').isHidden(), 'móvil: herramientas tras el menú'); assert(await page.locator('#tools-toggle').getAttribute('aria-expanded') === 'false', 'aria-expanded cerrado'); }
      else assert(await page.locator('#tools-toggle').isHidden(), 'sin menú en pantallas medianas y grandes');
      await openTools(page, w);
      for (const id of tools) { const loc = page.locator('#' + id); if (!(await loc.isVisible())) continue; const b = await loc.boundingBox(); assert(b.x >= -0.5 && b.x + b.width <= w + 0.5 && b.height >= 36, `${id} visible y accesible: ${JSON.stringify(b)}`); }
      await noOverflow(page, 'cabecera abierta');
      // recorre cada vista
      for (const [btn, panel] of [['dashboard-btn', 'dashboard-panel'], ['review-btn', 'review-panel'], ['lab-btn', 'case-lab'], ['assessment-btn', 'final-assessment-panel'], ['courses-btn', 'courses-panel'], ['content-btn', 'content-panel']]) {
        if (w <= 620 && !(await page.locator('#nav-tools').isVisible())) await page.click('#tools-toggle');
        await page.click('#' + btn); assert(await page.locator('#' + panel).isVisible(), `abre ${panel}`);
        await noOverflow(page, panel);
        const box = await page.locator('#' + panel).boundingBox(); assert(box.x >= -0.5 && box.x + box.width <= w + 0.5, `${panel} dentro de pantalla: ${JSON.stringify(box)}`);
        if (w <= 620) assert(await page.locator('#nav-tools').isHidden(), 'abrir una vista cierra el menú');
        if (w <= 620) await page.click('#tools-toggle'); await page.click('#' + btn); // cerrar vista
      }
    }, browser, w);

    await test(`${w}px · lección: ancho de lectura, tablas con scroll interno y video 16:9`, async (page, w) => {
      await page.click('#next-btn'); await skipWarning(page); await page.waitForTimeout(150);
      await noOverflow(page, 'Lección 1');
      const m = await page.evaluate(() => {
        const lesson = document.querySelector('.lesson.active'); const p = [...lesson.querySelectorAll(':scope > p')].find(x => x.getBoundingClientRect().width > 100);
        const v = lesson.querySelector('.lesson-video-frame'); const tables = [...lesson.querySelectorAll('table')].map(t => ({ w: Math.round(t.getBoundingClientRect().width), sw: t.scrollWidth, cw: t.clientWidth, ox: getComputedStyle(t).overflowX }));
        const vr = v.getBoundingClientRect(), pr = p.getBoundingClientRect();
        return { p: Math.round(pr.width), v: Math.round(vr.width), vh: Math.round(vr.height), ratio: vr.width / vr.height, tables, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) };
      });
      assert(m.p <= 46 * m.rem + 2, `texto no excede el ancho de lectura: ${m.p}`); assert(m.p >= Math.min(w - 60, 560), `texto aprovecha el espacio: ${m.p}`);
      assert(Math.abs(m.ratio - 16 / 9) < 0.03, `video 16:9: ${m.ratio}`); assert(m.v <= w - 20 || w >= 1024, `video dentro de pantalla: ${m.v}`);
      if (w >= 1024) assert(m.v > m.p, `en pantalla ancha el video es más ancho que el texto: ${m.v} vs ${m.p}`);
      if (w >= 1920) assert(m.v <= 62 * m.rem + 2, `video con máximo razonable: ${m.v}`);
      m.tables.forEach(t => assert(t.ox === 'auto' || t.sw <= t.cw + 1, 'tabla con scroll interno: ' + JSON.stringify(t)));
    }, browser, w);

    await test(`${w}px · panel analítico usa el ancho amplio y los casos/ejercicios no desbordan`, async (page, w) => {
      const press = async id => { if (w <= 620 && !(await page.locator('#nav-tools').isVisible())) await page.click('#tools-toggle'); await page.click('#' + id); };
      await press('dashboard-btn');
      const dw = await page.locator('#dashboard-panel').evaluate(e => Math.round(e.getBoundingClientRect().width));
      if (w >= 1440) assert(dw > 46 * 16 + 150, `el dashboard es más ancho que una columna de lectura: ${dw}`);
      await noOverflow(page, 'dashboard'); await press('dashboard-btn');
      await press('lab-btn'); await page.waitForSelector('.case-card'); await noOverflow(page, 'casos');
      const wide = await page.evaluate(() => [...document.querySelectorAll('#case-lab *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.case-data')).length);
      assert(wide === 0, 'casos sin elementos fuera de pantalla: ' + wide);
    }, browser, w);
  }

  await test('1280px+ · la ruta del curso es navegación lateral (solo hacia atrás) y <1200px no se muestra', async (page, w) => {
    assert(await page.locator('#course-outline').isVisible(), 'ruta visible');
    assert(await page.locator('[data-outline-lesson="l0"][aria-current="step"]').count() === 1, 'lección actual marcada');
    assert(await page.locator('button[data-outline-lesson="l1"]').count() === 0, 'lecciones futuras no son botones (el avance pasa por Siguiente)');
    await page.click('#next-btn'); await skipWarning(page);
    assert(await page.locator('button[data-outline-lesson="l1"][aria-current="step"]').count() === 1, 'ahora l1 es la actual');
    await page.click('button[data-outline-lesson="l0"]'); assert((await page.locator('#lesson-title').innerText()).includes('Módulo 0'), 'volver a una lección anterior desde la ruta');
    await page.click('#courses-btn'); await page.click('button[data-open-course="curso-demo"]');
    assert((await page.locator('#course-outline').innerText()).includes('Curso Demo') && !(await page.locator('#course-outline').innerText()).includes('Lección 1'), 'la ruta sigue al curso activo');
  }, browser, 1280);
  await test('1024px · sin ruta lateral', async page => { assert(await page.locator('#course-outline').isHidden(), 'oculta'); }, browser, 1024);

  await test('390px · modal de aviso usable', async page => {
    await page.click('#next-btn'); await skipWarning(page); await page.click('#next-btn'); await page.waitForTimeout(100);
    assert(await page.locator('#warning-modal').isVisible(), 'aparece el aviso');
    const b = await page.locator('.modal-box').boundingBox(); assert(b.x >= 0 && b.x + b.width <= 390 && b.y >= 0 && b.y + b.height <= 800, 'modal dentro de pantalla: ' + JSON.stringify(b));
    for (const id of ['warning-confirm', 'warning-cancel']) { const bb = await page.locator('#' + id).boundingBox(); assert(bb.height >= 36 && bb.x + bb.width <= 390, id + ' tocable'); }
    await noOverflow(page, 'modal');
  }, browser, 390);

  await test('Demo en 390px: ejercicios legibles y utilizables', async page => {
    await page.click('#tools-toggle'); await page.click('#courses-btn'); await page.click('[data-open-course="curso-demo"]');
    await page.fill('#demo-e1-dia', '800'); await page.click('[data-exercise-block="demo-e1"] button.action-btn'); await noOverflow(page, 'Demo');
    const b = await page.locator('#demo-e1-dia').boundingBox(); assert(b.width >= 120 && b.x + b.width <= 390, 'input usable: ' + JSON.stringify(b));
  }, browser, 390);

  await browser.close(); server.close(); console.log(`\n${passed}/${passed + failed} pruebas responsive PASS`); process.exit(failed ? 1 : 0);
})();
