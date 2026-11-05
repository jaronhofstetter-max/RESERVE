// Real browser storage + mock network/auth contracts. No real accounts or emails.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=process.cwd(),mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(b);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),base=`http://127.0.0.1:${server.address().port}`;
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1kAAAAASUVORK5CYII=','base64'),hash=crypto.createHash('sha256').update(photo).digest('hex');
const keys=['reserveStock','reserveShopping','reserveProfile','reserveProductKnowledgeV1','reserveBarcodeProductsV1','reservePersonalRecipesV1','reserveExcludedRecipesV1'];
const recipe={id:'personal-account-test',name:'Kontorezept',portions:2,ingredientLines:['200 g Reis'],steps:['Reis garen.'],prepMinutes:null,cookMinutes:null,diet:'Alles',source:'',updatedAt:'2026-11-03T10:00:00Z'};
let cloud={revision:1,payload:{schema:1,state:{schema:2,app:'RESERVE',values:Object.fromEntries(keys.map(k=>[k,k==='reserveStock'?[{n:'Reis',q:'300 g'}]:k==='reservePersonalRecipesV1'?[recipe]:null])),cookingProgress:{}},drafts:[],photos:{[recipe.id]:alice+'/'+hash+'.png'}}};
const objects=new Map([[alice+'/'+hash+'.png',photo]]),writes=[],requests=[],errors=[];let reads=0,failReads=false;
async function pageFor(context){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({alice,bob})=>{
  let handler;
  const auth={getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('mockReserveSession')||'null')}}),onAuthStateChange:f=>(handler=f,{data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async({email})=>{const user={id:email.startsWith('bob')?bob:alice,email},session={user,access_token:user.id===alice?'token-alice':'token-bob'};localStorage.setItem('mockReserveSession',JSON.stringify(session));return {data:{session},error:null};},signOut:async()=>{localStorage.removeItem('mockReserveSession');handler?.('SIGNED_OUT',null);return {error:null};}};
  window.supabase={createClient:()=>({auth})};
 },{alice,bob});
 await page.route('**/reserve-account-config-v1.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.RESERVE_ACCOUNT_CONFIG={enabled:true,url:'https://test-reserve.supabase.co',publishableKey:'sb_publishable_fixture'};"}));
 await page.route('https://test-reserve.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),headers=request.headers(),token=headers.authorization;requests.push({path:url.pathname,token});
  if(token!=='Bearer token-alice')return route.fulfill({status:403,json:{code:'42501'}});
  if(url.pathname==='/rest/v1/reserve_account_state'){reads++;if(failReads)return route.fulfill({status:503,json:{code:'offline'}});return route.fulfill({json:cloud?[cloud]:[]});}
  if(url.pathname==='/rest/v1/rpc/save_reserve_account'){
   assert.ok(reads>0,'Read before write');const body=request.postDataJSON();
   if(body.p_expected_revision!==(cloud?.revision||0))return route.fulfill({status:409,json:{code:'40001'}});
   writes.push(body);cloud={revision:(cloud?.revision||0)+1,payload:body.p_payload};return route.fulfill({json:{revision:cloud.revision}});
  }
  const ref=url.pathname.replace('/storage/v1/object/reserve-private/','');
  if(request.method()==='POST'){if(objects.has(ref))return route.fulfill({status:409,json:{code:'Duplicate'}});objects.set(ref,request.postDataBuffer());return route.fulfill({json:{Key:ref}});}
  if(!objects.has(ref))return route.fulfill({status:404,json:{code:'not_found'}});
  return route.fulfill({contentType:ref.endsWith('.png')?'image/png':'image/jpeg',body:objects.get(ref)});
 });
 await page.route(/^https:\/\/(?!test-reserve\.supabase\.co)/,r=>r.abort());
 return page;
}
async function login(page,email='alice@example.invalid'){
 await page.goto(base);await page.waitForSelector('#reserveAccountAuth',{state:'attached'});await page.evaluate(()=>show('profile'));
 await page.locator('#reserveAccountEmail').fill(email);await page.locator('#reserveAccountPassword').fill('synthetic-password-only');await page.locator('#reserveAccountAuth button[type=submit]').click();
 await page.waitForFunction(()=>['ready','saved'].includes(document.getElementById('reserveAccountStatus')?.dataset.phase));
}
try{
 const c1=await browser.newContext({viewport:{width:390,height:844}}),p1=await pageFor(c1);
 await login(p1);
 await p1.waitForFunction(()=>JSON.parse(localStorage.getItem('reserveStock')||'[]')[0]?.q==='300 g');
 assert.equal(await p1.evaluate(()=>RESERVE_PERSONAL_RECIPES.records()[0]?.name),'Kontorezept');
 await p1.evaluate(()=>RESERVE_PERSONAL_RECIPES.view('personal-account-test'));await p1.waitForSelector('.personal-hero');assert.ok((await p1.locator('.personal-hero').getAttribute('src')).startsWith('blob:'));
 await p1.evaluate(()=>{stock[0].q='200 g';saveStock();});
 await p1.waitForFunction(()=>document.getElementById('reserveAccountStatus')?.textContent.startsWith('Vorrat, Rezepte'));
 // The saved label can still belong to the initial hydration. Wait for the
 // expected backing-store value, without weakening the persistence assertion.
 const saveDeadline=Date.now()+10000;
 while(cloud.payload.state.values.reserveStock[0].q!=='200 g'&&Date.now()<saveDeadline)await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(cloud.payload.state.values.reserveStock[0].q,'200 g');assert.ok(writes.length>0);
 // A fresh browser represents deleted site data: sign in and retrieve existing records/photos.
 const c2=await browser.newContext({viewport:{width:390,height:844}}),p2=await pageFor(c2);await login(p2);
 await p2.waitForFunction(()=>JSON.parse(localStorage.getItem('reserveStock')||'[]')[0]?.q==='200 g');
 assert.equal(await p2.evaluate(()=>RESERVE_PERSONAL_RECIPES.records()[0]?.id),recipe.id);
 await p2.evaluate(()=>RESERVE_PERSONAL_RECIPES.view('personal-account-test'));await p2.waitForSelector('.personal-hero');
 // Another device changes the revision: this browser must not overwrite it silently.
 cloud={revision:cloud.revision+1,payload:structuredClone(cloud.payload)};cloud.payload.state.values.reserveStock[0].q='50 g';
 await p1.evaluate(()=>{stock[0].q='100 g';saveStock();});await p1.waitForFunction(()=>document.getElementById('reserveAccountStatus')?.textContent.includes('anderes Gerät'));
 assert.equal(cloud.payload.state.values.reserveStock[0].q,'50 g');
 // Never carry cached Alice data into Bob's account, even if an SDK session changes externally.
 const beforeBob=requests.length;
 await p2.evaluate(bob=>localStorage.setItem('mockReserveSession',JSON.stringify({user:{id:bob,email:'bob@example.invalid'},access_token:'token-bob'})),bob);await p2.reload();
 await p2.waitForFunction(()=>document.getElementById('reserveAccountStatus')?.textContent.includes('anderen Kontos'));
 assert.equal(await p2.locator('#reserveAccountLock').isVisible(),true);assert.equal(requests.slice(beforeBob).filter(x=>x.token==='Bearer token-bob').length,0);
 // Network failure before the initial read never creates a new, empty remote snapshot.
 const c3=await browser.newContext(),p3=await pageFor(c3);failReads=true;const count=writes.length;
 await p3.goto(base);await p3.waitForSelector('#reserveAccountAuth',{state:'attached'});await p3.evaluate(()=>show('profile'));await p3.locator('#reserveAccountEmail').fill('alice@example.invalid');await p3.locator('#reserveAccountPassword').fill('synthetic-password-only');await p3.locator('#reserveAccountAuth button[type=submit]').click();await p3.waitForFunction(()=>document.getElementById('reserveAccountStatus')?.textContent.includes('503'));
 assert.equal(writes.length,count);assert.deepEqual(errors,[]);
 console.log('Browser contract test: fresh-browser login restores inventory, recipes and IndexedDB photos; autosave; revision conflicts; wrong-account cache lock; failed-read write barrier. Auth/network mocked; real Supabase/SMTP activation not verified.');
}finally{await browser.close();await new Promise(r=>server.close(r));}

