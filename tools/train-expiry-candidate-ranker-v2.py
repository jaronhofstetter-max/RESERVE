#!/usr/bin/env python3
"""Train/evaluate the conservative date candidate ranker on a Model 2 dataset."""
import json, re, sys
from pathlib import Path
from datetime import datetime
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else 'training/expiry/model-v2-dataset')
OUT=Path(sys.argv[2] if len(sys.argv)>2 else ROOT/'candidate-ranker-report.json')
DATE_RE=re.compile(r'(?<!\d)(\d{1,2})\s*([.\-/])\s*(\d{1,2})(?:\s*\2\s*(\d{2,4}))?(?!\d)')
COMPACT_RE=re.compile(r'(?<!\d)(\d{6}|\d{8})(?!\d)')
KEYWORDS=('haltbar','mindestens','best before','expiry','expires','consommer','preferibilmente','ende')
NEGWORDS=('charge','lot','batch','produziert','production','hergestellt')

def load(split):
    p=ROOT/f'{split}.jsonl'
    return [json.loads(x) for x in p.read_text(encoding='utf-8').splitlines() if x]
def year(y):
    y=int(y);return 2000+y if y<70 else (1900+y if y<100 else y)
def make(d,m,y,start,end,text,kind):
    try:
        y=year(y);datetime(y,m,d)
        if not 1990<=y<=2045:return None
    except ValueError:return None
    before=text[max(0,start-70):start].lower();after=text[end:end+35].lower()
    return {'date':f'{y:04d}-{m:02d}-{d:02d}','month':f'{y:04d}-{m:02d}','start':start,'context':before+' '+after,'kind':kind}
def candidates(text):
    out=[]
    for m in DATE_RE.finditer(text or ''):
        if m.group(4) is None:continue
        a,b,y=int(m.group(1)),int(m.group(3)),m.group(4)
        for d,mo,k in ((a,b,'separated'),(b,a,'swapped')):
            if k=='swapped' and (a>12 or a==b):continue
            c=make(d,mo,y,m.start(),m.end(),text,k)
            if c:out.append(c)
    for m in COMPACT_RE.finditer(text or ''):
        s=m.group(1);forms=[(int(s[:2]),int(s[2:4]),int(s[4:])),(int(s[-2:]),int(s[-4:-2]),int(s[:-4]))]
        for d,mo,y in forms:
            c=make(d,mo,y,m.start(),m.end(),text,'compact')
            if c:out.append(c)
    seen=set();return [c for c in out if not ((c['date'],c['start']) in seen or seen.add((c['date'],c['start'])))]
def match(c,x):return c['month']==x['target'] if x['datePrecision']=='month' else c['date']==x['target']
def features(c,x):
    text=x.get('rawOCR','');ctx=c['context'];target_year=int(c['date'][:4])
    return {'kind='+c['kind']:1,'year_delta':target_year-2026,'future':int(target_year>=2025),
      'keyword':int(any(k in ctx for k in KEYWORDS)),'negword':int(any(k in ctx for k in NEGWORDS)),
      'position='+str(min(9,int(10*c['start']/max(1,len(text))))):1,'ocr_strategy='+x.get('ocrStrategy','unknown'):1}
def score(model,examples,threshold):
    ceiling=predicted=correct=0
    for x in examples:
        cs=candidates(x.get('rawOCR',''));ceiling+=int(any(match(c,x) for c in cs))
        if not cs:continue
        probs=model.predict_proba([features(c,x) for c in cs])[:,1];i=int(probs.argmax())
        if probs[i]>=threshold:predicted+=1;correct+=int(match(cs[i],x))
    n=len(examples);return {'examples':n,'candidatePresent':ceiling,'candidateCeiling':ceiling/n if n else 0,
      'predicted':predicted,'coverage':predicted/n if n else 0,'correct':correct,'precision':correct/predicted if predicted else 0,'endToEnd':correct/n if n else 0}

train,val,test=map(load,('train','validation','test'));X=[];y=[]
for x in train:
    for c in candidates(x.get('rawOCR','')):X.append(features(c,x));y.append(int(match(c,x)))
if len(set(y))<2:raise SystemExit('Need both positive and negative candidate rows')
model=Pipeline([('vec',DictVectorizer()),('clf',LogisticRegression(class_weight='balanced',max_iter=2000,random_state=42))]).fit(X,y)
choices=[]
for n in range(25,96):
    t=n/100;m=score(model,val,t)
    if m['predicted'] and m['precision']>=.95:choices.append((m['predicted'],t))
threshold=max(choices)[1] if choices else .8
report={'model':'Reserve MHD candidate ranker v2 baseline','datasetSha256':json.loads((ROOT/'summary.json').read_text())['sha256'],
 'threshold':threshold,'candidateRows':len(X),'positiveRows':sum(y),'train':score(model,train,threshold),
 'validation':score(model,val,threshold),'test':score(model,test,threshold),
 'productionEligible':False,'note':'Diagnostic baseline only. Test was evaluated once after validation threshold selection.'}
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
