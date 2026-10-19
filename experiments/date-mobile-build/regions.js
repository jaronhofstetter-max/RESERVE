/* Experimental geometric proposal only: no dates, OCR text or labels as inputs.
 * Missing boxes mean missing contradictory evidence: partial reads NEVER yield
 * a strict expiry. The unchanged full-image path remains the default control.
 */
export const REGION_LIMIT=24;
function bounds(line){
 const box=line.box;if(!Array.isArray(box)||box.length!==4||box.some(p=>!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x))))return null;
 const xs=box.map(p=>p[0]),ys=box.map(p=>p[1]);
 const x=Math.min(...xs),y=Math.min(...ys),xx=Math.max(...xs),yy=Math.max(...ys);
 return{x,y,xx,yy,w:xx-x,h:yy-y};
}
export function planRegions(lines){
 const all={lineImages:lines,coverage:{total:lines.length,selected:lines.length,complete:true}};
 if(lines.length<=REGION_LIMIT)return all;
 const boxes=lines.map(bounds);
 // Unknown geometry must not silently discard evidence.
 if(boxes.some(b=>!b||b.w<=0||b.h<=0))return all;
 const heights=boxes.map(b=>b.h).sort((a,b)=>a-b),median=heights[Math.floor(heights.length/2)];
 const gap=(a,b)=>({x:Math.max(a.x-b.xx,b.x-a.xx,0),y:Math.max(a.y-b.yy,b.y-a.yy,0)});
 const ranked=boxes.map((b,index)=>{
  const aspect=b.w/b.h;
  // Stamps often have larger letters and space around a medium-length line.
  const nearest=Math.min(...boxes.filter((_,i)=>i!==index).map(o=>{const g=gap(b,o);return Math.hypot(g.x,g.y)/Math.max(b.h,median);}));
  const score=Math.min(b.h/median,3)*2+Math.min(nearest,3)+(aspect>=2&&aspect<=20?1:0)-(aspect>35?2:0);
  return{index,score};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
 const seeds=ranked.slice(0,8),selected=new Set(seeds.map(s=>s.index));
 // Reserve room for neighbouring hints AND adjacent competing date stamps.
 for(const seed of seeds){
  const b=boxes[seed.index];
  const nearby=boxes.map((o,i)=>{const g=gap(b,o);return{i,g,d:g.y/Math.max(b.h,o.h)+g.x/Math.max(b.w,o.w)};})
   .filter(o=>!selected.has(o.i)&&o.g.y<=Math.max(b.h,boxes[o.i].h)*6&&o.g.x<=Math.max(b.w,boxes[o.i].w))
   .sort((a,b)=>a.d-b.d||a.i-b.i);
  for(const o of nearby.slice(0,2))if(selected.size<REGION_LIMIT)selected.add(o.i);
 }
 for(const s of ranked)if(selected.size<REGION_LIMIT)selected.add(s.index);
 const lineImages=lines.filter((_,i)=>selected.has(i));
 return{lineImages,coverage:{total:lines.length,selected:lineImages.length,complete:lineImages.length===lines.length}};
}
export function guardPrediction(prediction,coverage){
 return{...prediction,strict_expiry:coverage?.complete===false?null:prediction.strict_expiry};
}
