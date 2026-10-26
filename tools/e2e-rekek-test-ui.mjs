import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = process.cwd();
const files = new Set(['rekek-test.html', 'rekek-test.js', 'rekek-test.css']);
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!files.has(name)) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
  response.end(fs.readFileSync(`${root}/${name}`));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
const endpoint = 'https://reserve-expiry-vision.jaronhofstetter.workers.dev/api/recipe-vision';
const credential = 'synthetic-owner-token-000000000000000000000000';
const photo = { name: 'recipe.png', mimeType: 'image/png', buffer: fs.readFileSync('tests/fixtures/rekek-digit-1.png') };
const output = { reviewRequired: true, verified: false, recipes: [{
  title: '<img src=x onerror=alert(1)>', portions: null, page_ids: ['page-1'],
  ingredients: [{ quantity: '½', unit: 'Päckchen', name: 'Backpulver', source_line: '½ Päckchen Backpulver', page_id: 'page-1' },
    { quantity: '12.5', unit: 'g', name: 'Mehl', source_line: '12.5 g Mehl', page_id: 'page-1' },
    { quantity: null, unit: null, name: 'Salz', source_line: 'Salz', page_id: 'page-1' }],
  steps: ['Zutaten mischen.'], unclear: ['Portionen fehlen.']
}] };
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let calls = 0, mode = 'success', payload;
  await page.route(endpoint, async route => {
    calls++;
    assert.equal(route.request().headers().authorization, `Bearer ${credential}`);
    assert.ok(!route.request().url().includes(credential));
    payload = route.request().postDataJSON();
    if (mode === 'slow') { await new Promise(resolve => setTimeout(resolve, 500)); }
    if (mode === 'network') { await route.abort(); return; }
    const errorCodes = { disabled: [503, 'recipe_reader_not_enabled'], expired: [503, 'diagnostic_access_not_configured'],
      unauthorized: [401, 'unauthorized'], limited: [429, 'diagnostic_rate_limited'], provider: [502, 'provider_http_error'] };
    const failure = errorCodes[mode];
    await route.fulfill({ status: failure?.[0] || 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: mode === 'malformed' ? '{bad' : JSON.stringify(failure ? { error: failure[1] } : output) }).catch(() => {});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/rekek-test.html`);
  assert.equal(await page.locator('#submit').isDisabled(), true);
  await page.locator('#token').fill(credential);
  assert.equal(await page.locator('#submit').isDisabled(), true);
  await page.locator('#photos').setInputFiles(photo);
  assert.equal(await page.locator('#submit').isEnabled(), true);
  assert.equal(calls, 0); // Selection and credential entry do not send an image.
  await page.locator('#submit').click();
  await page.locator('#results').waitFor({ state: 'visible' });
  assert.equal(calls, 1); assert.equal(payload.sameRecipe, false);
  assert.deepEqual(payload.images.map(image => image.id), ['page-1']);
  assert.equal(payload.images[0].data_url, `data:image/png;base64,${photo.buffer.toString('base64')}`);
  assert.match(await page.locator('#recipes').innerText(), /½ Päckchen Backpulver/);
  assert.match(await page.locator('#recipes').innerText(), /12\.5 g Mehl/); // Never repair a wrong reading to 125.
  assert.match(await page.locator('#recipes').innerText(), /\[Menge offen\]/);
  assert.match(await page.locator('#recipes').innerText(), /nicht angegeben/);
  assert.equal(await page.locator('#recipes img').count(), 0); // Source text is never HTML.
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  if (process.env.REKEK_UI_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.REKEK_UI_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.REKEK_UI_SCREENSHOT_DIR}/phone.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${process.env.REKEK_UI_SCREENSHOT_DIR}/desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  const downloadEvent = page.waitForEvent('download'); await page.locator('#download').click();
  const download = await downloadEvent;
  const exported = fs.readFileSync(await download.path(), 'utf8');
  assert.deepEqual(JSON.parse(exported), output); assert.ok(!exported.includes(credential)); assert.ok(!exported.includes('data:image'));
  await page.locator('#photos').setInputFiles({ ...photo, name: 'continuation.png' });
  assert.equal(await page.locator('#results').isHidden(), true);
  await page.locator('#same-recipe').check();
  await page.locator('#submit').click(); await page.locator('#results').waitFor({ state: 'visible' });
  assert.equal(payload.sameRecipe, true); assert.equal(payload.images.length, 2);
  for (const [testMode, expected] of [['disabled', /ausgeschaltet/], ['expired', /abgelaufen/], ['unauthorized', /stimmt nicht/],
    ['limited', /mindestens eine Minute/], ['provider', /OpenAI hat/], ['malformed', /kein gültiges/], ['network', /Keine Verbindung/]]) {
    mode = testMode; const before = calls;
    await page.locator('#submit').click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.error === 'true' && !document.querySelector('#photos').disabled);
    assert.match(await page.locator('#status').innerText(), expected);
    assert.equal(await page.locator('#results').isHidden(), true);
    await page.waitForTimeout(150); assert.equal(calls, before + 1); // No automatic retry.
  }
  mode = 'slow'; await page.locator('#submit').click();
  assert.equal(await page.locator('#submit').isDisabled(), true);
  await page.locator('#cancel').click();
  await page.waitForFunction(() => !document.querySelector('#photos').disabled);
  assert.match(await page.locator('#status').innerText(), /abgebrochen/);
  await page.locator('#clear').click();
  assert.equal(await page.locator('#token').inputValue(), '');
  assert.equal(await page.locator('#previews img').count(), 0);
  assert.equal(await page.locator('#same-recipe').isChecked(), false);
  assert.equal(await page.locator('#submit').isDisabled(), true);
  const before = calls;
  await page.locator('#photos').setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024 + 1) });
  assert.match(await page.locator('#status').innerText(), /zusammen 6 MiB/);
  await page.locator('#photos').setInputFiles({ name: 'book.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  assert.match(await page.locator('#status').innerText(), /PDFs/); assert.equal(calls, before);
  await page.locator('#photos').setInputFiles(photo); await page.locator('#token').fill(credential);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  assert.equal(await page.locator('#token').inputValue(), ''); assert.equal(await page.locator('#previews img').count(), 0);
  assert.deepEqual(errors, []);
  console.log('REKEK mobile diagnostic UI: exact image transport, explicit submit, fractions/nulls/source evidence, safe text rendering, error handling/no retries, cancellation, limits, export without credentials, empty storage and clear-on-leave passed. Mock responses only.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
