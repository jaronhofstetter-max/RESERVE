/* RESERVE expiry vision v1.0 — secure server-side Vision bridge with local OCR fallback. */
(function(){'use strict';
const cfg=()=>window.RESERVE_EXPIRY_VISION_CONFIG||{};
function valid(x){return x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&['day','month'].includes(x.precision)&&Number(x.confidence)>=0&&Number(x.confidence)<=1}
async function analyze(file){
  const c=cfg(),endpoint=c.endpoint||'/api/expiry-vision';
  if(!endpoint)return null;
  const fd=new FormData();fd.append('image',file,'expiry.jpg');
  let r;try{r=await fetch(endpoint,{method:'POST',body:fd,headers:{'Accept':'application/json'},credentials:'omit'})}catch{return null}
  if(!r.ok)return null;
  let x;try{x=await r.json()}catch{return null}
  return valid(x)?x:null;
}
window.RESERVE_EXPIRY_VISION={version:'1.0',analyze,valid};
})();