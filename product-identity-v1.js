/* Local, conservative food identity. Rules are evidence from names, not photo recognition. */
(function(){'use strict';
if(window.RESERVE_PRODUCT_IDENTITY)return;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const groups=[
 ['Pasta',[['Spaghetti','spaghetti|spaghettini|spaghettoni'],['Penne','penne'],['Fusilli','fusilli'],['Rigatoni','rigatoni'],['Farfalle','farfalle'],['Tagliatelle','tagliatelle'],['Makkaroni','maccheroni|macaroni|makkaroni']]],
 ['Öl',[['Olivenöl','olivenol|olive oil|olio di oliva'],['Rapsöl','rapsol|canola oil'],['Sonnenblumenöl','sonnenblumenol']]],
 ['Fleisch',[['Rinderhackfleisch','rinderhackfleisch|rinderhack|rindshackfleisch|rindshack|beef mince'],['Schweinehackfleisch','schweinehackfleisch|schweinshackfleisch'],['Poulet','poulet|hahnchen|huhnerbrust|pouletbrust|chicken']]],
 ['Hülsenfrüchte',[['Rote Linsen','rote linsen|red lentils'],['Grüne Linsen','grune linsen|green lentils'],['Braune Linsen','braune linsen|brown lentils'],['Kichererbsen','kichererbse|kichererbsen'],['Kidneybohnen','kidneybohne|kidneybohnen|kidney beans'],['Borlottibohnen','borlottibohnen|borlotti']]],
 ['Reis',[['Basmatireis','basmati|basmatireis'],['Jasminreis','jasminreis|jasmine rice'],['Risottoreis','risottoreis|arborio|carnaroli']]],
 ['Gemüse & Früchte',[['Tomaten','tomate|tomaten|cherrytomate|cherrytomaten|cocktailtomate|cocktailtomaten'],['Zwiebel','zwiebel|zwiebeln'],['Knoblauch','knoblauch|knoblauchzehe|knoblauchzehen'],['Brokkoli','brokkoli|broccoli'],['Karotte','karotte|karotten|mohre|mohren|ruebli|rubli'],['Zucchini','zucchini|zucchetti'],['Kartoffeln','kartoffel|kartoffeln'],['Blumenkohl','blumenkohl|karfiol'],['Aubergine','aubergine|auberginen|melanzani'],['Apfel','apfel'],['Zitrone','zitrone|zitronen']]],
 ['Gebäck & Snacks',[['Buttergebäck','buttergeback|buttergebaeck|petit beurre'],['Kekse','keks|kekse|biscuit|biscuits|cookie|cookies|sables'],['Reiswaffeln','reiswaffel|reiswaffeln']]],
 ['Weitere',[['Tofu','tofu'],['Haferflocken','haferflocken'],['Butter','butter'],['Eier','ei|eier'],['Milch','milch|vollmilch'],['Naturjoghurt','naturjoghurt|naturjogurt']]]
];
const rules=groups.flatMap(([family,items])=>items.map(([ingredient,pattern])=>({family,ingredient,test:new RegExp('(?:^| )('+pattern+')(?: |$)')})));
const excluded=/(?:^| )(?:sauce|sosse|suppe|fertiggericht|salat|pulver|mehl|riegel|schokolade|sirup|saft|tee|gewurz|gewurzmischung|chips|pizza|bowl)(?: |$)/;
function analyze(name){const n=norm(name);if(!n||excluded.test(n)||/(?:^| )(?:mit|und|with)(?: |$)/.test(n))return{state:'unknown',ingredient:'',family:'',candidates:[]};
 const hits=rules.filter(x=>x.test.test(n));
 if(hits.length!==1)return{state:hits.length?'ambiguous':'unknown',ingredient:'',family:'',candidates:hits.map(x=>x.ingredient)};
 const hit=hits[0];if((hit.ingredient==='Milch'&&/kokos|mandel|hafer|soja|schokol/.test(n))||(hit.ingredient==='Naturjoghurt'&&/vanill|schokol|erdbeer|frucht/.test(n)))return{state:'unknown',ingredient:'',family:'',candidates:[]};
 return{state:'recognized',ingredient:hit.ingredient,family:hit.family,candidates:[hit.ingredient]};
}
function compatible(name,ingredient){const baked=/(geback|gebaeck|biscuit|keks|cookie|sables|waffel|kuchen|cake)/.test(norm(name)),plainRice=/^(reis|basmatireis|jasminreis|langkornreis|vollkornreis|risottoreis|rice)$/.test(norm(ingredient));return !(baked&&plainRice);}
window.RESERVE_PRODUCT_IDENTITY={version:'1.1',analyze,compatible,options:()=>rules.map(x=>x.ingredient)};
})();
