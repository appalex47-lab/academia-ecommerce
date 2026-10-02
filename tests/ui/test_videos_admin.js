// Fase 14 · paso 3: administrador de videos y fallback, en Chromium real.
const { chromium } = require('playwright'); const path = require('path'); const http = require('http'); const fs = require('fs');
// Servidor local: sirve la app por http (como en producción). /videos/espera.* nunca responde (carga pendiente); el resto de /videos/ da 404.
const ROOT = path.resolve(__dirname, '..', '..'); const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/videos/espera')) return; // sin respuesta
  const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) || p.startsWith('/videos/') || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let URL_BASE = '';
const ID = 'dQw4w9WgXcQ'; let passed = 0, failed = 0;
function assert(c, m) { if (!c) throw new Error(m); }
async function test(name, fn, browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  try { await fn(page, ctx); assert(errors.length === 0, 'errores de consola: ' + errors.join(' | ')); console.log('PASS', name); passed++; }
  catch (e) { console.log('FAIL', name, '\n     ', e.message.split('\n')[0]); failed++; }
  await ctx.close();
}
const open = async (page, q = '?editor=1') => { await page.goto(URL_BASE + q); await page.waitForSelector('#lesson-title'); };
const openAdmin = async page => { await page.click('#content-btn'); await page.click('[data-bo-tab="videos"]'); await page.waitForSelector('#content-panel:not(.hidden) .video-admin-row'); };
const row = (page, id) => page.locator(`[data-video-row="${id}"]`);

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); URL_BASE = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  await test('Alumno: sin ?editor=1 no ve el botón Contenido', async page => {
    await open(page, ''); assert(await page.locator('#content-btn').isHidden(), 'el botón debe estar oculto');
  }, browser);

  await test('Editor: ?editor=1 muestra Contenido y lista Módulo 0, lecciones y cierre', async page => {
    await open(page); assert(await page.locator('#content-btn').isVisible(), 'botón visible'); await openAdmin(page);
    assert(await page.locator('.video-admin-row').count() === 10, 'diez secciones');
    const first = await row(page, 'l0').innerText(); assert(first.includes('Sin configurar'), 'estado Sin configurar: ' + first);
    assert((await page.locator('#video-l0-msg').innerText()) === 'Esta sección todavía no tiene video.', 'mensaje sin configurar');
    assert(await page.locator('#content-btn').innerText() === 'Volver al curso', 'el botón vuelve al curso');
    await page.click('#content-btn'); assert(await page.locator('#content-panel').isHidden(), 'cierra el panel');
  }, browser);

  await test('Validar: URL inválida y peligrosa muestran el mensaje y no permiten guardar', async page => {
    await open(page); await openAdmin(page);
    for (const bad of ['javascript:alert(1)', 'https://example.com/pagina', 'texto cualquiera']) {
      await page.fill('#video-l1-url', bad); await page.click('[data-video-validate="l1"]');
      assert((await page.locator('#video-l1-msg').innerText()) === 'No pudimos reconocer esta URL como un video compatible.', 'inválida: ' + bad);
      assert(await page.locator('[data-video-save="l1"]').isDisabled(), 'guardar deshabilitado: ' + bad);
      assert(await page.locator('#video-l1 iframe, [data-video-row="l1"] iframe, [data-video-row="l1"] video').count() === 0, 'sin vista previa');
    }
  }, browser);

  await test('YouTube: validar → vista previa nocookie → confirmar → el alumno lo ve en la lección', async page => {
    await open(page); await openAdmin(page);
    await page.fill('#video-l1-title', 'Mi video <img src=x onerror=alert(1)>'); await page.fill('#video-l1-url', 'https://youtu.be/' + ID);
    assert(await page.locator('[data-video-save="l1"]').isDisabled(), 'no se puede guardar sin validar');
    await page.click('[data-video-validate="l1"]');
    const src = await page.locator('[data-video-row="l1"] iframe').getAttribute('src');
    assert(src.startsWith('https://www.youtube-nocookie.com/embed/' + ID), 'embed seguro: ' + src);
    assert((await page.locator('#video-l1-msg').innerText()).startsWith('Video listo para usar'), 'estado válido');
    await page.fill('#video-l1-url', 'https://youtu.be/' + ID + '?t=1');
    assert(await page.locator('[data-video-save="l1"]').isDisabled(), 'editar la URL exige validar de nuevo');
    await page.click('[data-video-validate="l1"]'); await page.check('#video-l1-enabled'); await page.click('[data-video-save="l1"]');
    assert((await page.locator('#video-admin-notice').innerText()).startsWith('Guardado'), 'aviso de guardado');
    assert((await row(page, 'l1').innerText()).includes('Activo · borrador local'), 'badge activo');
    assert(await page.locator('#l1 .lesson-video iframe').count() === 1, 'la lección ya muestra el video');
    assert(await page.evaluate(() => document.querySelectorAll('#content-panel img').length) === 0, 'el título nunca se interpreta como HTML');
    const cap = await page.locator('#l1 .lesson-video figcaption').innerText(); assert(cap.includes('Mi video') && !cap.includes('<'), 'el título se guarda limpio y se muestra como texto: ' + cap);
    assert(await page.locator('#l1 .lesson-video img').count() === 0, 'sin elementos inyectados en la lección');
  }, browser);

  await test('Persistencia: la configuración sobrevive a recargar y al reiniciar el progreso', async page => {
    await open(page); await openAdmin(page);
    await page.fill('#video-l2-url', 'https://www.youtube.com/watch?v=' + ID); await page.click('[data-video-validate="l2"]'); await page.check('#video-l2-enabled'); await page.click('[data-video-save="l2"]');
    await page.reload(); await page.waitForSelector('#lesson-title');
    assert(await page.locator('#l2 .lesson-video iframe').count() === 1, 'persiste tras recargar');
    await page.evaluate(() => __fase11.resetLearningProgress && __fase11.resetLearningProgress());
    assert(await page.locator('#l2 .lesson-video iframe').count() === 1, 'reiniciar progreso no borra videos');
  }, browser);

  await test('Archivo MP4: si no carga → "No disponible" y no se puede guardar; si carga → válido', async page => {
    await open(page); await openAdmin(page);
    await page.fill('#video-l3-url', 'videos/no-existe.mp4'); await page.click('[data-video-validate="l3"]');
    await page.waitForSelector('[data-video-row="l3"] .lesson-video-error', { timeout: 8000 }); // 404 real
    assert((await page.locator('#video-l3-msg').innerText()) === 'La URL tiene un formato válido, pero el recurso no pudo cargarse.', 'mensaje no disponible');
    assert(await page.locator('[data-video-save="l3"]').isDisabled(), 'no se guarda un recurso que no carga');
    await page.fill('#video-l3-url', 'videos/espera.webm'); // petición pendiente: ningún error real compite con el evento simulado
     await page.click('[data-video-validate="l3"]');
    await page.evaluate(() => { const v = document.querySelector('[data-video-row="l3"] video'); v.dispatchEvent(new Event('loadedmetadata')); });
    assert((await page.locator('#video-l3-msg').innerText()) === 'Video listo para usar', 'cargó: válido');
    assert(await page.locator('[data-video-save="l3"]').isEnabled(), 'ahora sí se puede guardar');
  }, browser);

  await test('Fallback para el alumno: video guardado que falla no rompe la lección', async page => {
    await open(page);
    await page.evaluate(() => { __videos.saveVideoConfig('analista-ecommerce', 'l0', { title: 'Módulo 0', url: 'videos/ok.mp4', enabled: true }); __videos.initLessonVideos(); });
    await page.evaluate(() => { document.querySelector('#l0 .lesson-video video').dispatchEvent(new Event('error')); });
    const txt = await page.locator('#l0 .lesson-video-error').innerText();
    assert(txt.includes('Video no disponible') && txt.includes('Puedes continuar con la lección normalmente') && !/Código|ok\.mp4/.test(txt), 'tarjeta para el alumno: ' + txt);
    assert(await page.locator('#l0 .lesson-video-frame').boundingBox().then(b => b.width > 300), 'tarjeta con tamaño de video');
    assert(await page.locator('#lesson-title').isVisible() && await page.locator('#next-btn').isEnabled(), 'la lección sigue usable');
  }, browser);

  await test('Desactivar y eliminar: el alumno vuelve a ver "Próximamente"', async page => {
    await open(page); await openAdmin(page);
    await page.fill('#video-l5-url', 'https://youtu.be/' + ID); await page.click('[data-video-validate="l5"]'); await page.check('#video-l5-enabled'); await page.click('[data-video-save="l5"]');
    assert(await page.locator('#l5 .lesson-video iframe').count() === 1, 'activo');
    await page.uncheck('#video-l5-enabled');
    assert(await page.locator('#l5 .lesson-video iframe').count() === 0 && (await page.locator('#l5 .lesson-video').innerText()).includes('Próximamente'), 'desactivado = Próximamente');
    assert((await row(page, 'l5').innerText()).includes('Desactivado'), 'badge desactivado');
    await page.click('[data-video-remove="l5"]'); assert((await row(page, 'l5').innerText()).includes('Sin configurar'), 'eliminado');
  }, browser);

  await test('Descargar videos.js: genera un archivo con la configuración', async page => {
    await open(page); await openAdmin(page);
    await page.fill('#video-cierre-url', 'https://youtu.be/' + ID); await page.click('[data-video-validate="cierre"]'); await page.check('#video-cierre-enabled'); await page.click('[data-video-save="cierre"]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#video-download')]);
    assert(dl.suggestedFilename() === 'videos.js', 'nombre: ' + dl.suggestedFilename());
    const txt = require('fs').readFileSync(await dl.path(), 'utf8'); assert(txt.includes('"analista-ecommerce"') && txt.includes('"cierre"') && txt.includes(ID), 'contenido del archivo');
    await page.click('#video-discard'); assert((await row(page, 'cierre').innerText()).includes('Sin configurar'), 'descartar borrador');
  }, browser);

  await test('Móvil 390px: el administrador no genera overflow horizontal propio', async page => {
    await page.setViewportSize({ width: 390, height: 800 }); await open(page);
    await page.evaluate(() => { document.getElementById('content-btn').click(); });
    await page.click('[data-bo-tab="videos"]');
    await page.waitForSelector('#content-panel:not(.hidden) .video-admin-row');
    const w = await page.evaluate(() => ({ panel: document.getElementById('content-panel').scrollWidth, client: document.getElementById('content-panel').clientWidth }));
    assert(w.panel <= w.client + 1, 'el panel no desborda: ' + JSON.stringify(w));
  }, browser);

  await browser.close(); server.close(); console.log(`\n${passed}/${passed + failed} pruebas del administrador de videos PASS`); process.exit(failed ? 1 : 0);
})();
