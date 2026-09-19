/* RESERVE expiry vision v1.1 — secure Vision bridge with safe diagnostics. */
(function(){'use strict';
const cfg=()=>window.RESERVE_EXPIRY_VISION_CONFIG||{};let last={ok:false,reason:'not-run',status:0};
function valid(x){return x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&['day','month'].includes(x.precision)&&Number(x.confidence)>=0&&Number(x.confidence)<=1}
async function analyze(file){
  const c=cfg(),endpoint=c.endpoint||'/api/expiry-vision';last={ok:false,reason:'starting',status:0};
  if(!endpoint){last={ok:false,reason:'no-endpoint',status:0};return null}
  const fd=new FormData();fd.append('image',file,'expiry.jpg');
  let r;try{r=await fetch(endpoint,{method:'POST',body:fd,headers:{'Accept':'application/json'},credentials:'omit'})}
  catch(e){last={ok:false,reason:'network-or-cors',status:0};return null}
  if(!r.ok){last={ok:false,reason:'http',status:r.status};return null}
  let x;try{x=await r.json()}catch{last={ok:false,reason:'invalid-json',status:r.status};return null}
  if(!valid(x)){last={ok:false,reason:'invalid-response',status:r.status};return null}
  last={ok:true,reason:'ok',status:r.status,confidence:Number(x.confidence)};return x;
}
function diagnostic(){return {...last}}
window.RESERVE_EXPIRY_VISION={version:'1.1',analyze,valid,diagnostic};
})();