"""Collect reviewed original recipe/photo pairs without activating app recipes."""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'docs/recipe-candidates/chuchitisch'
IDS = (65, 621, 445, 128)

def fetch(url):
    with urllib.request.urlopen(url, timeout=40) as response:
        return response.read()

def collect(recipe_id):
    url = f'http://chuchitisch.ch/recipes/{recipe_id}'
    page = fetch(url).decode('utf-8')
    match = re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
    if not match:
        raise ValueError(f'Missing recipe data: {url}')
    recipe = json.loads(match.group(1), strict=False)
    if recipe.get('license') != 'https://creativecommons.org/licenses/by-sa/3.0/deed.de':
        raise ValueError(f'Unexpected license: {url}')
    if 'Text und Bilder sind unter der Lizenz' not in page:
        raise ValueError(f'Missing photo license statement: {url}')
    recipe['recipeIngredient'] = [html.unescape(x).strip() for x in recipe['recipeIngredient'] if x.strip()]
    recipe['recipeInstructions'] = html.unescape(recipe['recipeInstructions']).strip()
    photo_url = recipe['image'].replace('chuchitisch.ch//', 'chuchitisch.ch/')
    photo = fetch(photo_url)
    if not photo.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError(f'Expected original PNG: {photo_url}')
    recipe.update(source=url, originalImage=photo_url,
                  reviewedAt='2026-10-12', status='candidate',
                  photoSha256=hashlib.sha256(photo).hexdigest(),
                  textLicense='CC BY-SA 3.0', photoLicense='CC BY-SA 3.0',
                  licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',
                  licenseEvidence='http://chuchitisch.ch/chuchitisch/lizenz',
                  attributionBasis='Veröffentlichendes Autorenkonto; kein separater Fotograf genannt.',
                  importNotes={65: '2 l bereitgestellte Bouillon nicht automatisch als verzehrt berechnen.',
                               621: 'Krautstielblätter und Bundgewichte für Portionsberechnung dokumentieren.',
                               445: 'Original ergibt einen Kuchen; Stückzahl vor Import festlegen.',
                               128: 'Separate Rezeptfassung; vorhandenes bircher-mueesli nicht überschreiben.'}[recipe_id])
    TARGET.mkdir(parents=True, exist_ok=True)
    (TARGET / f'{recipe_id}.json').write_text(json.dumps(recipe, ensure_ascii=False, indent=2)+'\n')
    (TARGET / f'{recipe_id}.png').write_bytes(photo)
    print(f'{recipe_id}: {recipe["name"]}, Originalfoto {len(photo)} bytes', flush=True)

if __name__ == '__main__':
    license_page = fetch('http://chuchitisch.ch/chuchitisch/lizenz').decode('utf-8')
    if not all(x in license_page for x in ('sowohl Rezepte als auch Bilder', 'eigenen Fotos', 'by-sa/3.0')):
        raise ValueError('Source licensing statement changed')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(collect, IDS))
