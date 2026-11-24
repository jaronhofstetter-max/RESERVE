/* RESERVE: select the complete printed date line before gallery OCR. */
(function(){'use strict';
 let active=null,generation=0;
 function close(){generation++;if(active){active.bitmap?.close?.();active.dialog.remove();active=null;}}
 async function open(file,onRead){
  close();const run=generation,identity=()=>String(document.getElementById('barcodeInput')?.value||'')+'|'+String(document.getElementById('scanName')?.value||''),captured=identity();
  let bitmap;try{bitmap=await createImageBitmap(file);}catch{return;}
  if(run!==generation){bitmap.close?.();return;}
  const dialog=document.createElement('dialog');dialog.id='expiryRegionDialog';dialog.setAttribute('aria-labelledby','expiryRegionTitle');dialog.style.cssText='width:min(640px,94vw);max-height:94vh;overflow:auto;border:1px solid #73957a;border-radius:16px;padding:16px;background:#fffdf7;color:#173c30';
  dialog.innerHTML='<h2 id="expiryRegionTitle" style="margin-top:0">Datumszeile auswählen</h2><p>Ziehe einen Rahmen um die gesamte Datumszeile, einschliesslich aller Ziffern und des Hinweises MHD, BBD oder EXP.</p><p class="small muted">Mit Tastatur: Enter setzt einen Rahmen. Pfeile verschieben ihn, Umschalt und Pfeile ändern die Grösse.</p><canvas id="expiryRegionCanvas" tabindex="0" aria-label="Datumszeile markieren" style="display:block;max-width:100%;max-height:52vh;width:auto;height:auto;margin:auto;touch-action:none;outline:2px solid #73957a"></canvas><p id="expiryRegionHint" aria-live="polite">Noch kein Bereich markiert.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="expiryRegionRead" type="button" disabled>Datumsbereich lesen</button><button id="expiryRegionWhole" type="button" class="secondary">Ganzes Foto lesen</button><button id="expiryRegionCancel" type="button" class="secondary">Abbrechen</button></div>';
  document.body.appendChild(dialog);active={dialog,bitmap};
  const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),hint=dialog.querySelector('#expiryRegionHint'),read=dialog.querySelector('#expiryRegionRead');
  const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  let rect=null,start=null,busy=false;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const valid=()=>rect&&rect.w>=10&&rect.h>=6;
  function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);if(rect){ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);ctx.strokeStyle='#166b39';ctx.lineWidth=2;ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);}read.disabled=!valid();hint.textContent=valid()?'Bereich markiert. Sind alle Ziffern und der Datums-Hinweis enthalten?':'Noch kein vollständiger Bereich markiert.';}
  const point=e=>{const box=canvas.getBoundingClientRect();return{x:clamp((e.clientX-box.left)*canvas.width/box.width,0,canvas.width),y:clamp((e.clientY-box.top)*canvas.height/box.height,0,canvas.height)}};
  canvas.onpointerdown=e=>{start=point(e);rect=null;canvas.setPointerCapture(e.pointerId);e.preventDefault();draw()};
  canvas.onpointermove=e=>{if(!start)return;const end=point(e);rect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(start.x-end.x),h:Math.abs(start.y-end.y)};draw()};
  canvas.onpointerup=e=>{if(!start)return;const end=point(e);rect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(start.x-end.x),h:Math.abs(start.y-end.y)};start=null;draw()};
  canvas.onpointercancel=()=>{start=null;rect=null;draw()};
  canvas.onkeydown=e=>{if(e.key==='Enter'&&!rect){rect={x:canvas.width*.1,y:canvas.height*.35,w:canvas.width*.8,h:canvas.height*.3};e.preventDefault();draw();return;}if(!rect||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const dx=e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0,dy=e.key==='ArrowUp'?-5:e.key==='ArrowDown'?5:0;if(e.shiftKey){rect.w=clamp(rect.w+dx,10,canvas.width-rect.x);rect.h=clamp(rect.h+dy,6,canvas.height-rect.y);}else{rect.x=clamp(rect.x+dx,0,canvas.width-rect.w);rect.y=clamp(rect.y+dy,0,canvas.height-rect.h);}draw()};
  async function submit(whole){
   if(busy||(!whole&&!valid()))return;if(run!==generation||captured!==identity()){close();return;}busy=true;read.disabled=true;
   if(whole){close();return onRead(file);}
   const box={...rect},out=document.createElement('canvas'),sx=bitmap.width/canvas.width,sy=bitmap.height/canvas.height;
   // Round outwards: no deliberate trimming of the selected line or digits.
   const left=Math.floor(box.x*sx),top=Math.floor(box.y*sy),right=Math.min(bitmap.width,Math.ceil((box.x+box.w)*sx)),bottom=Math.min(bitmap.height,Math.ceil((box.y+box.h)*sy));
   const width=right-left,height=bottom-top,resize=Math.min(1,2000/Math.max(width,height));out.width=Math.max(1,Math.round(width*resize));out.height=Math.max(1,Math.round(height*resize));out.getContext('2d').drawImage(bitmap,left,top,width,height,0,0,out.width,out.height);
   const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
   if(run!==generation||captured!==identity()){if(run===generation)close();return;}
   if(!blob){busy=false;read.disabled=false;hint.textContent='Der Ausschnitt konnte nicht erstellt werden. Bitte erneut auswählen.';return;}
   close();return onRead(new File([blob],'reserve-datumszeile.png',{type:'image/png',lastModified:Date.now()}));
  }
  read.onclick=()=>submit(false);dialog.querySelector('#expiryRegionWhole').onclick=()=>submit(true);dialog.querySelector('#expiryRegionCancel').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
  draw();dialog.showModal();canvas.focus();
 }
 window.RESERVE_EXPIRY_REGION={open,close,version:'1.0'};
 window.addEventListener('pagehide',close);
})();
