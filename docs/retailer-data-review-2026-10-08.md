# Retailer product data: review of 8 October 2026

## Current result

No retailer licence or private API access has been obtained. No new Migros, Coop or ALDI product records or images have been collected for production or model training in this change. Public page inspection was used to assess the sources, not as permission to build a commercial catalog.

- **Migros / Migipedia:** Public product pages are useful discovery sources. The official response by Philipp_Migros on the [product API discussion](https://migipedia.migros.ch/de/forum/migipedia/is-there-an-api-for-migros-product-data) says access was not being granted at the time. The reply is approximately one year old; it does not establish current availability. The [legal notice](https://www.migros.ch/de/content/rechtliche-hinweise) returned a JavaScript-only shell during this review, so its complete text was not verified. Do not substitute Migros Magazine or employment-site terms for the product site's terms. [Official contact](https://help.migros.ch/hc/de).
- **Coop:** Product pages show structured product facts, but no official reusable data licence or public developer access was verified during this review. [Official contact](https://www.coop.ch/de/unternehmen/kontakt.html).
- **ALDI SUISSE:** The [official usage terms](https://www.aldi-suisse.ch/de/informationen/nutzungsbedingungen) restrict the services to private use and prohibit commercial/business use of their content. Separate permission remains necessary for the proposed retailer-content integration.

Third-party scraping API offers appeared in research, but no retailer grant was demonstrated by those offers. None has been connected or purchased.

## Prepared import

`data/retailers/sources.json` records findings and separate permissions for commercial product display, image display and model training. All real sources remain pending or restricted.

Run `node tools/import-retailer-catalog.mjs <feed.json> <sources.json> <catalog.json>`. Approved sources require a separately reviewed rights document and its SHA-256 fingerprint. Evidence documents can stay outside the public repository. A boolean flag does not itself establish legal permission; the manifest is completed only after a real grant has been reviewed.

Each product requires a valid GTIN checksum, reviewed identity, exact retailer source URL and retrieval date. A retailer's internal article number is not accepted as a GTIN. Duplicate barcode records require review. Images are dropped without image permission. Display permission does not imply training permission. Evidence paths and metadata are references; confidential grant contents must not be published in the site directory.

The generated catalog is currently empty. The build activates its local browser lookup only when approved records exist, so this preparation adds no retailer scraping or extra browser fetches today. Future reviewed records are still product suggestions; the shared product-knowledge layer protects the customer's confirmed corrections and keeps source provenance.

Tests: `node tools/test-retailer-catalog.mjs`, ordinary product-knowledge tests and the production browser suite. The tests use synthetic fixtures, not licensed retailer samples.

## Ready-to-send request text (not sent)

**Subject: Product-data access for RESERVE — barcode, packaging and ingredients**

Guten Tag

Wir entwickeln RESERVE, eine Schweizer Vorrats-App. Sie hilft Haushalten, vorhandene Lebensmittel zu nutzen und unnötige Einkäufe sowie Lebensmittelverschwendung zu vermeiden.

Wir möchten Ihre Produkte anhand des EAN/GTIN eindeutig erkennen und bestätigte Produktangaben in der App verwenden. Bieten Sie hierfür einen freigegebenen Datenfeed, API-Zugang oder eine entsprechende Partnerschaft an?

Benötigt werden GTIN, Produktname, Marke, Packungsinhalt, Verpackungsart, Zutaten, Allergene und Nährwerte. Bitte teilen Sie uns auch mit, ob Produktbilder angezeigt und die Daten oder Bilder für das Training unserer Produkterkennung verwendet werden dürfen. Diese Nutzungen können getrennt vereinbart werden.

Welche Bedingungen gelten für Speicherung, Aktualisierung, Quellenangabe, Weitergabe an App-Nutzer und allfällige Kosten? Falls Sie nicht zuständig sind, bitten wir um Weiterleitung an die verantwortliche Stelle für Produktdaten oder digitale Partnerschaften.

Vielen Dank und freundliche Grüsse
RESERVE
