import fs from 'node:fs/promises';
import path from 'node:path';

const token=process.env.REPLICATE_API_TOKEN;if(!token)throw new Error('REPLICATE_API_TOKEN fehlt');
const root=process.cwd(),model=process.env.REPLICATE_IMAGE_MODEL||'black-forest-labs/flux-1.1-pro';
const max=Number(process.env.MAX_IMAGES||'1'),only=(process.env.RECIPE_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const specsDoc=JSON.parse(await fs.readFile(path.join(root,'assets','recipe-review','generation-specs.json'),'utf8'));
const reviewDir=path.join(root,'assets','recipe-review'),manifestPath=path.join(reviewDir,'manifest.json');
await fs.mkdir(reviewDir,{recursive:true});

function promptFor(s){return `Create ONE original, photorealistic premium food photograph for the RESERVE app. The factual appearance is derived from multiple authentic culinary references, but DO NOT copy any source photograph's composition, props, camera angle, lighting, plate, background or styling.\nDISH: ${s.name}\nREGION: ${s.cuisine}\nAUTHENTIC DISH FORM — NON-NEGOTIABLE: ${s.dishForm}\nMUST BE CLEARLY VISIBLE: ${s.mustVisible.join('; ')}\nONLY THESE RECIPE INGREDIENTS MAY APPEAR AS FOOD: ${s.allowedIngredients.join(', ')}\nFORBIDDEN: ${s.forbidden.join(', ')||'any unlisted food, garnish or side dish'}\nSTYLE: ${s.style}\nACCURACY: literal, recognizable home-cooked food; realistic portion and texture; no invented garnish; no flowers; no whole ingredient props in background; no cutlery unless unavoidable; no hands or people; no text, flags, logos or watermark. One centered serving, neutral understated setting, square crop. Authenticity and ingredient accuracy are more important than decoration.`}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function make(s){const [o,n]=model.split('/');const res=await fetch(`https://api.replicate.com/v1/models/${o}/${n}/predictions`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Prefer':'wait'},body:JSON.stringify({input:{prompt:promptFor(s),aspect_ratio:'1:1',output_format:'png',output_quality:95,num_outputs:1}})});if(!res.ok)throw new Error(`Replicate ${res.status}: ${await res.text()}`);let p=await res.json();for(let i=0;!['succeeded','failed','canceled'].includes(p.status)&&i<90;i++){await sleep(2000);p=await(await fetch(p.urls.get,{headers:{Authorization:`Bearer ${token}`}})).json()}if(p.status!=='succeeded')throw new Error(p.error||p.status);const u=Array.isArray(p.output)?p.output[0]:p.output;return Buffer.from(await(await fetch(u)).arrayBuffer())}
let manifest=[];try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));if(!Array.isArray(manifest))manifest=[]}catch{}
let candidates=(specsDoc.specs||[]).filter(s=>s.status==='ready');if(only.length)candidates=candidates.filter(s=>only.includes(s.id));
let made=0;
for(const s of candidates.slice(0,max)){
 console.log(`→ ${s.id} [authentic-reference-photo-v1, ${s.sourceCount} sources]`);
 const bytes=await make(s),file=`${s.id}.png`;await fs.writeFile(path.join(reviewDir,file),bytes);
 const entry={id:s.id,name:s.name,status:'pending_review',style:'authentic-reference-photo-v1',referenceSources:s.sources,visualSpec:{dishForm:s.dishForm,mustVisible:s.mustVisible,allowedIngredients:s.allowedIngredients,forbidden:s.forbidden},checks:{dishForm:null,titleIngredientsVisible:null,noInventedIngredients:null,noGeometryErrors:null,authenticAppearance:null,independentComposition:null},generatedAt:new Date().toISOString()};
 manifest=manifest.filter(x=>x.id!==s.id);manifest.push(entry);made++;await sleep(11000);
}
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`✓ ${made} authentische Fotokandidaten erzeugt; menschliches Review bleibt Pflicht.`);
