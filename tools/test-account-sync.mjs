import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('reserve-account-core-v1.js','utf8'));
const {AccountSync,KEYS,fingerprint,digest}=globalThis.RESERVE_ACCOUNT_CORE;
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const state=stock=>({schema:2,app:'RESERVE',updatedAt:new Date().toISOString(),deviceId:'test',values:Object.fromEntries(KEYS.map(k=>[k,k==='reserveStock'?stock:k==='reservePersonalRecipesV1'?[]:null])),cookingProgress:{}});
const payload=stock=>({schema:1,state:state(stock),drafts:[],photos:{}});
function fixture({localState=payload([]),remote=payload([{n:'Reis',q:'200 g'}]),meta=null,photos=new Map()}={}){
 let local=structuredClone(localState),metadata=meta,server=remote?{revision:1,payload:structuredClone(remote)}:null;
 const calls={get:0,put:0,upload:0,restore:0},events=[],objects=new Map(photos),flags={};
 const adapter={getMeta:()=>metadata,setMeta:m=>metadata=m,capture:async()=>({state:structuredClone(local.state),drafts:structuredClone(local.drafts),photos:new Map(photos)}),restore:async(p,b)=>{calls.restore++;if(flags.failRestore)throw Error('Disk full');local=structuredClone(p);photos=new Map(b);}};
 const transport={get:async()=>{calls.get++;if(flags.failGet)throw Error('offline');if(flags.getPromise)await flags.getPromise;return structuredClone(server);},put:async(rev,p)=>{calls.put++;if(rev!==(server?.revision||0)){const e=Error('conflict');e.code='conflict';throw e;}server={revision:rev+1,payload:structuredClone(p)};return {revision:server.revision};},upload:async(ref,blob)=>{calls.upload++;if(flags.failUpload)throw Error('Upload failed');objects.set(ref,blob);},download:async ref=>{if(flags.failDownload)throw Error('Download failed');if(!objects.has(ref))throw Error('Missing file');return objects.get(ref);}};
 const sync=new AccountSync({local:adapter,validateState:s=>s.app==='RESERVE'?null:'invalid',notify:e=>events.push(e)});
 return {sync,transport,calls,events,flags,objects,get local(){return local;},set local(v){local=v;},get meta(){return metadata;},get server(){return server;},set server(v){server=v;},set photos(v){photos=v;}};
}
{
 const f=fixture();await f.sync.connect(uid,f.transport);assert.equal(f.calls.restore,1);assert.equal(f.calls.put,0);assert.deepEqual(f.local.state.values.reserveStock,[{n:'Reis',q:'200 g'}]);assert.equal(f.sync.phase,'restored');
}
{
 const f=fixture();f.flags.failGet=true;await f.sync.connect(uid,f.transport);await f.sync.save();assert.equal(f.calls.put,0);assert.equal(f.calls.restore,0);assert.equal(f.sync.phase,'error');
}
{
 const f=fixture({localState:payload([{n:'Eier',q:'2 Stück'}]),remote:null});await f.sync.connect(uid,f.transport);assert.equal(f.sync.phase,'adopt');assert.equal(f.calls.put,0);await f.sync.adopt();assert.equal(f.calls.put,1);assert.equal(f.server.revision,1);
}
{
 const localState=payload([{n:'Eier',q:'2 Stück'}]),f=fixture({localState});await f.sync.connect(uid,f.transport);assert.equal(f.sync.phase,'conflict');assert.equal(f.calls.put,0);assert.deepEqual(f.local,localState);
}
{
 const localState=payload([{n:'Eier',q:'2 Stück'}]),f=fixture({localState,meta:{ownerId:other,revision:1,lastHash:'x'}});await f.sync.connect(uid,f.transport);assert.equal(f.sync.phase,'other-account');assert.equal(f.calls.get,0);assert.equal(f.calls.put,0);
}
{
 const p=payload([{n:'Reis',q:'200 g'}]),f=fixture({localState:p,remote:p});await f.sync.connect(uid,f.transport);
 f.local=payload([{n:'Reis',q:'100 g'}]);f.server={revision:2,payload:payload([{n:'Reis',q:'50 g'}])};await f.sync.save();assert.equal(f.sync.phase,'conflict');assert.equal(f.sync.ready,false);const writes=f.calls.put;await f.sync.adopt();assert.equal(f.calls.put,writes);assert.deepEqual(f.server.payload.state.values.reserveStock,[{n:'Reis',q:'50 g'}]);
}
{
 const p=payload([{n:'Reis',q:'200 g'}]),f=fixture({localState:p,remote:p});await f.sync.connect(uid,f.transport);f.local=payload([]);await f.sync.save();assert.equal(f.sync.phase,'empty-blocked');assert.equal(f.calls.put,0);await f.sync.adopt(true);assert.equal(f.server.payload.state.values.reserveStock.length,0);
}
{
 const p=payload([{n:'Reis',q:'200 g'}]),h=await fingerprint(p),f=fixture({localState:p,remote:payload([{n:'Reis',q:'400 g'}]),meta:{ownerId:uid,revision:1,lastHash:h}});await f.sync.connect(uid,f.transport);assert.equal(f.calls.restore,1);assert.equal(f.calls.put,0);assert.equal(f.local.state.values.reserveStock[0].q,'400 g');
}
{
 const blob=new Blob(['photo bytes'],{type:'image/jpeg'}),hash=await digest(await blob.arrayBuffer()),ref=uid+'/'+hash+'.jpg',p=payload([{n:'Reis',q:'200 g'}]);p.state.values.reservePersonalRecipesV1=[{id:'personal-test'}];p.photos={'personal-test':ref};
 const f=fixture({remote:p,photos:new Map()});f.objects.set(ref,blob);await f.sync.connect(uid,f.transport);assert.equal(f.calls.restore,1);assert.equal(f.sync.phase,'restored');assert.equal(f.calls.put,0);
 const broken=fixture({remote:p});broken.objects.set(ref,new Blob(['wrong bytes'],{type:'image/jpeg'}));await broken.sync.connect(uid,broken.transport);assert.equal(broken.calls.restore,0);assert.equal(broken.sync.phase,'error');assert.equal(broken.calls.put,0);
}
{
 const p=payload([{n:'Reis',q:'200 g'}]),f=fixture({localState:p,remote:p});await f.sync.connect(uid,f.transport);f.photos=new Map([['personal-photo',new Blob(['photo'],{type:'image/png'})]]);f.local.state.values.reservePersonalRecipesV1=[{id:'personal-photo'}];f.flags.failUpload=true;await f.sync.save();assert.equal(f.calls.put,0);assert.equal(f.sync.phase,'error');assert.equal(f.server.revision,1);
}
{
 const f=fixture();let release;f.flags.getPromise=new Promise(r=>release=r);const pending=f.sync.connect(uid,f.transport);while(!f.calls.get)await new Promise(r=>setTimeout(r,0));f.sync.stop();release();await pending;assert.equal(f.calls.restore,0);assert.equal(f.calls.put,0);assert.equal(f.sync.phase,'signed-out');
}
{
 const f=fixture();let release;f.flags.getPromise=new Promise(r=>release=r);const pending=f.sync.connect(uid,f.transport);while(!f.calls.get)await new Promise(r=>setTimeout(r,0));f.local=payload([{n:'Neu eingetragen',q:'1 Stück'}]);release();await pending;assert.equal(f.calls.restore,0);assert.equal(f.calls.put,0);assert.equal(f.sync.phase,'conflict');
}
console.log('Account sync: restore after empty browser, explicit adoption, load/upload failures, owner changes, CAS conflicts, photo digests, explicit empty save, stale session cancellation and clean-device refresh passed. No real cloud or email delivery claimed.');
