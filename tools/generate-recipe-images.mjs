import fs from 'node:fs/promises';
import path from 'node:path';

const token=process.env.REPLICATE_API_TOKEN;
if(!token) throw new Error('REPLICATE_API_TOKEN fehlt');
const model=process.env.REPLICATE_IMAGE_MODEL||'black-forest-labs/flux-1.1-pro';
const max=Number(process.env.MAX_IMAGES||'1');
const minStartIntervalMs=Number(process.env.MIN_REQUEST_INTERVAL_MS||'11000');
const root=process.cwd(),outDir=path.join(root,'assets','recipes'),reviewDir=path.join(root,'assets','recipe-review');
const manifestPath=path.join(reviewDir,'manifest.json');

const files=(await fs.readdir(path.join(root,'data'))).filter(n=>/^recipes\.json$|^quality-batch-\d+\.json$/.test(n)).sort();
const byId=new Map();
for(const file of files){const rows=JSON.parse(await fs.readFile(path.join(root,'data',file),'utf8'));for(const r of rows)if((!r.status||r.status==='approved')&&!byId.has(r.id))byId.set(r.id,r)}
await fs.mkdir(outDir,{recursive:true});await fs.mkdir(reviewDir,{recursive:true});
const missing=[];for(const r of byId.values()){try{await fs.access(path.join(outDir,`${r.id}.png`))}catch{try{await fs.access(path.join(reviewDir,`${r.id}.png`))}catch{missing.push(r)}}}
console.log(`RESERVE: ${byId.size} Rezepte, ${missing.length} Bilder ohne Produktion/Review; erzeuge maximal ${max}.`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let lastPredictionStart=0;
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
const has=(arr,...needles)=>arr.some(x=>needles.some(n=>norm(x).includes(norm(n))));

function buildVisualSpec(r){
 const ingredientNames=(r.ingredients||[]).map(i=>i.name).filter(Boolean);
 const n=ingredientNames.map(norm),title=norm(r.name),tags=(r.tags||[]).map(norm);
 const must=[];const forbidden=new Set(['decorative herbs','microgreens','flowers','lemon wedges','unlisted sauce','unlisted cheese','unlisted nuts','unlisted seeds','unlisted side dishes','cutlery']);
 const addMust=(label,detail)=>{if(!must.some(x=>x.label===label))must.push({label,detail})};
 const allowed=(...words)=>has(ingredientNames,...words);
 const banIfAbsent=(label,...words)=>{if(!allowed(...words))forbidden.add(label)};
 let form='simple plated home-cooked meal using only the listed ingredients';
 let vessel='plain plate or bowl appropriate to the dish';

 if(title.includes('porridge')){form='thick creamy cooked oat porridge, visibly soft oatmeal texture, never rice-like or pasta-like';vessel='simple bowl';addMust('oats','cooked swollen oat texture visible across the base');forbidden.add('rice');forbidden.add('pasta');forbidden.add('waffles')}
 else if(title.includes('muesli')||title.includes('mueesli')||title.includes('musli')){form='recognizable muesli with visible oats/cereal and listed wet dairy or fruit component';vessel='simple bowl';addMust('muesli/oats','distinct oat flakes visible');forbidden.add('cooked risotto texture')}
 else if(title.includes('ruehrei')){form='soft irregular scrambled egg curds, no intact yolk or fried egg';vessel='simple plate';addMust('scrambled egg','broken soft egg curds visibly mixed through dish');forbidden.add('fried egg');forbidden.add('poached egg')}
 else if(title.includes('omelett')){form='recognizable omelette made from beaten eggs, folded or open';vessel='simple plate';addMust('omelette','continuous cooked beaten-egg structure');forbidden.add('fried egg')}
 else if(title.includes('suppe')||title.includes('topf')||title.includes('dal')){form=title.includes('dal')?'thick red-lentil dal: soft cooked lentils forming a creamy stew, not separate rice grains':'moist spoonable stew/soup, not a dry grain plate';vessel='simple deep bowl';if(title.includes('dal')){addMust('red lentils','soft split red lentils visibly forming the thick stew');forbidden.add('rice as the main body of the dal')}}
 else if(title.includes('pasta')||title.includes('spaghetti')||title.includes('nudel')){form='clearly recognizable cooked pasta as the main base';vessel='simple plate or shallow bowl';addMust('pasta','recognizable pasta shapes or strands forming the main base');forbidden.add('rice');forbidden.add('orzo')}
 else if(title.includes('couscous')){form='fluffy fine couscous grains as the visible base, not rice, lentils or large pasta';vessel='simple bowl or shallow plate';addMust('couscous','many tiny separate couscous granules clearly visible');forbidden.add('rice');forbidden.add('orzo');forbidden.add('large pasta')}
 else if(title.includes('reis')){form='clearly recognizable cooked rice grains as the main starch';vessel='simple plate or shallow bowl';addMust('rice','distinct elongated or medium cooked rice grains visibly form the base');forbidden.add('orzo');forbidden.add('couscous');forbidden.add('pasta')}
 else if(title.includes('brot')){form='single serving of bread or toast with listed toppings only';vessel='simple plate';addMust('bread','bread slice clearly visible under toppings')}
 else if(title.includes('bowl')){form='clean bowl meal with named ingredients separated enough to recognize';vessel='simple bowl'}

 const titleTokens=title.split(/[-–—\s]+/).filter(Boolean);
 const titleConcepts=[
  ['brokkoli',['brokkoli']],['kartoffel',['kartoffel']],['tomaten',['tomate']],['gurken',['gurke']],['kichererbsen',['kichererbse']],['linsen',['linse']],['tofu',['tofu']],['poulet',['poulet','hahnchen','hähnchen']],['hackfleisch',['hackfleisch']],['apfel',['apfel']],['bananen',['banane']],['beeren',['beere','himbeere','heidelbeere']],['paprika',['paprika']],['spinat',['spinat']],['kaese',['kase','käse']]
 ];
 for(const [token,words] of titleConcepts){if(titleTokens.some(t=>t.includes(token))){const matching=ingredientNames.find(x=>words.some(w=>norm(x).includes(norm(w))));addMust(token,matching?`${matching} must be clearly visible and unmistakable`:`the named ${token} must be clearly visible and unmistakable`)}}
 if(title.includes('hackfleisch')){forbidden.add('meatballs');forbidden.add('large intact meat chunks');const m=must.find(x=>x.label==='hackfleisch');if(m)m.detail='browned loose minced meat crumbles, not meatballs and not steak-like chunks'}
 if(title.includes('kichererbsen')){const m=must.find(x=>x.label==='kichererbsen');if(m)m.detail='whole beige chickpeas with characteristic round shape clearly visible; do not turn them into meatballs or potatoes'}
 if(title.includes('linsen')){const m=must.find(x=>x.label==='linsen');if(m)m.detail='small lentils clearly visible in the dish; they must not be replaced by rice or pasta'}
 if(title.includes('tofu')){const m=must.find(x=>x.label==='tofu');if(m)m.detail='light beige tofu cubes with clean cut edges, clearly distinct from chicken or cheese'}
 if(title.includes('brokkoli')){const m=must.find(x=>x.label==='brokkoli');if(m)m.detail='multiple unmistakable green broccoli florets prominently visible'}
 if(title.includes('gurken')){const m=must.find(x=>x.label==='gurken');if(m)m.detail='fresh green cucumber slices clearly visible'}
 if(title.includes('paprika')){const m=must.find(x=>x.label==='paprika');if(m)m.detail='clearly visible red/yellow/green bell-pepper pieces'}

 banIfAbsent('egg in any form','ei','egg');banIfAbsent('parsley/cilantro/basil/mint','petersilie','koriander','basilikum','minze','krauter','kräuter');banIfAbsent('tomatoes','tomate');banIfAbsent('carrots','karotte','mohre','ruebli');banIfAbsent('chickpeas','kichererbse');banIfAbsent('cheese','kase','käse','feta','parmesan');banIfAbsent('berries','beere','himbeere','heidelbeere');banIfAbsent('citrus/lemon','zitrone','orange');banIfAbsent('nuts','nuss','mandel','walnuss');
 const visibleAllowed=ingredientNames.filter(x=>!['salz','pfeffer','wasser','öl','olivenöl','gewürz','gewurze'].some(y=>norm(x).includes(norm(y))));
 return {dish:r.name,form,vessel,mustVisible:must,allowedIngredients:ingredientNames,visibleAllowed,forbidden:[...forbidden],camera:'single finished serving, 45-degree food-photography angle, simple clean neutral/dark surface, no props that can be mistaken for ingredients'};
}

function promptFor(r){const s=buildVisualSpec(r);return `Create ONE realistic finished-dish photograph for a recipe app. Follow this VISUAL SPECIFICATION literally; do not improvise.\n\nDISH: ${s.dish}\nEXACT DISH FORM: ${s.form}\nVESSEL: ${s.vessel}\n\nMUST BE VISIBLY IDENTIFIABLE:\n${s.mustVisible.length?s.mustVisible.map(x=>`- ${x.label}: ${x.detail}`).join('\n'):'- the principal listed ingredients, in their normal recognizable cooked form'}\n\nONLY ALLOWED FOOD INGREDIENTS:\n${s.allowedIngredients.map(x=>`- ${x}`).join('\n')}\n\nEXPLICITLY FORBIDDEN IN THE IMAGE:\n${s.forbidden.map(x=>`- ${x}`).join('\n')}\n\nNON-NEGOTIABLE RULES:\n- If an ingredient is not in ONLY ALLOWED FOOD INGREDIENTS, do not show it anywhere, including as garnish or background food.\n- Named ingredients must not be substituted by visually similar foods.\n- Do not add food just to make the image prettier.\n- No cutlery, utensils, hands, people, packaging, labels, text, logos, or watermark.\n- Keep plate/bowl geometry physically correct; no fused, intersecting, duplicated or malformed objects.\n- Accuracy is more important than decoration. A simple sparse image is preferred over an inaccurate rich image.\n\nCAMERA/STYLE: ${s.camera}; premium but natural home-cooked editorial food photography, soft natural side light, realistic textures and portions.`}

async function createPrediction(r){const [owner,name]=model.split('/');if(!owner||!name)throw new Error(`Ungültiges Modell: ${model}`);const endpoint=`https://api.replicate.com/v1/models/${owner}/${name}/predictions`;for(let attempt=0;attempt<6;attempt++){const gap=Date.now()-lastPredictionStart;if(gap<minStartIntervalMs){const wait=minStartIntervalMs-gap;console.log(`  Rate-Limit-Schutz: warte ${Math.ceil(wait/1000)}s…`);await sleep(wait)}lastPredictionStart=Date.now();let res;try{res=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Prefer':'wait'},body:JSON.stringify({input:{prompt:promptFor(r),aspect_ratio:'1:1',output_format:'png',output_quality:90,num_outputs:1}})})}catch(err){if(attempt===5)throw err;await sleep(Math.min(30000,2000*(2**attempt)));continue}if(res.ok)return res.json();const text=await res.text();if(res.status===429&&attempt<5){let retry=Number(res.headers.get('retry-after'))||0;try{const body=JSON.parse(text);retry=Number(body.retry_after)||retry}catch{}await sleep(Math.max(1000,(retry||Math.min(30,2**attempt))*1000+750));continue}if(res.status>=500&&attempt<5){await sleep(Math.min(30000,2000*(2**attempt)));continue}throw new Error(`Replicate ${res.status}: ${text}`)}throw new Error(`Replicate konnte ${r.id} nach mehreren Versuchen nicht starten`)}
async function prediction(r){let p=await createPrediction(r);for(let i=0;!['succeeded','failed','canceled'].includes(p.status)&&i<90;i++){await sleep(2000);const res=await fetch(p.urls.get,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error(`Replicate Status ${res.status}: ${await res.text()}`);p=await res.json()}if(p.status!=='succeeded')throw new Error(`Bild fehlgeschlagen (${p.status}): ${p.error||'unbekannt'}`);const url=Array.isArray(p.output)?p.output[0]:p.output;if(!url)throw new Error('Replicate lieferte keine Bild-URL');const img=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(!img.ok)throw new Error(`Bilddownload ${img.status}`);const type=(img.headers.get('content-type')||'').toLowerCase(),bytes=Buffer.from(await img.arrayBuffer());if(bytes.length<10000)throw new Error(`Bild ${r.id} ist verdächtig klein (${bytes.length} Bytes)`);if(type&&!type.includes('image/'))throw new Error(`Unerwarteter Bildtyp für ${r.id}: ${type}`);return bytes}

let oldManifest=[];try{oldManifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));if(!Array.isArray(oldManifest))oldManifest=[]}catch{}
const fresh=[];let made=0;for(const r of missing.slice(0,max)){const spec=buildVisualSpec(r);console.log(`→ ${r.id}`);console.log(`  Form: ${spec.form}`);console.log(`  Muss sichtbar: ${spec.mustVisible.map(x=>x.label).join(', ')||'Hauptzutaten'}`);const bytes=await prediction(r);await fs.writeFile(path.join(reviewDir,`${r.id}.png`),bytes);fresh.push({id:r.id,name:r.name,status:'pending_review',visualSpec:spec,requiredIngredients:(r.ingredients||[]).map(i=>i.name),checks:{dishForm:null,titleIngredientsVisible:null,noInventedIngredients:null,noGeometryErrors:null},generatedAt:new Date().toISOString()});made++}
if(fresh.length){const freshIds=new Set(fresh.map(x=>x.id));const merged=[...oldManifest.filter(x=>!freshIds.has(x.id)),...fresh];await fs.writeFile(manifestPath,JSON.stringify(merged,null,2)+'\n')}
console.log(`✓ ${made} neue Kandidaten erzeugt. Sie liegen in assets/recipe-review und sind NICHT automatisch Produktionsbilder.`);
