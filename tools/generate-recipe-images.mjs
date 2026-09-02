import fs from 'node:fs/promises';
import path from 'node:path';

const token=process.env.REPLICATE_API_TOKEN;
if(!token) throw new Error('REPLICATE_API_TOKEN fehlt');
const model=process.env.REPLICATE_IMAGE_MODEL||'black-forest-labs/flux-1.1-pro';
const max=Number(process.env.MAX_IMAGES||'1');
const minStartIntervalMs=Number(process.env.MIN_REQUEST_INTERVAL_MS||'11000');
const root=process.cwd(),outDir=path.join(root,'assets','recipes');

const files=(await fs.readdir(path.join(root,'data'))).filter(n=>/^recipes\.json$|^quality-batch-\d+\.json$/.test(n)).sort();
const byId=new Map();
for(const file of files){
  const rows=JSON.parse(await fs.readFile(path.join(root,'data',file),'utf8'));
  for(const r of rows) if((!r.status||r.status==='approved')&&!byId.has(r.id)) byId.set(r.id,r);
}
await fs.mkdir(outDir,{recursive:true});
const missing=[];
for(const r of byId.values()){
  try{await fs.access(path.join(outDir,`${r.id}.png`));}catch{missing.push(r)}
}
console.log(`RESERVE: ${byId.size} Rezepte, ${missing.length} Bilder fehlen; erzeuge maximal ${max}.`);

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let lastPredictionStart=0;
function promptFor(r){
  const ingredients=(r.ingredients||[]).map(i=>i.name).filter(Boolean);
  const required=ingredients.slice(0,6).join(', ');
  const type=r.type||'meal';
  const tags=(r.tags||[]).join(', ');
  return `Create an accurate finished-dish photograph for a recipe app. Recipe: "${r.name}". Recipe category: ${type}. ${tags?`Recipe tags: ${tags}. `:''}The food identity and recipe accuracy are more important than decorative styling. The finished dish must clearly look like ${r.name}. Required recipe ingredients: ${required}. Make the characteristic main ingredients visually recognizable whenever they would normally be visible in the finished dish. Do not reinterpret the dish as risotto, pasta, soup, puree, or another dish unless the recipe itself calls for that. Do not invent savory herbs, parsley, cheese, meat, vegetables, sauces, garnishes, nuts, seeds, flowers, or side dishes unless they are listed in the recipe ingredients. For sweet breakfast porridge or oatmeal, show recognizable oat porridge texture and prominently show any listed fruit or berries; never add parsley or savory garnish. Natural realistic home-cooked portion, premium appetizing food photography, dark navy table setting, soft natural side light, subtle warm highlights, 45-degree camera angle, shallow depth of field, editorial cookbook quality, clean composition. No people, no hands, no text, no letters, no logos, no watermark, no packaging.`;
}
async function createPrediction(r){
  const [owner,name]=model.split('/');
  if(!owner||!name) throw new Error(`Ungültiges Modell: ${model}`);
  const endpoint=`https://api.replicate.com/v1/models/${owner}/${name}/predictions`;
  for(let attempt=0;attempt<6;attempt++){
    const gap=Date.now()-lastPredictionStart;
    if(gap<minStartIntervalMs){
      const wait=minStartIntervalMs-gap;
      console.log(`  Rate-Limit-Schutz: warte ${Math.ceil(wait/1000)}s…`);
      await sleep(wait);
    }
    lastPredictionStart=Date.now();
    let res;
    try{
      res=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Prefer':'wait'},body:JSON.stringify({input:{prompt:promptFor(r),aspect_ratio:'1:1',output_format:'png',output_quality:90,num_outputs:1}})});
    }catch(err){
      if(attempt===5) throw err;
      const wait=Math.min(30000,2000*(2**attempt));
      console.log(`  Netzwerkfehler: neuer Versuch in ${Math.ceil(wait/1000)}s…`);
      await sleep(wait);continue;
    }
    if(res.ok) return res.json();
    const text=await res.text();
    if(res.status===429&&attempt<5){
      let retry=Number(res.headers.get('retry-after'))||0;
      try{const body=JSON.parse(text);retry=Number(body.retry_after)||retry;}catch{}
      const wait=Math.max(1000,(retry||Math.min(30,2**attempt))*1000+750);
      console.log(`  Replicate 429: warte ${Math.ceil(wait/1000)}s und versuche erneut…`);
      await sleep(wait);continue;
    }
    if(res.status>=500&&attempt<5){
      const wait=Math.min(30000,2000*(2**attempt));
      console.log(`  Replicate ${res.status}: neuer Versuch in ${Math.ceil(wait/1000)}s…`);
      await sleep(wait);continue;
    }
    throw new Error(`Replicate ${res.status}: ${text}`);
  }
  throw new Error(`Replicate konnte ${r.id} nach mehreren Versuchen nicht starten`);
}
async function prediction(r){
  let p=await createPrediction(r);
  for(let i=0;!['succeeded','failed','canceled'].includes(p.status)&&i<90;i++){
    await sleep(2000);
    const res=await fetch(p.urls.get,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok) throw new Error(`Replicate Status ${res.status}: ${await res.text()}`);
    p=await res.json();
  }
  if(p.status!=='succeeded') throw new Error(`Bild fehlgeschlagen (${p.status}): ${p.error||'unbekannt'}`);
  const url=Array.isArray(p.output)?p.output[0]:p.output;
  if(!url) throw new Error('Replicate lieferte keine Bild-URL');
  const img=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(!img.ok)throw new Error(`Bilddownload ${img.status}`);
  const type=(img.headers.get('content-type')||'').toLowerCase();
  const bytes=Buffer.from(await img.arrayBuffer());
  if(bytes.length<10_000)throw new Error(`Bild ${r.id} ist verdächtig klein (${bytes.length} Bytes)`);
  if(type&&!type.includes('image/'))throw new Error(`Unerwarteter Bildtyp für ${r.id}: ${type}`);
  return bytes;
}
let made=0;
for(const r of missing.slice(0,max)){
  console.log(`→ ${r.id}`);
  const bytes=await prediction(r);
  await fs.writeFile(path.join(outDir,`${r.id}.png`),bytes);
  made++;
}
console.log(`✓ ${made} neue Rezeptbilder erzeugt.`);
