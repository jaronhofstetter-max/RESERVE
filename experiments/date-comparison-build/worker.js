import Roles from '../date-mobile-build/date-roles.cjs';
import Formats from '../../date-format-v1.js';
import {dates,normalize} from '../date-mobile-build/date-parser.js';
import {resolveDateOrders} from '../date-mobile-build/date-order.js';
import {choose} from './choice.js';
let files=null,Ocr=null,readers={},initMs={};
const phase=(id,name)=>self.postMessage({type:'phase',id,name});
async function reader(version,id){
 if(readers[version])return readers[version];const start=performance.now();phase(id,'model-'+version);
 readers[version]=await Ocr.create({models:{detectionPath:new Uint8Array(files[version+'-det']),recognitionPath:new Uint8Array(files[version+'-rec']),dictionaryPath:URL.createObjectURL(new Blob([files[version+'-keys']],{type:'text/plain'}))},onnxOptions:{executionProviders:['wasm'],graphOptimizationLevel:'all'},isDebug:false});
 initMs[version]=Math.round(performance.now()-start);return readers[version];
}
self.onmessage=async({data})=>{try{
 if(data.type==='init'){
  files=data.files;globalThis.document={createElement(name){if(name!=='canvas')throw Error('Unsupported element');return new OffscreenCanvas(1,1);}};
  const url=URL.createObjectURL(new Blob([files.engine],{type:'text/javascript'}));importScripts(url);URL.revokeObjectURL(url);
  const api=globalThis.RESERVE_DATE_BROWSER_OCR;Ocr=api.Ocr;api.env.wasm.numThreads=1;api.env.wasm.proxy=false;api.env.logLevel='error';api.env.wasm.wasmBinary=files.wasm;api.env.wasm.wasmPaths={mjs:URL.createObjectURL(new Blob([files.mjs],{type:'text/javascript'}))};
  if(!api.cv.Mat)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Bildverarbeitung konnte nicht starten.')),15000);api.cv.onRuntimeInitialized=()=>{clearTimeout(timeout);resolve();};});
  await reader('v4',data.id);self.postMessage({type:'ready',id:data.id,initMs});return;
 }
 if(data.type==='photo'){
  const start=performance.now(),bmp=data.bitmap,scale=Math.min(1,960/Math.max(bmp.width,bmp.height)),c=new OffscreenCanvas(Math.max(1,Math.round(bmp.width*scale)),Math.max(1,Math.round(bmp.height*scale))),x=c.getContext('2d',{willReadFrequently:true});try{x.drawImage(bmp,0,0,c.width,c.height);}finally{bmp.close();}
  const scan=async version=>{phase(data.id,'read-'+version);const engine=await reader(version,data.id),t=performance.now(),r=await engine.detect({data:x.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height});
   const raw={id:data.id,width:r.resizedImageWidth||c.width,height:r.resizedImageHeight||c.height,lines:(r.texts||r).map(l=>{const b=l.box||l.frame,text=normalize(l.text);return{text,confidence:l.mean??l.score,bbox:Array.isArray(b)?[Math.min(...b.map(p=>p[0])),Math.min(...b.map(p=>p[1])),Math.max(...b.map(p=>p[0])),Math.max(...b.map(p=>p[1]))]:[b.left,b.top,b.left+b.width,b.top+b.height],parsed_dates:dates(text)};})};
   const interpreted=resolveDateOrders(raw);return{raw:interpreted.raw,prediction:Roles.select(interpreted.raw,version==='v4'?.8:.9),ms:Math.round(performance.now()-t)};
  };
  const base=await scan('v4');let extra=null;if(!base.prediction.candidates.length||data.forceV5)extra=await scan('v5');const selected=choose(base.prediction,extra?.prediction);
  const compact=p=>p?.suggestion?{date:p.suggestion.date,precision:p.suggestion.precision,role:p.suggestion.role,requiresConfirmation:true}:null;
  const text=[...base.raw.lines,...(extra?.raw.lines||[])].map(l=>l.text).join('\n');
  self.postMessage({type:'result',id:data.id,baseline:compact(base.prediction),candidate:compact(selected.prediction),supplement:extra?compact(extra.prediction):null,usedFallback:selected.usedFallback,v4Ms:base.ms,v5Ms:extra?.ms??null,v4Lines:base.raw.lines.length,v5Lines:extra?.raw.lines.length??null,initMs,totalMs:Math.round(performance.now()-start),width:c.width,height:c.height,shortYears:Formats.shortYears(text),browserPipeline:true,physicalPhoneTest:false});
 }
}catch(e){self.postMessage({type:'error',id:data.id,message:e.message||String(e)});}};
