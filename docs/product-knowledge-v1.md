# Shared product knowledge

`RESERVE_PRODUCT_KNOWLEDGE` is the common local product record. Barcode identity takes priority; products without a barcode use the exact normalized name. Pantry batches retain expiry, remaining stock and package counts. Those values are not training labels and never become product defaults.

Each product field carries its value, source, time and either `suggested` or `confirmed` state. Catalog search and OCR remain suggestions. A successful scan save, manual save or pantry correction confirms product fields. Later catalog results cannot replace confirmed fields. Repeat scans keep one current confirmed example per product, rather than counting duplicates as new evidence.

The canonical quantity is content **per package**, not total pantry stock. Photos stay in their existing stores; the common resolver selects the preferred own photo, a confirmed product image, then other existing image sources. Original image framing stays unchanged.

The optional “Für Rezepte zuordnen” field explicitly connects a product to a cooking ingredient. Matching by a product name uses this correction only when all products with that name agree, preventing a barcode correction from being applied to an ambiguous name. Empty or unknown assignments do not infer ingredients from a broad category.

The existing barcode-memory API is maintained as a compatibility projection. Existing corrections are imported without deleting original data. Product knowledge and its compatibility projection are included in ordinary backups. Own photo blobs remain subject to their existing photo storage/export mechanisms; the JSON backup does not newly export them.

## Repeatable checks

Run `node tools/test-product-knowledge.mjs`. It reads `data/benchmarks/product-knowledge-v1.json` and writes `build/product-knowledge-benchmark.json`. The fixture contains 31 manually specified category and ingredient cases, plus checks for provenance, quantity separation, persistence, migration, corrections and photo priority. CI also runs `tools/e2e-product-knowledge.mjs` against the production build.

Passing these cases is a regression result, **not** a real-world recognition accuracy figure. These confirmed examples are local product memory, **not an automatically retrained model**. Before model training, collect consented, reviewed real product examples and reserve a separate test set, split by product/barcode to prevent duplicate leakage. Date recognition needs its own independent photo test set. No customer data is uploaded by this module.
