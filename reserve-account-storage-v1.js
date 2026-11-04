/* Local adapter + authenticated HTTP transport. Never uses an administrative key. */
(function(root){'use strict';
const C=root.RESERVE_ACCOUNT_CORE,META='reserveAccountMetaV1',DRAFTS='reservePersonalRecipeDraftsV1',DB='reservePersonalRecipePhotosV1';
const fail=message=>{throw Error(message);};
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onerror=()=>reject(Error('Rezeptfotos konnten nicht geöffnet werden.'));r.onsuccess=()=>resolve(r.result);});}
async function allPhotos(){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readonly'),out=new Map(),r=tx.objectStore('photos').openCursor();r.onsuccess=()=>{const cur=r.result;if(cur){out.set(cur.key,cur.value);cur.continue();}};tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>reject(Error('Rezeptfotos konnten nicht gelesen werden.'));});}finally{db.close();}}
async function replacePhotos(photos){const db=await database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite'),s=tx.objectStore('photos');s.clear();for(const [id,blob]of photos)s.put(blob,id);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('Rezeptfotos konnten nicht wiederhergestellt werden.'));});}finally{db.close();}}
function progressKeys(){return Object.keys(localStorage).filter(k=>k.startsWith('reserveCookProgress:'));}
function createLocal(){return {
 getMeta(){try{return JSON.parse(localStorage.getItem(META)||'null');}catch{return null;}},
 setMeta(value){localStorage.setItem(META,JSON.stringify(value));},
 async capture(){
  const state=root.RESERVE_SYNC.snapshot(),error=root.RESERVE_SYNC.validate(state);if(error)fail(error);
  const rawDrafts=localStorage.getItem(DRAFTS),drafts=rawDrafts===null?[]:JSON.parse(rawDrafts),all=await allPhotos(),photos=new Map();
  for(const record of state.values.reservePersonalRecipesV1||[])if(all.has(record.id))photos.set(record.id,all.get(record.id));
  return {state,drafts,photos};
 },
 async restore(payload,photos){
  const keys=[...C.KEYS,DRAFTS,...progressKeys()],before=new Map(keys.map(k=>[k,localStorage.getItem(k)])),oldPhotos=await allPhotos();
  try{
   await replacePhotos(photos);
   for(const key of C.KEYS){const value=payload.state.values[key];if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));}
   localStorage.setItem(DRAFTS,JSON.stringify(payload.drafts));progressKeys().forEach(k=>localStorage.removeItem(k));
   for(const [key,value]of Object.entries(payload.state.cookingProgress||{})){if(!key.startsWith('reserveCookProgress:'))fail('Ungültiger Kochfortschritt.');localStorage.setItem(key,JSON.stringify(value));}
  }catch(error){
   try{progressKeys().forEach(k=>localStorage.removeItem(k));for(const [k,v]of before)if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);await replacePhotos(oldPhotos);}
   catch{throw Error('Wiederherstellung abgebrochen; lokale Rücknahme unvollständig. Bitte deine Dateisicherung verwenden.');}
   throw error;
  }
 },
 async clear(){await replacePhotos(new Map());[...C.KEYS,DRAFTS,META,...progressKeys()].forEach(k=>localStorage.removeItem(k));}
};}
function createTransport(config,session){
 // The bearer token is immutable for this transport. A later account switch cannot
 // accidentally send the old account's payload with the new account's credential.
 const token=session.access_token,uid=session.user.id,origin=config.url.replace(/\/$/,''),baseHeaders={apikey:config.publishableKey,Authorization:'Bearer '+token};
 async function request(path,options={},consume=r=>r.json()){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(origin+path,{...options,signal:controller.signal,headers:{...baseHeaders,...options.headers},cache:'no-store',credentials:'omit'});
   if(!response.ok){let code='';try{const body=await response.json();code=body.code||body.error||'';}catch{}
    const e=Error(response.status===401?'Anmeldung abgelaufen. Bitte erneut anmelden.':code==='40001'?'Ein anderes Gerät hat den Stand geändert.':'Kontospeicherung fehlgeschlagen ('+response.status+'). Lokale Daten bleiben erhalten.');
    e.code=code==='40001'?'conflict':['Duplicate','ResourceAlreadyExists','KeyAlreadyExists','already_exists'].includes(code)||response.status===409?'duplicate':'request';throw e;
   }return await consume(response);
  }catch(error){if(error.name==='AbortError')throw Error('Kontospeicherung hat nicht geantwortet. Bitte erneut versuchen.');throw error;}finally{clearTimeout(timer);}
 }
 function objectPath(ref){if(!new RegExp('^'+uid+'/[a-f0-9]{64}\\.(jpg|png|webp)$').test(ref))fail('Ungültiger Fotoverweis.');return '/storage/v1/object/reserve-private/'+ref;}
 return {
  async get(){const rows=await request('/rest/v1/reserve_account_state?select=revision,payload,updated_at&user_id=eq.'+encodeURIComponent(uid)+'&limit=1');if(!Array.isArray(rows)||rows.length>1)fail('Ungültige Serverantwort.');return rows[0]||null;},
  async put(revision,payload,allowEmpty){return request('/rest/v1/rpc/save_reserve_account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_expected_revision:revision,p_payload:payload,p_allow_empty:allowEmpty})});},
  async upload(ref,blob){
   try{await request(objectPath(ref),{method:'POST',headers:{'Content-Type':blob.type,'x-upsert':'false'},body:blob},()=>null);}
   catch(error){if(error.code!=='duplicate')throw error;const existing=await this.download(ref);if(await C.digest(await existing.arrayBuffer())!==await C.digest(await blob.arrayBuffer()))fail('Ein vorhandenes Kontofoto stimmt nicht mit seiner Prüfsumme überein.');}
  },
  async download(ref){const blob=await request(objectPath(ref),{},r=>r.blob());if(blob.size>5*1024*1024)fail('Kontofoto zu groß.');return blob;}
 };
}
root.RESERVE_ACCOUNT_STORAGE={createLocal,createTransport,META,DRAFTS};
})(typeof window==='undefined'?globalThis:window);
