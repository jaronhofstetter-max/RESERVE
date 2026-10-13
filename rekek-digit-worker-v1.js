/* Local-only worker; recipe pixels never leave the device. */
importScripts('rekek-digit-core-v1.js?v=20261013-digit-v4-1');
let model;
async function load(){if(!model)model=fetch('assets/rekek/digit-v4.bin?v=20261013-digit-v4-1').then(r=>{if(!r.ok)throw Error('Mengenmodell nicht verfügbar');return r.arrayBuffer()}).then(RESERVE_DIGIT_CORE.weights).catch(e=>{model=null;throw e});return model}
self.onmessage=async({data:m})=>{try{const params=await load();const result=RESERVE_DIGIT_CORE.readImage(new Uint8ClampedArray(m.pixels),m.width,m.height,params);self.postMessage({id:m.id,result})}catch{self.postMessage({id:m.id,result:{status:'unavailable',autoConfirmed:false}})}};
