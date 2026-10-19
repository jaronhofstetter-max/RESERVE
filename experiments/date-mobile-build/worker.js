/* Dedicated, disposable inference worker. No photo or OCR text leaves it by network. */
import Roles from './date-roles.cjs';
import {dates,normalize} from './date-parser.js';
let reader=null;
self.onmessage=async({data})=>{try{
 if(data.type==='init'){
  // Guten OCR's canvas backend is compatible with OffscreenCanvas in a worker.
  globalThis.document={createElement(name){if(name!=='canvas')throw Error('Unsupported worker element');return new OffscreenCanvas(1,1);}};
  const engineURL=URL.createObjectURL(new Blob([data.files['ocr-engine.js']],{type:'text/javascript'}));
  importScripts(engineURL);URL.revokeObjectURL(engineURL);
  const{Ocr,env,cv}=globalThis.RESERVE_DATE_BROWSER_OCR;
  env.wasm.numThreads=1;env.wasm.proxy=false;env.logLevel='error';
  env.wasm.wasmBinary=data.files['ort-wasm-simd-threaded.wasm'];
  env.wasm.wasmPaths={mjs:URL.createObjectURL(new Blob([data.files['ort-wasm-simd-threaded.mjs']],{type:'text/javascript'}))};
  if(!cv.Mat)await new Promise((resolve,reject)=>{cv.onRuntimeInitialized=resolve;setTimeout(()=>reject(Error('Bildverarbeitung konnte nicht starten.')),15000);});
  reader=await Ocr.create({models:{detectionPath:new Uint8Array(data.files['ch_PP-OCRv4_det_infer.onnx']),recognitionPath:new Uint8Array(data.files['ch_PP-OCRv4_rec_infer.onnx']),dictionaryPath:URL.createObjectURL(new Blob([data.files['ppocr_keys_v1.txt']],{type:'text/plain'}))},onnxOptions:{executionProviders:['wasm'],graphOptimizationLevel:'all'},isDebug:false});
  self.postMessage({type:'ready'});return;
 }
 if(data.type==='recognize'){
  if(!reader)throw Error('Erkennung ist noch nicht bereit.');
  const bmp=data.bitmap,scale=Math.min(1,1600/Math.max(bmp.width,bmp.height)),canvas=new OffscreenCanvas(Math.max(1,Math.round(bmp.width*scale)),Math.max(1,Math.round(bmp.height*scale))),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();
  const start=performance.now(),r=await reader.detect({data:ctx.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height});
  const raw={id:data.id,width:r.resizedImageWidth,height:r.resizedImageHeight,seconds:(performance.now()-start)/1000,lines:(r.texts||r).map(l=>{const b=l.box||l.frame,bbox=Array.isArray(b)?[Math.min(...b.map(p=>p[0])),Math.min(...b.map(p=>p[1])),Math.max(...b.map(p=>p[0])),Math.max(...b.map(p=>p[1]))]:[b.left,b.top,b.left+b.width,b.top+b.height],text=normalize(l.text);return{text,confidence:l.mean??l.score,bbox,parsed_dates:dates(text)};})};
  const p=Roles.select(raw),compact=c=>c?{date:c.date,precision:c.precision,role:c.role,confidence:c.confidence}:null;
  self.postMessage({type:'result',id:data.id,prediction:{suggestion:compact(p.suggestion),strict_expiry:compact(p.strict_expiry)},candidateCount:p.candidates.length,seconds:raw.seconds});
 }
}catch(error){self.postMessage({type:'error',id:data.id,message:error.message||String(error)});}};
