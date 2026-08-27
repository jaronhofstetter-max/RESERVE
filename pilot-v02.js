// TenderHawk pilot hardening: profile onboarding, data-quality labels and safer analysis inputs.
(function(){
  const el=id=>document.getElementById(id);
  const DEMO_NAME='Muster Gebäudetechnik AG';

  function profileCompleteness(){
    const fields=['company','region','trades','caps','refs','maxv'];
    const filled=fields.filter(id=>{const x=el(id);return x&&String(x.value||'').trim()&&!(id==='company'&&x.value.trim()===DEMO_NAME)}).length;
    return Math.round(filled/fields.length*100);
  }

  function ensureStyles(){
    if(document.getElementById('th-pilot-style'))return;
    const s=document.createElement('style');s.id='th-pilot-style';s.textContent=`
      .th-onboard{background:#fff8e7;border:1px solid #e6ca83;border-left:4px solid #c9a65b;border-radius:12px;padding:14px 15px;margin:0 0 14px;line-height:1.45}
      .th-onboard b{color:#0b2a3e}.th-onboard button{margin-top:10px}.th-progress{height:7px;background:#ece8dd;border-radius:99px;overflow:hidden;margin:8px 0}.th-progress i{display:block;height:100%;background:linear-gradient(90deg,#b9964d,#d8bd79)}
      .th-data-note{font-size:12px;color:#6f706d;margin-top:5px}.th-demo-chip{display:inline-block;background:#fff2cf;color:#805900;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;margin-left:6px}
    `;document.head.appendChild(s);
  }

  function addProfileOnboarding(){
    const card=document.querySelector('#profile .card');if(!card||document.getElementById('thProfileOnboard'))return;
    const box=document.createElement('div');box.id='thProfileOnboard';box.className='th-onboard';
    card.insertBefore(box,card.children[1]||null);
    const update=()=>{
      const pct=profileCompleteness();
      const demo=el('company')&&el('company').value.trim()===DEMO_NAME;
      box.innerHTML=`<b>${demo?'Demo-Profil aktiv':'Firmenprofil vervollständigen'}</b>${demo?'<span class="th-demo-chip">DEMO</span>':''}<div>${demo?'Die aktuellen Scores basieren noch auf einem Musterunternehmen. Ersetzen Sie die Angaben durch die echte Firma, damit TenderHawk individuell bewertet.':'Je vollständiger Gewerke, Region, Nachweise und Referenzen sind, desto belastbarer wird das Matching.'}</div><div class="th-progress"><i style="width:${pct}%"></i></div><div class="th-data-note">Profilvollständigkeit: ${pct}%</div>`;
    };
    ['company','region','trades','caps','refs','maxv','capacity'].forEach(id=>{const x=el(id);if(x)x.addEventListener('input',update)});update();
  }

  function addDashboardNotice(){
    const root=document.getElementById('dashboardBody');if(!root||document.getElementById('thDashboardOnboard'))return;
    if(!el('company')||el('company').value.trim()!==DEMO_NAME)return;
    const box=document.createElement('div');box.id='thDashboardOnboard';box.className='th-onboard';
    box.innerHTML='<b>Demo-Profil aktiv</b><span class="th-demo-chip">DEMO</span><div>Die angezeigten Match-Scores sind Beispielwerte für „Muster Gebäudetechnik AG“. Für belastbare Ergebnisse zuerst Ihr Firmenprofil hinterlegen.</div><button type="button">Echtes Firmenprofil einrichten</button>';
    box.querySelector('button').onclick=()=>show('profile',document.querySelectorAll('.tab')[2]||document.querySelectorAll('.tab')[1]);
    root.insertBefore(box,root.firstChild);
  }

  function improveVolumeField(){
    const v=el('val');if(!v)return;
    const label=v.closest('div')&&v.closest('div').querySelector('label');
    if(label)label.textContent='Volumen CHF (falls publiziert)';
    v.placeholder='Nicht angegeben';
    const oldChoose=window.choose;
    if(typeof oldChoose==='function'&&!oldChoose.__thPilot){
      const wrapped=function(i){oldChoose(i);if(selected&&!(+selected.value>0))v.value='';};
      wrapped.__thPilot=true;window.choose=wrapped;
    }
  }

  function markUnknownVolumes(){
    document.querySelectorAll('.th-match-meta,.oppMeta').forEach(()=>{});
    const tender=el('tender'),v=el('val');if(!v||!tender)return;
    if(v.value==='0')v.value='';
  }

  function init(){
    ensureStyles();addProfileOnboarding();improveVolumeField();markUnknownVolumes();
    setTimeout(addDashboardNotice,600);
    const oldRender=window.renderTenderDashboard;
    if(typeof oldRender==='function'&&!oldRender.__thPilot){
      const wrapped=function(){oldRender();setTimeout(addDashboardNotice,0)};wrapped.__thPilot=true;window.renderTenderDashboard=wrapped;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();