# Local recipe photo diagnostic — 26 October 2026

`https://hofilight.ch/rekek-test.html` replaces the paid API test client with
local Tesseract.js 5.1.1 recognition. There is no access-token field or inference
endpoint. The page's Content Security Policy only permits same-origin network
connections. Reader code, WASM and German baseline weights are served from
`assets/rekek/quantity-test/` on the same host. Image processing and text parsing
run in the browser, without paid inference calls or a paid fallback. Network
access is still needed to initially load the page and reader files; this is
not an installable offline app or a claim that internet/computing has no costs.

Photos remain in browser memory. The page does not send images, source text or
results to an inference server. No automatic recipe save, inventory write,
analytics or browser storage is used. Model caching is disabled. Clear and
page exit release photos and results. JSON export is an explicit user action
and contains unverified raw OCR text and parsed drafts, never image pixels.

One to twelve JPG/PNG/WebP files, at most 6 MiB combined and 25 megapixels per
photo, are supported. Raster input is scaled to at most 2200 pixels per side
and composited on white. The original photo remains available for review.
There is a three-minute total deadline, explicit cancellation, no retries and
no cross-page combination unless the user explicitly selects continuation
pages. Multiple recipes use the existing conservative parser; uncertain page
boundaries remain unassigned and their raw OCR text is available for review.

This is a diagnostic baseline, not the entire existing app's crop/reread
pipeline and not a stronger handwriting model. The 25 October saved comparison
showed poor full-page handwriting results with Tesseract, Paddle and Qwen.
Those models are not newly trained or approved by this change. Correcting
raised/lowered slash-fraction parsing removes a downstream compatibility bug,
not optical reading errors such as 125 being read as 12.5 or the wrong name.

Replaying the saved, unchanged Paddle transcript for diagnostic page 12 found
three explicit `¹/₄` rows. All three formerly returned a null numeric amount;
all three now return 0.25, preserving their original text. No model was rerun,
no ingredient names were repaired, and this is not three newly correct whole
ingredient assignments or an overall accuracy score.

The actual browser baseline was also run on the two unchanged, previously used
handwritten rasters (596 × 842) from the saved comparison: page 12 returned no
text; page 17 returned an unusable partial transcript. Both runs had zero
external requests and zero upload requests. Neither is a new blind case or a
successful recipe extraction. This confirms that the local test path works
without paid services but does not solve full-page handwriting recognition.

The old cloud diagnostic Worker is not redeployed or edited here. Keep
`REKEK_ENABLED=0` in Cloudflare. Removing the client does not prove the remote
setting is disabled. The existing MHD service is separate and is unchanged.

Validation:

- `node tools/test-rekek-typographic-fractions.mjs`: explicit raised/lowered
  slash fractions, mixed numbers, unchanged source, split rows, reader
  agreement, exponent/footnote protection and invalid fractions.
- `node tools/e2e-rekek-test-ui.mjs`: phone UI using controlled local-reader
  output, cancellation during loading/reading, failures, limits, safe text,
  raw result export, no storage and no external/POST network requests.
- `REKEK_REAL_OCR=1 node tools/e2e-rekek-test-ui.mjs`: additionally runs the
  actual self-hosted WASM reader on a synthetic printed recipe, checking its
  ingredient quantities and zero external or POST requests. Synthetic success
  is not customer-image or handwriting accuracy.

## Source review experiment — 27 October 2026

The local diagnostic now places the selected original next to editable draft
fields (stacked on phones). Recognition retains line text, line IDs and boxes
in the exact OCR canvas coordinate system. Display-only crops use independent
x/y ratios to the original photo, clamp to its bounds, and include eight pixels
of context. They never feed back into recognition. A source button and return
button connect a field with the original on narrow screens.

Only a unique exact match after NFC, whitespace and case normalization selects
an OCR line automatically. Matching is restricted to that recipe's source
pages. No fuzzy food-name or amount correction is used. Where the parser joins
or splits source lines, or no line boxes exist, attribution stays at the whole
page. A reviewer may explicitly choose a line or use the whole original. A
matching box is evidence of location, not correctness; existing box errors can
still omit or merge content. This version does not implement automatic missing
line detection or claim that clicking a checkbox detects a reading error.

Title, persons/portions (including an explicitly confirmed empty value), each
ingredient with its section, all preparation text, and remaining unresolved
items require individual confirmation. Text, section or source changes clear
that field's confirmation and every full-page completeness confirmation. An
added ingredient/recipe or removed misclassification also invalidates page
completeness. A whole-page checkbox asks the reviewer to check *all* recipes,
sections, ingredients and steps, including content OCR missed. At least one
nonempty ingredient per remaining recipe and one remaining recipe are required
for the reviewed export. Unreadable title/steps/ingredients must be explicitly
marked in text; there is no inferred replacement. Empty OCR remains available
for manual transcription. These gates enforce deliberate review, not truth.

There is no bulk-confirm control. Removed fields and excluded recipe drafts
are recorded in the review audit. Original `pages`, `recipes` and raw OCR stay
unchanged. The original-result download remains unreviewed. A separate reviewed
JSON download is enabled only after all required fields and pages are checked.
It adds `review.schema = rekek-source-review-v1`, human-confirmed fields with
original and edited text and source IDs, and `fallible: true`. Top-level
`verified` deliberately remains false. Optional `parsed_reading` is still a
machine interpretation, not a separately validated amount. No direct recipe or
inventory import, storage or server submission is added. New selection,
grouping changes, restart and clearing discard review state.

Validation for this change:

- `node tools/e2e-rekek-source-review.mjs`: controlled OCR with deliberately
  incorrect quantities; source crop pixels/geometry, export gate, individual
  and full-page checks, revoked confirmations, additions/removals/excluded
  recipes, immutable raw text and original candidates, fallibility labels,
  injection protection, resets, no horizontal overflow at 320/390/1280 px,
  no browser storage, external requests or uploads.
- `REKEK_SAVED_PAGE_DIR=/absolute/path/to/step5-confirmed-test node
  tools/e2e-rekek-source-review.mjs`: optionally replays the five *unchanged*
  saved whole-page transcripts and their private original JPEGs. Checks that
  the originals display and all exports start blocked. It does not rerun OCR,
  use PSM6 layout as if it belonged to the PSM3 transcript, improve accuracy,
  independently confirm recipes, or put private material in the repository.
- Existing UI cancellation, file limits, multi-page grouping, untrusted-text
  handling and raw exports remain tested. The actual local WASM reader is
  additionally tested on the synthetic printed recipe with
  `REKEK_REAL_OCR=1 node tools/e2e-rekek-test-ui.mjs`. This is a functional
  integration check, not handwritten recipe accuracy.

The five diagnostic handwriting cases are now development/replay examples,
not a fresh holdout for future model improvements. The human-reviewed reference
remains correctable; successful UI tests do not remove that uncertainty.

### Empty OCR page regression from the 500-recipe source pilot

Five historical development pages were processed through the actual browser
reader. One returned an empty text while the others returned partial text.
Previously that page was available as an original but had no explicit result
warning. Every empty-text page now carries a visible warning and requires an
individually confirmed nonempty review finding (manual transcription completed,
unreadable content, or reason for exclusion). Findings are preserved in
`review.page_findings`; all page completeness checks remain required. Empty
pages are never silently treated as successful recipe extraction. This is a
review gate improvement, not an OCR or model accuracy improvement.
