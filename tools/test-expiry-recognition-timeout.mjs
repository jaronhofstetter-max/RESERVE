import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('expiry-camera-v1.js','utf8');
function harness(){
 const nodes=new Map(),timers=new Map(),stored=new Map();let now=0,timerId=0,detect,visionSignal,visionResolve;
 class Element{
  constructor(tag){this.tagName=tag;this.style={};this.dataset={};this.attrs={};this.children=[];this.listeners={};this.value='';this.type='date';this.validity={valid:true};this._text='';}
  set id(v){this._id=v;nodes.set(v,this)}get id(){return this._id}
  set textContent(v){this._text=v;this.children=[]}get textContent(){return this._text}
  appendChild(e){this.children.push(e);e.parentNode=this;return e}insertBefore(e){return this.appendChild(e)}after(e){nodes.set(e.id,e)}
  setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}dispatchEvent(e){for(const fn of this.listeners[e.type]||[])fn(e)}
  getContext(){return{fillRect(){},save(){},translate(){},rotate(){},drawImage(){},restore(){},getImageData:()=>({data:new Uint8ClampedArray(this.width*this.height*4)}),putImageData(){}}}
 }
 const field=new Element('input');field.id='scanExpiry';new Element('div').appendChild(field);const add=new Element('button');add.id='scanAdd';
 const ctx={console,AbortController,Event,performance:{now:()=>now},document:{getElementById:id=>nodes.get(id)||null,createElement:t=>new Element(t),head:new Element('head')},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,at:now+ms});return timerId},clearTimeout:id=>timers.delete(id),addEventListener(){},createImageBitmap:async()=>({width:4,height:4,close(){}}),TextDetector:class{detect(){return new Promise(r=>detect=r)}},Tesseract:{createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:'Best before 14.11.2026'}}),terminate:async()=>{}})}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
 return{ctx,field,status:()=>nodes.get('expiryCameraStatus'),timers,resolveNative:text=>detect([{rawValue:text}]),advance:ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn()}},cloud:()=>{ctx.RESERVE_EXPIRY_VISION={available:()=>true,analyze:(_,{signal})=>{visionSignal=signal;return new Promise(r=>visionResolve=r)}};ctx.createImageBitmap=async()=>{throw Error('local unavailable')};delete ctx.TextDetector},signal:()=>visionSignal,resolveCloud:x=>visionResolve(x)};
}
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve()};
const h=harness(),api=h.ctx.RESERVE_EXPIRY_CAMERA;
const job=api.processFile({name:'expiry.jpg'});await flush();assert.equal(h.status().attrs['aria-busy'],'true');assert.equal(h.status().textContent,'');assert.equal(h.status().children[0].className,'reserve-mhd-spinner');
h.advance(9999);assert.equal(h.status().attrs['aria-busy'],'true');h.advance(1);await job;assert.equal(h.status().textContent,'MHD nicht erkannt, bitte manuell eintragen.');assert.equal(h.status().attrs['aria-busy'],undefined);assert.equal(api.metrics().at(-1).timedOut,true);
h.field.value='2028-12-01';api.manualDateChanged(h.field);h.resolveNative('Best before 14.11.2026');await flush();assert.equal(h.field.value,'2028-12-01');assert.equal(h.status().textContent,'');
const success=harness();const done=success.ctx.RESERVE_EXPIRY_CAMERA.processFile({});await flush();success.resolveNative('Best before 14.11.2026');await done;assert.equal(success.field.value,'2026-11-14');assert.equal(success.status().textContent,'');success.advance(10000);assert.equal(success.status().textContent,'');
const cloud=harness();cloud.cloud();const cloudJob=cloud.ctx.RESERVE_EXPIRY_CAMERA.processFile({});await flush();assert.ok(cloud.signal());cloud.advance(10000);await cloudJob;assert.equal(cloud.signal().aborted,true);cloud.resolveCloud({date:'2026-11-14',precision:'day',confidence:.99});await flush();assert.equal(cloud.field.value,'');assert.equal(cloud.status().textContent,'MHD nicht erkannt, bitte manuell eintragen.');
const manual=harness();const manualJob=manual.ctx.RESERVE_EXPIRY_CAMERA.processFile({});await flush();manual.field.value='2027-03-01';manual.ctx.RESERVE_EXPIRY_CAMERA.manualDateChanged(manual.field);await manualJob;manual.resolveNative('Best before 14.11.2026');await flush();manual.advance(10000);assert.equal(manual.field.value,'2027-03-01');assert.equal(manual.status().textContent,'');
console.log('MHD spinner, exact 10-second deadline, success, cloud abort and late/manual input protection: OK');
// Early success must skip unused image work while keeping every fallback variant available.
const lazy=harness();let canvasCount=0,closed=0;const create=lazy.ctx.document.createElement;
lazy.ctx.document.createElement=tag=>{if(tag==='canvas')canvasCount++;return create(tag)};
lazy.ctx.createImageBitmap=async()=>({width:100,height:50,close(){closed++}});
const prepared=await lazy.ctx.RESERVE_EXPIRY_CAMERA.prepareVariants({});assert.equal(canvasCount,0);
assert.equal(prepared.length,5);assert.equal(prepared[0].name,'original layout');assert.equal(prepared[0].psm,6);
const first=prepared[0].canvas;assert.equal(canvasCount,1);assert.equal(first.width,173);assert.equal(prepared[0].canvas,first);assert.equal(canvasCount,1);
void prepared[1].canvas;assert.equal(canvasCount,2);prepared.dispose();assert.equal(closed,1);
const slow=await lazy.ctx.RESERVE_EXPIRY_CAMERA.prepareVariants({},'fallback');const before=canvasCount;assert.ok(slow.length>=6);void slow[0].canvas;assert.equal(canvasCount,before+1);slow.dispose();assert.equal(closed,2);
success.ctx.RESERVE_EXPIRY_CAMERA.confirmMetric('2026-11-14');const summary=success.ctx.RESERVE_EXPIRY_CAMERA.performanceSummary();assert.equal(summary.confirmed,1);assert.equal(summary.correct,1);assert.equal(summary.correctWithinFiveSeconds,1);assert.equal(summary.targetMs,5000);assert.equal(summary.limitMs,10000);assert.ok(success.ctx.RESERVE_EXPIRY_CAMERA.metrics()[0].passes.length>=2);
assert.equal(h.ctx.RESERVE_EXPIRY_CAMERA.performanceSummary().confirmedAccuracy,null);assert.equal(h.ctx.RESERVE_EXPIRY_CAMERA.performanceSummary().timeouts,1);
console.log('Lazy original/fallback variants, bitmap release and honest speed/accuracy summary: OK');
