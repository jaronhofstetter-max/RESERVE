import { ExtractionError, extractRecipePages } from './extraction.mjs';

// Host integration must supply real authorization and an explicit origin list.
// The existing MHD handler remains responsible for all other paths.
/**
 * @param {Request} request
 * @param {any} env
 * @param {{authorize?: (request: Request, env: any) => Promise<boolean>, allowedOrigins?: string[], fetchImpl?: typeof fetch}} options
 */
export async function handleRecipeRoute(request, env, { authorize, allowedOrigins = [], fetchImpl = fetch } = {}) {
  if (new URL(request.url).pathname !== '/api/recipe-vision') return null;
  const origin = request.headers.get('Origin');
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
  const reply = (body, status) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.includes(origin)) return reply({ error: 'origin_not_allowed' }, 403);
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  } });
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
  if (env.REKEK_ENABLED !== '1' || typeof authorize !== 'function') return reply({ error: 'recipe_reader_not_enabled' }, 503);
  try {
    if (!await authorize(request, env)) return reply({ error: 'unauthorized' }, 401);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply({ error: 'json_required' }, 415);
    // Bound the actual stream, not only the client-supplied Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'invalid_input' }, 400);
    let total = 0; const parts = [];
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        total += value.byteLength;
        if (total > 9 * 1024 * 1024) { await reader.cancel(); return reply({ error: 'request_too_large' }, 413); }
        parts.push(value);
      }
    } finally { reader.releaseLock(); }
    const body = new Uint8Array(total); let at = 0;
    for (const part of parts) { body.set(part, at); at += part.byteLength; }
    let input;
    try { input = JSON.parse(new TextDecoder().decode(body)); } catch { return reply({ error: 'invalid_json' }, 400); }
    const result = await extractRecipePages(input, { apiKey: env.OPENAI_API_KEY, model: env.REKEK_MODEL, fetchImpl, signal: request.signal });
    return reply(result, 200);
  } catch (error) {
    // Never return a provider exception, credential, request body or page pixels.
    return reply({ error: error instanceof ExtractionError ? error.code : 'recipe_reader_failed' }, error instanceof ExtractionError ? error.status : 502);
  }
}
