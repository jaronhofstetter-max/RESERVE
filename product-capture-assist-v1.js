/* RESERVE product capture assist v1.0 — fills missing quantity from visible text and proposes packaging conservatively. */
(function(){'use strict';
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/,/g,'.').replace(/\s+/g,' ').trim();
const TYPES=['Packung','Beutel','Becher','Flasche','Dose','Glas','Karton','Schachtel','Tube','Rolle','Stück'];
function amount(value,unit){value=Number(value);unit=String(unit).toLowerCase();if(unit==='cl')return `${value*10} ml`;if(unit==='dl')return `${value*100} ml`;return `${value} ${unit}`}
function quantityFromText(text){
  const s=clean(text).replace(/[×xX*]/g,' × ');let m=s.match(/(?:^|\D)(\d{1,2})\s*×\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i);
  if(m){const each=amount(m[2],m[3]);return `${Number(m[1])} × ${each}`}
  m=s.match(/(?:netto|net weight|poids net|peso netto|inhalt|contenu|content)?\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i);
  if(m)return amount(m[1],m[2]);
  m=s.match(/(?:^|\D)(\d{1,3})\s*(stück|stuck|stk\.?|pieces?|pcs?\.?)(?:\D|$)/i);
  return m?`${Number(m[1])} Stück`:'';
}
function packagingText(p){return clean([p?.packaging,p?.packaging_text,p?.packaging_tags?.join?.(' '),p?.packagings?.map?.(x=>[x.shape,x.material].join(' ')).join(' ')].filter(Boolean).join(' ')).toLowerCase()}
function packagingFromProduct(p,name=''){
  const meta=packagingText(p),n=clean(name).toLowerCase(),rules=[
    ['Glas',/\b(glass|glas|jar|bocal|verre)\b/],['Flasche',/\b(bottle|flasche|bouteille|bottiglia)\b/],
    ['Dose',/\b(can|tin|dose|bo[iî]te|lattina)\b/],['Becher',/\b(cup|tub|becher|pot|gobelet)\b/],
    ['Beutel',/\b(bag|pouch|sachet|beutel|tüte|tuete)\b/],['Karton',/\b(carton|tetra\s?pak|brick)\b/],
    ['Schachtel',/\b(box|schachtel)\b/],['Tube',/\btube\b/],['Rolle',/\b(roll|rolle)\b/]
  ];
  for(const [type,re] of rules)if(re.test(meta))return{type,confidence:.95,source:'Produktdaten'};
  const inferred=window.RESERVE_CONTAINER_UNITS?.typeFor?.(name,'');
  if(inferred&&TYPES.includes(inferred))return{type:inferred,confidence:.65,source:'Produktname'};
  if(/honig|marmelade|konfitüre|konfiture|pesto/.test(n))return{type:'Glas',confidence:.7,source:'Produktname'};
  return{type:'Packung',confidence:.45,source:'Standard'};
}
function show(message){let el=$('productCaptureAssistStatus');if(!el){const anchor=$('scanContainerType')?.closest('label')||$('scanQty');if(!anchor)return;el=document.createElement('div');el.id='productCaptureAssistStatus';el.className='small muted';el.style.marginTop='5px';anchor.insertAdjacentElement('afterend',el)}el.textContent=message}
function applyQuantity(text,source='Foto'){const input=$('scanQty');if(!input||input.value.trim())return'';const q=quantityFromText(text);if(!q)return'';input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));show(`Menge aus ${source} vorgeschlagen: ${q} – bitte prüfen.`);return q}
function applyPackaging(suggestion){const sel=$('scanContainerType');if(!sel||!suggestion?.type||sel.dataset.touched)return false;sel.value=suggestion.type;sel.dataset.suggested='1';show(`Verpackung vorgeschlagen: ${suggestion.type} (${Math.round(suggestion.confidence*100)} %, ${suggestion.source}) – bitte prüfen.`);return true}
function applyProduct(p,name){const q=quantityFromText([p?.quantity,p?.product_name,p?.product_name_de,p?.packaging].filter(Boolean).join(' '));if(q)applyQuantity(q,'Produktdaten');const packaging=packagingFromProduct(p,name);applyPackaging(packaging);return{quantity:q,packaging}}
function applyOCR(text){return applyQuantity(text,'Foto')}
window.RESERVE_PRODUCT_CAPTURE_ASSIST={version:'1.0',quantityFromText,packagingFromProduct,applyProduct,applyPackaging,applyOCR};
function hookLearning(){const api=window.RESERVE_EXPIRY_LEARNING;if(!api?.stage||api.stage.__productAssist)return setTimeout(hookLearning,120);const original=api.stage;function wrapped(file,result){if(result?.raw)applyOCR(result.raw);return original(file,result)}wrapped.__productAssist=true;api.stage=wrapped}
if(typeof document!=='undefined')hookLearning();
})();
