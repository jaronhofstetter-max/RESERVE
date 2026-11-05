import {regionPixels,lineAgreement} from './line-guard.js';
let files=null,readers={};const phase=(id,name)=>self.postMessage({type:'phase',id,name});
self.onmessage=async({data})=>{try{
 if(data.type==='init'){
  files=data.files;globalThis.document={createElement(name){if(name!=='canvas')throw Error('Unsupported element');return new OffscreenCanvas(1,1);}};
  const url=URL.createObjectURL(new Blob([files.engine],{type:'text/javascript'}));importScripts(url);URL.revokeObjectURL(url);
  const api=globalThis.RESERVE_DATE_BROWSER_OCR;api.env.wasm.numThreads=1;api.env.wasm.proxy=false;api.env.logLevel='error';api.env.wasm.wasmBinary=files.wasm;api.env.wasm.wasmPaths={mjs:URL.createObjectURL(new Blob([files.mjs],{type:'text/javascript'}))};
  if(!api.cv.Mat)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Bildverarbeitung konnte nicht starten.')),15000);api.cv.onRuntimeInitialized=()=>{clearTimeout(timer);resolve();};});
  for(const version of ['v4','v5']){phase(data.id,'model-'+version);readers[version]=await api.createLineReader({models:{recognitionPath:new Uint8Array(files[version+'-rec']),dictionaryPath:URL.createObjectURL(new Blob([files[version+'-keys']],{type:'text/plain'}))},onnxOptions:{executionProviders:['wasm'],graphOptimizationLevel:'all'},isDebug:false});}
  self.postMessage({type:'ready',id:data.id});return;
 }
 if(data.type==='line'){
  const start=performance.now(),bmp=data.bitmap;let canvas,rect;
  try{
   if(data.confirmed!==true||bmp.width*bmp.height>30000000)throw Error('Bitte genau eine Datumszeile markieren und bestätigen.');
   rect=regionPixels(data.region,bmp.width,bmp.height);if(!rect)throw Error('Bitte einen waagerechten Datumsstreifen mit etwas Rand markieren.');
   const scale=Math.min(1,960/rect.w);canvas=new OffscreenCanvas(Math.max(1,Math.round(rect.w*scale)),Math.max(1,Math.round(rect.h*scale)));canvas.getContext('2d').drawImage(bmp,rect.x,rect.y,rect.w,rect.h,0,0,canvas.width,canvas.height);
  }finally{bmp.close();}
  const image={data:canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height},values={},times={};
  for(const version of ['v4','v5']){phase(data.id,'read-'+version);const t=performance.now(),lines=await readers[version](image);times[version]=Math.round(performance.now()-t);values[version]=lines.length===1?{text:lines[0].text,confidence:lines[0].mean??lines[0].score}:{text:'',confidence:0};}
  const decision=lineAgreement(values.v4,values.v5);
  self.postMessage({type:'result',id:data.id,...decision,confidences:{v4:values.v4.confidence,v5:values.v5.confidence},times,totalMs:Math.round(performance.now()-start),width:canvas.width,height:canvas.height,region:data.region,assistedOnly:true,automaticAccuracyEvaluated:false});
 }
}catch(e){self.postMessage({type:'error',id:data.id,message:e.message||String(e)});}};
