import fs from 'node:fs';

const file=process.argv[2]||'data/recipes.json';
const recipes=JSON.parse(fs.readFileSync(file,'utf8'));
const list=x=>Array.isArray(x)?x:[];
const names=r=>list(r.ingredients).map(x=>x.name).filter(Boolean);
const lower=r=>(r.name+' '+names(r).join(' ')).toLowerCase();

function equipment(r){
  const t=lower(r),e=[];
  if(/pasta|spaghetti|reis|kartoff|suppe|porridge|linsen|kichererbs/.test(t))e.push('Kochtopf');
  if(/pfanne|omelette|rührei|ruehrei|frittata|bolognese/.test(t))e.push('Bratpfanne');
  if(r.prepMinutes>0)e.push('Schneidebrett','Küchenmesser');
  if(/ei|omelette|porridge|quark|joghurt/.test(t))e.push('Schüssel oder Rührgefäss');
  return [...new Set(e.length?e:['Schneidebrett','Küchenmesser'])];
}
function description(r){
  const ins=names(r).slice(0,3).join(', ');
  const kind=r.type==='Frühstück'?'Frühstück':'Hauptgericht';
  return `${r.name} ist ein ${r.difficulty.toLowerCase()}es ${kind} mit ${ins}. Die Mengen sind für eine Portion ausgelegt; entscheidend sind die beschriebenen Gar- und Konsistenzmerkmale statt nur die Uhrzeit.`;
}
function prepNotes(r){
  const t=lower(r),a=[];
  if(/gemüse|brokkoli|tomat|gurke|paprika|karotte|apfel|spinat/.test(t))a.push('Frisches Gemüse oder Obst vor dem Schneiden waschen und beschädigte Stellen entfernen.');
  if(/poulet|hähn|huhn|hackfleisch|rind/.test(t))a.push('Rohes Fleisch getrennt von verzehrfertigen Zutaten vorbereiten; Brett, Messer und Hände danach gründlich reinigen.');
  if(/kichererbs|linsen/.test(t))a.push('Bei vorgegarten Hülsenfrüchten Flüssigkeit abgiessen und kurz abspülen; bei trockener Ware die Packungsangaben zur Garzeit beachten.');
  return a.length?a:['Alle Zutaten abwiegen beziehungsweise abzählen und griffbereit bereitstellen.'];
}
function doneness(r){
  const t=lower(r);
  if(/poulet|hähn|huhn/.test(t))return 'Das Geflügel ist vollständig durchgegart, innen nicht mehr rosa und erreicht im dicksten Stück mindestens 75 °C.';
  if(/hackfleisch/.test(t))return 'Das Hackfleisch ist vollständig gebräunt und ohne rohe Stellen; die Sauce ist heiss und leicht eingedickt.';
  if(/omelette|ei-pfanne|rührei|ruehrei|frittata/.test(t))return 'Die Eimasse ist vollständig gestockt und zeigt keine flüssigen rohen Stellen mehr.';
  if(/pasta|spaghetti/.test(t))return 'Die Pasta ist bissfest und die Sauce haftet sichtbar an ihr, ohne wässrig auf dem Teller zu stehen.';
  if(/porridge/.test(t))return 'Der Porridge ist cremig und dickflüssig; beim Rühren bleibt für einen Moment eine sichtbare Spur.';
  if(/reis/.test(t))return 'Der Reis ist weich, aber nicht breiig; die Körner sind gar und es steht keine freie Kochflüssigkeit mehr im Topf.';
  if(/kartoff/.test(t))return 'Die Kartoffeln lassen sich mit einer Messerspitze ohne harten Widerstand einstechen.';
  if(/suppe|dal|linsen/.test(t))return 'Die festen Zutaten sind weich und die Flüssigkeit hat eine gleichmässige, zum Gericht passende Konsistenz.';
  return 'Das Gericht ist gleichmässig heiss; die Hauptzutaten haben die im letzten Kochschritt beschriebene Konsistenz erreicht.';
}
function leftovers(r){
  const t=lower(r);
  if(/joghurt|quark|brot|bowl/.test(t)&&r.cookMinutes===0)return 'Am besten frisch servieren. Reste abgedeckt im Kühlschrank lagern und möglichst innerhalb von 24 Stunden verbrauchen.';
  return 'Reste rasch abkühlen lassen, abgedeckt im Kühlschrank lagern und innerhalb von 1–2 Tagen vollständig durcherhitzt beziehungsweise passend zum Gericht gekühlt verbrauchen.';
}
function safety(r){
  const t=lower(r);
  if(/poulet|hähn|huhn/.test(t))return 'Rohes Geflügel nicht abwaschen, Kreuzkontamination vermeiden und vollständig auf mindestens 75 °C Kerntemperatur garen.';
  if(/hackfleisch/.test(t))return 'Hackfleisch gekühlt halten, Kreuzkontamination vermeiden und vollständig durchgaren.';
  if(/ei|omelette|frittata|rührei|ruehrei/.test(t))return 'Für empfindliche Personen Eier vollständig stocken lassen und rohe Eimasse nicht mit verzehrfertigen Lebensmitteln in Kontakt bringen.';
  return 'Verderbliche Zutaten bis zur Verwendung gekühlt halten und zubereitete Speisen nicht unnötig lange bei Raumtemperatur stehen lassen.';
}
function substitutions(r){
  const t=lower(r),a=[];
  if(t.includes('reis'))a.push('Reis kann durch eine ähnlich portionierte Getreidebeilage ersetzt werden; Garzeit und Flüssigkeitsmenge entsprechend anpassen.');
  if(/joghurt|quark/.test(t))a.push('Milchprodukt kann durch eine ungesüsste pflanzliche Alternative ersetzt werden; Konsistenz und Nährwerte verändern sich.');
  if(/poulet|hähn|huhn/.test(t))a.push('Poulet kann durch festen Tofu ersetzt werden; Tofu benötigt keine Geflügel-Kerntemperatur, sollte aber kräftig angebraten werden.');
  return a;
}

for(const r of recipes){
  if(r.status!=='approved')continue;
  r.description ||= description(r);
  r.equipment ||= equipment(r);
  r.prepNotes ||= prepNotes(r);
  r.doneness ||= doneness(r);
  r.substitutions ||= substitutions(r);
  r.leftovers ||= leftovers(r);
  r.safety ||= safety(r);
}
fs.writeFileSync(file,JSON.stringify(recipes,null,2)+'\n');
console.log(`Enriched ${recipes.filter(r=>r.status==='approved').length} approved recipes in ${file}.`);
