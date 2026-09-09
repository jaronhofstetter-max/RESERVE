(()=>{
  'use strict';
  const REPO='jaronhofstetter-max/RESERVE';
  const ISSUE_URL=`https://github.com/${REPO}/issues/new`;

  function openFeedback(){
    const type=window.prompt('Was möchtest du melden?\n1 = Problem\n2 = Idee','1');
    if(type===null)return;
    const kind=String(type).trim()==='2'?'Idee':'Problem';
    const text=window.prompt(`${kind}: Beschreibe kurz, was du uns mitteilen möchtest.`,'');
    if(!text||!text.trim())return;
    const title=`[RESERVE ${kind}] ${text.trim().slice(0,70)}`;
    const body=[
      `**Typ:** ${kind}`,
      '',
      '**Beschreibung**',
      text.trim(),
      '',
      '---',
      `RESERVE Feedback · ${new Date().toISOString()}`,
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
    button.textContent='Problem melden / Idee senden';
    button.setAttribute('aria-label','Problem melden oder Idee senden');
    button.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9998;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:999px;border:1px solid currentColor;background:var(--card,#fff);color:inherit;font:inherit;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.12);cursor:pointer';
    button.addEventListener('click',openFeedback);
    document.body.appendChild(button);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
