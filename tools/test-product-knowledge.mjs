import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const files=['multipack-v1.js','ingredient-identity-v1.js','product-knowledge-v1.js','barcode-v1.js'];
function setup(seed={}){const storage=new Map(Object.entries(seed)),listeners={};const ctx={document:{readyState:'loading',addEventListener(){},getElementById(){return null}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},Event:class{},console,N:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),setTimeout(){},requestAnimationFrame(){}};ctx.window=ctx;ctx.addEventListener=(k,f)=>(listeners[k]??=[]).push(f);ctx.dispatchEvent=e=>{for(const f of listeners[e.type]||[])f(e)};vm.createContext(ctx);for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),ctx);return{ctx,storage,api:ctx.RESERVE_PRODUCT_KNOWLEDGE}}
const fixture=JSON.parse(fs.readFileSync('data/benchmarks/product-knowledge-v1.json','utf8'));
const {ctx,api,storage}=setup();let checks=0;
for(const x of fixture.categories){assert.equal(ctx.RESERVE_BARCODE.categoryFor(x.name,''),x.expected,x.name);checks++}
for(const x of fixture.ingredients){assert.equal(ctx.RESERVE_INGREDIENTS.match(x.a,x.b),x.expected,`${x.a}/${x.b}`);checks++}
const code='7612345678901';
api.observe({code,name:'Unbekannter Tee',qty:'2 kg',cat:'Protein',containerType:'Flasche',image:'https://example.test/old.jpg'},'catalog');assert.equal(api.lookup(code).trusted,false);
api.confirm({barcode:code,n:'Penne Rigate',q:'2 kg',eachQty:'500 g',containerCount:4,c:'Getreide & Beilagen',e:'2027-03-01',containerType:'Beutel'},{source:'scan-confirmed'});
assert.equal(api.lookup(code).qty,'500 g');assert.equal(api.lookup(code).containerType,'Beutel');assert.equal(api.lookup(code).trusted,true);
api.observe({code,name:'Falscher Name',qty:'5 kg',cat:'Protein',containerType:'Glas'},'catalog');assert.equal(api.lookup(code).name,'Penne Rigate');assert.equal(api.lookup(code).qty,'500 g');assert.equal(api.lookup(code).cat,'Getreide & Beilagen');
api.confirm({code,name:'Penne Rigate',qty:'500 g',cat:'Getreide & Beilagen',containerType:'Beutel'},{ingredient:'Pasta'});assert.equal(api.ingredientName('Penne Rigate'),'Pasta');assert.equal(api.examples().length,1);assert.equal(api.recognize({barcode:code,n:'Penne Rigate'}).ingredient.state,'confirmed');
api.confirm({code,name:'Penne Rigate',qty:'500 g',cat:'Getreide & Beilagen',containerType:'Beutel'},{ingredient:'Pasta'});assert.equal(api.examples().length,1);
api.confirm({code:'7612345678902',name:'Penne Rigate',qty:'500 g'},{ingredient:'Reis'});assert.equal(api.ingredientName('Penne Rigate'),'');
assert.ok(!storage.get(api.storageKey).includes('2027-03-01'));assert.ok(!storage.get(api.storageKey).includes('containerCount'));
storage.set('reserveStock',JSON.stringify([{barcode:code,n:'Penne Rigate',c:'Protein',q:'250 g',eachQty:'500 g',containerCount:1,e:'2030-01-01'}]));api.confirm({code,name:'Penne Rigate',qty:'500 g',cat:'Getreide & Beilagen'},{source:'pantry-correction'});const batch=JSON.parse(storage.get('reserveStock'))[0];assert.equal(batch.c,'Getreide & Beilagen');assert.equal(batch.q,'250 g');assert.equal(batch.e,'2030-01-01');
const fresh=setup(Object.fromEntries(storage));assert.equal(fresh.api.lookup(code).qty,'500 g');assert.equal(fresh.api.lookup(code).cat,'Getreide & Beilagen');
const migrated=setup({reserveBarcodeProductsV1:JSON.stringify({[code]:{name:'Reis',qty:'750 g',cat:'Getreide & Beilagen',trusted:true}})});assert.equal(migrated.api.lookup(code).trusted,true);assert.equal(migrated.api.migrate(),false);
api.confirm({code:'7612345678903',name:'Fehler',qty:'kein Gewicht'});assert.equal(api.lookup('7612345678903').trusted,false);
api.confirm({code:'7612345678904',name:'Bild',qty:'1 Stück',image:'https://example.test/new.jpg'});assert.equal(api.resolve({barcode:'7612345678904',image:'https://example.test/stale.jpg'}).image,'https://example.test/new.jpg');assert.equal(api.resolve({barcode:'7612345678904',image:'https://example.test/stale.jpg'},{localImage:'blob:own'}).image,'blob:own');
assert.equal(api.recognize({n:'Kichererbsen Mehl'}).ingredient.state,'unknown');
const report={fixture:'product-knowledge-v1',fixedRegressionCases:checks,passed:checks,failed:0,scope:'Regression checks only; no real-world accuracy claim',behaviorChecks:['unconfirmed catalog suggestions','confirmed field priority','per-package quantity','reload','legacy migration','recipe correction ambiguity','photo priority','no batch fields in product knowledge']};
fs.mkdirSync('build',{recursive:true});fs.writeFileSync('build/product-knowledge-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
