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
- `prepNotes`: sinnvolle Vorbereitungshinweise
- `doneness`: erkennbare Gar- und Konsistenzmerkmale
- `substitutions`: sinnvolle Ersatzmöglichkeiten
- `leftovers`: Aufbewahrung, Haltbarkeit und Resteverwertung
- `safety`: relevante Lebensmittel- und Temperaturhinweise

Die Kochschritte sollen nicht nur Aktionen nennen, sondern dem Nutzer sagen, woran er erkennt, dass der jeweilige Schritt gelungen ist. Wo sinnvoll sollen Hitze, Dauer, Konsistenz, Farbe oder Kerntemperatur angegeben werden.

## Vorsorge- und Ressourcen-Metadaten

Für den Ausbau auf 10'000 Rezepte erhält jedes neue Rezept zusätzlich maschinenlesbare Ressourcenmerkmale. Sie erlauben RESERVE, dieselbe Rezeptbibliothek im Alltag, bei knappem Vorrat und in einem Stromausfall zu verwenden.

Empfohlener Block:

```json
"resilience": {
  "noCook": false,
  "power": "normal",
  "refrigeration": "required",
  "shelfStableShare": 0.25,
  "waterMl": 500,
  "onePot": true
}
```

Regeln:
- `noCook`: Gericht kann ohne Erhitzen vollständig zubereitet werden.
- `power`: `none`, `low` oder `normal`. `none` bedeutet ohne elektrische Kochenergie; `low` ist für einfache/stromsparende Zubereitung wie eine einzelne Kochstelle gedacht.
- `refrigeration`: `none`, `afterOpening` oder `required`.
- `shelfStableShare`: Anteil der Zutaten von 0 bis 1, die typischerweise ungekühlt und länger haltbar bevorratet werden können. Dies ist eine RESERVE-Klassifikation und keine Haltbarkeitsgarantie.
- `waterMl`: ungefähr benötigtes Wasser pro Person für die Zubereitung, zusätzlich zum Trinkwasser.
- `onePot`: Zubereitung benötigt höchstens ein Kochgefäss.

Bestehende Legacy-Rezepte dürfen zunächst ohne diesen Block bestehen bleiben. Neue Batches sollen ihn enthalten. Fehlende Resilienz-Metadaten dürfen niemals automatisch als blackout-tauglich interpretiert werden.

## Skalierungsarchitektur für 10'000 Rezepte

Die kanonischen Rezepte bleiben die vollständige Quelle. Für die Auslieferung werden daraus kompakte Suchindizes erzeugt. Die Benutzeroberfläche soll bei wachsender Bibliothek nicht dauerhaft alle vollständigen Rezepte rendern, sondern zunächst anhand von Zutaten, Ernährungsform, Mahlzeit, Zeit und Resilienzmerkmalen Kandidaten auswählen und nur die relevantesten Ergebnisse darstellen.

Geplante Indizes:
- Rezept-ID → Metadaten
- Zutat → Rezept-IDs
- Ernährungsform → Rezept-IDs
- Mahlzeit → Rezept-IDs
- Resilienz/Blackout → Rezept-IDs

Die ausführlichen Kochinformationen bleiben vollständig erhalten und werden erst für ausgewählte Rezepte benötigt. Damit bleibt die Qualität unabhängig von der Bibliotheksgrösse erhalten.

## Zulässige Einheiten

`g`, `ml`, `Stück`

Die App normalisiert Vorratsangaben wie kg → g und l → ml.

## Bildstrategie

KI-generierte Rezeptbilder sind nicht Bestandteil des Qualitätsstandards. Ein Bild darf niemals eine Rezeptinformation ersetzen. Wenn kein verifiziertes Bild vorhanden ist, verwendet RESERVE das neutrale `dish`-Symbol und die Rezeptbeschreibung. Bereits vorhandene verifizierte Produktionsbilder dürfen bestehen bleiben, neue Rezepte benötigen jedoch kein Bild.

## Qualitätsregeln

Ein Rezept wird nur aktiv verwendet, wenn die automatische Prüfung erfolgreich ist. Die Prüfung kontrolliert Pflichtfelder, eindeutige IDs, Mengen, Einheiten, Nährwerte, Kochzeiten, Ernährungsform und Freigabestatus.

Neue Datensätze sollen zuerst mit `status: "draft"` angelegt, geprüft und erst danach auf `approved` gesetzt werden. Dadurch kann die Datenbank bis auf 10'000 Rezepte wachsen, ohne ungeprüfte Datensätze in Empfehlungen einzumischen.
