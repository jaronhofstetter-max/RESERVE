"""Reproduce per-portion estimates from documented ingredient weights and USDA values."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
folder = root / 'docs/recipe-candidates/import-2026-11-27'
recipe = json.loads((root / 'data/quality-batch-wikibooks-v17.json').read_text())[0]
values = json.loads((folder / 'nutrition-values.json').read_text())
totals = dict.fromkeys(['kcal', 'protein', 'carbs', 'fat', 'fiber'], 0.0)
breakdown = []
for line in recipe['nutritionEstimate']['ingredients']:
    if line['excluded']:
        continue
    ref = values[line['foodKey']]
    v = ref['per100g']
    row = {key: line['grams'] * (v[key] - (v['fiber'] if key == 'carbs' and ref.get('carbohydrateBasis') == 'total-including-fiber' else 0)) / 100 for key in totals}
    breakdown.append({'ingredient': line['name'], 'grams': line['grams'], 'nutrition': row})
    for key in totals:
        totals[key] += row[key]
rounded = {key: round(value, 2) for key, value in totals.items()}
assert rounded == recipe['nutrition'], (rounded, recipe['nutrition'])
(folder / 'nutrition-calculation.json').write_text(json.dumps({'basis': 'Eine von vier Portionen; verfügbare Kohlenhydrate = USDA-Gesamtkohlenhydrate minus Ballaststoffe.', 'ingredients': breakdown, 'perPortionEstimate': rounded}, ensure_ascii=False, indent=2) + '\n')
print('Reproduced per-portion nutrition estimate:', rounded)
