import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const out=path.resolve(process.argv[2]||'training/expiry/synthetic');
const count=Math.max(1,Number(process.argv[3]||2000));
const seed=Number(process.argv[4]||20260920)>>>0;
let state=seed||1;
const rnd=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const pick=a=>a[Math.floor(rnd()*a.length)];
const W=512,H=256;
const font={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],
 '3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
 '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],
 '9':['111','101','111','001','111'],'.':['0','0','0','0','1'],'/':['001','001','010','100','100'],'-':['0','0','111','0','0'],
 ' ':['0','0','0','0','0'],'M':['10001','11011','10101','10001','10001'],'H':['101','101','111','101','101'],
 'D':['110','101','101','101','110'],'B':['110','101','110','101','110'],'E':['111','100','110','100','111'],
 'X':['101','101','010','101','101'],'P':['110','101','110','100','100']
};
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0};
const chunk=(type,data)=>{const t=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length,0);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),8+data.length);return b};
function png(pixels){const raw=Buffer.alloc((W+1)*H);for(let y=0;y<H;y++){raw[y*(W+1)]=0;pixels.copy(raw,y*(W+1)+1,y*W,(y+1)*W)}const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))])}
function dateFor(i){const y=2026+(i%9),m=1+Math.floor(rnd()*12),d=1+Math.floor(rnd()*28);return{iso:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,y,m,d}}
function display(x){const yy=String(x.y).slice(-2),dd=String(x.d).padStart(2,'0'),mm=String(x.m).padStart(2,'0');return pick([`${dd}.${mm}.${x.y}`,`${dd}/${mm}/${yy}`,`${x.y}-${mm}-${dd}`,`${mm}.${x.y}`,`${mm}/${yy}`])}
function draw(text,mode){const p=Buffer.alloc(W*H),base=mode==='dark'?35:220,ink=mode==='dark'?210:35;for(let i=0;i<p.length;i++){const x=i%W,curve=Math.abs(x-W/2)/W,glare=mode==='glare'&&x>330&&x<410?45:0;p[i]=Math.max(0,Math.min(255,base+Math.floor((rnd()-.5)*24)+Math.floor(curve*20)+glare))}const scale=pick([5,6,7,8]),dot=rnd()<.55,gap=dot?1:0;let width=0;for(const c of text)width+=(font[c]?.[0].length||3)*scale+scale;let ox=Math.max(12,Math.floor((W-width)/2)+Math.floor((rnd()-.5)*50)),oy=70+Math.floor((rnd()-.5)*38);for(const c of text){const g=font[c]||font[' '];for(let gy=0;gy<g.length;gy++)for(let gx=0;gx<g[gy].length;gx++)if(g[gy][gx]==='1')for(let py=gap;py<scale-gap;py++)for(let px=gap;px<scale-gap;px++){const xx=ox+gx*scale+px+Math.floor((gy-2)*(rnd()-.5)*.8),yy=oy+gy*scale+py;if(xx>=0&&xx<W&&yy>=0&&yy<H)p[yy*W+xx]=ink+Math.floor((rnd()-.5)*24)}ox+=(g[0].length+1)*scale}return p}
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'images'),{recursive:true});
const rows=[],modes=['paper','plastic','metal','dark','glare'];
for(let i=0;i<count;i++){const date=dateFor(i),shown=display(date),prefix=pick(['MHD ','BBE ','EXP ','']),mode=pick(modes),text=prefix+shown,file=`synthetic-${String(i+1).padStart(6,'0')}.png`;fs.writeFileSync(path.join(out,'images',file),png(draw(text,mode)));rows.push({image:`images/${file}`,date:date.iso,text,synthetic:true,split:'train',surface:mode,seed,index:i})}
fs.writeFileSync(path.join(out,'synthetic-train.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({generated:rows.length,seed,split:'train-only',realValidationImages:0},null,2)+'\n');
console.log(`Synthetic expiry dataset: ${rows.length} train-only images in ${out}`);
