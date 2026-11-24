# Explicit review of OCR month precision

Two local photo regressions produced repeated but wrong monthly results: a printed full date `08.03.2027` became `2027-03`, and `12.2012` became `2015-12`. Repeating one OCR engine across image treatments does not independently verify either precision or year.

Monthly OCR results now open an explicit review before filling the product field. The customer can correct month/year and must confirm that no day is printed. If a day is printed, the normal full-date field remains available. The existing pending-choice guard blocks adding the product until the review is resolved or the date is entered manually. The review is invalidated by a new scan, reset, or different product identity. Cloud results with month precision follow the same review path.

Daily and monthly candidates with the same internal month-end date keep separate votes. Mixed printed precisions and year-only readings require manual review rather than an invented complete date. A confirmed month is stored/displayed with month precision; its internal month-end value remains available to the existing inventory calculations. Unambiguous complete-day dates retain their existing behavior.

Checks:

```sh
node tools/test-month-confirmation.mjs
node tools/test-expiry-real-formats.mjs
node tools/test-expiry-recognition-timeout.mjs
node tools/test-short-year.mjs
node tools/e2e-month-confirmation.mjs
node tools/e2e-short-year.mjs
```

Browser tests use the recorded OCR strings, not uploaded product photos or external OCR services. They check the actual field, correction controls, missing confirmation, submit guard, product changes, reset, cloud-month fallback, mixed-precision votes and an unchanged full-day case. This is a guard against unconfirmed automatic filling, not a correction to the OCR model and not an accuracy estimate. Every monthly OCR result now needs an extra confirmation, including correct ones. A user can still confirm an incorrect reading, and full-day OCR errors remain possible.
