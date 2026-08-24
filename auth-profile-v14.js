// TenderHawk 1.4 — Supabase authentication + persistent company profile
(function(){
  const sb=window.tenderhawkSupabase;
  if(!sb){console.warn('TenderHawk: Supabase client unavailable');return;}

  const ids=['company','region','trades','caps','refs','maxv','capacity'];
  const el=id=>document.getElementById(id);
  let currentUser=null;

  function ensureStyles(){
    if(document.getElementById('th-auth-style'))return;
    const s=document.createElement('style');s.id='th-auth-style';s.textContent=`
      .th-authbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto}
      .th-authbar input{width:220px;max-width:54vw;padding:8px 10px;border-radius:8px;border:1px solid #ffffff42;background:#ffffff12;color:#fff}
      .th-authbar input::placeholder{color:#dce6ecb8}.th-auth-status{font-size:12px;color:#d6dee3;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .th-save-status{font-size:12px;margin-top:8px;color:#6f706d}.th-authbar button{margin:0;padding:8px 10px}
      @media(max-width:720px){.brandrow{align-items:flex-start;flex-wrap:wrap}.th-authbar{width:100%;margin-left:0}.th-authbar input{flex:1;min-width:170px;max-width:none}}
    `;document.head.appendChild(s);
  }

  function ensureAuthUI(){
    if(document.getElementById('thAuthBar'))return;
    ensureStyles();
    const row=document.querySelector('.brandrow'); if(!row)return;
    const box=document.createElement('div');box.id='thAuthBar';box.className='th-authbar noprint';
    box.innerHTML=`<input id="thAuthEmail" type="email" autocomplete="email" placeholder="E-Mail für Login"><button id="thLoginBtn" class="ghost" type="button">Login-Link senden</button><button id="thLogoutBtn" class="ghost" type="button" style="display:none">Abmelden</button><span id="thAuthStatus" class="th-auth-status">Nicht angemeldet</span>`;
    row.appendChild(box);
    el('thLoginBtn').onclick=sendMagicLink;el('thLogoutBtn').onclick=logout;
  }

  function ensureProfileSaveUI(){
    const profile=document.querySelector('#profile .card');if(!profile||document.getElementById('thSaveProfileBtn'))return;
    const btn=document.createElement('button');btn.id='thSaveProfileBtn';btn.type='button';btn.textContent='Profil dauerhaft speichern';btn.onclick=saveProfile;
    const st=document.createElement('div');st.id='thProfileStatus';st.className='th-save-status';st.textContent='Zum Speichern bitte anmelden.';
    profile.appendChild(btn);profile.appendChild(st);
  }

  function setAuthUI(user){
    currentUser=user||null;const status=el('thAuthStatus'),login=el('thLoginBtn'),logoutBtn=el('thLogoutBtn'),email=el('thAuthEmail');
    if(!status)return;
    if(user){status.textContent=user.email||'Angemeldet';login.style.display='none';email.style.display='none';logoutBtn.style.display='inline-block';if(el('thProfileStatus'))el('thProfileStatus').textContent='Angemeldet — Profil kann in Supabase gespeichert werden.';}
    else{status.textContent='Nicht angemeldet';login.style.display='inline-block';email.style.display='inline-block';logoutBtn.style.display='none';if(el('thProfileStatus'))el('thProfileStatus').textContent='Zum Speichern bitte anmelden.';}
  }

  async function sendMagicLink(){
    const email=(el('thAuthEmail').value||'').trim();if(!email){alert('Bitte E-Mail-Adresse eingeben.');return;}
    el('thLoginBtn').disabled=true;
    const redirectTo=location.origin+location.pathname;
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
    el('thLoginBtn').disabled=false;
    if(error){alert('Login-Link konnte nicht gesendet werden: '+error.message);return;}
    el('thAuthStatus').textContent='Login-Link wurde per E-Mail gesendet.';
  }

  async function logout(){await sb.auth.signOut();setAuthUI(null);}

  function profilePayload(){return {
    user_id:currentUser.id,
    company_name:el('company').value||'',region:el('region').value||'',trades:el('trades').value||'',
    capabilities:el('caps').value||'',references_text:el('refs').value||'',
    max_contract_value:+el('maxv').value||0,capacity:(el('capacity').value||'mittel').toLowerCase(),match_threshold:75
  };}

  async function saveProfile(){
    if(!currentUser){alert('Bitte zuerst anmelden.');return;}
    const st=el('thProfileStatus');st.textContent='Speichere …';
    const {error}=await sb.from('company_profiles').upsert(profilePayload(),{onConflict:'user_id'});
    if(error){st.textContent='Speichern fehlgeschlagen: '+error.message;return;}
    st.textContent='Profil dauerhaft gespeichert.';try{if(typeof live==='function')live();if(typeof renderTenderDashboard==='function')renderTenderDashboard();}catch(e){}
  }

  async function loadProfile(){
    if(!currentUser)return;
    const {data,error}=await sb.from('company_profiles').select('*').eq('user_id',currentUser.id).maybeSingle();
    if(error){if(el('thProfileStatus'))el('thProfileStatus').textContent='Profil konnte nicht geladen werden: '+error.message;return;}
    if(!data)return;
    const map={company:'company_name',region:'region',trades:'trades',caps:'capabilities',refs:'references_text',maxv:'max_contract_value',capacity:'capacity'};
    Object.entries(map).forEach(([id,key])=>{if(el(id)&&data[key]!==null&&data[key]!==undefined)el(id).value=data[key];});
    if(el('thProfileStatus'))el('thProfileStatus').textContent='Gespeichertes Firmenprofil geladen.';
    try{if(typeof live==='function'&&window.cache&&cache.length)live();if(typeof renderTenderDashboard==='function')renderTenderDashboard();}catch(e){}
  }

  async function init(){
    ensureAuthUI();ensureProfileSaveUI();
    const {data:{session}}=await sb.auth.getSession();setAuthUI(session&&session.user);if(session&&session.user)await loadProfile();
    sb.auth.onAuthStateChange(async (_event,session)=>{setAuthUI(session&&session.user);if(session&&session.user)await loadProfile();});
  }

  window.saveTenderHawkProfile=saveProfile;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
