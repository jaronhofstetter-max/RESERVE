const fs=require('fs'),path=require('path'),crypto=require('crypto'),esbuild=require('../date-mobile-build/node_modules/esbuild');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'assets/date-comparison'),old=path.join(root,'assets/date-mobile-test');fs.mkdirSync(out,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const base={bundle:true,format:'iife',platform:'browser',target:'es2022',external:['fs','path'],minify:false,legalComments:'inline'};
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'worker.js')],outfile:path.join(out,'comparison-worker.js')});
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'app.js')],outfile:path.join(out,'comparison-app.js')});
 const definitions=[['engine',old,'ocr-engine.js','date-mobile-test'],['wasm',old,'ort-wasm-simd-threaded.wasm','date-mobile-test'],['mjs',old,'ort-wasm-simd-threaded.mjs','date-mobile-test'],['v4-det',old,'ch_PP-OCRv4_det_infer.onnx','date-mobile-test'],['v4-rec',old,'ch_PP-OCRv4_rec_infer.onnx','date-mobile-test'],['v4-keys',old,'ppocr_keys_v1.txt','date-mobile-test'],['v5-det',out,'ch_PP-OCRv5_det_mobile.onnx','date-comparison'],['v5-rec',out,'latin_PP-OCRv5_rec_mobile.onnx','date-comparison'],['v5-keys',out,'latin-v5-keys.txt','date-comparison'],['worker',out,'comparison-worker.js','date-comparison']];
 const files=definitions.map(([key,dir,name,folder])=>({key,url:'../assets/'+folder+'/'+name,bytes:fs.statSync(path.join(dir,name)).size,sha256:hash(path.join(dir,name))}));
 const manifest={schema:'reserve-browser-date-comparison-v1',pipeline:'Browser-specific GutenOCR1.4.9/WASM1 thread, unchanged v4+v5 Latin weights,960px maximum, no180degree classifier. Retain every v4 candidate list; v5 threshold0.9 only if v4 has zero candidates. Separate browser parser and explicit year confirmation; not native16/29 accuracy.',totalBytes:files.reduce((a,r)=>a+r.bytes,0),files};
 fs.writeFileSync(path.join(out,'runtime-manifest.json'),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(root,'experiments/date-comparison.html'),fs.readFileSync(path.join(__dirname,'page.html'),'utf8').replace('__RUNTIME_MB__',String(Math.ceil(manifest.totalBytes/1000000))));
 for(const name of ['LICENSE-RapidOCR.txt','PaddleOCR-LICENSE.md'])fs.copyFileSync(path.join(__dirname,name),path.join(out,name));
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'line-engine.js')],outfile:path.join(out,'line-engine.js'),plugins:[require('../date-mobile-build/build-adapter.cjs')()]});
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'line-worker.js')],outfile:path.join(out,'line-worker.js')});
 await esbuild.build({...base,entryPoints:[path.join(__dirname,'line-app.js')],outfile:path.join(out,'line-app.js')});
 const lineDefinitions=[['engine',out,'line-engine.js','date-comparison'],['wasm',old,'ort-wasm-simd-threaded.wasm','date-mobile-test'],['mjs',old,'ort-wasm-simd-threaded.mjs','date-mobile-test'],['v4-rec',old,'ch_PP-OCRv4_rec_infer.onnx','date-mobile-test'],['v4-keys',old,'ppocr_keys_v1.txt','date-mobile-test'],['v5-rec',out,'latin_PP-OCRv5_rec_mobile.onnx','date-comparison'],['v5-keys',out,'latin-v5-keys.txt','date-comparison'],['worker',out,'line-worker.js','date-comparison']];
 const lineFiles=lineDefinitions.map(([key,dir,name,folder])=>({key,url:'../assets/'+folder+'/'+name,bytes:fs.statSync(path.join(dir,name)).size,sha256:hash(path.join(dir,name))}));
 const lineManifest={schema:'reserve-manual-date-line-runtime-v1',assistedOnly:true,automaticAccuracyEvaluated:false,pipeline:'Manually selected single line; direct recognition with unchanged PP-OCRv4/v5 Latin weights, GutenOCR normalization and WASM one thread; two-reader full-token agreement and explicit reference confirmation. No detection, no inferred date role, no automatic-accuracy evidence.',totalBytes:lineFiles.reduce((a,f)=>a+f.bytes,0),files:lineFiles};
 fs.writeFileSync(path.join(out,'line-manifest.json'),JSON.stringify(lineManifest,null,2));
 fs.writeFileSync(path.join(root,'experiments/date-line.html'),fs.readFileSync(path.join(__dirname,'line-page.html'),'utf8').replace('__RUNTIME_MB__',String(Math.ceil(lineManifest.totalBytes/1000000))).replace('__APP_SHA__',hash(path.join(out,'line-app.js')).slice(0,16)));
 console.log('Built isolated comparison page; runtime '+(manifest.totalBytes/1024/1024).toFixed(1)+' MiB. No private photos or reference dates.');
})();

