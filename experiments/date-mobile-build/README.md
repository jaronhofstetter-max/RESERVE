# Isolated RESERVE phone test

Build-only source for `/experiments/date-mobile.html`. No production scanner,
inventory, learning upload or automatic activation. The independent validation
gate in `training/expiry/README.md` remains unchanged.

```
npm ci --prefix experiments/date-mobile-build --ignore-scripts --no-audit --no-fund
python3 experiments/date-mobile-build/fetch-models.py
node experiments/date-mobile-build/test.cjs
node experiments/date-mobile-build/build.cjs
```

The public PyPI wheel and extracted PP-OCRv4 det/rec weights have pinned SHA256
checksums. The build imports no Python ML runtime. npm dependencies are lockfile-pinned.
The static OpenCV binding and model normalization adaptations are explicit in source.
This is a different pipeline from native RapidOCR and excludes its180degree classifier.
Runtime licenses are published with the generated assets. Large generated files are
ignored in git and created during CI. No real photos or OCR datasets are published.

On explicit preparation, the page fetches only same-origin, checksum-verified static
runtime assets. Cache Storage contains only these public files. Photos are processed
as ImageBitmaps in a disposable worker, never uploaded or saved in Cache Storage.
Only explicitly confirmed date/role reviews and timings enter the manually downloaded
JSON export; no images or raw OCR. Nothing is automatically transmitted or persisted.

Recognition uses a dedicated worker and OffscreenCanvas. The main thread enforces a
10second limit by terminating the worker; late results cannot fill the next photo.
Initialization has a separate30second bound. Preparation and inference can be cancelled.
The normal browser file capture picker supplies camera and gallery controls; no
getUserMedia is called. A physical Android camera test is still required; a desktop
or emulated test must not be reported as a physical-device test.

## Phone-timeout diagnosis (19 October)

The physical-phone export contained ten 10-second timeouts and no predictions.
It does not locate the bottleneck and cannot measure OCR accuracy. This page is
an isolated experiment, not the production scanner.

Detector input now has a 960 px longest-edge bound (previously 1600); aspect
ratio is preserved and small inputs are not enlarged. At the old maximum this
reduces input pixel count by 64%. That is a workload bound, not a measured
latency or accuracy gain. Small text can lose detail; retest the same photos.
Weights, normalization, threshold, role selection and 10-second watchdog remain
unchanged. The first inference is still cold (no unreported warmup).

JSON schema `reserve-date-mobile-review-v2` adds preparation events separately
from each photo's diagnostic events, with elapsed milliseconds, last stage,
input dimensions and line count only. Stages cover image decode/dispatch,
worker resize/pixel extraction, detector preprocessing/inference/postprocessing,
recognizer preprocessing/inference/decoding, and date selection. A timeout
retains the last stage received; its time is message-arrival time on the main
thread, not an exact profiler measurement. Recognition inference/decoding can
repeat per line. No raw OCR, image bytes, filenames or exception text are added
to exports. Late messages from terminated workers remain ignored.

Run `node tools/test-date-mobile-diagnostics.mjs` for deterministic lifecycle and
worker checks. CI also runs the real-WASM browser test. Neither substitutes for
a repeat on the physical phone; no timeout cure or new accuracy is claimed.

Changed app/worker URLs carry a release suffix; stale runtime-cache entries are
checksum-checked, removed and revalidated once transparently. A second invalid
response still fails closed. Unchanged assets remain reusable.

## Geometric date-region candidate

The default `full` control remains unchanged. `regions` selects at most 24
text boxes only when the detector finds more than 24. Eight geometric seeds
are scored by letter height, isolation and aspect ratio; neighbours include
possible role cues and competing stamps. This is a heuristic proposal, not a
trained date detector. No filenames, dates, confirmed labels or OCR text enter
the planner. Small pages and invalid geometry use all boxes.

A partial read ALWAYS clears `strict_expiry`, including explicit inline MHD
cues, because omitted regions may contain competing dates or roles. Remaining
suggestions require manual review. Full-page role and parser rules are unchanged.
The 10s watchdog is unchanged. No production scanner is changed.

Per-row strategy and coverage counts permit paired exports. Recognized text
can be opened locally in the result details for diagnosis; it is NOT included
in JSON exports, uploaded or persisted. No photo or reference label is published.
The build manifest identifies that a region path is available; per-row strategy
states which path actually ran. Tests include bounded geometry and a real-WASM
dense synthetic case, but do not establish real-image accuracy or phone speed.

## Local numeric date-order evidence

Separated four-digit numeric dates now parse both valid DMY and MDY orders.
Ambiguous dates keep both candidates until a nearby, unambiguous, calendar-valid
printed date with the same separator establishes an order. Evidence and target
must have confidence >= .90, be on the same local text row or aligned neighbouring
rows (at most four character heights). The source must establish order (equal
day/month does not), be a complete token, and not be labelled as lot/batch/charge.
Conflicting nearby orders prevent resolution. Locale and reference labels do not
participate. No two-digit-year policy changes.

Order resolution neither assigns an expiry role nor selects the latest date.
Unknown competing dates remain unconfirmed; partial region reads still clear
strict_expiry. Exports add the date-order module hash and resolution counts, but
no source text. This experimental page continues to require user review.

Malformed numeric date chains no longer contribute shorter month/year pieces
(e.g. invalid 31.02.2020 cannot yield 02.2020). The numeric parser and order
resolver each have a separate export hash for reproducible comparisons.
