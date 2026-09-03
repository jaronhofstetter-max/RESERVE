import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=process.cwd();
const reviewDir=path.join(root,'assets','recipe-review');
const prodDir=path.join(root,'assets','recipes');
const manifestPath=path.join(reviewDir,'manifest.json');
const max=Math.max(1,Math.min(10,Number(process.env.MAX_IMAGES||'10')));

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const hash=s=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rng=s=>{let x=hash(s)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%10000)/10000}};

const files=(await fs.readdir(path.join(root,'data'))).filter(n=>/^recipes\.json$|^quality-batch-\d+\.json$/.test(n)).sort();
const recipes=new Map();
for(const file of files){for(const r of JSON.parse(await fs.readFile(path.join(root,'data',file),'utf8'))){if((!r.status||r.status==='approved')&&!recipes.has(r.id))recipes.set(r.id,r)}}
await fs.mkdir(reviewDir,{recursive:true});await fs.mkdir(prodDir,{recursive:true});

function classify(name){const n=norm(name);
 if(/olivenol|rapsol|wasser|salz|pfeffer|gewurz|curry|zimt|krauter|kräuter/.test(n))return 'seasoning';
 if(/vollkornpasta|pasta|spaghetti|nudel/.test(n))return 'pasta';
 if(/couscous/.test(n))return 'couscous';if(/reis/.test(n))return 'rice';if(/haferflocken|hafer/.test(n))return 'oats';
 if(/kartoff/.test(n))return 'potato';if(/tomat/.test(n))return 'tomato';if(/paprika/.test(n))return 'pepper';if(/brokkoli/.test(n))return 'broccoli';if(/karott|ruebli|mohre/.test(n))return 'carrot';if(/spinat/.test(n))return 'spinach';if(/gurke/.test(n))return 'cucumber';if(/zwiebel/.test(n))return 'onion';
 if(/kichererb/.test(n))return 'chickpea';if(/weiss.*bohn|wei.*bohn/.test(n))return 'whitebean';if(/bohn/.test(n))return 'bean';if(/linse/.test(n))return 'lentil';
 if(/tofu/.test(n))return 'tofu';if(/feta/.test(n))return 'feta';if(/kase|käse/.test(n))return 'cheese';if(/poulet|hahnchen|hähnchen/.test(n))return 'chicken';if(/hackfleisch/.test(n))return 'mince';if(/ei$|eier|egg/.test(n))return 'egg';
 if(/joghurt/.test(n))return 'yogurt';if(/quark/.test(n))return 'quark';if(/milch|drink/.test(n))return 'milk';
 if(/banan/.test(n))return 'banana';if(/apfel/.test(n))return 'apple';if(/birn/.test(n))return 'pear';if(/mango/.test(n))return 'mango';if(/beere|heidelbeere|himbeere|erdbeere/.test(n))return 'berry';if(/orange|zitrone/.test(n))return 'citrus';
 if(/brot|toast/.test(n))return 'bread';return 'generic';}

function dishMode(r){const t=norm(r.name);if(t.includes('porridge'))return 'porridge';if(t.includes('ruehrei'))return 'scramble';if(t.includes('omelett'))return 'omelette';if(t.includes('eintopf')||t.includes('topf')||t.includes('suppe')||t.includes('dal')||t.includes('curry'))return 'stew';if(t.includes('pasta')||t.includes('spaghetti')||t.includes('nudel'))return 'pasta';if(t.includes('reis'))return 'rice';if(t.includes('couscous'))return 'couscous';if(t.includes('salat'))return 'salad';if(t.includes('brot'))return 'bread';return 'bowl';}

const el={
 circle:(x,y,r,f,stroke='none',sw=0)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${stroke}" stroke-width="${sw}"/>`,
 ellipse:(x,y,rx,ry,f,rot=0,stroke='none',sw=0)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" transform="rotate(${rot} ${x} ${y})" stroke="${stroke}" stroke-width="${sw}"/>`,
 rect:(x,y,w,h,r,f,rot=0,stroke='none',sw=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" transform="rotate(${rot} ${x+w/2} ${y+h/2})" stroke="${stroke}" stroke-width="${sw}"/>`,
 path:(d,f,stroke='none',sw=0)=>`<path d="${d}" fill="${f}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
};

function glyph(type,x,y,s=1,rot=0){switch(type){
 case 'tomato':return el.circle(x,y,26*s,'#e85843','#c94735',2)+el.path(`M${x-7*s},${y-20*s} Q${x},${y-31*s} ${x+8*s},${y-20*s} Q${x},${y-16*s} ${x-7*s},${y-20*s}`,'#4f8d4b');
 case 'potato':return el.ellipse(x,y,34*s,25*s,'#e7bd67',rot,'#c99545',2)+el.circle(x-10*s,y-3*s,2*s,'#a67837')+el.circle(x+11*s,y+5*s,2*s,'#a67837');
 case 'pepper':return el.path(`M${x-28*s},${y-12*s} Q${x-26*s},${y-35*s} ${x},${y-27*s} Q${x+27*s},${y-35*s} ${x+29*s},${y-8*s} Q${x+27*s},${y+27*s} ${x},${y+30*s} Q${x-29*s},${y+25*s} ${x-28*s},${y-12*s}`,'#ef7d32','#d25e22',2)+el.rect(x-4*s,y-39*s,8*s,15*s,3*s,'#4d8c49');
 case 'broccoli':return el.rect(x-6*s,y,12*s,30*s,5*s,'#69a451',rot)+el.circle(x-17*s,y-3*s,18*s,'#438b49')+el.circle(x,y-12*s,20*s,'#4b9650')+el.circle(x+17*s,y-2*s,17*s,'#3f8647');
 case 'carrot':return el.path(`M${x-15*s},${y-20*s} L${x+18*s},${y-5*s} L${x-4*s},${y+34*s} Z`,'#ef8a32','#d87020',2)+el.path(`M${x-10*s},${y-24*s} Q${x-20*s},${y-39*s} ${x-27*s},${y-32*s} M${x-7*s},${y-24*s} Q${x},${y-42*s} ${x+8*s},${y-34*s}`,'none','#4e8d49',5);
 case 'spinach':return el.path(`M${x},${y+28*s} C${x-38*s},${y+7*s} ${x-32*s},${y-25*s} ${x},${y-31*s} C${x+34*s},${y-24*s} ${x+36*s},${y+8*s} ${x},${y+28*s}Z`,'#4b965b','#347744',2)+el.path(`M${x},${y+24*s} L${x},${y-20*s}`,'none','#d8e7c6',2);
 case 'cucumber':return el.circle(x,y,29*s,'#79b86f','#3c8b55',3)+el.circle(x,y,22*s,'#b8d98c')+el.circle(x-8*s,y,2*s,'#edf2c8')+el.circle(x+8*s,y,2*s,'#edf2c8');
 case 'onion':return el.path(`M${x},${y-32*s} C${x-35*s},${y-10*s} ${x-30*s},${y+32*s} ${x},${y+35*s} C${x+30*s},${y+32*s} ${x+35*s},${y-10*s} ${x},${y-32*s}Z`,'#c997b7','#9d6d91',2);
 case 'chickpea':return el.circle(x,y,16*s,'#d9a75c','#b88745',2)+el.circle(x-5*s,y-5*s,3*s,'#efca82');
 case 'whitebean':return el.ellipse(x,y,24*s,15*s,'#f4ead5',rot,'#d7c5a9',2)+el.path(`M${x-6*s},${y} Q${x},${y+7*s} ${x+7*s},${y}`,'none','#c7b79e',2);
 case 'bean':return el.ellipse(x,y,24*s,15*s,'#b76d55',rot,'#8d4f3f',2);
 case 'lentil':return el.ellipse(x,y,11*s,7*s,'#b97b44',rot,'#8e5b31',1);
 case 'tofu':return el.rect(x-24*s,y-22*s,48*s,44*s,6*s,'#f1d8a8',rot,'#d7ba82',2);
 case 'feta':return el.rect(x-23*s,y-21*s,46*s,42*s,5*s,'#fff8e9',rot,'#d9d0bc',2)+el.circle(x-8*s,y-3*s,2*s,'#d9d0bc')+el.circle(x+9*s,y+7*s,2*s,'#d9d0bc');
 case 'cheese':return el.rect(x-25*s,y-19*s,50*s,38*s,5*s,'#f2c85d',rot,'#d4a944',2);
 case 'chicken':return el.path(`M${x-29*s},${y-5*s} Q${x-17*s},${y-31*s} ${x+8*s},${y-23*s} Q${x+34*s},${y-14*s} ${x+25*s},${y+14*s} Q${x+5*s},${y+33*s} ${x-24*s},${y+18*s}Z`,'#d99b62','#b77947',2);
 case 'mince':return [0,1,2,3,4].map((i)=>el.circle(x+(i%3-1)*11*s,y+(Math.floor(i/3)-.3)*10*s,9*s,'#9b5d43','#75412f',1)).join('');
 case 'banana':return el.circle(x,y,28*s,'#f3df8f','#d9be61',2)+el.circle(x,y,9*s,'#f9f0c0');
 case 'apple':return el.path(`M${x},${y-27*s} C${x-28*s},${y-34*s} ${x-34*s},${y+15*s} ${x},${y+31*s} C${x+35*s},${y+15*s} ${x+27*s},${y-34*s} ${x},${y-27*s}Z`,'#df5b43','#bd4634',2)+el.path(`M${x},${y-27*s} Q${x+10*s},${y-41*s} ${x+20*s},${y-34*s}`,'none','#4e7d3e',4);
 case 'pear':return el.path(`M${x},${y-34*s} C${x-15*s},${y-12*s} ${x-34*s},${y+1*s} ${x-29*s},${y+24*s} C${x-21*s},${y+45*s} ${x+22*s},${y+45*s} ${x+30*s},${y+23*s} C${x+35*s},${y+2*s} ${x+15*s},${y-12*s} ${x},${y-34*s}Z`,'#d7c95f','#b4a843',2);
 case 'mango':return el.rect(x-27*s,y-23*s,54*s,46*s,8*s,'#f0a632',rot,'#d98c22',2);
 case 'berry':return el.circle(x,y,16*s,'#4f5a9e','#303a7f',2)+el.circle(x-5*s,y-6*s,3*s,'#8190ce');
 case 'bread':return el.path(`M${x-34*s},${y+25*s} L${x-34*s},${y-7*s} Q${x-20*s},${y-35*s} ${x},${y-35*s} Q${x+21*s},${y-35*s} ${x+34*s},${y-7*s} L${x+34*s},${y+25*s}Z`,'#c99356','#9f6d38',2)+el.path(`M${x-26*s},${y+17*s} L${x-26*s},${y-4*s} Q${x-16*s},${y-25*s} ${x},${y-25*s} Q${x+17*s},${y-25*s} ${x+26*s},${y-4*s} L${x+26*s},${y+17*s}Z`,'#e3b873');
 case 'egg':return el.path(`M${x-34*s},${y} C${x-27*s},${y-28*s} ${x-4*s},${y-25*s} ${x+8*s},${y-31*s} C${x+28*s},${y-28*s} ${x+36*s},${y-8*s} ${x+29*s},${y+11*s} C${x+14*s},${y+30*s} ${x-16*s},${y+27*s} ${x-34*s},${y}Z`,'#f3bf4b','#d99f2f',2);
 case 'generic':return el.circle(x,y,18*s,'#c7a66d','#9c8052',2);default:return ''}}

function baseLayer(mode){if(mode==='porridge')return `<ellipse cx="512" cy="535" rx="320" ry="250" fill="#dfc99b"/><ellipse cx="512" cy="535" rx="290" ry="220" fill="#ead9b2"/>`;if(mode==='stew')return `<ellipse cx="512" cy="535" rx="325" ry="255" fill="#c96c45" opacity=".93"/>`;if(mode==='omelette')return `<ellipse cx="512" cy="535" rx="315" ry="235" fill="#efc34f"/>`;if(mode==='scramble')return `<g>${[0,1,2,3,4,5,6,7].map(i=>glyph('egg',350+(i%4)*105,470+Math.floor(i/4)*125,.8,(i%3)*12)).join('')}</g>`;if(mode==='pasta')return `<g stroke="#d5a33e" stroke-width="22" fill="none" stroke-linecap="round">${[0,1,2,3,4,5].map(i=>`<path d="M260 ${420+i*45} C380 ${350+i*45},640 ${500-i*18},770 ${420+i*42}"/>`).join('')}</g>`;if(mode==='rice'||mode==='couscous')return `<g>${Array.from({length:95},(_,i)=>{const r=rng('base'+mode+i);const a=r()*Math.PI*2,d=Math.sqrt(r())*285,x=512+Math.cos(a)*d,y=530+Math.sin(a)*d*.75;return el.ellipse(x,y,mode==='rice'?10:7,mode==='rice'?4:5,mode==='rice'?'#f1e6c9':'#e5c77e',r()*180)}).join('')}</g>`;return ''}

function svgFor(r){const random=rng(r.id);const mode=dishMode(r);const items=(r.ingredients||[]).map(i=>({name:i.name,type:classify(i.name)})).filter(x=>!['seasoning','milk'].includes(x.type));const baseTypes=new Set(mode==='pasta'?['pasta']:mode==='rice'?['rice']:mode==='couscous'?['couscous']:mode==='porridge'?['oats','yogurt','quark']:[]);const foreground=items.filter(x=>!baseTypes.has(x.type));
 const bowl=`<ellipse cx="512" cy="548" rx="375" ry="300" fill="#d9d1c5" opacity=".28"/><ellipse cx="512" cy="520" rx="365" ry="290" fill="#f8f6ef" stroke="#d7cfc2" stroke-width="12"/><ellipse cx="512" cy="525" rx="325" ry="252" fill="#f0ece2"/>`;
 let food=baseLayer(mode);if(mode==='bowl'||mode==='salad'||mode==='bread'){const cream=items.find(x=>['yogurt','quark'].includes(x.type));if(cream)food+=`<ellipse cx="512" cy="535" rx="245" ry="185" fill="#fffdf8"/>`;}
 const count=Math.max(1,foreground.length);for(let i=0;i<foreground.length;i++){const item=foreground[i];const reps=['lentil','chickpea','whitebean','bean','berry'].includes(item.type)?7:['spinach'].includes(item.type)?4:3;for(let j=0;j<reps;j++){const angle=(i/count)*Math.PI*2+(j/reps)*.85+random()*.45;const radius=80+(i%3)*70+random()*90;const x=512+Math.cos(angle)*radius;const y=530+Math.sin(angle)*radius*.68;const scale=item.type==='lentil'?.8:item.type==='chickpea'?.8:item.type==='berry'?.85:1;food+=glyph(item.type,x,y,scale,Math.round((random()-.5)*35));}}
 if(mode==='scramble'&&foreground.some(x=>x.type==='egg')){};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#8e7f6b" flood-opacity=".22"/></filter></defs><rect width="1024" height="1024" fill="#f3eee5"/><circle cx="150" cy="160" r="100" fill="#e9ddc8" opacity=".45"/><circle cx="900" cy="890" r="150" fill="#e8dfcf" opacity=".4"/><g filter="url(#shadow)">${bowl}</g><g>${food}</g><text x="512" y="900" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" fill="#393a35">${esc(r.name)}</text><text x="512" y="940" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="4" fill="#77776e">RESERVE</text></svg>`}

const available=[];for(const r of recipes.values()){let exists=false;for(const dir of [prodDir,reviewDir]){try{await fs.access(path.join(dir,`${r.id}.png`));exists=true;break}catch{}}if(!exists)available.push(r)}
let manifest=[];try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));if(!Array.isArray(manifest))manifest=[]}catch{}
const fresh=[];for(const r of available.slice(0,max)){const svg=svgFor(r);const out=path.join(reviewDir,`${r.id}.png`);await sharp(Buffer.from(svg)).png({quality:92,compressionLevel:9}).toFile(out);fresh.push({id:r.id,name:r.name,status:'pending_review',style:'reserve-deterministic-composite-v1',generator:'tools/generate-recipe-composites.mjs',requiredIngredients:(r.ingredients||[]).map(i=>i.name),renderedIngredientTypes:(r.ingredients||[]).map(i=>classify(i.name)).filter(x=>x!=='seasoning'),checks:{deterministicIngredients:true,noInventedIngredients:true,manualVisualReview:null},generatedAt:new Date().toISOString()});console.log(`✓ ${r.id}`)}
if(fresh.length){const ids=new Set(fresh.map(x=>x.id));manifest=[...manifest.filter(x=>!ids.has(x.id)),...fresh];await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n')}
console.log(`RESERVE deterministic composer: ${fresh.length} Kandidaten erzeugt, keine KI-Bildkosten.`);
