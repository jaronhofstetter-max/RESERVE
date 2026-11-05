"""Fetch two checksum-pinned public v5 models; read ONNX metadata without ML imports."""
from pathlib import Path
import hashlib,json,urllib.request
HERE=Path(__file__).resolve().parent;OUT=HERE.parents[1]/'assets/date-comparison';OUT.mkdir(exist_ok=True,parents=True)
MODELS={
 'ch_PP-OCRv5_det_mobile.onnx':('det','4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae'),
 'latin_PP-OCRv5_rec_mobile.onnx':('rec','b20bd37c168a570f583afbc8cd7925603890efbcdc000a59e22c269d160b5f5a')}
def varint(data,pos):
 value=shift=0
 while True:
  b=data[pos];pos+=1;value|=(b&127)<<shift
  if not b&128:return value,pos
  shift+=7
  if shift>63:raise ValueError('Invalid protobuf varint')
def fields(data):
 p=0
 while p<len(data):
  key,p=varint(data,p);field,wire=key>>3,key&7
  if wire==2:
   size,p=varint(data,p);end=p+size
   if end>len(data):raise ValueError('Invalid ONNX field length')
   yield field,data[p:end];p=end
  elif wire==0:_,p=varint(data,p)
  elif wire==1:p+=8
  elif wire==5:p+=4
  else:raise ValueError('Unsupported ONNX field')
sources=[]
for name,(kind,want) in MODELS.items():
 url=f'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.9.2/onnx/PP-OCRv5/{kind}/{name}';p=OUT/name
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=want:
  with urllib.request.urlopen(url,timeout=120) as response:data=response.read()
  assert hashlib.sha256(data).hexdigest()==want,'Model checksum mismatch';p.write_bytes(data)
 sources.append(dict(name=name,sha256=want,source=url))
rec=(OUT/'latin_PP-OCRv5_rec_mobile.onnx').read_bytes();metadata={}
for key,data in fields(rec):
 if key==14:
  entry=dict(fields(data));metadata[entry[1].decode()]=entry[2].decode()
dictionary=metadata['character'].rstrip('\n');assert len(dictionary.split('\n'))==502
(OUT/'latin-v5-keys.txt').write_text(dictionary,encoding='utf-8')
(OUT/'model-sources.json').write_text(json.dumps(sources,indent=2))
print('Verified PP-OCRv5 detector/Latin recognizer and extracted502 metadata characters; no runtime imported')
