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
