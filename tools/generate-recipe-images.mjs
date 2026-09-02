import fs from 'node:fs/promises';
import path from 'node:path';

const token=process.env.REPLICATE_API_TOKEN;
if(!token) throw new Error('REPLICATE_API_TOKEN fehlt');
const model=process.env.REPLICATE_IMAGE_MODEL||'black-forest-labs/flux-1.1-pro';
const max=Number(process.env.MAX_IMAGES||'5');
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
function promptFor(r){
  const ingredients=(r.ingredients||[]).map(i=>i.name).join(', ');
  return `Premium realistic food photography of ${r.name}. The prepared dish must visibly and plausibly match these recipe ingredients: ${ingredients}. Appetizing home-cooked meal, natural portions, dark navy premium table setting, soft natural side light, subtle warm highlights, 45-degree camera angle, shallow depth of field, editorial cookbook photography, clean composition, no people, no hands, no text, no letters, no logos, no watermark, no packaging. Do not add prominent ingredients that are not in the recipe.`;
}
async function prediction(r){
  const [owner,name]=model.split('/');
  if(!owner||!name) throw new Error(`Ungültiges Modell: ${model}`);
  let res=await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/predictions`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Prefer':'wait'},
    body:JSON.stringify({input:{prompt:promptFor(r),aspect_ratio:'1:1',output_format:'png',output_quality:90,num_outputs:1}})
  });
  if(!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`);
  let p=await res.json();
  for(let i=0;!['succeeded','failed','canceled'].includes(p.status)&&i<90;i++){
    await sleep(2000);res=await fetch(p.urls.get,{headers:{Authorization:`Bearer ${token}`}});p=await res.json();
  }
  if(p.status!=='succeeded') throw new Error(`Bild fehlgeschlagen (${p.status}): ${p.error||'unbekannt'}`);
  const url=Array.isArray(p.output)?p.output[0]:p.output;
  if(!url) throw new Error('Replicate lieferte keine Bild-URL');
  const img=await fetch(url);if(!img.ok)throw new Error(`Bilddownload ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}
let made=0;
for(const r of missing.slice(0,max)){
  console.log(`→ ${r.id}`);const bytes=await prediction(r);
  if(bytes.length<10_000)throw new Error(`Bild ${r.id} ist verdächtig klein (${bytes.length} Bytes)`);
  await fs.writeFile(path.join(outDir,`${r.id}.png`),bytes);made++;
}
console.log(`✓ ${made} neue Rezeptbilder erzeugt.`);
