# REKEK 0.1 – Rezept-Erkennung und korrekte Einordnung

## Was läuft

Lokale Verarbeitung mit der vorhandenen Browser-OCR, ohne neu eingeführten kostenpflichtigen KI-Dienst. Der Parser verbindet einzelne Mengenzeilen mit dem folgenden Zutatentext, erhält explizite Alternativen und echte Wiederholungen, filtert bekannte Seitenelemente und trennt nummerierte Schritte. Nicht zuordenbare Mengen bleiben zur Prüfung sichtbar. Der Editor zeigt eine kurze Anzahl unsicherer Zutaten und bereinigt veraltete Warnungen beim Öffnen eines neuen Rezepts.

`window.RESERVE_REKEK` stellt Version und Parser bereit. Das bestehende Rezeptformat bleibt kompatibel.

## Trainingsvorbereitung

`training/recipes` enthält das Format für Seiten, OCR, erwartete Zutaten und Schritte, Quelle, Freigaben und Prüffragen. Der Prüfer erkennt fehlende Belege, ungültige Mengen, fehlende Seiten und dieselbe Rezeptgruppe in mehreren Splits.

```sh
node tools/test-rekek.mjs
node tools/test-recipe-training.mjs
node tools/check-recipe-training.mjs training/recipes/examples/synthetic.json
node tools/export-rekek-training.mjs training/recipes/examples/synthetic.json
```

Der letzte Befehl exportiert geprüfte `train`-Beispiele als JSONL. `validation`, `test` und `review` werden nicht als Trainingsdaten exportiert. Einheiten wie EL/TL werden unverändert erhalten; es wird kein Grammgewicht geraten.

## Stand und Grenzen

Es gibt noch keine trainierten REKEK-Modellgewichte. Die Prüfungen verwenden künstlichen Text und belegen keine Trefferquote auf beliebigen Rezeptfotos. OCR-Lesereihenfolge bei Spalten, mehrseitige Überlappungen und nicht eindeutig markierte Zeilenumbrüche sind weiterhin offene Probleme. Die existierende manuelle Prüfung bleibt erforderlich.

Für ein eigenes Modell fehlen ein hinreichend großer rechtlich geeigneter, überprüfter Bestand, ein separater Bild-Testbestand und eine gemessene Baseline auf echten Bildern. Zuerst die typischen Fehler dieses Bestands erfassen; dann entscheiden, ob Layoutzuordnung, OCR oder beides gelernt werden müssen. Änderungen hier liegen auf einem Entwicklungszweig; keine Veröffentlichung in die Live-App.
