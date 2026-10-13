# REKEK v4 browser quantity review

A local worker loads the 546,344-byte digit model only when a quantity is reviewed. The browser CNN matches five saved PyTorch logit fixtures (maximum absolute error below 0.001). Recipes and pixels are not uploaded. The model is a 10-class integer digit reader; complete fraction interpretation is not validated.

The recipe editor offers **Menge am Bild prüfen** for a close-up. Unclear ingredient quantity crops also receive an advisory digit reading during column rereading. The reading is displayed separately; ingredient expressions and confirmation remain unchanged. Worker/model failures and an eight-second timeout retain manual entry. Wide or unreadable groups return ambiguity instead of a guessed joined-number split.

This release intentionally does not auto-apply the experimental vertical-cut heuristic: a known 250 was misread as 256 with misleadingly high scores. Full fraction reconstruction, new independent writers, and a reliable confidence calibration remain open. The new workflow does not imply general recipe accuracy.

Training: BHMSDS digits, https://github.com/wblachowski/bhmsds (MIT, Copyright 2019 wblachowski; notice retained in assets/rekek/BHMSDS-LICENSE.txt). Earlier training used Alpaydin, E. & Kaynak, C. (1998), Optical Recognition of Handwritten Digits, UCI, https://doi.org/10.24432/C50P49, CC BY 4.0 https://creativecommons.org/licenses/by/4.0/. Private reviewed printed quantity examples were used for authorized internal development; no private source photographs are included in the app or repository. Public BHMSDS fixtures are normalized/preserved for numerical and browser workflow tests, 2026-10-13.

Validation: numerical model parity, blank/malformed input guards, real worker inference on a public handwritten image, unavailable-model fallback, no field write or automatic confirmation, existing parser/column-review regressions. Numerical tests are not model accuracy tests. Browser full-page Tesseract OCR depends on its external runtime/language downloads; report those failures separately from this worker.
