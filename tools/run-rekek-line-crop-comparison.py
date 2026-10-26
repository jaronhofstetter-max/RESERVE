"""Compare a pinned local line reader on whole pages and predeclared crops.

Use tools/rekek_strict_offline.py to block networking before library imports.
Private manifests/images/outputs must stay outside the published checkout.
Manual line boxes are an assisted diagnostic, not an automatic layout pipeline.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import time

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()


def checked_manifest(path):
    manifest = json.loads(path.read_text())
    if manifest.get('schema') != 1 or manifest.get('group') != 'previously-used-diagnostic':
        raise ValueError('This runner is only for previously-used diagnostic pages')
    if not manifest.get('pages'):
        raise ValueError('No pages')
    ids = set()
    for page in manifest['pages']:
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', page['id']) or page['id'] in ids:
            raise ValueError('Duplicate page ID')
        ids.add(page['id'])
        if digest(page['source']) != page['sha256']:
            raise ValueError('Source checksum mismatch')
        if not page.get('lines'):
            raise ValueError('No line boxes')
        line_ids = set()
        for row in page['lines']:
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', row['id']) or row['id'] in line_ids:
                raise ValueError('Duplicate line ID')
            line_ids.add(row['id'])
            box = row['box']
            width, height = page['size']
            if len(box) != 4 or not all(type(v) is int for v in box) or not (0 <= box[0] < box[2] <= width and 0 <= box[1] < box[3] <= height):
                raise ValueError('Invalid crop box')
            if digest(path.parent / row['image']) != row['sha256']:
                raise ValueError('Crop checksum mismatch')
    return manifest


def reached_eos(token_ids, eos):
    choices = eos if isinstance(eos, (list, tuple)) else [eos]
    return any(value in token_ids[1:] for value in choices if value is not None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('model', type=Path)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(ROOT):
        raise ValueError('Private predictions must stay outside the published checkout')
    if args.output.exists():
        raise ValueError('Output exists; never overwrite original predictions')
    manifest = checked_manifest(args.manifest)
    lock_path = ROOT / 'tools/rekek-german-model-lock.json'
    lock = json.loads(lock_path.read_text())
    for row in lock['files']:
        file = args.model / row['file']
        if file.stat().st_size != row['bytes'] or digest(file) != row['sha256']:
            raise ValueError('Model checksum mismatch: ' + row['file'])
    os.environ['USE_TF'] = '0'
    os.environ['USE_TORCH'] = '1'
    import torch
    from PIL import Image
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.manual_seed(0)
    args.output.mkdir()
    freeze = {
        'reader': lock['source'], 'revision': lock['revision'],
        'model_lock_sha256': digest(lock_path), 'manifest_sha256': digest(args.manifest),
        'runner_sha256': digest(__file__), 'network_launcher_sha256': digest(ROOT / 'tools/rekek_strict_offline.py'),
        'device': 'cpu', 'dtype': 'float32', 'threads': 4,
        'generation': {'max_new_tokens': 384, 'do_sample': False, 'num_beams': 1},
        'crop_method': manifest['crop_method'], 'reference_status': manifest['reference_status'],
        'whole_page_outside_models_intended_input': True,
        'model_trained_here': False, 'independent_accuracy_established': False,
        'versions': {name: importlib.metadata.version(name) for name in ['torch', 'transformers', 'Pillow', 'sentencepiece', 'safetensors']},
    }
    (args.output / 'freeze.json').write_text(json.dumps(freeze, ensure_ascii=False, indent=2))
    (args.output / 'manifest-frozen.json').write_bytes(args.manifest.read_bytes())
    processor = TrOCRProcessor.from_pretrained(args.model, local_files_only=True, use_fast=False)
    model = VisionEncoderDecoderModel.from_pretrained(args.model, local_files_only=True, attn_implementation='eager').eval()
    (args.output / 'model-generation-config.json').write_text(model.generation_config.to_json_string())
    results = []
    for page in manifest['pages']:
        source = Image.open(page['source']).convert('RGB')
        if list(source.size) != page['size']:
            raise ValueError('Image dimensions changed')
        cases = [('whole-page', source, None)] + [(row['id'], source.crop(row['box']), row) for row in page['lines']]
        for kind, image, row in cases:
            # Pixel identity is checked as well as the stored crop file hash.
            if row and image.tobytes() != Image.open(args.manifest.parent / row['image']).convert('RGB').tobytes():
                raise ValueError('Crop pixels disagree with declared box')
            started = time.monotonic()
            pixels = processor(images=image, return_tensors='pt').pixel_values
            with torch.inference_mode():
                ids = model.generate(pixels, **freeze['generation'])
            token_ids = ids[0].tolist()
            raw = processor.batch_decode(ids, skip_special_tokens=True)[0]
            result = {'page_id': page['id'], 'input': kind, 'raw': raw, 'token_ids': token_ids,
                      'elapsed_seconds': time.monotonic() - started,
                      'eos_reached': reached_eos(token_ids, model.generation_config.eos_token_id),
                      'at_token_limit': len(token_ids) - 1 >= freeze['generation']['max_new_tokens']}
            results.append(result)
            # Persist unchanged output before any interpretation, after each case.
            (args.output / f"{page['id']}-{kind}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
            print(json.dumps({'page': page['id'], 'input': kind, 'characters': len(raw), 'elapsed_seconds': round(result['elapsed_seconds'], 2)}, ensure_ascii=False), flush=True)
    if digest(args.manifest) != freeze['manifest_sha256'] or digest(__file__) != freeze['runner_sha256']:
        raise ValueError('Input/code changed during inference')
    (args.output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print('Completed local diagnostic; manual crops, provisional references, no production accuracy claim.', flush=True)


if __name__ == '__main__':
    main()
