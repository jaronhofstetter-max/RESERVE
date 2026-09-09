# RESERVE pre-launch readiness

Goal: do not start paid promotion until a new user can understand and use RESERVE without help.

## Launch blockers

- Remove all legacy HOEFLIGHT branding from visible UI, document title and metadata.
- Replace demo pantry defaults with a clean first-run state/onboarding flow.
- Add a public privacy page and provider/contact information before public promotion.
- Harden allergy handling and keep a clear user-facing verification warning for allergens.
- Run the complete mobile journey on Android/Chrome and iPhone/Safari: first start → profile → pantry → expiry → recipe → weekly plan → shopping → purchase/consumption.

## Pilot gates

- Keep unverified recipe images hidden.
- Add a simple feedback route for pilot users.
- Add privacy-respecting product analytics before spending on advertising so visits, activation and drop-off can be measured.
- Pilot with 10–20 external users before paid acquisition.

## Automated audit

Run `node tools/audit-launch-readiness.mjs`. A failing audit means paid promotion is not launch-ready. Warnings identify remaining manual/legal checks.

This audit intentionally does not claim legal compliance or food-allergy safety; those require explicit review beyond string-level automated checks.
