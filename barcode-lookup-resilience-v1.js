/* RESERVE barcode lookup resilience v1.1 — timeout, Swiss fallback catalog and Open Food Facts redundancy. */
(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  const OFF_RE=/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/([^/?]+)\.json(?:\?(.*))?$/i;
  const TIMEOUT_MS=5500;
  const SWISS_PRODUCTS={
    '7616800460383':{
      code:'7616800460383',
      product_name_de:'M-Classic Berner Rösti',
      product_name:'M-Classic Berner Rösti',
      brands:'M-Classic',
      quantity:'250 g',
      product_quantity:250,
      product_quantity_unit:'g',
      categories:'Rösti, Kartoffelgerichte, Fertiggerichte',
      categories_tags:['de:rösti','de:kartoffelgerichte','de:fertiggerichte'],
      nutriments:{
        'energy-kcal_100g':130,
        proteins_100g:3,
        carbohydrates_100g:15,
        fat_100g:6,
        fiber_100g:1.8,
        salt_100g:0.8
      },
      reserve_source:'Migros / Migipedia verified'
    }
  };

  function response(data){return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})}
  function localProduct(code){const product=SWISS_PRODUCTS[String(code||'')];return product?{status:1,status_verbose:'product found',code:String(code),product}:null}

  async function fetchWithTimeout(url,init){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{return await originalFetch(url,{...(init||{}),signal:controller.signal})}
    finally{clearTimeout(timer)}
  }

  async function productResponse(code,query,init){
    const local=localProduct(code);
    if(local)return response(local);
    const q=query?'?'+query:'';
    const urls=[
      `https://world.openfoodfacts.org/api/v2/product/${code}.json${q}`,
      `https://ch.openfoodfacts.org/api/v2/product/${code}.json${q}`,
      `https://world.openfoodfacts.org/api/v0/product/${code}.json${q}`
    ];
    let firstValid=null,lastError=null;
    const attempts=urls.map(async url=>{
      try{
        const r=await fetchWithTimeout(url,init);
        if(!r.ok)throw new Error('HTTP '+r.status);
        const data=await r.json();
        if(!firstValid)firstValid=data;
        if(data?.status===1&&data?.product)return data;
        throw Object.assign(new Error('product-not-found'),{data});
      }catch(error){lastError=error;throw error}
    });
    try{return response(await Promise.any(attempts))}
    catch(_){if(firstValid)return response(firstValid);throw lastError||new Error('Barcode lookup unavailable')}
  }

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:input?.url;
    const match=url&&url.match(OFF_RE);
    if(!match)return originalFetch(input,init);
    return productResponse(match[1],match[2]||'',init);
  };

  window.RESERVE_BARCODE_LOOKUP_RESILIENCE={version:'1.1',timeoutMs:TIMEOUT_MS,localProduct,swissProductCount:Object.keys(SWISS_PRODUCTS).length};
})();
