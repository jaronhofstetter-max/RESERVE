#!/usr/bin/env python3
"""Benchmark a Tesseract language model on a synthetic-only holdout set."""
from __future__ import annotations
import json, os, re, subprocess, sys
from calendar import monthrange
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

root=Path(sys.argv[1] if len(sys.argv)>1 else 'training/expiry/synthetic-holdout')
language=sys.argv[2] if len(sys.argv)>2 else 'eng'
rows=[json.loads(x) for x in (root/'synthetic-train.jsonl').read_text().splitlines() if x]

def valid(y,m,d):
    y=int(y);m=int(m);d=int(d);y=y+2000 if y<70 else y+1900 if y<100 else y
    try:return date(y,m,d).isoformat() if 2000<=y<=2045 else ''
    except ValueError:return ''
def parse(text):
    for pattern,order in [(r'(?<!\d)(20\d{2})\D{1,3}(\d{1,2})\D{1,3}(\d{1,2})(?!\d)',(0,1,2)),(r'(?<!\d)(\d{1,2})\D{1,3}(\d{1,2})\D{1,3}(\d{2,4})(?!\d)',(2,1,0))]:
        match=re.search(pattern,text)
        if match:
            parts=match.groups();value=valid(parts[order[0]],parts[order[1]],parts[order[2]])
            if value:return value
    match=re.search(r'(?<!\d)(\d{1,2})\D{1,3}(\d{2,4})(?!\d)',text)
    if match:
        month,year=map(int,match.groups());year=year+2000 if year<70 else year+1900 if year<100 else year
        if 2000<=year<=2045 and 1<=month<=12:return f'{year:04d}-{month:02d}-{monthrange(year,month)[1]:02d}'
    return ''
def one(row):
    env=os.environ.copy();env['OMP_THREAD_LIMIT']='1'
    try:run=subprocess.run(['tesseract',str(root/row['image']),'stdout','-l',language,'--psm','6'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=10,env=env)
    except subprocess.TimeoutExpired:return row['date'],'','',True
    raw=run.stdout.decode(errors='ignore');return row['date'],parse(raw),raw.strip(),False
with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(one,rows))
correct=sum(target==prediction for target,prediction,_,_ in results);detected=sum(bool(prediction) for _,prediction,_,_ in results);timeouts=sum(timeout for *_,timeout in results)
report={'schema':'reserve-expiry-ocr-benchmark-v1','language':language,'holdout_images':len(rows),'exact_correct':correct,'exact_accuracy':round(correct/len(rows),4),'date_detected':detected,'detection_rate':round(detected/len(rows),4),'timeouts':timeouts}
(root/f'{language}-ocr-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
