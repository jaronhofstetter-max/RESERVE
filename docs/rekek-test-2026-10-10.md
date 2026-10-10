# REKEK Teststand – 10. Oktober 2026

## Bestand

Ein künstliches, selbst verfasstes Strukturbeispiel. Noch keine geprüfte Sammlung echter Trainingsbilder, keine Modellgewichte. Strukturprüfung ist keine Bestätigung inhaltlicher Richtigkeit. Die sieben gelieferten Rezeptbilder wurden nur lokal zur Diagnose gelesen, nicht veröffentlicht oder als freigegebene Trainingsdaten exportiert.

## Ergebnisse

- Vorhandene Rezeptparser-Tests bestanden (Brüche, Einheiten, Portionen, unsichere Angaben).
- REKEK-Texttests bestanden (getrennte Mengen, explizite Alternativen, Wiederholungen, bekannte Seitentexte, Schrittüberschriften, offene Mengen).
- Datenprüfungs-Tests bestanden (Freigaben, Seitenbezüge, Trennung der Rezeptgruppen).
- Erweiterte Tests fanden Fehler bei `2½ EL` als separater Zeile und bei einer alleinstehenden Domain als Titel. Beide korrigiert und mit Regressionstests geprüft.
- Nicht eindeutig markierte Fortsetzungszeilen bleiben getrennt. Automatisches Zusammenfügen könnte eine zweite Zutat verschlucken. Das ist ein offener Layoutfehler, keine gelöste Erkennung.

## Echte Bilder

Sieben Nutzer-Screenshots mit System-Tesseract, englischem Sprachpaket und PSM 3 gelesen. Deutsches Sprachpaket ist in diesem lokalen System nicht installiert; diese Diagnose entspricht nicht der Browser-Erkennung mit Deutsch+Englisch.

Der zusammengefügte Text ergibt zwei Portionen und vier Schrittzeilen, aber 35 Zutatenzeilen und einen Logo-Text als Namen. Der Bildimport ist damit noch nicht korrekt. Es fehlen weiterhin zuverlässige Trennung von Logo/Seitenelementen, Mengen-Zuordnung bei OCR-Fehlern und Zusammenführung überlappender Seiten. Keine Genauigkeitsquote aus diesem einen Rezept ableiten.

## Nicht ausgeführte Prüfung

Der Browser-OCR-Test konnte lokal nicht starten: Playwright ist vorhanden, das Chromium-Binary fehlt. Daher keine Aussage über erfolgreich getesteten Browserimport.

## Nächste Arbeit

Bild-Testbestand mit sichtgeprüften Zuordnungen anlegen und getrennt von Lernbeispielen halten. Layoutinformationen und Zeilenpositionen nutzen; mehrseitige Überlappungen und echte Zutatenwiederholungen getrennt behandeln. Dann erneut gegen die geprüften Bildlabels messen. Die Live-App bleibt unverändert.
