/* Recipe text parsing: preserve uncertain input; never invent quantities or nutrition. */
(function(){'use strict';
const clean=s=>String(s||'').trim(),number=s=>{s=clean(s).replace(',','.');const f=s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);if(f)return Number(f[1]||0)+Number(f[2])/Number(f[3]);return Number(s)};
// Explicit serving ranges use the smaller endpoint; ingredient ranges stay unresolved.
function servingRange(text){const m=String(text||'').replace(/portion\(en\)/ig,'Portionen').match(/(?:\b(\d+)\s*(?:[-–—]|bis|to)\s*(\d+)\s*(?:personen|portionen|people|servings)\b|(?:portionen|servings)\s*:?\s*(\d+)\s*(?:[-–—]|bis|to)\s*(\d+)\b)/i);if(!m)return null;const a=Number(m[1]||m[3]),b=Number(m[2]||m[4]);return a>=1&&a<=100&&b>=1&&b<=100?String(Math.min(a,b)):'';}
function recipeUIBoundary(text){return /^(?:[»▶▷>\s]*)(?:[b3]ild\s+\d+\b|lesarten\s+der\s+texter|rezeptname\s*$|portionen\s+im\s+originalrezept|mengen,\s*portionen\s+und\s+schritte|rezept\s+speichern\s*$)/i.test(clean(text));}
// Find a single inset white text panel using pixels only. Full-width app chrome,
// blank images and competing panels are deliberately excluded.
function findRecipePanel(image){
 const {width:w,height:h,data}=image;if(w<80||h<80||!data||data.length!==w*h*4)return null;
 const white=(x,y)=>{const i=(y*w+x)*4;return data[i]>238&&data[i+1]>238&&data[i+2]>238;};
 const groups=[],stride=Math.max(1,Math.floor(h/500)),tolerance=Math.max(2,w*.012);
 for(let y=0;y<h;y+=stride){let start=-1;
  for(let x=0;x<=w;x++){
   if(x<w&&white(x,y)){if(start<0)start=x;continue;}
   if(start>=0){const width=x-start;
    if(width>w*.45&&width<w*.94&&start>w*.025&&x<w*.975){
     let group=groups.find(g=>Math.abs(g.x0-start)<tolerance&&Math.abs(g.x1-x)<tolerance&&y-g.last<h*.1);
     if(!group){group={x0:start,x1:x,top:y,last:y,hits:0};groups.push(group);}
     group.last=y;group.hits++;
    }start=-1;
   }
  }
 }
 const candidates=groups.filter(g=>g.last-g.top>h*.2&&g.hits*stride/(g.last-g.top)>.2).map(g=>({...g,area:(g.x1-g.x0)*(g.last-g.top)})).sort((a,b)=>b.area-a.area);
 if(!candidates.length)return null;const g=candidates[0];
 if(candidates.some(c=>c!==g&&c.area>g.area*.65&&(c.last<g.top||c.top>g.last)))return null;
 // Text occupies only a small part of a white card. Require white interiors
 // and a contrasting surround so a margin of a plain page is not a panel.
 let inside=0,whiteInside=0,outside=0,whiteOutside=0;
 const margin=Math.max(3,Math.round(w*.015));
 for(let y=g.top;y<=g.last;y+=stride*2){for(let x=g.x0;x<g.x1;x+=Math.max(1,Math.floor(w/200))){inside++;if(white(x,y))whiteInside++;}for(const x of [g.x0-margin,g.x1+margin])if(x>=0&&x<w){outside++;if(white(x,y))whiteOutside++;}}
 if(whiteInside/inside<.8||!outside||whiteOutside/outside>.5)return null;
 return{x0:g.x0,y0:g.top,x1:g.x1,y1:g.last+1};
}
function ingredient(line){
 const raw=clean(line).replace(/^[•*–-]\s*/,''),glyphs={'¼':'1/4','½':'1/2','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'},expanded=raw.replace(/^=\s*(?=[0-9¼½¾⅛⅜⅝⅞])/,'').replace(/(\d)([¼½¾⅛⅜⅝⅞])/g,'$1 $2').replace(/[¼½¾⅛⅜⅝⅞]/g,c=>glyphs[c]);
 const atom='(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?)';
 if(new RegExp('^'+atom+'\\s*(?:bis|[-–—])\\s*'+atom,'i').test(expanded)||/^\d+\s+halb(?:er|en|e|es)?\b/i.test(expanded))return{raw,name:raw,amount:null,unit:'',uncertain:true};
 const m=expanded.match(new RegExp('^('+atom+')(?=\\s|[a-zäöüß]|$)','i'));if(!m)return{raw,name:raw,amount:null,unit:'',uncertain:true};
 let amount=number(m[1]),tail=clean(expanded.slice(m[0].length)),unit='',name=tail;
 if(!tail||/^[\d/.,]/.test(tail))return{raw,name:raw,amount:null,unit:'',uncertain:true};
 const units={kg:'kg',mg:'mg',g:'g',gr:'g',gramm:'g',ml:'ml',dl:'dl',cl:'cl',l:'l',liter:'l',liters:'l',stück:'Stück',stueck:'Stück',stuck:'Stück',stk:'Stück',st:'Stück',stck:'Stück',stange:'Stange',stangen:'Stange',glas:'Glas',gläser:'Glas',el:'el',tl:'tl',esslöffel:'el',teelöffel:'tl',tbsp:'el',tsp:'tl',prise:'prise',prisen:'prisen',packung:'packung',packungen:'packungen',dose:'dose',dosen:'dosen',becher:'becher',paket:'paket',pakete:'pakete',tüte:'tüte',tüten:'tüten',päckchen:'päckchen',bund:'bund',spritzer:'spritzer',pck:'pck',pkg:'pkg',blatt:'blatt',b:'b',p:'p',whole:'whole',leaves:'leaves',cloves:'cloves',clove:'clove',stalks:'stalks',stalk:'stalk',pods:'pods',pod:'pod',piece:'piece',pieces:'pieces',pcs:'pcs',eggs:'eggs',sprigs:'sprigs',sheets:'sheets',slices:'slices'};
 const unitOnly=tail.replace(/\.$/,'').toLowerCase();if(unitOnly!=='eggs'&&Object.prototype.hasOwnProperty.call(units,unitOnly))return{raw,name:raw,amount:null,unit:'',uncertain:true};
 const token=tail.match(/^(?:(?:kleine|kleiner|kleines|große|großer|großes)\s+)?([a-zäöüß]+)\.?\s+/i);if(token&&Object.prototype.hasOwnProperty.call(units,token[1].toLowerCase())){unit=units[token[1].toLowerCase()];name=clean(tail.slice(token[0].length));}
 else if(/^(?:(?:kleine|kleiner|kleines|große|großer|großes|rote|roter|rotes|grüne|grüner|grünes)\s+)?(?:Ei|Eier|Eigelb|Eiweiß|Dotter|Äpfel|Apfel|Zwiebeln?|Gemüsezwiebeln|Möhren?|Karotten?|Tomaten?|Paprikaschoten?|(?:Schweine|Puten|Kalbs|Hähnchen|Rinder)(?:\s*-\s*oder\s*(?:Schweine|Puten|Kalbs|Hähnchen|Rinder))?schnitzel|Schnitzel|Rostbraten|Eiklar|Schalotten?|eggs?|onions?|carrots?|tomatoes?|apples?)(?=\s|$|[.,])/i.test(tail))unit='Stück';
 if(unit==='kg'){amount*=1000;unit='g'}if(unit==='mg'){amount/=1000;unit='g'}if(['l','dl','cl'].includes(unit)){amount*=({l:1000,dl:100,cl:10}[unit]);unit='ml'}
 const uncertain=!Number.isFinite(amount)||amount<=0||!name||!['g','ml','Stück'].includes(unit)||/^[-–]\s*\d/.test(name);
 return{raw,name,amount:Number.isFinite(amount)&&amount>0?amount:null,unit,uncertain};
}
// Section detection preserves source amounts: it classifies text, never completes a recipe.
function ingredientHeading(line){
 const match=clean(line).match(/^(?:(?:für|fuer)\s+(?:den|die|das)\s+)?(teig|boden|belag|füllung|fuellung|creme|guss|glasur|streusel|sauce|soße|sosse|marinade|außerdem|ausserdem|zusätzlich|zusaetzlich)(?:\s*\([^)]*\))?\s*:?$/i);
 return match?clean(line).replace(/:\s*$/,''):'';
}
function preparationLine(line){
 // Inflected ingredient descriptions ("geriebene", "gehackte") are not actions.
 if(/\b(?:zum|zum\s+späteren|für das)\s+(?:Bestreichen|Backen|Braten|Servieren|Füllen)\s*\.?$/i.test(line))return false;
 return /\b(?:rühren|verrühren|unterrühren|einrühren|schlagen|aufschlagen|unterheben|kneten|verkneten|mischen|vermischen|vermengen|verarbeiten|schneiden|würfeln|erhitzen|kochen|köcheln|garen|braten|anbraten|dünsten|backen|vorheizen|zugeben|hinzufügen|bestreichen|streichen|verteilen|gießen|füllen|ausrollen|formen|schmelzen|auflösen|sieben|abkühlen|servieren|ziehen lassen|ruhen lassen|gehen lassen|trennen|ausdrücken|geben|wälzen|walzen|einfüllen|abgießen|bestreuen|auflegen)\b/i.test(line);
}
function recipeTextLines(text){
 return String(text||'').split(/\r?\n/).map(clean).map(line=>line.replace(/^[^a-zäöüß0-9]+(?=(?:zutaten|ingredients|zubereitung|anleitung)\b)/i,'')).map(line=>line.replace(/^[\s_•*|–—-]+(?=(?:zutaten|ingredients|zubereitung|anleitung|instructions|preparation|method)\b)/i,'')).flatMap(line=>{
  const inline=line.match(/^((?:zutaten|ingredients|zubereitung|anleitung|instructions|preparation|method)(?:\s*\([^)]*\))?|(?:(?:für|fuer)\s+(?:den|die|das)\s+)?(?:teig|boden|belag|füllung|fuellung|creme|guss|glasur|streusel|sauce|soße|sosse|marinade))\s*:\s*(.+)$/i);
  return inline?[inline[1]+':',inline[2]]:[line];
 });
}
function recipeTitle(lines){
 const start=lines.findIndex(l=>/^(?:zutaten|ingredients)(?:\s+(?:für|for|boden|teig|belag|füllung)\b[^:]*)?\s*:?$/i.test(l));
 if(start<0)return '';
 for(let i=0;i<start;i++){const l=lines[i];if(!l)continue;
  if(/(?:portion|personen|servings|vorbereitung|backzeit|kochzeit|garzeit|ballaststoffe|kcal|nährwert|folgen|instagram|anmelden)/i.test(l)||/^(?:für\b|von\b|fotos?\b|[„"“]|\d|[¼½¾⅛⅜⅝⅞])|https?:|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(l))continue;
  const letters=(l.match(/[a-zäöüß]/gi)||[]).length;
  if(l.length<=160&&letters>=3&&letters/l.length>=.72&&!preparationLine(l)){
   const next=lines.slice(i+1,start).find(Boolean)||'';
   return /\b(?:in|mit|und|auf|aus|an)\s*$/i.test(l)?l+' '+next:l;
  }
 }
 return '';
}
function quantityAction(line){
 const m=line.match(/^(?:\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[¼½¾⅛⅜⅝⅞])\s*(?:kg|mg|g|gr|ml|dl|cl|l|EL|TL|Becher|Tüten?|Pakete?|Päckchen|Pck\.?)\b\s*.+/i);
 if(!m||!preparationLine(line)||/\s\d+[.)]\s+[a-zäöüß]/i.test(line))return null;
 const verb=line.search(/\b(?:verrühren|unterrühren|einrühren|schlagen|unterheben|kneten|mischen|vermischen|vermengen|schneiden|würfeln|erhitzen|kochen|garen|braten|dünsten|backen|zugeben|hinzufügen|gießen|auflösen|geben)\b/i);
 if(verb<0)return null;
 const before=clean(line.slice(0,verb)).replace(/\s+(?:darin|damit|dazu|zusammen|miteinander)\s*$/i,'');
 const item=before.replace(/\s+(?:auf|in|über|zu)\s+(?:das|den|die|der)\s+.+$/i,'');
 return item&&ingredient(item).amount>0?item:null;
}
function parseText(text){
 const lines=recipeTextLines(text);
 let mode='',name=recipeTitle(lines),portions='',prepMinutes=null,cookMinutes=null,pending='',stepIndex=-1,summary=false;
 const ingredients=[],steps=[],ignored=[],unresolved=[],ingredientSections=[];let section=null;
 function addIngredient(line){if(/^(?:\d|[¼½¾⅛⅜⅝⅞])/.test(line)&&ingredient(line).amount>0&&!ingredient(line).unit&&!unresolved.some(x=>x.type==='unclassified-quantity-line'&&x.raw===line))unresolved.push({type:'unclassified-quantity-line',raw:line});ingredients.push(line);if(!section){section={name:'',lines:[]};ingredientSections.push(section);}section.lines.push(line);}
 const quantity=/^(?:\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[¼½¾⅛⅜⅝⅞])\s*(?:kg|mg|g|ml|dl|cl|l|stück|stueck|stk\.?|EL|TL|Prisen?|Bund)?$/i;
 const measured=/^(?:=\s*)?(?:\d|[¼½¾⅛⅜⅝⅞])/;
 const noise=/^(?:\d{1,2}:\d{2}(?:\s|$)|https?:\/\/|www\.|kikkoman[’'®©\s]*$|zutaten kopieren|zum starten antippen|schritt.für.schritt.kochen|leicht gemacht|starten antippen|(?:[xv»<>&©\s]+)?instagram\b|reddit\s*$|anmelden\s*$|app öffnen\s*$|aufrufen\s*$|teilen\s*$|speichern\s*$|gefällt\s+\d|alle\s+\d+\s+kommentare|link zum video\b)/i;
 function flush(){if(pending){addIngredient(pending);unresolved.push({type:'unpaired-quantity',raw:pending});pending='';}}
 for(const [lineNumber,line] of lines.entries()){
  if(!line){summary=false;continue;}
  if(recipeUIBoundary(line)){flush();mode='other';ignored.push(line);continue;}
  if(/^(?:erfasst von\s*:|stammt von\b|hauptautor\b|edit\s*:)/i.test(line)){ignored.push(line);continue;}
  if(mode==='steps'&&/^(?:Gefällt\s+\d|[a-z0-9_.]+\s*#|\.\.\.\s*mehr)/i.test(line)){flush();mode='other';ignored.push(line);continue;}
  if(/^[©®™&\s]+(?:Qv)?$/.test(line)){ignored.push(line);continue;}
  if(noise.test(line)||/^KIKKOMAN[^a-z]*$/u.test(line)||/^[x×=+<>|\s-]+$/i.test(line)||/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(line)){ignored.push(line);continue;}
  if(/^\d+(?:[.,]\d+)?\s*(?:g|mg|kcal|kj)\s*(?:ballaststoffe|eiweiß|protein|fett|kohlenhydrate)?\s*(?:p\.?\s*p\.?|pro\s+portion)\s*$/i.test(line)){ignored.push(line);continue;}
  const range=servingRange(line);if(range!==null){portions=range;if(!range)unresolved.push({type:'portion-range',raw:line});if(/^(zutaten|ingredients)/i.test(line))mode='ingredients';continue;}
  const inlineTimes=[...line.matchAll(/(\d+)\s*Min\.?\s*(Vorbereitung(?:szeit)?|Backzeit|Kochzeit|Garzeit)\b/gi)];
  if(inlineTimes.length&&/^[^a-zäöüß0-9]*\d+\s*Min\.?\s*(?:Vorbereitung|Backzeit|Kochzeit|Garzeit)/i.test(line)){for(const t of inlineTimes){if(/^Vorbereitung/i.test(t[2]))prepMinutes=Number(t[1]);else cookMinutes=Number(t[1]);}continue;}
  const p=line.replace(/portion\(en\)/ig,'Portionen').match(/(?:für|for)\s*(\d+)\s*(?:personen|portionen|people|servings)|(?:portionen|servings)\s*:?\s*(\d+)|(\d+)\s*(?:personen|portionen|servings)\b/i);
  if(p){portions=p[1]||p[2]||p[3];if(/^(zutaten|ingredients)/i.test(line))mode='ingredients';continue;}
  if(/^(?:\d+\s*Min\.?\s*){2}$/i.test(line)){ignored.push(line);continue;}
  const timingLabels=line.match(/^(vorbereitung(?:szeit)?)\s+(kochzeit|garzeit)$/i);
  if(timingLabels){const prev=lines.slice(0,lineNumber).filter(Boolean).at(-1)||'';const times=[...prev.matchAll(/(\d+)\s*Min\.?/gi)];if(times.length===2){prepMinutes=Number(times[0][1]);cookMinutes=Number(times[1][1]);continue;}}
  const time=line.match(/^(?:(\d+)\s*(?:min\.?|minutes)\s*)?(vorbereitung(?:szeit)?|prep(?:aration)?(?: time)?|kochzeit|garzeit|cook(?:ing)? time)\s*:?\s*(?:(\d+)\s*(?:min\.?|minutes))?/i);
  if(time&&(time[1]||time[3])){if(/vorbereitung|prep/i.test(time[2]))prepMinutes=Number(time[1]||time[3]);else cookMinutes=Number(time[1]||time[3]);continue;}
  if(/^(zutaten|ingredients)(?:\s+(?:für|for|boden|teig|belag|füllung)\b[^:]*)?\s*:?$/i.test(line)){flush();mode='ingredients';continue;}
  if(/^(zubereitung|anleitung|zubereitungsschritte|instructions|preparation|method)(?:\s|:|$)/i.test(line)){flush();mode='steps';stepIndex=-1;continue;}
  if(/^(nährwerte|nährwertangaben|nutrition|tipps?|quelle)(?:\s|:|$)/i.test(line)){flush();mode='other';continue;}
  if(/^schritt\s+\d+\s*[:.)]?$/i.test(line)){flush();mode='steps';stepIndex=steps.length;steps.push('');continue;}
  const sectionLabel=ingredientHeading(line)||(/^für (?:die|den|das) .+:$/i.test(line)?line.replace(/:$/,''):'');
  const heading=(name||mode||/:$/.test(line))?sectionLabel:'';
  if(heading){
   flush();const next=lines.slice(lineNumber+1).find(Boolean)||'';
   if(preparationLine(next)){mode='steps';stepIndex=-1;continue;}
   mode='ingredients';section={name:heading,lines:[]};ingredientSections.push(section);continue;
  }
  if(mode==='steps'&&measured.test(line)&&!/\s[–—]\s/.test(line)&&!preparationLine(line)&&ingredient(line).amount>0&&ingredient(line).unit){if(!ingredients.includes(line))addIngredient(line);continue;}
  const actionIngredient=quantityAction(line);
  if(actionIngredient&&(mode==='ingredients'||mode==='steps'||ingredients.length)){flush();if(!ingredients.includes(actionIngredient))addIngredient(actionIngredient);steps.push(line);unresolved.push({type:'ingredient-with-instruction',raw:line});continue;}
  // Unlabelled lists may end with an ordinary instruction sentence.
  // Mixed columns remain unresolved; reading order cannot be guessed from text.
  if(mode==='ingredients'&&preparationLine(line)&&!(/\s\d+[.)]\s+[a-zäöüß]/i.test(line))){flush();mode='steps';stepIndex=-1;}
  if(mode==='ingredients'){
   if(/\s\d+[.)]\s+[a-zäöüß]/i.test(line)){unresolved.push({type:'mixed-columns',raw:line});}
   if(/^(?:für (?:die|den|das) .+|zusätzlich)\s*:\s*$/i.test(line)){flush();ignored.push(line);continue;}
   const normalizedQuantity=line.replace(/^=\s*(?=[0-9¼½¾⅛⅜⅝⅞])/,'').replace(/(\d)([¼½¾⅛⅜⅝⅞])/g,'$1 $2').replace(/[¼½¾⅛⅜⅝⅞]/g,c=>({'¼':'1/4','½':'1/2','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'}[c]));
   if(quantity.test(normalizedQuantity)){flush();pending=line;continue;}
   if(pending&&!/[a-zäöüß]/i.test(pending)&&/^(?:kg|mg|g|gr|ml|dl|cl|l|EL|TL)$/i.test(line)){pending+=' '+line;continue;}
   if(pending){addIngredient(pending+' '+line);pending='';continue;}
   // Only explicit continuations are joined; ambiguous lines stay visible for review.
   if(section?.lines.length&&(/(?:\(|\bmit|\boder|\bund)\s*$/i.test(ingredients.at(-1))||/\([^)]*$/.test(ingredients.at(-1))||/^(?:\(|oder\b|mit\b|und\b|supp(en)?basis\b|geschmack\b|zum\s+Bestreichen\b|zum\s+Braten\b)/i.test(line))&&!measured.test(line)){
    ingredients[ingredients.length-1]+=' '+line;if(section?.lines.length)section.lines[section.lines.length-1]+=' '+line;
   }else addIngredient(line);
   continue;
  }
  if(mode==='steps'){
   const following=lines.slice(lineNumber),end=following.findIndex(x=>!x),paragraph=following.slice(0,end<0?following.length:end).join(' ');
   if(/^(?:\d+(?:[.,]\d+)?|[¼½¾⅛⅜⅝⅞])\s*(?:g|kg|ml|l|EL|TL)\b/i.test(line)&&/\s[–—]\s*(?:\d|[¼½¾⅛⅜⅝⅞])/.test(paragraph)&&!/\b(?:kochen|garen|braten|zugeben|hinzufügen|schneiden|mischen|rühren|sieben|unterheben|einrühren|vermengen|erhitzen)\b/i.test(paragraph)&&end>=0){summary=true;ignored.push(line);continue;}
   if(summary){ignored.push(line);continue;}
   const numbered=line.match(/^\d+[.)]\s*(.+)$/);
   if(numbered){stepIndex=steps.length;steps.push(numbered[1]);}
   else if(stepIndex>=0)steps[stepIndex]+=(steps[stepIndex]?' ':'')+line;
   else if(steps.length&&!/[.!?:]$/.test(steps.at(-1)))steps[steps.length-1]+=' '+line;
   else steps.push(line);
   continue;
  }
  if(!mode&&preparationLine(line)&&ingredients.length){mode='steps';steps.push(line);continue;}
  if(!mode&&ingredients.length&&/^(?:Salz|Pfeffer|Zimt|Zitronenschale|Petersilie|Muskat)(?:\b|[,\s])/i.test(line)){addIngredient(line);continue;}
  if(!mode&&measured.test(line)){
   const parsedLine=ingredient(line);
   if(!parsedLine.uncertain||(parsedLine.amount>0&&parsedLine.unit)){addIngredient(line);mode='ingredients';continue;}
   unresolved.push({type:'unclassified-quantity-line',raw:line});
   if(name&&!/^\d+(?:[.,]\d+)?\s*(?:°|Grad|Min\.?|Minuten|Stunden)\b/i.test(line)){addIngredient(line);mode='ingredients';continue;}
  }
  if(!mode&&!name)name=line;
  else if(!mode&&/\b(?:in|mit|und|auf|aus|an)\s*$/i.test(name)&&/^[a-zäöüß]/i.test(line)&&!/[.!?:]$/.test(line))name+=' '+line;
 }
 flush();
 return{name,portions,prepMinutes,cookMinutes,ingredients:ingredients.join('\n'),ingredientSections:ingredientSections.filter(s=>s.lines.length),steps:steps.filter(Boolean).join('\n'),ignored,unresolved};
}
// Conservative browser stage: split only when literal headings or quantity rows support boundaries.
function parseCandidates(text){
 const rows=recipeTextLines(text),starts=[];
 for(let i=0;i<rows.length;i++){
  if(!/^(?:zutaten|ingredients)\s*:?(?:\s+für\b.*)?$/i.test(rows[i].trim()))continue;
  let j=i-1;while(j>=0&&!rows[j].trim())j--;
  // Skip only literal serving metadata; never use a preparation sentence as a title.
  if(j>=0&&/^(?:für\s+)?\d+\s+(?:personen|portionen|servings)\s*$/i.test(rows[j].trim())){j--;while(j>=0&&!rows[j].trim())j--;}
  const title=rows[j]?.trim()||'';
  if(!title||title.length>200||/^[\d¼½¾⅛⅜⅝⅞]|[.!?:]$/.test(title)||/^(?:für |zubereitung|anleitung|schritt|sauce|füllung|belag|teig)\b/i.test(title))continue;
  starts.push(j);
 }
 // Printed collections often omit "Zutaten" entirely. Require a short title
 // immediately followed by at least two quantity rows, never a subsection.
 for(let i=0;i<rows.length;i++){
  const title=rows[i].trim();
  if(!title||title.length>160||/^[\d¼½¾⅛⅜⅝⅞]|[.!?:]$/.test(title)||ingredientHeading(title)||preparationLine(title)||/[0-9¼½¾⅛⅜⅝⅞]/.test(title)||/^(?:Salz|Pfeffer|Basilikum|Zimt|Muskat|Vanille|von|Fotos?)\b/i.test(title)||/^(?:für\b|zutaten\b|zubereitung\b|nährwert|vorbereitung|kochzeit)/i.test(title))continue;
  const following=rows.slice(i+1).filter(Boolean).slice(0,2);
  if(following.length===2&&following.every(l=>/^(?:\d|[¼½¾⅛⅜⅝⅞])/.test(l)&&!preparationLine(l)))starts.push(i);
 }
 starts.sort((a,b)=>a-b);for(let i=starts.length-1;i>0;i--)if(starts[i]===starts[i-1])starts.splice(i,1);
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
// Literal section headings provide a layout boundary even on pale cards without a visible rule.
function textRecipeDivider(reads,width,height){
 const words=reads.flatMap(d=>d?.words||ocrLines(d).flatMap(l=>l.words));
 const label=w=>clean(w.text).replace(/[^a-zäöüß]/gi,'').toLowerCase();
 const left=words.filter(w=>w.bbox&&/^(zutaten|ingredients)$/.test(label(w)));
 const right=words.filter(w=>w.bbox&&/^(zubereitung|anleitung|instructions|preparation)$/.test(label(w)));
 for(const a of left)for(const b of right){
  const ah=a.bbox.y1-a.bbox.y0,bh=b.bbox.y1-b.bbox.y0;
  if(b.bbox.x0<=a.bbox.x1||Math.abs(a.bbox.y0-b.bbox.y0)>Math.max(ah,bh)*2)continue;
  // Preparation headings may be indented relative to the numbered steps.
  // Keep the crop margin before those markers so cropping cannot erase them.
  const markers=words.filter(w=>w.bbox&&/^\d{1,2}[.,)]$/.test(clean(w.text))&&w.bbox.y0>b.bbox.y1&&w.bbox.x0>=b.bbox.x0-width*.12&&w.bbox.x0<=b.bbox.x0+width*.04);
  const centerX=markers.length>=2?Math.min(...markers.map(w=>w.bbox.x0))-width*.025:b.bbox.x0-width*.06;
  if(centerX<width*.25||centerX>width*.75)continue;
  const boundaries=reads.flatMap(ocrLines).filter(l=>l.bbox.y0>b.bbox.y1&&recipeUIBoundary(l.text));
  const bottom=boundaries.length?Math.min(...boundaries.map(l=>l.bbox.y0))-4:height;
  return{centerX,top:Math.max(0,Math.min(a.bbox.y0,b.bbox.y0)-Math.max(ah,bh)*.4),bottom,slope:0,referenceY:height/2,source:'literal-section-headings'};
 }
 return null;
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
 const candidates=passes.map(rows=>rows.filter(r=>r.bbox.y0>after&&(/[0-9¼½¾⅛⅜⅝⅞]/.test(r.text)||/[a-zäöüß]{3}/i.test(r.text))));
 const height=median(candidates.flatMap(rows=>rows.map(r=>r.bbox.y1-r.bbox.y0)));if(!height)return[];
 const rows=[];for(const [mode,ls] of candidates.entries())for(const line of ls){const cy=(line.bbox.y0+line.bbox.y1)/2,match=rows.find(r=>Math.abs(r.cy-cy)<height*.5&&!r.modes.includes(mode));if(match){match.lines.push(line);match.modes.push(mode);}else rows.push({cy,lines:[line],modes:[mode]});}
 rows.sort((a,b)=>a.cy-b.cy);if(rows.length<5||rows.length>40||rows.filter(r=>r.lines.some(l=>/^\W*\d/.test(l.text))).length<5)return[];
 return rows.map((r,i)=>{const measures=[];for(const line of r.lines){const ws=line.words||[];for(let j=0;j+1<ws.length;j++)if(/^(?:\d+(?:[.,]\d+)?|\d*[¼½¾⅛⅜⅝⅞]|\d+\/\d+|[%‰])$/.test(clean(ws[j].text))&&/^(?:kg|g|ml|dl|cl|l|EL|TL|Spritzer|[a-z0-9])$/i.test(clean(ws[j+1].text))&&ws[j].bbox&&ws[j+1].bbox){const a=ws[j].bbox,b=ws[j+1].bbox;measures.push({x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)});break;}}
  const measureBBox=measures.length?{x0:Math.min(...measures.map(b=>b.x0)),y0:Math.min(...measures.map(b=>b.y0)),x1:Math.max(...measures.map(b=>b.x1)),y1:Math.max(...measures.map(b=>b.y1))}:null;
  return{source:r.lines.map(l=>l.text),measureBBox,bbox:{x0:Math.min(...r.lines.map(l=>l.bbox.x0)),x1:Math.max(...r.lines.map(l=>l.bbox.x1)),y0:Math.max(Math.min(...r.lines.map(l=>l.bbox.y0))-3,i?(rows[i-1].cy+r.cy)/2:0),y1:Math.min(Math.max(...r.lines.map(l=>l.bbox.y1))+3,i+1<rows.length?(r.cy+rows[i+1].cy)/2:Infinity)}};});
}
function cleanIngredientReading(text){return clean(text).replace(/^(?:[•·*+–«»©‚-]\s*|[.,]\s+)/, '').replace(/\s+/g,' ');}
function reviewIngredientReadings(reads,source=[]){
 // Punctuation bullets are removable; letters and digits are never repaired.
 const normalized=reads.map(cleanIngredientReading);
 const agreed=normalized.length===2&&normalized[0]&&normalized[0]===normalized[1];
 const text=agreed?normalized[0]:(normalized.find(s=>s)||source.find(s=>s)||'Unlesbare Zutatenzeile');
 const collapsedFraction=/^(?:optional\s*:\s*)?(?:\d{2}|[%‰])\s*(?:EL|TL)\b/i.test(text.replace(/^=\s*(?=[0-9¼½¾⅛⅜⅝⅞%‰])/,''));
 const parsedQuantity=ingredient(text);
 const quantityClear=!!agreed&&!collapsedFraction&&parsedQuantity.amount>0&&['g','ml','Stück','el','tl','spritzer','Stange','Glas'].includes(parsedQuantity.unit)&&!/^\d+(?:[.,]\d+)?\s+(?![gl]\s)[a-z]\s+/i.test(text);
 const noQuantity=!!agreed&&!/[\d¼½¾⅛⅜⅝⅞%‰]/.test(text);
 return{reads:reads.slice(),source:source.slice(),agreement:!!agreed,quantityClear,noQuantity,reviewRequired:true,quantityInferred:false,expression:quantityClear||noQuantity?text:'Menge ungeklärt: '+text};
}
function reviewMeasuredReadings(row,reads){
 const measureText=s=>cleanIngredientReading(s).replace(/(\d)([¼½¾⅛⅜⅝⅞])/g,'$1 $2').replace(/[¼½¾⅛⅜⅝⅞]/g,c=>({'¼':'1/4','½':'1/2','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'}[c]));
 const measures=reads.map(s=>measureText(s).match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*(kg|g|ml|dl|cl|l|EL|TL|Spritzer)$/i));
 const source=cleanIngredientReading(row.reads.find(Boolean)||'');
 const suffix=source.match(/^(?:optional\s*:\s*)?[^a-zäöüß]+\s*(?:kg|g|ml|dl|cl|l|EL|TL|Spritzer)\s+(.+)$/i)||source.match(/^\d+(?:[.,]\d+)?\s+\S+\s+(.+)$/);
 const seen=row.reads.map(s=>cleanIngredientReading(s).match(/^(\d+(?:[.,]\d+)?)/)?.[1]);
 const ambiguousSpoons=measures.some(m=>m&&/^(el|tl)$/i.test(m[2])&&/^\d{2}$/.test(m[1]));
 const literalFraction=measures.length===2&&measures.every(m=>m&&/\//.test(m[1])&&number(m[1].split('/').at(-1))>0)&&row.reads.every(s=>/^(?:optional\s*:\s*)?(?:\d{2}|[%‰])\s*(?:EL|TL)\b/i.test(cleanIngredientReading(s)));
 const accepted=!ambiguousSpoons&&measures.length===2&&measures.every(Boolean)&&number(measures[0][1])>0&&number(measures[0][1])===number(measures[1][1])&&measures[0][2].toLowerCase()===measures[1][2].toLowerCase()&&(literalFraction||seen.length===2&&seen.every(s=>s&&number(s)===number(measures[0][1])))&&suffix;
 return{...row,measureReads:reads.slice(),measureReread:!!accepted,quantityClear:accepted?true:row.quantityClear,expression:accepted?(/^optional\s*:/i.test(source)?'Optional: ':'')+measures[0][1]+' '+measures[0][2]+' '+suffix[1]:row.expression};
}
function cardHeaderRegions(reads,divider,width,height,front){
 const rows=ocrLines(reads[0]),titles=rows.filter(l=>l.bbox.y1<divider.top&&l.bbox.x1-l.bbox.x0>width*.25&&l.bbox.y1-l.bbox.y0>height*.015&&/[a-zäöüß]{3}/i.test(l.text)&&!/\b(?:personen|portionen|servings)\b/i.test(l.text));
 let title=titles.sort((a,b)=>(b.bbox.y1-b.bbox.y0)-(a.bbox.y1-a.bbox.y0))[0];
 const headerWords=(reads[0]?.words||rows.flatMap(l=>l.words)).filter(w=>w.bbox&&w.bbox.y1<divider.top&&w.bbox.x0>front-width*.08&&w.bbox.y1-w.bbox.y0>height*.018&&/[a-zäöüß]{3}/i.test(w.text));
 const tolerance=median(headerWords.map(w=>w.bbox.y1-w.bbox.y0))*.55,groups=[];
 for(const word of headerWords){const cy=(word.bbox.y0+word.bbox.y1)/2,group=groups.find(g=>Math.abs(g.cy-cy)<tolerance);if(group)group.words.push(word);else groups.push({cy,words:[word]});}
 const wordTitles=groups.map(g=>{const heights=g.words.map(w=>w.bbox.y1-w.bbox.y0),y0=Math.min(...g.words.map(w=>w.bbox.y0));return{height:median(heights),bbox:{x0:Math.min(...g.words.map(w=>w.bbox.x0)),y0,x1:Math.max(...g.words.map(w=>w.bbox.x1)),y1:Math.min(Math.max(...g.words.map(w=>w.bbox.y1)),y0+Math.min(...heights)*1.15)}};}).filter(g=>g.bbox.x1-g.bbox.x0>width*.25).sort((a,b)=>b.height-a.height);
 if(wordTitles.length)title=wordTitles[0];
 // Include neighbouring title lines of comparable font size, not just the largest line.
 if(title){const anchor=title.bbox,h=anchor.y1-anchor.y0;const adjacent=titles.filter(l=>l.bbox.y1-l.bbox.y0>=h*.65&&l.bbox.y0<=anchor.y1+h*1.5&&l.bbox.y1>=anchor.y0-h*1.5&&!/\b(?:kühlschrank|gefrierfach|zutaten|zubereitung)\b/i.test(l.text));if(adjacent.length)title={bbox:{x0:Math.min(anchor.x0,...adjacent.map(l=>l.bbox.x0)),y0:Math.min(anchor.y0,...adjacent.map(l=>l.bbox.y0)),x1:Math.max(anchor.x1,...adjacent.map(l=>l.bbox.x1)),y1:Math.max(anchor.y1,...adjacent.map(l=>l.bbox.y1))}};}
 let servings=null,expectedPortions='';for(const l of reads.flatMap(ocrLines)){if(l.bbox.y1>divider.top)continue;const ws=l.words||[];for(let i=0;i<ws.length;i++){for(let count=3;count<=7&&i+count<=ws.length;count++){const words=ws.slice(i,i+count),text=words.map(w=>clean(w.text)).join(' ');if(!/^(?:für|for)\s+(?:ca\.?\s+)?\d+(?:\s*(?:[-–—]|bis|to)\s*\d+)?\s+(?:personen|portionen|people|servings)$/i.test(text)||!words.every(w=>w.bbox))continue;const value=servingRange(text)??text.match(/\d+/)?.[0];if(!value)continue;const boxes=words.map(w=>w.bbox);servings={x0:Math.min(...boxes.map(b=>b.x0)),y0:Math.min(...boxes.map(b=>b.y0)),x1:Math.max(...boxes.map(b=>b.x1)),y1:Math.max(...boxes.map(b=>b.y1))};expectedPortions=value;break;}if(servings)break;}if(servings)break;}
 const pad=(b,wide=false)=>b?{x0:Math.max(0,wide?Math.max(front,b.x0-width*.15):b.x0-8),y0:Math.max(0,b.y0-8),x1:Math.min(width,b.x1+width*.025),y1:Math.min(divider.top,b.y1+8)}:null;
 return{title:pad(title?.bbox,true),servings:pad(servings),expectedPortions};
}
function reviewCardMetadata(titleReads,servingReads,expectedPortions=''){
 const titles=titleReads.map(s=>clean(s).replace(/\s*[♡♥❤©|]+\s*$/u,'').replace(/([^0-9\s])\s+¢\s*$/u,'$1').replace(/\s+/g,' '));
 const name=titles.length===2&&titles[0]===titles[1]&&titles[0].length<=200&&titles[0].split(' ').length>=2&&!/^\d/.test(titles[0])?titles[0]:'';
 const values=servingReads.map(s=>{const range=servingRange(s);if(range!==null)return range;const literal=String(s).match(/(?:für|for)\s*(\d+)\s*(?:personen|portionen|people|servings)\b/i)?.[1];if(literal)return literal;const value=String(s).match(/^(?:für|for)\s*(\d+)\s+/i)?.[1];return expectedPortions&&value===expectedPortions?value:'';});
 const portions=values.length===2&&values[0]&&values[0]===values[1]&&Number(values[0])>=1&&Number(values[0])<=100?values[0]:'';
 return{name,portions,reviewRequired:true};
}
function parseCardSteps(text){
 const rows=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),steps=[];let expected=1,conflict=false;
 // Missing punctuation is accepted only at the next sequential marker in the
 // already isolated preparation column. Measurement lines remain prose.
 for(const row of rows){if(recipeUIBoundary(row))break;if(/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(row)||/^(?:zubereitung|anleitung|instructions)\s*:?(?:\s*)$/i.test(row))continue;const m=row.match(/^(\d{1,2})([.,)]|\s)\s*(.+)$/),unit=m&&/^(?:g|kg|ml|dl|cl|l|EL|TL|Min\.?|Minuten|Stück)\b/i.test(m[3]);
  if(m&&!unit&&Number(m[1])===expected&&/^[a-zäöüß]/i.test(m[3])){steps.push(m[3]);expected++;}
  else if(steps.length){if(m&&!unit)conflict=true;steps[steps.length-1]+=' '+row;}
 }
 return{steps:steps.join('\n'),count:steps.length,sequenceComplete:steps.length>=3&&!conflict,reviewRequired:true};
}
function validRecord(r){return r&&/^personal-[a-z0-9-]+$/.test(r.id)&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=200&&Number.isFinite(r.portions)&&r.portions>0&&r.portions<=100&&Array.isArray(r.ingredientLines)&&r.ingredientLines.length>0&&r.ingredientLines.length<=100&&r.ingredientLines.every(s=>typeof s==='string'&&s.length>0&&s.length<=500)&&Array.isArray(r.steps)&&r.steps.length>0&&r.steps.length<=100&&r.steps.every(s=>typeof s==='string'&&s.length>0&&s.length<=3000)&&['Alles','Vegetarisch','Vegan'].includes(r.diet)&&[r.prepMinutes,r.cookMinutes].every(n=>n===null||Number.isFinite(n)&&n>=0&&n<=1440)&&(!r.source||typeof r.source==='string'&&r.source.length<=2000)}
function toRecipe(r,image=''){const parsed=r.ingredientLines.map(ingredient),pantryReady=parsed.every(x=>!x.uncertain);return{id:r.id,name:r.name,personal:true,pantryReady,detailLoaded:true,description:'',type:'Hauptmahlzeit',diet:r.diet,dish:'🍽️',cuisine:'Eigenes Rezept',difficulty:'',status:'approved',mealTimes:['Mittagessen','Abendessen'],prepMinutes:r.prepMinutes||0,cookMinutes:r.cookMinutes||0,ingredients:parsed.map(x=>({name:x.name,amount:x.amount===null?null:x.amount/r.portions,unit:x.unit})),steps:r.steps.slice(),nutrition:{},allergens:[],image}}
window.RESERVE_RECIPE_PARSER={ingredient,parseText,validRecord,toRecipe};
window.RESERVE_REKEK={version:"0.6.6",kind:"local-ocr-and-rules",parseText,parseCandidates,findRecipePanel,findRecipeDivider,textRecipeDivider,agreedRecipeColumns,ocrLines,quantityColumnStart,ingredientRowBoxes,reviewIngredientReadings,reviewMeasuredReadings,cardHeaderRegions,reviewCardMetadata,parseCardSteps};
})();



