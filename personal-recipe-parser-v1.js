/* Recipe text parsing: preserve uncertain input; never invent quantities or nutrition. */
(function(){'use strict';
const clean=s=>String(s||'').trim(),number=s=>{s=clean(s).replace(',','.');const f=s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);if(f)return Number(f[1]||0)+Number(f[2])/Number(f[3]);return Number(s)};
function ingredient(line){const raw=clean(line).replace(/^[•*–-]\s*/,''),expanded=raw.replace(/(\d)([¼½¾])/g,'$1 $2').replace(/[¼½¾]/g,c=>({'¼':'1/4','½':'1/2','¾':'3/4'}[c]));if(/^\d+(?:[.,]\d+)?\s*(?:bis|[-–—])\s*\d/i.test(expanded)||/^\d+\s+halb(?:er|en|e|es)?\b/i.test(expanded))return{raw,name:raw,amount:null,unit:'',uncertain:true};const m=expanded.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(kg|mg|g|ml|dl|cl|l|stück|stueck|stuck|stk\.?|EL|TL|Prisen?|Packung(?:en)?|Dose(?:n)?|Becher|Bund|Pck\.?|Blatt|Esslöffel|Teelöffel)?\s+(.+)$/i);if(!m)return{raw,name:raw,amount:null,unit:'',uncertain:true};let amount=number(m[1]),unit=(m[2]||'Stück').toLowerCase(),name=clean(m[3]);if(unit==='esslöffel')unit='el';if(unit==='teelöffel')unit='tl';if(unit==='kg'){amount*=1000;unit='g'}if(unit==='mg'){amount/=1000;unit='g'}if(['l','dl','cl'].includes(unit)){amount*=({l:1000,dl:100,cl:10}[unit]);unit='ml'}if(/^st/.test(unit))unit='Stück';const uncertain=!Number.isFinite(amount)||amount<=0||!['g','ml','Stück'].includes(unit)||/^[-–]\s*\d/.test(name);return{raw,name,amount:Number.isFinite(amount)?amount:null,unit,uncertain}}
function parseText(text){
 const lines=String(text||'').split(/\r?\n/).map(clean).map(line=>line.replace(/^[\s_•*|–—-]+(?=(?:zutaten|ingredients|zubereitung|anleitung|instructions|preparation|method)\b)/i,''));
 let mode='',name='',portions='',prepMinutes=null,cookMinutes=null,pending='',stepIndex=-1,summary=false;
 const ingredients=[],steps=[],ignored=[],unresolved=[];
 const quantity=/^(?:\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[¼½¾])\s*(?:kg|mg|g|ml|dl|cl|l|stück|stueck|stk\.?|EL|TL|Prisen?|Bund)?$/i;
 const measured=/^(?:\d|[¼½¾])/;
 const noise=/^(?:\d{1,2}:\d{2}(?:\s|$)|https?:\/\/|www\.|kikkoman[’'®©\s]*$|zutaten kopieren|zum starten antippen|schritt.für.schritt.kochen|leicht gemacht|starten antippen)/i;
 function flush(){if(pending){ingredients.push(pending);unresolved.push({type:'unpaired-quantity',raw:pending});pending='';}}
 for(const [lineNumber,line] of lines.entries()){
  if(!line){summary=false;continue;}
  if(/^(?:erfasst von\s*:|stammt von\b|hauptautor\b|edit\s*:)/i.test(line)){ignored.push(line);continue;}
  if(noise.test(line)||/^KIKKOMAN[^a-z]*$/u.test(line)||/^[x×=+<>|\s-]+$/i.test(line)||/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(line)){ignored.push(line);continue;}
  const p=line.replace(/portion\(en\)/ig,'Portionen').match(/(?:für|for)\s*(\d+)\s*(?:personen|portionen|people|servings)|(?:portionen|servings)\s*:?\s*(\d+)|(\d+)\s*(?:personen|portionen|servings)\b/i);
  if(p){portions=p[1]||p[2]||p[3];if(/^(zutaten|ingredients)/i.test(line))mode='ingredients';continue;}
  if(/^(?:\d+\s*Min\.?\s*){2}$/i.test(line)){ignored.push(line);continue;}
  const timingLabels=line.match(/^(vorbereitung(?:szeit)?)\s+(kochzeit|garzeit)$/i);
  if(timingLabels){const prev=lines.slice(0,lineNumber).filter(Boolean).at(-1)||'';const times=[...prev.matchAll(/(\d+)\s*Min\.?/gi)];if(times.length===2){prepMinutes=Number(times[0][1]);cookMinutes=Number(times[1][1]);continue;}}
  const time=line.match(/^(?:(\d+)\s*(?:min\.?|minutes)\s*)?(vorbereitung(?:szeit)?|prep(?:aration)?(?: time)?|kochzeit|garzeit|cook(?:ing)? time)\s*:?\s*(?:(\d+)\s*(?:min\.?|minutes))?/i);
  if(time&&(time[1]||time[3])){if(/vorbereitung|prep/i.test(time[2]))prepMinutes=Number(time[1]||time[3]);else cookMinutes=Number(time[1]||time[3]);continue;}
  if(/^(zutaten|ingredients)(?:\s|:|$)/i.test(line)){flush();mode='ingredients';continue;}
  if(/^(zubereitung|anleitung|zubereitungsschritte|instructions|preparation|method)(?:\s|:|$)/i.test(line)){flush();mode='steps';stepIndex=-1;continue;}
  if(/^(nährwerte|nährwertangaben|nutrition|tipps?|quelle)(?:\s|:|$)/i.test(line)){flush();mode='other';continue;}
  if(/^schritt\s+\d+\s*[:.)]?$/i.test(line)){flush();mode='steps';stepIndex=steps.length;steps.push('');continue;}
  if(mode==='ingredients'){
   if(/^(?:für (?:die|den|das) .+|zusätzlich)\s*:\s*$/i.test(line)){flush();ignored.push(line);continue;}
   const normalizedQuantity=line.replace(/(\d)([¼½¾])/g,'$1 $2').replace(/[¼½¾]/g,c=>({'¼':'1/4','½':'1/2','¾':'3/4'}[c]));
   if(quantity.test(normalizedQuantity)){flush();pending=line;continue;}
   if(pending){ingredients.push(pending+' '+line);pending='';continue;}
   // Only explicit continuations are joined; ambiguous lines stay visible for review.
   if(ingredients.length&&(/(?:\(|\bmit|\boder|\bund)\s*$/i.test(ingredients.at(-1))||/\([^)]*$/.test(ingredients.at(-1))||/^(?:\(|oder\b|mit\b|und\b|supp(en)?basis\b|geschmack\b)/i.test(line))&&!measured.test(line))ingredients[ingredients.length-1]+=' '+line;
   else ingredients.push(line);
   continue;
  }
  if(mode==='steps'){
   const following=lines.slice(lineNumber),end=following.findIndex(x=>!x),paragraph=following.slice(0,end<0?following.length:end).join(' ');
   if(/^(?:\d+(?:[.,]\d+)?|[¼½¾])\s*(?:g|kg|ml|l|EL|TL)\b/i.test(line)&&/\s[–—]\s*(?:\d|[¼½¾])/.test(paragraph)&&!/\b(?:kochen|garen|braten|zugeben|hinzufügen|schneiden|mischen|rühren|sieben|unterheben|einrühren|vermengen|erhitzen)\b/i.test(paragraph)&&end>=0){summary=true;ignored.push(line);continue;}
   if(summary){ignored.push(line);continue;}
   const numbered=line.match(/^\d+[.)]\s*(.+)$/);
   if(numbered){stepIndex=steps.length;steps.push(numbered[1]);}
   else if(stepIndex>=0)steps[stepIndex]+=(steps[stepIndex]?' ':'')+line;
   else steps.push(line);
   continue;
  }
  if(!mode&&measured.test(line)&&!ingredient(line).uncertain){ingredients.push(line);continue;}
  if(!mode&&!name)name=line;
 }
 flush();
 return{name,portions,prepMinutes,cookMinutes,ingredients:ingredients.join('\n'),steps:steps.filter(Boolean).join('\n'),ignored,unresolved};
}
// Conservative first browser stage: split only repeated, explicitly labelled recipes.
function parseCandidates(text){
 const rows=String(text||'').split(/\r?\n/),starts=[];
 for(let i=0;i<rows.length;i++){
  if(!/^(?:zutaten|ingredients)\s*:?(?:\s+für\b.*)?$/i.test(rows[i].trim()))continue;
  let j=i-1;while(j>=0&&!rows[j].trim())j--;
  // Skip only literal serving metadata; never use a preparation sentence as a title.
  if(j>=0&&/^(?:für\s+)?\d+\s+(?:personen|portionen|servings)\s*$/i.test(rows[j].trim())){j--;while(j>=0&&!rows[j].trim())j--;}
  const title=rows[j]?.trim()||'';
  if(!title||title.length>200||/^[\d¼½¾]|[.!?:]$/.test(title)||/^(?:für |zubereitung|anleitung|schritt|sauce|füllung|belag|teig)\b/i.test(title))continue;
  starts.push(j);
 }
 if(starts.length<2)return{candidates:[parseText(text)],reviewRequired:true,multipleRecipes:false,unassignedText:''};
 const candidates=starts.map((start,index)=>parseText(rows.slice(start,starts[index+1]??rows.length).join('\n')));
 if(candidates.some(r=>!r.ingredients||!r.steps))return{candidates:[],reviewRequired:true,multipleRecipes:true,unassignedText:String(text),issue:'recipe-boundaries-uncertain'};
 return{candidates,reviewRequired:true,multipleRecipes:true,unassignedText:rows.slice(0,starts[0]).join('\n')};
}
// Pixel-derived divider; no recipe names or reference quantities participate.
function findRecipeDivider(image){
 const {width:w,height:h,data}=image;let best=null;
 for(let slope=-.1;slope<=.1001;slope+=.02)for(let cx=Math.floor(w*.25);cx<w*.55;cx+=2){
  let start=-1,last=-1,hits=0;
  const finish=()=>{const span=last-start+1;if(span>=h*.35&&hits/span>=.8&&(!best||hits>best.hits))best={centerX:cx,slope,top:start,bottom:last,hits,density:hits/span,referenceY:h/2};};
  for(let y=0;y<h;y++){
   const x=Math.round(cx+slope*(y-h/2));let hit=false;
   for(let dx=-2;dx<=2;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;const i=(y*w+xx)*4,r=data[i],g=data[i+1],b=data[i+2];if(b-r>-35&&r<200&&r-g<22){hit=true;break;}}
   if(hit){if(start<0)start=y;last=y;hits++;}else if(start>=0&&y-last>Math.max(5,h*.0065)){finish();start=-1;hits=0;}
  }
  if(start>=0)finish();
 }
 return best;
}
function agreedRecipeColumns(leftReads,rightReads){
 const cleanRows=text=>String(text||'').split(/\r?\n/).map(clean).filter(Boolean);
 const left=leftReads.map(cleanRows),right=rightReads.map(cleanRows);
 // Two OCR modes must agree on entire columns; agreement still requires user review.
 if(left.length!==2||right.length!==2||left[0].join('\n')!==left[1].join('\n')||right[0].join('\n')!==right[1].join('\n'))return null;
 const label=left[0].findIndex(line=>/^\W*zutaten\s*:\s*$/i.test(line));
 if(label<0)return null;
 const ingredients=left[0].slice(label+1),steps=right[0];
 if(ingredients.filter(line=>/^\W*\d/.test(line)).length<5||steps.filter(line=>/^\W*\d+[.)]\s+/.test(line)).length<3)return null;
 return {text:left[0].join('\n')+'\nZubereitung:\n'+steps.join('\n'),reviewRequired:true,quantityInferred:false,sourceClassification:'pixel-divider-and-literal-ingredient-label'};
}
function ocrLines(data){
 const rows=data?.lines||data?.blocks?.flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]))||[];
 return rows.filter(r=>r.bbox&&[r.bbox.x0,r.bbox.y0,r.bbox.x1,r.bbox.y1].every(Number.isFinite)).map(r=>({text:clean(r.text),bbox:{...r.bbox},words:r.words||[]}));
}
function median(values){const a=values.slice().sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:0;}
// Repeated quantity positions locate the inner page edge, excluding binding and scenery.
function quantityColumnStart(reads,divider,width){
 const words=reads.flatMap(d=>d?.words||ocrLines(d).flatMap(l=>l.words));
 const numbers=words.filter(w=>w.bbox&&/^\d+[.,]?$/.test(clean(w.text))&&w.bbox.y0>divider.top&&w.bbox.y1<divider.bottom&&w.bbox.x0<divider.centerX-width*.08);
 const clusters=[];for(const word of numbers.sort((a,b)=>a.bbox.x0-b.bbox.x0)){const last=clusters.at(-1);if(last&&word.bbox.x0-last[0].bbox.x0<width*.03)last.push(word);else clusters.push([word]);}
 const dense=clusters.sort((a,b)=>b.length-a.length)[0];if(!dense||dense.length<5)return null;
 return Math.max(0,Math.floor(Math.min(...dense.map(w=>w.bbox.x0))-median(dense.map(w=>w.bbox.y1-w.bbox.y0))*.5));
}
function ingredientRowBoxes(passes){
 const labels=passes.flatMap(rows=>rows.filter(r=>/^\W*Zutaten\s*:\s*$/i.test(r.text)));
 if(!labels.length)return[];const after=Math.max(...labels.map(r=>r.bbox.y1));
 const candidates=passes.map(rows=>rows.filter(r=>r.bbox.y0>after&&(/[0-9¼½¾]/.test(r.text)||/[a-zäöüß]{3}/i.test(r.text))));
 const height=median(candidates.flatMap(rows=>rows.map(r=>r.bbox.y1-r.bbox.y0)));if(!height)return[];
 const rows=[];for(const [mode,ls] of candidates.entries())for(const line of ls){const cy=(line.bbox.y0+line.bbox.y1)/2,match=rows.find(r=>Math.abs(r.cy-cy)<height*.5&&!r.modes.includes(mode));if(match){match.lines.push(line);match.modes.push(mode);}else rows.push({cy,lines:[line],modes:[mode]});}
 rows.sort((a,b)=>a.cy-b.cy);if(rows.length<5||rows.length>40||rows.filter(r=>r.lines.some(l=>/^\W*\d/.test(l.text))).length<5)return[];
 return rows.map((r,i)=>({source:r.lines.map(l=>l.text),bbox:{x0:Math.min(...r.lines.map(l=>l.bbox.x0)),x1:Math.max(...r.lines.map(l=>l.bbox.x1)),y0:Math.max(Math.min(...r.lines.map(l=>l.bbox.y0))-3,i?(rows[i-1].cy+r.cy)/2:0),y1:Math.min(Math.max(...r.lines.map(l=>l.bbox.y1))+3,i+1<rows.length?(r.cy+rows[i+1].cy)/2:Infinity)}}));
}
function reviewIngredientReadings(reads,source=[]){
 // Punctuation bullets are removable; letters and digits are never repaired.
 const normalized=reads.map(s=>clean(s).replace(/^(?:[•·*+–-«»©]\s*|\.\s+)/, '').replace(/\s+/g,' '));
 const agreed=normalized.length===2&&normalized[0]&&normalized[0]===normalized[1];
 const text=agreed?normalized[0]:(normalized.find(s=>s)||source.find(s=>s)||'Unlesbare Zutatenzeile');
 const quantityClear=!!agreed&&ingredient(text).amount!==null&&!/^\d+(?:[.,]\d+)?\s+(?![gl]\s)[a-z]\s+/i.test(text);
 return{reads:reads.slice(),source:source.slice(),agreement:!!agreed,quantityClear,reviewRequired:true,quantityInferred:false,expression:quantityClear?text:'Menge ungeklärt: '+text};
}
function validRecord(r){return r&&/^personal-[a-z0-9-]+$/.test(r.id)&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=200&&Number.isFinite(r.portions)&&r.portions>0&&r.portions<=100&&Array.isArray(r.ingredientLines)&&r.ingredientLines.length>0&&r.ingredientLines.length<=100&&r.ingredientLines.every(s=>typeof s==='string'&&s.length>0&&s.length<=500)&&Array.isArray(r.steps)&&r.steps.length>0&&r.steps.length<=100&&r.steps.every(s=>typeof s==='string'&&s.length>0&&s.length<=3000)&&['Alles','Vegetarisch','Vegan'].includes(r.diet)&&[r.prepMinutes,r.cookMinutes].every(n=>n===null||Number.isFinite(n)&&n>=0&&n<=1440)&&(!r.source||typeof r.source==='string'&&r.source.length<=2000)}
function toRecipe(r,image=''){const parsed=r.ingredientLines.map(ingredient),pantryReady=parsed.every(x=>!x.uncertain);return{id:r.id,name:r.name,personal:true,pantryReady,detailLoaded:true,description:'',type:'Hauptmahlzeit',diet:r.diet,dish:'🍽️',cuisine:'Eigenes Rezept',difficulty:'',status:'approved',mealTimes:['Mittagessen','Abendessen'],prepMinutes:r.prepMinutes||0,cookMinutes:r.cookMinutes||0,ingredients:parsed.map(x=>({name:x.name,amount:x.amount/r.portions,unit:x.unit})),steps:r.steps.slice(),nutrition:{},allergens:[],image}}
window.RESERVE_RECIPE_PARSER={ingredient,parseText,validRecord,toRecipe};
window.RESERVE_REKEK={version:"0.4.0",kind:"local-ocr-and-rules",parseText,parseCandidates,findRecipeDivider,agreedRecipeColumns,ocrLines,quantityColumnStart,ingredientRowBoxes,reviewIngredientReadings};
})();

