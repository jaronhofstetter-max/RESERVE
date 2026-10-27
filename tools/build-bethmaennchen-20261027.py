"""Reproduce the reviewed Wikibooks Bethmaennchen import."""
import hashlib, io, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOC = ROOT / "docs/recipe-candidates/import-2026-10-27"
RID = "wikibooks-bethmaennchen"
RECIPE_URL = "https://de.wikibooks.org/wiki/Kochbuch/_Bethm%C3%A4nnchen"
PERMALINK = "https://de.wikibooks.org/w/index.php?title=Kochbuch/_Bethm%C3%A4nnchen&oldid=904349"
PHOTO_URL = "https://commons.wikimedia.org/wiki/File:Bethmaennchen1.jpg"
TEXT_LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/deed.de"
PHOTO_LICENSE = "https://creativecommons.org/licenses/by/3.0/"

DOC.mkdir(parents=True, exist_ok=True)
nutrition = {
    "170567": {"description":"Nuts, almonds", "per100g":{"kcal":579,"protein":21.15,"carbs":21.55,"fat":49.93,"fiber":12.5}, "source":"https://fdc.nal.usda.gov/food-details/170567/nutrients"},
    "marzipan-generic": {"description":"Marzipanrohmasse, generischer Referenzwert", "per100g":{"kcal":458,"protein":6.1,"carbs":54.5,"fat":25.3,"fiber":2.3}, "source":"https://fdc.nal.usda.gov/fdc-app.html#/food-search?query=marzipan"},
    "172183": {"description":"Egg, white, raw, fresh", "per100g":{"kcal":52,"protein":10.9,"carbs":0.73,"fat":0.17,"fiber":0}, "source":"https://fdc.nal.usda.gov/food-details/172183/nutrients"},
    "172184": {"description":"Egg, yolk, raw, fresh", "per100g":{"kcal":322,"protein":15.86,"carbs":3.59,"fat":26.54,"fiber":0}, "source":"https://fdc.nal.usda.gov/food-details/172184/nutrients"},
    "169761": {"description":"Wheat flour, white, all-purpose, unenriched", "per100g":{"kcal":364,"protein":10.33,"carbs":76.31,"fat":0.98,"fiber":2.7}, "source":"https://fdc.nal.usda.gov/food-details/169761/nutrients"},
    "169655": {"description":"Sugars, powdered", "per100g":{"kcal":389,"protein":0,"carbs":99.77,"fat":0,"fiber":0}, "source":"https://fdc.nal.usda.gov/food-details/169655/nutrients"},
}
(DOC / "nutrition-values.json").write_text(json.dumps(nutrition, ensure_ascii=False, indent=2) + "\n")

photo_raw = pathlib.Path("/tmp/bethmaennchen1.jpg").read_bytes()
image = Image.open(io.BytesIO(photo_raw)).convert("RGB")
image.thumbnail((700, 700))
photo_path = f"assets/recipe-photos/{RID}.webp"
image.save(ROOT / photo_path, "WEBP", quality=78, method=6)

manifest_path = ROOT / "data/recipe-photo-sources.json"
manifest = json.loads(manifest_path.read_text())
manifest["photos"] = [p for p in manifest["photos"] if p["recipeId"] != RID]
manifest["photos"].append({
    "recipeId": RID, "path": photo_path, "source": PHOTO_URL,
    "author": "Alexander Klink", "license": "CC BY 3.0",
    "licenseUrl": PHOTO_LICENSE, "kind": "photograph", "servingSuggestion": False,
    "title": "Bethmännchen", "provider": "Wikimedia Commons",
    "adaptation": "Verkleinert und als WebP komprimiert; Bildinhalt unverändert.",
    "review": "Exaktes Gericht: Das Foto zeigt Bethmännchen mit den typischen drei Mandelhälften; keine Beilagen.",
    "reviewedAt": "2026-10-27",
    "originalPhotoUrl": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bethmaennchen1.jpg",
    "originalPhotoSha256": hashlib.sha256(photo_raw).hexdigest(),
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

# Original yields 25 pieces. One egg white is estimated at 33 g and one yolk at 17 g.
rows = [
    ("Mandeln", 100, "g", "170567", 100, False),
    ("Marzipanrohmasse", 200, "g", "marzipan-generic", 200, False),
    ("Eiweiss", 1, "Stück", "172183", 33, False),
    ("Weizenmehl", 20, "g", "169761", 20, False),
    ("Puderzucker", 50, "g", "169655", 50, False),
    ("Eigelb zum Bestreichen", 1, "Stück", "172184", 17, False),
    ("Rosenwasser", 5, "ml", None, 0, True),
]
notes = [
    "Das Original ergibt 25 Stück; Mengen und geschätzte Nährwerte sind auf ein Bethmännchen umgerechnet.",
    "Die unbezifferte Angabe «Rosenwasser» wurde mit 5 ml für den Gesamtansatz als offengelegte Richtmenge angesetzt.",
    "Für die Nährwertschätzung wurden ein Eiweiss mit 33 g und ein Eigelb mit 17 g angesetzt; das wenige Wasser zum Verquirlen ist nicht eingerechnet.",
]
total = {k: 0.0 for k in ("kcal", "protein", "carbs", "fat", "fiber")}
for _, _, _, key, grams, excluded in rows:
    if excluded: continue
    per = nutrition[key]["per100g"]
    for nutrient in total:
        value = max(0, per["carbs"] - per["fiber"]) if nutrient == "carbs" else per[nutrient]
        total[nutrient] += value * grams / 2500

recipe = {
    "id": RID, "name": "Bethmännchen", "type": "Dessert", "diet": "Vegetarisch",
    "dish": "🍪", "cuisine": "Deutsch", "mealTimes": ["Zwischenmahlzeit"],
    "prepMinutes": 20, "cookMinutes": 15, "waitMinutes": 15, "difficulty": "Mittel",
    "allergens": ["Ei", "Gluten", "Nüsse"], "tags": ["Wikibooks", "Gebäck", "Weihnachten", "Originalfoto"],
    "ingredients": [{"name": n, "amount": round(a / 25, 4), "unit": u} for n, a, u, _, _, _ in rows],
    "steps": [
        "Mandeln mit kochendem Wasser überbrühen, abkühlen lassen und häuten. Die Hälfte mahlen; die übrigen Mandeln längs halbieren.",
        "Gemahlene Mandeln mit der Marzipanrohmasse verkneten. Das Ei trennen und das Eigelb für die Glasur beiseitestellen.",
        "Eiweiss, Mehl, Puderzucker und Rosenwasser zur Marzipanmasse geben und zu einem klebrigen Teig verkneten.",
        "Mit leicht bemehlten Händen 25 kleine Kugeln formen und auf ein mit Backpapier belegtes Blech setzen.",
        "Jede Kugel mit drei Mandelhälften verzieren. Eigelb mit wenig Wasser verquirlen und die Bethmännchen dünn damit bestreichen.",
        "Im vorgeheizten Ofen bei 130–150 °C auf mittlerer Schiene ungefähr 10–15 Minuten goldbraun backen; gegen Ende ständig beobachten.",
        "Auf dem Blech abkühlen lassen, bis das Gebäck fest geworden ist.",
    ],
    "nutrition": {k: round(v, 2) for k, v in total.items()},
    "nutritionEstimate": {
        "method": "Zutatenberechnung mit USDA SR Legacy und generischem Marzipan-Referenzwert; Schätzung, keine Messung des fertigen Gebäcks.",
        "basis": "Pro Stück; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. " + " ".join(notes),
        "sources": "docs/recipe-candidates/import-2026-10-27/nutrition-values.json",
        "ingredients": [{"name": n, "grams": round(g / 25, 4), "foodKey": key, "excluded": ex} for n, _, _, key, g, ex in rows],
    },
    "status": "approved",
    "description": "Traditionelles Frankfurter Marzipangebäck mit drei Mandelhälften nach dem freien Wikibooks-Kochbuch.",
    "equipment": ["Küchenwaage", "Schüsseln", "Backblech", "Backpapier", "Backofen"],
    "prepNotes": notes,
    "doneness": "Die Bethmännchen sind goldbraun, bleiben beim Herausnehmen noch weich und werden beim Abkühlen fest.",
    "substitutions": ["Rosenwasser kann nach der im Original genannten Variante statt in den Teig in die Eigelbglasur gegeben werden."],
    "leftovers": "Vollständig ausgekühlt in einer gut schliessenden Dose trocken lagern und innerhalb von zwei Wochen verbrauchen.",
    "safety": "Mandeln vorsichtig mit kochendem Wasser überbrühen und heisses Backblech nur mit Ofenhandschuhen anfassen.",
    "recipeCredit": {
        "author": "Wikibooks-Mitwirkende", "provider": "Wikibooks", "source": PERMALINK,
        "license": "CC BY-SA 4.0", "licenseUrl": TEXT_LICENSE, "originalServings": 25,
        "adaptation": "Auf ein Stück umgerechnet; Arbeitsschritte gegliedert und Mengenannahmen, Gar-, Lager- sowie Sicherheitshinweise ergänzt. " + " ".join(notes),
    },
    "resilience": {"power": "normal", "refrigeration": "none", "shelfStableShare": 1, "waterMl": 0, "noCook": False, "onePot": False},
    "image": photo_path,
}
(ROOT / "data/quality-batch-wikibooks-v4.json").write_text(json.dumps([recipe], ensure_ascii=False, indent=2) + "\n")

(DOC / "source.json").write_text(json.dumps({
    "name": "Bethmännchen", "author": "Wikibooks-Mitwirkende", "recipeUrl": RECIPE_URL,
    "permalink": PERMALINK, "originalYield": "25 Stück",
    "ingredients": ["100 g Mandeln", "200 g Marzipanrohmasse", "1 Eiweiss", "20 g Mehl", "50 g Puderzucker", "1 Eigelb", "Rosenwasser"],
    "textLicense": "CC BY-SA 4.0", "textLicenseUrl": TEXT_LICENSE,
    "photoUrl": PHOTO_URL, "photoAuthor": "Alexander Klink", "photoLicense": "CC BY 3.0", "photoLicenseUrl": PHOTO_LICENSE,
}, ensure_ascii=False, indent=2) + "\n")
(DOC / "source-evidence.json").write_text(json.dumps([
    {"url": PERMALINK, "retrievedAt": "2026-10-27", "evidence": "25 Portionen; vollständige Zutatenliste; zehn Zubereitungspunkte; 130–150 °C und 10–15 Minuten; Seitentext CC BY-SA 4.0."},
    {"url": PHOTO_URL, "retrievedAt": "2026-10-27", "evidence": "Eigenes Werk von Alexander Klink; Bethmännchen; 3029 × 2019 JPEG; CC BY 3.0; Namensnennung, Lizenzlink und Änderungshinweis verlangt."},
], ensure_ascii=False, indent=2) + "\n")
(DOC / "README.md").write_text("""# Bethmännchen\n\n- Rezept: Wikibooks-Mitwirkende, feste Version 904349, CC BY-SA 4.0.\n- Foto: Alexander Klink / Wikimedia Commons, CC BY 3.0; exaktes Gericht, kein Serviervorschlag.\n- Original: 25 Stück. RESERVE skaliert auf ein Stück.\n- Rosenwasser sowie Eiweiss-/Eigelbgewicht sind transparent dokumentierte Mengenannahmen.\n- Nährwerte sind eine USDA-basierte Schätzung; Allergene: Ei, Gluten und Nüsse.\n- Bearbeiteter Rezepttext bleibt unter CC BY-SA 4.0; für das Foto gelten Namensnennung, Lizenzlink und Änderungshinweis nach CC BY 3.0.\n""")
print(recipe["nutrition"])
