"""Runner validation only; does not load a model or claim OCR accuracy."""
import importlib.util
from pathlib import Path
import tempfile
import json
import hashlib

spec = importlib.util.spec_from_file_location('comparison', Path(__file__).with_name('run-rekek-line-crop-comparison.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert module.reached_eos([0, 23, 2], [2])
assert module.reached_eos([0, 23, 2], 2)
assert module.reached_eos([0, 23, 3], [2, 3])
assert not module.reached_eos([0, 23], [2])
assert not module.reached_eos([0, 23], None)
with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    image = root / 'image.bin'
    image.write_bytes(b'checksum-test')
    sha = hashlib.sha256(image.read_bytes()).hexdigest()
    value = {'schema': 1, 'group': 'previously-used-diagnostic', 'pages': [{
        'id': 'page-1', 'source': str(image), 'sha256': sha, 'size': [100, 100],
        'lines': [{'id': 'line-01', 'box': [0, 0, 100, 30], 'image': 'image.bin', 'sha256': sha}]}]}
    path = root / 'manifest.json'
    path.write_text(json.dumps(value))
    assert module.checked_manifest(path) == value
    for box in [[0, 0, 101, 30], [0, 0, 100, 0], [0, 0, 100.5, 30], [-1, 0, 20, 30]]:
        value['pages'][0]['lines'][0]['box'] = box
        path.write_text(json.dumps(value))
        try:
            module.checked_manifest(path)
        except ValueError:
            pass
        else:
            raise AssertionError('Invalid crop accepted')
    value['pages'][0]['lines'][0]['box'] = [0, 0, 100, 30]
    value['pages'][0]['lines'][0]['sha256'] = '0' * 64
    path.write_text(json.dumps(value))
    try:
        module.checked_manifest(path)
    except ValueError:
        pass
    else:
        raise AssertionError('Changed crop accepted')
print('Line comparison geometry, checksums and scalar/list EOS validation passed; no inference performed.')

spec = importlib.util.spec_from_file_location('scoring', Path(__file__).with_name('score-rekek-line-crop-comparison.py'))
scoring = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scoring)
target = {'quantity': '1/4', 'unit': 'TL', 'name': 'Salz'}
assert scoring.fields('¼ Teelöffel Salz', target)['all_target_fields_ok']
assert not scoring.fields('14 Teelöffel Salz', target)['quantity_ok']
assert not scoring.fields('1/4 Teelöftel Salz', target)['unit_ok']
assert not scoring.fields('100% Zucker', {'quantity': '100', 'unit': 'g', 'name': 'Zucker'})['all_target_fields_ok']
assert not scoring.fields('125 g unde', {'quantity': '125', 'unit': 'g', 'name': 'Mehl'})['name_ok']
assert scoring.reading('1/0 TL Salz')['quantity'] is None
print('Diagnostic fields reject wrong fractions, unit/spelling repairs and swapped ingredient names.')
