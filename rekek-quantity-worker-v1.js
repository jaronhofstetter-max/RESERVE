/* Runs only in the explicitly enabled experiment. No image upload or native runtime. */
importScripts('rekek-quantity-core-v1.js?v=20261017-crops-3');
let sessions;
async function load(){if(!sessions)sessions=(async()=>{
 importScripts('assets/rekek/quantity-test/vendor/ort.wasm.min.js');
 ort.env.wasm.wasmPaths=new URL('assets/rekek/quantity-test/vendor/',self.location).href;
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.logLevel='error';
 const base='assets/rekek/quantity-test/',options={executionProviders:['wasm'],graphOptimizationLevel:'all'};
 const [ctc,encoder,decoder,config,vocab]=await Promise.all([ort.InferenceSession.create(base+'ctc.onnx',options),ort.InferenceSession.create(base+'encoder-int8.onnx',options),ort.InferenceSession.create(base+'decoder-int8.onnx',options),fetch(base+'ctc-config.json').then(r=>{if(!r.ok)throw Error('model');return r.json()}),fetch(base+'vocab.json').then(r=>{if(!r.ok)throw Error('model');return r.json()})]);return{ctc,encoder,decoder,config,vocab};
 })().catch(e=>{sessions=null;throw e});return sessions;}
function resized(pixels,width,height,w,h,gray){const a=new OffscreenCanvas(width,height);a.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);const b=new OffscreenCanvas(w,h),ctx=b.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(a,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data,out=new Float32Array(w*h*(gray?1:3));for(let i=0;i<w*h;i++){if(gray)out[i]=Math.round(.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2])/255;else for(let c=0;c<3;c++)out[c*w*h+i]=data[i*4+c]/127.5-1;}return out;}
self.onmessage=async({data:m})=>{try{const s=await load();if(m.type==='load'){self.postMessage({id:m.id,ready:true});return;}const w=Math.max(4,Math.min(1024,Math.round(m.width*64/m.height))),pad=Math.ceil(w/4)*4,gray=resized(m.pixels,m.width,m.height,w,64,true),x=new Float32Array(64*pad).fill(1);for(let y=0;y<64;y++)x.set(gray.subarray(y*w,(y+1)*w),y*pad);
 const result=await s.ctc.run({image:new ort.Tensor('float32',x,[1,1,64,pad])}),logits=result[s.config.output_name],readings=[{reader:'ctc-htr',text:RESERVE_QUANTITY_CORE.ctc(logits.data,logits.dims[1],logits.dims[2],s.config.alphabet)}];
 const hidden=(await s.encoder.run({pixels:new ort.Tensor('float32',resized(m.pixels,m.width,m.height,384,384,false),[1,3,384,384])})).hidden,ids=[0];let ended=false;
 for(let step=0;step<32;step++){const out=await s.decoder.run({ids:new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),hidden}),v=out.logits.data;if(ids.length>=2)for(let j=0;j<ids.length-2;j++)if(ids[j]===ids.at(-2)&&ids[j+1]===ids.at(-1))v[ids[j+2]]=-Infinity;let best=0;for(let i=1;i<v.length;i++)if(v[i]>v[best])best=i;out.logits.dispose();ids.push(best);if(best===2){ended=true;break;}}
 hidden.dispose();for(const t of Object.values(result))t.dispose();
 const text=ids.filter(i=>i>3&&i!==64001).map(i=>s.vocab[i]||'').join('').replace(/▁/g,' ').trim();readings.push({reader:'trocr-int8',text,truncated:!ended});self.postMessage({id:m.id,readings});
 }catch(e){self.postMessage({id:m.id,error:String(e.message||e).slice(0,500)});}};
