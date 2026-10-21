# Geprüfter Import – 21.10.2026

## Broccoli-Suppe mit glasierten Birnen

- Originalrezept und Originalfoto: https://chuchitisch.ch/recipes/261 – Hannes und Martina; Original für 2 Personen, auf eine Person umgerechnet.
- **Textrechte:** CC BY-SA 3.0 im strukturierten Originalrezept und in der Seitenfusszeile.
- **Fotorechte:** CC BY-SA 3.0 laut gesonderter Erklärung https://chuchitisch.ch/chuchitisch/lizenz für Rezepte und Bilder; dort werden eigene Fotos verlangt. Kein separater Fotograf genannt, deshalb Zuordnung nach Autorenkonto und dieser Eigene-Fotos-Regel.
- Lizenz: https://creativecommons.org/licenses/by-sa/3.0/ – kommerzielle Nutzung und Bearbeitung erlaubt; Autor, Titel, Quelle, Lizenzlink und Änderungen nennen, Bearbeitungen unter gleicher Lizenz weitergeben, keine zusätzlichen Beschränkungen.
- Bildnachweis: **Hannes und Martina / Chuchitisch · CC BY-SA 3.0 · verkleinert und WebP-komprimiert**. Originalfoto als **Serviervorschlag**; es zeigt Broccolisuppe, Birnenschnitze und Broccoliröschen, jedoch keine verlässliche Portionsgrösse. Keine KI-generierte Ersatzaufnahme.
- Alle Originalzutaten und Schritte übernommen. Das nur in der Zubereitung genannte Salz wurde als offengelegte Richtmenge ergänzt. Stückgewichte, EL/TL-Umrechnung, Öldichte und Bouillon-Näherung sind in den Rezeptnotizen dokumentiert.
- Allergene: Milch; Sellerie konservativ wegen produktabhängiger Gemüsebouillon. Produktetikett prüfen.
- Nährwerte sind reproduzierbare Schätzwerte aus USDA SR Legacy 2018: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip . Einzelwerte und Datensatzlinks in `nutrition-values.json`; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe.
- `source.json` enthält das strukturierte Original; `source-evidence.json` den bereinigten Originalseiteninhalt, Abrufdatum und HTML-SHA256. Originalfoto-URL und SHA256 stehen im Fotomanifest.
- Reproduktion: `python tools/build-broccoli-pear-soup-20261021.py`; erneute Sammlung mit `--collect /pfad/zur/SRLegacyFoods.json`.
- Bestandsprüfung: Quelle 261 und neue Rezept-ID waren weder importiert noch gemeldet. Wikimedia Commons und Pexels wurden berücksichtigt; kein zusätzlicher sicher passender Fototreffer übernommen.

## Lokale Prüfungen

- Einzelcharge strukturell und semantisch gültig: 1 approved, keine Fehler.
- Produktionsvorbereitung und Smoke-Test bestanden: 144 Rezepte und 34 geprüfte echte Fotos.
- Fotomanifest, lokale WebP-Datei, Bildnachweis, kompakter Katalog und Rezeptdetail stimmen überein.
- Unabhängige Nährwert-Nachrechnung bestanden: pro Person 364.31 kcal, 8.26 g Protein, 28.62 g verfügbare Kohlenhydrate, 22.93 g Fett und 10.15 g Ballaststoffe; alles Schätzwerte.
- `git diff --check` bestanden. Generierte Produktionsdateien und Änderungen an anderen Chargen werden nicht übernommen.
