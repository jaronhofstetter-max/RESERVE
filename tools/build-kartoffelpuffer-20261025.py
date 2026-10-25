"""Reproduce the reviewed Wikibooks potato-pancake import."""
import hashlib, io, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOC = ROOT / "docs/recipe-candidates/import-2026-10-25"
RID = "wikibooks-kartoffelpuffer"
RECIPE_URL = "https://de.wikibooks.org/wiki/Kochbuch/_Kartoffelpuffer"
PHOTO_URL = "https://commons.wikimedia.org/wiki/File:Kartoffelpuffer.jpg"
TEXT_LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/deed.de"
PHOTO_LICENSE = "https://creativecommons.org/licenses/by-sa/2.0/at/deed.en"

# Original: three people. Piece and frying-oil weights are explicit calculation assumptions.
rows = [
    ("Kartoffeln", 1000, "g", "170026", 1000),
    ("Zwiebel", 150, "g", "170000", 150),
    ("Eier", 3, "Stück", "171287", 150),
    ("Weizenmehl", 31.25, "g", "169761", 31.25),
    ("Salz", 6, "g", None, 6),
    ("Pfeffer", 0.3, "g", None, 0.3),
    ("Muskat", 0.15, "g", None, 0.15),
    ("Rapsöl", 45, "ml", "172336", 41.4),
]

DOC.mkdir(parents=True, exist_ok=True)
sources = {}
for path in [
    ROOT / "docs/recipe-candidates/import-2026-10-15/nutrition-values.json",
    ROOT / "docs/recipe-candidates/import-2026-10-16/nutrition-values.json",
    ROOT / "docs/recipe-candidates/import-2026-10-18/nutrition-values.json",
    ROOT / "docs/recipe-candidates/import-2026-10-19/nutrition-values.json",
]:
    sources.update(json.loads(path.read_text()))

def find(description):
    for key, value in sources.items():
        if value["description"].lower() == description.lower():
            return key, value
    raise KeyError(description)

resolved = {}
for key, desc in {
    "170026": "Potatoes, flesh and skin, raw",
    "170000": "Onions, raw",
    "171287": "Egg, whole, raw, fresh",
    "169761": "Wheat flour, white, all-purpose, unenriched",
    "172336": "Oil, canola",
}.items():
    actual, value = find(desc)
    resolved[key] = value

(DOC / "nutrition-values.json").write_text(json.dumps(resolved, ensure_ascii=False, indent=2) + "\n")

photo_raw = pathlib.Path("/tmp/kartoffelpuffer.jpg").read_bytes()
image = Image.open(io.BytesIO(photo_raw)).convert("RGB")
image.thumbnail((1200, 1200))
photo_path = f"assets/recipe-photos/{RID}.webp"
image.save(ROOT / photo_path, "WEBP", quality=85)

manifest_path = ROOT / "data/recipe-photo-sources.json"
manifest = json.loads(manifest_path.read_text())
assert not any(p["recipeId"] == RID for p in manifest["photos"])
manifest["photos"].append({
    "recipeId": RID, "path": photo_path, "source": PHOTO_URL,
    "author": "Clemens Pfeiffer; Zuschnitt: Boris23", "license": "CC BY-SA 2.0 AT",
    "licenseUrl": PHOTO_LICENSE, "kind": "photograph", "servingSuggestion": False,
    "title": "Kartoffelpuffer", "provider": "Wikimedia Commons",
    "adaptation": "Das bereits von Boris23 zugeschnittene Original wurde verkleinert und als WebP komprimiert.",
    "review": "Exaktes Gericht: Das Foto zeigt gebratene Kartoffelpuffer ohne zusätzliche Beilage.",
    "reviewedAt": "2026-10-25",
    "originalPhotoUrl": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kartoffelpuffer.jpg",
    "originalPhotoSha256": hashlib.sha256(photo_raw).hexdigest(),
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

notes = [
    "Originalrezept für 3 Personen; Zutaten und geschätzte Nährwerte auf eine Person umgerechnet.",
    "Die Originalangabe «1 grosse Zwiebel» wurde für den Gesamtansatz mit 150 g angesetzt.",
    "Vier Esslöffel Mehl wurden für den Gesamtansatz mit 31,25 g angesetzt.",
    "«Öl zum Ausbacken» hat keine Originalmenge. Für die Nährwertschätzung wurden 45 ml Rapsöl im Gesamtansatz angesetzt; die tatsächliche Aufnahme kann deutlich abweichen.",
    "Eine Prise Pfeffer und Muskat wurden mit 0,3 g beziehungsweise 0,15 g im Gesamtansatz angesetzt.",
]
total = {k: 0.0 for k in ("kcal", "protein", "carbs", "fat", "fiber")}
for name, amount, unit, key, grams in rows:
    if not key:
        continue
    per = resolved[key]["per100g"]
    for nutrient in total:
        value = max(0, per["carbs"] - per["fiber"]) if nutrient == "carbs" else per[nutrient]
        total[nutrient] += value * grams / 300

recipe = {
    "id": RID, "name": "Kartoffelpuffer", "type": "Hauptmahlzeit", "diet": "Vegetarisch",
    "dish": "🥔", "cuisine": "Deutschsprachig", "mealTimes": ["Mittagessen", "Abendessen"],
    "prepMinutes": 15, "cookMinutes": 15, "difficulty": "Einfach",
    "allergens": ["Ei", "Gluten"], "tags": ["Wikibooks", "Kartoffeln", "Pfannengericht", "Originalfoto"],
    "ingredients": [{"name": n, "amount": round(a / 3, 4), "unit": u} for n, a, u, k, g in rows],
    "steps": [
        "Kartoffeln und Zwiebel schälen und fein reiben. Die Kartoffelmasse leicht ausdrücken, falls sie sehr wässrig ist.",
        "Eier, Mehl, Salz, Pfeffer und Muskat zur Kartoffel-Zwiebel-Mischung geben und gründlich vermengen.",
        "Etwas Rapsöl in einer grossen Pfanne bei mittlerer bis hoher Hitze erhitzen.",
        "Jeweils drei kleine ovale Fladen in die Pfanne setzen, flach drücken und von beiden Seiten knusprig goldbraun braten.",
        "Fertige Kartoffelpuffer kurz abtropfen lassen und heiss servieren.",
    ],
    "nutrition": {k: round(v, 2) for k, v in total.items()},
    "nutritionEstimate": {
        "method": "Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.",
        "basis": "Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. " + " ".join(notes),
        "sources": "docs/recipe-candidates/import-2026-10-25/nutrition-values.json",
        "ingredients": [{"name": n, "grams": round(g / 3, 4), "foodKey": k, "excluded": k is None} for n, a, u, k, g in rows],
    },
    "status": "approved",
    "description": "Knusprige Kartoffelpuffer aus rohen Kartoffeln, Zwiebel, Ei und wenig Mehl nach dem freien Wikibooks-Kochbuch.",
    "equipment": ["Reibe", "Schüssel", "Bratpfanne", "Pfannenwender"],
    "prepNotes": notes,
    "doneness": "Die Kartoffelpuffer sind auf beiden Seiten goldbraun und am Rand knusprig.",
    "substitutions": ["Zum glutenfreien Binden kann ein geeignetes Kartoffelmehl verwendet werden; Menge und Produkteignung prüfen."],
    "leftovers": "Reste rasch abkühlen, abgedeckt kühlen und innerhalb von 24 Stunden vollständig durcherhitzt verbrauchen.",
    "safety": "Rohe Kartoffelmasse nicht kosten. Heisses Bratöl kann spritzen; Puffer vorsichtig einlegen und wenden.",
    "recipeCredit": {
        "author": "Wikibooks-Mitwirkende", "provider": "Wikibooks", "source": RECIPE_URL,
        "license": "CC BY-SA 4.0", "licenseUrl": TEXT_LICENSE, "originalServings": 3,
        "adaptation": "Auf eine Person umgerechnet; Arbeitsschritte gegliedert und Sicherheits- sowie Garhinweise ergänzt. " + " ".join(notes),
    },
    "resilience": {"power": "normal", "refrigeration": "required", "shelfStableShare": 0.5, "waterMl": 0, "noCook": False, "onePot": True},
}
(ROOT / "data/quality-batch-wikibooks-v2.json").write_text(json.dumps([recipe], ensure_ascii=False, indent=2) + "\n")
print(recipe["nutrition"])
