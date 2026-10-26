"""Transparent diagnostic field checks against predeclared provisional targets.

No fuzzy name repair, no 14 -> 1/4 conversion, and no percent -> gram repair.
These counts are not a validated whole-recipe or independent accuracy score.
"""
import argparse
from fractions import Fraction
import json
from pathlib import Path
import re


def reading(raw):
    text = raw.translate(str.maketrans({'¼': '1/4', '½': '1/2', '¾': '3/4'}))
    match = re.search(r'(?<!\d)\d+(?:[.,]\d+)?(?:\s*[/⁄]\s*\d+)?', text)
    if not match:
        return {'quantity': None, 'unit': None}
    value = match.group().replace(' ', '').replace(',', '.').replace('⁄', '/')
    try:
        quantity = str(Fraction(value))
    except (ValueError, ZeroDivisionError):
        quantity = None
    rest = text[match.end():].lstrip(' .')
    word = re.match(r'([a-zA-ZäöüÄÖÜß]+)', rest)
    unit = {'g': 'g', 'gr': 'g', 'gramm': 'g', 'tl': 'TL', 'teel': 'TL',
            'teelöffel': 'TL', 'pkt': 'Pkt', 'pck': 'Pkt', 'päckchen': 'Pkt'}.get(word.group().casefold() if word else None)
    return {'quantity': quantity, 'unit': unit}


def fields(raw, target):
    found = reading(raw)
    fold = lambda value: ''.join(c for c in value.casefold() if c.isalpha())
    quantity = found['quantity'] == str(Fraction(target['quantity']))
    unit = target['unit'] is None or found['unit'] == target['unit']
    name = fold(target['name']) in fold(raw)
    return {'read': found, 'quantity_ok': quantity, 'unit_ok': unit, 'name_ok': name,
            'all_target_fields_ok': quantity and unit and name}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('run', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Never overwrite a previous evaluation')
    manifest = json.loads((args.run / 'manifest-frozen.json').read_text())
    results = json.loads((args.run / 'results.json').read_text())
    lookup = {(row['page_id'], row['input']): row for row in results}
    checks = []
    for page in manifest['pages']:
        for row in page['lines']:
            if 'target' not in row:
                continue
            raw = lookup[(page['id'], row['id'])]['raw']
            whole = lookup[(page['id'], 'whole-page')]['raw']
            checks.append({'page_id': page['id'], 'line_id': row['id'], 'target': row['target'],
                           'raw': raw, **fields(raw, row['target']),
                           'whole_page_target_fields_ok': fields(whole, row['target'])['all_target_fields_ok']})
    summary = {
        'diagnostic_pages': len(manifest['pages']), 'manual_line_crops': sum(len(page['lines']) for page in manifest['pages']),
        'predeclared_provisional_ingredient_targets': len(checks),
        'quantity_character_value_matches': sum(row['quantity_ok'] for row in checks),
        'quantity_unit_name_matches': sum(row['all_target_fields_ok'] for row in checks),
        'whole_page_quantity_unit_name_matches': sum(row['whole_page_target_fields_ok'] for row in checks),
        'references_user_verified': False, 'independent_accuracy_established': False,
        'auto_segmentation_tested': False, 'paid_inference_calls': 0,
        'all_eos': all(row['eos_reached'] for row in results),
        'token_limit_cases': sum(row['at_token_limit'] for row in results), 'checks': checks,
    }
    args.output.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({key: value for key, value in summary.items() if key != 'checks'}, indent=2))


if __name__ == '__main__':
    main()
