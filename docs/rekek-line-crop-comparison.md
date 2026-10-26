# Local full-raster versus manual-line diagnostic — 26 October 2026

The pinned German TrOCR checkpoint in `tools/rekek-german-model-lock.json` was
run on the same two existing handwritten 596 × 842 PNGs as the earlier local
reader comparison. It was run on two complete rasters and 35 manual text-line
crops, with no training, paid API or inference network access. The publisher
explicitly documents this model for coherent text lines/phrases and not
multiline input. The full-page arm therefore probes an input-format mismatch;
it is not a comparison against a specialized full-page reader.

## Observed result

- Whole page 12: `Normalen`; whole page 17: empty output.
- The cropped source line `60 g sehr weiche Butter` was read exactly.
- All three handwritten quarter amounts on page 12 were read as `14`, not
  `1/4`. Word errors remain as well.
- The cropped `125 g Mehl` line on page 17 became `12.SG. unde`.
- The remaining preparation/title lines produce more text but retain errors.
  A fluent or longer output is not evidence of a correct recipe.

Eleven ingredient checks were selected by visual source inspection before
inference. Their references are provisional assistant transcriptions, not user
verified full-page gold data. Seven leading numeric values match these targets,
but only one of eleven checks matches its quantity, expected unit and ingredient
word together. `100%` does not count as grams; misspelled ingredient names and
`14` fractions are not repaired. The corresponding whole-raster outputs match
none of these eleven targets. These are narrow diagnostic field checks, not
recipe success, independent accuracy or a general benchmark percentage.

## What this establishes

Manual line crops make this line reader substantially more usable as a text
reader than giving it a whole page. They do not make either recipe reliable.
Automatic line detection was not tested: human-set boxes remove that source of
error and represent an assisted-input diagnostic. There is no production model
integration or automatic acceptance of these outputs.

The next quality gate must address fraction errors and complete ingredient
assignments, then evaluate automatic segmentation and new, fully verified pages.
No quantity should be corrected using recipe plausibility.

## Evidence and reproduction

Private source images, manual geometry, all crop pixels, original token IDs/raw
transcripts, environment/model/input/code hashes and the provisional checks are
retained in the private report bundle, outside this published repository. Boxes
were visually reviewed and frozen before inference; reference text was not
sent to the model. All 37 cases reached EOS before the 384-token limit.

The first run's EOS metadata checker incorrectly handled a list-valued EOS ID.
This metadata-only bug was corrected and the identical input/model/generation
run was repeated. All raw strings and token sequences matched exactly. Both
original runs are retained; no prediction was overwritten or manually repaired.

Execution used Torch 2.9.0 CPU, Transformers 4.57.1, Pillow 11.3.0 and
SentencePiece 0.2.1, float32, four CPU threads and greedy decoding. The model's
inherited no-repeat-ngram setting was 3, and its cache setting was false. About
18 seconds of CPU inference on this environment excludes downloads/model load
and is not phone latency. Networking was blocked at OS level before library
imports through `tools/rekek_strict_offline.py`.

```sh
python3 tools/rekek_strict_offline.py tools/run-rekek-line-crop-comparison.py /PRIVATE/MODEL /PRIVATE/manifest.json /PRIVATE/new-run
python3 tools/score-rekek-line-crop-comparison.py /PRIVATE/new-run /PRIVATE/new-checks.json
python3 tools/test-rekek-line-crop-comparison.py
```

The runner verifies the pinned model/source/crop hashes and the crop pixels,
refuses overwrite and refuses output inside the published checkout. The scorer
allows case/spacing/punctuation differences in literal name matching and a
small explicit unit alias list. It does not perform fuzzy word correction.

Model card and revision (AFL-3.0 declared by publisher):
https://huggingface.co/EpsilonGreedy/TrOCR_small_german_handwritten/blob/8a47330344ecaa97da08880a5223cfcb6ebdd844/README.md
