const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'assets/date-mobile-test');fs.mkdirSync(out,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const base={bundle:true,format:'iife',platform:'browser',target:'es2022',external:['fs','path'],minify:false,legalComments:'inline'};
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'engine.js')],outfile:path.join(out,'ocr-engine.js'),plugins:[require('./build-adapter.cjs')()]});
 for(const name of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])fs.copyFileSync(path.join(__dirname,'node_modules/onnxruntime-web/dist',name),path.join(out,name));
 fs.copyFileSync(path.join(__dirname,'node_modules/@gutenye/ocr-models/assets/ppocr_keys_v1.txt'),path.join(out,'ppocr_keys_v1.txt'));
 const names=['ch_PP-OCRv4_det_infer.onnx','ch_PP-OCRv4_rec_infer.onnx','ocr-engine.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm','ppocr_keys_v1.txt'];
 const files=names.map(name=>({name,bytes:fs.statSync(path.join(out,name)).size,sha256:hash(path.join(out,name))}));
 const manifest={schema:'reserve-mobile-date-runtime-v1',pipeline:'Unchanged PP-OCRv4 weights; GutenOCR1.4.9 adapted normalization/.3 threshold/static OpenCV; WASM1 thread; worker canvas; unchanged v2 roles; no180degree classifier',roleModuleSha:hash(path.join(__dirname,'date-roles.cjs')),totalBytes:files.reduce((a,x)=>a+x.bytes,0),files};
 fs.writeFileSync(path.join(__dirname,'generated-runtime-manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,'runtime-manifest.json'),JSON.stringify(manifest,null,2));
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'worker.js')],outfile:path.join(out,'date-worker.js')});
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'app.js')],outfile:path.join(out,'date-app.js')});
 fs.copyFileSync(path.join(__dirname,'page.html'),path.join(root,'experiments/date-mobile.html'));
 fs.cpSync(path.join(__dirname,'licenses'),path.join(out,'licenses'),{recursive:true});
 console.log('Built isolated mobile page, '+(manifest.totalBytes/1024/1024).toFixed(1)+' MiB runtime. No photos, OCR or test labels.');
})();
