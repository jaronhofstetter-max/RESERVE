# Personal recipes: manual entry

As of 2026-11-02, the owner paused REKEK and removed the customer recipe reader. Home and Search still open **Meine Rezepte** in the existing RESERVE app. Customers enter the title, original portion count, ingredients and preparation themselves.

Ingredients can be added with separate amount, unit and name fields, or edited directly in the one-ingredient-per-line list. Fractions such as `1½` remain literal input. Empty quantities/units are allowed for unmeasured ingredients; unknown package weights are never invented. An unfinished helper entry is saved with the draft and blocks recipe saving until added or cleared. Times, diet, source and further details remain optional. Dish photos can still be attached after saving; they are stored, never used as reader input.

The editor no longer offers screenshot/photo/PDF recognition, OCR extraction, REKEK draft import, digit-photo tests or word/quantity suggestions. No image/PDF reader is loaded or exposed by the personal-recipes API. The deterministic `applyText` helper remains for existing integrations/tests; it has no customer import control and performs no image recognition. Quantity/unit parsing remains necessary for manual ingredients and inventory calculations.

## Existing data

Storage identities are unchanged: `reservePersonalRecipesV1`, `reservePersonalRecipeDraftsV1`, and IndexedDB `reservePersonalRecipePhotosV1`. Saved recipes, IDs, ingredient lines, details and photos stay readable and editable. Old drafts without helper fields load with those fields empty; old raw text stays accessible in a read-only legacy-text section. No bulk deletion or data migration.

Text drafts are saved locally during edits and when leaving. Dish photos use the existing separate flow. Full cookbook export/restore includes metadata and photos. General RESERVE backup retains metadata; complete photos use cookbook export. This does not add a new cloud-sync guarantee.

Supported, confirmed recipes join the existing collection. EL=15 ml and TL=5 ml for pantry math; no g/ml conversion or invented container weights. Unresolved quantities can be saved but remain outside automatic stock consumption until resolved. Portion controls, dietary checks, exclusions and cooking progress remain.

## Delivery and scope

Pages and PR injection omit digit-assist, PDF-reader and quantity-test scripts. Production no longer builds the experimental recipe models or downloads the recipe PDF runtime. REKEK-only workflows are disabled with source retained for a possible restart. Published files omit the diagnostic pages, assist/worker modules and model assets. MHD/expiry recognition remains a separate feature.

The remote expiry Worker is not redeployed here. No change to its environment variables or recipe endpoint is claimed. Removing browser entry points does not delete a remote server route.

## Validation

`tools/e2e-personal-recipes-manual.mjs` exercises manual entry, partial drafts, save guards, edit/reload, mixed fractions, unknown packaging, dish photos, cooking consumption, escaping, legacy drafts, cookbook export/restore, search, responsive layout and no reader network requests. Existing quantity-parser and recipe-preference regressions remain applicable. The manual-flow regression replaces historical OCR integration checks in production and PR CI. Archived reader design is in personal-recipes-ocr-history.md.
