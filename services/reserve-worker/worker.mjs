import { handleRecipeRoute } from '../rekek-vision/route.mjs';
import { ExtractionError } from '../rekek-vision/extraction.mjs';
import { ALLOWED_ORIGINS, handleExpiry } from './expiry.mjs';

// Private diagnostic access only. Never embed this token in the public app.
async function authorizeDiagnostic(request, env) {
  const secret = env.REKEK_ACCESS_TOKEN;
  const until = Date.parse(env.REKEK_TEST_UNTIL || '');
  if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(secret) ||
      !Number.isFinite(until) || until <= Date.now() || typeof env.REKEK_LIMITER?.limit !== 'function') {
    throw new ExtractionError('diagnostic_access_not_configured', 503);
  }
  const supplied = request.headers.get('Authorization') || '';
  if (supplied.length > 160) return false;
  const digest = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(supplied), digest(`Bearer ${secret}`)]);
  const left = new Uint8Array(a), right = new Uint8Array(b); let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  if (mismatch) return false;
  // Constant key for this one owner token; do not leak the token to the binding.
  const decision = await env.REKEK_LIMITER.limit({ key: 'rekek-private-diagnostic' });
  if (decision?.success !== true) throw new ExtractionError('diagnostic_rate_limited', 429);
  return true;
}

export function createWorker(fetchImpl = fetch) {
  return { async fetch(request, env) {
    const recipe = await handleRecipeRoute(request, env, {
      authorize: authorizeDiagnostic, allowedOrigins: ALLOWED_ORIGINS, fetchImpl
    });
    return recipe ?? handleExpiry(request, env, fetchImpl);
  } };
}
export default createWorker();
