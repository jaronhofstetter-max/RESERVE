# RESERVE Rezeptstandard

RESERVE setzt bei Rezepten auf korrekte, ausführliche Kochinformationen statt auf generierte Fantasiebilder. Rezeptbilder sind optional; fehlende Bilder werden durch neutrale Symbole und strukturierte Informationen ersetzt.

Jedes veröffentlichte Rezept muss diese Felder enthalten:

- `id`: eindeutige, stabile ID in Kleinbuchstaben
- `name`: Anzeigename
- `type`: `Frühstück` oder `Hauptmahlzeit`
- `diet`: `Alles`, `Vegetarisch` oder `Vegan`
- `dish`: neutrales Symbol/Visual-Fallback
- `cuisine`: Küchenstil/Herkunft
- `mealTimes`: mindestens eine passende Tageszeit
- `prepMinutes`: Vorbereitungszeit in Minuten
- `cookMinutes`: Kochzeit in Minuten
- `difficulty`: `Sehr einfach`, `Einfach`, `Mittel` oder `Anspruchsvoll`
- `allergens`: Liste deklarierter Allergene
- `tags`: Such- und Empfehlungsbegriffe
- `ingredients`: mindestens zwei Zutaten mit `name`, `amount` und `unit`
- `steps`: mindestens zwei verständliche Kochschritte
- `nutrition`: `kcal`, `protein`, `carbs`, `fat`, `fiber` pro Person
- `status`: nur `approved` wird Kunden empfohlen

## Erweiterter Qualitätsstandard

Neue und überarbeitete Rezepte sollen zusätzlich möglichst folgende Informationen enthalten:

- `description`: kurze, konkrete Beschreibung von Geschmack, Konsistenz und fertigem Gericht
- `equipment`: tatsächlich benötigte Küchengeräte
- `prepNotes`: sinnvolle Vorbereitungshinweise, z. B. Waschen, Schneiden, Abtropfen oder Vorheizen
- `doneness`: erkennbare Gar- und Konsistenzmerkmale statt nur Zeitangaben
- `substitutions`: sinnvolle Ersatzmöglichkeiten mit Auswirkungen auf Geschmack oder Zubereitung
- `leftovers`: Aufbewahrung, Haltbarkeit und Resteverwertung
- `safety`: relevante Lebensmittel- und Temperaturhinweise, besonders bei Fleisch, Geflügel, Fisch und Ei

Die Kochschritte sollen nicht nur Aktionen nennen, sondern dem Nutzer sagen, woran er erkennt, dass der jeweilige Schritt gelungen ist. Wo sinnvoll sollen Hitze, Dauer, Konsistenz, Farbe oder Kerntemperatur angegeben werden.

## Zulässige Einheiten

`g`, `ml`, `Stück`

Die App normalisiert Vorratsangaben wie kg → g und l → ml.

## Bildstrategie

KI-generierte Rezeptbilder sind nicht Bestandteil des Qualitätsstandards. Ein Bild darf niemals eine Rezeptinformation ersetzen. Wenn kein verifiziertes Bild vorhanden ist, verwendet RESERVE das neutrale `dish`-Symbol und die Rezeptbeschreibung. Bereits vorhandene verifizierte Produktionsbilder dürfen bestehen bleiben, neue Rezepte benötigen jedoch kein Bild.

## Qualitätsregeln

Ein Rezept wird nur aktiv verwendet, wenn die automatische Prüfung erfolgreich ist. Die Prüfung kontrolliert Pflichtfelder, eindeutige IDs, Mengen, Einheiten, Nährwerte, Kochzeiten, Ernährungsform und Freigabestatus.

Neue Datensätze sollen zuerst mit `status: "draft"` angelegt, geprüft und erst danach auf `approved` gesetzt werden. Dadurch kann die Datenbank bis auf 10'000 Rezepte wachsen, ohne ungeprüfte Datensätze in Empfehlungen einzumischen.
