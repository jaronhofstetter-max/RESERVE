/* Local, conservative food identity. Rules are evidence from names, not photo recognition. */
(function(){'use strict';
if(window.RESERVE_PRODUCT_IDENTITY)return;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const groups=[
 ['Pasta',[['Spaghetti','spaghetti|spaghettini|spaghettoni'],['Penne','penne'],['Fusilli','fusilli'],['Rigatoni','rigatoni'],['Farfalle','farfalle'],['Tagliatelle','tagliatelle'],['Makkaroni','maccheroni|macaroni|makkaroni']]],
 ['Öl',[['Olivenöl','olivenol|olive oil|olio di oliva'],['Rapsöl','rapsol|canola oil'],['Sonnenblumenöl','sonnenblumenol']]],
 ['Fleisch',[['Rinderhackfleisch','rinderhackfleisch|rinderhack|rindshackfleisch|rindshack|beef mince'],['Schweinehackfleisch','schweinehackfleisch|schweinshackfleisch'],['Poulet','poulet|hahnchen|huhnerbrust|pouletbrust|chicken']]],
 ['Fisch',[['Sardellen','sardelle|sardellen|sardellenfilet|sardellenfilets|anchovis|anchovy|anchovies|anchois'],['Sardinen','sardine|sardinen'],['Thunfisch','thunfisch|tuna'],['Lachs','lachs|lachsfilet|lachsfilets'],['Forelle','forelle|forellen'],['Kabeljau','kabeljau|dorsch'],['Makrele','makrele|makrelen']]],
 ['Hülsenfrüchte',[['Rote Linsen','rote linsen|red lentils'],['Grüne Linsen','grune linsen|green lentils'],['Braune Linsen','braune linsen|brown lentils'],['Kichererbsen','kichererbse|kichererbsen'],['Kidneybohnen','kidneybohne|kidneybohnen|kidney beans'],['Borlottibohnen','borlottibohnen|borlotti']]],
 ['Reis',[['Basmatireis','basmati|basmatireis'],['Jasminreis','jasminreis|jasmine rice'],['Risottoreis','risottoreis|arborio|carnaroli']]],
 ['Gemüse & Früchte',[['Tomaten','tomate|tomaten|cherrytomate|cherrytomaten|cocktailtomate|cocktailtomaten'],['Zwiebel','zwiebel|zwiebeln'],['Knoblauch','knoblauch|knoblauchzehe|knoblauchzehen'],['Brokkoli','brokkoli|broccoli'],['Karotte','karotte|karotten|mohre|mohren|ruebli|rubli'],['Zucchini','zucchini|zucchetti'],['Kartoffeln','kartoffel|kartoffeln'],['Blumenkohl','blumenkohl|karfiol'],['Aubergine','aubergine|auberginen|melanzani'],['Apfel','apfel'],['Zitrone','zitrone|zitronen']]],
 ['Gebäck & Snacks',[['Buttergebäck','buttergeback|buttergebaeck|petit beurre'],['Kekse','keks|kekse|biscuit|biscuits|cookie|cookies|sables'],['Reiswaffeln','reiswaffel|reiswaffeln']]],
 ['Milch',[['Milch','milch|vollmilch']]],
 ['Weitere',[['Tofu','tofu'],['Haferflocken','haferflocken'],['Butter','butter'],['Eier','ei|eier'],['Naturjoghurt','naturjoghurt|naturjogurt']]]
];
const rules=groups.flatMap(([family,items])=>items.map(([ingredient,pattern])=>({family,ingredient,test:new RegExp('(?:^| )('+pattern+')(?: |$)')})));
const excluded=/(?:^| )(?:sauce|sosse|suppe|fertiggericht|salat|pulver|mehl|riegel|schokolade|sirup|saft|tee|gewurz|gewurzmischung|chips|pizza|bowl|paste|pastete|aufstrich|creme)(?: |$)/;
const milkVariants=[['Vanillemilch','vanillemilch|vanille milch|milch vanille|vanilla milk'],['Schokomilch','schokomilch|schoko milch|milch schoko|schokoladenmilch|schokoladen milch|kakaomilch|kakao milch|chocolate milk']].map(([ingredient,pattern])=>({ingredient,test:new RegExp('(?:^| )('+pattern+')(?: |$)')}));
const staples={'zucker':['Zucker','Zucker & Süßungsmittel'],'salz':['Salz','Gewürze & Würzmittel'],'reis':['Reis','Getreide & Beilagen'],'mehl':['Mehl','Getreide & Beilagen'],'brot':['Brot','Getreide & Beilagen']};
const categories=['Getreide & Beilagen','Gemüse & Früchte','Protein','Milchprodukte','Snacks & Süßwaren','Kaffee & Tee','Getränke','Gewürze & Würzmittel','Zucker & Süßungsmittel','Öle & Fette','Essig & Würzsaucen','Sonstiges'];
const categoryLabel=value=>value==='Gewürze'?'Gewürze & Würzmittel':String(value||'Sonstiges');
const pantryNames=[
 ['Honig','Zucker & Süßungsmittel',['honig','blütenhonig','blutenhonig']],['Puderzucker','Zucker & Süßungsmittel',['puderzucker']],['Rohrzucker','Zucker & Süßungsmittel',['rohrzucker']],['Vanillezucker','Zucker & Süßungsmittel',['vanillezucker','vanille zucker']],['Ahornsirup','Zucker & Süßungsmittel',['ahornsirup']],['Agavendicksaft','Zucker & Süßungsmittel',['agavendicksaft']],
 ['Öl','Öle & Fette',['öl','ol']],['Essig','Essig & Würzsaucen',['essig']],['Apfelessig','Essig & Würzsaucen',['apfelessig']],['Weißweinessig','Essig & Würzsaucen',['weißweinessig','weissweinessig']],['Rotweinessig','Essig & Würzsaucen',['rotweinessig']],['Balsamico','Essig & Würzsaucen',['balsamico','aceto balsamico']],
 ['Sojasauce','Essig & Würzsaucen',['sojasauce','sojasoße','sojasosse','soja sauce','soja soße']],['Salatsauce','Essig & Würzsaucen',['salatsauce','salatsoße','salatsosse','salat sauce','salat dressing','salatdressing']],['Worcestersauce','Essig & Würzsaucen',['worcestersauce','worcestershiresauce','worcestershire sauce']],['Fischsauce','Essig & Würzsaucen',['fischsauce','fischsoße','fish sauce']]
];
const pantryAliases=new Map(pantryNames.flatMap(([ingredient,category,aliases])=>aliases.map(a=>[norm(a),{ingredient,category}])));
function analyze(name){const n=norm(name);
 const pantry=pantryAliases.get(n);if(pantry)return{state:'recognized',ingredient:pantry.ingredient,family:pantry.category,category:pantry.category,candidates:[pantry.ingredient]};
 const staple=Object.hasOwn(staples,n)?staples[n]:null;if(staple)return{state:'recognized',ingredient:staple[0],family:'Grundzutaten',category:staple[1],candidates:[staple[0]]};if(!n||excluded.test(n)||/(?:^| )(?:mit|und|with)(?: |$)/.test(n))return{state:'unknown',ingredient:'',family:'',candidates:[]};
 const milk=milkVariants.filter(x=>x.test.test(n));
 if(milk.length){
  if(milk.length!==1||/kokos|mandel|hafer|soja|vegan|pudding|kuchen|eis|aroma/.test(n))return{state:'unknown',ingredient:'',family:'',candidates:[]};
  return{state:'recognized',ingredient:milk[0].ingredient,family:'Milch',category:'Getränke',candidates:[milk[0].ingredient]};
 }
 const hits=rules.filter(x=>x.test.test(n));
 if(hits.length!==1)return{state:hits.length?'ambiguous':'unknown',ingredient:'',family:'',candidates:hits.map(x=>x.ingredient)};
 const hit=hits[0];if(hit.family==='Fisch'&&/(?:^| )(?:vegan(?:e[nmrs]?)?|vegetarisch(?:e[nmrs]?)?|ersatz|alternative|geschmack|aroma)(?: |$)/.test(n))return{state:'unknown',ingredient:'',family:'',candidates:[]};if((hit.ingredient==='Milch'&&/kokos|mandel|hafer|soja|schoko|vanill|kakao|erdbeer|banan|karamell|caramel/.test(n))||(hit.ingredient==='Naturjoghurt'&&/vanill|schokol|erdbeer|frucht/.test(n)))return{state:'unknown',ingredient:'',family:'',candidates:[]};
 const category=({'Öl':'Öle & Fette','Milch':'Milchprodukte','Pasta':'Getreide & Beilagen','Reis':'Getreide & Beilagen','Fleisch':'Protein','Fisch':'Protein','Hülsenfrüchte':'Protein','Gemüse & Früchte':'Gemüse & Früchte','Gebäck & Snacks':'Snacks & Süßwaren'})[hit.family]||({'Tofu':'Protein','Eier':'Protein','Haferflocken':'Getreide & Beilagen','Butter':'Öle & Fette','Milch':'Milchprodukte','Naturjoghurt':'Milchprodukte'})[hit.ingredient]||'';
 return{state:'recognized',ingredient:hit.ingredient,family:hit.family,category,candidates:[hit.ingredient]};
}
function compatible(name,ingredient){const a=analyze(name),b=analyze(ingredient);if(a.family==='Milch'&&b.family==='Milch'&&a.ingredient!==b.ingredient)return false;const baked=/(geback|gebaeck|biscuit|keks|cookie|sables|waffel|kuchen|cake)/.test(norm(name)),plainRice=/^(reis|basmatireis|jasminreis|langkornreis|vollkornreis|risottoreis|rice)$/.test(norm(ingredient));return !(baked&&plainRice);}
window.RESERVE_PRODUCT_IDENTITY={version:'1.4',analyze,compatible,categories:()=>categories.slice(),categoryLabel,options:()=>[...rules,...milkVariants].map(x=>x.ingredient).concat(Object.values(staples).map(x=>x[0]),pantryNames.map(x=>x[0]))};
})();
