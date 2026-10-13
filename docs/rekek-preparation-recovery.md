# Unnumbered preparation recovery candidate

When the initial OCR leaves a single recipe's preparation empty, two full-page rereads can now supply a preparation-only draft. Both reads must contain an explicit standalone preparation heading and exactly the same preparation text after whitespace normalization. At least two cooking action words and 60 characters are required. Numbered sections retain their existing path. Paragraph breaks from the first reading are preserved; different paragraph layouts remain uncertain. A repeated preparation heading is rejected. Ingredients, nutrition/tips/source headings and editor UI boundaries terminate the section.

This path fills only an empty preparation field for an unambiguous single-recipe draft. It preserves the initial name, portions and ingredient expressions. It never saves a recipe, confirms a review, repairs a number or invents step numbering. OCR agreement can still be wrong; manual comparison remains required.

Validation: existing parser, personal recipe and digit-parity checks; new import integration checks with mocked OCR/canvas cover missing or differing headings/readings, preservation of existing steps and other fields, multiple-recipe boundaries, and zero storage writes. These are behavior checks, not image-accuracy evidence.

Ten older development photos were reread with native Tesseract PSM 4/6. None produced matching explicitly labelled unnumbered preparation text. This candidate therefore has no demonstrated gain on those real images. It cannot remedy badly misread handwriting or recipes without preparation headings. The newly evaluated 20 images were not used to tune or retest this candidate. A browser WASM/phone check and independent image evaluation remain required before deployment.
