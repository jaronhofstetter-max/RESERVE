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
