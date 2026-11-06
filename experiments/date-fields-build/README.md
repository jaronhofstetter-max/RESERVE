# Isolated browser date-fields pilot v3

Build after the existing mobile/comparison model fetches and builds:

```
node experiments/date-fields-build/test-date-kind.mjs
node experiments/date-fields-build/test.mjs
node experiments/date-fields-build/build.cjs
node tools/e2e-date-fields.mjs
```

Serves `experiments/date-fields.html`. Runtime files are hash-verified before a photo can be selected; detection and both readers initialize before inference. Photos stay in memory. No inventory, training or account writes. Export is an explicit download of timings, derived choices and user reviews, with no photos, filenames or raw OCR lines. All attempts, including unreviewed, cancelled and timed-out attempts, remain in the current-session report. Reload does not persist a session. Exports leave the physical-device test status unknown (`null`); device context is not automatically verified.

Ported date/role/confirmation rules retain month precision, missing-year checks, explicit interpretation choice, expiry-purpose, suffix and single-reader-structure confirmation. Two compact readings never establish a date. Production cues are excluded; unknown role always requires checking the pack.

This is a browser adaptation, not native-image-pipeline parity or independent accuracy evidence. GutenOCR/WASM preprocessing, estimated CTC positions, global histogram equalization and a one-mask morphology fallback differ from RapidOCR/CLAHE/multi-mask pixel rows. Detection is bounded to 64 lines, six date lines per orientation, source at most 1920 pixels, detector at most 960 pixels, and directions 0/180/90/270. Pixel fallbacks at 0/180 are bounded to six candidates. Every result requires review. No private photo or private OCR fixture belongs in this repository.

The public E2E uses only generated synthetic images and actual local WASM models. Physical phone speed and real-product accuracy must be measured separately. The existing comparison and assisted-line pages remain separate baselines.

Version v3.5 records best_before/use_by separately. The type selector has no default, including for manual entries. Nearest spatial label evidence is retained as a type hint; conflicting types block an offer. EXP alone is unknown. No raw label text is added to exports. Recovery consensus also compares date type, and deduplication cannot silently discard a conflicting type. The existing report schema gains dateKindSchema: 1; confirmed targets include dateKind.

Version v3.6 compares label centres perpendicular to the detected text baseline. Horizontal separation is a bounded tie-breaker within the existing neighbourhood. This handles slanted labels without preferring a longer unrelated line merely because it ends closer to the date. Nearby row grouping uses oriented quadrilaterals; composed evidence only labels its own members. The observed `Sel by` OCR variant is also excluded as sell-by. The date parser, recognizers, thresholds, missing-year policy and confirmation requirements are unchanged. Run `node experiments/date-fields-build/test-label-distance.mjs`; the browser E2E also covers a rotated sell-by/best-before pair.
