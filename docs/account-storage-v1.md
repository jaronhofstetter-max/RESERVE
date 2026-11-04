# RESERVE account persistence - explicit trial, general release disabled

Owner authorization: 2026-11-03. Goal: inventory, personal recipes, drafts and saved dish photos survive deletion of browser site data and can be retrieved after signing in. This change uses a separate RESERVE Supabase schema; the legacy TenderHawk schema and authentication are not reused.

**General release remains disabled until real authenticated REST/Storage and browser recovery tests pass.** The explicit `https://hofilight.ch/?reserveAccountTest=1` link enables the labelled trial for that browser and retains its opt-in in `reserveAccountTestV1` so confirmation redirects and reloads work. Other browsers make no account request. The trial is not an access-control boundary: RLS and private Storage enforce ownership. Trial participants must keep independent exports and must not delete their only local copy for testing.

## Hosted setup verified 2026-11-04

- Existing free project `sqiuuoewznmlazamkvua` in `eu-west-1` is healthy. The legacy tables were inspected and retained.
- Migration `20261103190153` / `reserve_account_storage_v1` was applied. Real hosted PostgreSQL role tests passed for owner-only reads, anonymous denial, direct-write denial, stale revision/empty-state guards, missing photos and private immutable object policies. Synthetic rows were rolled back. These are not authenticated HTTP or real parallel-client tests.
- Email confirmation remains required. Site URL and exact redirect allowlist are `https://hofilight.ch/`.
- Custom SMTP uses the owner's Infomaniak Mail Starter mailbox `reserve@hofilight.ch`, sender name RESERVE, `mail.infomaniak.com:587`. The owner entered the device-specific password directly in provider settings; no credential is in this repository.
- A real OTP confirmation email reached the owner's inbox. The owner clicked it, returned to RESERVE, and Auth reports the account confirmed. This proves SMTP delivery and that confirmation redirect, not password sign-in, PKCE recovery, session renewal or account data restoration. The mailbox password is not the RESERVE account password.
- Still required before general release: two-account authenticated HTTP isolation/concurrency probes, actual registration/password recovery/session checks, and an inventory + recipe + photo browser-data deletion/re-login drill. The trial exposes the actual UI for those checks without presenting the feature as generally available.


## Prepared components

- `reserve-account-core-v1.js`: transport-independent state machine and photo digests.
- `reserve-account-storage-v1.js`: local capture/restore and authenticated HTTP adapter. Each adapter captures one immutable session token so an account change cannot reassign a pending request to the next signed-in user.
- `reserve-account-ui-v1.js`: optional email/password registration, sign-in, email recovery, status, conflict choices, local-account cache lock and sign-out. The official Supabase auth SDK owns session handling. Passwords are never added to application backups or logs.
- `supabase/reserve-account-storage.sql`: user-scoped current snapshot, ten metadata versions, compare-and-swap save function and private immutable photo storage policies.
- `experiments/account-storage/package-lock.json`: exact development SQL runtime and official auth SDK dependencies. `tools/build-account-sdk.mjs` checks the installed SDK's SHA-256 and emits the bundle only when account storage is enabled.

## Data covered and limits

The account payload contains the same allowlisted inventory/shopping/profile/product-knowledge/barcode/personal-recipe/exclusion data as `RESERVE_SYNC.snapshot()`, plus cooking progress, personal recipe text drafts and photos belonging to saved personal recipe IDs. Existing stock image strings remain part of the stock records. The separate product-community submission database, training records, unsaved file selections, analytics and authentication credentials are not included.

Snapshots are limited to 2 MiB. Recipe photos are limited to 5 MiB each and 50 MiB total per captured snapshot. Exceeding a limit blocks saving visibly; no records are truncated. These are implementation limits, not a promise that a free hosting plan supports every customer or photo volume indefinitely. Immutable uploaded objects can remain referenced by historical snapshots. Automatic photo garbage collection is deliberately not implemented, so operators must monitor quota; failed/conflicting uploads may leave private orphan objects.

The server keeps ten **metadata** versions. That retention is not an independent disaster-recovery backup or a tested restore UI. Regular independent exports remain necessary. Account snapshots synchronize whole-device data with optimistic concurrency, not item-by-item merges or realtime collaborative editing. On a conflicting revision the client stops and asks which state to retain; it never guesses a merge.

## Read before write

1. An empty browser signs in, reads its existing account row and downloads/checks all referenced photos before any local replacement. It never uploads the initial empty state over the account.
2. Existing nonempty guest data requires explicit adoption into a previously empty account. Different local and remote states require an explicit choice unless a previously acknowledged local hash proves the local copy was unchanged.
3. Each write sends the last read revision. PostgreSQL locks the row and rejects stale revisions, including simultaneous first inserts. Direct table writes are not granted to the authenticated browser role.
4. Completely emptying previously populated account data requires a separate explicit confirmation; read/network failures never enable writing.
5. Photos use the account UUID plus SHA-256 as their immutable path. A photo failure prevents snapshot commit. Downloads are checked before restoration. Local replacement rolls back its original strings and photos on failure; rollback failure is reported rather than hidden.
6. A cached owner different from the newly signed-in owner blocks synchronization. The app locks the cached-account display until the correct account is authenticated. Explicit sign-out removes the acknowledged local account copy after confirmation; server data is retained.

Local browser caches remain local data, not encryption at rest. Browser extensions, an unlocked device, XSS or developer tools can access same-origin storage. Server-side row and Storage policies, not the display lock or a client-supplied UUID, enforce remote data separation.

## Required real setup before activation

1. Connect the Supabase integration to the intended owner account. Inspect existing organizations/projects before creating anything. Stay within the approved zero-cost setup; never choose a paid plan or upgrade automatically. Confirm a project region and available free capacity.
2. Use a dedicated RESERVE project or inspect all existing table/Storage policies before reusing a project. Apply only `supabase/reserve-account-storage.sql`. It creates a private `reserve-private` bucket; ensure no pre-existing broad Storage policy grants access to this bucket.
3. Enable email authentication and keep email confirmation enabled. Set the application URL and redirect allowlist to the existing `https://hofilight.ch/`. Do not add wildcard redirect hosts. Verify registration, session renewal and password recovery in an actual browser, including expired/reset links and interrupted flows.
4. Configure an authorized production SMTP sender. Supabase's default mail service is restricted to project team addresses and is not sufficient for public customer registrations. Credentials belong in the provider's secret settings, never the repository or browser configuration. Sending account emails is a customer-initiated service action; no real customer is registered or emailed by the test fixtures.
5. Run real two-account isolation probes against both REST and private Storage using authenticated user tokens. Confirm anonymous denial, wrong-owner reads/writes, immutable object behavior, stale-revision rejection and missing-photo rejection. Test simultaneous writes using separate clients.
6. Perform the real browser-data deletion drill: save inventory, a personal recipe and an actual dish photo; close the session, clear site storage, sign in again, verify exact data and photo recovery. Also test interrupted photo upload, failed read, quota errors, offline edits, account switching and sign-out. Preserve a local export during the drill. Never use an existing customer's only copy as the test fixture.
7. Only after those checks, change the general-release `enabled:false` to `enabled:true` in `reserve-account-config-v1.js`, build the exact locked SDK and publish. Administrative/service-role keys, database passwords and SMTP credentials must never appear in this file. Confirm live account status before telling customers their data is server-backed.

## Verification included

- `node tools/test-account-sync.mjs`: deterministic state-machine regressions (empty browser, failed initial read, explicit adoption, owner mismatch, conflicting revision, explicit empty write, photo checksum/failure, cancelled old session).
- `node tools/test-account-sql.mjs`: executes the migration in PostgreSQL/WASM (PGlite) with synthetic Auth and Storage tables. Checks SQL validity, owner-only reads, anonymous denial, blocked direct writes, optimistic concurrency, private photo paths, missing objects, immutable objects and ten retained metadata versions. It is **not** a hosted Supabase Auth/Storage integration test or a parallel-client concurrency test.
- `node tools/e2e-account-storage.mjs`: real browser localStorage/IndexedDB with mocked auth and REST/Storage requests. Covers fresh-browser restoration with photos, autosave, revision conflicts, account-owner guard and failed-read write barrier. It sends no real email and does not prove provider setup or production recovery.

Commands for the dependency-backed checks:

```
npm ci --prefix experiments/account-storage --ignore-scripts --no-audit --no-fund
node tools/test-account-sync.mjs
node tools/test-account-sql.mjs
```

Browser checks use the existing production preparation and Playwright CI runtime. Experimental account dependencies are removed before publishing the Pages artifact. Outside the explicit trial, customers continue to use local data and the existing file exports; the backup label now says so explicitly.

## Primary references checked 2026-11-03

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/initializing
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/platform/free-project-pausing

Supabase Free projects can be paused after a period of low activity. Do not present this plan as an uninterrupted-availability or durability guarantee; monitoring, independent backup and an operating plan are required before a broad launch.
