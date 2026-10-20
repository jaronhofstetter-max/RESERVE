/* Dedicated, disposable inference worker. No photo or OCR text leaves it by network. */
import Roles from './date-roles.cjs';
import Images from '../../date-image-recovery-v1.js';
import {mergeRecovery} from './recovery.js';
import {dates,normalize} from './date-parser.js';
import {imageSize} from './image-size.js';
import {resolveDateOrders} from './date-order.js';
import {planRegions,guardPrediction} from './regions.js';
let reader=null;
self.onmessage=async({data})=>{try{
 globalThis.RESERVE_DATE_PHASE=(stage,metrics={})=>self.postMessage({type:'phase',id:data.id,stage,metrics});
 if(data.type==='init'){
  globalThis.RESERVE_DATE_PHASE('engine_load');
  // Guten OCR's canvas backend is compatible with OffscreenCanvas in a worker.
  globalThis.document={createElement(name){if(name!=='canvas')throw Error('Unsupported worker element');return new OffscreenCanvas(1,1);}};
  const engineURL=URL.createObjectURL(new Blob([data.files['ocr-engine.js']],{type:'text/javascript'}));
  importScripts(engineURL);URL.revokeObjectURL(engineURL);
  const{Ocr,env,cv}=globalThis.RESERVE_DATE_BROWSER_OCR;
  env.wasm.numThreads=1;env.wasm.proxy=false;env.logLevel='error';
  env.wasm.wasmBinary=data.files['ort-wasm-simd-threaded.wasm'];
  env.wasm.wasmPaths={mjs:URL.createObjectURL(new Blob([data.files['ort-wasm-simd-threaded.mjs']],{type:'text/javascript'}))};
  globalThis.RESERVE_DATE_PHASE('opencv_init');
  if(!cv.Mat)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Bildverarbeitung konnte nicht starten.')),15000);cv.onRuntimeInitialized=()=>{clearTimeout(timer);resolve();};});
  globalThis.RESERVE_DATE_PHASE('model_init');
  reader=await Ocr.create({models:{detectionPath:new Uint8Array(data.files['ch_PP-OCRv4_det_infer.onnx']),recognitionPath:new Uint8Array(data.files['ch_PP-OCRv4_rec_infer.onnx']),dictionaryPath:URL.createObjectURL(new Blob([data.files['ppocr_keys_v1.txt']],{type:'text/plain'}))},onnxOptions:{executionProviders:['wasm'],graphOptimizationLevel:'all'},isDebug:false});
  self.postMessage({type:'ready'});return;
 }
 if(data.type==='recognize'){
  if(!reader)throw Error('Erkennung ist noch nicht bereit.');
  globalThis.RESERVE_DATE_REGIONS=data.strategy==='regions'?planRegions:null;
  globalThis.RESERVE_DATE_PHASE('image_resize');
  const bmp=data.bitmap,size=imageSize(bmp.width,bmp.height),canvas=new OffscreenCanvas(size.width,size.height),ctx=canvas.getContext('2d',{willReadFrequently:true});
  try{ctx.drawImage(bmp,0,0,canvas.width,canvas.height);}finally{bmp.close();}
  globalThis.RESERVE_DATE_PHASE('image_pixels',{width:size.width,height:size.height});
  const start=performance.now();
  const detect=async(source)=>{
   const r=await reader.detect({data:source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,source.width,source.height).data,width:source.width,height:source.height});
   const raw={id:data.id,width:r.resizedImageWidth,height:r.resizedImageHeight,seconds:(performance.now()-start)/1000,lines:(r.texts||r).map(l=>{const b=l.box||l.frame,bbox=Array.isArray(b)?[Math.min(...b.map(p=>p[0])),Math.min(...b.map(p=>p[1])),Math.max(...b.map(p=>p[0])),Math.max(...b.map(p=>p[1]))]:[b.left,b.top,b.left+b.width,b.top+b.height],text=normalize(l.text);return{text,confidence:l.mean??l.score,bbox,parsed_dates:dates(text)};})};
   const interpreted=resolveDateOrders(raw);
   globalThis.RESERVE_DATE_PHASE('date_order',{resolvedOrders:interpreted.resolved,unresolvedOrders:interpreted.unresolved});
   return{prediction:Roles.select(interpreted.raw),raw:interpreted.raw,coverage:r.coverage};
  };
  const first=await detect(canvas),retries=[];let p=first.prediction;
  if(data.strategy==='recovery'&&!p.candidates.length){
   for(const mode of ['contrast','rotate90']){
    globalThis.RESERVE_DATE_PHASE('image_recovery',{pass:retries.length+1});
    const retry=new OffscreenCanvas(mode==='rotate90'?canvas.height:canvas.width,mode==='rotate90'?canvas.width:canvas.height),x=retry.getContext('2d',{willReadFrequently:true});
    if(mode==='contrast'){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);pixels.data.set(Images.contrast(pixels.data,canvas.width,canvas.height));x.putImageData(pixels,0,0);}
    else{x.translate(retry.width,0);x.rotate(Math.PI/2);x.drawImage(canvas,0,0);}
    const result=await detect(retry);retries.push(result);retry.width=retry.height=1;
   }
   p=mergeRecovery(p,retries.map(r=>r.prediction));
  }
  globalThis.RESERVE_DATE_PHASE('date_selection');
  const raw=first.raw,r={coverage:first.coverage},interpreted={raw:{...raw,lines:[...raw.lines,...retries.flatMap(r=>r.raw.lines)]}},compact=c=>c?{date:c.date,precision:c.precision,role:c.role,confidence:c.confidence}:null;
  self.postMessage({type:'result',id:data.id,prediction:guardPrediction({suggestion:compact(p.suggestion),strict_expiry:compact(p.strict_expiry),alternatives:p.alternatives},r.coverage),coverage:r.coverage,inspection:interpreted.raw.lines.map(l=>({text:l.text,confidence:l.confidence,dates:l.parsed_dates.map(c=>c.date)})),candidateCount:p.candidates.length,seconds:(performance.now()-start)/1000});
 }
}catch(error){self.postMessage({type:'error',id:data.id,message:error.message||String(error)});}};
