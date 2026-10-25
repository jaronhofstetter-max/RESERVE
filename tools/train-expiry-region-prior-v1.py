"""Offline visual date-region ranking experiment. No OCR text or target at inference.

Inputs: preserved detector-v1 manifest, archived ExpDate images and PP-OCR cache.
This measures region retention, not date interpretation or end-to-end app accuracy.
"""
import argparse, hashlib, io, json, math, os, random, time, zipfile
from pathlib import Path
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
import numpy as np
from PIL import Image, ImageOps
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix

SEED = 20261019
FEATURE_VERSION = 'gray96x32-cell8-hog9-projections-geometry-v1'
ZIPS = {}

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def image(row, archives):
    name = row['image']['archive']
    if name not in ZIPS:
        ZIPS[name] = zipfile.ZipFile(archives / name)
    data = ZIPS[name].read(row['image']['entry'])
    assert hashlib.sha256(data).hexdigest() == row['sha256']
    return Image.open(io.BytesIO(data)).convert('RGB')

def features(im, box):
    x, y, xx, yy = box
    crop = im.crop((max(0, int(x)), max(0, int(y)), min(im.width, math.ceil(xx)), min(im.height, math.ceil(yy))))
    if crop.width < 1 or crop.height < 1:
        raise ValueError('Empty region')
    a = np.asarray(ImageOps.autocontrast(crop.convert('L')).resize((96, 32), Image.Resampling.BILINEAR), dtype=np.float32) / 255
    gy, gx = np.gradient(a)
    magnitude = np.hypot(gx, gy)
    bins = np.floor((np.arctan2(gy, gx) % np.pi) * (9 / np.pi)).astype(int).clip(0, 8)
    hist = np.zeros((4, 12, 9), dtype=np.float32)
    for b in range(9):
        hist[:, :, b] = np.where(bins == b, magnitude, 0).reshape(4, 8, 12, 8).sum(axis=(1, 3))
    hist /= np.sqrt((hist * hist).sum(axis=2, keepdims=True) + 1e-6)
    contrast = a.std()
    projections = np.r_[a.mean(axis=0), a.mean(axis=1)]
    geometry = [math.log(max(.05, (xx-x)/(yy-y))), (xx-x)/im.width, (yy-y)/im.height, contrast]
    return np.r_[hist.ravel(), projections, geometry].astype(np.float32)

def coverage(a, b):
    area = max(0, min(a[2], b[2])-max(a[0], b[0])) * max(0, min(a[3], b[3])-max(a[1], b[1]))
    return area / max(1, (a[2]-a[0])*(a[3]-a[1]))

def samples(rows, archives, augment):
    xs, ys, ids = [], [], []
    for i, row in enumerate(rows):
        im = image(row, archives)
        rng = random.Random(SEED + int(hashlib.sha256(row['id'].encode()).hexdigest()[:8], 16))
        annotations = row['annotations']
        for annotation in annotations:
            box = annotation['bbox']
            boxes = [box]
            if augment:
                x, y, xx, yy = box
                dx, dy = .06*(xx-x), .15*(yy-y)
                boxes.append([x-dx, y-dy, xx+dx, yy+dy])
            for b in boxes:
                xs.append(features(im, b)); ys.append(int(annotation['cls'] == 'date')); ids.append(row['id'])
        # Two deterministically placed background proposals; ignore every annotated field.
        for _ in range(2):
            for attempt in range(30):
                ref = rng.choice(annotations)['bbox']
                h = max(8, min(im.height*.12, ref[3]-ref[1]))
                w = min(im.width*.8, h*rng.uniform(2, 15))
                x = rng.uniform(0, im.width-w); y = rng.uniform(0, im.height-h)
                b = [x, y, x+w, y+h]
                if all(coverage(a['bbox'], b) == 0 and coverage(b, a['bbox']) == 0 for a in annotations):
                    xs.append(features(im, b)); ys.append(0); ids.append(row['id']); break
        if (i+1) % 100 == 0:
            print('Prepared', i+1, '/', len(rows), flush=True)
    return np.array(xs), np.array(ys), ids

def gap(a, b):
    return max(a[0]-b[2], b[0]-a[2], 0), max(a[1]-b[3], b[1]-a[3], 0)

def plan(boxes, scores=None):
    if len(boxes) <= 24:
        return list(range(len(boxes)))
    heights = sorted(b[3]-b[1] for b in boxes); median = heights[len(heights)//2]
    if scores is None:
        scores = []
        for i, b in enumerate(boxes):
            w, h = b[2]-b[0], b[3]-b[1]
            nearest = min(math.hypot(*gap(b, o))/max(h, median) for j, o in enumerate(boxes) if i != j)
            scores.append(min(h/median, 3)*2+min(nearest, 3)+(1 if 2 <= w/h <= 20 else 0)-(2 if w/h > 35 else 0))
    ranked = sorted(range(len(boxes)), key=lambda i: (-scores[i], i))
    selected = set(ranked[:8])
    for index in ranked[:8]:
        b = boxes[index]; bw, bh = b[2]-b[0], b[3]-b[1]
        nearby = []
        for i, o in enumerate(boxes):
            if i in selected:
                continue
            dx, dy = gap(b, o); ow, oh = o[2]-o[0], o[3]-o[1]
            if dy <= max(bh, oh)*6 and dx <= max(bw, ow):
                nearby.append((dy/max(bh, oh)+dx/max(bw, ow), i))
        for _, i in sorted(nearby)[:2]:
            if len(selected) < 24:
                selected.add(i)
    for i in ranked:
        if len(selected) < 24:
            selected.add(i)
    return sorted(selected)

def train(args):
    out = args.output; out.mkdir(parents=True, exist_ok=True)
    assert not (out/'protocol.json').exists(), 'Use a new output directory'
    manifest = json.loads(args.manifest.read_text())
    train_rows = manifest['train_real']; val_rows = manifest['checkpoint_validation']
    groups = {k: {r['group_id'] for r in manifest[k]} for k in ['train_real', 'validation', 'protected']}
    assert not groups['train_real'] & (groups['validation'] | groups['protected'])
    assert all(r['training_allowed'] and not r['holdout_protected'] for r in train_rows)
    protocol = dict(seed=SEED, feature_version=FEATURE_VERSION, training_photos=len(train_rows), synthetic_photos=0,
        selection_photos=len(val_rows), calibration_photos=81, test_photos=100, group_intersections=0,
        task='Rank already detected text regions visually before recognition; not a new text detector or date recognizer',
        labels='Published date boxes positive; due/prod/code and two disjoint random crops per image negative. Other unannotated fields may be imperfect background labels.',
        augmentation='One fixed 6% horizontal / 15% vertical padding view for each training annotation; no validation augmentation',
        model='StandardScaler + balanced L2 logistic regression; C in [.01,.1,1]',
        selection='Highest average precision on 40 fixed internal photos; tie smaller C. No source or historical test tuning.',
        retention='Same 24-region cap and eight seeds plus neighbours as existing geometric strategy; only seed ranking changes',
        metric='Ground-truth date box has >=50% area covered by a retained cached OCR box; report full and dense >24 separately',
        acceptance='On 81 cached internal photos, date-box retention must improve and target-containing photos must not decrease. Otherwise reject before protected test.',
        limitations=['Cached native PP-OCR boxes are after text confidence filtering and may differ from browser detector boxes.', 'No phone speed or end-to-end MHD accuracy claim.', 'Public source tests and historical images are reused regression tests, not fresh blind tests.', 'Partial reads cannot produce strict MHD.'],
        manifest_sha256=digest(args.manifest), script_sha256=digest(Path(__file__)), deployed=False)
    dump(out/'protocol.json', protocol)
    start = time.monotonic()
    x, y, ids = samples(train_rows, args.archives, True)
    vx, vy, vids = samples(val_rows, args.archives, False)
    np.savez_compressed(out/'training-features.npz', x=x, y=y, vx=vx, vy=vy)
    scale = StandardScaler().fit(x); x = scale.transform(x); vx = scale.transform(vx)
    candidates = []
    for c in [.01, .1, 1]:
        clf = LogisticRegression(C=c, class_weight='balanced', solver='liblinear', max_iter=1000, random_state=SEED).fit(x, y)
        scores = clf.decision_function(vx)
        result = dict(C=c, average_precision=float(average_precision_score(vy, scores)), confusion_matrix_at_zero=confusion_matrix(vy, scores >= 0).tolist(), iterations=clf.n_iter_.tolist())
        candidates.append((result, clf))
        print(result, flush=True)
    result, clf = max(candidates, key=lambda p: (p[0]['average_precision'], -p[0]['C']))
    dump(out/'selection-before-retention.json', dict(selected=result, candidates=[r for r, _ in candidates], train_regions=len(y), train_positive=int(y.sum()), validation_regions=len(vy), validation_positive=int(vy.sum()), seconds=time.monotonic()-start))
    dump(out/'model.json', dict(feature_version=FEATURE_VERSION, coefficients=clf.coef_[0].tolist(), intercept=float(clf.intercept_[0]), mean=scale.mean_.tolist(), scale=scale.scale_.tolist(), C=result['C']))
    dump(out/'training-membership.json', dict(train=sorted(set(ids)), validation=sorted(set(vids)), training_groups=sorted(groups['train_real'])))

def score(im, boxes, model):
    x = np.array([features(im, b) for b in boxes])
    return ((x-np.array(model['mean']))/np.array(model['scale'])) @ np.array(model['coefficients']) + model['intercept']

def retention(args, cohort):
    out = args.output; protocol = json.loads((out/'protocol.json').read_text())
    assert protocol['script_sha256'] == digest(Path(__file__))
    model = json.loads((out/'model.json').read_text()); manifest = json.loads(args.manifest.read_text())
    if cohort == 'internal':
        excluded = {r['id'] for r in manifest['checkpoint_validation']}
        rows = [r for r in manifest['validation'] if r['id'] not in excluded]
    else:
        acceptance = json.loads((out/'retention-internal.json').read_text())['accepted']
        assert (out/'selection-before-protected.json').exists()
        rows = manifest['end_to_end_test']
    raw = {r['id']: r for p in args.ocr_cache.glob('*.json') for r in [json.loads(p.read_text())]}
    records = []
    start = time.monotonic()
    for row in rows:
        r = raw[row['id']]; boxes = [l['bbox'] for l in r['lines']]
        im = image(row, args.archives)
        assert (im.width, im.height) == (r['width'], r['height'])
        predicted = score(im, boxes, model) if boxes else []
        choices = dict(full=list(range(len(boxes))), geometric=plan(boxes), learned=plan(boxes, predicted))
        targets = [a for a in row['annotations'] if a['cls'] in ['date', 'exp']]
        modes = {}
        for mode, indices in choices.items():
            hits = [any(coverage(a['bbox'], boxes[i]) >= .5 for i in indices) for a in targets]
            expiry = [v for a, v in zip(targets, hits) if a['cls'] == 'exp']
            modes[mode] = dict(boxes_found=sum(hits), photos_with_date=int(any(hits)), expiry_found=int(any(expiry)), indices=indices)
        records.append(dict(id=row['id'], dense=len(boxes)>24, proposed=len(boxes), target_boxes=len(targets), modes=modes))
    metrics = {}
    for subset, subset_rows in [('all', records), ('dense', [r for r in records if r['dense']])]:
        metrics[subset] = dict(photos=len(subset_rows), target_boxes=sum(r['target_boxes'] for r in subset_rows), modes={m: {k:sum(r['modes'][m][k] for r in subset_rows) for k in ['boxes_found', 'photos_with_date', 'expiry_found']} for m in ['full','geometric','learned']})
    a = metrics['all']['modes']; accepted = a['learned']['boxes_found'] > a['geometric']['boxes_found'] and a['learned']['photos_with_date'] >= a['geometric']['photos_with_date']
    result = dict(cohort=cohort, metrics=metrics, accepted=accepted if cohort=='internal' else None, seconds=time.monotonic()-start, model_sha256=digest(out/'model.json'), records=records)
    dump(out/f'retention-{cohort}.json', result)
    if cohort == 'internal':
        dump(out/'selection-before-protected.json', dict(selected='learned' if accepted else 'geometric', reason='Predeclared internal retention criterion', model_sha256=digest(out/'model.json'), deployed=False))
    print(json.dumps(dict(cohort=cohort, metrics=metrics, accepted=result['accepted']), indent=2), flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage', choices=['train','internal','protected'])
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--archives', type=Path, required=True)
    parser.add_argument('--ocr-cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.stage == 'train': train(args)
    else: retention(args, args.stage)
