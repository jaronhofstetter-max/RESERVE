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

## Synthetic pretraining data

Generate deterministic, RESERVE-owned training images with varied date formats, dot-matrix printing, contrast, glare, noise and packaging-like surfaces:

```bash
node tools/generate-synthetic-expiry-dataset.mjs training/expiry/synthetic 2000 20260920
```

Synthetic images are always marked `synthetic: true` and `split: train`. They must never enter validation or test sets. Only independently photographed and confirmed real packages count toward the 200-image/97%-accuracy production gate.

## Reproduce the local OCR v0 baseline

The v0 experiment fine-tunes the official float `eng.traineddata` from
`tesseract-ocr/tessdata_best`. Pass that file explicitly so the compact system
model is never mistaken for a trainable model:

```bash
tools/train-expiry-tesseract-v0.sh /path/to/tessdata_best/eng.traineddata
```

The script creates 2,000 synthetic training images and a separate 300-image
synthetic holdout, trains a local model, and benchmarks both stock English OCR
and the RESERVE candidate. Generated images, checkpoints, and model binaries
remain ignored. The first reproducible v0 run improved exact synthetic-holdout
accuracy from 5.00% to 28.67%; it is an experiment, not production approval.
