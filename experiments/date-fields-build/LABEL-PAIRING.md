# Slanted label/date pairing (v3.6)

A confirmed private development example produced both the best-before month and the separate sell-by month as best-before offers in v3.5. Its image, OCR text and reference values are not stored in this repository.

The old role scorer used axis-aligned Y centres plus a horizontal-gap penalty. A long unrelated label could win over a shorter same-row label, especially when the package text was slanted. This is a demonstrated mechanism on synthetic layouts; it is not yet proof of the entire causal chain on the private photograph.

`label-distance.js` projects centres along and perpendicular to the label's detected quadrilateral baseline. Perpendicular distance drives the ranking. Horizontal gap only breaks near ties, within a bounded neighbourhood. Conflicting nearby roles remain ambiguous. Nearby fragment grouping also uses the printed baseline and keeps the resulting quadrilateral oriented. A composed label can supply evidence only to its member lines. The observed OCR spelling `Sel by` is accepted as a narrow sell-by exclusion, without broader fuzzy matching. Date parsing, recognizers, confidence gates, user confirmation, missing-year handling and monthly precision remain unchanged. No year prefill is added.

Validation: 61 synthetic geometry/grouping assertions and the existing date/type suites pass locally. In a separate synthetic comparison, v3.5 assigns 8/20 roles correctly and the candidate assigns 20/20. These are constructed development examples, not independent accuracy measurements. The browser E2E now includes an actual-OCR rotated sell-by/best-before pair with different label widths. Its CI result and the repeated private-image test must be checked before describing the private error as fixed.

Commands:

```sh
node experiments/date-fields-build/test-label-distance.mjs
node experiments/date-fields-build/test.mjs
node experiments/date-fields-build/test-date-kind.mjs
node experiments/date-fields-build/build.cjs
node tools/e2e-date-fields.mjs
```

Limits: paired quadrilateral geometry can still be wrong when OCR omits labels, merges unrelated lines, returns distorted boxes or sees several columns. This does not establish a general material-specific improvement. Private test pictures stay outside the public repository. The 35 previously reserved pictures are not used to develop this change.
