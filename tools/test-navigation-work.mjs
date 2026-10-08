import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
// Image fallback must make one icon pass even for a large pantry.
const rows=Array.from({length:5000},(_,i)=>({n:'Produkt '+i,barcode:String(i)}));
const cards=rows.map((_,i)=>({dataset:{index:String(i)},querySelector:()=>({classList:{remove(){}},removeAttribute(){},querySelector(){return null}})}));
let iconPasses=0;
const document={readyState:'loading',addEventListener(){},querySelectorAll:()=>cards};
const window={RESERVE_CABINET:{getStock:()=>rows},RESERVE_PRODUCT_ICONS:{apply:()=>iconPasses++}};
const context={document,window,localStorage:{getItem:()=>null},requestAnimationFrame(){},Map,URL,Blob};
vm.runInNewContext(fs.readFileSync('product-images-v1.js','utf8'),context);
window.RESERVE_PRODUCT_IMAGES.apply();
assert.equal(iconPasses,1,'One icon pass for 5000 products without photos');
// Fast successive navigation must not render panels already left.
const frames=[],timers=[],rendered=[],events=[];
let active='stock';
const panels=['stock','shopping','cook'].map(id=>({id,classList:{toggle(_name,on){if(on)active=id}}}));
const navDocument={readyState:'loading',addEventListener(){},querySelector:()=>({id:active}),querySelectorAll:selector=>selector==='.panel'?panels:[]};
const navWindow={dispatchEvent:e=>events.push(e.detail.panel)};
vm.runInNewContext(fs.readFileSync('performance-v1.js','utf8'),{window:navWindow,document:navDocument,requestAnimationFrame:f=>frames.push(f),setTimeout:f=>timers.push(f),clearTimeout(){},performance:{now:()=>0},CustomEvent:class{constructor(_type,data){this.detail=data.detail}},renderStock:()=>rendered.push('stock'),renderShop:()=>rendered.push('shopping'),renderCook:()=>rendered.push('cook')});
navWindow.RESERVE_PERFORMANCE.showFast('stock');
navWindow.RESERVE_PERFORMANCE.showFast('shopping');
navWindow.RESERVE_PERFORMANCE.showFast('cook');
while(frames.length)frames.shift()();
while(timers.length)timers.shift()();
assert.deepEqual(rendered,['cook']);
assert.deepEqual(events,['cook']);
console.log('PASS: 5000 missing-photo products use one fallback pass; rapid navigation renders only the final panel.');
