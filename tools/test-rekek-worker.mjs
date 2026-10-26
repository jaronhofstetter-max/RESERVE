import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createWorker } from '../services/reserve-worker/worker.mjs';
const origin = 'https://hofilight.ch', token = 'test-private-token-000000000000000000';
const image = fs.readFileSync('tests/fixtures/rekek-digit-1.png');
const recipeInput = { images: [{ id: 'page-1', data_url: `data:image/png;base64,${image.toString('base64')}` }], sameRecipe: false };
const recipeOutput = { recipes: [{ title: 'Test', portions: null, page_ids: ['page-1'], ingredients: [
  { quantity: '½', unit: 'Päckchen', name: 'Backpulver', source_line: '½ Päckchen Backpulver', page_id: 'page-1' }
], steps: [], unclear: [] }] };
let calls = 0, limits = 0, providerStatus = 200;
const mockFetch = async (url, options) => {
  calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
  const body = JSON.parse(options.body); assert.equal(body.store, false);
  if (providerStatus !== 200) return new Response('private provider message', { status: providerStatus });
  if (body.model === 'gpt-5.6-luna') return Response.json({ output_text: JSON.stringify({
    date: '2028-02-29', precision: 'month', confidence: 0.9, raw: 'MHD02/2028', reason: 'Monatsende'
  }) });
  assert.equal(body.model, 'test-recipe-model');
  return Response.json({ status: 'completed', output: [{ type: 'message', status: 'completed', content: [
    { type: 'output_text', text: JSON.stringify(recipeOutput) }
  ] }] });
};
const worker = createWorker(mockFetch);
const env = { OPENAI_API_KEY: 'test-provider-key', REKEK_MODEL: 'test-recipe-model', REKEK_ENABLED: '1',
  REKEK_ACCESS_TOKEN: token, REKEK_TEST_UNTIL: new Date(Date.now() + 60000).toISOString(),
  REKEK_LIMITER: { limit: async options => { limits++; assert.deepEqual(options, { key: 'rekek-private-diagnostic' }); return { success: true }; } } };
const recipe = (auth = `Bearer ${token}`, allowedOrigin = origin) => new Request('https://worker.test/api/recipe-vision', {
  method: 'POST', headers: { Origin: allowedOrigin, Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(recipeInput)
});
for (const changes of [{ REKEK_ENABLED: undefined }, { REKEK_ACCESS_TOKEN: undefined }, { REKEK_LIMITER: undefined },
  { REKEK_TEST_UNTIL: 'invalid' }, { REKEK_TEST_UNTIL: '2020-01-01' }]) {
  assert.equal((await worker.fetch(recipe(), { ...env, ...changes })).status, 503);
}
assert.equal((await worker.fetch(recipe('Bearer wrong'), env)).status, 401);
assert.equal((await worker.fetch(recipe('', 'https://other.test'), env)).status, 403);
assert.equal(calls, 0); assert.equal(limits, 0);
assert.equal((await worker.fetch(recipe(), { ...env, REKEK_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
assert.equal(calls, 0);
const success = await worker.fetch(recipe(), env);
assert.equal(success.status, 200); assert.equal(success.headers.get('Access-Control-Allow-Origin'), origin);
const result = await success.json(); assert.equal(result.reviewRequired, true);
assert.equal(result.recipes[0].ingredients[0].quantity, '½'); assert.equal(calls, 1);
const preflight = await worker.fetch(new Request('https://worker.test/api/recipe-vision', { method: 'OPTIONS', headers: { Origin: origin } }), {});
assert.equal(preflight.status, 204); assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
assert.deepEqual(await (await worker.fetch(new Request('https://worker.test/'), {})).json(), { ok: true, service: 'RESERVE Expiry Vision' });
const expiry = () => { const form = new FormData(); form.set('image', new File([image], 'image.png', { type: 'image/png' }));
  return new Request('https://worker.test/', { method: 'POST', headers: { Origin: origin }, body: form }); };
const expiryResult = await worker.fetch(expiry(), { OPENAI_API_KEY: 'test-provider-key' });
assert.equal(expiryResult.status, 200); assert.equal((await expiryResult.json()).date, '2028-02-29');
providerStatus = 429;
const failure = await worker.fetch(expiry(), env), error = await failure.json();
assert.equal(failure.status, 502); assert.equal(error.code, 'openai_http_429');
assert.equal(error.upstreamStatus, 429); assert.equal('upstreamMessage' in error, false);
assert.ok(!JSON.stringify(error).includes('private provider'));
assert.equal(calls, 3); // one recipe + one expiry + one failure, no retries
// Execute the actual copy/paste bundle, not only the source modules.
const previousFetch = globalThis.fetch;
try {
  globalThis.fetch = mockFetch;
  const bundle = await import('data:text/javascript;base64,' + fs.readFileSync('services/reserve-worker/worker.js').toString('base64'));
  providerStatus = 200;
  assert.equal((await bundle.default.fetch(recipe(), env)).status, 200);
  assert.equal((await bundle.default.fetch(expiry(), env)).status, 200);
  assert.equal((await bundle.default.fetch(recipe(), {})).status, 503);
  assert.equal(calls, 5);
} finally { globalThis.fetch = previousFetch; }
console.log('Combined Worker contracts passed; mocked provider, no live inference.');
