import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const recipeDir=path.join(root,'assets','recipes');
const dataDir=path.join(root,'data');
const outDir=path.join(root,'training','recipe-images');

const files=(await fs.readdir(dataDir)).filter(n=>/^recipes\.json$|^quality-batch-\d+\.json$/.test(n)).sort();
const recipes=new Map();
for(const file of files){
  const rows=JSON.parse(await fs.readFile(path.join(dataDir,file),'utf8'));
  for(const r of rows) if((!r.status||r.status==='approved')&&!recipes.has(r.id)) recipes.set(r.id,r);
}

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function dishForm(r){
  const t=norm(r.name);
  if(t.includes('shakshuka')) return 'shakshuka with eggs cooked directly in tomato sauce';
  if(t.includes('porridge')) return 'creamy cooked oat porridge';
  if(t.includes('muesli')||t.includes('mueesli')||t.includes('musli')) return 'muesli bowl with visible oat flakes';
  if(t.includes('pasta')||t.includes('spaghetti')||t.includes('nudel')) return 'cooked pasta dish';
  if(t.includes('couscous')) return 'fluffy fine-grain couscous dish';
  if(t.includes('reis')) return 'cooked rice dish with distinct rice grains';
  if(t.includes('dal')) return 'thick creamy lentil dal';
  if(t.includes('suppe')) return 'soup';
  if(t.includes('topf')) return 'moist stew';
  if(t.includes('omelett')) return 'omelette made from beaten eggs';
  if(t.includes('frittata')) return 'thick baked or pan-cooked frittata';
  if(t.includes('ruehrei')) return 'soft scrambled eggs';
  if(t.includes('brot')) return 'bread or toast dish';
  if(t.includes('bowl')) return 'single bowl meal';
  return 'simple home-cooked plated meal';
}
function caption(r){
  const ingredients=(r.ingredients||[]).map(i=>i.name).filter(Boolean);
  return [
    'RESERVEFOOD',
    `realistic premium recipe-app food photograph of ${r.name}`,
    dishForm(r),
    `visible recipe ingredients: ${ingredients.join(', ')}`,
    'all named main ingredients clearly recognizable and present in substantial quantity',
    'only recipe ingredients visible, no invented garnish or side dishes',
    'single finished serving, physically correct plate or bowl geometry',
    'no cutlery, no hands, no people, no text, no logo, no watermark',
    'dark neutral table, soft natural side light, 45-degree editorial cookbook photography, realistic home-cooked texture'
  ].join(', ');
}

await fs.mkdir(outDir,{recursive:true});
const imageNames=(await fs.readdir(recipeDir)).filter(n=>n.endsWith('.png')).sort();
const rows=[];
for(const image of imageNames){
  const id=image.slice(0,-4),r=recipes.get(id);
  if(!r) continue;
  rows.push({id,name:r.name,image:`assets/recipes/${image}`,caption:caption(r),ingredients:(r.ingredients||[]).map(i=>i.name),dishForm:dishForm(r),source:'approved-production-image'});
}
await fs.writeFile(path.join(outDir,'dataset.json'),JSON.stringify(rows,null,2)+'\n');
await fs.writeFile(path.join(outDir,'metadata.jsonl'),rows.map(x=>JSON.stringify({file_name:`../../assets/recipes/${x.id}.png`,text:x.caption,id:x.id})).join('\n')+(rows.length?'\n':''));
await fs.writeFile(path.join(outDir,'README.md'),`# RESERVE recipe-image training dataset\n\nGenerated from approved production recipe images only.\n\n- Trigger token: \`RESERVEFOOD\`\n- Samples: ${rows.length}\n- Structured index: \`dataset.json\`\n- Trainer-friendly captions: \`metadata.jsonl\`\n\nDo not add rejected review candidates to this dataset. Rebuild after approving new production images.\n`);
console.log(`Training dataset built: ${rows.length} approved image/caption pairs.`);
