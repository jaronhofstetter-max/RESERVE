# Datumsart und Monatsgenauigkeit im Browserpiloten v3.5

06.11.2026. Ausgangsstand: f2639239dc986c4a315e4df481566733598f4ba9 (v3.4). Der Parser für Datumswerte und seine bisherigen Bestätigungsgrenzen bleiben erhalten; die Version ist v3.5.

## Umsetzung

Worker, Bestätigungsoberfläche, manuelle Prüfung und Export unterscheiden jetzt best_before (MHD/BBE) und use_by (Verbrauchsdatum). Eine Datumsart muss ausdrücklich gewählt werden; es gibt keine Vorauswahl. Erkannte eindeutige Beschriftungen begrenzen die Auswahl. EXP allein und unbeschriftete Daten bleiben unknown und verlangen die Auswahl anhand der Packung. Nahe räumlich zugeordnete Beschriftungen werden als Hinweis berücksichtigt, nicht beliebiger Volltext. Gemischte oder widersprüchliche Angaben, Produktions-/Verpackungs-/Verkaufsdaten und reine Chargencodes erhalten keinen Haltbarkeitsvorschlag.

Der Worker exportiert nur die abgeleitete Datumsart, keine zusätzlichen OCR-Texte. recovery.js vergleicht die Datumsart mit; gleiche Datumswerte mit widersprüchlichen Arten werden beim Zusammenführen nicht stillschweigend gleichgesetzt. Bestätigte Ergebnisse enthalten dateKind zusätzlich zu date, precision und yearSource. Monat/Jahr bleibt z. B. 2031-03, ohne erfundenen Tag. Das bisherige Berichtsschema erhält dateKindSchema: 1. Vorrat und Produktionsscanner werden nicht verändert.

## Prüfungen

83 synthetische Regelprüfungen bestehen lokal, einschliesslich 36 Monatsfälle ohne ergänzten Tag sowie neuer Fälle für räumlichen Kontext und Konflikte beim Zusammenführen. Die vorhandene Regelsuite besteht ebenfalls. Der Build mit den unveränderten öffentlichen WASM-Modellen ist erfolgreich. Die E2E-Suite wurde um Datumsartauswahl bei OCR und manueller Eingabe, fehlende Auswahl, Monatsbestätigung und getrennten Export von MHD/Verbrauchsdatum erweitert. Sie verwendet echte Modelle und ausschliesslich synthetische Bilder. Der lokale Browserstart scheitert an nicht erlaubten Betriebssystem-Sockets; der vollständige Browserlauf wird deshalb im bestehenden CI-Job geprüft. Ein erfolgreicher Build oder Regeltest ist kein erfolgreicher E2E-Lauf.

```sh
node experiments/date-fields-build/test.mjs
node experiments/date-fields-build/test-date-kind.mjs
node experiments/date-fields-build/build.cjs
node tools/e2e-date-fields.mjs
```

Die Modelle und das Browserpaket werden wie in README.md vorher gebaut. Die Datumsarttests sind in PR-CI und Veröffentlichungspipeline aufgenommen. Detaillierte Einzelprüfungen können über RESERVE_SEMANTICS_RESULTS an einen lokalen Pfad geschrieben werden.

## Grenzen

Kein Training und keine neue Foto-Genauigkeitsmessung. Die synthetischen Fälle wurden bei der Entwicklung verwendet und sind kein unabhängiger Testdatensatz. Die Regex-Regeln decken nur ausdrücklich unterstützte Formulierungen ab; OCR-Fehler und andere Sprachen bleiben offene Fälle. Räumliche Zuordnung ist eine Heuristik; Bestätigung anhand der Packung bleibt erforderlich. Unknown ist keine MHD-Vermutung.

Unabhängige, manuell bestätigte neue Produktfotos müssen produktgetrennt von Entwicklung und Training ausgewertet werden. Materialgruppen Glas/Kunststoff/Folie/Karton/Metall sowie Reflexion, Krümmung, schwacher Druck und Monat/Jahr einzeln ausweisen. Metriken: exakter Datumswert einschliesslich Präzision und Datumsart, falsche automatische Übernahmen (bezogen auf alle und auf akzeptierte Fälle), Rückfragenquote sowie Median/p95-Laufzeit auf identischem Gerät, Modellladen separat. Browser-E2E ist kein physischer Handytest. Keine privaten Bilder oder OCR-Fixtures werden ins Repository übernommen.
