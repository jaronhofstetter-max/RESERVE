/* Replays current pure date interpretation on fixed native OCR caches.
 * This is NOT a rerun of the browser/phone image pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Roles from '../experiments/date-mobile-build/date-roles.cjs';
import {dates,normalize} from '../experiments/date-mobile-build/date-parser.js';
import {resolveDateOrders} from '../experiments/date-mobile-build/date-order.js';
const [auditRoot,outRoot]=process.argv.slice(2);
if(!auditRoot||!outRoot)throw Error('Usage: node audit-expiry-region-prior-v1.mjs AUDIT_ROOT OUTPUT_ROOT');
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest=load(path.join(auditRoot,'extracted/date-detector-v1/data-manifest.json'));
const retention=load(path.join(outRoot,'retention-protected.json'));
const records=new Map(retention.records.map(r=>[r.id,r]));
const rawPath=path.join(auditRoot,'extracted/date-text-v1/ocr-offline');
const raws=new Map(fs.readdirSync(rawPath).filter(n=>n.endsWith('.json')).map(n=>{const r=load(path.join(rawPath,n));return[r.id,r]}));
const same=(a,b)=>a?.date===b.date&&a?.precision===b.precision;
const norm=t=>(t||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const cov=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]))/Math.max(1,(a[2]-a[0])*(a[3]-a[1]));
const predictions=[];
for(const row of manifest.end_to_end_test){
 const raw=raws.get(row.id),targetAnnotation=row.annotations.find(a=>a.cls==='exp'&&a.normalized_date),target=targetAnnotation.normalized_date;
 const lines=raw.lines.map(l=>{const text=normalize(l.text);return{...l,text,parsed_dates:dates(text)}});
 const interpreted=resolveDateOrders({...raw,lines}).raw;
 const modes={};
 for(const mode of ['full','geometric','learned']){
  const indices=records.get(row.id).modes[mode].indices;
  const input={...interpreted,lines:interpreted.lines.filter((_,i)=>indices.includes(i))};
  const p=Roles.select(input);
  modes[mode]={suggestion:p.suggestion,strict_expiry:mode==='full'||indices.length===lines.length?p.strict_expiry:null,candidate_count:p.candidates.length,target_in_candidates:p.candidates.some(c=>same(c,target)),correct:same(p.suggestion,target)};
 }
 const matched=interpreted.lines.filter(l=>cov(targetAnnotation.bbox,l.bbox)>=.5);
 const hasParsed=interpreted.lines.some(l=>l.parsed_dates.some(c=>same(c,target)));
 let failure='correct';
 if(!modes.full.correct){
  if(!matched.length)failure='no_cached_ocr_region_covering_target';
  else if(!hasParsed)failure=matched.some(l=>norm(l.text).includes(norm(targetAnnotation.transcription)))?'interpretation_despite_matching_transcription':'ocr_text_or_source_transcription_mismatch';
  else if(!modes.full.target_in_candidates)failure='confidence_or_candidate_filter';
  else failure='date_order_or_role_selection';
 }
 predictions.push({id:row.id,target,target_transcription:targetAnnotation.transcription,failure,matched_texts:matched.map(l=>({text:l.text,confidence:l.confidence})),modes});
}
const metrics={};
for(const mode of ['full','geometric','learned']){
 const correct=predictions.filter(r=>r.modes[mode].correct).length;
 const selected=predictions.filter(r=>r.modes[mode].suggestion).length;
 metrics[mode]={total:predictions.length,correct,wrong:selected-correct,abstained:predictions.length-selected,target_in_candidates:predictions.filter(r=>r.modes[mode].target_in_candidates).length};
}
const failures={};for(const r of predictions)failures[r.failure]=(failures[r.failure]||0)+1;
const hashes=Object.fromEntries(['date-parser.js','date-order.js','date-roles.cjs'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(new URL('../experiments/date-mobile-build/'+n,import.meta.url))).digest('hex')]));
const result={scope:'Current JavaScript interpretation on preserved native PP-OCR caches; no browser/phone rerun. 100 reused public-source whole images.',trained_model_adopted:false,metrics,failures,hashes,predictions};
fs.writeFileSync(path.join(outRoot,'interpretation-audit.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({scope:result.scope,metrics,failures},null,2));
