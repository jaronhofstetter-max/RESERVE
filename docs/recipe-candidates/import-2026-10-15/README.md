# Drei freigegebene Originalrezepte – 15.10.2026

Nutzerfreigabe: drei zuvor gemeldete Rezepte mit Fotos einbauen; zukünftige geeignete Treffer nach Rechte-, Doppelungs- und Qualitätsprüfung automatisch übernehmen.

| Rezept | Text | Foto | Einordnung |
|---|---|---|---|
| Kaiserschmarrn | Hannes und Martina / Chuchitisch, CC BY-SA 3.0 | Autorenkonto der Quelle, CC BY-SA 3.0 | Originalfoto; Zucker und Butter als ergänzte Richtmengen gekennzeichnet |
| Grießbrei mit Milch | Wikibooks-Mitwirkende, CC BY-SA 4.0 | © Alice Wiegand / CC BY-SA 3.0 (via Wikimedia Commons) | Serviervorschlag mit Fruchtkompott; Kompott nicht eingerechnet |
| Milchreis-Grundrezept | Wikibooks-Mitwirkende, CC BY-SA 4.0 | Bananenfalter / Wikimedia Commons, CC0 1.0 | Serviervorschlag; Basis 2 aus 2–3 Personen; 225 g Reis als explizite Fassung des Bereichs 200–250 g |

Rezeptlinks und genaue Lizenzlinks stehen in `data/quality-batch-originals-20261015.json`, Fotoseiten und Fotolizenzen in `data/recipe-photo-sources.json`. Quellen- und Lizenztexte samt Abrufdatum, URLs und SHA-256 der abgerufenen Seiten sind in source-evidence.json gesichert. Chuchitisch erklärt die Lizenz separat für Text und Bilder und verlangt Eigenfotos; kein separater Fotograf ist benannt. Wikimedia Commons nennt eigene Aufnahmen von 2008 bzw. 2014 mit Urhebern. Keine KI-Bilder.

Text-Urheberschaft Wikibooks: [Grießbrei-Versionsgeschichte](https://de.wikibooks.org/w/index.php?title=Kochbuch/_Grießbrei&action=history) und [Milchreis-Versionsgeschichte](https://de.wikibooks.org/w/index.php?title=Kochbuch/_Milchreis&action=history). Titel, Mitwirkende, Quelle und Lizenz bleiben in der App-Fassung genannt. Kommerzielle Nutzung und Bearbeitung erlaubt; Änderungen kennzeichnen, Share-Alike bei Bearbeitungen und keine zusätzlichen rechtlichen oder technischen Einschränkungen. Die angepassten Textfassungen werden unter ihren jeweiligen CC-BY-SA-Lizenzen bereitgestellt. Die komprimierten CC-BY-SA-Fotos bleiben unter CC BY-SA 3.0; CC0 verlangt keine Namensnennung, der Fotograf wird dennoch genannt.

Nährwerte: `nutrition-values.json` enthält die verwendeten USDA-SR-Legacy-Datensätze pro 100 g. Reproduzierbar mit `python tools/build-originals-20261015.py`. Berechnung: essbare Gramm × Nährwert / 100 / Personen. Verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. Milch vereinfacht 1 ml = 1 g; Weichweizengrieß mit Semolina und Rundkornreis mit Mittelkornreis angenähert. Die Werte sind ausdrücklich Schätzungen; Annahmen stehen zusätzlich im Rezept. Kein erfundener Originalnährwert.
