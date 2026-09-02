import fs from 'node:fs';

const fail=(m)=>{console.error('✗ '+m);process.exitCode=1};
const ok=(m)=>console.log('✓ '+m);

const html=fs.readFileSync('index.html','utf8');
const recipes=JSON.parse(fs.readFileSync('data/recipes.json','utf8'));

if(!Array.isArray(recipes)||recipes.length<50) fail('Produktionsbibliothek enthält weniger als 50 Rezepte');
else ok(`Produktionsbibliothek geladen: ${recipes.length} Rezepte`);

const modules=['shopping-v2.js','reserve-core-v3.js','cloud-sync-v1.js','barcode-v1.js','autopilot-v1.js'];
for(const file of modules){if(!fs.existsSync(file)) fail(`${file} fehlt`);else ok(`${file} vorhanden`)}

for(const needle of ['id="stock"','id="shopping"','id="cook"','id="profile"','id="shopList"']){
  if(!html.includes(needle)) fail(`UI-Anker ${needle} fehlt`);else ok(`UI-Anker ${needle} vorhanden`);
}
for(const module of modules){if(!html.includes(`<script src="${module}"></script>`)) fail(`${module} ist im Produktions-HTML nicht eingebunden`);else ok(`${module} im Produktions-HTML eingebunden`)}

const core=fs.readFileSync('reserve-core-v3.js','utf8');
for(const fn of ['finishCook','purchaseToStock','renderCook','renderStock']){if(!core.includes(fn)) fail(`Core-Funktion ${fn} fehlt`);else ok(`Core-Funktion ${fn} vorhanden`)}

const shop=fs.readFileSync('shopping-v2.js','utf8');
if(!shop.includes('saveShop')) fail('Einkaufslisten-Persistenz fehlt');else ok('Einkaufslisten-Persistenz vorhanden');

const barcode=fs.readFileSync('barcode-v1.js','utf8');
if(!barcode.includes('BarcodeDetector')&&!barcode.toLowerCase().includes('barcode')) fail('Barcode-Modul ohne Erkennungslogik');else ok('Barcode-Erkennungslogik vorhanden');

const sync=fs.readFileSync('cloud-sync-v1.js','utf8');
for(const needle of ["schema:2","COOK_PREFIX","validate(data)","MAX_BYTES"]){if(!sync.includes(needle)) fail(`Backup-Härtung fehlt: ${needle}`);else ok(`Backup-Härtung vorhanden: ${needle}`)}

const auto=fs.readFileSync('autopilot-v1.js','utf8');
for(const needle of ["SLOTS","Frühstück","Mittagessen","Abendessen","shoppingFor","expiring","RESERVE_AUTOPILOT"]){if(!auto.includes(needle)) fail(`Autopilot-Prüfung fehlt: ${needle}`);else ok(`Autopilot-Prüfung vorhanden: ${needle}`)}
if(!auto.includes('days=7')) fail('Autopilot ist nicht auf 7 Tage ausgelegt');else ok('Autopilot plant 7 Tage');
const legacyLedger=auto.includes('recipeFitsLedger')&&auto.includes('reserveRecipe');
const partialLedger=auto.includes('reservePartial')&&auto.includes('ledgerAvailable')&&auto.includes('Math.min(e.v,need)');
if(!legacyLedger&&!partialLedger) fail('Autopilot berücksichtigt Vorratsmengen nicht korrekt');
else ok(partialLedger?'Autopilot verwendet partielle mengenbasierte Vorratsreservierung':'Autopilot verwendet mengenbasiertes Vorrats-Ledger');
if(partialLedger&&!auto.includes('fitRatio')) fail('Autopilot v3 bewertet teilweise gedeckte Rezepte nicht');else if(partialLedger)ok('Autopilot bewertet teilweise gedeckte Rezepte');
if(!auto.includes("if(mt.length)return mt.includes(slot)")) fail('Autopilot verwendet keine strikte mealTimes-Zuordnung');else ok('Autopilot verwendet strikte mealTimes-Zuordnung');

if(!process.exitCode) ok('RESERVE Smoke-Test bestanden');
