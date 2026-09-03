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
const rng=s=>{let x=hash(s)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}};
const files=(await fs.readdir(path.join(root,'data'))).filter(n=>/^recipes\.json$|^quality-batch-\d+\.json$/.test(n)).sort();
const recipes=new Map();
for(const file of files){for(const r of JSON.parse(await fs.readFile(path.join(root,'data',file),'utf8'))){if((!r.status||r.status==='approved')&&!recipes.has(r.id))recipes.set(r.id,r)}}
await fs.mkdir(reviewDir,{recursive:true});await fs.mkdir(prodDir,{recursive:true});

function classify(name){const n=norm(name);
 if(/olivenol|rapsol|wasser|salz|pfeffer|gewurz|curry|zimt|krauter/.test(n))return 'seasoning';
 if(/vollkornpasta|pasta|spaghetti|nudel/.test(n))return 'pasta';if(/couscous/.test(n))return 'couscous';if(/reis/.test(n))return 'rice';if(/haferflocken|hafer/.test(n))return 'oats';
 if(/kartoff/.test(n))return 'potato';if(/tomat/.test(n))return 'tomato';if(/paprika/.test(n))return 'pepper';if(/brokkoli/.test(n))return 'broccoli';if(/karott|ruebli|mohre/.test(n))return 'carrot';if(/spinat/.test(n))return 'spinach';if(/gurke/.test(n))return 'cucumber';if(/zwiebel/.test(n))return 'onion';
 if(/kichererb/.test(n))return 'chickpea';if(/weiss.*bohn|wei.*bohn/.test(n))return 'whitebean';if(/bohn/.test(n))return 'bean';if(/linse/.test(n))return 'lentil';
 if(/tofu/.test(n))return 'tofu';if(/feta/.test(n))return 'feta';if(/kase|käse/.test(n))return 'cheese';if(/poulet|hahnchen|hähnchen/.test(n))return 'chicken';if(/hackfleisch|rinderhack/.test(n))return 'mince';if(/rind|beef/.test(n))return 'beef';if(/ei$|eier|egg/.test(n))return 'egg';
 if(/joghurt/.test(n))return 'yogurt';if(/quark/.test(n))return 'quark';if(/milch|drink/.test(n))return 'milk';if(/banan/.test(n))return 'banana';if(/apfel/.test(n))return 'apple';if(/birn/.test(n))return 'pear';if(/mango/.test(n))return 'mango';if(/beere|heidelbeere|himbeere|erdbeere/.test(n))return 'berry';if(/brot|toast/.test(n))return 'bread';return 'generic';}

function mode(r){const t=norm(r.name);if(t.includes('porridge'))return 'porridge';if(t.includes('ruehrei'))return 'scramble';if(t.includes('frittata'))return 'frittata';if(t.includes('omelett'))return 'omelette';if(t.includes('eintopf')||t.includes('topf')||t.includes('suppe')||t.includes('dal')||t.includes('curry'))return 'stew';if(t.includes('pasta')||t.includes('spaghetti')||t.includes('nudel'))return 'pasta';if(t.includes('reis'))return 'rice';if(t.includes('couscous'))return 'couscous';if(t.includes('salat'))return 'salad';if(t.includes('brot'))return 'bread';return 'pan';}
const E={circle:(x,y,r,f,s='none',w=0)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${s}" stroke-width="${w}"/>`,ellipse:(x,y,rx,ry,f,rot=0,s='none',w=0)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" transform="rotate(${rot} ${x} ${y})" stroke="${s}" stroke-width="${w}"/>`,rect:(x,y,w,h,r,f,rot=0,s='none',sw=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" transform="rotate(${rot} ${x+w/2} ${y+h/2})" stroke="${s}" stroke-width="${sw}"/>`,path:(d,f,s='none',w=0)=>`<path d="${d}" fill="${f}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`};

function item(type,x,y,s=1,rot=0,cooked=true){const sh=`<ellipse cx="${x+5*s}" cy="${y+12*s}" rx="${26*s}" ry="${12*s}" fill="#2b1b12" opacity=".12" filter="url(#blur)"/>`;
 const gloss=(cx,cy,rx,ry)=>E.ellipse(cx,cy,rx,ry,'#fff',-25,'none',0).replace('/>',' opacity=".20"/>');
 switch(type){
 case 'tomato':return sh+E.ellipse(x,y,29*s,22*s,cooked?'#c94e38':'#e75b45',rot,'#9f382d',1.5)+gloss(x-8*s,y-7*s,8*s,3*s);
 case 'potato':return sh+E.ellipse(x,y,34*s,25*s,cooked?'#d9aa52':'#e6bd68',rot,'#ad7b36',1.5)+E.path(`M${x-20*s},${y+4*s} Q${x},${y+12*s} ${x+20*s},${y+2*s}`,'none','#9f6d2e',2);
 case 'pepper':return sh+E.rect(x-26*s,y-20*s,52*s,40*s,13*s,cooked?'#df6f2d':'#ef8337',rot,'#ba5224',1.5)+gloss(x-8*s,y-8*s,9*s,3*s);
 case 'broccoli':return sh+E.rect(x-5*s,y,10*s,27*s,4*s,'#648d42',rot)+E.circle(x-16*s,y-6*s,16*s,'#3f7d3e')+E.circle(x,y-12*s,19*s,'#4b8f43')+E.circle(x+17*s,y-5*s,15*s,'#3d793b');
 case 'carrot':return sh+E.ellipse(x,y,30*s,16*s,cooked?'#de772a':'#ee8a35',rot,'#ba5f22',1.5)+gloss(x-7*s,y-5*s,8*s,2*s);
 case 'spinach':return E.path(`M${x},${y+24*s} C${x-34*s},${y+10*s} ${x-30*s},${y-24*s} ${x},${y-27*s} C${x+32*s},${y-22*s} ${x+32*s},${y+8*s} ${x},${y+24*s}Z`,'#3f7d43','#2e6335',1.3)+E.path(`M${x},${y+20*s} L${x},${y-16*s}`,'none','#9fc18d',1.5);
 case 'onion':return E.path(`M${x},${y-25*s} C${x-25*s},${y-9*s} ${x-22*s},${y+26*s} ${x},${y+28*s} C${x+24*s},${y+26*s} ${x+26*s},${y-9*s} ${x},${y-25*s}Z`,cooked?'#a97189':'#c593ad','#87586e',1.3);
 case 'chickpea':return sh+E.circle(x,y,13*s,cooked?'#c8944c':'#d8a55e','#9c6e38',1)+gloss(x-4*s,y-5*s,4*s,2*s);
 case 'whitebean':return sh+E.ellipse(x,y,22*s,14*s,'#eadcc5',rot,'#c3ae90',1.2)+E.path(`M${x-6*s},${y} Q${x},${y+6*s} ${x+7*s},${y}`,'none','#b09b80',1.5);
 case 'lentil':return E.ellipse(x,y,9*s,5*s,cooked?'#9f6738':'#b77a43',rot,'#7c4d29',.8);
 case 'tofu':return sh+E.rect(x-23*s,y-20*s,46*s,40*s,7*s,cooked?'#d8af70':'#efd5a5',rot,'#b38248',1.5)+E.path(`M${x-16*s},${y+10*s} L${x+16*s},${y-8*s}`,'none','#b17a3e',2);
 case 'feta':return sh+E.rect(x-21*s,y-19*s,42*s,38*s,6*s,'#f4ead6',rot,'#cec2ac',1.2)+E.circle(x-7*s,y-3*s,2*s,'#c9bea9')+E.circle(x+8*s,y+5*s,2*s,'#c9bea9');
 case 'chicken':return sh+E.path(`M${x-28*s},${y-4*s} Q${x-16*s},${y-27*s} ${x+8*s},${y-21*s} Q${x+31*s},${y-13*s} ${x+24*s},${y+14*s} Q${x+4*s},${y+30*s} ${x-23*s},${y+17*s}Z`,'#c9874e','#9a6034',1.6)+E.path(`M${x-18*s},${y-3*s} L${x+15*s},${y+8*s}`,'none','#8d552e',2.5);
 case 'beef':return sh+E.rect(x-28*s,y-20*s,56*s,40*s,12*s,'#985840',rot,'#6f3b2b',1.5)+E.path(`M${x-18*s},${y-6*s} L${x+17*s},${y+7*s}`,'none','#6d3928',2.5);
 case 'mince':return Array.from({length:7},(_,i)=>E.circle(x+((i%4)-1.5)*9*s,y+(Math.floor(i/4)-.4)*10*s,7*s,'#8f5038','#673426',.8)).join('');
 case 'egg':return E.path(`M${x-29*s},${y} C${x-24*s},${y-24*s} ${x-4*s},${y-21*s} ${x+8*s},${y-27*s} C${x+25*s},${y-24*s} ${x+31*s},${y-7*s} ${x+25*s},${y+10*s} C${x+13*s},${y+25*s} ${x-14*s},${y+23*s} ${x-29*s},${y}Z`,'#e8b941','#c99226',1.2);
 case 'banana':return E.circle(x,y,25*s,'#e7d27d','#c2aa52',1.2)+E.circle(x,y,8*s,'#f6edbb');
 case 'apple':return E.path(`M${x},${y-23*s} C${x-25*s},${y-29*s} ${x-29*s},${y+13*s} ${x},${y+27*s} C${x+30*s},${y+13*s} ${x+24*s},${y-29*s} ${x},${y-23*s}Z`,'#cf5340','#a83f31',1.3);
 case 'pear':return E.path(`M${x},${y-29*s} C${x-13*s},${y-10*s} ${x-29*s},${y+2*s} ${x-25*s},${y+21*s} C${x-17*s},${y+38*s} ${x+18*s},${y+38*s} ${x+25*s},${y+20*s} C${x+29*s},${y+1*s} ${x+13*s},${y-10*s} ${x},${y-29*s}Z`,'#c8ba56','#a0943f',1.3);
 case 'mango':return E.rect(x-26*s,y-22*s,52*s,44*s,9*s,'#e8a035',rot,'#bd7a20',1.3);
 case 'berry':return E.circle(x,y,14*s,'#46528e','#2f3769',1)+gloss(x-4*s,y-5*s,4*s,2*s);
 case 'bread':return E.path(`M${x-33*s},${y+24*s} L${x-33*s},${y-6*s} Q${x-20*s},${y-33*s} ${x},${y-33*s} Q${x+21*s},${y-33*s} ${x+33*s},${y-6*s} L${x+33*s},${y+24*s}Z`,'#b47f49','#83582f',1.5);
 default:return E.circle(x,y,16*s,'#a98a5f','#7e6748',1)} }

function base(mode,key){const r=rng('base:'+key);if(mode==='porridge')return `<ellipse cx="512" cy="520" rx="306" ry="228" fill="url(#porridge)"/>`+Array.from({length:55},(_,i)=>{const a=r()*Math.PI*2,d=Math.sqrt(r())*260;return E.ellipse(512+Math.cos(a)*d,520+Math.sin(a)*d*.72,10,4,'#c7aa74',r()*180)}).join('');
 if(mode==='stew')return `<ellipse cx="512" cy="525" rx="315" ry="238" fill="url(#stew)"/><ellipse cx="512" cy="505" rx="270" ry="160" fill="#fff" opacity=".055" filter="url(#blur)"/>`;
 if(mode==='omelette'||mode==='frittata')return `<ellipse cx="512" cy="530" rx="300" ry="220" fill="url(#eggbase)" stroke="#c8952a" stroke-width="4"/>`;
 if(mode==='scramble')return Array.from({length:26},(_,i)=>{const a=r()*Math.PI*2,d=Math.sqrt(r())*245;return item('egg',512+Math.cos(a)*d,525+Math.sin(a)*d*.7,.6,r()*180)}).join('');
 if(mode==='pasta')return `<g stroke="url(#pasta)" stroke-width="19" fill="none" stroke-linecap="round" opacity=".98">${Array.from({length:16},(_,i)=>{const y=400+i*18;return `<path d="M270 ${y} C370 ${330+i*15},650 ${500-i*9},755 ${385+i*18}"/>`}).join('')}</g>`;
 if(mode==='rice'||mode==='couscous')return Array.from({length:150},(_,i)=>{const a=r()*Math.PI*2,d=Math.sqrt(r())*275,x=512+Math.cos(a)*d,y=525+Math.sin(a)*d*.72;return E.ellipse(x,y,mode==='rice'?9:5,mode==='rice'?4:4,mode==='rice'?'#e6d3a7':'#d9bb77',r()*180,'#c6aa72',.5)}).join('');
 if(mode==='bread')return item('bread',512,530,5,0);
 return `<ellipse cx="512" cy="530" rx="300" ry="220" fill="#e7ddc9" opacity=".9"/>`;}

function countFor(type){return ({lentil:34,chickpea:22,whitebean:18,rice:0,couscous:0,oats:0,spinach:10,mince:8,egg:9,tomato:8,potato:8,pepper:7,carrot:7,broccoli:7,tofu:7,feta:7,chicken:7,beef:7,banana:7,apple:7,pear:7,mango:7,berry:14}[type]||6)}
function layerIngredients(r,m){const rr=rng('items:'+r.id),classified=(r.ingredients||[]).map(i=>({name:i.name,type:classify(i.name)})).filter(x=>!['seasoning','milk','yogurt','quark','oats','rice','couscous','pasta'].includes(x.type));let out='';
 for(const c of classified){let n=countFor(c.type);if(m==='stew')n=Math.max(4,Math.round(n*.68));if(m==='frittata'||m==='omelette')n=Math.max(3,Math.round(n*.55));if(m==='scramble'&&c.type==='egg')continue;for(let i=0;i<n;i++){const a=rr()*Math.PI*2,d=Math.sqrt(rr())*(m==='stew'?235:255),x=512+Math.cos(a)*d,y=520+Math.sin(a)*d*.68,s=(.55+rr()*.28)*(c.type==='lentil'?.65:1),rot=rr()*180-90;out+=`<g opacity="${m==='stew'?.88:.98}">${item(c.type,x,y,s,rot,true)}</g>`}}
 return out;}

function dairy(r){const names=(r.ingredients||[]).map(i=>norm(i.name));if(names.some(n=>n.includes('joghurt')||n.includes('quark')))return `<ellipse cx="512" cy="525" rx="180" ry="125" fill="#f4f0e6" opacity=".9"/><ellipse cx="475" cy="495" rx="80" ry="35" fill="#fff" opacity=".25"/>`;return ''}
function svg(r){const m=mode(r),title=esc(r.name),food=base(m,r.id)+dairy(r)+layerIngredients(r,m);return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>
 <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter><filter id="blur"><feGaussianBlur stdDeviation="5"/></filter>
 <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#e8e0d3"/></linearGradient><radialGradient id="stew"><stop offset="0" stop-color="#b95835"/><stop offset=".7" stop-color="#9e452e"/><stop offset="1" stop-color="#783222"/></radialGradient><radialGradient id="porridge"><stop offset="0" stop-color="#ead8b1"/><stop offset="1" stop-color="#c9ab75"/></radialGradient><radialGradient id="eggbase"><stop offset="0" stop-color="#f3cf63"/><stop offset="1" stop-color="#dda93d"/></radialGradient><linearGradient id="pasta" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d5a346"/><stop offset=".5" stop-color="#e6be68"/><stop offset="1" stop-color="#b77b2e"/></linearGradient>
 </defs><rect width="1024" height="1024" fill="#eee7dc"/><circle cx="170" cy="150" r="110" fill="#f7f0e4"/><circle cx="880" cy="880" r="145" fill="#e6ded0"/>
 <ellipse cx="512" cy="572" rx="356" ry="276" fill="#7f6a55" opacity=".20" filter="url(#shadow)"/><ellipse cx="512" cy="532" rx="350" ry="270" fill="url(#plate)" stroke="#c8bcaa" stroke-width="10"/><ellipse cx="512" cy="532" rx="318" ry="238" fill="#f7f2e8" stroke="#ddd3c4" stroke-width="3"/><g clip-path="url(#clip)">${food}</g>
 <text x="512" y="884" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="700" fill="#2f302c">${title}</text><text x="512" y="922" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="14" letter-spacing="7" fill="#8f887d">RESERVE</text></svg>`}

let manifest=[];try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));if(!Array.isArray(manifest))manifest=[]}catch{}
const missing=[];for(const r of recipes.values()){try{await fs.access(path.join(prodDir,`${r.id}.png`));continue}catch{}try{await fs.access(path.join(reviewDir,`${r.id}.png`));continue}catch{}missing.push(r)}
const fresh=[];for(const r of missing.slice(0,max)){const m=mode(r);const out=path.join(reviewDir,`${r.id}.png`);await sharp(Buffer.from(svg(r))).png({compressionLevel:9,quality:92}).toFile(out);fresh.push({id:r.id,name:r.name,status:'pending_review',style:'reserve-deterministic-cooked-v2',dishMode:m,requiredIngredients:(r.ingredients||[]).map(i=>i.name),checks:{deterministicIngredients:true,noInventedIngredients:true,cookedPresentation:true},generatedAt:new Date().toISOString()});console.log(`✓ ${r.id} (${m})`)}
if(fresh.length){const ids=new Set(fresh.map(x=>x.id));manifest=[...manifest.filter(x=>!ids.has(x.id)),...fresh];await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n')}
console.log(`RESERVE cooked composer v2: ${fresh.length} Kandidaten erzeugt.`);
