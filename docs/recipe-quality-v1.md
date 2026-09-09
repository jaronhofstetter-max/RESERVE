# RESERVE Recipe Quality v1

This quality pass upgrades approved recipe delivery without rewriting ingredient amounts or recipe identity.

The build enriches missing detail fields for approved recipes before validation and merge: description, equipment, preparation notes, doneness cues, substitutions, leftovers guidance and food-safety guidance.

A dedicated audit then fails CI and production builds if any approved recipe still lacks one of those detail fields. Short cooking steps remain reported separately for a later editorial pass so this first hardening phase does not invent or rewrite cooking instructions automatically.

Resilience metadata remains governed by the existing recipe validator and is intentionally not guessed by the enrichment step.
