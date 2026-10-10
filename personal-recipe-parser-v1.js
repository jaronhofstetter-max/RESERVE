/* Recipe text parsing: preserve uncertain input; never invent quantities or nutrition. */
(function(){'use strict';
const clean=s=>String(s||'').trim(),number=s=>{s=clean(s).replace(',','.');const f=s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);if(f)return Number(f[1]||0)+Number(f[2])/Number(f[3]);return Number(s)};
function ingredient(line){const raw=clean(line).replace(/^[•*–-]\s*/,''),expanded=raw.replace(/(\d)([¼½¾])/g,'$1 $2').replace(/[¼½¾]/g,c=>({'¼':'1/4','½':'1/2','¾':'3/4'}[c]));const m=expanded.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(kg|mg|g|ml|dl|cl|l|stück|stueck|stuck|stk\.?|EL|TL|Prisen?|Packung(?:en)?|Dose(?:n)?|Becher)?\s+(.+)$/i);if(!m)return{raw,name:raw,amount:null,unit:'',uncertain:true};let amount=number(m[1]),unit=(m[2]||'Stück').toLowerCase(),name=clean(m[3]);if(unit==='kg'){amount*=1000;unit='g'}if(unit==='mg'){amount/=1000;unit='g'}if(['l','dl','cl'].includes(unit)){amount*=({l:1000,dl:100,cl:10}[unit]);unit='ml'}if(/^st/.test(unit))unit='Stück';const uncertain=!Number.isFinite(amount)||amount<=0||!['g','ml','Stück'].includes(unit)||/^[-–]\s*\d/.test(name);return{raw,name,amount:Number.isFinite(amount)?amount:null,unit,uncertain}}
function parseText(text){
 const lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean);
 let mode='',name='',portions='',prepMinutes=null,cookMinutes=null,pending='',stepIndex=-1;
 const ingredients=[],steps=[],ignored=[],unresolved=[];
 const quantity=/^(?:\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[¼½¾])\s*(?:kg|mg|g|ml|dl|cl|l|stück|stueck|stk\.?|EL|TL|Prisen?|Bund)?$/i;
 const measured=/^(?:\d|[¼½¾])/;
 const noise=/^(?:\d{1,2}:\d{2}(?:\s|$)|https?:\/\/|www\.|kikkoman[’'®©\s]*$|zutaten kopieren|zum starten antippen|schritt.für.schritt.kochen|leicht gemacht|starten antippen)/i;
 function flush(){if(pending){ingredients.push(pending);unresolved.push({type:'unpaired-quantity',raw:pending});pending='';}}
 for(const line of lines){
  if(noise.test(line)){ignored.push(line);continue;}
  const p=line.replace(/portion\(en\)/ig,'Portionen').match(/(?:für|for)\s*(\d+)\s*(?:personen|portionen|people|servings)|(?:portionen|servings)\s*:?\s*(\d+)|(\d+)\s*(?:portionen|servings)\b/i);
  if(p){portions=p[1]||p[2]||p[3];if(/^(zutaten|ingredients)/i.test(line))mode='ingredients';continue;}
  const time=line.match(/^(?:(\d+)\s*(?:min\.?|minutes)\s*)?(vorbereitung(?:szeit)?|prep(?:aration)?(?: time)?|kochzeit|garzeit|cook(?:ing)? time)\s*:?\s*(?:(\d+)\s*(?:min\.?|minutes))?/i);
  if(time&&(time[1]||time[3])){if(/vorbereitung|prep/i.test(time[2]))prepMinutes=Number(time[1]||time[3]);else cookMinutes=Number(time[1]||time[3]);continue;}
  if(/^(zutaten|ingredients)(?:\s|:|$)/i.test(line)){flush();mode='ingredients';continue;}
  if(/^(zubereitung|anleitung|zubereitungsschritte|instructions|preparation|method)(?:\s|:|$)/i.test(line)){flush();mode='steps';stepIndex=-1;continue;}
  if(/^(nährwerte|nährwertangaben|nutrition|tipps?|quelle)(?:\s|:|$)/i.test(line)){flush();mode='other';continue;}
  if(/^schritt\s+\d+\s*[:.)]?$/i.test(line)){flush();mode='steps';stepIndex=steps.length;steps.push('');continue;}
  if(mode==='ingredients'){
   if(/^(?:für (?:die|den|das) .+|zusätzlich)\s*:\s*$/i.test(line)){flush();ignored.push(line);continue;}
   if(quantity.test(line)){flush();pending=line;continue;}
   if(pending){ingredients.push(pending+' '+line);pending='';continue;}
   // Only explicit continuations are joined; ambiguous lines stay visible for review.
   if(ingredients.length&&/^(?:\(|oder\b|mit\b|und\b|supp(en)?basis\b|geschmack\b)/i.test(line)&&!measured.test(line))ingredients[ingredients.length-1]+=' '+line;
   else ingredients.push(line);
   continue;
  }
  if(mode==='steps'){
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
function validRecord(r){return r&&/^personal-[a-z0-9-]+$/.test(r.id)&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=200&&Number.isFinite(r.portions)&&r.portions>0&&r.portions<=100&&Array.isArray(r.ingredientLines)&&r.ingredientLines.length>0&&r.ingredientLines.length<=100&&r.ingredientLines.every(s=>typeof s==='string'&&s.length>0&&s.length<=500)&&Array.isArray(r.steps)&&r.steps.length>0&&r.steps.length<=100&&r.steps.every(s=>typeof s==='string'&&s.length>0&&s.length<=3000)&&['Alles','Vegetarisch','Vegan'].includes(r.diet)&&[r.prepMinutes,r.cookMinutes].every(n=>n===null||Number.isFinite(n)&&n>=0&&n<=1440)&&(!r.source||typeof r.source==='string'&&r.source.length<=2000)}
function toRecipe(r,image=''){const parsed=r.ingredientLines.map(ingredient),pantryReady=parsed.every(x=>!x.uncertain);return{id:r.id,name:r.name,personal:true,pantryReady,detailLoaded:true,description:'',type:'Hauptmahlzeit',diet:r.diet,dish:'🍽️',cuisine:'Eigenes Rezept',difficulty:'',status:'approved',mealTimes:['Mittagessen','Abendessen'],prepMinutes:r.prepMinutes||0,cookMinutes:r.cookMinutes||0,ingredients:parsed.map(x=>({name:x.name,amount:x.amount/r.portions,unit:x.unit})),steps:r.steps.slice(),nutrition:{},allergens:[],image}}
window.RESERVE_RECIPE_PARSER={ingredient,parseText,validRecord,toRecipe};
window.RESERVE_REKEK={version:"0.1.0",kind:"local-ocr-and-rules",parseText};
})();
