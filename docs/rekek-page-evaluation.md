# Whole-page reader evaluation

REKEK needs complete recipe extraction, including source quantities, units,
ingredient assignments, preparation and original servings. Small isolated
formula crops cannot demonstrate that behavior. This change adds a repeatable
whole-page diagnostic runner and a deterministic field evaluator. It does not
replace the browser OCR engine or establish a new accuracy percentage.

## Commands

Run from the repository root, with Node 22 or later:

```sh
node tools/run-rekek-page-evaluation.mjs private/manifest.json private/run-001 tesseract --dry-run
node tools/run-rekek-page-evaluation.mjs private/manifest.json private/run-001 tesseract
node tools/run-rekek-page-evaluation.mjs private/manifest.json private/run-002 mistral
```

The Tesseract baseline uses the system CLI with PSM 3. It reuses the actual
REKEK text parser, but **does not reproduce the browser's image preprocessing,
crop passes or review UI**. Do not describe this baseline as a phone/app test.
`tesseractLanguage` defaults to `deu`; `tesseractDataDirectory` may point to an
existing weight directory relative to the manifest. Engine version, language,
PSM and language-weight SHA256 are recorded.

The Mistral candidate uses the pinned `mistral-ocr-4-0` identifier and Document
Annotations with a JSON schema. Its API key is read from `MISTRAL_API_KEY` on
the execution host, never from the browser or a committed configuration file.
No model request is made in dry-run mode or without a key. API calls can incur
provider charges. The transport/schema boundary has an injected-response test;
an actual Mistral run remains necessary to validate provider compatibility and
recipe quality. Provider model identifiers do not guarantee immutable weights.

## Manifest and source references

```json
{
  "schema": 1,
  "tesseractLanguage": "deu",
  "cases": [{
    "id": "diagnostic-001",
    "group": "diagnostic",
    "previouslyUsed": true,
    "pageCount": 1,
    "path": "recipe.png",
    "sha256": "REPLACE_WITH_THE_ACTUAL_IMAGE_SHA256"
  }]
}
```

`group` is `diagnostic`, `blind`, or `synthetic`. Blind cases require an
explicit `previouslyUsed:false` declaration. This is a declaration, not an
automatic proof that no related recipe or earlier copy was used. Audit recipe
groups and earlier development inputs before establishing a blind set.
Identical input files cannot be counted twice. Each image counts as one page.
Mistral accepts PDFs; its returned page count must match the manifest. Render
PDF pages to images first for the CLI baseline. Keep multi-page recipes in one
document/case and do not compare fragments to a complete recipe reference.

For scored cases add `referenceStatus:"verified"` and `expected`:

```json
[{
  "title": "Gemüsepfanne",
  "portions": "2",
  "ingredients": [
    {"quantity":"125","unit":"g","name":"Gemüse"},
    {"quantity":"½","unit":"Päckchen","name":"Backpulver"}
  ],
  "steps": ["Alles vermengen."]
}]
```

This is a synthetic schema example, not a real recipe reference. Verify every
reference against the source image. Missing quantities/units/servings use null.
Use null rather than guessing package mass, nutrition or preparation details.
Cases without a verified reference retain predictions but contribute no score.

## Freeze, results and limits

All inputs are checked before inference. The runner writes the manifest,
input checksums, parser/runner/evaluator hashes and provider prompt/schema
before reading. Existing run directories cannot be overwritten. Raw CLI text
or the complete original provider response is saved before parsing/evaluation.
Inputs, local weights and code are checked against the freeze. Runtime errors
are reported separately; provider errors stop further API calls. There are no
automatic retries or provider/model selections based on the desired answer.

The evaluator reports wrong quantities, wrong units, missing/extra ingredients,
wrong servings, title differences, missing/extra recipes and preparation
differences. Duplicate ingredient rows are matched at most once. Quantities
swapped between named ingredients remain errors. Only explicit fraction
typography, whitespace, selected unit aliases and metric conversion are
normalized. Ingredient names are not fuzzy-matched or repaired. Matching step
text tolerates line wrapping; changed temperatures, words and order remain
differences. This strict measure can flag harmless paraphrasing; inspect the
saved differences rather than silently changing the metric after a run.

Servings preserve the user's smaller-endpoint rule for explicit ranges.
Known-diagnostic, blind and synthetic results stay separate. Exact-case counts
are field comparisons, not proof of production readiness. Actual customer
correction burden is not measured by this harness and is explicitly marked as
unmeasured. It requires observation in the app. A 30-page blind test still needs
30 audited, previously unused pages and verified references.

Keep private photographs, responses and references outside the public checkout.
The repository's Pages workflow publishes the checkout: **do not put private
test inputs or API response files inside it**, even in a gitignored directory.

## Serving conflict correction (0.6.27)

Previously, `Für 2 Portionen` followed by `Für 4 Portionen` silently yielded 4.
The parser now leaves servings blank and retains both source lines in unresolved
evidence. Conflicts stay unresolved even if a third line repeats an earlier
number. Invalid counts (zero, outside 1–100, noninteger) stay open. Multiple
readings on the same line are checked too. Repeated agreeing counts and explicit
`2–3 → 2` ranges remain supported; separate recipe candidates are independent.

Validation commands:

```sh
node tools/test-rekek-portions.mjs
node tools/test-rekek-page-evaluation.mjs
node tools/test-personal-recipe-parser.mjs
node tools/test-rekek.mjs
node tools/test-rekek-sections.mjs
```

These are functional/regression tests. The provider-boundary test uses an
injected response and is not a model-quality measurement. Browser integration
remains covered by the existing REKEK review workflow.

Provider documentation checked 2026-10-25:

- https://docs.mistral.ai/models/ocr-4-0
- https://docs.mistral.ai/studio/document-processing/annotations
- https://docs.mistral.ai/api/endpoint/ocr
