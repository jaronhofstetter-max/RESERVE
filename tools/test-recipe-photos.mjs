import fs from 'node:fs';import assert from 'node:assert/strict';
const photos=JSON.parse(fs.readFileSync('data/recipe-photo-sources.json')).photos;
const catalog=JSON.parse(fs.readFileSync('data/recipe-catalog.json'));
assert.equal(new Set(photos.map(p=>p.recipeId)).size,photos.length);
for(const p of photos){const r=catalog.find(r=>r.id===p.recipeId);assert.equal(r.image,p.path);assert.equal(r.imageCredit.source,p.source);const full=JSON.parse(fs.readFileSync(r.detailShard)).find(x=>x.id===r.id);assert.equal(full.image,p.path);const b=fs.readFileSync(p.path);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<160000);assert.equal(p.kind,'photograph');assert.ok(p.author&&p.licenseUrl&&p.review)}
assert.ok(!catalog.find(r=>r.id==='linsen-reis-pfanne').image?.startsWith('assets/recipe-photos/'));
console.log('Reviewed photos: local WebP assets, credits, catalog and lazy details agree');
