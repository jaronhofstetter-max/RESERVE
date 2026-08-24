# TenderHawk 0.6 ranking smoke test

- Preserve all 0.5 panels and print report flow.
- Load `data/projects.json` from the same relative path.
- Re-rank after company profile changes.
- Show reasons and risks beside each opportunity.
- Keep original SIMAP links and analysis buttons.

The ranking layer is additive (`ranking-v06.js`) so the existing 0.5 flow remains the fallback if the ranking layer fails to load.
