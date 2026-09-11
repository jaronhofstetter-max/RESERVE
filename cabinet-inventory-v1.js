/* RESERVE cabinet inventory v1.2 — searchable, editable pantry cabinet backed by reserveStock. */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rawStock=()=>localStorage.getItem('reserveStock')||'[]';
  const getStock=()=>{try{const v=JSON.parse(rawStock());return Array.isArray(v)?v:[]}catch(_){return[]}};
  let lastStockRaw=rawStock(),renderQueued=false;

  function icon(s){const t=norm((s?.n||'')+' '+(s?.c||''));if(/pasta|spaghetti|nudel/.test(t))return'🍝';if(/reis/.test(t))return'🍚';if(/brot|mehl|getreide|hafer/.test(t))return'🌾';if(/milch/.test(t))return'🥛';if(/kase|käse/.test(t))return'🧀';if(/ei\b|eier/.test(t))return'🥚';if(/apfel|obst|frucht|banan|beere/.test(t))return'🍎';if(/gemuse|gemüse|tomat|kartoff|karott|zucchini/.test(t))return'🥕';if(/fleisch|rind|poulet|hahn/.test(t))return'🥩';if(/fisch/.test(t))return'🐟';if(/wasser|saft|getrank|getränk/.test(t))return'💧';if(/dose|konserve/.test(t))return'🥫';return'📦'}
  function daysLeft(date){if(!date)return null;return Math.ceil((new Date(date+'T23:59:59')-new Date())/86400000)}
  function expiryClass(s){const d=daysLeft(s?.e);return d==null?'':d<0?'cab-expired':d<=3?'cab-soon':''}
  function queueRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})}
  function syncIfChanged(){const now=rawStock();if(now!==lastStockRaw)queueRender()}

  function render(){
    const host=$('reserveCabinet');if(!host)return;
    lastStockRaw=rawStock();
    const q=norm($('cabinetSearch')?.value),all=getStock();
    const rows=all.map((s,i)=>({s,i})).filter(x=>!q||norm((x.s.n||'')+' '+(x.s.c||'')+' '+(x.s.q||'')).includes(q));
    $('cabinetCount').textContent=rows.length+(q?' Treffer':' Produkte');
    if(!rows.length){host.innerHTML='<div class="cab-empty">'+(q?'Kein Produkt gefunden.':'Dein Vorratsschrank ist noch leer.')+'</div>';return}
    host.innerHTML='<div class="cab-frame">'+rows.map(x=>`<button class="cab-product ${expiryClass(x.s)}" data-index="${x.i}" aria-label="${esc(x.s.n)}, ${esc(x.s.q)}"><span class="cab-icon">${icon(x.s)}</span><strong>${esc(x.s.n)}</strong><span>${esc(x.s.q)}</span>${x.s.e?`<small>${esc(x.s.e)}</small>`:''}</button>`).join('')+'</div>';
    host.querySelectorAll('.cab-product').forEach(b=>b.onclick=()=>detail(+b.dataset.index));
  }

  function commitStock(next){
    try{
      if(typeof stock!=='undefined'&&Array.isArray(stock)){
        stock.splice(0,stock.length,...next);
        if(typeof saveStock==='function'){saveStock();return}
      }
    }catch(_){ }
    localStorage.setItem('reserveStock',JSON.stringify(next));
    queueRender();
  }

  function detail(index){
    const rows=getStock(),s=rows[index],d=$('cabinetDetail');if(!s||!d)return;
    const cats=['Getreide & Beilagen','Gemüse & Früchte','Protein','Milchprodukte','Sonstiges'];
    const options=cats.map(c=>`<option ${c===(s.c||'Sonstiges')?'selected':''}>${esc(c)}</option>`).join('');
    d.innerHTML=`<div class="cab-detail-card"><button class="cab-close" aria-label="Schließen">×</button><div class="cab-detail-icon">${icon(s)}</div><h3>Produkt bearbeiten</h3><form id="cabinetEditForm"><label>Name<input id="cabEditName" value="${esc(s.n)}" required></label><label>Menge<input id="cabEditQty" value="${esc(s.q)}" required></label><label>Ablaufdatum<input id="cabEditExpiry" type="date" value="${esc(s.e||'')}"></label><label>Kategorie<select id="cabEditCat">${options}</select></label><div class="cab-actions"><button type="submit">Speichern</button><button type="button" class="secondary cab-delete">Entfernen</button></div></form></div>`;
    d.hidden=false;
    d.querySelector('.cab-close').onclick=()=>{d.hidden=true};
    d.querySelector('#cabinetEditForm').onsubmit=e=>{e.preventDefault();const next=getStock();if(!next[index])return;next[index]={...next[index],n:$('cabEditName').value.trim(),q:$('cabEditQty').value.trim(),e:$('cabEditExpiry').value,c:$('cabEditCat').value};if(!next[index].n||!next[index].q)return;commitStock(next);d.hidden=true};
    d.querySelector('.cab-delete').onclick=()=>{const next=getStock();next.splice(index,1);commitStock(next);d.hidden=true};
  }

  function installStockEvents(){
    if(!window.__reserveStockStorageHook){
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){original.apply(this,arguments);if(this===localStorage&&key==='reserveStock')window.dispatchEvent(new Event('reserve:stock-changed'))};
      window.__reserveStockStorageHook=true;
    }
    window.addEventListener('reserve:stock-changed',syncIfChanged);
    window.addEventListener('storage',e=>{if(e.key==='reserveStock')syncIfChanged()});
    window.addEventListener('focus',syncIfChanged);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncIfChanged()});
  }

  function mount(){
    const list=$('stockList');if(!list||$('reserveCabinet'))return;
    const box=document.createElement('div');box.className='card cabinet-card';
    box.innerHTML='<div class="cab-head"><div><h2>Vorratsschrank</h2><p class="muted">Finde, bearbeite und verwalte Lebensmittel schnell.</p></div><span id="cabinetCount" class="pill good"></span></div><input id="cabinetSearch" type="search" placeholder="Im Vorrat suchen, z. B. Spaghetti oder Milchprodukte" aria-label="Vorrat durchsuchen"><div id="reserveCabinet"></div><div id="cabinetDetail" class="cab-detail" hidden></div>';
    list.insertAdjacentElement('beforebegin',box);
    const style=document.createElement('style');style.textContent='.cabinet-card{overflow:hidden}.cab-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cab-head h2{margin-bottom:4px}.cab-frame{margin-top:14px;padding:18px 14px 8px;border:9px solid #73543a;border-radius:14px;background:repeating-linear-gradient(to bottom,#ead9b9 0,#ead9b9 142px,#76583e 142px,#76583e 154px);display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:18px 10px;min-height:174px}.cab-product{min-height:118px;margin:0;padding:9px 6px;background:#fffdf8e8;color:var(--ink);border:1px solid #c9b48f;border-radius:12px;box-shadow:0 4px 8px #4d372326;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}.cab-product strong{font-size:13px;line-height:1.15}.cab-product span:not(.cab-icon),.cab-product small{font-size:11px}.cab-icon{font-size:35px}.cab-soon{outline:3px solid #e5a72f}.cab-expired{outline:3px solid #b44}.cab-empty{padding:30px;text-align:center}.cab-detail{position:fixed;inset:0;z-index:9999;background:#0008;display:grid;place-items:center;padding:18px}.cab-detail[hidden]{display:none}.cab-detail-card{position:relative;width:min(430px,100%);max-height:90vh;overflow:auto;background:var(--card);border-radius:18px;padding:22px}.cab-detail-card label{display:block;margin-top:8px;font-weight:700}.cab-close{position:absolute;right:12px;top:8px;background:transparent;color:var(--ink);font-size:26px}.cab-detail-icon{font-size:52px}.cab-actions{display:flex;gap:8px;flex-wrap:wrap}.cab-actions button{flex:1}@media(max-width:520px){.cab-frame{grid-template-columns:repeat(3,1fr);padding-left:8px;padding-right:8px}.cab-product{min-height:110px}.cab-head{display:block}}';document.head.appendChild(style);
    let searchTimer=null;$('cabinetSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(queueRender,80)});
    installStockEvents();
    render();
  }

  window.RESERVE_CABINET={version:'1.2',render,getStock,sync:syncIfChanged};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
