"""Reproduce reviewed Chuchitisch recipe 28 and its source evidence."""
import hashlib,html,io,json,pathlib,re,sys,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];DOC=ROOT/'docs/recipe-candidates/import-2026-10-22'
RID='chuchitisch-rueaebli-suppe';SOURCE='https://chuchitisch.ch/recipes/28';LICENSE='https://creativecommons.org/licenses/by-sa/3.0/'
ROWS=[('Karotten',400,'g','170393',400),('Gemüsebouillon',500,'ml','171583',500),('Frischkäse',100,'g','173418',100),('Orangensaft',75,'ml','169100',75),('Salz',1,'g',None,1)]
if '--collect' in sys.argv:
 DOC.mkdir(parents=True,exist_ok=True);evidence=[];source=None
 for url in ['http://chuchitisch.ch/recipes/28','http://chuchitisch.ch/chuchitisch/lizenz']:
  raw=urllib.request.urlopen(url,timeout=30).read();page=raw.decode()
  if '/recipes/' in url:
   source=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',page,re.S).group(1),strict=False)
   assert source['name'].strip()=='Rüäbli-Suppä' and source['recipeYield']=='2 Personen'
   assert source['author']['name']=='Annet' and 'by-sa/3.0' in source['license']
  else:assert all(s in page for s in ['sowohl Rezepte als auch Bilder','eigenen Fotos','by-sa/3.0'])
  clean=re.sub(r'<(script|style)\b.*?</\1>',' ',page,flags=re.S);clean=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',clean))).strip()
  evidence.append(dict(url=url,retrievedAt='2026-10-22',sha256=hashlib.sha256(raw).hexdigest(),text=clean))
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
 manifest['photos'].append(dict(recipeId=RID,path=photo_path,source=SOURCE,author='Annet',license='CC BY-SA 3.0',licenseUrl=LICENSE,kind='photograph',servingSuggestion=True,title='Rüäbli-Suppä',provider='Chuchitisch',adaptation='Verkleinert und als WebP komprimiert; Bildinhalt unverändert.',review='Originalfoto der Rezeptseite: orangefarbene Karottensuppe mit Petersiliengarnitur und Toaststäbchen. Serviervorschlag; Petersilie und Toast sind nicht Bestandteil der Grundfassung und nicht eingerechnet. Urhebergrundlage sind Autorenkonto und Eigene-Fotos-Erklärung; kein separat benannter Fotograf.',reviewedAt='2026-10-22',originalPhotoUrl=photo_url,originalPhotoSha256=hashlib.sha256(raw).hexdigest()))
 mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
values=json.loads((DOC/'nutrition-values.json').read_text())
notes=['Original für 2 Personen; Zutaten und geschätzte Nährwerte auf eine Person umgerechnet. Kein Mengen- oder Portionsbereich.','5 dl Gemüsebouillon = 500 ml und 7½ cl Orangensaft = 75 ml im Originalansatz. Flüssigkeiten für die Berechnung vereinfacht 1 ml = 1 g.','Frischkäse im Original beispielsweise Philadelphia; für die Nährwerte mit USDA-Vollfett-Frischkäse angenähert. Marken und Fettstufen können deutlich abweichen.','Salz nach Geschmack mit 1 g im Originalansatz als offengelegte Richtmenge angesetzt und nicht in die Makronährwerte eingerechnet. Gemüsebouillon mit USDA-Gemüsebrühe angenähert; Produktetikett auf Sellerie und weitere Allergene prüfen.','Originalfoto als Serviervorschlag. Das Foto zeigt zusätzlich Petersilie und ein Toaststäbchen; beides ist optional, nicht Bestandteil der Grundfassung und nicht in Nährwerten oder Allergenen eingerechnet. Bei Toast Gluten ergänzen.']
total=dict.fromkeys(['kcal','protein','carbs','fat','fiber'],0.)
for n,q,u,k,g in ROWS:
 if not k:continue
 p=values[k]['per100g']
 for z in total:total[z]+=(max(0,p['carbs']-p['fiber']) if z=='carbs' else p[z])*g/200
r=dict(id=RID,name='Rüäbli-Suppä nach Chuchitisch',type='Hauptmahlzeit',diet='Vegetarisch',dish='🥕',cuisine='Schweizerisch',mealTimes=['Mittagessen','Abendessen'],prepMinutes=10,cookMinutes=15,difficulty='Sehr einfach',allergens=['Milch','Sellerie'],tags=['Chuchitisch','Karotten','Suppe','Schweiz','Originalfoto'],ingredients=[dict(name=n,amount=round(q/2,4),unit=u) for n,q,u,k,g in ROWS],steps=['Karotten waschen, schälen und in ungefähr gleich grosse grobe Stücke schneiden.','Karottenstücke mit der Gemüsebouillon in einen Topf geben, zugedeckt aufkochen und etwa 15 Minuten sanft köcheln lassen, bis sie sich leicht mit einer Gabel einstechen lassen.','Topf vom Herd nehmen. Frischkäse und Orangensaft zugeben.','Die Suppe mit einem Stabmixer vorsichtig glatt pürieren. Bei Bedarf wenig Wasser oder Bouillon ergänzen, bis die gewünschte Konsistenz erreicht ist.','Mit Salz abschmecken und heiss servieren. Petersilie und Toaststäbchen auf dem Foto sind ein optionaler Serviervorschlag und nicht eingerechnet.'],nutrition={k:round(v,2) for k,v in total.items()},nutritionEstimate=dict(method='Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.',basis='Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. '+' '.join(notes),sources='docs/recipe-candidates/import-2026-10-22/nutrition-values.json',ingredients=[dict(name=n,grams=round(g/2,4),foodKey=k,excluded=k is None) for n,q,u,k,g in ROWS]),status='approved',description='Schweizer Karottensuppe mit Frischkäse und Orangensaft nach einem Chuchitisch-Rezept von Annet. Mengen und geschätzte Nährwerte pro Person; Originalfoto als Serviervorschlag.',equipment=['Kochtopf mit Deckel','Küchenmesser','Schneidebrett','Stabmixer'],prepNotes=notes,doneness='Die Karotten sind vollständig weich und die Suppe ist gleichmässig glatt püriert, ohne harte Stücke.',substitutions=['Eine andere Frischkäsemarke ist möglich; Fettgehalt, Salz, Allergene und Nährwerte können abweichen. Toast nur separat ergänzen und Gluten berücksichtigen.'],leftovers='Reste rasch abkühlen, abgedeckt gekühlt lagern und zeitnah verbrauchen. Vor dem Essen unter Rühren vollständig durcherhitzen, aber nicht unnötig lange kochen.',safety='Zum Pürieren den Topf vom Herd nehmen und den Mixerkopf eingetaucht halten, damit die heisse Suppe nicht spritzt.',recipeCredit=dict(author='Annet',provider='Chuchitisch',source=SOURCE,license='CC BY-SA 3.0',licenseUrl=LICENSE,originalServings=2,adaptation='Auf eine Person umgerechnet; Schritte gegliedert und Garmerkmale ergänzt. '+' '.join(notes)),resilience=dict(power='normal',refrigeration='required',shelfStableShare=.1,waterMl=250,noCook=False,onePot=True))
(ROOT/'data/quality-batch-chuchitisch-v8.json').write_text(json.dumps([r],ensure_ascii=False,indent=2)+'\n');print(r['nutrition'])
