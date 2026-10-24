# Visual date-region prior v1 — rejected experiment

This model ranks existing OCR text regions from their pixels and geometry. It is
not imported by the browser or production app. The existing full-image path stays
the control. Partial reads must never produce a strict expiry suggestion.

Training actually ran on 981 real ExpDate training photos: 6,934 crops, including
2,214 date views (1,107 annotations with one padding augmentation), annotated
non-date fields and disjoint random background crops. No synthetic photos, source
test photos, or historical RESERVE photos entered training. Group intersections
between training, internal validation and protected source groups are zero under
the preserved source grouping; this does not prove independent products.

The classifier is StandardScaler plus balanced L2 logistic regression on 564
features: normalized gradient histograms, gray projections and crop geometry.
It uses no OCR text, date values or target boxes at inference. `model.json`
contains its actual learned coefficients, feature scaling and intercept. Three
regularization choices were compared on 40 fixed internal photos. The selected
model classified 43/45 date crops and 130/131 other crops correctly at score zero;
these cropped-field results are not end-to-end MHD accuracy.

The 24-region policy keeps eight seeds, their neighbours and then remaining ranked
regions. Only seed scores change from the existing geometric policy. The Python
geometric control was checked against the current JavaScript implementation on six
proposal sets (0, 1, 24, 25, 64 and 100 boxes).

| Preserved native OCR boxes | Full | Geometric 24 | Learned 24 |
| --- | ---: | ---: | ---: |
| 81 internal photos: date boxes retained / 92 | 87 | 87 | 87 |
| 100 source test photos: date boxes retained / 110 | 105 | 104 | 105 |
| 100 source photos: correct interpreted suggestions | 76 | 75 | 76 |
| Wrong suggestions | 4 | 4 | 4 |
| No suggestion | 20 | 21 | 20 |

The predeclared acceptance criterion required an internal retention improvement.
It failed, so the learned model was rejected **before** the protected comparison.
The one-field protected improvement does not reverse that decision. No phone
speed or browser image-recognition improvement has been established.

Current JavaScript date interpretation replayed on these native OCR caches yields
24 unsuccessful source cases: 8 date-order/role selection, 8 interpretation despite
a matching normalized printed transcription, 3 without a cached OCR box covering
the target, and 5 OCR-text/source-transcription mismatches. These diagnostic buckets
are proxies, not independently hand-verified root causes. The public-source tests
are reused regression tests, not fresh customer blind tests. Cached native boxes
have already passed text-confidence filtering and differ from browser detections.

## Reproduce

Use Python with numpy, pillow and scikit-learn. The recorded run used the versions
in the result package's `environment.json`. No native ONNX runtime is needed.

Materialize the existing `RESERVE-Datum-KI-Paket-18-10-2026.zip` and image shards
01–03. Keep the earlier `date-detector-v1/data-manifest.json` and
`date-text-v1/ocr-offline/` unchanged. Use a fresh output directory:

```sh
python tools/train-expiry-region-prior-v1.py train --manifest MANIFEST --archives ARCHIVES --ocr-cache CACHE --output OUTPUT
python tools/train-expiry-region-prior-v1.py internal --manifest MANIFEST --archives ARCHIVES --ocr-cache CACHE --output OUTPUT
python tools/train-expiry-region-prior-v1.py protected --manifest MANIFEST --archives ARCHIVES --ocr-cache CACHE --output OUTPUT
node tools/audit-expiry-region-prior-v1.mjs AUDIT_ROOT OUTPUT
```

`AUDIT_ROOT` contains `extracted/date-detector-v1/` and
`extracted/date-text-v1/`. Reports preserve individual predictions, membership,
protocol and hashes. No personal photos or OCR cache are committed here.

ExpDate attribution, source license and modifications are recorded in
`ATTRIBUTION-ExpDate.md`. This experiment crops, pads and resizes source images and
learns a new linear model; no previous pretrained weights were used.
