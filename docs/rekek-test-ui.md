# Private recipe photo diagnostic

Open `https://hofilight.ch/rekek-test.html`. This standalone page is not linked
from the normal customer flow and cannot authorize calls without the owner's
separate Bearer token. The URL is public; it is not itself an access control.

The owner manually enters `REKEK_ACCESS_TOKEN` (never the provider key), selects
up to 12 JPG/PNG/WebP images totalling at most 6 MiB, and explicitly submits.
Only then does the page send the original image bytes as data URLs to the fixed
`reserve-expiry-vision.jaronhofstetter.workers.dev/api/recipe-vision` route.
There are no third-party scripts, analytics, automatic calls/retries, saved
credentials, localStorage/sessionStorage or recipe/inventory writes. The token,
photos and result are cleared when leaving the page or using the clear button.
The browser/password manager remains outside the page's storage control.

Do not enable public recipe uploads. For this owner test, the deployed Worker
must have `REKEK_ENABLED=1`, the provider secret/model, a random 32–128 character
`REKEK_ACCESS_TOKEN` secret, a future `REKEK_TEST_UNTIL` ISO timestamp and the
`REKEK_LIMITER` binding (2 requests/60s). Leave disabled until the owner is ready;
after testing set `REKEK_ENABLED=0`. Expired/missing configuration blocks calls.
The UI neither reads nor changes server settings. Limit bindings are approximate
and are not a global spending cap. This UI uses the route prepared separately
in PR #144 and manually deployed by the owner; that draft need not be merged
to serve the static page.

The comparison is manual: thumbnails open the original photo,
while output preserves quantities, fractions, nulls, page IDs and model-provided
source lines. Source lines are not independent evidence of model accuracy.
Every result is labelled unverified; nothing is corrected using plausibility.
JSON download is explicit and includes only the unverified response, never the
token or image bytes. Cancelling cannot guarantee that upstream processing or
billing has stopped. The client has a 90s deadline; the Worker has its own 60s
deadline. Neither timeout causes a retry.

Validation: `node tools/e2e-rekek-test-ui.mjs` uses Chromium at phone width and
intercepts the route with synthetic responses. It checks original image byte
transport and page ordering, separate/follow-on pages, null/fraction display,
unescaped-looking text displayed safely, disabled/expired/wrong-token/rate-limit/
provider/network failures, no retries, cancellation, size/type rejection,
credential-free export, no browser storage and clearing on page exit. This is
not an authenticated live provider test or recipe accuracy measurement.
