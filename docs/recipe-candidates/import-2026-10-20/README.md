# Geprüfter Import – 20.10.2026

## Peperoni-Apfel-Suppe nach Chuchitisch

- Originalrezept: https://chuchitisch.ch/recipes/486 – Autorenkonto Hannes und Martina. Original für **2 Personen**, auf eine Person umgerechnet. Kein Mengen- oder Portionsbereich.
- Originalfoto: http://www.chuchitisch.ch/chuchitisch/download_picture/lightroom/590_Peperoni-Apfel-Suppe.png ; lokal als WebP gespeichert. URL und SHA256 der Originaldatei im Fotomanifest.
- **Textrechte:** CC BY-SA 3.0 laut strukturiertem Originalrezept und der sichtbaren Fusszeile für Text und Bilder.
- **Fotorechte:** CC BY-SA 3.0 laut gesonderter Erklärung https://chuchitisch.ch/chuchitisch/lizenz , die ausdrücklich Bilder einschliesst und eigene Fotos verlangt. Kein separat genannter Fotograf; Urheberzuordnung beruht auf Autorenkonto und dieser ausdrücklichen Regel, nicht auf einer erfundenen EXIF-Angabe.
- Lizenz und Bedingungen: https://creativecommons.org/licenses/by-sa/3.0/ . Kommerzielle Nutzung und Bearbeitung zulässig; Autor, Quelle, Lizenzlink und Änderungen nennen. Bearbeiteten Rezepttext und bearbeitetes Foto unter derselben Lizenz weitergeben; keine zusätzlichen Beschränkungen. Daraus folgt keine pauschale Lizenzierung des gesamten App-Codes.
- Bildnachweis: **Hannes und Martina / Chuchitisch · CC BY-SA 3.0 · verkleinert und WebP-komprimiert**, mit Quellen- und Lizenzlink.
- Visuelle Prüfung: orangefarbene pürierte Suppe, Basilikum und Kürbiskerne entsprechen dem Gericht. Originalfoto als **Serviervorschlag**; keine Aussage, dass die Schüssel eine genaue Rezeptportion zeigt. Kürbiskerne und Basilikum sind bereits eingerechnet. Keine generierte Ersatzillustration; Authentizitätsgrundlage ist die Originalquelle mit ihrer Eigene-Fotos-Erklärung.
- Alle 11 Originalzutaten und Arbeitsschritte erfasst; Handgriffe und Garmerkmale gegliedert. Ergänzte Stückgewichte und EL-Umrechnungen vollständig in `prepNotes` und `nutritionEstimate.basis` offengelegt. Peperoni = Gemüsepaprika, nicht scharfe Chili; rote Farbe als konkrete Variante ausgewählt.
- Hauptallergen Milch; Sellerie konservativ wegen produktabhängiger Gemüsebouillon. Produktetikett prüfen. Honig bleibt enthalten, daher nicht vegan.
- Nährwerte geschätzt mit USDA SR Legacy 2018: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip . `nutrition-values.json` enthält verwendete Werte und individuelle Datensatzlinks. Generische Gemüsebrühe als offengelegte Annäherung an Bouillon; Gesamt-Kohlenhydrate minus Ballaststoffe ergeben verfügbare Kohlenhydrate.
- Reproduktion ohne Netz: `python tools/build-pepper-apple-soup-20261020.py`. Erneute Quellensammlung: `python tools/build-pepper-apple-soup-20261020.py --collect /pfad/zur/SRLegacyFoods.json` (nur solange noch nicht im Fotomanifest vorhanden).
- `source.json` sichert das strukturierte Original; `source-evidence.json` sichert sichtbaren Seiteninhalt, Abrufdatum und SHA256 der jeweiligen HTML-Antwort. Abruf über erreichbare HTTP-Originalseiten; Quellenlinks in der App verwenden HTTPS.
- Bestandsprüfung: weder Quelle 486 noch neue Rezept-ID im vorhandenen Fotomanifest oder den Rezeptchargen vorhanden. Verwandte Suppen sind eigenständige Rezepte.

Andere Quellen berücksichtigt: Commons-Fotoseite Birchermuesli TLodico (CC0) und aktuelle Pexels-Lizenz erneut gelesen; daraus kein neuer Fotoimport. Keine Rechte aus blossen Suchvorschauen abgeleitet.

## Lokale Prüfungen

- Einzelcharge strukturell und semantisch gültig: 1 approved, keine Fehler.
- Produktionsvorbereitung und Smoke-Test bestanden: 143 Rezepte, 33 geprüfte Fotos.
- Fotomanifest, WebP-Dateien, Bildnachweise, kompakter Katalog und nachgeladene Details stimmen überein.
- Unabhängige Nährwert-Nachrechnung bestanden: pro Person 460.07 kcal, 12.34 g Protein, 44.33 g verfügbare Kohlenhydrate, 24.89 g Fett, 10.46 g Ballaststoffe; alles Schätzwerte.
- `git diff --check` bestanden. Generierte Produktionsdateien und Änderungen an anderen Rezeptchargen werden nicht übernommen.
