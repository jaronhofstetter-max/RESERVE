/* RESERVE product icons v2.0 — central food classifier for dishes, mixed foods and single ingredients. */
(function(){
  const text=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const compact=s=>text(s).replace(/\s+/g,'');
  const meta=s=>text([s?.n,s?.c,s?.category,s?.categories,s?.categories_tags,s?.generic_name,s?.product_name,s?.labels].flat().filter(Boolean).join(' '));
  const hit=(value,re)=>re.test(value);
  function classify(s){
    const n=text(s?.n||s?.product_name),nc=compact(s?.n||s?.product_name),m=meta(s),c=text(s?.c||s?.category||s?.categories);

    // Prepared meals / mixed foods always win over ingredient words contained in their names.
    if(hit(m,/(^| )sushi( |$)|maki|nigiri|sashimi/))return{kind:'dish',type:'sushi',icon:'🍣'};
    if(hit(m,/pizza|flammkuchen/))return{kind:'dish',type:'pizza',icon:'🍕'};
    if(hit(m,/burger|hamburger|cheeseburger/))return{kind:'dish',type:'burger',icon:'🍔'};
    if(hit(m,/sandwich|toastie|panini|wrap|burrito|taco/))return{kind:'dish',type:'handheld',icon:hit(m,/taco/)?'🌮':hit(m,/burrito|wrap/)?'🌯':'🥪'};
    if(hit(m,/lasagn|cannelloni|auflauf|gratin/))return{kind:'dish',type:'baked-meal',icon:'🍽️'};
    if(hit(m,/curry|dal |dahl |chili con carne|chili sin carne/))return{kind:'dish',type:'curry',icon:'🍛'};
    if(hit(m,/suppe|soup|eintopf|stew|bouillon/))return{kind:'dish',type:'soup',icon:'🍲'};
    if(hit(m,/ramen|pho |udon|noodle soup/))return{kind:'dish',type:'noodle-soup',icon:'🍜'};
    if(hit(m,/salatmix|salat mix|mischsalat|gemischter salat|prepared salad|meal salad|pok[eé] bowl|poke bowl|bowl meal/))return{kind:'dish',type:'salad-meal',icon:'🥗'};
    if(hit(m,/fertiggericht|ready meal|prepared meal|prepared dish|complete meal|meal kit|menu meal/))return{kind:'dish',type:'prepared-meal',icon:'🍽️'};
    if(hit(m,/muesli|musli|granola|porridge|overnight oats/))return{kind:'mixed',type:'cereal',icon:'🥣'};

    // Single foods and recognizable product families.
    if(hit(n,/essig|vinegar/))return{kind:'ingredient',type:'vinegar',icon:'🍶'};
    if(hit(n,/poulet|huhn|hahn|chicken|geflugel|truthahn|pute/))return{kind:'ingredient',type:'poultry',icon:'🍗'};
    if(hit(n,/rind|beef|fleisch|schwein|wurst|salami|speck|ham |schinken/))return{kind:'ingredient',type:'meat',icon:'🥩'};
    if(hit(n,/brokkoli/))return{kind:'ingredient',type:'broccoli',icon:'🥦'};
    if(hit(n,/tomat/))return{kind:'ingredient',type:'tomato',icon:'🍅'};
    if(hit(n,/kartoff/))return{kind:'ingredient',type:'potato',icon:'🥔'};
    if(hit(n,/karott|mohre|ruebli|rubli/))return{kind:'ingredient',type:'carrot',icon:'🥕'};
    if(hit(n,/zucchini|gurke|cucumber/))return{kind:'ingredient',type:'cucumber',icon:'🥒'};
    if(hit(n,/paprika|peperoni|bell pepper/))return{kind:'ingredient',type:'pepper',icon:'🫑'};
    if(hit(n,/spinat|kopfsalat|eisberg|romana|rucola|feldsalat|lettuce/))return{kind:'ingredient',type:'leafy',icon:'🥬'};
    if(hit(n,/(^| )(ei|eier|egg|eggs)( |$)/)||/^(ei|eier|egg|eggs)$/.test(n))return{kind:'ingredient',type:'egg',icon:'🥚'};
    if(hit(n,/apfel|apple/))return{kind:'ingredient',type:'apple',icon:'🍎'};
    if(hit(n,/banan/))return{kind:'ingredient',type:'banana',icon:'🍌'};
    if(hit(n,/beere|erdbeer|himbeer|heidelbeer|strawberr|blueberr|raspberr/))return{kind:'ingredient',type:'berry',icon:'🍓'};
    if(hit(n,/orange|mandarine|zitrone|lemon|lime|grapefruit/))return{kind:'ingredient',type:'citrus',icon:'🍊'};
    if(hit(n,/traube|grape/))return{kind:'ingredient',type:'grape',icon:'🍇'};
    if(hit(n,/birne|pear/))return{kind:'ingredient',type:'pear',icon:'🍐'};
    if(hit(n,/avocado/))return{kind:'ingredient',type:'avocado',icon:'🥑'};
    if(hit(n,/zwiebel|onion/))return{kind:'ingredient',type:'onion',icon:'🧅'};
    if(hit(n,/knoblauch|garlic/))return{kind:'ingredient',type:'garlic',icon:'🧄'};
    if(hit(n,/mais|corn/))return{kind:'ingredient',type:'corn',icon:'🌽'};
    if(hit(n,/pilz|champignon|mushroom/))return{kind:'ingredient',type:'mushroom',icon:'🍄'};
    if(hit(n,/pasta|spaghetti|nudel|macaroni|penne|fusilli/))return{kind:'ingredient',type:'pasta',icon:'🍝'};
    if(hit(n,/reis|rice/))return{kind:'ingredient',type:'rice',icon:'🍚'};
    if(hit(n,/brot|bread|baguette|toastbrot|br[oö]tchen/))return{kind:'ingredient',type:'bread',icon:'🍞'};
    if(hit(n,/mehl|getreide|hafer|oat|weizen|dinkel|gerste|barley|quinoa|couscous|bulgur/))return{kind:'ingredient',type:'grain',icon:'🌾'};
    if(hit(n,/milch|milk/))return{kind:'ingredient',type:'milk',icon:'🥛'};
    if(hit(n,/kase|cheese|mozzarella|parmesan|emmental|gruyere/))return{kind:'ingredient',type:'cheese',icon:'🧀'};
    if(hit(n,/joghurt|yogurt|quark|skyr/))return{kind:'ingredient',type:'yogurt',icon:'🥣'};
    if(hit(n,/butter/))return{kind:'ingredient',type:'butter',icon:'🧈'};
    if(hit(n,/fisch|lachs|thunfisch|tuna|salmon|forelle|cod|kabeljau/))return{kind:'ingredient',type:'fish',icon:'🐟'};
    if(hit(n,/garnele|shrimp|prawn/))return{kind:'ingredient',type:'seafood',icon:'🦐'};
    if(hit(n,/wasser|water/))return{kind:'ingredient',type:'water',icon:'💧'};
    if(hit(n,/kaffee|coffee/))return{kind:'ingredient',type:'coffee',icon:'☕'};
    if(hit(n,/tee| tea/))return{kind:'ingredient',type:'tea',icon:'🍵'};
    if(hit(n,/saft|juice|limonade|softdrink|cola/))return{kind:'ingredient',type:'drink',icon:'🧃'};
    if(hit(n,/honig|honey/))return{kind:'ingredient',type:'honey',icon:'🍯'};
    if(hit(n,/schokolade|chocolate|kakao|cocoa/))return{kind:'ingredient',type:'chocolate',icon:'🍫'};
    if(hit(n,/dose|konserve|canned/))return{kind:'ingredient',type:'canned',icon:'🥫'};

    // Product/category metadata fallback. Avoid partial-word rules such as "ei".
    if(hit(m,/sushi|prepared meals|ready meals|fertiggerichte/))return{kind:'dish',type:'prepared-meal',icon:'🍽️'};
    if(hit(c,/gemuse|vegetable/))return{kind:'category',type:'vegetable',icon:'🥦'};
    if(hit(c,/frucht|obst|fruit/))return{kind:'category',type:'fruit',icon:'🍎'};
    if(hit(c,/protein|fleisch|meat/))return{kind:'category',type:'protein',icon:'🍗'};
    if(hit(c,/milchprodukt|dairy/))return{kind:'category',type:'dairy',icon:'🥛'};
    if(hit(c,/getreide|beilage|grain|cereal/))return{kind:'category',type:'grain',icon:'🌾'};
    if(hit(c,/getrank|beverage|drink/))return{kind:'category',type:'drink',icon:'🧃'};
    return{kind:'food',type:'unknown',icon:'🍽️'};
  }
  const iconFor=s=>classify(s).icon;
  function applyCabinet(){const rows=window.RESERVE_CABINET?.getStock?.()||[];document.querySelectorAll('.cab-product[data-index]').forEach(card=>{const i=Number(card.dataset.index),el=card.querySelector('.cab-icon');if(el&&rows[i])el.textContent=iconFor(rows[i])})}
  function applyDetail(){const detail=document.querySelector('#cabinetDetail:not([hidden]) .cab-detail-icon');if(!detail)return;detail.textContent=iconFor({n:document.getElementById('cabEditName')?.value||'',c:document.getElementById('cabEditCat')?.value||''})}
  function apply(){applyCabinet();applyDetail()}
  function boot(){apply();const observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('input',e=>{if(e.target?.id==='cabEditName')requestAnimationFrame(applyDetail)});document.addEventListener('change',e=>{if(e.target?.id==='cabEditCat')requestAnimationFrame(applyDetail)});window.addEventListener('reserve:stock-changed',()=>requestAnimationFrame(apply))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.RESERVE_PRODUCT_ICONS={version:'2.0',classify,iconFor,apply};
})();
