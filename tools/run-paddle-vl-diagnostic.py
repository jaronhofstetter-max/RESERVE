"""Local-only OCR diagnostic; not the publisher's full document-layout pipeline.

Run through tools/rekek_strict_offline.py after downloading the public model.
Never put private manifests, outputs or images inside the published checkout.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('model_directory', type=Path)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Output exists; original diagnostic runs cannot be overwritten')
    lock_path = ROOT / 'tools/paddle-vl-diagnostic-lock.json'
    lock = json.loads(lock_path.read_text())
    for name, expected in lock['files'].items():
        file = args.model_directory / name
        if file.stat().st_size != expected['bytes'] or digest(file) != expected['sha256']:
            raise ValueError('Model checksum mismatch: ' + name)
    manifest = json.loads(args.manifest.read_text())
    cases = manifest['cases']
    if not cases or len({row['id'] for row in cases}) != len(cases):
        raise ValueError('Empty/duplicate diagnostic case IDs')
    for row in cases:
        if not re.fullmatch(r'[-a-zA-Z0-9_]{1,100}', row['id']):
            raise ValueError('Invalid case ID')
        if row['group'] not in ['diagnostic', 'synthetic']:
            raise ValueError('This element-reader probe is not a blind production test')
        if row['pageCount'] != 1:
            raise ValueError('Provide one raster image per diagnostic case')
        image = args.manifest.resolve().parent / row['path']
        if digest(image) != row['sha256']:
            raise ValueError('Image checksum mismatch')
    os.environ['USE_TF'] = '0'
    os.environ['USE_TORCH'] = '1'
    import torch
    from PIL import Image
    from transformers import AutoModelForImageTextToText, AutoProcessor
    from transformers.utils.logging import disable_progress_bar
    disable_progress_bar()
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.manual_seed(0)
    args.output.mkdir()
    code_paths = [Path(__file__).resolve(), ROOT/'tools/rekek_strict_offline.py',
                  ROOT/'personal-recipe-parser-v1.js', ROOT/'tools/rekek-page-evaluation.mjs']
    freeze = {
        'reader': 'PaddlePaddle/PaddleOCR-VL-1.6', 'revision': lock['revision'],
        'kind': 'element-reader-on-whole-raster-diagnostic-not-layout-pipeline',
        'model_lock_sha256': digest(lock_path), 'manifest_sha256': digest(args.manifest),
        'code_sha256': {str(p.relative_to(ROOT)): digest(p) for p in code_paths},
        'prompt': 'OCR:', 'max_new_tokens': 1024, 'do_sample': False,
        'device': 'cpu', 'dtype': 'bfloat16', 'threads': 4,
        'max_pixels': 1280 * 28 * 28,
        'min_pixels': json.loads((args.model_directory/'preprocessor_config.json').read_text())['min_pixels'],
        'versions': {name: importlib.metadata.version(name) for name in
                     ['torch', 'transformers', 'safetensors', 'tokenizers', 'Pillow', 'sentencepiece']},
        'independent_accuracy_established': False,
    }
    (args.output/'freeze.json').write_text(json.dumps(freeze, indent=2))
    (args.output/'manifest-frozen.json').write_bytes(args.manifest.read_bytes())
    started = time.monotonic()
    model = AutoModelForImageTextToText.from_pretrained(
        args.model_directory, dtype=torch.bfloat16, local_files_only=True,
        trust_remote_code=False, attn_implementation='sdpa').to('cpu').eval()
    processor = AutoProcessor.from_pretrained(
        args.model_directory, local_files_only=True, trust_remote_code=False)
    freeze['model_load_seconds'] = time.monotonic() - started
    (args.output/'freeze.json').write_text(json.dumps(freeze, indent=2))
    print('MODEL_LOADED', flush=True)
    results = []
    for row in cases:
        dest = args.output/row['id']
        dest.mkdir()
        file = args.manifest.resolve().parent/row['path']
        if digest(file) != row['sha256']:
            raise ValueError('Image changed after freeze')
        image = Image.open(file).convert('RGB')
        messages = [{'role': 'user', 'content': [
            {'type': 'image', 'image': image}, {'type': 'text', 'text': freeze['prompt']}]}]
        inputs = processor.apply_chat_template(
            messages, add_generation_prompt=True, tokenize=True,
            return_dict=True, return_tensors='pt', images_kwargs={'size': {
                'shortest_edge': freeze['min_pixels'], 'longest_edge': freeze['max_pixels']}})
        # Transformers 5.0's native processor leaves image arrays as NumPy
        # despite return_tensors='pt'. Convert types only, without changing pixels.
        inputs = {key: value if isinstance(value, torch.Tensor) else torch.as_tensor(value)
                  for key, value in inputs.items()}
        started = time.monotonic()
        with torch.inference_mode():
            output = model.generate(**inputs, max_new_tokens=freeze['max_new_tokens'],
                                    do_sample=False, use_cache=True)
        ids = output[0][inputs['input_ids'].shape[-1]:].tolist()
        raw = processor.decode(ids, skip_special_tokens=True)
        (dest/'raw.txt').write_text(raw)
        (dest/'token-ids.json').write_text(json.dumps(ids))
        eos = model.generation_config.eos_token_id
        eos = eos if isinstance(eos, list) else [eos]
        result = {'id': row['id'], 'elapsed_seconds': time.monotonic()-started,
                  'new_tokens': len(ids), 'ended_with_eos': bool(ids and ids[-1] in eos),
                  'image_size': list(image.size), 'reference_status': row.get('referenceStatus'),
                  'input_tokens': inputs['input_ids'].shape[-1]}
        (dest/'result.json').write_text(json.dumps(result, indent=2))
        # The exact existing text parser remains downstream of the raw reader.
        parsed = subprocess.run(['node', '--input-type=module', '-e',
            'import{parseOCR}from"./tools/rekek-page-evaluation.mjs";'
            'let s="";for await(const c of process.stdin)s+=c;'
            'console.log(JSON.stringify(parseOCR(s)));'], input=raw, text=True,
            capture_output=True, check=True, cwd=ROOT)
        (dest/'prediction.json').write_text(parsed.stdout)
        results.append(result)
        (args.output/'results.json').write_text(json.dumps(results, indent=2))
        print(json.dumps(result), flush=True)
    for name, expected in lock['files'].items():
        if digest(args.model_directory/name) != expected['sha256']:
            raise ValueError('Model changed during inference')
    for p in code_paths:
        if digest(p) != freeze['code_sha256'][str(p.relative_to(ROOT))]:
            raise ValueError('Code changed during inference')
    if digest(args.manifest) != freeze['manifest_sha256']:
        raise ValueError('Manifest changed during inference')
    (args.output/'verification.json').write_text(json.dumps({'checksums_unchanged': True}))


if __name__ == '__main__':
    main()
