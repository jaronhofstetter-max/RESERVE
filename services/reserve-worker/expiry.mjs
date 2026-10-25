// Based on the complete existing Worker supplied by the owner on 2026-10-25.
// Keep the expiry prompt/model/result contract; remove temporary raw diagnostics.
export const ALLOWED_ORIGINS = ['https://jaronhofstetter-max.github.io', 'https://hofilight.ch'];
const cors = origin => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin'
});
const json = (data, status, origin) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) }
});
export const EXPIRY_PROMPT = `
You analyze photographs of food packaging for the RESERVE pantry app.

Your only task is to identify the expiration, best-before,
use-by or minimum-durability date printed on the package.

IMPORTANT RULES:

- Prefer dates explicitly associated with:
  MHD
  BBE
  BB
  EXP
  Best Before
  Mindestens haltbar
  Mindestens haltbar bis
  Mindestens haltbar bis Ende
  À consommer de préférence
  Da consumarsi preferibilmente

- Do NOT confuse production/manufacturing dates with expiry dates.

- Explicitly ignore dates associated with:
  PROD
  Production
  Produced
  Manufactured
  Herstellungsdatum

- Ignore:
  lot numbers
  LOT
  batch numbers
  charge numbers
  times
  barcodes
  weights
  product codes

- Understand German, French, Italian and English packaging.

- Month/year expiry dates represent the final day of that month
  when used as a best-before or minimum-durability date.

Examples:

MHD: 02/2028
means:
2028-02-29

BBE: 03.2031
means:
2031-03-31

Mindestens haltbar bis Ende 04.2026
means:
2026-04-30

Prod. 19 03 2026
19 03 2029
means:
2029-03-19

Prod. 23 09 2024
B.B. 23 09 2027
means:
2027-09-23

Historical dates are possible.

08/06/93 may genuinely mean:
1993-06-08

Never invent a missing year.

If multiple dates are visible, use labels and packaging context
to determine which one is the expiry date.

If the expiry date cannot be identified reliably,
return date null instead of guessing.

Return ONLY valid JSON.

Exact format:

{
  "date": "YYYY-MM-DD or null",
  "precision": "day, month, partial or null",
  "confidence": 0.0,
  "raw": "expiry text actually visible on package",
  "reason": "short explanation"
}
`;

export async function handleExpiry(request, env, fetchImpl = fetch) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return ALLOWED_ORIGINS.includes(origin)
    ? new Response(null, { status: 204, headers: cors(origin) }) : new Response(null, { status: 403 });
  if (request.method === 'GET') return json({ ok: true, service: 'RESERVE Expiry Vision' }, 200, origin);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
  if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin);
  if (!env.OPENAI_API_KEY) return json({ error: 'Vision service not configured', code: 'missing_openai_key' }, 500, origin);
  try {
    const form = await request.formData(), image = form.get('image');
    if (!(image instanceof File)) return json({ error: 'Image missing' }, 400, origin);
    if (image.size > 8 * 1024 * 1024) return json({ error: 'Image too large' }, 413, origin);
    if (!image.type.startsWith('image/')) return json({ error: 'Invalid image type' }, 400, origin);
    const bytes = new Uint8Array(await image.arrayBuffer()); let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const dataUrl = `data:${image.type};base64,${btoa(binary)}`;
    let aiResponse, result;
    // Includes response-body reading in the deadline, not just response headers.
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
    try {
      aiResponse = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-5.6-luna', store: false, input: [{ role: 'user', content: [
          { type: 'input_text', text: EXPIRY_PROMPT }, { type: 'input_image', image_url: dataUrl }
        ] }] }), signal
      });
      if (!aiResponse.ok) {
        await aiResponse.body?.cancel();
        return json({ error: 'Vision analysis failed', code: `openai_http_${aiResponse.status}`, upstreamStatus: aiResponse.status }, 502, origin);
      }
      try { result = await aiResponse.json(); }
      catch { return json({ error: 'Vision analysis failed', code: 'openai_invalid_json' }, 502, origin); }
    } catch {
      return json({ error: 'Vision analysis failed', code: 'openai_network' }, 502, origin);
    }
    const text = result?.output_text || result?.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
    if (!text) return json({ error: 'No Vision result', code: 'openai_empty_response' }, 502, origin);
    let parsed;
    try { parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()); }
    catch { return json({ error: 'Invalid Vision result', code: 'openai_invalid_response' }, 502, origin); }
    if (!parsed || typeof parsed !== 'object') return json({ error: 'Invalid Vision result', code: 'openai_invalid_response' }, 502, origin);
    const date = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null;
    return json({ date, precision: ['day', 'month', 'partial'].includes(parsed.precision) ? parsed.precision : null,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      raw: String(parsed.raw || '').slice(0, 100), reason: String(parsed.reason || '').slice(0, 200) }, 200, origin);
  } catch { return json({ error: 'Internal error', code: 'worker_internal_error' }, 500, origin); }
}
