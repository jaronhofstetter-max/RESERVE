/* RESERVE product knowledge: confirmed product fields, independent of pantry batches. */
(function(){
'use strict';
if(window.RESERVE_PRODUCT_KNOWLEDGE)return;
const KEY='reserveProductKnowledgeV1',LEGACY='reserveBarcodeProductsV1';
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const digits=s=>String(s||'').replace(/\D/g,'');
const copy=x=>JSON.parse(JSON.stringify(x));
const text=s=>String(s||'').trim();
const safeImage=s=>/^https:\/\//i.test(text(s))?text(s):'';
let cached=null,nameIndex=null;
const blank=()=>({schema:1,products:{},examples:[]});
function read(){if(cached)return cached;try{const x=JSON.parse(localStorage.getItem(KEY)||'null');cached=valid(x)?x:blank()}catch{cached=blank()}return cached}
function byName(name){if(!nameIndex){nameIndex=new Map();for(const p of Object.values(read().products)){const key=norm(p.name),hits=nameIndex.get(key)||[];hits.push(p);nameIndex.set(key,hits)}}return nameIndex.get(norm(name))||[]}
function valid(x){return !!x&&x.schema===1&&x.products&&typeof x.products==='object'&&!Array.isArray(x.products)&&Array.isArray(x.examples)&&Object.values(x.products).every(p=>p&&typeof p.name==='string'&&p.fields&&typeof p.fields==='object')}
function legacy(){try{const x=JSON.parse(localStorage.getItem(LEGACY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return{}}}
function idFor(row){const code=digits(row?.barcode||row?.code);return code?'barcode:'+code:norm(row?.name||row?.n)?'name:'+norm(row.name||row.n):''}
function fieldsFor(row){const result={};const pairs={name:row.name??row.n,brand:row.brand,category:row.category??row.cat??row.c,containerType:row.containerType};for(const [k,v]of Object.entries(pairs))if(text(v))result[k]=text(v);
 const raw=text(row.eachQty||row.quantity||row.qty||row.q),p=window.RESERVE_MULTIPACK?.parse?.(raw);
 if(p&&p.v>0){const q=p.multipack&&p.count>1?{v:p.each,u:p.u}:p;result.quantity=window.RESERVE_MULTIPACK.format(q)}else if(raw&&!window.RESERVE_MULTIPACK)result.quantity=raw;
 const image=safeImage(row.image);if(image)result.image=image;
 return result;
}
function project(p){if(!p?.name)return null;const f=p.fields;return{code:p.barcode||'',name:p.name,brand:f.brand?.value||'',qty:f.quantity?.value||'',cat:f.category?.value||'Sonstiges',containerType:f.containerType?.value||'',containerTypeConfirmed:f.containerType?.state==='confirmed',image:f.image?.value||'',trusted:['name','quantity'].every(k=>f[k]?.state==='confirmed'),learnedFromCorrection:f.name?.state==='confirmed',foodState:'food',knowledgeId:p.id,fieldEvidence:copy(f),sources:copy(p.sources||[])}}
function write(data,changedId){localStorage.setItem(KEY,JSON.stringify(data));cached=data;nameIndex=null;const m=legacy();for(const p of changedId?[data.products[changedId]]:Object.values(data.products)){const v=project(p);if(p.barcode&&v)m[p.barcode]={...m[p.barcode],...v};}localStorage.setItem(LEGACY,JSON.stringify(m));window.dispatchEvent(new CustomEvent('reserve:product-knowledge-changed'))}
function upsert(row,{confirmed=false,source='product-data',ingredient}={}){const id=idFor(row),incoming=fieldsFor(row);if(!id||!incoming.name)return null;const data=read(),old=data.products[id],p=old?copy(old):{id,barcode:digits(row.barcode||row.code),name:incoming.name,fields:{},createdAt:new Date().toISOString()},at=new Date().toISOString();let changed=false;
 if(row.retailerProvenance?.url&&row.rights?.commercialDisplay===true){const reference={...row.retailerProvenance,rights:row.rights};p.sources=p.sources||[];const index=p.sources.findIndex(x=>x.url===reference.url);if(index<0){p.sources.push(reference);changed=true}else if(JSON.stringify(p.sources[index])!==JSON.stringify(reference)){p.sources[index]=reference;changed=true}}
 for(const [key,value]of Object.entries(incoming)){const previous=p.fields[key];if(!confirmed&&previous?.state==='confirmed')continue;if(previous?.value===value&&(!confirmed||previous.state==='confirmed'))continue;p.fields[key]={value,state:confirmed?'confirmed':'suggested',source,at};changed=true;}
 p.name=p.fields.name?.value||incoming.name;
 if(ingredient!==undefined){const value=text(ingredient);const previous=p.fields.ingredient;if(previous?.value!==value||previous?.state!=='confirmed'){p.fields.ingredient={value,state:'confirmed',source,at};changed=true;}}
 if(!changed){if(confirmed){try{syncStock(p)}catch{}}return copy(p);}p.updatedAt=at;data.products[id]=p;
 if(confirmed){const example={productId:id,barcode:p.barcode,name:p.name,quantity:p.fields.quantity?.value||'',category:p.fields.category?.value||'',containerType:p.fields.containerType?.value||'',ingredient:p.fields.ingredient?.value||'',source,confirmedAt:at};
 // One current confirmed example per identity: repeat scans do not inflate training evidence.
 data.examples=data.examples.filter(x=>x.productId!==id);data.examples.push(example);data.examples=data.examples.slice(-500);}
 try{write(data,id);if(confirmed)syncStock(p)}catch(error){window.dispatchEvent(new CustomEvent('reserve:product-knowledge-error',{detail:{reason:'storage-unavailable'}}));return null}return copy(p);
}
function syncStock(p){if(!p.barcode)return;let rows;try{rows=JSON.parse(localStorage.getItem('reserveStock')||'[]')}catch{return}if(!Array.isArray(rows))return;let changed=false;for(const row of rows){if(digits(row.barcode)!==p.barcode)continue;for(const [field,key]of [['name','n'],['category','c'],['brand','brand']]){const value=p.fields[field];if(value?.state==='confirmed'&&row[key]!==value.value){row[key]=value.value;changed=true}}}if(changed){window.RESERVE_CONTAINER_UNITS?.syncCore?.(rows);localStorage.setItem('reserveStock',JSON.stringify(rows));window.dispatchEvent(new CustomEvent('reserve:stock-changed'));}}
function observe(row,source='product-data'){return upsert(row,{source})}
function confirm(row,options={}){return upsert(row,{...options,confirmed:true,source:options.source||'customer-confirmed'})}
function get(code){return copy(read().products['barcode:'+digits(code)]||null)}
function lookup(code){const p=project(get(code));return p?{...legacy()[digits(code)],...p}:null}
function products(){return Object.values(read().products).map(copy)}
function map(){const m=legacy();for(const p of products())if(p.barcode)m[p.barcode]={...m[p.barcode],...project(p)};return m}
function exact(name){const hits=byName(name);return hits.length===1?copy(hits[0]):null}
function ingredientIdentity(name){const hits=byName(name);if(!hits.length)return{state:'unknown',value:''};const values=hits.map(p=>p.fields.ingredient?.state==='confirmed'?p.fields.ingredient.value:'');if(values.every(v=>v&&norm(v)===norm(values[0])))return{state:'confirmed',value:values[0]};return{state:values.some(Boolean)?'ambiguous':'unknown',value:''}}
function ingredientName(name){return ingredientIdentity(name).value}

function resolve(row,{localImage=''}={}){const p=digits(row?.barcode)?get(row.barcode):exact(row?.n||row?.name),profile=project(p);return{...profile,ingredient:ingredientName(row?.n||row?.name),image:localImage||(p?.fields.image?.state==='confirmed'?profile?.image:'')||safeImage(row?.image)||profile?.image||''}}
function migrate(){const data=read(),m=legacy();let changed=false;for(const [code,row]of Object.entries(m)){if(!row?.name||data.products['barcode:'+digits(code)])continue;const id='barcode:'+digits(code),confirmed=row.trusted===true||row.learnedFromCorrection===true,fields={};for(const [k,value]of Object.entries(fieldsFor(row)))fields[k]={value,state:confirmed?'confirmed':'suggested',source:confirmed?'legacy-confirmed':'legacy-product-data',at:row.rememberedAt||''};data.products[id]={id,barcode:digits(code),name:row.name,fields,createdAt:row.rememberedAt||'',updatedAt:row.rememberedAt||''};changed=true;}if(changed){try{write(data)}catch{return false}}return changed;}
function recognize(row){const p=digits(row?.barcode||row?.code)?get(row.barcode||row.code):exact(row?.n||row?.name),fields=p?.fields||{},name=fields.name?.value||text(row?.n||row?.name);const ingredient=fields.ingredient?.state==='confirmed'?fields.ingredient.value:'',candidate=window.RESERVE_INGREDIENTS?.canonical(name),safeCandidate=candidate&&window.RESERVE_INGREDIENTS?.match(name,candidate)?candidate:'';return{product:p,category:{value:fields.category?.value||window.RESERVE_BARCODE?.categoryFor?.(name,'')||'Sonstiges',state:fields.category?.state||'suggested'},ingredient:{value:ingredient||safeCandidate,state:ingredient?'confirmed':safeCandidate?'suggested':'unknown'}}}
function examples(){return copy(read().examples)}
window.RESERVE_PRODUCT_KNOWLEDGE={version:'1.0',get,lookup,observe,confirm,products,map,resolve,recognize,ingredientIdentity,ingredientName,examples,migrate,valid,storageKey:KEY};
migrate();
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){cached=null;nameIndex=null}});
})();
