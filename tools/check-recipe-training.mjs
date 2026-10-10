import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export function validate(records){
  const errors=[],ids=new Set(),groups=new Map();
  const nonempty=x=>typeof x==='string'&&x.trim().length>0;
  for(const r of records){
    const fail=m=>errors.push(`${r?.id||'?'}: ${m}`);
    if(!r||r.schemaVersion!==1){fail('schemaVersion muss 1 sein');continue;}
    if(!nonempty(r.id)||ids.has(r.id))fail('ID fehlt oder ist doppelt');ids.add(r.id);
    if(!nonempty(r.recipeGroup))fail('recipeGroup fehlt');
    if(!['train','validation','test','review'].includes(r.split))fail('Ungültiger Split');
    if(groups.has(r.recipeGroup)&&groups.get(r.recipeGroup)!==r.split)fail('Dasselbe Rezept liegt in verschiedenen Splits');groups.set(r.recipeGroup,r.split);
    if(!['pending','verified'].includes(r.reviewStatus))fail('Ungültiger Prüfstatus');
    const pages=r.pages||[],pageIds=new Set(pages.map(x=>x.id));
    if(!pages.length||pageIds.size!==pages.length||pages.some(x=>!nonempty(x.id)))fail('Seiten fehlen oder sind doppelt');
    if(pages.some(x=>!nonempty(x.image)&&!nonempty(x.ocr)))fail('Seite braucht Bildpfad oder OCR-Text');
    const e=r.expected;
    if(!e||!nonempty(e.name)){fail('Rezeptname fehlt');continue;}
    if(e.portions!==null&&(!Number.isFinite(e.portions)||e.portions<=0))fail('Ungültige Portionen');
    if(!Array.isArray(e.unresolved))fail('Offene Fragen müssen als Liste erfasst werden');
    for(const key of ['ingredients','steps'])if(!Array.isArray(e[key])||!e[key].length)fail(`${key} fehlen`);
    for(const x of e.ingredients||[]){
      if(!nonempty(x.raw)||!nonempty(x.name)||!pageIds.has(x.page))fail('Zutat braucht Originalzeile, Name und gültige Seite');
      if(x.amount!==null&&(!Number.isFinite(x.amount)||x.amount<=0))fail('Ungültige Zutatenmenge');
      if(x.amount!==null&&!nonempty(x.unit))fail('Menge ohne Einheit');
    }
    for(const x of e.steps||[])if(!nonempty(x.text)||!pageIds.has(x.page))fail('Schritt braucht Text und gültige Seite');
    if(r.split!=='review'){
      if(r.reviewStatus!=='verified')fail('Ungeprüftes Beispiel nur in review');
      if(r.source?.textTrainingAllowed!==true||r.source?.imageTrainingAllowed!==true||!nonempty(r.source?.rightsEvidence))fail('Trainingsfreigabe oder Beleg fehlt');
      if(e.portions===null||e.unresolved?.length||(e.ingredients||[]).some(x=>x.amount===null))fail('Ungeklärte Angaben nur in review');
    }
  }
  return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const paths=process.argv.slice(2);if(!paths.length)throw Error('Mindestens eine JSON-Datei angeben.');
    const records=paths.flatMap(p=>{const x=JSON.parse(fs.readFileSync(p,'utf8'));return Array.isArray(x)?x:[x];});
    const errors=validate(records);if(errors.length)throw Error(errors.join('\n'));
    console.log(`${records.length} Beispiel(e) strukturell gültig; keine Aussage über OCR-Genauigkeit.`);
  }catch(e){console.error(e.message);process.exitCode=1;}
}
