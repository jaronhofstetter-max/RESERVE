# REKEK hosted-reader preparation

Status, 2026-10-25: **adapter and contract tests only**. There has been no real
OpenAI recipe-image call, deployment, browser integration or new accuracy
measurement. The Cloudflare dashboard showed a sign-in form; the secure sign-in
request was declined. The current expiry worker's source/configuration therefore
could not be inspected. No attempt was made to extract its secret or replace it.

## What is ready

`services/rekek-vision/extraction.mjs` uses the OpenAI Responses API with image
inputs and a strict JSON schema. The model is explicitly configured, not chosen
by a hidden fallback. The server keeps quantities/fractions/units as source
strings and absent values as null. Each ingredient retains a source line and a
page ID. Page IDs must belong to the supplied images and to the relevant recipe.
Cross-page recipe results are rejected unless `sameRecipe` was explicitly true.
The prompt additionally requires visible evidence of a continuation; that
semantic relationship still needs image review.

The adapter retains wrong but well-formed readings as-is: it does not change
`12.5` to `125` using recipe plausibility. The existing evaluator counts the
discrepancy. Source lines are model outputs, not independent verification of
their own accuracy. Every successful result has `reviewRequired:true` and
`verified:false`. No inventory change, recipe save, customer confirmation or
new training data follows from it.

Incomplete, refused, malformed or ambiguous model responses do not become
recipes. Requests have a deadline and cancellation support, with no automatic
retry/billing loop. The evaluation hook receives the unchanged provider response
before interpretation; only the private diagnostic runner writes it to disk.
`store:false` disables Responses storage for these calls; it is not a claim
about every provider logging/retention policy.

## Server route boundary

`services/rekek-vision/route.mjs` exports `handleRecipeRoute`. It handles only
`/api/recipe-vision`, returning null for unrelated paths so the host can retain
its expiry handler. It is **not a complete replacement worker**. The actual
existing worker must first be read before integrating its routing/export style.

The route stays disabled unless `REKEK_ENABLED` is exactly `1` and the host
supplies a real `authorize(request, env)` function. The host must validate its
authenticated users and enforce its budget/quota policy there before making
the route available. CORS alone is not authorization. No bypass authorization
callback or public paid inference endpoint is supplied.

The host explicitly supplies allowed browser origins, e.g. `https://hofilight.ch`.
The route accepts JSON with one to twelve PNG/JPEG/WebP data URLs, at most 6 MiB
of decoded images in total. It checks actual request-body bytes (9 MiB cap),
image MIME/signature agreement, IDs and response shapes. Remote image URLs and
client-supplied prompts/provider destinations are not accepted. Provider errors
returned to the caller contain machine-readable codes, never exception text,
keys, page pixels or echoed provider messages.

Required server configuration:

- `OPENAI_API_KEY`: the existing server secret, if currently available; never
  place the value in app code, repository files or chat.
- `REKEK_MODEL`: an explicitly selected model/snapshot that supports images and
  strict Responses JSON output. Account access/quality must be checked with a
  real call before deployment. No model has been verified for these recipes yet.
- `REKEK_ENABLED`: leave absent/off until source review, authorization, quota
  handling and a real provider test are complete.

No new secret, account, access grant or deployment was created by this change.

Input shape (replace the illustrative data URL with a real source image):

```json
{
  "images": [{"id":"page-1","data_url":"data:image/png;base64,..."}],
  "sameRecipe": false
}
```

The schema returns `recipes` with `title`, `portions`, `page_ids`, `ingredients`
(`quantity`, `unit`, `name`, `source_line`, `page_id`), literal `steps` and
`unclear` items. Missing steps are an empty list. No package weights, nutrition,
times, temperatures or additional instructions are inferred. This adapter does
not import the result into the current app; the existing manual review/save
boundary remains separate until real extraction has been validated.

## Frozen page evaluation

The existing runner now also supports the `openai` reader:

```sh
node tools/run-rekek-page-evaluation.mjs /PRIVATE/manifest.json /PRIVATE/run-001 openai --dry-run
node tools/run-rekek-page-evaluation.mjs /PRIVATE/manifest.json /PRIVATE/run-001 openai
```

Execution reads `OPENAI_API_KEY` and `REKEK_MODEL` from the process environment.
It sends no request if either is missing, or when `--dry-run` is used. No
credential value goes into the frozen metadata. The manifest, input hashes,
model ID, prompt/schema, provider options and adapter/parser/evaluator hashes
are recorded. Original responses precede scoring and are never overwritten.
Provider errors stop the run instead of repeatedly charging for retries.

This CLI mode is a **single-raster-per-case diagnostic**. Render selected PDF
pages first. The route supports explicitly related image pages, but that does
not make this single-page CLI a multi-page recipe benchmark. Keep all private
images/manifests/provider responses outside the repository: the Pages workflow
publishes the checkout. See `rekek-page-evaluation.md` for reference/split rules.

The planned real tests remain: known quantity/assignment failures, then 30
audited previously unused pages with verified references and separate counts
for wrong quantities/units, missing/extra ingredients, servings and steps.
Customer correction burden requires real review observation and is unmeasured.

## Verification

```sh
node tools/test-rekek-vision.mjs
node tools/test-rekek-page-evaluation.mjs
node tools/test-rekek-portions.mjs
```

Tests use injected provider responses and real Request/Response boundaries.
They check source page ownership, forbidden cross-page merging, missing values,
fractions, unaltered incorrect quantities, original-response retention, refusals,
truncation, cancellation/deadlines, missing credentials/model, no retries,
authorization/disabled state, payload limits and sanitized errors. They do not
measure image recognition. CI runs the contracts without provider credentials.

Official API sources checked 2026-10-25:

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses
- https://developers.openai.com/api/reference/resources/responses/methods/create
