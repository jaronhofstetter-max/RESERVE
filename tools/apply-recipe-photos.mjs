import fs from 'node:fs';
const source=process.argv[2]||'data/recipes.json';
const manifest=JSON.parse(fs.readFileSync('data/recipe-photo-sources.json','utf8'));
const recipes=JSON.parse(fs.readFileSync(source,'utf8'));
for(const p of manifest.photos){
 const r=recipes.find(r=>r.id===p.recipeId);if(!r)throw Error('Unknown photo recipe '+p.recipeId);
 if(!p.path.startsWith('assets/recipe-photos/')||!fs.existsSync(p.path))throw Error('Missing local photograph '+p.path);
 r.image=p.path;r.imageCredit={author:p.author,source:p.source,license:p.license,licenseUrl:p.licenseUrl,provider:p.provider,title:p.title,adaptation:p.adaptation,servingSuggestion:true};
}
fs.writeFileSync(source,JSON.stringify(recipes)+'\n');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entries=manifest.photos.map(p=>`<article id="${esc(p.recipeId)}"><img src="${esc(p.path)}" alt="${esc(recipes.find(r=>r.id===p.recipeId).name)}" loading="lazy"><div><h2>${esc(recipes.find(r=>r.id===p.recipeId).name)}</h2><p><a href="${esc(p.source)}">${esc(p.title||'Originalfoto')}</a> · Foto: ${esc(p.author)} · ${esc(p.provider)}</p><p><a href="${esc(p.licenseUrl)}">${esc(p.license)}</a> — diese Lizenz gilt auch für die hier bereitgestellte Bilddatei.</p><p>${esc(p.adaptation)} Die Ansicht in der App kann einen Ausschnitt zeigen.</p><p class="note">${esc(p.review)}</p></div></article>`).join('\n');
fs.writeFileSync('recipe-photo-credits.html',`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bildnachweise · RESERVE</title><style>body{margin:0;background:#faf9f4;color:#213c30;font:16px/1.5 system-ui}main{max-width:960px;margin:auto;padding:24px}a{color:#286541}h1{font-size:30px}h2{font-size:20px;margin:0}article{display:flex;gap:20px;background:white;border:1px solid #dce3d8;border-radius:16px;padding:20px;margin:20px 0;scroll-margin-top:20px}img{width:160px;height:160px;object-fit:contain}p{margin:8px 0}.note{color:#526356;font-size:14px}@media(max-width:520px){article{display:block}img{width:100%;height:180px}}</style><main><a href="./">Zurück zu RESERVE</a><h1>Bildnachweise</h1><p>Die folgenden Rezeptbilder sind Fotografien. Sie zeigen Serviervorschläge; Garnitur und Anrichtung können vom Rezept abweichen.</p>${entries}</main></html>\n`);
console.log('Applied '+manifest.photos.length+' reviewed real recipe photographs');
