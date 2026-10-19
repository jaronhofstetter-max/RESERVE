import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const nodes=new Map(),saved=new Map([['reserveDeviceId','test-device']]),timers=[];
const ctx={console,Date,Event,queueMicrotask,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},stock:[],
 document:{readyState:'loading',getElementById:id=>nodes.get(id)||null,addEventListener(){},querySelectorAll:()=>[],createElement:()=>({style:{}}),head:{appendChild(){}}},
 localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},setTimeout:(fn,ms)=>{timers.push({fn,ms});return 0;},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},dispatchEvent(){},refresh(){}};
ctx.window=ctx;vm.createContext(ctx);
for(const f of ['date-policy-v1.js','expiry-consumption-v1.js','expiry-camera-v1.js','multipack-v1.js','barcode-v1.js','cloud-sync-v1.js','cabinet-inventory-v1.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const p=ctx.RESERVE_DATE_POLICY,ocr=ctx.RESERVE_EXPIRY_CAMERA;
const kind=s=>p.kind({dateType:s});
assert.equal(p.kind({e:'2020-01-01'}),'unknown');assert.equal(kind('bad'),'unknown');
assert.equal(p.label({}),'Datum');
for(const [text,type] of [['14.11.2026','unknown'],['Best before 14.11.2026','best_before'],['MHD 14.11.2026','best_before'],['Zu verbrauchen bis 14.11.2026','use_by'],['Use by 14.11.2026','use_by'],['MFG 14.11.2026','manufactured'],['Packed on 14.11.2026','packed'],['Sell by 14.11.2026','sell_by'],['EXP 14.11.2026','unknown'],['MHD 12.10.2026 weitere Angabe 14.11.2026','unknown']]){
 assert.equal(p.infer(text,text.lastIndexOf('14.11.2026'),10),type,text);
}
assert.equal(ocr.selectConsensus(['14.11.2026','14.11.2026']).dateType,'unknown');
assert.equal(ocr.selectConsensus(['MHD 14.11.2026','MHD 14.11.2026']).dateType,'best_before');
assert.equal(ocr.selectConsensus(['MHD 14.11.2026','Use by 14.11.2026']).dateType,'unknown','Conflicting OCR roles must not become MHD');
const now=new Date(2026,9,19,12),past={e:'2026-10-18',n:'Test',q:'500 g'};
assert.equal(ctx.RESERVE_EXPIRY.expiryState(past,now).label,'Datum überschritten – Bedeutung auf der Packung prüfen');
assert.equal(ctx.RESERVE_EXPIRY.expiryState({...past,dateType:'best_before'},now).label,'MHD überschritten');
assert.equal(ctx.RESERVE_EXPIRY.expiryState({...past,dateType:'use_by'},now).label,'Verbrauchsdatum überschritten');
assert.equal(ctx.RESERVE_EXPIRY.expiryState({...past,dateType:'manufactured'},now).state,'unknown');
function field(id,value=''){const f={value,type:'text',validity:{valid:true},dataset:{},style:{},dispatchEvent(){},setAttribute(){},removeAttribute(){}};nodes.set(id,f);return f;}
for(const [id,value] of Object.entries({scanName:'Test Produkt',scanQty:'500 g',scanExpiry:'2026-10-18',scanDateType:'use_by',scanCat:'Sonstiges',barcodeInput:'',scanPurchaseCount:'1'}))field(id,value);
field('scanAdd');nodes.get('scanExpiry').type='date';
assert.equal(ctx.RESERVE_BARCODE.addProduct(),true);
const stock=JSON.parse(saved.get('reserveStock'));assert.equal(stock.length,1);assert.equal(stock[0].dateType,'use_by');assert.equal(stock[0].e,'2026-10-18');
assert.equal(nodes.get('scanDateType').value,'unknown','Next product must not inherit the previous date kind');
assert.equal(nodes.get('scanExpiry').value,'');
assert.equal(ctx.RESERVE_SYNC.snapshot().values.reserveStock[0].dateType,'use_by','Backup must preserve date kind');
ocr.apply('2028-02-29','month','best_before');await Promise.resolve();
assert.equal(p.fromInput().dateType,'best_before');assert.equal(p.fromInput().datePrecision,'month');
ocr.apply('2028-03-15');await Promise.resolve();assert.equal(p.fromInput().dateType,'unknown','A bare new OCR date must clear the old MHD role');
nodes.get('scanDateType').value='use_by';p.reset();assert.equal(nodes.get('scanDateType').value,'unknown');
const groups=ctx.RESERVE_CABINET.displayGroups([{i:0,s:{...past,dateType:'unknown'}},{i:1,s:{...past,dateType:'use_by'}}]);
assert.equal(groups.length,2,'Same-date batches with different meanings must stay distinct');
assert.equal(ctx.stock.length,1,'Date warnings never remove stock automatically');
console.log('Date policy: unknown/legacy dates, printed cues, conflicting OCR, actual scan persistence/reset, backup, month precision and distinct batch meanings passed.');
