#!/usr/bin/env python3
"""Offline benchmark for expiry crop/contrast/rotation strategies on real holdout images."""
import json, re, subprocess, sys, tempfile, time
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageStat

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else 'training/expiry/model-v2-dataset')
LIMIT=int(sys.argv[2]) if len(sys.argv)>2 else 0

def rows():
    data=[json.loads(x) for x in (ROOT/'test.jsonl').read_text(encoding='utf-8').splitlines() if x]
    return data[:LIMIT] if LIMIT else data

def contains_truth(text,row):
    digits=re.sub(r'\D','',text or '')
    target=row['target']; parts=target.split('-')
    if row['datePrecision']=='month':
        y,m=parts; return m+y in digits or m+y[2:] in digits or y+m in digits
    y,m,d=parts; return d+m+y in digits or d+m+y[2:] in digits or y+m+d in digits

def edge_bands(gray,fraction=.42,count=2):
    thumb=gray.copy();thumb.thumbnail((320,220));w,h=thumb.size;pix=thumb.load();scores=[]
    for y in range(h):
        vals=[pix[x,y] for x in range(w)];mean=sum(vals)/max(1,w)
        contrast=(sum((v-mean)**2 for v in vals)/max(1,w))**.5
        edge=sum(abs(vals[x]-vals[x-1]) for x in range(1,w))/max(1,w-1)
        scores.append(contrast+edge*.7)
    win=max(8,round(h*fraction));rank=[]
    for start in range(0,max(1,h-win+1),max(1,round(h*.04))):
        top=sorted(scores[start:start+win],reverse=True)[:max(3,win//3)]
        rank.append((sum(top)/len(top),start/h))
    selected=[]
    for _,start in sorted(rank,reverse=True):
        if all(abs(start-x)>=.16 for x in selected):selected.append(start)
        if len(selected)>=count:break
    return [(x,min(1,fraction)) for x in selected]

def prep(img,crop=None,mode='auto',angle=0):
    if crop:
        y,h=crop; img=img.crop((0,round(img.height*y),img.width,round(img.height*min(1,y+h))))
    gray=ImageOps.grayscale(img)
    scale=min(2.5,1100/max(1,gray.width));gray=gray.resize((round(gray.width*scale),max(90,round(gray.height*scale))))
    if mode=='auto': gray=ImageOps.autocontrast(gray,cutoff=1)
    elif mode=='threshold':
        gray=ImageOps.autocontrast(gray,cutoff=1);mean=ImageStat.Stat(gray).mean[0];gray=gray.point(lambda p:255 if p>mean else 0)
    elif mode=='detail': gray=ImageOps.autocontrast(gray,cutoff=1).filter(ImageFilter.UnsharpMask(radius=1.6,percent=180,threshold=2))
    if angle:gray=gray.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True,fillcolor=255)
    return gray

def raw(img):
    scale=min(1.8,1200/max(1,img.width));return img.resize((round(img.width*scale),round(img.height*scale)))

def variants(img,strategy):
    if strategy=='baseline':return [('full-auto',prep(img)),('fixed-auto',prep(img,(.20,.60))),('fixed-threshold',prep(img,(.20,.60),'threshold'))]
    gray=ImageOps.grayscale(img);bands=edge_bands(gray);best=bands[0] if bands else (.25,.5)
    out=[('raw-layout',raw(img)),('raw-sparse',raw(img)),('full-auto',prep(img)),('wide-auto',prep(img,(.08,.84),'auto')),('wide-detail',prep(img,(.08,.84),'detail'))]
    for i,band in enumerate(bands):out.extend([(f'band{i+1}-auto',prep(img,band,'auto')),(f'band{i+1}-threshold',prep(img,band,'threshold'))])
    out.extend([('best-rot-left',prep(img,best,'detail',-2.5)),('best-rot-right',prep(img,best,'detail',2.5))])
    return out

def ocr(image,psm=7):
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        image.save(f.name)
        try:return subprocess.run(['tesseract',f.name,'stdout','-l','eng','--psm',str(psm)],text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=8).stdout
        except subprocess.TimeoutExpired:return ''

def run(strategy,data):
    start=time.perf_counter();found=0;first=[];variant_hits={}
    for n,row in enumerate(data,1):
        image=Image.open(ROOT/row['image']).convert('RGB');hit=False
        for name,v in variants(image,strategy):
            text=ocr(v,11 if name=='raw-sparse' else 6 if name in ('raw-layout','full-auto') else 7);ok=contains_truth(text,row);variant_hits[name]=variant_hits.get(name,0)+int(ok)
            if ok and not hit:first.append({'id':row['id'],'variant':name});hit|=ok
        found+=int(hit);print(f'{strategy} {n}/{len(data)} found={found}',flush=True)
    elapsed=time.perf_counter()-start
    return {'strategy':strategy,'examples':len(data),'candidatePresent':found,'candidateRecall':found/len(data) if data else 0,'totalSeconds':round(elapsed,2),'meanSeconds':round(elapsed/len(data),2) if data else 0,'variantHits':variant_hits,'firstHits':first}

data=rows();report={'schema':'reserve-expiry-preprocessing-benchmark-v2','baseline':run('baseline',data),'model2':run('model2',data)}
print(json.dumps(report,ensure_ascii=False,indent=2))
