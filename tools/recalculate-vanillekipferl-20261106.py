"""Recalculate stored estimates from documented grams and reference values."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
recipe = json.loads((root / 'data/quality-batch-wikibooks-v5.json').read_text())[0]
values = json.loads((root / recipe['nutritionEstimate']['sources']).read_text())
total = dict.fromkeys(('kcal', 'protein', 'carbs', 'fat', 'fiber'), 0.0)
for ingredient in recipe['nutritionEstimate']['ingredients']:
    if ingredient['excluded']:
        continue
    per = values[ingredient['foodKey']]['per100g']
    for nutrient in total:
        value = max(0, per['carbs'] - per['fiber']) if nutrient == 'carbs' else per[nutrient]
        total[nutrient] += value * ingredient['grams'] / 100
result = {key: round(value, 2) for key, value in total.items()}
assert result == recipe['nutrition'], (result, recipe['nutrition'])
print(json.dumps(result, ensure_ascii=False))
