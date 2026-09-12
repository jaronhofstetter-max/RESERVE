/* RESERVE barcode lookup resilience v2.0 — instant local hits, short hard timeout, parallel providers and durable response cache. */
(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  const OFF_RE=/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/([^/?]+)\.json(?:\?(.*))?$/i;
  const TIMEOUT_MS=2200;
  const HARD_TIMEOUT_MS=2500;
  const CACHE_KEY='reserveBarcodeLookupCacheV1';
  const CACHE_TTL_MS=30*24*60*60*1000;
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
  function readCache(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
  function cachedProduct(code){const row=readCache()[String(code||'')];if(!row||!row.data||Date.now()-Number(row.savedAt||0)>CACHE_TTL_MS)return null;return row.data}
  function cacheProduct(code,data){if(!data?.product)return;try{const cache=readCache();cache[String(code)]={savedAt:Date.now(),data};const keys=Object.keys(cache);if(keys.length>500)keys.sort((a,b)=>(cache[a].savedAt||0)-(cache[b].savedAt||0)).slice(0,keys.length-500).forEach(k=>delete cache[k]);localStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch{}}

  async function fetchWithTimeout(url,init){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{return await originalFetch(url,{...(init||{}),signal:controller.signal,cache:'default'})}
    finally{clearTimeout(timer)}
  }

  async function productResponse(code,query,init){
    const local=localProduct(code)||cachedProduct(code);
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
        if(data?.status===1&&data?.product){cacheProduct(code,data);return data}
        throw Object.assign(new Error('product-not-found'),{data});
      }catch(error){lastError=error;throw error}
    });
    const hardTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('lookup-hard-timeout')),HARD_TIMEOUT_MS));
    try{return response(await Promise.race([Promise.any(attempts),hardTimeout]))}
    catch(_){if(firstValid)return response(firstValid);throw lastError||new Error('Barcode lookup unavailable')}
  }

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:input?.url;
    const match=url&&url.match(OFF_RE);
    if(!match)return originalFetch(input,init);
    return productResponse(match[1],match[2]||'',init);
  };

  window.RESERVE_BARCODE_LOOKUP_RESILIENCE={version:'2.0',timeoutMs:TIMEOUT_MS,hardTimeoutMs:HARD_TIMEOUT_MS,localProduct,cachedProduct,swissProductCount:Object.keys(SWISS_PRODUCTS).length};
})();