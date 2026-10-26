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
