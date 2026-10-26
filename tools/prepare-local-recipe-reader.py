"""Download public reader assets at the checked revision; verify every SHA256."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('reader', choices=['paddle', 'qwen'])
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    repo = {'paddle': 'PaddlePaddle/PaddleOCR-VL-1.6', 'qwen': 'Qwen/Qwen3-VL-2B-Instruct'}[args.reader]
    filename = 'paddle-vl-diagnostic-lock.json' if args.reader == 'paddle' else 'qwen3-vl-diagnostic-lock.json'
    lock = json.loads((ROOT/'tools'/filename).read_text())
    args.output.mkdir(parents=True, exist_ok=True)

    def one(item):
        name, expected = item
        file = args.output/name
        if file.exists() and file.stat().st_size == expected['bytes'] and digest(file) == expected['sha256']:
            print('Verified cached ' + name, flush=True)
            return
        temp = file.with_name(file.name+'.partial')
        url = f"https://huggingface.co/{repo}/resolve/{lock['revision']}/{name}"
        h, size = hashlib.sha256(), 0
        with urllib.request.urlopen(url, timeout=90) as response, temp.open('wb') as dest:
            while chunk := response.read(4 * 1024 * 1024):
                dest.write(chunk)
                h.update(chunk)
                size += len(chunk)
        if size != expected['bytes'] or h.hexdigest() != expected['sha256']:
            raise ValueError('Download checksum mismatch: ' + name)
        temp.replace(file)
        print('Verified ' + name, flush=True)

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(one, lock['files'].items()))


if __name__ == '__main__':
    main()
