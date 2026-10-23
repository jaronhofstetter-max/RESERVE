"""Reproduce reviewed Chuchitisch recipe 494 and its source evidence."""
import hashlib,html,io,json,pathlib,re,sys,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];DOC=ROOT/'docs/recipe-candidates/import-2026-10-23'
RID='chuchitisch-gerstensuppe';SOURCE='https://chuchitisch.ch/recipes/494';LICENSE='https://creativecommons.org/licenses/by-sa/3.0/'
# Original quantities for four people. Piece/bundle weights and seasoning are documented estimates.
ROWS=[('Lauch',100,'g','169246',100),('Knollensellerie',100,'g','169988',100),('Karotten',100,'g','170393',100),('Rollgerste',150,'g','170284',150),('Gemüsebouillon',2000,'ml','171583',2000),('Rahm',100,'ml','170857',100),('Zwiebel',100,'g','170000',100),('Butter',20,'g','173410',20),('Schnittlauch',20,'g','169994',20),('Salz',4,'g',None,4),('Pfeffer',1,'g',None,1)]
if '--collect' in sys.argv:
 DOC.mkdir(parents=True,exist_ok=True);evidence=[];source=None
 for url in ['http://chuchitisch.ch/recipes/494','http://chuchitisch.ch/chuchitisch/lizenz']:
  raw=urllib.request.urlopen(url,timeout=30).read();page=raw.decode()
  if '/recipes/' in url:
   source=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',page,re.S).group(1),strict=False)
   assert source['name'].strip()=='Gerstensuppe' and source['recipeYield']=='4 Personen'
   assert source['author']['name']=='Hannes und Martina' and 'by-sa/3.0' in source['license']
  else:assert all(s in page for s in ['sowohl Rezepte als auch Bilder','eigenen Fotos','by-sa/3.0'])
  clean=re.sub(r'<(script|style)\b.*?</\1>',' ',page,flags=re.S);clean=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',clean))).strip()
  evidence.append(dict(url=url,retrievedAt='2026-10-23',sha256=hashlib.sha256(raw).hexdigest(),text=clean))
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
 manifest['photos'].append(dict(recipeId=RID,path=photo_path,source=SOURCE,author='Hannes und Martina',license='CC BY-SA 3.0',licenseUrl=LICENSE,kind='photograph',servingSuggestion=False,title='Gerstensuppe',provider='Chuchitisch',adaptation='Als WebP komprimiert; Bildinhalt unverändert.',review='Exakt passendes Originalfoto der Rezeptseite: cremige Gerstensuppe mit den enthaltenen Gemüsewürfeln und Schnittlauch. Keine zusätzlichen Lebensmittel erkannt. Urhebergrundlage sind Autorenkonto und Eigene-Fotos-Erklärung; kein separat benannter Fotograf.',reviewedAt='2026-10-23',originalPhotoUrl=photo_url,originalPhotoSha256=hashlib.sha256(raw).hexdigest()))
 mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
values=json.loads((DOC/'nutrition-values.json').read_text())
notes=['Original für 4 Personen; Zutaten und geschätzte Nährwerte auf eine Person umgerechnet. Kein Mengen- oder Portionsbereich.','2 l Gemüsebouillon = 2000 ml und 1 dl Rahm = 100 ml im Originalansatz. Flüssigkeiten für die Berechnung vereinfacht 1 ml = 1 g.','Dokumentierte Richtgewichte im Originalansatz: 1 Zwiebel = 100 g und 1 Bund Schnittlauch = 20 g. Stück- und Bundgewicht können abweichen.','Rahm mit USDA-Kaffeerahm angenähert; Fettgehalt und Nährwerte können je nach Produkt abweichen. Gemüsebouillon mit USDA-Gemüsebrühe angenähert.','Salz und Pfeffer stehen nur in der Zubereitung. Für vier Personen wurden 4 g Salz und 1 g Pfeffer als offengelegte Richtmengen ergänzt; beide sind nicht in die Makronährwerte eingerechnet. Produktetikett der Bouillon auf weitere Allergene prüfen.']
total=dict.fromkeys(['kcal','protein','carbs','fat','fiber'],0.)
for n,q,u,k,g in ROWS:
 if not k:continue
 p=values[k]['per100g']
 for z in total:total[z]+=(max(0,p['carbs']-p['fiber']) if z=='carbs' else p[z])*g/400
r=dict(id=RID,name='Schweizer Gerstensuppe nach Chuchitisch',type='Hauptmahlzeit',diet='Vegetarisch',dish='🥣',cuisine='Schweizerisch',mealTimes=['Mittagessen','Abendessen'],prepMinutes=20,cookMinutes=60,difficulty='Einfach',allergens=['Gluten','Milch','Sellerie'],tags=['Chuchitisch','Gerste','Suppe','Schweiz','Originalfoto'],ingredients=[dict(name=n,amount=round(q/4,4),unit=u) for n,q,u,k,g in ROWS],steps=['Lauch, Sellerie, Karotten und Schnittlauch gründlich waschen. Lauch, Sellerie und Karotten rüsten und in kleine, möglichst gleichmässige Würfel schneiden. Zwiebel fein hacken; Schnittlauch für den Schluss fein schneiden.','Butter in einem grossen Topf bei mittlerer Hitze schmelzen. Zwiebel darin glasig dünsten, ohne sie stark zu bräunen.','Lauch, Sellerie, Karotten und Rollgerste zugeben und unter Rühren etwa 2 Minuten mitdünsten.','Mit der Gemüsebouillon ablöschen, zugedeckt aufkochen und anschliessend etwa 60 Minuten sanft köcheln lassen. Gelegentlich umrühren, bis die Gerste weich, aber noch leicht bissfest ist.','Rahm einrühren und die Suppe nochmals kurz aufkochen. Mit Salz und Pfeffer abschmecken, mit Schnittlauch bestreuen und heiss servieren.'],nutrition={k:round(v,2) for k,v in total.items()},nutritionEstimate=dict(method='Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.',basis='Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. '+' '.join(notes),sources='docs/recipe-candidates/import-2026-10-23/nutrition-values.json',ingredients=[dict(name=n,grams=round(g/4,4),foodKey=k,excluded=k is None) for n,q,u,k,g in ROWS]),status='approved',description='Cremige Schweizer Gerstensuppe mit Lauch, Sellerie, Karotten und Schnittlauch nach Chuchitisch. Mengen und geschätzte Nährwerte pro Person.',equipment=['Grosser Kochtopf mit Deckel','Küchenmesser','Schneidebrett','Kochlöffel'],prepNotes=notes,doneness='Die Gerste ist vollständig gegart und weich, besitzt aber noch leichten Biss; das Gemüse ist zart und die Suppe cremig gebunden.',substitutions=['Rahm kann durch eine andere Kochrahmstufe ersetzt werden; Fettgehalt, Allergene und Nährwerte entsprechend prüfen.','Für eine rein vegetarische Fassung Gemüsebouillon ohne tierische Zutaten verwenden.'],leftovers='Reste rasch abkühlen, abgedeckt gekühlt lagern und innerhalb von 24 Stunden verbrauchen. Beim Erwärmen unter Rühren vollständig durcherhitzen; bei Bedarf etwas Wasser ergänzen.',safety='Die Suppe beim langen Köcheln regelmässig umrühren, damit Gerste und Gemüse nicht am Topfboden ansetzen.',recipeCredit=dict(author='Hannes und Martina',provider='Chuchitisch',source=SOURCE,license='CC BY-SA 3.0',licenseUrl=LICENSE,originalServings=4,adaptation='Auf eine Person umgerechnet; Schritte gegliedert und Garmerkmale ergänzt. '+' '.join(notes)),resilience=dict(power='normal',refrigeration='required',shelfStableShare=.2,waterMl=500,noCook=False,onePot=True))
(ROOT/'data/quality-batch-chuchitisch-v9.json').write_text(json.dumps([r],ensure_ascii=False,indent=2)+'\n');print(r['nutrition'])
