# Recipe section parsing (0.6.4)

Recipes with an inline heading (`Zubereitung: …`) or an instruction sentence
after an ingredient list now put that text into preparation rather than keeping
it in ingredients. Purpose labels such as `1 Eigelb zum Bestreichen` remain
ingredients. Literal amounts, missing units and ambiguous ranges are preserved
for review.

The parser recognizes ingredient subsections such as `Teig`, `Belag`, `Füllung`
and `Creme`. The flat `ingredients` output remains compatible with the existing
editor. `ingredientSections` additionally exposes the original subsection
names and their lines; this metadata does not change saved cookbook records.

For collections without explicit `Zutaten` headings, short titles followed by
at least two quantity rows can identify separate recipes. Subsection labels
are excluded from that rule. Incomplete candidates keep the existing
`recipe-boundaries-uncertain` review path rather than silently merging recipes.
Literal nutrition summaries such as `10 g Ballaststoffe p.P.` are excluded
from the ingredient list.

Validation: existing parser and quantity regressions, dedicated section tests,
and mobile browser editor/import checks. These are functional/regression tests,
not an independent image OCR benchmark or a model-training result. No changes
to Tesseract, digit weights, source-image quality or automatic confirmation.


## OCR recovery changes in 0.6.5

Decorated headings now open ingredient lists even when an OCR icon precedes the heading. Title selection skips serving, timing, nutrition and social UI metadata while preserving wrapped titles. Implicit quantity lists use the same ingredient/preparation transitions as explicit lists. Ingredient/action lines preserve the source instruction and also retain the measured ingredient prefix. Seasoning labels and quantity-containing ingredient continuations are not treated as implicit new recipe titles. Repeated source ingredients remain separate.

Low-confidence OCR or unreadable quantity expressions trigger the existing reread path. A reread does not replace an already populated ingredient/preparation pair solely because two alternative texts agree. Disagreeing rereads explicitly ask for amounts, fractions, times and temperatures to be reviewed; numeric OCR values are never repaired from recipe plausibility or private references.

Validation: existing parser regressions and new generic layout regressions; mobile import, candidate selection/review, split-column and digit-worker browser checks. Replaying the same 97 recorded first-pass OCR texts reduces uncertain boundary rejections from 14 to 9 and increases pages with at least one candidate containing preparation from 42 to 50. These are parser output counts, not accuracy or 97 new image tests. Eight targeted original-image browser imports were rerun with digit assistance available. Handwritten fractions, titles and temperatures remain unreliable. No model was trained, and no accuracy claim or live deployment follows from these checks. Private photographs/reference texts remain outside the repository.
