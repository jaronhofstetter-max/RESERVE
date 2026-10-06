import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const port=4182,server=spawn('python3',['-m','http.server',String(port)],{stdio:'ignore'});
await new Promise(resolve=>setTimeout(resolve,700));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>localStorage.setItem('reserveStock',JSON.stringify([{n:'Lassi Mango',q:'484 g',c:'Milchprodukte',barcode:'4010355422020',containerCount:2,eachQty:'242 g',containerType:'Becher'}])));
  await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>typeof goTo==='function'&&goTo('stock'));
  await page.waitForFunction(()=>{const v=window.RESERVE_CONTAINER_UNITS?.version||'';return /^1\.(?:[4-9]|\d{2,})$/.test(v)||/^[2-9]\./.test(v)});
  await page.evaluate(()=>RESERVE_CONTAINER_UNITS.decorate());
  const text=await page.locator('.cab-product').filter({hasText:'Lassi Mango'}).textContent();
  if(!text.includes('2 Becher × 242 g'))throw Error('Expliziter Gebindetyp fehlt: '+text);
  const row=await page.evaluate(()=>JSON.parse(localStorage.getItem('reserveStock'))[0]);
  if(row.q!=='484 g')throw Error('Interner Gesamtbestand wurde verändert');
  if(await page.evaluate(()=>RESERVE_CONTAINER_UNITS.typeFor('Lassi Mango','Becher'))!=='Becher')throw Error('Expliziter Gebindetyp wird nicht respektiert');
  for(const [name,type] of [['Lassi Mango','Flasche'],['Apfelsaft','Flasche'],['Mais Dose','Dose'],['Penne Rigate','Packung']]){
    if(await page.evaluate(([n,t])=>RESERVE_CONTAINER_UNITS.typeFor(n)===t,[name,type])!==true)throw Error(name+' Gebindetyp falsch');
  }
  if(await page.evaluate(()=>RESERVE_CONTAINER_UNITS.typeFor('Blüten-Honig'))==='Glas')throw Error('Mehrdeutige Honigverpackung wurde fälschlich als Glas erzwungen');
  console.log('Container units: explizite Gebinde + konservative Heuristik + Gesamtbestand OK');
}finally{
  await browser.close();
  server.kill();
}
