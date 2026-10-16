# Browser quantity experiment

Explicit opt-in: `?rekekMengenTest=1`, then **Meine Rezepte → Rezept hinzufügen → Handschrift-Mengenleser testen**.
No model is fetched without pressing the test button and selecting a photo. The experiment is a separate, local review surface; it never saves a recipe, sends recipe pixels to an OCR service, or updates inventory. Existing confirmation and package-size guards remain authoritative.

The browser candidate uses the DHSD Tesseract model, naeyn's CTC model, and an ONNX INT8 export of EpsilonGreedy's German TrOCR-small. All variants of one model family count as one vote. Source crops and every raw reading remain visible. Agreement never means verification. Unknown package sizes remain unknown. A user can edit a source line and explicitly add it to the recipe; this resets the recipe confirmation checkbox. Recipe changes, source changes, navigation, cancellation, and a three-minute timeout invalidate the run.

This is **not yet the complete CPU prototype**: browser image resampling and automatic line detection differ, connected-component prefix recovery and the full CPU refinement/padding set are not ported, and INT8 changes individual readings. The development result of 15/16 handwritten quantities does not describe this browser candidate. The known recipes were used during development and some were included in Tesseract training; they are not a blind holdout.

Initial protected export validation on 22 existing automatic line crops: float ONNX texts matched PyTorch on all 22; INT8 differed on 7 (including a new `12.5g` reading). No ground truth was used for model generation. This check is conversion evidence, not recipe accuracy, and does not establish mobile performance.

Models are built in Pages from public source files pinned by revision and SHA-256. The original model package had an incomplete safetensors file; the original 246,430,696-byte file was re-downloaded and hash-verified before conversion. No customer photo is published in the repository or build. Model export uses a fail-closed Linux seccomp network lock before importing inference libraries. The browser uses ONNX Runtime Web WASM in a dedicated worker, not the native Python runtime. Runtime packages are vendored from hash-pinned npm tarballs, so loading the experimental reader requires no third-party CDN.

The first load is large (roughly 170 MB); test on a suitable connection. Models, runtime, license texts and the generated file hashes are served on the same origin. Cancellation terminates the inference worker. A failed or timed-out test leaves the recipe fields unchanged. Main app startup and normal OCR do not load the experimental weights.

Licenses and source notices are in `assets/rekek/quantity-test/`. The Tesseract candidate and all original crop outputs are development evidence, not independent data sets. Public model licenses are provider statements; no claim of independent legal verification is made.

Browser compatibility correction: the pinned CTC `model-fp32.onnx` export (SHA-256 `68b46411b8236b44d0d98865909d217ef13b41f12db769993c67eeb8d6e8c45a`) replaces the provider's dynamic INT8 export. The latter fails in WASM on `ConvInteger` (and contains a provider-specific quantized LSTM). FP32 uses standard ONNX Conv/LSTM operators. This is a different inference variant; previous CTC readings and the CPU quantity score are not transferred to it.

## Crop and quantity correction (17 October 2026)

The layout pass now masks a detected page edge using blue-ink-connected pixels, rejects OCR boxes unsupported by ink, and expands narrow leading fragments to neighbouring ink components. Original photo pixels remain the source for all reader crops. Tall first words receive prefix and full-line alternatives based on a fitted word-centre baseline, with a conventional median (including even sample sizes), plus white padding. These alternatives share their reader family's vote.

Unitless readings such as `200,9 frischer Lachs` no longer become numeric hints. A review draft may use `200 g` only when an actual crop reading explicitly contains that same number and unit; a combined draft is visibly labelled and all raw readings remain available. This never changes the recipe ingredients without the existing explicit addition.

Local development-photo checks before browser validation: the existing Lachsnudeln image produces 23 layout regions instead of the previous live 28, the complete onion line is retained, and a geometric prefix alternative is read as `200g` by the DHSD Tesseract candidate. These are known-photo regression checks, not a blind accuracy measurement.

A later three-reader regression showed that bare `2009` votes could still outvote the crop's explicit `200g`. Such unitless suffix-collision votes are now withheld only when an actual partial crop explicitly reads the matching gram amount; explicit conflicting quantities such as `2009 g` retain their votes. A labelled review draft selects the best-supported existing full-line ingredient tail. The complete native three-reader check of the known photo now yields a single-family `200 g` proposal and the review draft `200 g frischer Lachs`, with no numeric hint. Browser validation remains separate.
