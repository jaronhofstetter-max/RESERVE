/* RESERVE expiry vision v1.7 — no immediate retry on TPM limits; crop likely text band before upload. */
(function(){'use strict';
const cfg=()=>window.RESERVE_EXPIRY_VISION_CONFIG||{};let last={ok:false,reason:'not-run',status:0};
function valid(x){return x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&['day','month'].includes(x.precision)&&Number(x.confidence)>=0&&Number(x.confidence)<=1}
function jsonish(v){
  if(!v)return null;if(typeof v==='object')return v;
  let s=String(v).trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  try{return JSON.parse(s)}catch(e){}
  const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1))}catch(e){}}
  return null;
}
function normalize(x){
  let y=jsonish(x)||x;
  if(y&&y.result)y=jsonish(y.result)||y.result;
  if(y&&y.output)y=jsonish(y.output)||y.output;
  if(y&&y.response)y=jsonish(y.response)||y.response;
  if(y&&y.content)y=jsonish(y.content)||y.content;
  if(y&&Array.isArray(y.output)){
    for(const item of y.output){if(item&&Array.isArray(item.content)){for(const c of item.content){const z=jsonish(c&&c.text);if(z){y=z;break}}}}
  }
  if(!y||typeof y!=='object')return null;
  const date=y.date||y.expiry_date||y.expiryDate||y.best_before||y.bestBefore||null;
  let precision=String(y.precision||y.date_precision||'').toLowerCase();
  if(!precision&&date)precision='day';
  let confidence=Number(y.confidence);
  if(!Number.isFinite(confidence))confidence=Number(y.score);
  if(confidence>1&&confidence<=100)confidence/=100;
  return {date,precision,confidence,raw:y.raw||y.text||'',reason:y.reason||''};
}
async function compactImage(file){
  try{
    const bmp=await createImageBitmap(file),portrait=bmp.height>bmp.width*1.15;
    /* Expiry photos are normally framed around the print. Trim only outer margins,
       preserving the central text area while cutting background/hand/table pixels. */
    const sx=Math.round(bmp.width*(portrait?.08:.06)),sy=Math.round(bmp.height*(portrait?.12:.08));
    const sw=Math.max(1,bmp.width-2*sx),sh=Math.max(1,bmp.height-2*sy),max=900,s=Math.min(1,max/Math.max(sw,sh));
    const w=Math.max(1,Math.round(sw*s)),h=Math.max(1,Math.round(sh*s)),cv=document.createElement('canvas');cv.width=w;cv.height=h;
    cv.getContext('2d').drawImage(bmp,sx,sy,sw,sh,0,0,w,h);bmp.close?.();
    const blob=await new Promise(ok=>cv.toBlob(ok,'image/jpeg',0.72));return blob||file
  }catch{return file}
}
async function analyze(file){
  const c=cfg(),endpoint=c.endpoint||'/api/expiry-vision';last={ok:false,reason:'starting',status:0};
  if(!endpoint){last={ok:false,reason:'no-endpoint',status:0};return null}
  const upload=await compactImage(file);const fd=new FormData();fd.append('image',upload,'expiry.jpg');
  const send=()=>fetch(endpoint,{method:'POST',body:fd,headers:{'Accept':'application/json'},credentials:'omit'});let r;try{r=await send()}catch(e){last={ok:false,reason:'network-or-cors',status:0};return null}
  if(!r.ok){let e=null;try{e=await r.json()}catch{};const up=Number(e?.upstreamStatus)||0,code=String(e?.code||'');if((up>=500||r.status>=500)&&up!==429&&r.status!==504){await new Promise(ok=>setTimeout(ok,1200));try{r=await send();e=null;if(!r.ok){try{e=await r.json()}catch{}}}catch{last={ok:false,reason:'network-or-cors',status:0};return null}}if(!r.ok){last={ok:false,reason:'http',status:r.status,code:String(e?.code||code),upstreamStatus:Number(e?.upstreamStatus)||up,message:String(e?.upstreamMessage||e?.error||'').slice(0,120),bodyKeys:e&&typeof e==='object'?Object.keys(e).slice(0,12):[]};return null}}
  let x;try{x=await r.json()}catch{last={ok:false,reason:'invalid-json',status:r.status};return null}
  const n=normalize(x);
  if(!valid(n)){last={ok:false,reason:'invalid-response',status:r.status,shape:x&&typeof x==='object'?Object.keys(x).slice(0,8):[]};return null}
  last={ok:true,reason:'ok',status:r.status,confidence:Number(n.confidence)};return n;
}
function diagnostic(){return {...last}}
window.RESERVE_EXPIRY_VISION={version:'1.7',analyze,valid,normalize,diagnostic};
})();