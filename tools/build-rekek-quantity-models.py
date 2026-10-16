"""Build the opt-in browser experiment from pinned public weights, without recipe inputs.

Network is used only by the explicit download stage. Export/inference imports start
after a fail-closed OS network lock. No model repository Python code is executed.
"""
from pathlib import Path
import hashlib,json,urllib.request,sys
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/rekek/quantity-test';CACHE=ROOT/'build/rekek-model-source'
LOCK=json.loads((ROOT/'tools/rekek-german-model-lock.json').read_text())
def download(url,path,digest):
    if path.exists()and hashlib.sha256(path.read_bytes()).hexdigest()==digest:return
    path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.partial')
    with urllib.request.urlopen(url,timeout=120)as src,tmp.open('wb')as dst:
        while chunk:=src.read(1024*1024):dst.write(chunk)
    if hashlib.sha256(tmp.read_bytes()).hexdigest()!=digest:raise ValueError('Source hash mismatch: '+path.name)
    tmp.replace(path)
if '--export-only'not in sys.argv:
    for entry in LOCK['files']:
        download(LOCK['source']+'/resolve/'+LOCK['revision']+'/'+entry['file'],CACHE/entry['file'],entry['sha256'])
    download('https://huggingface.co/naeyn/de-htr-web-v2/resolve/6241c1ff0fd42725e0dc46fcd3217469cac851bb/model-fp32.onnx',OUT/'ctc.onnx','68b46411b8236b44d0d98865909d217ef13b41f12db769993c67eeb8d6e8c45a')
    download('https://huggingface.co/naeyn/de-htr-web-v2/resolve/6241c1ff0fd42725e0dc46fcd3217469cac851bb/config.json',OUT/'ctc-config.json','4ebd69d9d27b398ea3997b031318accc13123f6a8950def1fedc6e364cb758fa')
if '--download-only'in sys.argv:sys.exit(0)
from rekek_strict_offline import lock_network
lock_network()
import torch
from transformers import VisionEncoderDecoderModel
from onnxruntime.quantization import quantize_dynamic,QuantType
torch.set_num_threads(4)
model=VisionEncoderDecoderModel.from_pretrained(CACHE,local_files_only=True,attn_implementation='eager').eval()
class Encoder(torch.nn.Module):
    def __init__(self):super().__init__();self.encoder=model.encoder
    def forward(self,pixels):return self.encoder(pixel_values=pixels,return_dict=False)[0]
class Decoder(torch.nn.Module):
    def __init__(self):super().__init__();self.decoder=model.decoder
    def forward(self,ids,hidden):return self.decoder(input_ids=ids,encoder_hidden_states=hidden,use_cache=False,return_dict=False)[0][:,-1,:]
for name,module,args,names,axes in [('encoder',Encoder(),(torch.zeros(1,3,384,384),),['pixels'],{}),('decoder',Decoder(),(torch.tensor([[0,12,13]],dtype=torch.int64),torch.zeros(1,578,384)),['ids','hidden'],{'ids':{1:'sequence'}})]:
    full=CACHE/(name+'.onnx');OUT.mkdir(parents=True,exist_ok=True)
    torch.onnx.export(module,args,str(full),input_names=names,output_names=['hidden'if name=='encoder'else'logits'],dynamic_axes=axes,opset_version=17,dynamo=False)
    quantize_dynamic(str(full),str(OUT/(name+'-int8.onnx')),weight_type=QuantType.QInt8,op_types_to_quantize=['MatMul','Gemm'])
    print('Exported',name,flush=True)
vocab=json.loads((CACHE/'tokenizer.json').read_text())['model']['vocab'];(OUT/'vocab.json').write_text(json.dumps([x[0]for x in vocab],ensure_ascii=False))
files=['encoder-int8.onnx','decoder-int8.onnx','ctc.onnx','ctc-config.json','vocab.json','deu.traineddata','baseline/deu.traineddata']
(OUT/'model-manifest.json').write_text(json.dumps({'experiment':True,'trocr_source_revision':LOCK['revision'],'generation':{'start':0,'end':2,'max_new_tokens':32,'no_repeat_ngram_size':3},'files':{n:{'bytes':(OUT/n).stat().st_size,'sha256':hashlib.sha256((OUT/n).read_bytes()).hexdigest()}for n in files}},indent=2))
