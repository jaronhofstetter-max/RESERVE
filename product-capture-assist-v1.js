/* RESERVE product capture assist v1.5 — wrinkle-tolerant MHD capture plus product-photo quantity OCR. */
(function(){'use strict';
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/,/g,'.').replace(/\s+/g,' ').trim();
const TYPES=['Packung','Beutel','Becher','Flasche','Dose','Glas','Karton','Schachtel','Tube','Rolle','Stück'];
const PACKAGING_RULES=[
  ['Glas',/\b(glass|glas|jar|bocal|verre|vasetto)\b/i],
  ['Flasche',/\b(bottle|flasche|bouteille|bottiglia)\b/i],
  ['Dose',/\b(can|tin|dose|bo[iî]te|lattina)\b/i],
  ['Becher',/\b(cup|tub|becher|pot|gobelet|vaschetta)\b/i],
  ['Beutel',/\b(bag|pouch|sachet|beutel|tüte|tuete|sacchetto)\b/i],
  ['Karton',/\b(carton|karton|tetra\s?pak|brick)\b/i],
  ['Schachtel',/\b(box|schachtel|bo[iî]te en carton)\b/i],
  ['Tube',/\b(tube|tubetto)\b/i],
  ['Rolle',/\b(roll|rolle|rouleau|rotolo)\b/i]
];
let productOCRPromise=null;
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
function packagingFromText(text,source='Foto-Text',confidence=.82){
  const value=clean(text).toLowerCase();
  for(const [type,re] of PACKAGING_RULES)if(re.test(value))return{type,confidence,source};
  return null;
}
function packagingFromProduct(p,name=''){
  const meta=packagingText(p),n=clean(name).toLowerCase(),fromMetadata=packagingFromText(meta,'Produktdaten',.95);
  if(fromMetadata)return fromMetadata;
  const inferred=window.RESERVE_CONTAINER_UNITS?.typeFor?.(name,'');
  if(inferred&&TYPES.includes(inferred))return{type:inferred,confidence:.65,source:'Produktname'};
  if(/marmelade|konfitüre|konfiture|pesto/.test(n))return{type:'Glas',confidence:.7,source:'Produktname'};
  return{type:'',confidence:0,source:'keine sichere Angabe'};
}
function show(message){let el=$('productCaptureAssistStatus');if(!el){const anchor=$('scanContainerType')?.closest('label')||$('scanQty');if(!anchor)return;el=document.createElement('div');el.id='productCaptureAssistStatus';el.className='small muted';el.style.marginTop='5px';anchor.insertAdjacentElement('afterend',el)}el.textContent=message}
function applyQuantity(text,source='Foto'){const input=$('scanQty');if(!input||input.value.trim())return'';const q=quantityFromText(text);if(!q)return'';input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));show(`Menge aus ${source} vorgeschlagen: ${q} – bitte prüfen.`);return q}
function applyPackaging(suggestion){const sel=$('scanContainerType');if(!sel||!suggestion?.type||sel.dataset.touched||sel.dataset.knowledgeCode)return false;const confidence=Number(suggestion.confidence)||0;if(confidence<.6){show(`Verpackung nicht sicher erkannt (${Math.round(confidence*100)} %). Bitte auswählen.`);return false}sel.value=suggestion.type;sel.dataset.suggested='1';sel.dataset.suggestionConfidence=String(confidence);const label=confidence>=.9?'erkannt':'vorgeschlagen';show(`Verpackung ${label}: ${suggestion.type} (${Math.round(confidence*100)} %, ${suggestion.source})${confidence<.9?' – bitte prüfen.':''}`);return true}
function applyProduct(p,name){const q=quantityFromText([p?.quantity,p?.product_name,p?.product_name_de,p?.packaging].filter(Boolean).join(' '));if(q)applyQuantity(q,'Produktdaten');const packaging=packagingFromProduct(p,name);applyPackaging(packaging);return{quantity:q,packaging}}
function applyOCR(text){const quantity=applyQuantity(text,'Foto'),packaging=packagingFromText(text);if(packaging)applyPackaging(packaging);return{quantity,packaging}}
function loadProductOCR(){if(window.Tesseract)return Promise.resolve(window.Tesseract);if(productOCRPromise)return productOCRPromise;productOCRPromise=new Promise((ok,no)=>{const existing=document.querySelector('script[src*="tesseract"]');if(existing){existing.addEventListener('load',()=>ok(window.Tesseract),{once:true});existing.addEventListener('error',no,{once:true});return}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.crossOrigin='anonymous';s.onload=()=>ok(window.Tesseract);s.onerror=no;document.head.appendChild(s)});return productOCRPromise}
async function nativeProductText(file){if(!('TextDetector'in window))return'';try{const bmp=await createImageBitmap(file),blocks=await(new TextDetector()).detect(bmp);bmp.close?.();return blocks.map(x=>x.rawValue||'').join(' ')}catch{return''}}
async function productCanvas(file){const bmp=await createImageBitmap(file),max=1200,scale=Math.min(1,max/Math.max(1,bmp.width)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bmp,0,0,c.width,c.height);bmp.close?.();return c}
async function readQuantityFromPhoto(file){const input=$('scanQty');if(!file||!input||input.value.trim())return'';show('Mengenangabe auf dem Produktbild wird gelesen …');let text=await nativeProductText(file),quantity=quantityFromText(text);if(!quantity){try{const T=await loadProductOCR(),canvas=await productCanvas(file),job=T?.recognize?.(canvas,'eng'),timeout=new Promise((_,no)=>setTimeout(()=>no(Error('product_ocr_timeout')),16000)),result=await Promise.race([job,timeout]);text=result?.data?.text||'';quantity=quantityFromText(text)}catch{}}if(input.value.trim())return'';if(quantity){applyQuantity(quantity,'Produktbild');return quantity}show('Keine Mengenangabe sicher erkannt – bitte Menge eintragen.');return''}
async function readQuantityFromUrl(url){if(!/^https:\/\//i.test(String(url||''))||$('scanQty')?.value?.trim())return'';try{const response=await fetch(url,{mode:'cors',credentials:'omit'});if(!response.ok)return'';const blob=await response.blob(),file=new File([blob],'reserve-product.jpg',{type:blob.type||'image/jpeg'});return await readQuantityFromPhoto(file)}catch{return''}}
const GUIDE={x:.14,y:.38,width:.72,height:.24};
function expiryGuide(container){
  container=container||$('scanCamera')||$('cameraPreview')||document.querySelector('[data-reserve-camera]');
  if(!container||container.querySelector?.('[data-reserve-expiry-guide]'))return null;
  const host=container.tagName==='VIDEO'?container.parentElement:container;if(!host)return null;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  const guide=document.createElement('div');guide.dataset.reserveExpiryGuide='1';guide.setAttribute('aria-hidden','true');
  Object.assign(guide.style,{position:'absolute',left:`${GUIDE.x*100}%`,top:`${GUIDE.y*100}%`,width:`${GUIDE.width*100}%`,height:`${GUIDE.height*100}%`,boxSizing:'border-box',border:'3px solid #72d59a',borderRadius:'12px',boxShadow:'0 0 0 9999px rgba(0,0,0,.2)',pointerEvents:'none',zIndex:'5'});
  const label=document.createElement('span');label.textContent='MHD vollständig in diesen Rahmen';
  Object.assign(label.style,{position:'absolute',left:'50%',bottom:'calc(100% + 8px)',transform:'translateX(-50%)',padding:'5px 9px',borderRadius:'8px',background:'rgba(0,0,0,.76)',color:'#fff',font:'600 12px system-ui',whiteSpace:'nowrap'});
  guide.appendChild(label);host.appendChild(guide);return guide;
}
function qualityFromPixels(data,width,height){let light=0,lightSq=0,edges=0,n=0;const step=Math.max(1,Math.floor(Math.sqrt(width*height/45000))),tileCols=4,tileRows=3,tileEdges=new Float32Array(tileCols*tileRows),tileCounts=new Uint32Array(tileCols*tileRows);for(let y=0;y<height-step;y+=step)for(let x=0;x<width-step;x+=step){const i=(y*width+x)*4,ix=i+step*4,iy=i+step*width*4,g=data[i]*.299+data[i+1]*.587+data[i+2]*.114,gx=Math.abs(g-(data[ix]*.299+data[ix+1]*.587+data[ix+2]*.114)),gy=Math.abs(g-(data[iy]*.299+data[iy+1]*.587+data[iy+2]*.114)),edge=gx+gy,tile=Math.min(tileRows-1,Math.floor(y/height*tileRows))*tileCols+Math.min(tileCols-1,Math.floor(x/width*tileCols));light+=g;lightSq+=g*g;edges+=edge;n++;tileEdges[tile]+=edge;tileCounts[tile]++}const brightness=n?light/n:0,contrast=n?Math.sqrt(Math.max(0,lightSq/n-brightness*brightness)):0,sharpness=n?edges/n:0,tileSharpness=Array.from(tileEdges,(sum,i)=>tileCounts[i]?sum/tileCounts[i]:0).sort((a,b)=>a-b),detailSharpness=tileSharpness[Math.max(0,Math.floor(tileSharpness.length*.75))]||0,minSharpness=contrast>=35?7:contrast>=20?9:11,printDetail=contrast>=18&&detailSharpness>=minSharpness*1.08,issues=[];if(brightness<45)issues.push('zu dunkel');if(brightness>235)issues.push('überbelichtet');if(sharpness<minSharpness&&!printDetail)issues.push('unscharf');return{brightness:Math.round(brightness),contrast:Math.round(contrast*10)/10,sharpness:Math.round(sharpness*10)/10,detailSharpness:Math.round(detailSharpness*10)/10,minSharpness,printDetail,acceptable:issues.length===0,issues}}
function regionQuality(canvas){const c=canvas.getContext('2d',{willReadFrequently:true}),{data}=c.getImageData(0,0,canvas.width,canvas.height);return qualityFromPixels(data,canvas.width,canvas.height)}
function captureExpiryRegion(video,options={}){
  if(!video?.videoWidth||!video?.videoHeight)throw new Error('Kamerabild ist noch nicht bereit.');
  const region=options.region||GUIDE,sx=Math.round(region.x*video.videoWidth),sy=Math.round(region.y*video.videoHeight),sw=Math.round(region.width*video.videoWidth),sh=Math.round(region.height*video.videoHeight);
  const maxWidth=Number(options.maxWidth)||1600,scale=Math.min(1,maxWidth/sw),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
  canvas.getContext('2d').drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);const quality=regionQuality(canvas),dataUrl=canvas.toDataURL('image/jpeg',Number(options.quality)||.94);
  const result={dataUrl,quality,region:{x:sx,y:sy,width:sw,height:sh},capturedAt:new Date().toISOString()};
  if(options.emit!==false)window.dispatchEvent(new CustomEvent('reserve:expiry-region',{detail:result}));return result;
}
function guideMessage(result){const q=result?.quality;if(!q)return'';const message=q.acceptable?`MHD-Nahaufnahme bereit (Schärfe ${q.sharpness}).`:`Bitte erneut fotografieren: ${q.issues.join(', ')}.`;show(message);return message}
window.RESERVE_PRODUCT_CAPTURE_ASSIST={version:'1.6',quantityFromText,packagingFromText,packagingFromProduct,applyProduct,applyPackaging,applyOCR,readQuantityFromPhoto,readQuantityFromUrl,nativeProductText,expiryGuide,captureExpiryRegion,regionQuality,qualityFromPixels,guideMessage,expiryGuideRegion:{...GUIDE}};
function hookProductImage(){const result=$('barcodeResult');if(!result)return setTimeout(hookProductImage,120);new MutationObserver(()=>{const image=result.querySelector('.reserve-scan-visual img');if(!image||image.dataset.quantityOcr||$('scanQty')?.value?.trim())return;image.dataset.quantityOcr='1';readQuantityFromUrl(image.currentSrc||image.src)}).observe(result,{childList:true,subtree:true})}
function hookLearning(){const api=window.RESERVE_EXPIRY_LEARNING;if(!api?.stage||api.stage.__productAssist)return setTimeout(hookLearning,120);const original=api.stage;function wrapped(file,result){if(result?.raw)applyOCR(result.raw);return original(file,result)}wrapped.__productAssist=true;api.stage=wrapped}
if(typeof document!=='undefined'){hookLearning();hookProductImage()}
})();
