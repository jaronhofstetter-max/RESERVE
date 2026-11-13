# Einstieg nach der Anmeldung

RESERVE startet auf einer begrüßenden Übersicht statt automatisch im Profil. Die primäre Aktion öffnet die bestehende Produkterfassung. Vorrat und Rezeptsuche sind direkt erreichbar. „Bald fällig“ verwendet vorhandene Vorratsdaten und die bestehende Datumspolitik; leere Bestände werden ausdrücklich als leer angezeigt.

Eine eingeklappte, freiwillige Kurzeinrichtung speichert Personen, Ernährungsweise und Allergien über die bestehende Profilfunktion. Alle weiteren Einstellungen bleiben im Profil. Personen, Ernährung, Allergien, Abneigungen, Ziel und maximale Kochzeit haben sichtbare Beschriftungen. Der Allergiehinweis zeigt die wesentliche Eigenprüfung immer und Details zum Filter bei Bedarf.

Der Kontostatus bleibt sichtbar in der Kopfzeile. Feedback steht im Seitenfluss im Footer. Beide verdecken keine Formularfelder. Der Testbetrieb und bestehende Wiederherstellungswarnungen bleiben erkennbar.

Nach expliziter erfolgreicher Anmeldung öffnet sich Start, auch wenn zuerst Kontodaten wiederhergestellt und die Seite neu geladen werden. Ein Sitzungsrefresh unterbricht keine laufende Bedienung. Vorhandene Kontosperren und Datensicherungsmechanismen bleiben erhalten.

## Prüfung

- Neue Browserprüfung: Testbetrieb startet auf Home, Ansichten 320/390/1280 px ohne horizontalen Überlauf, Produkterfassung, Vorrat und Rezeptsuche, freiwillige Einrichtung mit persistierten Werten, sichtbare Profilbeschriftungen, echte Vorratsdaten, Kontostatus im Seitenfluss.
- Bestehende Tests: Startaufbau bei verzögerten Modulen und Wiederholung, Zurücknavigation, Feedback und allgemeine RESERVE-Funktionen.
- Kontotest: Anmeldung im frischen Browser, Wiederherstellung von Vorrat/Rezepten/Fotos, Autosave, Konflikte, Kontotrennung und Schreibsperre nach Lesefehlern. Auth und Netzwerk sind Testdoubles; keine echten Kontodaten wurden verwendet.
- Ansicht: [Mobile Startseite mit synthetischem Vorrat](welcome-home-mobile.png).
