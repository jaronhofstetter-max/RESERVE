/* Review-only quantity decisions. Crops and model variants never create extra votes. */
(function(root){'use strict';
const units=[['kg',/^kg\b/i],['g',/^(?:g|gramm)\b/i],['ml',/^ml\b/i],['l',/^(?:l|liter)\b/i],['TL',/^(?:tl|teelöffel)\b/i],['EL',/^(?:el|esslöffel|eßlöffel)\b/i],['Päckchen',/^(?:pck\.?|p\.|päckchen|päck\.?|päckchen)\s*/i],['Becher',/^becher\b/i],['Dose',/^dosen?\b/i],['Beutel',/^beutel\b/i],['Ei',/^ei(?:er)?\b/i],['Knoblauchzehe',/^knoblauchzehen?\b/i],['Stück',/^(?:stück|stk\.?)\b/i]];
const value='(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?)';
function normalize(text){return String(text||'').replace(/(\d)½/g,'$1 1/2').replace(/(\d)¼/g,'$1 1/4').replace(/(\d)¾/g,'$1 3/4').replace(/½/g,'1/2').replace(/¼/g,'1/4').replace(/¾/g,'3/4').normalize('NFKC').replace(/⁄/g,'/').trim();}
function number(text){if(/^\d+\.\d{3}$/.test(text))return null;const parts=text.split(/\s+/);let n=0;for(const p of parts){if(p.includes('/')){const[a,b]=p.split('/').map(Number);if(!b)return null;n+=a/b;}else n+=Number(p.replace(',','.'));}return Number.isFinite(n)&&n>0&&n<=1000000?n:null;}
function parse(text){const t=normalize(text).replace(/^(\d+)\.\s+(?=[A-Za-zÄÖÜäöüß])/,'$1 '),m=t.match(new RegExp('^('+value+')(?![\\d.,/])\\s*(.*)$'));if(!m)return null;const n=number(m[1]);if(n===null)return null;const tail=m[2].replace(/^\.\s+/,'');for(const[unit,re]of units){const u=tail.match(re);if(u)return{number:n,unit,tail:tail.slice(u[0].length).trim(),source:t};}return null;}
function family(reader){return reader.startsWith('tesseract')?'tesseract':reader.startsWith('ctc')?'ctc-htr':reader.startsWith('trocr')?'trocr':null;}
function decide(readings){const votes=new Map(),numbers=new Map();for(const r of readings){const f=family(r.reader);if(!f)continue;const q=parse(r.text),lead=normalize(r.text).match(new RegExp('^('+value+')(?=\\s|[A-Za-zÄÖÜäöüß]|$)')),n=q?.number??(lead&&!/(?:\d{2,}9|\d+[.,]9)\s+\p{L}/u.test(normalize(r.text))?number(lead[1]):null);if(n!==null){if(!numbers.has(n))numbers.set(n,new Set());numbers.get(n).add(f);}if(q){const key=JSON.stringify([q.number,q.unit]);if(!votes.has(key))votes.set(key,{...q,families:new Set()});votes.get(key).families.add(f);}}
 const ranked=[...votes.values()].map(q=>({...q,families:[...q.families],support:q.families.size})).sort((a,b)=>b.support-a.support),top=ranked.filter(q=>q.support>=2&&q.support===ranked[0]?.support);let suggestion=top.length===1?top[0]:ranked.length===1?ranked[0]:null,confidence=suggestion?(suggestion.support>=2?'multiple-families':'single-family'):null;
 if(!suggestion&&ranked.length){const best=Math.max(...ranked.map(q=>numbers.get(q.number)?.size||0)),choices=ranked.filter(q=>numbers.get(q.number)?.size===best);if(best>=2&&choices.length===1){suggestion=choices[0];confidence='unit-requires-review';}}
 if(suggestion){const own=numbers.get(suggestion.number)?.size||0,other=Math.max(0,...[...numbers].filter(([n])=>n!==suggestion.number).map(([,f])=>f.size));if(other>=2&&other>own){suggestion=null;confidence='number-conflict';}}
 let numberHint=null;if(!suggestion&&numbers.size){const best=Math.max(...[...numbers.values()].map(f=>f.size)),choices=[...numbers].filter(([,f])=>f.size===best);if(best>=2&&choices.length===1)numberHint={number:choices[0][0],unit:null};}
 return{suggestion,numberHint,confidence,conflict:ranked.length>1,ranked,readings,verified:false,autoCorrections:0};
}
function ctc(logits,steps,classes,alphabet){let text='',previous=0;for(let t=0;t<steps;t++){let best=0;for(let i=1;i<classes;i++)if(logits[t*classes+i]>logits[t*classes+best])best=i;if(best&&best!==previous)text+=alphabet[best-1]||'';previous=best;}return text;}

// Geometry is derived from pixels, never from a recipe name or expected quantity.
function lineRegions(source,width,height,ink){const rows=[];
 const median=values=>{const a=values.toSorted((a,b)=>a-b),i=Math.floor(a.length/2);return a.length?(a.length%2?a[i]:(a[i-1]+a[i])/2):1;};
 const box=(words,pad=6)=>({x0:Math.min(...words.map(w=>w.bbox.x0))-pad,y0:Math.min(...words.map(w=>w.bbox.y0))-pad,x1:Math.max(...words.map(w=>w.bbox.x1))+pad,y1:Math.max(...words.map(w=>w.bbox.y1))+pad});
 for(const row of source){const words=(row.words||[]).filter(w=>w.bbox&&w.text?.trim()&&w.bbox.x1-w.bbox.x0>=Math.max(3,(w.bbox.y1-w.bbox.y0)*.12)&&(!ink||ink.coverage(w.bbox)>Math.max(10,(w.bbox.x1-w.bbox.x0)*(w.bbox.y1-w.bbox.y0)*.025))).sort((a,b)=>a.bbox.x0-b.bbox.x0);if(!words.length)continue;const h=median(words.map(w=>w.bbox.y1-w.bbox.y0));if(ink)expandPrefix(words,ink,width,height,h);let chunk=[];for(const w of words){if(chunk.length&&w.bbox.x0-chunk.at(-1).bbox.x1>Math.max(width*.07,h*1.5)){rows.push({words:chunk,bbox:box(chunk)});chunk=[];}chunk.push(w);}if(chunk.length)rows.push({words:chunk,bbox:box(chunk)});}
 const right=rows.filter(r=>r.bbox.x0>width*.45&&r.bbox.x0<width*.8&&r.bbox.x1-r.bbox.x0>width*.15).sort((a,b)=>a.bbox.x0-b.bbox.x0),clusters=[];
 for(const row of right){if(!clusters.length||row.bbox.x0-median(clusters.at(-1).map(r=>r.bbox.x0))>width*.06)clusters.push([]);clusters.at(-1).push(row);}
 const boundaries=clusters.filter(c=>c.length>=3&&Math.max(...c.map(r=>r.bbox.y0))-Math.min(...c.map(r=>r.bbox.y0))>height*.15).map(c=>({x:median(c.map(r=>r.bbox.x0)),y0:Math.min(...c.map(r=>r.bbox.y0)),y1:Math.max(...c.map(r=>r.bbox.y1))}));
 return rows.flatMap(r=>{const boundary=boundaries.find(b=>r.bbox.y0>=b.y0&&r.bbox.y0<=b.y1&&/^\s*\d/.test(r.words[0].text)),i=boundary?r.words.findIndex((w,i)=>i&&w.bbox.x0>=boundary.x&&r.words[i-1].bbox.x1<boundary.x):-1;return i>0?[r.words.slice(0,i),r.words.slice(i)].map(words=>({words,bbox:box(words)})):[r];}).sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0);
}
function expandPrefix(words,ink,width,height,h){
 const first=words[0],b=first.bbox,fh=b.y1-b.y0,fw=b.x1-b.x0;if(fw>=h*.5)return;
 const x0=Math.max(0,Math.floor(b.x0-h)),x1=Math.min(width,Math.ceil(b.x1+h)),y0=Math.max(0,Math.floor(b.y0-fh*.5)),y1=Math.min(height,Math.ceil(b.y1+fh*.5)),w=x1-x0,hh=y1-y0,seen=new Uint8Array(w*hh),queue=new Int32Array(w*hh);let bounds={...b};
 for(let y=Math.max(y0,Math.floor(b.y0));y<Math.min(y1,Math.ceil(b.y1));y++)for(let x=Math.max(x0,Math.floor(b.x0));x<Math.min(x1,Math.ceil(b.x1));x++){
  const seed=(y-y0)*w+x-x0;if(seen[seed]||!ink.mask[y*width+x])continue;let head=0,tail=1,minx=x,maxx=x,miny=y,maxy=y;queue[0]=seed;seen[seed]=1;
  while(head<tail){const p=queue[head++],px=p%w,py=(p-px)/w;minx=Math.min(minx,px+x0);maxx=Math.max(maxx,px+x0);miny=Math.min(miny,py+y0);maxy=Math.max(maxy,py+y0);for(const n of [px?p-1:-1,px<w-1?p+1:-1,p-w,p+w])if(n>=0&&n<w*hh&&!seen[n]){const nx=n%w,ny=(n-nx)/w;if(ink.mask[(ny+y0)*width+nx+x0]){seen[n]=1;queue[tail++]=n;}}}
  if(maxy-miny+1<fh*1.8&&maxx-minx+1<fw+h&&Math.abs((miny+maxy+1-b.y0-b.y1)/2)<fh*.5){bounds={x0:Math.min(bounds.x0,minx),y0:Math.min(bounds.y0,miny),x1:Math.max(bounds.x1,maxx+1),y1:Math.max(bounds.y1,maxy+1)};}
 }
 words[0]={...first,bbox:bounds};
}
function inkMap(rgba,width,height){
 const size=width*height,gray=new Uint8Array(size),blue=new Uint8Array(size);let blueDark=0,dark=0;
 for(let i=0;i<size;i++){const k=i*4,r=rgba[k],g=rgba[k+1],b=rgba[k+2],v=Math.round(.299*r+.587*g+.114*b);gray[i]=v;blue[i]=b-r>8&&b-g>5&&v<205?1:0;const x=i%width,y=(i-x)/width;if(x>width*.1&&x<width*.9&&y>height*.05&&y<height*.95&&v<170){dark++;blueDark+=blue[i];}}
 const blueMode=blueDark/Math.max(1,dark)>.2,mask=new Uint8Array(size),stride=width+1,integral=new Float64Array(stride*(height+1));
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){sum+=gray[y*width+x];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;}}
 const radius=blueMode?16:25;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const x0=Math.max(0,x-radius),x1=Math.min(width,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(height,y+radius+1),mean=(integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0])/((x1-x0)*(y1-y0));mask[y*width+x]=gray[y*width+x]<(blueMode?mean-5:mean*.88)?1:0;}
 // Grow blue seeds through adjacent dark strokes; paper, page edges and shadows lack a blue seed.
 if(blueMode){const seen=new Uint8Array(size),queue=new Int32Array(size);let head=0,tail=0;for(let i=0;i<size;i++)if(blue[i]&&mask[i]){seen[i]=1;queue[tail++]=i;}while(head<tail){const i=queue[head++],x=i%width;for(const n of [x?i-1:-1,x<width-1?i+1:-1,i-width,i+width])if(n>=0&&n<size&&mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}}mask.set(seen);}
 const counts=new Uint32Array(stride*(height+1)),columns=new Uint32Array(width);for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){const v=mask[y*width+x];sum+=v;columns[x]+=v;counts[(y+1)*stride+x+1]=counts[y*stride+x+1]+sum;}}
 function coverage(b){const x0=Math.max(0,Math.floor(b.x0)),x1=Math.min(width,Math.ceil(b.x1)),y0=Math.max(0,Math.floor(b.y0)),y1=Math.min(height,Math.ceil(b.y1));if(x1<=x0||y1<=y0)return 0;return counts[y1*stride+x1]-counts[y0*stride+x1]-counts[y1*stride+x0]+counts[y0*stride+x0];}
 let edge=0;if(blueMode){const first=columns.findIndex(n=>n>5);if(first>=0&&first<width*.2)edge=Math.max(0,first-20);}
 return{mask,blueMode,edge,coverage};
}
function reviewText(readings,decision){
 const full=readings.filter(r=>!r.truncated&&r.fullLine!==false),q=decision.suggestion;
 if(q){const matched=full.filter(r=>{const p=parse(r.text);return p&&p.number===q.number&&p.unit===q.unit;}).sort((a,b)=>b.text.length-a.text.length);if(matched.length)return matched[0].text.trim();}
 const primary=full.find(r=>r.reader==='ctc-htr')||full[0],text=primary?.text?.trim()||'';
 // Only a real matching crop reading may supply a review draft's quantity.
 // Never infer g from a 9, and never overwrite the actual recipe field here.
 if(q?.unit==='g'&&readings.some(r=>{const p=!r.truncated&&parse(r.text);return p&&p.number===q.number&&p.unit==='g';})){
  const m=normalize(text).match(/^(\d+(?:[.,]\d+)?)\s+(\p{L}.*)$/u),n=String(q.number);
  if(m&&[n+'9',n+'.9',n+',9'].includes(m[1]))return n+' g '+m[2];
 }
 return text;
}
function trimmedPrefixes(words){
 if(words.length<2)return[];const sorted=words.toSorted((a,b)=>a.bbox.x0-b.bbox.x0),first=sorted[0],rest=sorted.slice(1),median=values=>{const a=values.toSorted((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;},h=median(rest.map(w=>w.bbox.y1-w.bbox.y0));
 if(first.bbox.y1-first.bbox.y0<1.5*h)return[];
 const xs=rest.map(w=>(w.bbox.x0+w.bbox.x1)/2),ys=rest.map(w=>(w.bbox.y0+w.bbox.y1)/2),mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length,den=xs.reduce((v,x)=>v+(x-mx)**2,0),slope=Math.max(-.25,Math.min(.25,den?xs.reduce((v,x,i)=>v+(x-mx)*(ys[i]-my),0)/den:0)),center=median(ys.map((y,i)=>y-slope*xs[i]))+slope*(first.bbox.x0+first.bbox.x1)/2,out=[];
 for(const cap of [.35,.5,.7])for(const n of new Set([1,2,sorted.length])){const group=sorted.slice(0,n),bbox={x0:Math.min(...group.map(w=>w.bbox.x0))-6,y0:Math.min(...group.map(w=>w.bbox.y0))-6,x1:Math.max(...group.map(w=>w.bbox.x1))+6,y1:Math.floor(center+cap*h)+6};if(bbox.y1>bbox.y0)out.push({bbox,label:'-trim-'+cap+'-'+n,fullLine:n===sorted.length});}return out;
}
root.RESERVE_QUANTITY_CORE={normalize,parse,decide,ctc,inkMap,trimmedPrefixes,reviewText,lineRegions};
})(typeof self==='object'?self:globalThis);
