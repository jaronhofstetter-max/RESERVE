# RESERVE Rezept-Lernbereich

Dieser Bereich bereitet geprüfte Daten für die lokale Rezepterkennung vor. Er trainiert noch kein Modell und verändert die Live-App nicht.

## Ablauf

1. Bilder und OCR-Ausgabe in `private/` ablegen (nicht in Git veröffentlichen).
2. Ein Rezept nach `examples/synthetic.json` beschriften. Mengen und Einheiten exakt übernehmen; Unlesbares als `null` mit einer offenen Frage erfassen. Keine erfundenen Mengen oder Nährwerte.
3. Bildstellen für jede Zutat und jeden Schritt angeben: Seite und optional Begrenzungsrahmen in Pixeln. Originalzeile, Lebensmittelname, Menge und Einheit getrennt halten. Abschnittsnamen erhalten; echte Wiederholungen nicht entfernen.
4. Quelle und Freigaben für Text und Bilder getrennt dokumentieren. Ungeklärte Beispiele bleiben in `review`; sie werden nicht für Training exportiert.
5. Nach Sichtprüfung `reviewStatus` auf `verified` setzen. Nur Beispiele ohne offene Fragen und mit belegter Trainingsfreigabe sind zugelassen.
6. Mit `node tools/check-recipe-training.mjs training/recipes/examples/synthetic.json` prüfen. Mehrere JSON-Dateien können gemeinsam geprüft werden.

## Lern- und Testtrennung

`split`: `train`, `validation`, `test` oder `review`. Alle Bilder und Varianten desselben Rezepts müssen dieselbe `recipeGroup` und denselben Split erhalten. Auch verwandte Kopien desselben Rezepts gemeinsam zuordnen. Testbilder niemals zur Regeloptimierung oder zum Training benutzen. Für ein bereits zur Entwicklung verwendetes Beispiel ist `train` passend.

Zu messen sind: korrekte Zutaten-Mengen-Zuordnung, Portionen, Vollständigkeit der Schritte, fälschlich übernommene Seitentexte und erfundene Angaben. Der Strukturprüfer misst keine Bilderkennungsgenauigkeit.

## Startbestand

`synthetic.json` ist ein selbst verfasstes Strukturbeispiel, kein Nachweis realer OCR-Leistung. Fremde Rezept-Screenshots werden hier nicht öffentlich abgelegt. Der private Arbeitsordner dient der Prüfung; eine dauerhafte private Bildablage muss vor dem Aufbau eines größeren Bestands eingerichtet werden.
