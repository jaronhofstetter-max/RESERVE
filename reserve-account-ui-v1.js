/* Optional account UI: disabled until the real backend has been provisioned and tested. */
(function(){'use strict';
const config=window.RESERVE_ACCOUNT_CONFIG,$=id=>document.getElementById(id);if(!config?.enabled)return;
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey))return;
let client,engine,local,currentSession=null,timer,restoring=false,modal,card,profile,activeOwner=null,recovering=false;
function message(text){$('reserveAccountStatus').textContent=text;}
function lock(on){document.documentElement.classList.toggle('reserve-account-locked',on);if(on){modal.hidden=false;modal.append(card);}else{modal.hidden=true;profile.append(card);}}
function configuredSDK(){return new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve(window.supabase);const script=document.createElement('script');script.src='assets/account-sdk/supabase-2.118.0.js';script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(Error('Anmeldung konnte nicht geladen werden.'));script.onerror=()=>reject(Error('Anmeldung ist offline. Bitte die Verbindung prüfen.'));document.head.append(script);});}
function render(event){
 message(event.message);$('reserveAccountStatus').dataset.phase=event.phase;const badge=$('reserveAccountBadge');if(badge)badge.textContent=(config.trial?'Testbetrieb · ':'')+(({ready:'Konto verbunden',saved:'Im Konto gesichert',pending:'Weitere Änderungen werden gesichert …',saving:'Wird im Konto gesichert …',restored:'Aus Konto wiederhergestellt','signed-out':'Nur auf diesem Gerät'})[event.phase]||'Kontosicherung prüfen');if(currentSession&&['loading','restoring'].includes(event.phase))lock(true);const phase=event.phase,needsChoice=['adopt','conflict','empty-blocked'].includes(phase);
 $('reserveAccountAdopt').hidden=!needsChoice;$('reserveAccountAdopt').textContent=phase==='empty-blocked'?'Leeren Kontostand ausdrücklich speichern':'Diesen Gerätestand übernehmen';
 $('reserveAccountPull').hidden=phase!=='conflict';$('reserveAccountRetry').hidden=!['error','conflict'].includes(phase);
 $('reserveAccountSave').hidden=!['ready','saved','saving'].includes(phase);
 if(engine?.needsRefresh){$('reserveAccountAdopt').hidden=true;$('reserveAccountPull').hidden=true;}
 if(phase==='restored'){restoring=true;location.reload();}
 if(['ready','saved'].includes(phase))lock(false);
}
async function connect(session){
 if(recovering)return;clearTimeout(timer);currentSession=session;$('reserveAccountAuth').hidden=!!session;$('reserveAccountLogout').hidden=!session;
 if(!session){engine.stop();if(local.getMeta()?.ownerId)lock(true);return;}
 activeOwner=session.user.id;$('reserveAccountIdentity').textContent=session.user.email||'Angemeldet';
 await engine.connect(session.user.id,window.RESERVE_ACCOUNT_STORAGE.createTransport(config,session));
 if(['adopt','conflict'].includes(engine.phase)&&local.getMeta()?.ownerId===session.user.id)lock(false);
}
function changed(){if(restoring||!engine?.ready)return;message('Änderungen noch nicht im Konto gesichert.');$('reserveAccountStatus').dataset.phase='pending';if($('reserveAccountBadge'))$('reserveAccountBadge').textContent=(config.trial?'Testbetrieb · ':'')+'Änderungen noch nicht im Konto gesichert';clearTimeout(timer);timer=setTimeout(()=>engine.save(),1500);}
async function run(action){try{await action();}catch{message('Aktion fehlgeschlagen. Deine lokalen Daten bleiben erhalten.');}}
async function mount(){
 profile=$('profile');if(!profile||$('reserveAccountCard'))return;
 local=window.RESERVE_ACCOUNT_STORAGE.createLocal();
 const style=document.createElement('style');style.textContent='.reserve-account-locked main,.reserve-account-locked header{visibility:hidden!important}#reserveAccountLock{position:fixed;inset:0;z-index:100000;background:#f5f3ec;overflow:auto;padding:24px}#reserveAccountLock[hidden]{display:none}#reserveAccountLock .card{max-width:600px;margin:30px auto}#reserveAccountCard input{box-sizing:border-box;max-width:100%}#reserveAccountCard button{min-height:44px;margin:6px 6px 6px 0}';style.textContent+='#reserveAccountBadge{position:fixed;left:12px;bottom:12px;z-index:99990;max-width:calc(100vw - 110px);padding:10px 14px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:12px;border-radius:12px}';document.head.append(style);
 modal=document.createElement('section');modal.id='reserveAccountLock';modal.hidden=true;modal.setAttribute('aria-label','Konto anmelden');document.body.append(modal);
 card=document.createElement('section');card.id='reserveAccountCard';card.className='card';card.innerHTML=`${config.trial?'<h2>Kontospeicherung · Testbetrieb</h2><p><strong>Die vollständige Wiederherstellung wird noch geprüft.</strong> Vor dem Test bitte Vorrat und Rezepte einschließlich Fotos als Dateien sichern. Browserdaten erst löschen, wenn eine unabhängige Sicherung vorhanden ist.</p>':'<h2>Dein RESERVE-Konto</h2>'}<p>Angemeldet werden Vorrat, eigene Rezepte, Entwürfe und gespeicherte Rezeptfotos automatisch im Konto gesichert. Nach dem Löschen der Browserdaten zuerst wieder anmelden. Änderungen ohne Verbindung sind zunächst nur auf diesem Gerät.</p><p id="reserveAccountIdentity"></p><form id="reserveAccountAuth"><label for="reserveAccountEmail">E-Mail-Adresse</label><input id="reserveAccountEmail" type="email" autocomplete="username" required><label for="reserveAccountPassword">Passwort</label><input id="reserveAccountPassword" type="password" autocomplete="current-password" minlength="12" required><button type="submit">Anmelden</button><button type="button" id="reserveAccountRegister" class="secondary">Konto erstellen</button><button type="button" id="reserveAccountReset" class="secondary">Passwort vergessen</button></form><form id="reserveAccountRecovery" hidden><label for="reserveAccountNewPassword">Neues Passwort</label><input id="reserveAccountNewPassword" type="password" autocomplete="new-password" minlength="12" required><button type="submit">Passwort ändern</button></form><p id="reserveAccountStatus" role="status" aria-live="polite">Anmeldung wird vorbereitet …</p><button id="reserveAccountSave" hidden>Jetzt sichern</button><button id="reserveAccountAdopt" hidden>Gerätedaten übernehmen</button><button id="reserveAccountPull" class="secondary" hidden>Kontostand auf dieses Gerät laden</button><button id="reserveAccountRetry" class="secondary" hidden>Neu abgleichen</button><button id="reserveAccountLogout" class="secondary" hidden>Abmelden und lokalen Kontostand entfernen</button>`;profile.append(card);
 const badge=document.createElement('button');badge.id='reserveAccountBadge';badge.type='button';badge.textContent=config.trial?'Kontospeicherung · Testbetrieb':'Nur auf diesem Gerät';badge.onclick=()=>{if(typeof window.show==='function')window.show('profile');card.scrollIntoView({block:'center'});};document.body.append(badge);
 engine=new window.RESERVE_ACCOUNT_CORE.AccountSync({local,validateState:value=>window.RESERVE_SYNC.validate(value),notify:render});
 if(local.getMeta()?.ownerId)lock(true);
 try{
  const sdk=await configuredSDK();if(config.trial&&typeof window.show==='function')window.show('profile');client=sdk.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'reserveAccountSessionV1',flowType:'pkce'}});
  $('reserveAccountAuth').onsubmit=e=>{e.preventDefault();run(async()=>{const {data,error}=await client.auth.signInWithPassword({email:$('reserveAccountEmail').value.trim(),password:$('reserveAccountPassword').value});$('reserveAccountPassword').value='';if(error)throw error;await connect(data.session);});};
  $('reserveAccountRegister').onclick=()=>run(async()=>{if(!$('reserveAccountAuth').reportValidity())return;const {error}=await client.auth.signUp({email:$('reserveAccountEmail').value.trim(),password:$('reserveAccountPassword').value,options:{emailRedirectTo:location.origin+location.pathname}});$('reserveAccountPassword').value='';if(error)throw error;message('Bitte die E-Mail prüfen und dein Konto bestätigen.');});
  $('reserveAccountReset').onclick=()=>run(async()=>{const email=$('reserveAccountEmail');if(!email.reportValidity())return;const {error}=await client.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:location.origin+location.pathname});if(error)throw error;message('Falls ein Konto besteht, erhältst du eine E-Mail zum Zurücksetzen.');});
  $('reserveAccountRecovery').onsubmit=e=>{e.preventDefault();run(async()=>{const {error}=await client.auth.updateUser({password:$('reserveAccountNewPassword').value});$('reserveAccountNewPassword').value='';if(error)throw error;$('reserveAccountRecovery').hidden=true;recovering=false;await connect((await client.auth.getSession()).data.session);});};
  $('reserveAccountSave').onclick=()=>run(()=>engine.save());
  $('reserveAccountAdopt').onclick=()=>run(async()=>{if(!confirm('Diesen Gerätestand im Konto speichern? Ein vorhandener anderer Kontostand wird ersetzt. Vorher bei Bedarf eine Dateisicherung erstellen.'))return;await engine.adopt(engine.phase==='empty-blocked');});
  $('reserveAccountPull').onclick=()=>run(async()=>{if(!confirm('Kontostand laden und die Daten auf diesem Gerät ersetzen? Nicht gesicherte lokale Änderungen gehen verloren.'))return;const row=await engine.transport.get();if(row)await engine.restore(row);});
  $('reserveAccountRetry').onclick=()=>run(()=>connect(currentSession));
  $('reserveAccountLogout').onclick=()=>run(async()=>{
   if(engine.busy){message('Bitte warten, bis die Sicherung abgeschlossen ist.');return;}
   if(!confirm('Abmelden und die lokale Kontokopie entfernen? Nicht gesicherte Änderungen vorher als Datei sichern.'))return;
   const owned=local.getMeta()?.ownerId===activeOwner;engine.stop();clearTimeout(timer);const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;if(owned)await local.clear();location.reload();
  });
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY'){recovering=true;engine.stop();currentSession=session;$('reserveAccountAuth').hidden=true;$('reserveAccountRecovery').hidden=false;lock(true);message('Bitte ein neues Passwort festlegen.');return;}
   if(event==='SIGNED_OUT'){engine.stop();currentSession=null;$('reserveAccountAuth').hidden=false;$('reserveAccountLogout').hidden=true;if(local.getMeta()?.ownerId)lock(true);return;}
   if(['SIGNED_IN','TOKEN_REFRESHED'].includes(event))setTimeout(()=>run(()=>connect(session)),0);
  });
  await connect((await client.auth.getSession()).data.session);
  const nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
  const watched=k=>window.RESERVE_ACCOUNT_CORE.KEYS.includes(k)||k==='reservePersonalRecipeDraftsV1'||k.startsWith('reserveCookProgress:');
  Storage.prototype.setItem=function(k,v){const result=nativeSet.call(this,k,v);if(this===localStorage&&watched(String(k)))changed();return result;};
  Storage.prototype.removeItem=function(k){const result=nativeRemove.call(this,k);if(this===localStorage&&watched(String(k)))changed();return result;};
  window.addEventListener('reserve:personal-photo-changed',changed);window.addEventListener('online',()=>run(()=>connect(currentSession)));
  window.addEventListener('storage',e=>{if(e.key&&watched(e.key))changed();});
 }catch{message('Kontoverbindung derzeit nicht verfügbar. Es wurde nichts hochgeladen.');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
