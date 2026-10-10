/* One compact scan assignment; corrections are scoped to the scanned barcode. */
(function(){'use strict';
if(window.RESERVE_SCAN_IDENTITY)return;
const $=id=>document.getElementById(id);let key='',touched=false;
function current(){const name=$('scanName')?.value?.trim()||'',code=($('barcodeInput')?.value||'').replace(/\D/g,'');return{name,code}}
function assignment(){const input=$('scanIngredient'),row=current();if(!input||key!==row.code+'|'+row.name)return null;const ingredient=input.value.trim();return ingredient?{ingredient,source:touched?'scan-ingredient-correction':input.dataset.source||'scan-name-identity'}:null}
function update(force=false){const row=current(),next=row.code+'|'+row.name,input=$('scanIngredient');if(!input)return;
 if(!force&&next===key)return;
 key=next;touched=false;const known=window.RESERVE_PRODUCT_KNOWLEDGE?.recognize?.({barcode:row.code,n:row.name}),detected=window.RESERVE_PRODUCT_IDENTITY?.analyze(row.name);
 // Changing the name makes a prior barcode assignment inapplicable until saved.
 const saved=known?.product?.name===row.name&&known?.ingredient?.state==='confirmed'?known.ingredient.value:'';
 input.value=saved||detected?.ingredient||'';input.dataset.source=saved?'confirmed-barcode-identity':'scan-name-identity';
 const choices=$('scanIngredientChoices');choices.replaceChildren();
 for(const name of detected?.state==='ambiguous'?detected.candidates:[]){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=name;b.onclick=()=>{input.value=name;touched=true;choices.replaceChildren();window.RESERVE_SCAN_CONFIDENCE?.render?.()};choices.appendChild(b)}
 $('scanIngredientBox').hidden=!row.name;window.RESERVE_SCAN_CONFIDENCE?.render?.();
}
function install(){const name=$('scanName');if(!name||!window.RESERVE_PRODUCT_IDENTITY)return setTimeout(install,120);if($('scanIngredient'))return;
 const box=document.createElement('div');box.id='scanIngredientBox';box.hidden=true;box.style.cssText='margin:10px 0';
 const label=document.createElement('label');label.textContent='Lebensmittel';const input=document.createElement('input');input.id='scanIngredient';input.setAttribute('list','scanIngredientOptions');input.placeholder='z. B. Fusilli';input.autocomplete='off';label.appendChild(input);box.appendChild(label);
 const list=document.createElement('datalist');list.id='scanIngredientOptions';for(const value of RESERVE_PRODUCT_IDENTITY.options()){const o=document.createElement('option');o.value=value;list.appendChild(o)}box.appendChild(list);
 const choices=document.createElement('div');choices.id='scanIngredientChoices';choices.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:6px';box.appendChild(choices);
 name.closest('.grid2')?.after(box);input.addEventListener('input',()=>{touched=true;choices.replaceChildren();window.RESERVE_SCAN_CONFIDENCE?.render?.()});
 for(const id of ['scanName','barcodeInput'])for(const event of ['input','change'])$(id)?.addEventListener(event,()=>update());
 const result=$('barcodeResult');if(result)new MutationObserver(()=>update()).observe(result,{childList:true,subtree:true});
 window.addEventListener('reserve:barcode-product-found',()=>update());window.addEventListener('reserve:product-knowledge-changed',()=>{if(!touched)update(true)});update();
}
window.RESERVE_SCAN_IDENTITY={version:'1.0',assignment,update,install};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
