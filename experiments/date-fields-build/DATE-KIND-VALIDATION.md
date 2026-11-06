# Datumsart und Monatsgenauigkeit: isolierter Prüfstand

Stand: 06.11.2026. Unveränderte Vergleichsbasis: f2639239dc986c4a315e4df481566733598f4ba9 (Browserpilot v3.4). Die ursprünglichen fields.js-, test.mjs-, orientation.js- und recovery.js-Dateien wurden über Git-Blob-Prüfsummen gegen diesen Commit geprüft. Kein OCR-Aufruf, Training oder Eingriff in die laufende App.

## Ergebnis

Die vorhandene Regelsuite besteht. Zusätzlich bestehen 78 synthetische Prüfungen: 36 Monat/Jahr-Fälle, 23 Beschriftungsfälle, acht ungültige Datums-/Codefälle, vier widersprüchliche Leserpaare und sieben Bestätigungs-/Schutzfälle. Alle 36 Monatsfälle behalten in Baseline und Kandidat dieselben Datumsoptionen und werden ohne Tag bestätigt. Der Kandidat unterscheidet best_before und use_by ausdrücklich. Produktion, Verpackung, Verkaufsfrist und reine Chargencodes werden als eigene Kategorien erkannt und als Haltbarkeitsvorschlag blockiert. EXP allein bleibt unknown. Gemischte Beschriftungen werden konservativ blockiert.

Der bisherige Parser hat eine gemeinsame expiry-Rolle; die Bestätigung liefert bisher date, precision und yearSource, jedoch keine getrennte Datumsart. Die neue Datei date-kind.js ist ein isolierter Kandidat, kein neuer automatischer Leser. Sie verwendet unverändert agree und confirmChoice, erhält deren Konfidenz-, Format-, Zusatz- und Strukturprüfungen und verlangt zusätzlich eine ausdrückliche Auswahl zwischen MHD und Verbrauchsdatum. Die Datumsart wird im Ergebnis gespeichert. Ein Wechsel entgegen einer eindeutigen Beschriftung ist blockiert.

## Wiederholung

Im Projektkontext mit ES-Modulen:

```sh
node experiments/date-fields-build/test.mjs
node experiments/date-fields-build/test-date-kind.mjs
```

Optional schreibt RESERVE_SEMANTICS_RESULTS die detaillierten Einzelprüfungen an einen gewählten lokalen Pfad. Die Tests erwarten keine zusätzlichen Pakete oder Modelle.

## Grenzen und nächster Einbau

Diese 78 Fälle sind Entwicklungsprüfungen, kein unabhängiger Testdatensatz und keine Bildgenauigkeit. Es gibt keine neue Trefferquote auf RESERVE-Fotos, keine Messung der Rückfragenquote oder Handygeschwindigkeit und keinen Beleg für bessere Punktmatrixerkennung. Regex-Regeln decken nur ausdrücklich getestete Formulierungen ab. OCR-Fehler können Beschriftungen zerstören oder verändern. Der Kandidat ordnet noch keine räumlich getrennten Beschriftungen zu und darf nicht auf beliebig zusammengefügten Volltext angewandt werden. Datumsregion und zugehöriger Kontext müssen vor dem Einbau nachvollziehbar zugeordnet werden. unknown verlangt weiterhin eine manuelle Datumsartauswahl. Die getestete französische und italienische Unterscheidung ist sprachbezogen, keine allgemeine Mehrsprachigkeitsgarantie.

Der Kandidat ist noch nicht an worker.js, app.js oder Export angeschlossen und wird nicht durch die bestehende CI automatisch aufgerufen. Vor Veröffentlichung müssen UI-Auswahl, Übergabe des Beschriftungskontexts, Export und Browser-Ende-zu-Ende-Prüfungen ergänzt werden. Dabei müssen bestehende Export-Datensparsamkeit und Bestätigungsgrenzen erhalten bleiben. Die Aufnahme in den Standardtestlauf gehört zur Integration.

Die neuen Regeln wurden gezielt an diesen synthetischen Fällen entwickelt. Zur unabhängigen Bewertung sind bislang unbenutzte, manuell bestätigte Produktfotos nötig, produktgetrennt von Entwicklung und Training. Materialien Glas/Kunststoff/Folie/Karton/Metall, Reflexionen, Krümmung, schwacher Druck und Monat/Jahr separat ausweisen. Messen: exakter Datumswert einschließlich Präzision und Datumsart, falsche automatische Übernahmen (alle Fälle und akzeptierte Fälle), Rückfragenquote, Median-/p95-Laufzeit auf identischem Gerät, Modellladen separat. Der getestete Kandidat übernimmt grundsätzlich nichts automatisch.

Die bereits vorliegenden Tesseract-Ergebnisse aus dem separaten Bericht vom 06.11.2026 werden nicht erneut als neue Tests gezählt. Die dort geprüften Varianten lieferten keine zusätzlichen Zieltreffer; daraus folgt hier kein Anlass für einen Austausch des OCR-Lesers.
