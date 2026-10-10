# REKEK 0.2 – Entwicklungsvergleich

Datum: 10. Oktober 2026. Ein bereits zur Entwicklung verwendetes Rezept, sieben Screenshots. Kein unabhängiger Testbestand; keine allgemeine Genauigkeitsquote.

| OCR-Konfiguration | Parser | Zutaten exakt / 18 | Ausgegebene Zutatenzeilen | Zeiten korrekt |
|---|---|---:|---:|---|
| Englisch, PSM 3 | 0.1 | 5 | 35 | Nein |
| Englisch, PSM 3 | 0.2 | 5 | 28 | Ja |
| Deutsch + Englisch, PSM 3 | 0.1 | 11 | 29 | Nein |
| Deutsch + Englisch, PSM 3 | 0.2 | 14 | 21 | Ja |
| Deutsch + Englisch, PSM 6 | 0.1 | 5 | 9 | Nein |
| Deutsch + Englisch, PSM 6 | 0.2 | 5 | 9 | Ja |

Exakt bedeutet Lebensmittelname nach konservativer Textnormalisierung, Menge und Einheit; echte Wiederholungen werden als getrennte Vorkommen gezählt. Die englische Baseline ist nicht mit dem vorhandenen Browserimport Deutsch+Englisch gleichzusetzen. System-Tesseract ist ebenfalls kein Browser-Benchmark.

## Änderungen

- Zeitwerte über einer gemeinsamen Vorbereitungs-/Kochzeitzeile zugeordnet; Zeitzeile nicht als Zutat übernommen.
- Offene Klammern und explizite Fortsetzungen nach „mit“, „oder“, „und“ verbunden.
- Bund als ausdrücklich gedruckte Einheit erhalten; kein Grammgewicht geschätzt.
- Mengenlose Zutaten bleiben unquantifiziert.
- Bekannte Logos und einfache Steuerzeichen entfernt.
- Durch Leerzeilen abgesetzte Zutatenzusammenfassungen unter Schritten von Kochtext getrennt. Ein direkt formulierter Kochsatz mit Menge bleibt erhalten.

## Prüfung und Grenzen

REKEK-, bisherige Parser- und Trainingsstrukturtests bestanden. Zusätzliche Regressionstests decken Zeitspalten, Klammerfortsetzungen, mehrzeilige Saucennamen und die Abgrenzung mengenhaltiger Kochsätze ab.

Der Rezepttitel ist weiterhin falsch; kein Kochschritt ist als kompletter Text exakt korrekt. 21 ausgegebene Zutatenzeilen bei 18 erwarteten Vorkommen zeigen zusätzliche Einordnungsfehler. OCR verliest unter anderem Bruchzeichen und `80 g`; solche Zeichen werden nicht anhand des Sollrezepts zurechtgeraten. Mehrseitige Überlappungen sind offen.

Kein Modelltraining durchgeführt. Änderungen nur auf dem Entwicklungszweig; keine Live-Veröffentlichung. Private Bilder und Rezepttexte werden nicht ins öffentliche Repository übernommen.
