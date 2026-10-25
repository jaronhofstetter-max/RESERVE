// Source-preserving page-reader evaluation. No fuzzy food or quantity repairs.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'personal-recipe-parser-v1.js'),'utf8'),context);
const K=context.window.RESERVE_REKEK;
export const normalize=s=>String(s??'').normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();
export function quantity(value){
 if(value===null||value==='')return null;
 const s=K.expandFractions(String(value)).trim().replace(',','.');
 const f=s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
 if(f&&Number(f[3])>0)return Number(f[1]||0)+Number(f[2])/Number(f[3]);
 return /^\d+(?:\.\d+)?$/.test(s)?Number(s):null;
}
function unit(value){const s=normalize(value).replace(/\.$/,'');return ({gramm:'g',gr:'g',liter:'l',stück:'stück',stk:'stück',st:'stück',pck:'päckchen',päck:'päckchen',esslöffel:'el',eßlöffel:'el',teelöffel:'tl'})[s]||s;}
function amount(row){let q=quantity(row.quantity),u=unit(row.unit);if(q!==null&&u==='kg'){q*=1000;u='g';}if(q!==null&&['l','dl','cl'].includes(u)){q*=({l:1000,dl:100,cl:10})[u];u='ml';}return{q,u};}
function sameQuantity(a,b){const qa=quantity(a.quantity),qb=quantity(b.quantity);if(qa===null||qb===null)return normalize(a.quantity)===normalize(b.quantity);const x=amount(a),y=amount(b);return x.u===y.u?Math.abs(x.q-y.q)<1e-9:Math.abs(qa-qb)<1e-9;}
function sameUnit(a,b){const x=amount(a),y=amount(b);return x.u===y.u;}
function portions(value){const s=normalize(value),m=s.match(/^(\d+)\s*(?:[-–—]|bis|to)\s*(\d+)$/);return m&&Number(m[1])>=1&&Number(m[2])>=1&&Number(m[1])<=100&&Number(m[2])<=100?String(Math.min(Number(m[1]),Number(m[2]))):s;}
export function validateRecipes(recipes){
 if(!Array.isArray(recipes)||recipes.length>100)throw Error('recipes must be an array of at most 100 recipes');
 for(const r of recipes){
  if(!r||!['string','object'].includes(typeof r.title)||(r.title!==null&&typeof r.title!=='string')||!Array.isArray(r.ingredients)||!Array.isArray(r.steps)||r.ingredients.length>500||r.steps.length>500)throw Error('Invalid recipe');
  if(r.portions!==null&&typeof r.portions!=='string')throw Error('portions must retain source text or null');
  for(const x of r.ingredients)if(!x||typeof x.name!=='string'||!x.name.trim()||!['quantity','unit'].every(k=>x[k]===null||typeof x[k]==='string'))throw Error('Invalid ingredient');
  if(!r.steps.every(x=>typeof x==='string'))throw Error('Invalid steps');
 }
 return recipes;
}
// Existing parser baseline, not a substitute for browser image preprocessing.
export function parseOCR(text){return K.parseCandidates(text).candidates.map(r=>({
 title:r.name||null,portions:r.portions||null,
 ingredients:r.ingredients.split('\n').filter(Boolean).map(raw=>{
  const s=K.expandFractions(raw),m=s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*/);
  if(!m)return{quantity:null,unit:null,name:raw,source_line:raw};
  const tail=s.slice(m[0].length),u=tail.match(/^(kg|mg|g|gr|ml|dl|cl|l|EL|TL|Päckchen|Pck\.?|Stück|Stk\.?)\s+(.+)$/i);
  return{quantity:m[1],unit:u?u[1]:null,name:u?u[2]:tail||raw,source_line:raw};
 }),steps:r.steps.split('\n').filter(Boolean),unresolved:r.unresolved
}));}
export function evaluate(expected,predicted){
 validateRecipes(expected);validateRecipes(predicted);
 const errors=[],remaining=predicted.map((value,index)=>({value,index}));let correctIngredients=0,totalIngredients=0;
 for(const [ri,want]of expected.entries()){
  let at=remaining.findIndex(x=>normalize(x.value.title)===normalize(want.title));
  if(at<0)at=remaining.length?0:-1;
  const found=at>=0?remaining.splice(at,1)[0]:null,got=found?.value;
  if(!got){errors.push({type:'missing_recipe',recipe:ri});for(const [i]of want.ingredients.entries())errors.push({type:'missing_ingredient',recipe:ri,ingredient:i});totalIngredients+=want.ingredients.length;continue;}
  if(normalize(want.title)!==normalize(got.title))errors.push({type:'wrong_title',recipe:ri});
  if(portions(want.portions)!==portions(got.portions))errors.push({type:'wrong_portions',recipe:ri,expected:want.portions,actual:got.portions});
  const available=got.ingredients.map((value,index)=>({value,index}));
  // Match exact repetitions first, so an omitted duplicate cannot be reused.
  const rows=want.ingredients.map((value,index)=>({value,index}));
  rows.sort((a,b)=>Number(available.some(x=>normalize(x.value.name)===normalize(b.value.name)&&sameQuantity(b.value,x.value)&&sameUnit(b.value,x.value)))-Number(available.some(x=>normalize(x.value.name)===normalize(a.value.name)&&sameQuantity(a.value,x.value)&&sameUnit(a.value,x.value))));
  for(const {value:row,index:i}of rows){
   totalIngredients++;
   let at=available.findIndex(x=>normalize(x.value.name)===normalize(row.name)&&sameQuantity(row,x.value)&&sameUnit(row,x.value));
   if(at<0)at=available.findIndex(x=>normalize(x.value.name)===normalize(row.name));
   if(at<0){errors.push({type:'missing_ingredient',recipe:ri,ingredient:i,expected:row});continue;}
   const actual=available.splice(at,1)[0].value;
   const q=sameQuantity(row,actual),u=sameUnit(row,actual);
   if(!q)errors.push({type:'wrong_quantity',recipe:ri,ingredient:i,expected:row,actual});
   if(!u)errors.push({type:'wrong_unit',recipe:ri,ingredient:i,expected:row,actual});
   if(q&&u)correctIngredients++;
  }
  for(const row of available)errors.push({type:'extra_ingredient',recipe:ri,actual:row.value});
  // Joining whitespace tolerates line wrapping, but preserves words, numbers,
  // temperatures and order. No fuzzy matching or language-model grading.
  if(normalize(want.steps.join(' '))!==normalize(got.steps.join(' ')))errors.push({type:'steps_differ',recipe:ri,expected:want.steps,actual:got.steps});
 }
 for(const r of remaining){errors.push({type:'extra_recipe',actual:r.value.title});for(const row of r.value.ingredients)errors.push({type:'extra_ingredient',actual:row});}
 const counts={};for(const e of errors)counts[e.type]=(counts[e.type]||0)+1;
 return{exact:errors.length===0,expectedRecipes:expected.length,predictedRecipes:predicted.length,totalIngredients,correctIngredients,counts,errors,correctionBurdenMeasured:false};
}
