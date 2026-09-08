import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const refsPath=path.join(root,'data','recipe-image-references.json');
const outPath=path.join(root,'assets','recipe-review','generation-specs.json');
const refs=JSON.parse(await fs.readFile(refsPath,'utf8'));
const min=Number(refs?.policy?.minimumReferenceSources||2);
const dataFiles=(await fs.readdir(path.join(root,'data'))).filter(n=>/^recipes\.json$|^quality-batch-.*\.json$/.test(n)).sort();
const recipes=new Map();
for(const f of dataFiles){
  const rows=JSON.parse(await fs.readFile(path.join(root,'data',f),'utf8'));
  for(const r of rows)if((!r.status||r.status==='approved')&&!recipes.has(r.id))recipes.set(r.id,r);
}
const specs=[];
for(const [id,p] of Object.entries(refs.profiles||{})){
  const r=recipes.get(id);if(!r)throw new Error(`Referenzprofil ohne Rezept: ${id}`);
  const sources=Array.isArray(p.sources)?p.sources:[];
  const sourceReady=sources.length>=min&&sources.every(s=>s.url&&s.role==='authenticity_reference'&&s.reuse==='reference_only');
  const allowed=(r.ingredients||[]).map(i=>i.name).filter(Boolean);
  specs.push({
    id,
    name:r.name,
    status:sourceReady?'ready':'needs_sources',
    cuisine:r.cuisine||'',
    dishForm:p.dishForm||'recognizable authentic home-cooked dish',
    mustVisible:Array.isArray(p.mustVisible)?p.mustVisible:[],
    allowedIngredients:allowed,
    forbidden:Array.isArray(p.forbidden)?p.forbidden:[],
    sources,
    sourceCount:sources.length,
    minimumReferenceSources:min,
    style:refs.policy.defaultStyle,
    copyrightPolicy:refs.policy.commercialUseRule
  });
}
await fs.mkdir(path.dirname(outPath),{recursive:true});
await fs.writeFile(outPath,JSON.stringify({version:1,generatedAt:new Date().toISOString(),specs},null,2)+'\n');
const ready=specs.filter(s=>s.status==='ready').length;
console.log(`✓ ${specs.length} Bildprofile gebaut: ${ready} ready, ${specs.length-ready} brauchen weitere Referenzen.`);
