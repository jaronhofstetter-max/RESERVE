/* RESERVE barcode lookup resilience v1.0 — timeout + Swiss Open Food Facts fallback without changing barcode UI logic. */
(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  const OFF_RE=/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/([^/?]+)\.json(?:\?(.*))?$/i;
  const TIMEOUT_MS=5500;

  async function fetchWithTimeout(url,init){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{
      return await originalFetch(url,{...(init||{}),signal:controller.signal});
    }finally{clearTimeout(timer)}
  }

  async function productResponse(code,query,init){
    const q=query?'?'+query:'';
    const urls=[
      `https://world.openfoodfacts.org/api/v2/product/${code}.json${q}`,
      `https://ch.openfoodfacts.org/api/v2/product/${code}.json${q}`,
      `https://world.openfoodfacts.org/api/v0/product/${code}.json${q}`
    ];
    let firstValid=null,lastError=null;
    const attempts=urls.map(async url=>{
      try{
        const response=await fetchWithTimeout(url,init);
        if(!response.ok)throw new Error('HTTP '+response.status);
        const data=await response.json();
        if(!firstValid)firstValid=data;
        if(data?.status===1&&data?.product)return data;
        throw Object.assign(new Error('product-not-found'),{data});
      }catch(error){lastError=error;throw error}
    });
    try{
      const data=await Promise.any(attempts);
      return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
    }catch(_){
      if(firstValid)return new Response(JSON.stringify(firstValid),{status:200,headers:{'content-type':'application/json'}});
      throw lastError||new Error('Barcode lookup unavailable');
    }
  }

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:input?.url;
    const match=url&&url.match(OFF_RE);
    if(!match)return originalFetch(input,init);
    return productResponse(match[1],match[2]||'',init);
  };

  window.RESERVE_BARCODE_LOOKUP_RESILIENCE={version:'1.0',timeoutMs:TIMEOUT_MS};
})();
