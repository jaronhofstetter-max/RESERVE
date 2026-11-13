/* A useful first screen, using existing capture, stock, recipe and account flows. */
(function(){'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function navigate(id){const tab=[...document.querySelectorAll('nav .tab')].find(b=>b.dataset.reserveSection===id||(b.getAttribute('onclick')||'').includes("'"+id+"'"));window.show?.(id,tab);window.scrollTo(0,0);}
function rows(){try{return window.RESERVE_CABINET?.getStock?.()||JSON.parse(localStorage.getItem('reserveStock')||'[]')}catch{return[]}}
function render(){
 const all=rows();if($('reserveHomeStockCount'))$('reserveHomeStockCount').textContent=all.length?all.length+' erfasste '+(all.length===1?'Position':'Positionen'):'Erfasse dein erstes Lebensmittel';
 const host=$('reserveHomeExpiry');if(!host)return;
 const urgent=window.RESERVE_SMART_PRIORITIES?.eatFirst?.(3)||[];
 host.innerHTML=urgent.length?'<ul>'+urgent.map(x=>'<li><strong>'+esc(x.row.n)+'</strong><span>'+esc(window.RESERVE_DATE_POLICY?.label(x.row)||'Datum')+' · '+esc(x.days===0?'heute':x.days===1?'morgen':'in '+x.days+' Tagen')+'</span></li>').join('')+'</ul>':'<p>'+(all.length?'Keine bevorstehenden Datumsangaben in den nächsten 14 Tagen. Details und überfällige Angaben findest du im Vorrat.':'Dein Vorrat ist noch leer. Füge ein Produkt hinzu – dann siehst du hier, was bald fällig ist.')+'</p>';
 labels();
}
function labels(){
 const names={people:'Personen im Haushalt',diet:'Ernährungsweise',avoid:'Allergien / strikt vermeiden',dislikes:'Mag ich nicht',goal:'Was ist dir beim Kochen wichtig?',maxMinutes:'Maximale Kochzeit (Minuten)'};
 for(const [id,text] of Object.entries(names)){const field=$(id);if(!field||field.labels?.length)continue;const label=document.createElement('label');label.htmlFor=id;label.textContent=text;label.className='reserve-profile-label';field.before(label);}
}
function setup(){
 const host=$('onboarding');if(!host)return;
 if(localStorage.getItem('reserveOnboardingDone')==='1'){host.replaceChildren();return;}
 if($('reserveQuickSetup'))return;
 let p={};try{p=JSON.parse(localStorage.getItem('reserveProfile')||'{}')}catch{}
 host.innerHTML='<details class="card reserve-quick-setup" id="reserveQuickSetup"><summary>Deinen Haushalt kurz einrichten <span>optional</span></summary><p>Mit diesen Angaben passen die Vorschläge besser zu dir.</p><form id="reserveQuickSetupForm"><label for="homePeople">Personen im Haushalt</label><input id="homePeople" type="number" min="1" max="100" step="1" required value="'+esc(p.people||1)+'"><label for="homeDiet">Ernährungsweise</label><select id="homeDiet"><option>Alles</option><option>Vegetarisch</option><option>Vegan</option></select><label for="homeAvoid">Allergien / strikt vermeiden</label><input id="homeAvoid" value="'+esc(p.avoid||'')+'" placeholder="z. B. Nüsse, Milch"><p class="reserve-quick-allergy">Bei Allergien auch Zutatenetiketten, Spurenhinweise und mögliche Kreuzkontamination selbst prüfen. RESERVE ersetzt diese Prüfung nicht.</p><button type="submit">Angaben speichern</button><button type="button" class="secondary" id="reserveSetupLater">Später einrichten</button><p id="reserveQuickSetupStatus" role="status"></p></form></details>';
 $('homeDiet').value=p.diet||'Alles';
 $('reserveSetupLater').onclick=()=>{localStorage.setItem('reserveOnboardingDone','1');setup();};
 $('reserveQuickSetupForm').onsubmit=e=>{e.preventDefault();if(!e.target.reportValidity())return;for(const [dest,src] of [['people','homePeople'],['diet','homeDiet'],['avoid','homeAvoid']])if($(dest))$(dest).value=$(src).value;try{window.saveProfile();localStorage.setItem('reserveOnboardingDone','1');host.innerHTML='<p class="reserve-setup-saved" role="status">Deine Angaben sind gespeichert. Du kannst sie jederzeit im Profil ändern.</p>';}catch{$('reserveQuickSetupStatus').textContent='Speichern nicht möglich. Bitte erneut versuchen.';}};
}
function boot(){
 if(!$('reserveHomeCapture'))return;
 const style=document.createElement('style');style.textContent=`
 #home .reserve-welcome{padding:20px 8px 28px;max-width:720px}#home .reserve-welcome h1{font-size:clamp(28px,5vw,42px);line-height:1.12;color:var(--g);margin:12px 0 16px;letter-spacing:-.8px}#home .reserve-welcome>p:not(.reserve-eyebrow){font-size:18px;line-height:1.6;max-width:560px;margin:0 0 20px}.reserve-eyebrow{font-size:11px;font-weight:800;letter-spacing:1.6px;color:#526654}#reserveHomeCapture{font-size:17px;min-height:54px;padding:14px 24px;border-radius:14px}
 #home .reserve-home-links{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}#home .reserve-home-links>button{position:relative;display:grid;grid-template-columns:32px 1fr;gap:6px 12px;align-content:center;text-align:left;border:1px solid var(--line);background:var(--card)!important;color:var(--ink)!important;padding:22px 38px 22px 20px;margin:0;box-shadow:none!important;border-radius:18px;min-height:126px}#home .reserve-home-links strong{font-size:18px;line-height:1.35}#home .reserve-home-links small{grid-column:2;font-weight:400;font-size:14px;line-height:1.5;color:var(--muted)}#home .reserve-home-arrow{position:absolute;right:16px;top:24px}
 #home .reserve-home-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}#home .reserve-home-heading h2{margin:0;font-size:22px}#home .reserve-home-heading button{margin:0;font-size:13px;min-height:44px}#home .reserve-home-expiry>p{font-size:13px}#reserveHomeExpiry p{line-height:1.65;margin-bottom:0;color:var(--muted)}#reserveHomeExpiry ul{list-style:none;padding:0;margin:0}#reserveHomeExpiry li{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid var(--line);line-height:1.45}#reserveHomeExpiry li span{color:var(--muted);font-size:14px;text-align:right}
 #profile label,.reserve-quick-setup label{display:block;font-size:14px;font-weight:650;margin:16px 0 6px;color:var(--g)}#profile input,#profile select{margin:0 0 12px}#profile .grid2{display:block}#profile>.secondary{margin-bottom:16px}.reserve-quick-setup summary{cursor:pointer;color:var(--g);font-weight:750;line-height:1.6}.reserve-quick-setup summary span{font-size:12px;font-weight:400;color:var(--muted)}.reserve-quick-setup input,.reserve-quick-setup select{min-height:48px}.reserve-quick-allergy{font-size:13px;line-height:1.6;color:var(--muted)}.reserve-setup-saved{padding:12px;color:var(--g)}
 .reserve-toolbar #reserveAccountBadge{position:static!important;background:#edf3eb!important;color:#285f3a!important;border:1px solid #d5e1d2!important;margin:0 0 0 auto!important;max-width:130px!important;width:auto!important;height:auto!important;min-height:44px;font-size:11px!important;line-height:1.3!important;padding:8px 10px!important;border-radius:12px!important;box-shadow:none!important;overflow-wrap:anywhere}.reserve-toolbar strong{flex:1;min-width:0}#reserve-feedback-button{position:static!important}#home #personalRecipesHome{display:none!important}#home #autopilotV2{display:none!important}#home .reserve-home-legacy{display:none!important}
 @media(max-width:600px){#home .reserve-home-links{grid-template-columns:1fr;gap:10px}#home .reserve-welcome{padding:12px 2px 24px}#home .reserve-home-links>button{min-height:104px;padding:18px 36px 18px 18px}#reserveHomeCapture{width:100%}#home .reserve-home-expiry{padding:18px}#reserveHomeExpiry li{flex-direction:column;gap:4px}#reserveHomeExpiry li span{text-align:left}}
 `;document.head.append(style);
 $('reserveHomeCapture').onclick=()=>window.RESERVE_VISUAL_FLOW?.openCapture?window.RESERVE_VISUAL_FLOW.openCapture():navigate('stock');
 document.querySelectorAll('[data-home-section]').forEach(b=>b.onclick=()=>navigate(b.dataset.homeSection));
 window.renderOnboarding=setup;setup();render();
 for(const event of ['reserve:stock-changed','reserve:recipes-loaded','reserve:ui-refreshed','reserve:cabinet-rendered','storage'])window.addEventListener(event,()=>{requestAnimationFrame(render);});
 window.RESERVE_WELCOME={render,navigate};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
