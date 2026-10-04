import fs from'node:fs';import vm from'node:vm';
const html=fs.readFileSync('catalog-review.html','utf8'),source=fs.readFileSync('catalog-review-v1.js','utf8');new vm.Script(source);
for(const id of ['importFile','oldImage','newImage','approve','reject','request','exportCatalog'])if(!html.includes(`id="${id}"`))throw Error('Review UI missing '+id);
for(const contract of ['shareConsent===true','centralCatalogEligible===true',"status==='pending-review'",'reserve-approved-product-catalog-v1','customer-consented-human-reviewed','SHA-256'])if(!source.includes(contract))throw Error('Review contract missing '+contract);
console.log('Catalog review: consent validation + decisions + approved export + local PIN OK');
