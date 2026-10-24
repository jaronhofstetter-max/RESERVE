"""Reproduce reviewed Chuchitisch recipe 752 and its source evidence."""
import hashlib,html,io,json,pathlib,re,sys,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];DOC=ROOT/'docs/recipe-candidates/import-2026-10-24'
RID='chuchitisch-chaeshoernli';SOURCE='https://chuchitisch.ch/recipes/752';LICENSE='https://creativecommons.org/licenses/by-sa/3.0/'
# Original for two people. Broccoli/tomato gram amounts are documented reference weights.
ROWS=[('Hörnli-Pasta',250,'g','168927',250),('Broccoli',500,'g','170379',500),('Tomaten',240,'g','170457',240),('Reibkäse',80,'g','170848',80),('Salz',2,'g',None,2)]
if '--collect' in sys.argv:
 DOC.mkdir(parents=True,exist_ok=True);evidence=[];source=None
 for url in ['http://chuchitisch.ch/recipes/752','http://chuchitisch.ch/chuchitisch/lizenz']:
  raw=urllib.request.urlopen(url,timeout=30).read();page=raw.decode()
  if '/recipes/' in url:
   source=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',page,re.S).group(1),strict=False)
   assert source['name'].strip()=='Chäshörnli' and source['recipeYield']=='2 Personen'
   assert source['author']['name']=='Hannes und Martina' and 'by-sa/3.0' in source['license']
  else:assert all(s in page for s in ['sowohl Rezepte als auch Bilder','eigenen Fotos','by-sa/3.0'])
  clean=re.sub(r'<(script|style)\b.*?</\1>',' ',page,flags=re.S);clean=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',clean))).strip()
  evidence.append(dict(url=url,retrievedAt='2026-10-24',sha256=hashlib.sha256(raw).hexdigest(),text=clean))
 (DOC/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n');(DOC/'source-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
 data=json.loads(pathlib.Path(sys.argv[sys.argv.index('--collect')+1]).read_text());data=data.get('SRLegacyFoods',data) if isinstance(data,dict) else data
 ids={x[3] for x in ROWS if x[3]};mapping={1008:'kcal',1003:'protein',1005:'carbs',1004:'fat',1079:'fiber'};values={}
 for record in data:
  key=str(record['fdcId'])
  if key not in ids:continue
  per={mapping[n['nutrient']['id']]:n['amount'] for n in record['foodNutrients'] if n['nutrient']['id'] in mapping}
  assert set(per)==set(mapping.values());values[key]=dict(description=record['description'],per100g=per,source=f'https://fdc.nal.usda.gov/food-details/{key}/nutrients')
 assert set(values)==ids;(DOC/'nutrition-values.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
 photo_url=source['image'].replace('chuchitisch.ch//','chuchitisch.ch/');raw=urllib.request.urlopen(photo_url,timeout=30).read()
 im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1200,1200));photo_path=f'assets/recipe-photos/{RID}.webp';im.save(ROOT/photo_path,'WEBP',quality=85)
 mp=ROOT/'data/recipe-photo-sources.json';manifest=json.loads(mp.read_text());assert not any(p['recipeId']==RID for p in manifest['photos'])
 manifest['photos'].append(dict(recipeId=RID,path=photo_path,source=SOURCE,author='Hannes und Martina',license='CC BY-SA 3.0',licenseUrl=LICENSE,kind='photograph',servingSuggestion=False,title='Chäshörnli',provider='Chuchitisch',adaptation='Als WebP komprimiert; Bildinhalt unverändert.',review='Exakt passendes Originalfoto der Rezeptseite: Hörnli-Pasta mit Broccoliröschen und Tomatenschnitzen. Alle sichtbaren Lebensmittel gehören zur Rezeptfassung; keine zusätzliche Garnitur erkannt. Urhebergrundlage sind Autorenkonto und Eigene-Fotos-Erklärung; kein separat benannter Fotograf.',reviewedAt='2026-10-24',originalPhotoUrl=photo_url,originalPhotoSha256=hashlib.sha256(raw).hexdigest()))
 mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
values=json.loads((DOC/'nutrition-values.json').read_text())
notes=['Original für 2 Personen; Zutaten und geschätzte Nährwerte auf eine Person umgerechnet. Kein Mengen- oder Portionsbereich.','Originale Stückangaben: 1 kleiner Broccoli und 2 Tomaten. Für die Berechnung wurden im gesamten Originalansatz 500 g Broccoli und 240 g Tomaten als offengelegte Richtgewichte angesetzt; tatsächliche Stückgewichte können abweichen.','Pasta mit USDA-Trockenteigwaren angenähert. Reibkäse mit USDA-Parmesan angenähert; Käsesorte, Fettgehalt und Nährwerte können abweichen.','Salz steht im Original ohne Menge. Für zwei Personen wurden 2 g als offengelegte Richtmenge ergänzt und nicht in die Makronährwerte eingerechnet.']
total=dict.fromkeys(['kcal','protein','carbs','fat','fiber'],0.)
for n,q,u,k,g in ROWS:
 if not k:continue
 p=values[k]['per100g']
 for z in total:total[z]+=(max(0,p['carbs']-p['fiber']) if z=='carbs' else p[z])*g/200
r=dict(id=RID,name='Chäshörnli mit Broccoli und Tomaten',type='Hauptmahlzeit',diet='Vegetarisch',dish='🧀',cuisine='Schweizerisch',mealTimes=['Mittagessen','Abendessen'],prepMinutes=15,cookMinutes=15,difficulty='Sehr einfach',allergens=['Gluten','Milch'],tags=['Chuchitisch','Hörnli','Broccoli','Tomaten','Schweiz','Originalfoto'],ingredients=[dict(name=n,amount=round(q/2,4),unit=u) for n,q,u,k,g in ROWS],steps=['Broccoli waschen und in gleichmässige kleine Röschen teilen. Tomaten waschen und in Schnitze schneiden.','Broccoliröschen in wenig leicht gesalzenem Wasser zugedeckt einige Minuten sanft köcheln, bis sie bissfest sind. Abgiessen und kurz mit kaltem Wasser abschrecken.','Hörnli in reichlich Salzwasser nach Packungsangabe al dente kochen. Vor dem Abgiessen etwas Kochwasser auffangen.','Hörnli, Broccoli, Tomatenschnitze und Reibkäse im warmen Topf vorsichtig mischen. Bei Bedarf wenig Kochwasser einrühren, bis der Käse die Zutaten leicht bindet.','Sofort anrichten und heiss servieren.'],nutrition={k:round(v,2) for k,v in total.items()},nutritionEstimate=dict(method='Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.',basis='Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. '+' '.join(notes),sources='docs/recipe-candidates/import-2026-10-24/nutrition-values.json',ingredients=[dict(name=n,grams=round(g/2,4),foodKey=k,excluded=k is None) for n,q,u,k,g in ROWS]),status='approved',description='Einfache Schweizer Chäshörnli mit Broccoli, Tomaten und Reibkäse nach Chuchitisch. Mengen und geschätzte Nährwerte pro Person.',equipment=['Zwei Kochtöpfe mit Deckel','Sieb','Küchenmesser','Schneidebrett'],prepNotes=notes,doneness='Die Hörnli sind al dente, der Broccoli ist bissfest und der Käse haftet geschmolzen an Pasta und Gemüse.',substitutions=['Eine andere kurze Pasta ist möglich; bei glutenfreier Pasta Produktetikett und Garzeit beachten.','Ein anderer Reibkäse ist möglich; Salzgehalt, Allergene und Nährwerte entsprechend prüfen.'],leftovers='Reste rasch abkühlen, abgedeckt gekühlt lagern und innerhalb von 24 Stunden verbrauchen. Beim Erwärmen vollständig durcherhitzen.',safety='Broccoli nach dem Kochen vollständig abgiessen und beim Mischen vorsichtig arbeiten, damit kein heisses Wasser spritzt.',recipeCredit=dict(author='Hannes und Martina',provider='Chuchitisch',source=SOURCE,license='CC BY-SA 3.0',licenseUrl=LICENSE,originalServings=2,adaptation='Auf eine Person umgerechnet; Schritte gegliedert und Garmerkmale ergänzt. '+' '.join(notes)),resilience=dict(power='normal',refrigeration='required',shelfStableShare=.3,waterMl=1500,noCook=False,onePot=False))
(ROOT/'data/quality-batch-chuchitisch-v10.json').write_text(json.dumps([r],ensure_ascii=False,indent=2)+'\n');print(r['nutrition'])
