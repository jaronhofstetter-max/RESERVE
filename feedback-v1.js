(()=>{
  'use strict';
  const REPO='jaronhofstetter-max/RESERVE';
  const ISSUE_URL=`https://github.com/${REPO}/issues/new`;

  function openFeedback(){
    const type=window.prompt('Wie lief RESERVE gerade?\n1 = Etwas hat mich gestört\n2 = Idee / Wunsch\n3 = Hat gut funktioniert','1');
    if(type===null)return;
    const choice=String(type).trim();
    const kind=choice==='2'?'Idee':choice==='3'?'Lob':'Problem';
    const question=kind==='Problem'
      ?'Wo bist du hängen geblieben oder was war unnötig mühsam?'
      :kind==='Idee'?'Was würde dir RESERVE im Alltag noch leichter machen?'
      :'Was hat für dich besonders gut funktioniert?';
    const text=window.prompt(question,'');
    if(!text||!text.trim())return;
    const area=window.prompt('Wo war das? (z.B. Start, Barcode, Vorrat, Rezepte, Einkauf)','');
    const title=`[RESERVE Pilot ${kind}] ${text.trim().slice(0,65)}`;
    const body=[
      `**Typ:** ${kind}`,
      `**Bereich:** ${(area||'Nicht angegeben').trim()||'Nicht angegeben'}`,
      '',
      '**Beobachtung**',
      text.trim(),
      '',
      '---',
      `RESERVE Pilot-Feedback · ${new Date().toISOString()}`,
      `Viewport: ${window.innerWidth}×${window.innerHeight}`,
      `Browser: ${navigator.userAgent}`
    ].join('\n');
    const url=`${ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url,'_blank','noopener,noreferrer');
  }

  function mount(){
    if(document.getElementById('reserve-feedback-button'))return;
    const button=document.createElement('button');
    button.id='reserve-feedback-button';
    button.type='button';
    button.textContent='Feedback';
    button.setAttribute('aria-label','Feedback zur Nutzung von RESERVE senden');
    button.style.cssText='position:fixed;right:12px;bottom:max(76px,calc(12px + env(safe-area-inset-bottom)));z-index:9998;max-width:calc(100vw - 24px);padding:9px 13px;border-radius:999px;border:1px solid currentColor;background:var(--card,#fff);color:inherit;font:inherit;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.12);cursor:pointer';
    button.addEventListener('click',openFeedback);
    document.body.appendChild(button);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
