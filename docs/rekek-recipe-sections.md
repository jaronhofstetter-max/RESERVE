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
