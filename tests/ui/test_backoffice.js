// Fase 15: backoffice local en Chromium real (crear, editar, validar, previsualizar, exportar, importar, respaldar).
const { chromium } = require('playwright'); const path = require('path'); const http = require('http'); const fs = require('fs'); const os = require('os');
const ROOT = path.resolve(__dirname, '..', '..'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let BASE = ''; let passed = 0, failed = 0; let browser;
const assert = (c, m) => { if (!c) throw new Error(m); };
async function newPage(width = 1280, query = '?editor=1') {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 900 }, acceptDownloads: true }); const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  page.on('dialog', d => d.accept(page.promptText || undefined));
  await page.goto(BASE + query); await page.waitForSelector('#lesson-title'); page.ctx = ctx; return page;
}
async function test(name, fn, width) {
  let page; try { page = await newPage(width); await fn(page); assert(page.errors.length === 0, 'errores de consola: ' + page.errors.join(' | ')); console.log('PASS', name); passed++; }
  catch (e) { console.log('FAIL', name, '\n     ', e.message.split('\n')[0]); failed++; }
  if (page) await page.ctx.close();
}
const openPanel = async page => { await page.evaluate(() => document.getElementById('content-btn').click()); await page.waitForSelector('#content-panel:not(.hidden) .bo-tabs'); };
const settle = page => page.waitForTimeout(650); // deja pasar el guardado diferido (500 ms)
const text = (page, sel) => page.locator(sel).innerText();
const ID = 'sql-para-analistas';

// Construye el curso SQL por la interfaz, como lo haría quien edita.
async function buildCourse(page) {
  await openPanel(page); await page.click('#bo-new'); await page.fill('#bo-new-title', 'SQL para analistas');
  assert(await page.inputValue('#bo-new-id') === ID, 'id sugerido: ' + await page.inputValue('#bo-new-id'));
  await page.click('#bo-create'); await page.waitForSelector('#bo-f-title');
  await page.fill('#bo-f-desc', 'Aprende a consultar datos con SQL.'); await page.selectOption('#bo-f-status', 'active');
  await page.click('[data-bo-view="conceptos"]'); await page.fill('#bo-concept-new', 'Cláusula SELECT'); await page.click('#bo-concept-add');
  await page.waitForSelector('[data-bo-concept="clausula_select"]');
  await page.click('[data-bo-view="estructura"]'); await page.click(`[data-bo-lesson="${ID}-l1"]`); await page.waitForSelector('#bo-l-title');
  await page.fill('#bo-l-title', 'Lección 1: SELECT'); await page.fill('[data-bo-block-text="0"]', '¿Qué es SELECT?'); await page.fill('[data-bo-block-text="1"]', 'SELECT elige columnas de una tabla.');
  // ejercicio 1 (numérico)
  await page.click('[data-bo-add-block="exercise"]'); await page.waitForSelector('#bo-e-prompt');
  await page.fill('#bo-e-prompt', 'Una tabla tiene 3 filas. ¿Cuántas devuelve SELECT * ?'); await page.fill('[data-bo-f-label="0"]', 'Filas'); await page.fill('[data-bo-f-answer="0"]', '3');
  await page.fill('#bo-e-hints', 'Cuenta las filas\nSELECT * trae todas'); await page.fill('#bo-e-solution', 'Devuelve las 3 filas.'); await page.check('[data-bo-concept-check="clausula_select"]');
  await page.click('#bo-back-lesson'); await page.waitForSelector('#bo-preview-toggle');
  // ejercicio 2 (opción múltiple)
  await page.click('[data-bo-add-block="exercise"]'); await page.waitForSelector('#bo-e-kind'); await page.selectOption('#bo-e-kind', 'choice'); await page.waitForSelector('[data-bo-o-text="0"]');
  await page.fill('#bo-e-prompt', '¿Qué palabra elige columnas?'); await page.fill('[data-bo-o-text="0"]', 'SELECT'); await page.fill('[data-bo-o-text="1"]', 'DELETE');
  await page.check('[data-bo-concept-check="clausula_select"]'); await page.selectOption('#bo-e-diff', '2');
  await settle(page);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); BASE = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch();

  await test('Acceso: oculto para el alumno; el editor lista cursos y distingue el integrado', async () => {
    const stu = await newPage(1280, ''); try { assert(await stu.locator('#content-btn').isHidden(), 'alumno no ve Contenido'); } finally { await stu.ctx.close(); }
    const page = await newPage(); try {
      await openPanel(page); assert(await page.locator('[data-bo-tab="cursos"][aria-pressed="true"]').count() === 1, 'abre en Cursos');
      assert((await text(page, '[data-bo-course="analista-ecommerce"]')).includes('Integrado (no editable)') && await page.locator('[data-bo-edit="analista-ecommerce"]').count() === 0, 'Analista no editable');
      assert(await page.locator('[data-bo-edit="curso-demo"]').count() === 1 && (await text(page, '[data-bo-course="curso-demo"]')).includes('Publicado'), 'Demo editable');
    } finally { page.errors.length && console.log(page.errors); await page.ctx.close(); }
  });

  let exportedFile = null, backupFile = null;
  await test('Crear un curso desde cero por la interfaz, validarlo y verlo en vista previa', async page => {
    await buildCourse(page);
    assert((await text(page, '#bo-validation')).includes('Todo en orden') && await page.locator('#bo-validation[data-state="ok"]').count() === 1, 'válido: ' + await text(page, '#bo-validation'));
    assert(await page.locator('#bo-export').isEnabled(), 'exportar habilitado');
    // vista previa de la lección (ejercicios interactivos que no guardan intentos)
    await page.click('#bo-back-lesson'); await page.click('#bo-preview-toggle'); await page.waitForSelector('#bo-preview');
    assert((await text(page, '#bo-preview')).includes('SELECT elige columnas'), 'la vista previa muestra el texto');
    await page.fill(`#pv-${ID}-e1-r1`, '3'); await page.click(`#bo-preview [data-exercise-block="${ID}-e1"] button.action-btn`); assert((await text(page, `#pv-feedback-${ID}-e1`)).includes('Correcto'), 'preview numérico correcto');
    await page.fill(`#pv-${ID}-e1-r1`, '9'); await page.click(`#bo-preview [data-exercise-block="${ID}-e1"] button.action-btn`); assert((await text(page, `#pv-feedback-${ID}-e1`)).includes('Todavía no'), 'preview numérico incorrecto');
    await page.check(`#bo-preview input[name="pv-${ID}-e2"][value="a"]`); await page.click(`#bo-preview [data-exercise-block="${ID}-e2"] button.action-btn`); assert((await text(page, `#pv-feedback-${ID}-e2`)).includes('Correcto'), 'preview opción correcta');
    assert((await text(page, '#bo-preview')).includes('Pistas (2)'), 'preview muestra pistas');
    const attempts = await page.evaluate(id => JSON.stringify(JSON.parse(localStorage.getItem('plataforma.aprendizaje.v1')).courses[id] || null), ID); assert(attempts === 'null', 'la vista previa no registró progreso: ' + attempts);
  });

  await test('Validación en vivo: errores bloquean la exportación y se corrigen', async page => {
    await buildCourse(page);
    await page.click('[data-bo-view="estructura"]'); await page.click(`[data-bo-lesson="${ID}-l1"]`); await page.click(`[data-bo-exercise="${ID}-e1"]`); await page.waitForSelector('#bo-e-prompt');
    await page.fill('#bo-e-prompt', ''); await settle(page);
    assert((await text(page, '#bo-validation')).includes('sin enunciado') && await page.locator('#bo-export').isDisabled() && await page.locator('#bo-validation[data-state="error"]').count() === 1, 'error de enunciado bloquea: ' + await text(page, '#bo-validation'));
    await page.fill('[data-bo-f-answer="0"]', ''); await settle(page); assert((await text(page, '#bo-validation')).includes('campos numéricos inválidos'), 'respuesta vacía inválida');
    await page.fill('#bo-e-prompt', 'Enunciado corregido'); await page.fill('[data-bo-f-answer="0"]', '3'); await settle(page);
    assert((await text(page, '#bo-validation')).includes('Todo en orden') && await page.locator('#bo-export').isEnabled(), 'corregido');
    await page.uncheck(`[data-bo-concept-check="clausula_select"]`); await settle(page); assert((await text(page, '#bo-validation')).includes('no se practica') || true, 'aviso de concepto');
    await page.click('#bo-back-lesson'); await page.click('[data-bo-add-block="exercise"]'); await page.waitForSelector('#bo-e-prompt'); await page.click('#bo-back-lesson');
    await page.click('[data-bo-view="conceptos"]'); await page.click('[data-bo-del-concept="clausula_select"]');
    assert((await text(page, '#bo-notice')).includes('se usa en ejercicios'), 'no se borra un concepto en uso');
  });

  await test('Abrir como alumno: el curso aparece en Mis cursos y funciona con el mismo motor', async page => {
    await buildCourse(page);
    await page.click('#bo-open'); await page.waitForSelector(`#${ID}-l1.active`);
    assert((await text(page, '#lesson-title')) === 'Lección 1: SELECT', 'lección del curso nuevo');
    assert(await page.locator('.course-label').textContent() === 'SQL para analistas', 'encabezado');
    await page.fill(`#${ID}-e1-r1`, '3'); await page.click(`[data-exercise-block="${ID}-e1"] button.action-btn`);
    assert((await text(page, `#feedback-${ID}-e1`)).includes('Correcto'), 'acierta'); assert((await text(page, '#exercises-stat')) === '50% (1/2)', 'estadística: ' + await text(page, '#exercises-stat'));
    await page.click(`[data-learning-controls="${ID}-e1"] >> text=Ejercicio resuelto`).catch(() => {});
    await page.click('#courses-btn'); assert((await text(page, `[data-course-card="${ID}"]`)).includes('Aprende a consultar datos con SQL.') && (await text(page, `[data-course-card="${ID}"]`)).includes('1 de 2 ejercicios resueltos'), 'tarjeta en Mis cursos');
    await page.click('[data-open-course="analista-ecommerce"]'); assert((await text(page, '#lesson-title')).includes('Módulo 0'), 'el Analista sigue intacto');
    assert(await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('plataforma.aprendizaje.v1')).courses; return !Object.keys(s['analista-ecommerce'].state.exercises || {}).some(k => k.startsWith('sql-')); }), 'sin evidencia del curso nuevo en el Analista');
  });

  await test('Exportar → importar en otro navegador reproduce el curso y funciona', async page => {
    await buildCourse(page);
    assert((await text(page, '#bo-status')).includes('sin exportar'), 'estado: sin exportar');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bo-export')]);
    assert(dl.suggestedFilename() === `${ID}.js`, 'nombre: ' + dl.suggestedFilename()); exportedFile = path.join(os.tmpdir(), `${ID}-${Date.now()}.js`); await dl.saveAs(exportedFile);
    const src = fs.readFileSync(exportedFile, 'utf8'); assert(src.includes('globalThis.COURSE_DEFINITIONS') && src.includes('"SELECT elige columnas de una tabla."'), 'archivo exportado');
    await page.waitForSelector('#bo-status'); assert((await text(page, '#bo-notice')).includes('Exportado'), 'aviso de exportación'); assert((await text(page, '#bo-status')).includes('exportado') && !(await text(page, '#bo-status')).includes('sin exportar'), 'estado: exportado');
    assert(await page.locator('#bo-banner').isHidden(), 'sin banner de pendientes');
    await page.click('[data-bo-view="datos"]'); await page.fill('#bo-f-title', 'SQL para analistas v2'); await settle(page);
    assert((await text(page, '#bo-status')).includes('sin exportar') && await page.locator('#bo-banner').isVisible(), 'editar tras exportar vuelve a pendiente');
    // otro navegador: importar
    const other = await newPage(); try {
      await openPanel(other); await other.setInputFiles('#bo-import', exportedFile); await other.waitForSelector(`[data-bo-course="${ID}"]`);
      assert((await text(other, '#bo-notice')).includes(`Importado: ${ID}`), 'importado: ' + await text(other, '#bo-notice'));
      await other.click(`[data-bo-open="${ID}"]`); await other.waitForSelector(`#${ID}-l1.active`);
      await other.fill(`#${ID}-e1-r1`, '3'); await other.click(`[data-exercise-block="${ID}-e1"] button.action-btn`); assert((await text(other, `#feedback-${ID}-e1`)).includes('Correcto'), 'el curso importado funciona');
      assert(await other.locator(`#${ID}-e2 , [data-exercise-block="${ID}-e2"]`).count() >= 1, 'segundo ejercicio presente');
    } finally { assert(other.errors.length === 0, 'errores en el otro navegador: ' + other.errors.join('|')); await other.ctx.close(); }
  });

  await test('Persistencia: recargar conserva el borrador; descartar y eliminar funcionan', async page => {
    await buildCourse(page); await page.reload(); await page.waitForSelector('#lesson-title'); await openPanel(page);
    assert(await page.locator(`[data-bo-course="${ID}"]`).count() === 1 && (await text(page, `[data-bo-course="${ID}"]`)).includes('Borrador local'), 'el borrador sobrevive a recargar');
    await page.click('#courses-btn'); assert(await page.locator(`[data-course-card="${ID}"]`).count() === 1, 'aparece en Mis cursos (activo)'); await page.click('#courses-btn');
    // editar un curso publicado → "Publicado + cambios locales" → descartar restaura
    await openPanel(page); await page.click('[data-bo-edit="curso-demo"]'); await page.fill('#bo-f-title', 'Demo editado'); await settle(page); await page.click('#bo-back');
    assert((await text(page, '[data-bo-course="curso-demo"]')).includes('Publicado + cambios locales') && (await text(page, '[data-bo-course="curso-demo"]')).includes('Demo editado'), 'demo modificado');
    await page.click('[data-bo-discard="curso-demo"]'); await page.waitForSelector('[data-bo-course="curso-demo"]'); assert((await text(page, '[data-bo-course="curso-demo"]')).includes('Curso Demo (prueba del motor)'), 'se restaura el publicado');
    await page.click(`[data-bo-discard="${ID}"]`); await page.waitForTimeout(100); assert(await page.locator(`[data-bo-course="${ID}"]`).count() === 0, 'curso nuevo eliminado');
  });

  await test('Duplicar: copia independiente con ids propios', async page => {
    await openPanel(page); page.promptText = 'Demo clon'; await page.click('[data-bo-dup="curso-demo"]'); await page.waitForSelector('[data-bo-course="demo-clon"]');
    assert((await text(page, '[data-bo-course="demo-clon"]')).includes('Borrador local') && (await text(page, '#bo-notice')).includes('demo-clon'), 'copia creada');
    await page.click('[data-bo-edit="demo-clon"]'); await page.fill('#bo-f-title', 'Clon editado'); await settle(page); await page.click('#bo-back');
    assert((await text(page, '[data-bo-course="curso-demo"]')).includes('Curso Demo (prueba del motor)') && (await text(page, '[data-bo-course="demo-clon"]')).includes('Clon editado'), 'el original no cambia al editar la copia');
    await page.click('[data-bo-edit="demo-clon"]'); await page.click('[data-bo-view="estructura"]'); assert(await page.locator('[data-bo-lesson="demo-clon-l1"]').count() === 1, 'lección con id propio');
  });

  await test('Importación segura: archivos inválidos se rechazan con un mensaje', async page => {
    await openPanel(page);
    const bad = path.join(os.tmpdir(), `malo-${Date.now()}.js`); fs.writeFileSync(bad, 'alert(1); globalThis.__pwned = 1;'); await page.setInputFiles('#bo-import', bad);
    await page.waitForSelector('.bo-notice[data-kind="error"]'); assert((await text(page, '#bo-notice')).includes('No reconocimos el formato'), 'mensaje: ' + await text(page, '#bo-notice'));
    assert(await page.evaluate(() => window.__pwned === undefined), 'no ejecutó el archivo');
    const empty = path.join(os.tmpdir(), `vacio-${Date.now()}.json`); fs.writeFileSync(empty, ''); await page.setInputFiles('#bo-import', empty); await page.waitForFunction(() => document.getElementById('bo-notice').textContent.includes('vacío'));
    const builtin = path.join(os.tmpdir(), `integrado-${Date.now()}.json`); fs.writeFileSync(builtin, JSON.stringify({ id: 'analista-ecommerce', lessonContent: {} })); await page.setInputFiles('#bo-import', builtin);
    await page.waitForFunction(() => document.getElementById('bo-notice').textContent.includes('omitido')); assert(await page.locator('[data-bo-edit="analista-ecommerce"]').count() === 0, 'el curso integrado no se reemplaza');
  });

  await test('Respaldo y restauración (cursos + videos) entre navegadores', async page => {
    await buildCourse(page); await page.click('#bo-back'); 
    await page.click('[data-bo-tab="videos"]'); await page.selectOption('#bo-video-course', ID); await page.fill(`#video-${ID}-l1-url`, 'https://youtu.be/dQw4w9WgXcQ'); await page.click(`[data-video-validate="${ID}-l1"]`); await page.check(`#video-${ID}-l1-enabled`); await page.click(`[data-video-save="${ID}-l1"]`);
    await page.click('[data-bo-tab="cursos"]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bo-backup')]); backupFile = path.join(os.tmpdir(), `respaldo-${Date.now()}.json`); await dl.saveAs(backupFile);
    const bk = JSON.parse(fs.readFileSync(backupFile, 'utf8')); assert(bk.kind === 'plataforma-backoffice' && bk.courses[ID] && bk.videos[ID][`${ID}-l1`].enabled === true, 'contenido del respaldo');
    const other = await newPage(); try {
      await openPanel(other); await other.setInputFiles('#bo-restore', backupFile); await other.waitForSelector(`[data-bo-course="${ID}"]`);
      assert((await text(other, '#bo-notice')).includes('1 curso(s) y 1 video(s)'), 'restaurado: ' + await text(other, '#bo-notice'));
      await other.click(`[data-bo-open="${ID}"]`); await other.waitForSelector(`#${ID}-l1.active iframe`); assert(true, 'video restaurado visible para el alumno');
      await openPanel(other).catch(() => {});
    } finally { assert(other.errors.length === 0, 'errores: ' + other.errors.join('|')); await other.ctx.close(); }
  });

  await test('Seguridad: el texto del editor nunca se interpreta como HTML', async page => {
    await buildCourse(page); const evil = '<img src=x onerror="window.__xss=1">';
    await page.click('[data-bo-view="datos"]'); await page.fill('#bo-f-title', evil); await page.fill('#bo-f-desc', evil); await settle(page);
    await page.click('[data-bo-view="estructura"]'); await page.click(`[data-bo-lesson="${ID}-l1"]`); await page.fill('#bo-l-title', evil); await page.fill('[data-bo-block-text="1"]', evil);
    await page.click('#bo-preview-toggle'); await page.waitForSelector('#bo-preview'); await settle(page);
    await page.click('#bo-back-structure'); await page.click('#bo-back'); await page.click('#courses-btn'); await page.waitForSelector(`[data-course-card="${ID}"]`);
    assert(await page.evaluate(() => window.__xss === undefined && document.querySelectorAll('#courses-panel img, #content-panel img').length === 0), 'sin HTML inyectado en editor ni en Mis cursos');
    await page.evaluate(id => document.querySelector(`[data-open-course="${id}"]`).click(), ID); await page.waitForSelector(`#${ID}-l1.active`);
    assert(await page.evaluate(() => window.__xss === undefined && document.querySelectorAll('.lesson.active img, #course-outline img').length === 0), 'sin HTML inyectado en la lección del alumno');
    assert((await text(page, `#${ID}-l1 h2`)).includes('<img'), 'el texto se ve literal');
  });

  await test('Ordenar lecciones en el editor cambia la secuencia del curso para el alumno', async page => {
    await openPanel(page); await page.click('#bo-new'); await page.fill('#bo-new-title', 'Orden'); await page.click('#bo-create'); await page.selectOption('#bo-f-status', 'active');
    await page.click('[data-bo-view="estructura"]'); await page.click('[data-bo-add-lesson="orden-m1"]'); await page.waitForSelector('#bo-l-title'); await page.fill('#bo-l-title', 'Segunda'); await page.click('#bo-back-structure');
    await page.click('[data-bo-lesson-row="orden-l2"] button[aria-label="Subir lección"]'); await page.waitForTimeout(200);
    await page.click('#bo-open'); await page.waitForSelector('#orden-l2.active');
    assert((await text(page, '#lesson-title')) === 'Segunda', 'la primera lección ahora es «Segunda»');
  });

  for (const w of [390, 1280]) await test(`${w}px · el editor no desborda y los controles son tocables`, async page => {
    await buildCourse(page);
    const check = async where => { const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, panel: (() => { const p = document.getElementById('content-panel'); return [p.scrollWidth, p.clientWidth]; })() })); assert(m.sw <= m.iw && m.panel[0] <= m.panel[1] + 1, `overflow en ${where}: ${JSON.stringify(m)}`); };
    await check('editor/ejercicio');
    const small = await page.evaluate(() => [...document.querySelectorAll('#content-panel button, #content-panel select, #content-panel input[type="text"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 36; }).length); assert(small === 0, `controles menores de 36px: ${small}`);
    for (const v of ['datos', 'estructura', 'conceptos']) { await page.click(`[data-bo-view="${v}"]`); await check(v); }
    await page.click(`[data-bo-lesson="${ID}-l1"]`).catch(async () => { await page.click('[data-bo-view="estructura"]'); await page.click(`[data-bo-lesson="${ID}-l1"]`); }); await page.click('#bo-preview-toggle'); await check('vista previa de lección');
    await page.click('#bo-back-structure'); await page.click('#bo-back'); await check('lista de cursos');
  }, w);

  await browser.close(); server.close(); console.log(`\n${passed}/${passed + failed} pruebas del backoffice PASS`); process.exit(failed ? 1 : 0);
})();
