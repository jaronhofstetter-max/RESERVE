/* Only locally published, reviewed retailer products; no retailer scraping or external API calls. */
(function(){'use strict';if(window.RESERVE_RETAILER_CATALOG)return;let products=new Map();
const lookup=code=>products.get(String(code||'').replace(/\D/g,''))||null;
const ready=fetch('data/retailer-catalog.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.schema!==1||!Array.isArray(data.products))return;for(const p of data.products){if(!p.rights?.commercialDisplay||!p.source?.evidence||!p.source?.url||!p.name||!p.gtin)continue;products.set(p.gtin,{code:p.gtin,name:p.name,brand:p.brand,qty:p.quantity,cat:p.category,containerType:p.containerType,image:p.rights.imageDisplay?p.image||'':'',source:p.source.name,sourceUrl:p.source.url,retailerProvenance:p.source,rights:p.rights})}}).catch(()=>{});
window.RESERVE_RETAILER_CATALOG={lookup,ready,count:()=>products.size};
})();
