import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {guardPrediction,planRegions} from '../experiments/date-mobile-build/regions.js';
import {imageSize} from '../experiments/date-mobile-build/image-size.js';
const dir='experiments/date-mobile-build/';
assert.deepEqual(imageSize(4000,3000),{width:960,height:720});
assert.deepEqual(imageSize(3000,4000),{width:720,height:960});
assert.deepEqual(imageSize(640,180),{width:640,height:180});

// Exercise the actual worker control flow, using a fake inference engine.
const messages=[],canvases=[];
class Canvas{constructor(width,height){this.width=width;this.height=height;canvases.push(this);}getContext(){return{drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(this.width*this.height*4)})};}}
const scope={console,performance,Blob,Uint8Array,OffscreenCanvas:Canvas,setTimeout,clearTimeout,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Roles:{select:()=>({candidates:[]})},dates:()=>[],normalize:x=>x,self:{postMessage:m=>messages.push(m)}};
scope.importScripts=()=>{scope.RESERVE_DATE_BROWSER_OCR={env:{wasm:{}},cv:{Mat:true},Ocr:{create:async()=>({detect:async()=>{scope.RESERVE_DATE_PHASE('detection_inference',{width:960,height:736});return{resizedImageWidth:960,resizedImageHeight:736,texts:[]};}})}};};
vm.createContext(scope);vm.runInContext(fs.readFileSync(dir+'worker.js','utf8').replace(/^import .*;\n/gm,''),scope);
scope.imageSize=imageSize;scope.planRegions=planRegions;scope.guardPrediction=guardPrediction;
await scope.self.onmessage({data:{type:'init',files:{}}});
assert.equal(messages.at(-1).type,'ready');let closed=false;
await scope.self.onmessage({data:{type:'recognize',id:'photo',bitmap:{width:4000,height:3000,close(){closed=true;}}}});
assert.equal(closed,true);assert.equal(canvases.at(-1).width,960);assert.equal(canvases.at(-1).height,720);
assert.ok(messages.some(m=>m.stage==='model_init'&&!m.id));assert.ok(messages.some(m=>m.stage==='image_pixels'&&m.metrics.width===960));assert.equal(messages.at(-1).type,'result');assert.equal(messages.at(-1).id,'photo');

// Exercise main-thread phase capture, timeout, worker disposal and late replies.
let now=0,worker,downloadBlob,decode;
const timers=new Map();let tid=0;
const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{disabled:false,hidden:false,value:'',validity:{valid:true},setAttribute(){},removeAttribute(){},click(){},textContent:''});return elements.get(id);};
class Worker{constructor(){worker=this;}postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));}terminate(){this.terminated=true;}}
const ui={console,performance:{now:()=>now},document:{getElementById:element,addEventListener(){},createElement:()=>({click(){}})},manifest:{files:[],totalBytes:0},location:{href:'https://example.test/experiments/date-mobile.html'},URL:class extends URL{static createObjectURL(x){if(x instanceof Blob)downloadBlob=x;return 'blob:test';}static revokeObjectURL(){}},Worker,OffscreenCanvas:Canvas,createImageBitmap:()=>new Promise(resolve=>{decode=resolve;}),crypto:{subtle:{}},AbortController,DOMException,Blob,navigator:{userAgent:'test'},setTimeout:f=>{timers.set(++tid,f);return tid;},clearTimeout:id=>timers.delete(id)};
vm.createContext(ui);vm.runInContext(fs.readFileSync(dir+'app.js','utf8').replace(/^import .*;\n/gm,''),ui);
await vm.runInContext('prepare()',ui);assert.equal(element('capture').disabled,false);
const first=vm.runInContext("picked({})",ui);const oldWorker=worker;
now=10;decode({close(){}});await first;
oldWorker.onmessage({data:{type:'phase',id:vm.runInContext('job.id',ui),stage:'detection_inference',metrics:{width:960,rawText:'MUST NOT EXPORT'}}});
now=10000;for(const callback of [...timers.values()])callback();
assert.equal(oldWorker.terminated,true);assert.equal(element('capture').disabled,true);
assert.equal(vm.runInContext('last.state',ui),'timeout');assert.equal(vm.runInContext('last.diagnostics.lastStage',ui),'detection_inference');
assert.ok(!vm.runInContext('JSON.stringify(last)',ui).includes('MUST NOT EXPORT'));
const prior=vm.runInContext('JSON.stringify(last)',ui);oldWorker.onmessage({data:{type:'result',id:'stale',prediction:{suggestion:{date:'2099-01-01'}}}});assert.equal(vm.runInContext('JSON.stringify(last)',ui),prior);
element('expectedDate').value='2026-12-01';element('precision').value='day';element('expectedRole').value='expiry';vm.runInContext('saveReview(false)',ui);element('export').onclick();const exported=JSON.parse(await downloadBlob.text());
assert.equal(exported.schema,'reserve-date-mobile-review-v2');assert.equal(exported.rows[0].diagnostics.lastStage,'detection_inference');assert.equal(exported.rows[0].preparation.lastStage,'ready');assert.equal(exported.rows[0].photoIncluded,false);
// Also locate a stalled main-thread image decode, before dispatch.
await vm.runInContext('prepare()',ui);const stalled=vm.runInContext('picked({})',ui);now=20000;for(const callback of [...timers.values()])callback();assert.equal(vm.runInContext('last.diagnostics.lastStage',ui),'image_decode');decode({close(){}});await stalled;
console.log('✓ Bounded image size, worker stages, phase redaction/export, decode/inference timeouts and stale-worker isolation. Mocked inference; no phone/accuracy claim.');
