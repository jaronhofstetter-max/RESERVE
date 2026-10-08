import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('data/retailer-catalog.json','utf8'));
if(catalog.products?.length){const html=fs.readFileSync('index.html','utf8'),script='<script src="retailer-catalog-v1.js?v=20261008-retailers-1"></script>';if(!html.includes('src="retailer-catalog-v1.js'))fs.writeFileSync('index.html',html.replace('</body>',script+'</body>'));console.log(`Enabled ${catalog.products.length} reviewed retailer products`)}else console.log('No approved retailer products; no new browser requests enabled');
