# Isolated browser/phone comparison

Page: `experiments/date-comparison.html`. No account or inventory code is imported. Public runtime assets are downloaded before photo input is enabled. Inference, short-year confirmation and local result export happen on-device. The export contains no photo bytes or OCR text; physical-device use is never inferred from a mobile viewport.

This is a separate browser implementation, not a port with demonstrated numerical parity to the native 16/29 experiment. Both models use the adapted GutenOCR pipeline, WASM one thread, at most960px, without the native180-degree classifier. The existing full-token browser parser is used. Dictionaries differ by model; the v5 dictionary is extracted from checksum-pinned ONNX metadata and its trailing newline is removed before the decoder adds a space.

Build after the existing mobile runtime:

```
python3 experiments/date-comparison-build/fetch-models.py
node experiments/date-comparison-build/test.mjs
node experiments/date-comparison-build/build.cjs
```

Use the existing locked dependencies under `experiments/date-mobile-build`. Runtime manifest lists exact byte lengths and SHA256; the client verifies every file. Page CSP restricts connections to its own origin and blob/data resources. The worker receives photo bitmaps by transfer and has no photo upload or storage path. Cancellation terminates the worker; generation checks discard late responses. Every proposal needs confirmation; short-year confirmation is reported separately from an automatic match.

For a physical-phone test: open the page on the device, preferably using Wi-Fi, load models, take or choose3–5 date photos, compare each proposal with the print, and save the full date or month/year reference. Download the local JSON report. Neither a narrow desktop screenshot nor synthetic OCR fixtures count as a physical-phone accuracy test. These user-confirmed examples are not a blind test. Do not publish user photos or labels in this repository.

Sources: unchanged PP-OCRv5 models converted/distributed by RapidOCR from PaddleOCR. ModelScope release v3.9.2 and SHA256 are pinned in `fetch-models.py`; copyright Baidu/PaddleOCR and RapidOCR respectively, Apache2.0; licence texts included. V4 engine/runtime attribution remains under `assets/date-mobile-test/licenses`.

Report version 2 keeps the existing rows schema and adds a session snapshot: current phase, loading progress/time, ready/busy flags, save count, validation error, and a sanitized current result with timings and saved status. No photo, filename, raw reference input or OCR text is added. Unsaved results never count as confirmed references or matches. Explicit proposal confirmation or a short-year date-choice click now saves the reference directly; repeated clicks cannot save the same result twice. Four-digit reference years remain mandatory. Reports are local tab memory and must be downloaded before closing.


## Manual single-line pilot

`experiments/date-line.html` is a separate assisted-only test linked from the original comparison page. User draws a region, checks that it contains a single date line, and then explicitly confirms the printed date. Full-token numeric formats require a four-digit year; only exact two-reader agreement above v4 0.8/v5 0.9 yields choices. Ambiguous day/month order is a user choice; month/year stays month/year. Clock strings, compact numeric codes, lettered batch codes and mixed text are rejected. A code shaped exactly like a date cannot be distinguished from an expiry date by these rules; packaging context and user review remain necessary. This is not an automatic visual row detector.

The pilot builds its own engine bundle using the unchanged pinned library, normalization adapter and recognition weights. It invokes recognition directly on the chosen line; the existing automatic comparison engine and worker are not changed. It loads only the recognition models, dictionaries, runtime and its worker before photo input. Every file is SHA256 verified with hash-qualified fetch URLs. No account, inventory, photo upload or persistence path is added.

Reports use the distinct `reserve-mobile-date-line-v1` schema and contain sanitized attempts (including rejected/cancelled ones), crop coordinates, timings, optional explicit reviews and assisted-only flags. They contain no photo bytes, filenames or OCR transcripts and are never pooled into automatic-accuracy rows. Native diagnosis on the known user photo is not numerical parity evidence for this browser path. Physical-phone follow-up remains necessary.

The role confirmation explicitly asks the user to identify the marked field as best-before/use-by, excluding manufacture, time and batch fields. New attempts record `userConfirmedDatePurpose: expiry`; this is the user's declared purpose, not an inferred role. Exports explicitly state `dateRoleAutomaticallyInferred: false`. A separate private automatic-region experiment found a two-reader-consistent manufacture-date trap on known development images; that region proposer is not integrated or enabled by this change.
