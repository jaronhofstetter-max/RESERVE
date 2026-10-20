/* RESERVE date-role candidate v2. Pure local postprocessing of positioned OCR.
 * parsed_dates comes from the unchanged v1 parser. No labels enter this module.
 * Experimental: every selected date requires user review; no inventory writes.
 */
(function(root){'use strict';
const PATTERNS=[
 ['best_before',/mindestens\s*haltbar(?:\s*bis)?|haltbar\s*bis|\bmhd\b|best\s*bef[o0]re|best\s*(?:if\s*)?used\s*by|best\s*by|\bbb[ed]?\b|\bb\.?\s*b\.(?:\s*[ed]\.)?|[àa]\s*consommer\s*de\s*pr[ée]f[ée]rence\s*avant|da\s*consumarsi\s*preferibilmente\s*entro|consumir\s*pref\.?\s*antes/giu],
 ['use_by',/zu\s*verbrauchen\s*bis|verbrauchen\s*bis|use\s*by|[àa]\s*consommer\s*jusqu['’]?\s*(?:au|[àa])|da\s*consumarsi\s*entro/giu],
 ['expiry',/\bexp(?:iry|ires|iration)?(?:\s*date)?\b|verwendbar\s*bis|\bscad(?:enza)?\.?/giu],
 ['manufactured',/hergestellt(?:\s*am)?|herstell(?:ungsdatum|datum|t(?:\s*am)?)|\b(?:prod(?:uction|uktion)?|pro)\.?\s*(?:date|datum)\b|\bprod\b|\bpro(?=\s*:)|\bmf[gd]\b|manufactur(?:ing|e|ed)\s*date|fabriqu[ée](?:\s*le)?|date\s*de\s*fabrication|data\s*di\s*produzione/giu],
 ['sell_by',/(?:zu\s*)?verkaufen\s*bis|verkaufsdatum|sell\s*by|[àa]\s*vendre\s*(?:avant|jusqu['’]?au)|vendere\s*entro/giu],
 ['packed',/verpackt\s*am|pack(?:ed|ing)\s*(?:on|date)|conditionn[ée]\s*le|confezionato\s*il/giu],
 ['batch',/\b(?:lot|los|batch|charge)\b/giu]
];
const expiryRole=r=>['best_before','use_by','expiry'].includes(r);
const excludedRole=r=>['manufactured','sell_by','packed','batch'].includes(r);
const same=(a,b)=>a.date===b.date&&a.precision===b.precision;
const key=c=>c.date+'|'+c.precision;
function spanBox(line,start,end){
 const [x,y,xx,yy]=line.bbox,w=xx-x,h=yy-y,n=Math.max(1,line.text.length);
 return w>=h?[x+w*start/n,y,x+w*end/n,yy]:[x,y+h*start/n,xx,y+h*end/n];
}
function cues(line,index,threshold){
 if(line.confidence<threshold)return [];
 const out=[];
 for(const[role,re]of PATTERNS){re.lastIndex=0;for(const m of line.text.matchAll(re))out.push({start:m.index,end:m.index+m[0].length,role,text:m[0],line_index:index,bbox:spanBox(line,m.index,m.index+m[0].length),confidence:line.confidence});}
 // Prefer the longest specific phrase over an overlapping shorter phrase.
 return out.filter(c=>!out.some(o=>o!==c&&o.start<=c.start&&o.end>=c.end&&o.end-o.start>c.end-c.start)).sort((a,b)=>a.start-b.start||b.end-a.end);
}
function direct(candidate,cs,dates){
 const previous=cs.filter(c=>c.end<=candidate.start&&candidate.start-c.end<=55&&!dates.some(d=>d.start>=c.end&&d.end<=candidate.start&&d.end<candidate.end));
 if(previous.length)return previous[previous.length-1];
 const suffix=cs.filter(c=>c.start>=candidate.end&&c.start-candidate.end<=12&&!dates.some(d=>d.start>=candidate.end&&d.end<=c.start)&&!dates.some(d=>d.start>=c.end&&d.start-c.end<=12));
 return suffix[0]||null;
}
function select(raw,threshold=.8){
 const candidates=[],allCues=[],anchored=new Set();
 raw.lines.forEach((line,i)=>{
  const cs=cues(line,i,threshold);cs.forEach((c,j)=>{c.id=i+':'+j;allCues.push(c)});
  if(line.confidence<threshold)return;
  for(const c of line.parsed_dates||[]){
   if(!/(?:19|20)\d{2}/.test(c.printed))continue;
   // Never turn part of a malformed date token into a shorter valid date.
   if(c.start>0&&/[A-Za-z0-9]/.test(line.text[c.start-1]))continue;
   if(/^[.\/-]\d/.test(line.text.slice(c.end)))continue;
   const cue=direct(c,cs,line.parsed_dates||[]);
   if(cue)anchored.add(cue.id);
   candidates.push({...c,text:line.text,confidence:line.confidence,bbox:spanBox(line,c.start,c.end),line_index:i,role:cue?.role||'unknown',role_evidence:cue?[{...cue,placement:'inline'}]:[],requires_confirmation:true});
  }
 });
 const edges=[];
 candidates.forEach((c,ci)=>{
  if(c.role!=='unknown')return;
  const[x,y,xx,yy]=c.bbox,w=Math.max(4,xx-x),h=Math.max(4,yy-y);
  for(const cue of allCues){
   // A nearby batch label belongs to its own code, not a date on another line.
   if(cue.line_index===c.line_index||anchored.has(cue.id)||cue.role==='batch')continue;
   const[ox,oy,oxx,oyy]=cue.bbox,dx=Math.max(x-oxx,ox-xx,0),dy=Math.max(y-oyy,oy-yy,0);
   if(dx>Math.max(w,raw.width*.05)||dy>Math.max(h*3,raw.height*.025))continue;
   // A cue cannot jump over a closer printed date to a different value.
   edges.push({ci,cue,distance:dx/w+dy/h});
  }
 });
 for(let ci=0;ci<candidates.length;ci++){
  const c=candidates[ci];if(c.role!=='unknown')continue;
  const nearby=edges.filter(e=>e.ci===ci).sort((a,b)=>a.distance-b.distance);
  if(!nearby.length)continue;
  const best=nearby[0];
  if(nearby.some(e=>e.cue.role!==best.cue.role&&e.distance-best.distance<.25))continue;
  if(edges.some(e=>e.cue.id===best.cue.id&&!same(candidates[e.ci],c)&&e.distance<=best.distance+.25))continue;
  c.role=best.cue.role;c.role_evidence=[{...best.cue,placement:'nearby_mutual',distance:best.distance}];
 }
 const positive=candidates.filter(c=>expiryRole(c.role));
 const pu=new Set(positive.map(key));
 // The same date carrying contradictory roles remains unconfirmed.
 let strict=pu.size===1?positive.reduce((a,b)=>a.confidence>=b.confidence?a:b):null;
 if(strict&&candidates.some(c=>same(c,strict)&&excludedRole(c.role)))strict=null;
 const eligible=candidates.filter(c=>!excludedRole(c.role)),unique=new Set(eligible.map(key));
 const suggestion=strict||(unique.size===1?eligible.reduce((a,b)=>a.confidence>=b.confidence?a:b):null);
 const pool=positive.length?positive:eligible,distinct=new Set(pool.map(key));
 const alternatives=!suggestion&&distinct.size===2&&pool.some(c=>c.ambiguous&&pool.filter(o=>o.line_index===c.line_index&&o.start===c.start&&o.end===c.end).length===2)?[...new Map(pool.map(c=>[key(c),{date:c.date,precision:c.precision,role:c.role}])).values()]:[];
 return {id:raw.id,suggestion,strict_expiry:strict,alternatives,candidates,seconds:raw.seconds,requires_confirmation:true};
}
const api={version:'2.0-experimental',select,cues,expiryRole,excludedRole};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RESERVE_DATE_ROLES=api;
})(typeof globalThis!=='undefined'?globalThis:this);
