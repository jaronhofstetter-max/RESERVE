# RESERVE expiry OCR v0

This is a synthetic-only research checkpoint, not a production model.

- Training: 2,000 deterministic synthetic images, seed `20260921`
- Holdout: 300 separate synthetic images, seed `20261022`
- Stock English OCR exact-date accuracy: 5.00% (15/300)
- RESERVE v0 exact-date accuracy: 28.67% (86/300)
- Stock date detection rate: 13.00% (39/300)
- RESERVE v0 date detection rate: 39.00% (117/300)
- Real validation images used: 0
- Production eligible: no

Activation remains blocked until at least 200 independently photographed,
human-confirmed real validation images reach at least 97% exact-date accuracy.
