/* RESERVE stock list units v1.0 — mirrors package-aware quantities into the legacy charge list. */
(function(){
'use strict';
function rows(){try{const v=JSON.parse(localStorage.getItem('reserveStock')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function display(row){return window.RESERVE_CONTAINER_UNITS?.label?.(row)||String(row?.q||'')}
function decorate(){const host=document.getElementById('stockList');if(!host)return;const data=rows();[...host.querySelectorAll(':scope > .item')].forEach((item,i)=>{const row=data[i];if(!row)return;const wanted=' · '+display(row);const name=item.querySelector(':scope > b');if(!name)return;let node=[...item.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.previousSibling===name);if(!node)node=[...item.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&String(n.textContent).includes('·'));if(node&&node.textContent!==wanted)node.textContent=wanted;item.dataset.packageQuantity=display(row)})}
const soon=()=>requestAnimationFrame(()=>requestAnimationFrame(decorate));
function boot(){const host=document.getElementById('stockList');if(host)new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'))soon()}).observe(host,{childList:true,subtree:true});soon();window.addEventListener('reserve:stock-changed',soon,{passive:true});window.addEventListener('reserve:ui-refreshed',soon,{passive:true});window.addEventListener('pageshow',soon,{passive:true})}
window.RESERVE_STOCK_LIST_UNITS={version:'1.0',decorate,display};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();