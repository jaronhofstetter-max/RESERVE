/* Account sync state machine. No requests or storage access until supplied by the app. */
(function(root){'use strict';
const KEYS=['reserveStock','reserveShopping','reserveProfile','reserveProductKnowledgeV1','reserveBarcodeProductsV1','reservePersonalRecipesV1','reserveExcludedRecipesV1'];
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(isObject(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function stateForHash(state){return {schema:2,app:'RESERVE',values:state.values,cookingProgress:state.cookingProgress||{}};}
function countData(payload){const v=payload.state?.values||{};return ['reserveStock','reserveShopping','reservePersonalRecipesV1'].reduce((n,k)=>n+(Array.isArray(v[k])?v[k].length:0),0)+(payload.drafts?.length||0)+Object.keys(payload.photos||{}).length+Object.keys(payload.state?.cookingProgress||{}).length;}
function validatePayload(p,uid,validateState){
 if(!isObject(p)||p.schema!==1||!isObject(p.state)||p.state.schema!==2||p.state.app!=='RESERVE'||!isObject(p.state.values))throw Error('Ungültiger Kontostand.');
 if(!isObject(p.state.cookingProgress))throw Error('Ungültiger Kochfortschritt.');
 if(Object.keys(p.state.values).some(k=>!KEYS.includes(k))||KEYS.some(k=>!(k in p.state.values)))throw Error('Unvollständiger Kontostand.');
 const error=validateState(p.state);if(error)throw Error(error);
 if(!Array.isArray(p.drafts)||p.drafts.length>50||p.drafts.some(d=>!isObject(d)||typeof d.key!=='string'||!(/^(new|personal-[a-z0-9-]+)$/.test(d.key))||!isObject(d.fields)||Object.values(d.fields).some(v=>typeof v!=='string'||v.length>400000)||typeof d.updatedAt!=='string'))throw Error('Ungültige Rezeptentwürfe.');
 if(!isObject(p.photos)||Object.keys(p.photos).length>2000)throw Error('Ungültige Fotoliste.');
 const ids=new Set((p.state.values.reservePersonalRecipesV1||[]).map(r=>r.id));
 for(const [id,ref]of Object.entries(p.photos))if(!ids.has(id)||typeof ref!=='string'||!ref.startsWith(uid+'/')||!new RegExp('^'+uid+'/[0-9a-f]{64}\\.(jpg|png|webp)$').test(ref))throw Error('Ungültiger Fotoverweis.');
 if(new TextEncoder().encode(JSON.stringify(p)).length>2*1024*1024)throw Error('Kontodaten überschreiten 2 MB. Bitte eine Dateisicherung erstellen.');
 return p;
}
async function fingerprint(p){return digest(new TextEncoder().encode(canonical({state:stateForHash(p.state),drafts:p.drafts,photos:p.photos})));}
class AccountSync{
 constructor({local,validateState,notify=()=>{}}){this.local=local;this.validateState=validateState;this.notify=notify;this.generation=0;this.ready=false;this.busy=false;this.queued=false;this.phase='signed-out';}
 status(phase,message){this.phase=phase;this.notify({phase,message});}
 stop(){this.generation++;this.ready=false;this.transport=null;this.user=null;this.status('signed-out','Nicht angemeldet.');}
 async capture(){
  const raw=await this.local.capture(),photos={},blobs=new Map();let size=0;
  for(const [id,blob]of raw.photos){
   if(!(blob instanceof Blob)||!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>5*1024*1024)throw Error('Ein Rezeptfoto ist ungültig oder größer als 5 MB.');
   size+=blob.size;if(size>50*1024*1024)throw Error('Rezeptfotos überschreiten 50 MB.');
   const hash=await digest(await blob.arrayBuffer()),ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type],ref=this.user+'/'+hash+'.'+ext;photos[id]=ref;blobs.set(ref,blob);
  }
  const payload=validatePayload({schema:1,state:raw.state,drafts:raw.drafts,photos},this.user,this.validateState);
  return {payload,blobs,hash:await fingerprint(payload)};
 }
 bind(revision,hash){this.revision=revision;this.lastHash=hash;this.local.setMeta({ownerId:this.user,revision,lastHash:hash});this.ready=true;this.status('ready','Kontodaten abgeglichen. Änderungen werden automatisch gesichert.');}
 async connect(user,transport){
  const ticket=++this.generation;this.ready=false;this.user=user;this.transport=transport;this.status('loading','Kontodaten werden zuerst geladen …');
  try{
   const current=await this.capture();if(ticket!==this.generation)return;
   const meta=this.local.getMeta();
   if(meta?.ownerId&&meta.ownerId!==user){this.status('other-account','Dieses Gerät enthält Daten eines anderen Kontos. Zuerst mit diesem Konto anmelden und abmelden.');return;}
   const remote=await transport.get();if(ticket!==this.generation)return;
   if(remote&&(!Number.isSafeInteger(remote.revision)||remote.revision<1))throw Error('Ungültige Serverversion.');
   this.needsRefresh=false;this.remote=remote;this.revision=remote?.revision||0;
   if((await this.capture()).hash!==current.hash){this.status('conflict','Die Gerätedaten wurden während des Ladens geändert. Bitte neu abgleichen.');return;}
   if(!remote){
    if(countData(current.payload)>0){this.status('adopt','Vorhandene Gerätedaten zuerst ausdrücklich in dieses Konto übernehmen.');return;}
    this.bind(0,current.hash);return;
   }
   validatePayload(remote.payload,user,this.validateState);
   const remoteHash=await fingerprint(remote.payload);if(ticket!==this.generation)return;
   if(current.hash===remoteHash){this.bind(remote.revision,current.hash);return;}
   if(countData(current.payload)===0||(meta?.ownerId===user&&meta.lastHash===current.hash))return await this.restore(remote,ticket,current.hash);
   if(meta?.ownerId===user&&meta.revision===remote.revision){this.bind(remote.revision,remoteHash);await this.save();return;}
   this.status('conflict','Gerät und Konto unterscheiden sich. Nichts wurde überschrieben. Bitte den gewünschten Stand auswählen.');
  }catch(error){if(ticket===this.generation){this.ready=false;this.status('error',error.message||'Kontodaten konnten nicht geladen werden. Lokal bleibt alles erhalten.');}}
 }
 async restore(remote=this.remote,ticket=this.generation,expectedHash=null){
  if(!remote)throw Error('Kein Kontostand vorhanden.');
  validatePayload(remote.payload,this.user,this.validateState);this.ready=false;this.status('restoring','Kontostand und Fotos werden vollständig geladen …');
  try{
   const baseline=expectedHash??(await this.capture()).hash;
   const photos=new Map();let total=0;
   for(const [id,ref]of Object.entries(remote.payload.photos)){
    const blob=await this.transport.download(ref);if(ticket!==this.generation)return;
    total+=blob.size;if(blob.size>5*1024*1024||total>50*1024*1024||!['image/jpeg','image/png','image/webp'].includes(blob.type))throw Error('Ein Kontofoto ist ungültig.');
    const expected=ref.split('/')[1].split('.')[0];if(await digest(await blob.arrayBuffer())!==expected)throw Error('Ein Kontofoto ist beschädigt. Es wurde nichts übernommen.');photos.set(id,blob);
   }
   if(ticket!==this.generation)return;
   if((await this.capture()).hash!==baseline){this.remote=remote;this.revision=remote.revision;this.status('conflict','Die Gerätedaten wurden während der Wiederherstellung geändert. Es wurde nichts ersetzt.');return;}
   await this.local.restore(remote.payload,photos);if(ticket!==this.generation)return;
   this.remote=remote;this.bind(remote.revision,await fingerprint(remote.payload));this.status('restored','Kontodaten und Fotos wiederhergestellt.');
  }catch(error){if(ticket===this.generation){this.ready=false;this.status('error',error.message||'Wiederherstellung fehlgeschlagen.');}}
 }
 async adopt(allowEmpty=false){
  if(!['adopt','conflict','empty-blocked'].includes(this.phase))return;
  if(this.needsRefresh){this.status('conflict','Bitte zuerst neu abgleichen.');return;}
  this.ready=true;this.lastHash=null;await this.save(allowEmpty);
 }
 async save(allowEmpty=false){
  if(!this.ready||!this.transport)return;
  if(this.busy){this.queued=true;return;}
  this.busy=true;const ticket=this.generation,transport=this.transport,revision=this.revision;
  try{
   const current=await this.capture();if(ticket!==this.generation)return;
   if(current.hash===this.lastHash)return;
   if(countData(current.payload)===0&&countData(this.remote?.payload||{})>0&&!allowEmpty){this.ready=false;this.status('empty-blocked','Das vollständige Leeren des Kontos muss ausdrücklich bestätigt werden.');return;}
   this.status('saving','Kontodaten und Fotos werden gesichert …');
   for(const [ref,blob]of current.blobs){if(ticket!==this.generation)return;await transport.upload(ref,blob);}
   if(ticket!==this.generation)return;
   const result=await transport.put(revision,current.payload,allowEmpty);if(ticket!==this.generation)return;
   if(!Number.isSafeInteger(result.revision)||result.revision!==revision+1)throw Error('Ungültige Speicherbestätigung. Bitte neu abgleichen.');
   this.remote={revision:result.revision,payload:current.payload};this.bind(result.revision,current.hash);this.status('saved','Vorrat, Rezepte und gespeicherte Rezeptfotos im Konto gesichert.');
  }catch(error){if(ticket===this.generation){this.ready=false;this.needsRefresh=error.code==='conflict';this.status(error.code==='conflict'?'conflict':'error',error.code==='conflict'?'Ein anderes Gerät hat den Kontostand geändert. Nichts wurde überschrieben. Bitte neu abgleichen.':error.message||'Nicht gesichert. Deine lokalen Daten bleiben erhalten.');}}
  finally{this.busy=false;if(this.queued){this.queued=false;if(this.ready)await this.save();}}
 }
}
root.RESERVE_ACCOUNT_CORE={AccountSync,KEYS,canonical,digest,fingerprint,countData,validatePayload};
})(typeof window==='undefined'?globalThis:window);
