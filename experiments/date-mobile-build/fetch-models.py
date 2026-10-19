"""Extract checksum-pinned public models without importing an ML runtime."""
from pathlib import Path
import hashlib,json,sys,urllib.request,zipfile
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
TARGET=ROOT/'assets/date-mobile-test'
SOURCE=json.loads((HERE/'model-source.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if len(sys.argv)>1:p=Path(sys.argv[1])
else:
 p=ROOT/'build'/SOURCE['filename'];p.parent.mkdir(exist_ok=True)
 if not p.exists() or sha(p)!=SOURCE['sha256']:
  with urllib.request.urlopen(SOURCE['url'],timeout=120) as response:p.write_bytes(response.read())
assert sha(p)==SOURCE['sha256'],'Upstream wheel checksum mismatch'
expected={'ch_PP-OCRv4_det_infer.onnx':'d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9','ch_PP-OCRv4_rec_infer.onnx':'48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b'}
TARGET.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(p) as z:
 for name,want in expected.items():
  data=z.read('rapidocr_onnxruntime/models/'+name);assert hashlib.sha256(data).hexdigest()==want
  (TARGET/name).write_bytes(data)
print('Verified two unchanged public PP-OCRv4 models; no runtime imported')
