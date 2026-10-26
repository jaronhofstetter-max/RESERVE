# Local pretrained reader diagnostics — 2026-10-25

Two existing handwritten recipe-page rasters were read with four fixed local
reader configurations. The private pages and original outputs are retained
outside this public repository. They are previous development/diagnostic pages,
not an independent blind set. There are no complete verified page references
in this run, so no overall accuracy or recipe-success percentage is reported.

## Executed readers

| Reader | Fixed configuration | Observed limit |
| --- | --- | --- |
| Tesseract, existing baseline German weights | Native CLI 5.3.4, PSM 3, 2 threads | One empty transcript; the other page has unusable words and no complete recipe structure. |
| Tesseract, existing adapted German weights | Same CLI configuration and same input rasters | One empty transcript; the other retains some quantities but has incorrect/missing ingredient names and no preparation. |
| PaddleOCR-VL-1.6 | Native Transformers 5.0.0, BF16 CPU, 4 threads, `OCR:`, greedy generation, 1024-token limit | Reads substantially more text; outputs `12.5g.` at a source `125 g` location and misreads ingredient names. |
| Qwen3-VL-2B-Instruct | Same Transformers/Torch runtime, BF16 CPU, 4 threads, literal German transcription prompt, greedy generation, 1024-token limit | Reads `125g.` at that location, but misreads the associated ingredient name; other names/counts are wrong too. |

All four configurations use the exact same two 596 × 842 pixel PNGs. Neither
native CLI configuration reproduces the browser's additional preprocessing
and crop passes. Paddle's native Transformers example is an element recognizer
used on the full raster here; it is **not** the publisher's complete layout
pipeline. Qwen is a general vision-language model prompted for transcription.
These are different diagnostic readers, not a controlled ranking of all
production OCR products.

Paddle also emits explicit superscript/subscript typography such as `¹/₄`.
That raw expression represents a fraction, but the current downstream parser
does not normalize those digit forms. This is a parser-compatibility limit and
must not be counted as a missing optical fraction merely because the parser
leaves it unresolved. A correct isolated number does not prove its ingredient
assignment is correct.

Missing portions remain absent. No package masses, nutrition or extra cooking
instructions were filled in. Neither model was trained or fine-tuned here.
Neither reader was integrated into automatic production recognition.

## Timing and execution evidence

Paddle generation took about 17.18 and 23.73 seconds; Qwen took about 39.21 and
58.29 seconds. These local CPU timings exclude model loading and do not measure
mobile/app latency. Qwen's recorded process peak RSS was about 4.71 GiB.
All four VLM outputs ended with an EOS token rather than exhausting the token
limit. Code, model, manifest and input hashes were frozen and verified. Image
inference ran behind the existing OS network lock, using local assets and
`trust_remote_code=False`. No private page was uploaded to an inference service.

Initial setup failures (relative-path bookkeeping, an image-array/tensor type
mismatch in the native Paddle processor, and a missing Qwen processor dependency)
were preserved separately and are not treated as recipe-reading results.
The type adaptation only converts processor arrays to Torch tensors; it does
not repair pixels, numbers, words or predictions.

## Reproduction

Use a separate Python environment. The executed runtime used Torch 2.9.0 CPU,
Transformers 5.0.0 and SentencePiece 0.2.1; Qwen additionally used TorchVision
0.24.0 CPU. The exact remaining runtime versions are in the private freeze.

Model assets are downloaded by revision and every file is checked against the
public lock files. The downloader also verifies an already cached copy without
making a request. Keep models and all private data outside the published tree:

```sh
python3 tools/prepare-local-recipe-reader.py paddle /ABS/OUTSIDE-CHECKOUT/paddle-vl
python3 tools/prepare-local-recipe-reader.py qwen /ABS/OUTSIDE-CHECKOUT/qwen3-vl
python3 tools/rekek_strict_offline.py tools/run-local-recipe-reader.py /ABS/OUTSIDE-CHECKOUT/paddle-vl /ABS/PRIVATE/manifest.json /ABS/PRIVATE/paddle-run --reader paddle
python3 tools/rekek_strict_offline.py tools/run-local-recipe-reader.py /ABS/OUTSIDE-CHECKOUT/qwen3-vl /ABS/PRIVATE/manifest.json /ABS/PRIVATE/qwen-run --reader qwen
```

The input manifest uses the schema in `rekek-page-evaluation.md`. This probe
accepts diagnostic/synthetic single-raster cases only and leaves references
unscored. Output folders cannot be overwritten. Each case retains the original
transcript, generated token IDs, elapsed time, token-limit/EOS information and
the unchanged existing parser's output. Do not tune the probe to the two pages
and relabel the result as a blind test.

The original Paddle run was made with the standalone script retained at
`tools/run-paddle-vl-diagnostic.py`; its frozen source checksum identifies that
exact version. The generalized runner does not imply the earlier run was repeated
under a later runtime or code version.

## Decision and remaining work

The local candidates do not justify automatic quantity acceptance. Further
handwriting training is not the next step. The already prepared stronger
service-backed reader needs a real image test, followed by 30 audited new pages
with verified references. Evaluate complete ingredient assignments and steps,
not just digit detection or a fluent-looking transcript.

The existing RESERVE expiry service was previously set up in the Cloudflare
dashboard with an OpenAI secret. Its current source and configuration need to
be read before safely extending it for recipe extraction. This repository
does not contain that service source or a deployment credential. The local
tests do not establish that the previous secret/configuration is still current.

Public model cards declare Apache-2.0. Notices and downloaded LICENSE files
were retained in the local model snapshots; no audit of all pretraining sources
is claimed:

- https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6
- https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct
