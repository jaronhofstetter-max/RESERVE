import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root = process.cwd();
const server = http.createServer((request, response) => {
  try {
    const name = new URL(request.url, 'http://localhost').pathname.slice(1);
    if (!name || name.includes('..')) throw Error();
    response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.traineddata') ? 'application/octet-stream' : 'text/html');
    response.end(fs.readFileSync(`${root}/${name}`));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const photo = { name: 'recipe.png', mimeType: 'image/png', buffer: fs.readFileSync('tests/fixtures/rekek-digit-1.png') };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const external = [], posts = [];
  await context.route('**/*', route => {
    const request = route.request();
    if (request.method() !== 'GET') posts.push(request.url());
    if (!request.url().startsWith(origin + '/')) { external.push(request.url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.mockMode = 'success'; window.mockCalls = 0; window.mockStops = 0;
    window.Tesseract = { createWorker: async (language, mode, options) => {
      window.mockOptions = { language, mode, ...options };
      if (window.mockMode === 'loading') await new Promise(resolve => setTimeout(resolve, 200));
      return {
        setParameters: async () => {},
        terminate: async () => { window.mockStops++; },
        recognize: async canvas => {
          if (!(canvas instanceof HTMLCanvasElement)) throw Error('Image was not rasterized locally');
          window.mockCalls++;
          if (window.mockMode === 'slow') return new Promise(() => {});
          if (window.mockMode === 'failure') throw Error('simulated local failure');
          if (window.mockMode === 'empty') return { data: { text: '' } };
          return { data: { text: 'Prüfrezept\nZutaten\n¹/₄ TL Salz\n12.5 g Mehl\nZubereitung\nAlles verrühren.\n<img src=x onerror=alert(1)>' } };
        }
      };
    } };
  });
  await page.goto(origin + '/rekek-test.html');
  assert.equal(await page.locator('#token').count(), 0);
  assert.match(await page.locator('body').innerText(), /Keine kostenpflichtigen API-Aufrufe/);
  assert.equal(await page.locator('#submit').isDisabled(), true);
  await page.locator('#photos').setInputFiles(photo);
  assert.equal(await page.locator('#submit').isEnabled(), true);
  assert.equal(await page.evaluate(() => mockCalls), 0);
  await page.locator('#submit').click(); await page.locator('#results').waitFor({ state: 'visible' });
  assert.ok((await page.locator('.ingredient textarea').evaluateAll(nodes=>nodes.map(n=>n.value))).includes('¹/₄ TL Salz'));
  assert.match(await page.locator('#recipes').innerText(), /0\.25 tl/);
  assert.ok((await page.locator('.ingredient textarea').evaluateAll(nodes=>nodes.map(n=>n.value))).includes('12.5 g Mehl'));
  assert.equal(await page.locator('#recipes .review-editor img').count(), 0);
  assert.equal(await page.locator('#recipes .source-view img').count(), 1);
  assert.match(await page.locator('#raw-text').textContent(), /<img src=x onerror=alert\(1\)>/);
  assert.equal(await page.evaluate(() => mockOptions.language), 'deu');
  assert.equal(await page.evaluate(() => mockOptions.cacheMethod), 'none');
  assert.equal(await page.evaluate(() => mockOptions.langPath), origin + '/assets/rekek/quantity-test/baseline');
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  const event = page.waitForEvent('download'); await page.locator('#download').click();
  const exported = JSON.parse(fs.readFileSync(await (await event).path(), 'utf8'));
  assert.equal(exported.reader, 'tesseract-local-deu'); assert.equal(exported.verified, false);
  assert.match(exported.pages[0].raw, /¹\/₄/); assert.ok(!JSON.stringify(exported).includes('data:image'));
  if (process.env.REKEK_UI_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.REKEK_UI_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.REKEK_UI_SCREENSHOT_DIR}/phone-local.png`, fullPage: true });
  }
  await page.locator('#photos').setInputFiles({ ...photo, name: 'continuation.png' });
  assert.equal(await page.locator('#results').isHidden(), true);
  await page.locator('#submit').click(); await page.locator('#results').waitFor({ state: 'visible' });
  assert.deepEqual(JSON.parse(await page.evaluate(() => JSON.stringify(Array.from(document.querySelectorAll('.recipe .source')).filter(e=>e.textContent.startsWith('Quellseiten')).map(e=>e.textContent)))) , ['Quellseiten: page-1', 'Quellseiten: page-2']);
  await page.locator('#same-recipe').check();
  await page.locator('#submit').click(); await page.locator('#results').waitFor({ state: 'visible' });
  assert.match(await page.locator('#recipes').innerText(), /Quellseiten: page-1, page-2/);
  for (const [mode, expected] of [['failure', /nicht gestartet oder abgeschlossen/]]) {
    await page.evaluate(mode => { mockMode = mode; }, mode);
    const before = await page.evaluate(() => mockCalls);
    await page.locator('#submit').click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.error === 'true' && !document.querySelector('#photos').disabled);
    assert.match(await page.locator('#status').innerText(), expected);
    assert.equal(await page.locator('#results').isHidden(), true);
    await page.waitForTimeout(100); assert.equal(await page.evaluate(() => mockCalls), before + (mode === 'empty' ? 2 : 1));
  }
  await page.evaluate(() => { mockMode = 'empty'; });
  await page.locator('#submit').click(); await page.locator('#results').waitFor({state:'visible'});
  assert.match(await page.locator('#status').innerText(), /Kein Text erkannt/);
  assert.equal(await page.locator('#download-reviewed').isDisabled(), true);
  const emptyDraftCount = await page.locator('.recipe').count();
  await page.getByRole('button', {name:'+ Fehlendes Rezept ergänzen', exact:true}).click();
  assert.equal(await page.locator('.recipe').count(), emptyDraftCount + 1);
  assert.match(await page.locator('.recipe').last().innerText(), /Quellseiten: page-1, page-2/);
  await page.evaluate(() => { mockMode = 'slow'; });
  const beforeSlow = await page.evaluate(() => mockCalls);
  await page.locator('#submit').click(); await page.waitForFunction(before => mockCalls > before, beforeSlow);
  await page.locator('#cancel').click(); await page.waitForFunction(() => !document.querySelector('#photos').disabled);
  assert.match(await page.locator('#status').innerText(), /abgebrochen/);
  await page.evaluate(() => { mockMode = 'loading'; });
  const stops = await page.evaluate(() => mockStops);
  await page.locator('#submit').click(); await page.locator('#cancel').click();
  await page.waitForTimeout(250); assert.ok(await page.evaluate(() => mockStops) > stops);
  await page.locator('#clear').click(); assert.equal(await page.locator('#previews img').count(), 0);
  const before = await page.evaluate(() => mockCalls);
  await page.locator('#photos').setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024 + 1) });
  assert.match(await page.locator('#status').innerText(), /zusammen 6 MiB/);
  await page.locator('#photos').setInputFiles({ name: 'book.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  assert.match(await page.locator('#status').innerText(), /PDFs/); assert.equal(await page.evaluate(() => mockCalls), before);
  await page.locator('#photos').setInputFiles(photo); await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  assert.equal(await page.locator('#previews img').count(), 0); assert.deepEqual(errors, []);
  assert.deepEqual(external, []); assert.deepEqual(posts, []);
  await context.close();
  console.log('Local recipe UI: explicit start, fractions/source preservation, safe text, separate/follow-on pages, cancellation during load/read, errors/no retries, file limits, raw export, empty storage and zero external/POST requests passed with controlled OCR output.');
  if (process.env.REKEK_REAL_OCR === '1') {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const requests = [], external = [], errors = [];
    await context.route('**/*', route => {
      const request = route.request(); requests.push({ url: request.url(), method: request.method() });
      if (!request.url().startsWith(origin + '/')) { external.push(request.url()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/rekek-test.html');
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1100; canvas.height = 900;
      const x = canvas.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 1100, 900); x.fillStyle = 'black'; x.font = '48px Arial';
      ['Suppe', 'Zutaten', '125 g Mehl', '250 ml Wasser', 'Zubereitung', 'Alles gut verruehren.'].forEach((text, index) => x.fillText(text, 70, 100 + index * 110));
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.locator('#photos').setInputFiles({ name: 'synthetic-printed-recipe.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
    await page.locator('#submit').click();
    await page.waitForFunction(() => !document.querySelector('#results').hidden || document.querySelector('#status').dataset.error === 'true', null, { timeout: 190000 });
    assert.equal(await page.locator('#results').isVisible(), true, await page.locator('#status').innerText());
    const raw = await page.locator('#raw-text').textContent(); assert.match(raw, /125\s*g\s+Mehl/i); assert.match(raw, /250\s*ml\s+Wasser/i);
    assert.ok((await page.locator('.ingredient textarea').evaluateAll(nodes=>nodes.map(n=>n.value))).some(s=>/125 g Mehl/.test(s)));
    assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.ok(requests.every(request => request.method === 'GET'));
    assert.ok(requests.some(request => request.url.endsWith('/baseline/deu.traineddata')));
    assert.ok(requests.some(request => /\/vendor\/core\/.*\.wasm(?:\.js)?$/.test(request.url)));
    assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
    if (process.env.REKEK_UI_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.REKEK_UI_SCREENSHOT_DIR}/phone-real-local.png`, fullPage: true });
    console.log('Actual self-hosted Tesseract.js/WASM read 125 g Mehl and 250 ml Wasser on a synthetic printed recipe; zero external/POST requests. Not a handwriting-accuracy measurement.');
    await context.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
