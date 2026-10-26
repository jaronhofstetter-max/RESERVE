import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ExtractionError, validateInput, validateExtraction, makeExtractionRequest,
  parseExtractionResponse, extractRecipePages } from '../services/rekek-vision/extraction.mjs';
import { handleRecipeRoute } from '../services/rekek-vision/route.mjs';
import { evaluate } from './rekek-page-evaluation.mjs';

const dataUrl = 'data:image/png;base64,' + fs.readFileSync('tests/fixtures/rekek-digit-1.png').toString('base64');
const input = { images: [{ id: 'page-1', data_url: dataUrl }], sameRecipe: false };
const recipe = { title: 'Testgebäck', portions: null, page_ids: ['page-1'],
  ingredients: [
    { quantity: '125', unit: 'g', name: 'Mehl', source_line: '125 g Mehl', page_id: 'page-1' },
    { quantity: '½', unit: 'Päckchen', name: 'Backpulver', source_line: '½ Päckchen Backpulver', page_id: 'page-1' },
    { quantity: null, unit: null, name: 'Salz', source_line: 'Salz', page_id: 'page-1' }
  ], steps: ['Vermengen.'], unclear: ['Portionen nicht angegeben.'] };
const extracted = { recipes: [recipe] };
const provider = value => JSON.stringify({ status: 'completed', output: [
  { type: 'reasoning', summary: [] },
  { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(value) }] }
] });
const raw = provider(extracted), clone = x => JSON.parse(JSON.stringify(x));
const errorCode = code => error => error instanceof ExtractionError && error.code === code;
const response = (text = raw, status = 200) => new Response(text, { status });

assert.equal(validateInput(input), input);
for (const invalid of [null, { ...input, sameRecipe: undefined }, { ...input, images: [] },
  { ...input, images: [input.images[0], input.images[0]] },
  { ...input, images: [{ data_url: dataUrl }] },
  { ...input, images: [{ id: 'page-1', data_url: 'https://example.com/image.png' }] },
  { ...input, images: [{ id: 'page-1', data_url: 'data:image/jpeg;base64,aGVsbG8=' }] }]) assert.throws(() => validateInput(invalid));
const requestBody = makeExtractionRequest(input, 'test-model');
assert.equal(requestBody.store, false);assert.equal(requestBody.text.format.strict, true);
assert.equal(requestBody.input[1].content[2].image_url, dataUrl);
assert.deepEqual(requestBody.text.format.schema.properties.recipes.items.properties.page_ids.items.enum, ['page-1']);
assert.throws(() => makeExtractionRequest(input, ''), errorCode('model_not_configured'));
const result = parseExtractionResponse(raw, ['page-1']);
assert.equal(result.reviewRequired, true);assert.equal(result.verified, false);
assert.equal(result.recipes[0].portions, null);assert.equal(result.recipes[0].ingredients[2].quantity, null);
assert.equal(result.recipes[0].ingredients[1].quantity, '½');
const multiPage = clone(extracted);multiPage.recipes[0].page_ids.push('page-2');
multiPage.recipes[0].ingredients[1].page_id = 'page-2';
assert.throws(() => validateExtraction(multiPage, ['page-1', 'page-2']), errorCode('invalid_model_output'));
assert.equal(parseExtractionResponse(provider(multiPage), ['page-1', 'page-2'], { sameRecipe: true }).recipes[0].page_ids.length, 2);

for (const mutate of [
  r => { r.recipes[0].page_ids = ['other-page']; },
  r => { r.recipes[0].ingredients[0].page_id = 'other-page'; },
  r => { r.recipes[0].ingredients[0].quantity = 125; },
  r => { r.recipes[0].ingredients[0].source_line = ''; },
  r => { r.recipes[0].steps = 'Vermengen.'; },
  r => { r.recipes[0].nutrition = { kcal: 0 }; }
]) { const value = clone(extracted);mutate(value);assert.throws(() => validateExtraction(value, ['page-1']), errorCode('invalid_model_output')); }
assert.throws(() => parseExtractionResponse('{bad', ['page-1']), errorCode('invalid_provider_json'));
assert.throws(() => parseExtractionResponse(JSON.stringify({ status: 'incomplete', output: [] }), ['page-1']), errorCode('incomplete_provider_response'));
assert.throws(() => parseExtractionResponse(JSON.stringify({ status: 'completed', output: [{ type: 'message', status: 'completed', content: [{ type: 'refusal', refusal: 'No' }] }] }), ['page-1']), errorCode('provider_refusal'));
const duplicate = JSON.parse(raw);duplicate.output.push(duplicate.output[1]);
assert.throws(() => parseExtractionResponse(JSON.stringify(duplicate), ['page-1']), errorCode('ambiguous_provider_output'));

let calls = 0, retained = '';
const transport = async (url, options) => {
  calls++;assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(options.headers.Authorization, 'Bearer test-key');assert.equal(JSON.parse(options.body).model, 'test-model');
  return response();
};
const options = { apiKey: 'test-key', model: 'test-model', fetchImpl: transport, onRaw: async text => { retained = text; } };
assert.equal((await extractRecipePages(input, options)).verified, false);assert.equal(calls, 1);assert.equal(retained, raw);
await assert.rejects(extractRecipePages(input, { ...options, apiKey: '' }), errorCode('key_not_configured'));assert.equal(calls, 1);
const aborted = new AbortController();aborted.abort();
await assert.rejects(extractRecipePages(input, { ...options, signal: aborted.signal }), errorCode('cancelled'));assert.equal(calls, 1);
await assert.rejects(extractRecipePages(input, { ...options, timeoutMs: 1, fetchImpl: async (url, { signal }) => new Promise((resolve, reject) => {
  const cancel = () => reject(new Error('aborted'));if (signal.aborted) cancel();else signal.addEventListener('abort', cancel, { once: true });
}) }), errorCode('provider_timeout'));
let attempts = 0;
await assert.rejects(extractRecipePages(input, { ...options, fetchImpl: async () => { attempts++;return response('rate-limited', 429); } }), errorCode('provider_rate_limited'));
assert.equal(attempts, 1); // No automatic retries/billing loop.
let savedBeforeFailure = '';
await assert.rejects(extractRecipePages(input, { ...options, fetchImpl: async () => response('not-json'), onRaw: async text => { savedBeforeFailure = text; } }), errorCode('invalid_provider_json'));
assert.equal(savedBeforeFailure, 'not-json');
const wrong = clone(extracted);wrong.recipes[0].ingredients[0].quantity = '12.5';
const unchanged = parseExtractionResponse(provider(wrong), ['page-1']);
assert.equal(unchanged.recipes[0].ingredients[0].quantity, '12.5');
assert.equal(evaluate(extracted.recipes, unchanged.recipes).counts.wrong_quantity, 1);

// Real Request/Response boundary, injected provider only; no paid calls.
const env = { REKEK_ENABLED: '1', OPENAI_API_KEY: 'test-key', REKEK_MODEL: 'test-model' };
const origin = 'https://hofilight.ch';
const config = { authorize: async () => true, allowedOrigins: [origin], fetchImpl: transport };
const req = (payload = input, extra = {}) => new Request('https://service.example/api/recipe-vision', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), ...extra
});
assert.equal(await handleRecipeRoute(new Request('https://service.example/'), env, config), null);
assert.equal((await handleRecipeRoute(req(), { ...env, REKEK_ENABLED: '0' }, config)).status, 503);
assert.equal((await handleRecipeRoute(req(), env, { ...config, authorize: undefined })).status, 503);
assert.equal((await handleRecipeRoute(req(), env, { ...config, authorize: async () => false })).status, 401);
assert.equal((await handleRecipeRoute(req(), env, { ...config, allowedOrigins: [] })).status, 403);
let route = await handleRecipeRoute(req(), env, config);
assert.equal(route.status, 200);assert.equal(route.headers.get('Access-Control-Allow-Origin'), origin);
assert.equal((await route.json()).verified, false);assert.equal(route.headers.get('Cache-Control'), 'no-store');
assert.equal((await handleRecipeRoute(req(input, { body: '{broken' }), env, config)).status, 400);
assert.equal((await handleRecipeRoute(req(input, { body: 'x'.repeat(9 * 1024 * 1024 + 1) }), env, config)).status, 413);
assert.equal((await handleRecipeRoute(new Request('https://service.example/api/recipe-vision', { method: 'OPTIONS', headers: { Origin: origin } }), env, config)).status, 204);
route = await handleRecipeRoute(req(), env, { ...config, fetchImpl: async () => response('upstream echoes test-key private-error', 500) });
assert.equal(route.status, 502);assert.equal(await route.text(), '{"error":"provider_http_error"}');
console.log('REKEK hosted-reader adapter: schema, source pages, nulls/fractions, unaltered wrong amounts, raw evidence, refusal/incomplete output, timeout/cancel, no retries, authorization, size bounds and sanitized errors passed. Mock provider; no image-quality result or deployment.');
