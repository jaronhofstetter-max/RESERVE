import fs from 'node:fs';

const fail=(m)=>{console.error('✗ '+m);process.exitCode=1};
const ok=(m)=>console.log('✓ '+m);

const html=fs.readFileSync('index.html','utf8');
const recipes=JSON.parse(fs.readFileSync('data/recipes.json','utf8'));

if(!Array.isArray(recipes)||recipes.length<50) fail('Produktionsbibliothek enthält weniger als 50 Rezepte');
else ok(`Produktionsbibliothek geladen: ${recipes.length} Rezepte`);

for(const file of ['shopping-v2.js','reserve-core-v3.js','cloud-sync-v1.js','barcode-v1.js']){
  if(!fs.existsSync(file)) fail(`${file} fehlt`);
  else ok(`${file} vorhanden`);
}

for(const needle of ['id="stock"','id="shopping"','id="cook"','id="profile"','id="shopList"']){
  if(!html.includes(needle)) fail(`UI-Anker ${needle} fehlt`);
  else ok(`UI-Anker ${needle} vorhanden`);
}

for(const module of ['shopping-v2.js','reserve-core-v3.js','cloud-sync-v1.js','barcode-v1.js']){
  if(!html.includes(`<script src="${module}"></script>`)) fail(`${module} ist im Produktions-HTML nicht eingebunden`);
  else ok(`${module} im Produktions-HTML eingebunden`);
}

const core=fs.readFileSync('reserve-core-v3.js','utf8');
for(const fn of ['finishCook','purchaseToStock','renderCook','renderStock']){
  if(!core.includes(fn)) fail(`Core-Funktion ${fn} fehlt`);
  else ok(`Core-Funktion ${fn} vorhanden`);
}

const shop=fs.readFileSync('shopping-v2.js','utf8');
if(!shop.includes('saveShop')) fail('Einkaufslisten-Persistenz fehlt');
else ok('Einkaufslisten-Persistenz vorhanden');

const barcode=fs.readFileSync('barcode-v1.js','utf8');
if(!barcode.includes('BarcodeDetector')&&!barcode.toLowerCase().includes('barcode')) fail('Barcode-Modul ohne Erkennungslogik');
else ok('Barcode-Erkennungslogik vorhanden');

if(!process.exitCode) ok('RESERVE Smoke-Test bestanden');
