# RESERVE Rezeptstandard

Jedes veröffentlichte Rezept muss diese Felder enthalten:

- `id`: eindeutige, stabile ID in Kleinbuchstaben
- `name`: Anzeigename
- `type`: `Frühstück` oder `Hauptmahlzeit`
- `diet`: `Alles`, `Vegetarisch` oder `Vegan`
- `dish`: Symbol/Visual-Fallback
- `cuisine`: Küchenstil/Herkunft
- `mealTimes`: mindestens eine passende Tageszeit
- `prepMinutes`: Vorbereitungszeit in Minuten
- `cookMinutes`: Kochzeit in Minuten
- `difficulty`: `Sehr einfach`, `Einfach`, `Mittel` oder `Anspruchsvoll`
- `allergens`: Liste deklarierter Allergene
- `tags`: Such- und Empfehlungsbegriffe
- `ingredients`: mindestens zwei Zutaten mit `name`, `amount` und `unit`
- `steps`: mindestens zwei verständliche Kochschritte
- `nutrition`: `kcal`, `protein`, `carbs`, `fat`, `fiber`
- `status`: nur `approved` wird Kunden empfohlen

## Zulässige Einheiten

`g`, `ml`, `Stück`

Die App normalisiert Vorratsangaben wie kg → g und l → ml.

## Qualitätsregeln

Ein Rezept wird nur aktiv verwendet, wenn die automatische Prüfung erfolgreich ist. Die Prüfung kontrolliert Pflichtfelder, eindeutige IDs, Mengen, Einheiten, Nährwerte, Kochzeiten, Ernährungsform und Freigabestatus.

Neue Datensätze sollen zuerst mit `status: "draft"` angelegt, geprüft und erst danach auf `approved` gesetzt werden. Dadurch kann die Datenbank bis auf 10'000 Rezepte wachsen, ohne ungeprüfte Datensätze in Empfehlungen einzumischen.
