"""Collect source evidence, USDA records and original licensed photograph."""
import hashlib, html, io, json, pathlib, re, urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOC = ROOT/'docs/recipe-candidates/import-2026-10-19'
DOC.mkdir(parents=True,exist_ok=True)
evidence=[]
source=None
for url in ['http://chuchitisch.ch/recipes/575','http://chuchitisch.ch/chuchitisch/lizenz']:
    raw=urllib.request.urlopen(url,timeout=30).read()
    page=raw.decode()
    if '/recipes/' in url:
        source=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',page,re.S).group(1),strict=False)
        assert source['name']=='Orientalische Linsen-Tomatensuppe'
        assert source['author']['name']=='Hannes und Martina'
        assert 'by-sa/3.0' in source['license']
        assert 'Passata' in page
    else:
        assert 'sowohl Rezepte als auch Bilder' in page and 'eigenen Fotos' in page
        assert 'by-sa/3.0' in page
    clean=re.sub(r'<(script|style)\b.*?</\1>',' ',page,flags=re.S)
    clean=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',clean))).strip()
    evidence.append(dict(url=url,retrievedAt='2026-10-19',sha256=hashlib.sha256(raw).hexdigest(),text=clean))
(DOC/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
(DOC/'source-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
ids=['172420','170460','170000','169230','170106','170924','172231','170931','172336','171304','170416']
data=json.loads(pathlib.Path('/tmp/reserve-sr-legacy.json').read_text())
nutrients={1008:'kcal',1003:'protein',1005:'carbs',1004:'fat',1079:'fiber'}
values={}
for record in data:
    key=str(record['fdcId'])
    if key in ids:
        per={nutrients[n['nutrient']['id']]:n['amount'] for n in record['foodNutrients'] if n['nutrient']['id'] in nutrients}
        assert set(per)==set(nutrients.values())
        values[key]=dict(description=record['description'],per100g=per,source=f'https://fdc.nal.usda.gov/food-details/{key}/nutrients')
assert set(values)==set(ids)
(DOC/'nutrition-values.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
photo_url=source['image'].replace('chuchitisch.ch//','chuchitisch.ch/')
raw=pathlib.Path('/tmp/reserve-lentil-original.png').read_bytes()
# Independently downloaded original; retain original URL and digest below.
im=Image.open(io.BytesIO(raw)).convert('RGB')
im.thumbnail((1200,1200))
photo_path='assets/recipe-photos/chuchitisch-linsen-tomatensuppe.webp'
im.save(ROOT/photo_path,'WEBP',quality=85)
manifest_path=ROOT/'data/recipe-photo-sources.json'
manifest=json.loads(manifest_path.read_text())
assert not any(p['recipeId']=='chuchitisch-linsen-tomatensuppe' for p in manifest['photos'])
manifest['photos'].append(dict(recipeId='chuchitisch-linsen-tomatensuppe',path=photo_path,source='https://chuchitisch.ch/recipes/575',author='Hannes und Martina',license='CC BY-SA 3.0',licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',kind='photograph',servingSuggestion=True,title='Orientalische Linsen-Tomatensuppe',provider='Chuchitisch',adaptation='Verkleinert und als WebP komprimiert; Bildinhalt unverändert.',review='Originalfoto der Rezeptseite: rote Tomaten-Linsensuppe mit Joghurt und Petersilie. Serviervorschlag; genaue Mengen nicht aus dem Foto prüfbar. Urheberangabe gemäss Rezeptkonto und globaler Erklärung zu eigenen Fotos; kein separat benannter Fotograf.',reviewedAt='2026-10-19',originalPhotoUrl=photo_url,originalPhotoSha256=hashlib.sha256(raw).hexdigest()))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
