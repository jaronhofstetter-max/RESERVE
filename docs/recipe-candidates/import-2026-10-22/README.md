# Geprüfter Import – 22.10.2026

## Rüäbli-Suppä

- Originalrezept und Originalfoto: https://chuchitisch.ch/recipes/28 – Autorin **Annet**; Original für 2 Personen, auf eine Person umgerechnet.
- **Textrechte:** CC BY-SA 3.0 im strukturierten Originalrezept und in der Seitenfusszeile.
- **Fotorechte:** CC BY-SA 3.0 laut gesonderter Erklärung https://chuchitisch.ch/chuchitisch/lizenz für Rezepte und Bilder; Chuchitisch verlangt eigene Fotos. Kein separater Fotograf genannt, deshalb Urheberzuordnung nach Autorenkonto und Eigene-Fotos-Regel.
- Lizenz: https://creativecommons.org/licenses/by-sa/3.0/ – kommerzielle Nutzung und Bearbeitung erlaubt; Autorin, Titel, Quelle, Lizenzlink und Änderungen nennen, Bearbeitungen unter gleicher Lizenz weitergeben, keine zusätzlichen Beschränkungen.
- Bildnachweis: **Annet / Chuchitisch · CC BY-SA 3.0 · verkleinert und WebP-komprimiert**. Originalfoto als **Serviervorschlag**: Petersilie und Toaststäbchen sind nicht Bestandteil der Grundfassung und nicht eingerechnet. Bei Toast Gluten ergänzen. Keine KI-generierte Aufnahme.
- Alle Originalzutaten und Schritte übernommen. Salz nach Geschmack transparent mit einer Richtmenge angesetzt. 5 dl und 7½ cl korrekt in ml umgerechnet; Frischkäse- und Bouillon-Näherungen dokumentiert.
- Allergene: Milch; Sellerie konservativ wegen produktabhängiger Gemüsebouillon. Foto-Toast ist nicht Bestandteil des Rezepts.
- Nährwerte als reproduzierbare Schätzung aus USDA SR Legacy 2018: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip . Einzelwerte und Links in `nutrition-values.json`; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe.
- Quellenbelege: `source.json`, `source-evidence.json` mit Abrufdatum und HTML-SHA256; Originalfoto-URL und SHA256 im Fotomanifest.
- Reproduktion: `python tools/build-carrot-soup-20261022.py`; erneute Sammlung mit `--collect /pfad/zur/SRLegacyFoods.json`.
- Bestandsprüfung: Quelle 28 und neue Rezept-ID waren nicht vorhanden. Wikimedia Commons und Pexels berücksichtigt; kein zusätzlicher sicher passender Fotoimport.

## Prüfung

- Einzelrezept: `validate-recipes.mjs` bestanden (1/1 approved).
- Gesamter Produktionsaufbau: 145 approved Rezepte; Smoke-Test bestanden.
- Fotokonsistenz: 35 lokale, geprüfte Echtfotos; Manifest, Credits, Katalog und Detailshards stimmen überein.
- `git diff --check` ohne Fehler; das erzeugte WebP wurde zusätzlich visuell gegen das Originalmotiv geprüft.
