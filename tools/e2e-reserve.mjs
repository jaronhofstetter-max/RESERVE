import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';let f=path.join(root,p);if(!f.startsWith(root)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('not found')}res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');res.end(b)})});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.RESERVE_AUTOPILOT&&typeof window.RESERVE_AUTOPILOT.plan==='function');
  await page.waitForFunction(()=>window.RESERVE_AUTOPILOT.recipeCount()>=50);
  await page.evaluate(()=>window.RESERVE_AUTOPILOT.render());
  await page.waitForSelector('#reserveAutopilot',{state:'attached'});
  const result=await page.evaluate(()=>{
    const p=RESERVE_AUTOPILOT.plan(7),flat=RESERVE_AUTOPILOT.flatten(p),shoppingCalc=RESERVE_AUTOPILOT.shoppingFor(flat);
    const slotsValid=p.days.every(day=>day.every(m=>!m.recipe||RESERVE_AUTOPILOT.forSlot(m.recipe,m.slot)));
    const reasonsValid=p.days.every(day=>day.every(m=>!m.recipe||typeof m.reason==='string'&&m.reason.length>0));
    const nutritionValid=p.days.every(day=>day.nutrition&&['kcal','protein','fiber'].every(k=>Number.isFinite(day.nutrition[k])&&day.nutrition[k]>=0));
    return {recipes:RESERVE_AUTOPILOT.recipeCount(),days:p.days.length,slots:p.days.map(d=>d.map(x=>x.slot)),meals:flat.length,shopping:Array.isArray(shoppingCalc),autopilotCard:!!document.getElementById('reserveAutopilot'),sync:!!window.RESERVE_SYNC,slotsValid,reasonsValid,nutritionValid};
  });
  if(result.recipes<50)throw new Error(`Zu wenige Live-Rezepte: ${result.recipes}`);
  if(result.days!==7)throw new Error(`Autopilot plant ${result.days} statt 7 Tage`);
  for(const slots of result.slots)for(const required of ['Frühstück','Mittagessen','Abendessen'])if(!slots.includes(required))throw new Error(`Mahlzeit-Slot fehlt: ${required}`);
  if(!result.slotsValid)throw new Error('Autopilot hat ein Rezept einem unzulässigen Mahlzeit-Slot zugeordnet');
  if(!result.reasonsValid)throw new Error('Autopilot liefert nicht für jede geplante Mahlzeit einen Grund');
  if(!result.nutritionValid)throw new Error('Autopilot liefert ungültige Tages-Nährwerte');
  if(result.meals<14)throw new Error(`Zu wenige Mahlzeiten geplant: ${result.meals}`);
  if(!result.shopping)throw new Error('Einkaufsberechnung liefert keine Liste');
  if(!result.autopilotCard)throw new Error('Autopilot UI fehlt');
  if(!result.sync)throw new Error('Backup/Sync Modul nicht aktiv');

  const ranking=await page.evaluate(()=>{
    const candidates=recipes.filter(r=>(!r.status||r.status==='approved')&&r.ingredients?.length&&r.steps?.length);
    const target=candidates.find(r=>(r.mealTimes||[]).includes('Mittagessen'))||candidates.find(r=>(r.mealTimes||[]).includes('Abendessen'));
    if(!target)throw new Error('Kein Rezept für Autopilot-Rangtest');
    stock=[];shopping=[];localStorage.setItem('reserveStock','[]');localStorage.setItem('reserveShopping','[]');
    adaptRecipe(target).ingredients.forEach(i=>stock.push({n:i.name,q:fmt(i.amount*persons(),i.unit),e:'',c:'Test'}));
    localStorage.setItem('reserveStock',JSON.stringify(stock));
    const slot=(target.mealTimes||[]).includes('Mittagessen')?'Mittagessen':'Abendessen';
    const p=RESERVE_AUTOPILOT.plan(1),meal=p.days[0].find(x=>x.slot===slot);
    return {target:target.id,chosen:meal?.recipe?.id||'',slot,chosenCookable:meal?.recipe?canCook(meal.recipe):false,reason:meal?.reason||''};
  });
  if(!ranking.chosenCookable)throw new Error(`Autopilot-Rangfolge: für ${ranking.slot} wurde trotz kochbarer Auswahl kein vollständig kochbares Rezept gewählt`);

  const autoShop=await page.evaluate(()=>{
    stock=[];shopping=[];localStorage.setItem('reserveStock','[]');localStorage.setItem('reserveShopping','[]');RESERVE_AUTOPILOT.render();
    const button=document.getElementById('reserveAutoShop'),enabled=!!button&&!button.disabled,before=shopping.length;
    if(enabled)button.click();
    return {enabled,before,after:shopping.length,text:button?.textContent||''};
  });
  if(autoShop.enabled&&autoShop.after<=autoShop.before)throw new Error('Autopilot-Einkaufsbutton hat keine fehlenden Mengen ergänzt');

  const loop=await page.evaluate(()=>{
    const recipe=recipes.find(r=>(!r.status||r.status==='approved')&&r.ingredients?.length&&r.steps?.length);
    if(!recipe)throw new Error('Kein Rezept für Kreislauftest gefunden');
    const adapted=adaptRecipe(recipe),peopleCount=persons();stock=[];shopping=[];
    localStorage.setItem('reserveStock','[]');localStorage.setItem('reserveShopping','[]');
    adapted.ingredients.forEach(i=>shopping.push({n:i.name,q:fmt(i.amount*peopleCount,i.unit)}));saveShop();
    const shoppingBefore=shopping.length;while(shopping.length)purchaseToStock(0);const stockAfterPurchase=stock.length;const cookableBefore=canCook(recipe);
    const before=adapted.ingredients.map(i=>({name:i.name,unit:i.unit,available:availableAmount(i.name,i.unit)}));
    localStorage.setItem('reserveCookProgress:'+recipe.id,JSON.stringify(recipe.steps.map(()=>true)));finishCook(recipe.id);
    const after=adapted.ingredients.map(i=>({name:i.name,unit:i.unit,available:availableAmount(i.name,i.unit)}));
    const deducted=before.every((x,i)=>after[i].available<x.available||before[i].available===0),progressCleared=localStorage.getItem('reserveCookProgress:'+recipe.id)===null,replanned=RESERVE_AUTOPILOT.plan(7);
    return {recipe:recipe.name,shoppingBefore,shoppingAfter:shopping.length,stockAfterPurchase,cookableBefore,deducted,progressCleared,replannedDays:replanned.days.length};
  });
  if(loop.shoppingBefore<1)throw new Error('Kreislauf: Einkaufsliste wurde nicht befüllt');
  if(loop.shoppingAfter!==0)throw new Error(`Kreislauf: ${loop.shoppingAfter} Einkaufspositionen blieben nach Kauf übrig`);
  if(loop.stockAfterPurchase<1)throw new Error('Kreislauf: Einkauf wurde nicht in Vorrat übernommen');
  if(!loop.cookableBefore)throw new Error('Kreislauf: Rezept ist nach Einkauf nicht kochbar');
  if(!loop.deducted)throw new Error('Kreislauf: Vorratsmengen wurden nach Kochen nicht korrekt reduziert');
  if(!loop.progressCleared)throw new Error('Kreislauf: Kochfortschritt wurde nicht zurückgesetzt');
  if(loop.replannedDays!==7)throw new Error('Kreislauf: Autopilot wurde nach dem Kochen nicht korrekt neu berechnet');
  if(errors.length)throw new Error('Browserfehler: '+errors.join(' | '));
  console.log('✓ RESERVE Browser-E2E bestanden',result);console.log('✓ Autopilot Kochbar-zuerst bestanden',ranking);console.log('✓ Autopilot Einkauf bestanden',autoShop);console.log('✓ RESERVE Vollkreislauf bestanden',loop);
}finally{await browser.close();server.close()}
