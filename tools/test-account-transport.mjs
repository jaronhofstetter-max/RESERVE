// HTTP contract regressions; no real credentials or remote requests.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('reserve-account-core-v1.js','utf8'));
vm.runInThisContext(fs.readFileSync('reserve-account-storage-v1.js','utf8'));
const uid='11111111-1111-4111-8111-111111111111';
const photo=new Blob(['synthetic-photo-bytes'],{type:'image/png'});
const hash=await RESERVE_ACCOUNT_CORE.digest(await photo.arrayBuffer());
const ref=uid+'/'+hash+'.png';
const transport=RESERVE_ACCOUNT_STORAGE.createTransport({url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'},{user:{id:uid},access_token:'test-token'});
const originalFetch=globalThis.fetch;
try{
 for(const body of [{error:'Duplicate'},{code:'Duplicate'},{code:'ResourceAlreadyExists'},{code:'KeyAlreadyExists'},{code:'already_exists'}]){
  const methods=[];
  globalThis.fetch=async(url,options)=>{methods.push(options.method||'GET');assert.equal(options.headers.Authorization,'Bearer test-token');return options.method==='POST'?new Response(JSON.stringify(body),{status:400}):new Response(photo);};
  await transport.upload(ref,photo);assert.deepEqual(methods,['POST','GET']);
 }
 globalThis.fetch=async(url,options)=>options.method==='POST'?new Response(JSON.stringify({error:'Duplicate'}),{status:400}):new Response(new Blob(['different-photo'],{type:'image/png'}));
 await assert.rejects(()=>transport.upload(ref,photo),/Prüfsumme/);
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({code:'EntityTooLarge'}),{status:413});};
 await assert.rejects(()=>transport.upload(ref,photo),/413/);assert.equal(calls,1);
 calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not request a foreign path');};
 await assert.rejects(()=>transport.download('22222222-2222-4222-8222-222222222222/'+hash+'.png'),/Fotoverweis/);assert.equal(calls,0);
 console.log('Account HTTP contract: legacy/current duplicate photo responses require checksum verification; corrupt duplicates, quota errors and foreign paths remain blocked. Network mocked.');
}finally{globalThis.fetch=originalFetch;}
