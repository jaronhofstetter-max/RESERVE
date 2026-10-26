"""Reproduce the reviewed Wikibooks shortbread import."""
import hashlib, io, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOC = ROOT / "docs/recipe-candidates/import-2026-10-26"
RID = "wikibooks-shortbread"
RECIPE_URL = "https://de.wikibooks.org/wiki/Kochbuch/_Shortbread"
PERMALINK = "https://de.wikibooks.org/w/index.php?title=Kochbuch/_Shortbread&oldid=1009122"
PHOTO_URL = "https://commons.wikimedia.org/wiki/File:Shortbread_fingers.jpg"
TEXT_LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/deed.de"
PHOTO_LICENSE = "https://creativecommons.org/licenses/by-sa/2.5/"

DOC.mkdir(parents=True, exist_ok=True)
nutrients = {}
for path in [
    ROOT / "docs/recipe-candidates/import-2026-10-15/nutrition-values.json",
    ROOT / "docs/recipe-candidates/import-2026-10-23/nutrition-values.json",
]:
    nutrients.update(json.loads(path.read_text()))
selected = {key: nutrients[key] for key in ("169761", "169655", "173410")}
(DOC / "nutrition-values.json").write_text(json.dumps(selected, ensure_ascii=False, indent=2) + "\n")

photo_raw = pathlib.Path("/tmp/shortbread-fingers.jpg").read_bytes()
image = Image.open(io.BytesIO(photo_raw)).convert("RGB")
image.thumbnail((700, 700))
photo_path = f"assets/recipe-photos/{RID}.webp"
image.save(ROOT / photo_path, "WEBP", quality=78, method=6)

manifest_path = ROOT / "data/recipe-photo-sources.json"
manifest = json.loads(manifest_path.read_text())
manifest["photos"] = [p for p in manifest["photos"] if p["recipeId"] != RID]
manifest["photos"].append({
    "recipeId": RID, "path": photo_path, "source": PHOTO_URL,
    "author": "Dave souza", "license": "CC BY-SA 2.5",
    "licenseUrl": PHOTO_LICENSE, "kind": "photograph", "servingSuggestion": False,
    "title": "Scottish shortbread fingers", "provider": "Wikimedia Commons",
    "adaptation": "Verkleinert und als WebP komprimiert; Bildinhalt unverändert.",
    "review": "Exaktes Gericht: Das Foto zeigt rechteckige schottische Shortbread-Fingers ohne zusätzliche Lebensmittel.",
    "reviewedAt": "2026-10-26",
    "originalPhotoUrl": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Shortbread_fingers.jpg",
    "originalPhotoSha256": hashlib.sha256(photo_raw).hexdigest(),
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

# Original: four people. The source leaves the sprinkling sugar unquantified.
rows = [
    ("Weizenmehl", 180, "g", "169761", 180),
    ("Gesalzene Butter", 120, "g", "173410", 120),
    ("Zucker", 60, "g", "169655", 60),
    ("Kristallzucker zum Bestreuen", 10, "g", "169655", 10),
]
notes = [
    "Originalrezept für 4 Personen; Zutaten und geschätzte Nährwerte auf eine Person umgerechnet.",
    "Die Originalangabe «etwas Kristallzucker zum Bestreuen» enthält keine Menge. Für den Gesamtansatz wurden 10 g als offengelegte Richtmenge angesetzt.",
    "Die Rezeptvariante mit 120 g gesalzener Butter wurde verwendet; die Alternative mit ungesalzener Butter und zusätzlichem Salz ist nicht eingerechnet.",
]
total = {k: 0.0 for k in ("kcal", "protein", "carbs", "fat", "fiber")}
for _, _, _, key, grams in rows:
    per = selected[key]["per100g"]
    for nutrient in total:
        value = max(0, per["carbs"] - per["fiber"]) if nutrient == "carbs" else per[nutrient]
        total[nutrient] += value * grams / 400

recipe = {
    "id": RID, "name": "Schottisches Shortbread", "type": "Dessert", "diet": "Vegetarisch",
    "dish": "🍪", "cuisine": "Schottisch", "mealTimes": ["Zwischenmahlzeit"],
    "prepMinutes": 10, "cookMinutes": 30, "waitMinutes": 30, "difficulty": "Einfach",
    "allergens": ["Gluten", "Milch"], "tags": ["Wikibooks", "Gebäck", "Schottland", "Originalfoto"],
    "ingredients": [{"name": n, "amount": round(a / 4, 4), "unit": u} for n, a, u, _, _ in rows],
    "steps": [
        "Zucker und zimmerwarme gesalzene Butter auf einem Brett oder in einer Schüssel miteinander verkneten.",
        "Mehl sieben und portionsweise unter die Butter-Zucker-Masse kneten, bis ein geschmeidiger, nicht zu fester Teig entsteht.",
        "Teig abdecken und 30 Minuten im Kühlschrank kühlen. Den Backofen auf höchstens 150 °C Heissluft vorheizen.",
        "Teig etwa 1 cm dick ausrollen, in rechteckige Fingers schneiden und jedes Stück mehrmals mit einer Gabel einstechen.",
        "Auf mittlerer Schiene ungefähr 30 Minuten backen, bis das Shortbread hell goldgelb und bis zur Mitte durchgebacken ist.",
        "Sofort mit Kristallzucker bestreuen und vollständig auskühlen lassen.",
    ],
    "nutrition": {k: round(v, 2) for k, v in total.items()},
    "nutritionEstimate": {
        "method": "Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gebäcks.",
        "basis": "Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. " + " ".join(notes),
        "sources": "docs/recipe-candidates/import-2026-10-26/nutrition-values.json",
        "ingredients": [{"name": n, "grams": round(g / 4, 4), "foodKey": k, "excluded": False} for n, _, _, k, g in rows],
    },
    "status": "approved",
    "description": "Klassisches schottisches Shortbread im Verhältnis 3:2:1 aus Mehl, Butter und Zucker nach dem freien Wikibooks-Kochbuch.",
    "equipment": ["Küchenwaage", "Schüssel oder Backbrett", "Sieb", "Wallholz", "Backblech", "Backpapier", "Gabel"],
    "prepNotes": notes,
    "doneness": "Das Shortbread ist hell goldgelb, am Rand fest und in der Mitte durchgebacken, ohne dunkel zu werden.",
    "substitutions": ["Ungesalzene Butter ist möglich; Salz dann vorsichtig nach Geschmack ergänzen. Die Nährwerte verändern sich kaum, die Salzmenge ist jedoch neu festzulegen."],
    "leftovers": "Vollständig ausgekühlt in einer gut schliessenden Dose trocken lagern und innerhalb einer Woche verbrauchen.",
    "safety": "Heisses Backblech nur mit Ofenhandschuhen anfassen. Das Gebäck vor dem Einlagern vollständig auskühlen lassen.",
    "recipeCredit": {
        "author": "Wikibooks-Mitwirkende", "provider": "Wikibooks", "source": PERMALINK,
        "license": "CC BY-SA 4.0", "licenseUrl": TEXT_LICENSE, "originalServings": 4,
        "adaptation": "Auf eine Person umgerechnet; Arbeitsschritte gegliedert und Gar-, Lager- sowie Sicherheitshinweise ergänzt. " + " ".join(notes),
    },
    "resilience": {"power": "normal", "refrigeration": "none", "shelfStableShare": 1, "waterMl": 0, "noCook": False, "onePot": False},
    "image": photo_path,
}
(ROOT / "data/quality-batch-wikibooks-v3.json").write_text(json.dumps([recipe], ensure_ascii=False, indent=2) + "\n")

(DOC / "source.json").write_text(json.dumps({
    "name": "Shortbread", "author": "Wikibooks-Mitwirkende", "recipeUrl": RECIPE_URL,
    "permalink": PERMALINK, "originalServings": 4,
    "ingredients": ["180 g Weizenmehl", "120 g gesalzene Butter", "60 g Zucker", "etwas Kristallzucker zum Bestreuen"],
    "textLicense": "CC BY-SA 4.0", "textLicenseUrl": TEXT_LICENSE,
    "photoUrl": PHOTO_URL, "photoAuthor": "Dave souza", "photoLicense": "CC BY-SA 2.5", "photoLicenseUrl": PHOTO_LICENSE,
}, ensure_ascii=False, indent=2) + "\n")
(DOC / "source-evidence.json").write_text(json.dumps([
    {"url": PERMALINK, "retrievedAt": "2026-10-26", "evidence": "4 Personen; 180 g Weizenmehl; 120 g gesalzene Butter; 60 g Zucker; etwas Kristallzucker; 30 Minuten Kühlen; ungefähr 30 Minuten bei höchstens 150 °C; Seitentext CC BY-SA 4.0."},
    {"url": PHOTO_URL, "retrievedAt": "2026-10-26", "evidence": "Eigenes Werk von Dave souza; Scottish shortbread fingers; 1395 × 1290 JPEG; CC BY-SA 2.5; Namensnennung verlangt."},
], ensure_ascii=False, indent=2) + "\n")
(DOC / "README.md").write_text("""# Schottisches Shortbread\n\n- Rezept: Wikibooks-Mitwirkende, feste Version 1009122, CC BY-SA 4.0.\n- Foto: Dave souza / Wikimedia Commons, CC BY-SA 2.5; exaktes Gericht, kein Serviervorschlag.\n- Original: 4 Personen. RESERVE skaliert auf eine Person.\n- Die nicht bezifferte Menge Kristallzucker zum Bestreuen ist transparent mit 10 g im Gesamtansatz angesetzt.\n- Nährwerte sind eine USDA-basierte Schätzung; Allergene: Gluten und Milch.\n- Text- und Fotoänderungen bleiben unter ihren jeweiligen Share-Alike-Lizenzen; Namensnennung, Lizenzlink und Änderungskennzeichnung sind erforderlich.\n""")
print(recipe["nutrition"])
