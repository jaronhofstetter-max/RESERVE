# RESERVE MHD model pipeline

RESERVE only stores expiry photos after explicit opt-in. The browser keeps them locally in IndexedDB and never uploads them automatically. The user can export a JSON file containing confirmed dates, corrections, OCR text, and compact images.

Prepare a deterministic dataset:

```bash
node tools/prepare-expiry-dataset.mjs reserve-mhd-training-YYYY-MM-DD.json
```

The generated `training/expiry/dataset` directory contains image files plus `train.jsonl`, `validation.jsonl`, and a checksum-bearing summary. Raw user exports and generated datasets must not be committed.

A candidate model writes one JSON object per validation example:

```json
{"id":"sha256-from-manifest","predicted":"2027-11-30"}
```

Evaluate it with:

```bash
node tools/evaluate-expiry-predictions.mjs training/expiry/dataset/validation.jsonl predictions.jsonl
```

Production activation stays blocked until there are at least 200 independent validation images, every image has a prediction, and exact-date accuracy is at least 97%. Until then, local OCR and the existing vision fallback remain authoritative.
