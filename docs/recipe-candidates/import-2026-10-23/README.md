# Geprüfter Import – 23.10.2026

## Schweizer Gerstensuppe

- Originalrezept und exakt passendes Originalfoto: https://chuchitisch.ch/recipes/494 – **Hannes und Martina**; Original für 4 Personen, auf eine Person umgerechnet.
- **Textrechte:** CC BY-SA 3.0 im strukturierten Originalrezept und in der Seitenfusszeile.
- **Fotorechte:** CC BY-SA 3.0 laut gesonderter Erklärung https://chuchitisch.ch/chuchitisch/lizenz für Rezepte und Bilder; Chuchitisch verlangt eigene Fotos. Kein separater Fotograf genannt, deshalb Urheberzuordnung nach Autorenkonto und Eigene-Fotos-Regel.
- Lizenz: https://creativecommons.org/licenses/by-sa/3.0/ – kommerzielle Nutzung und Bearbeitung erlaubt; Urheber, Titel, Quelle, Lizenzlink und Änderungen nennen, Bearbeitungen unter gleicher Lizenz weitergeben, keine zusätzlichen Beschränkungen.
- Bildnachweis: **Hannes und Martina / Chuchitisch · CC BY-SA 3.0 · WebP-Komprimierung**. Das Foto zeigt exakt die Suppe mit den enthaltenen Gemüsewürfeln und Schnittlauch; kein Serviervorschlag und keine KI-Aufnahme.
- Alle neun Originalzutaten und vollständigen Arbeitsschritte übernommen. Salz und Pfeffer aus der Zubereitung transparent mit Richtmengen ergänzt. Stück- und Bundgewichte, Einheitenumrechnung sowie USDA-Näherungen dokumentiert.
- Allergene: Gluten, Milch und Sellerie; Bouillonetikett auf weitere Allergene prüfen.
- Nährwerte als reproduzierbare Schätzung aus USDA SR Legacy 2018: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip . Einzelwerte und Links in `nutrition-values.json`; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe.
- Quellenbelege: `source.json`, `source-evidence.json` mit Abrufdatum und HTML-SHA256; Originalfoto-URL und SHA256 im Fotomanifest.
- Reproduktion: `python tools/build-barley-soup-20261023.py`; erneute Sammlung mit `--collect /pfad/zur/SRLegacyFoods.json`.
- Bestandsprüfung: Quelle 494 und neue Rezept-ID waren nicht vorhanden. Wikimedia Commons und Pexels berücksichtigt; kein besserer, rechtssicherer und exakt passender Fototreffer nötig.

## Prüfung

- Einzelrezept: `validate-recipes.mjs` bestanden (1/1 approved, keine Warnung).
- Gesamter Produktionsaufbau: 146 approved Rezepte; Smoke-Test bestanden.
- Fotokonsistenz: 36 lokale, geprüfte Echtfotos; Manifest, Credits, Katalog und Detailshards stimmen überein.
- `git diff --check` ohne Fehler; das erzeugte WebP wurde zusätzlich visuell gegen das Originalmotiv geprüft.
