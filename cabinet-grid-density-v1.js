/* Product grid density: saved preference and two-finger pinch. */
(function(){
const KEY='reserveGridColumns';let columns=2,gesture=null,suppressUntil=0;
try{const saved=Number(localStorage.getItem(KEY));if(Number.isInteger(saved)&&saved>=2&&saved<=10)columns=saved}catch{}
function set(value){columns=Math.max(2,Math.min(10,Math.round(value)));const host=document.getElementById('reserveCabinet');if(!host)return;host.style.setProperty('--cab-columns',columns);host.style.setProperty('--cab-gap',columns>6?'4px':columns>3?'8px':'14px');try{localStorage.setItem(KEY,String(columns))}catch{}}
function boot(){const host=document.getElementById('reserveCabinet');if(!host)return;const style=document.createElement('style');style.textContent=`
#reserveCabinet .cab-frame{grid-template-columns:repeat(var(--cab-columns,2),minmax(0,1fr))!important;gap:var(--cab-gap,14px)!important;touch-action:pan-y}
#reserveCabinet .cab-product{aspect-ratio:1/1.12;min-height:0!important;min-width:0!important;padding:clamp(2px,1vw,10px)!important;border-radius:10px;gap:0}
#reserveCabinet .cab-product .cab-icon{height:100%!important;width:100%!important;min-height:0;min-width:0;font-size:clamp(14px,4vw,42px)}
`;document.head.appendChild(style);set(columns);
const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
host.addEventListener('touchstart',e=>{if(e.touches.length===2){const d=distance(e.touches);gesture=d>0?{distance:d,columns}:null;suppressUntil=Date.now()+500;if(e.cancelable)e.preventDefault()}else gesture=null},{passive:false});
host.addEventListener('touchmove',e=>{if(!gesture||e.touches.length!==2)return;if(e.cancelable)e.preventDefault();const d=distance(e.touches);if(d>0)set(gesture.columns*gesture.distance/d);suppressUntil=Date.now()+500},{passive:false});
const end=()=>{if(gesture)suppressUntil=Date.now()+500;gesture=null};host.addEventListener('touchend',end,{passive:true});host.addEventListener('touchcancel',end,{passive:true});host.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
