"""Reproduce reviewed Chuchitisch recipe 261 and its documented evidence."""
import hashlib,html,io,json,pathlib,re,sys,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];DOC=ROOT/'docs/recipe-candidates/import-2026-10-21'
RID='chuchitisch-broccoli-birnen-suppe';SOURCE='https://chuchitisch.ch/recipes/261';LICENSE='https://creativecommons.org/licenses/by-sa/3.0/'
ROWS=[('Broccoli',500,'g','170379',500),('Zwiebel',100,'g','170000',100),('Gemüsebouillon',200,'ml','171583',200),('Birne, geschält',180,'g','169118',180),('Butter',20,'g','173430',20),('Rapsöl',30,'ml','172336',27.3),('Honig',7,'g','169640',7),('Salz',1,'g',None,1)]
if '--collect' in sys.argv:
 DOC.mkdir(parents=True,exist_ok=True);evidence=[];source=None
 for url in ['http://chuchitisch.ch/recipes/261','http://chuchitisch.ch/chuchitisch/lizenz']:
  raw=urllib.request.urlopen(url,timeout=30).read();page=raw.decode()
  if '/recipes/' in url:
   source=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',page,re.S).group(1),strict=False)
   assert source['name']=='Broccoli-Suppe mit glasierten Birnen' and source['recipeYield']=='2 Personen'
   assert source['author']['name']=='Hannes und Martina' and 'by-sa/3.0' in source['license']
  else:assert all(s in page for s in ['sowohl Rezepte als auch Bilder','eigenen Fotos','by-sa/3.0'])
  clean=re.sub(r'<(script|style)\b.*?</\1>',' ',page,flags=re.S);clean=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',clean))).strip()
  evidence.append(dict(url=url,retrievedAt='2026-10-21',sha256=hashlib.sha256(raw).hexdigest(),text=clean))
 (DOC/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
 (DOC/'source-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
 data=json.loads(pathlib.Path(sys.argv[sys.argv.index('--collect')+1]).read_text());data=data.get('SRLegacyFoods',data) if isinstance(data,dict) else data
 ids={x[3] for x in ROWS if x[3]};mapping={1008:'kcal',1003:'protein',1005:'carbs',1004:'fat',1079:'fiber'};values={}
 for record in data:
  key=str(record['fdcId'])
  if key not in ids:continue
  per={mapping[n['nutrient']['id']]:n['amount'] for n in record['foodNutrients'] if n['nutrient']['id'] in mapping}
  assert set(per)==set(mapping.values());values[key]=dict(description=record['description'],per100g=per,source=f'https://fdc.nal.usda.gov/food-details/{key}/nutrients')
 assert set(values)==ids
 (DOC/'nutrition-values.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
 photo_url=source['image'].replace('chuchitisch.ch//','chuchitisch.ch/');raw=urllib.request.urlopen(photo_url,timeout=30).read()
 im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1200,1200));photo_path=f'assets/recipe-photos/{RID}.webp';im.save(ROOT/photo_path,'WEBP',quality=85)
 mp=ROOT/'data/recipe-photo-sources.json';manifest=json.loads(mp.read_text());assert not any(p['recipeId']==RID for p in manifest['photos'])
 manifest['photos'].append(dict(recipeId=RID,path=photo_path,source=SOURCE,author='Hannes und Martina',license='CC BY-SA 3.0',licenseUrl=LICENSE,kind='photograph',servingSuggestion=True,title='Broccoli-Suppe mit glasierten Birnen',provider='Chuchitisch',adaptation='Verkleinert und als WebP komprimiert; Bildinhalt unverändert.',review='Originalfoto der Rezeptseite: pürierte Broccolisuppe mit glasierten Birnenschnitzen und einem Broccoliröschen. Serviervorschlag; Mengen und Portionsgrösse nicht aus dem Foto ableitbar. Urhebergrundlage sind Autorenkonto und Eigene-Fotos-Erklärung; kein separat benannter Fotograf.',reviewedAt='2026-10-21',originalPhotoUrl=photo_url,originalPhotoSha256=hashlib.sha256(raw).hexdigest()))
 mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
values=json.loads((DOC/'nutrition-values.json').read_text())
notes=['Original für 2 Personen; alle Zutaten und geschätzten Nährwerte auf eine Person umgerechnet. Kein Mengen- oder Portionsbereich.','Richtgewichte im Originalansatz, keine exakten Originalgewichte: 1 Kopf Broccoli = 500 g essbarer Anteil, 1 Zwiebel = 100 g, 1 geschälte entkernte Birne = 180 g. Sorten und tatsächliche Stückgewichte können abweichen.','2 EL Pflanzenöl als 30 ml Rapsöl konkretisiert; Dichte 0.91 g/ml. 1 TL Honig = 7 g. Salz mit 1 g im Originalansatz als ergänzte Richtmenge nach Geschmack aufgenommen, da es nur in der Zubereitung genannt ist; nicht in Nährwerten eingerechnet.','Gemüsebouillon für die Berechnung mit USDA-Gemüsebrühe angenähert und vereinfacht 1 ml = 1 g. Produktetikett auf Sellerie und weitere Allergene prüfen.','Originalfoto als Serviervorschlag. Es zeigt die im Rezept enthaltenen Birnenschnitze und ein Broccoliröschen; keine zusätzlichen Lebensmittel erkannt.']
total=dict.fromkeys(['kcal','protein','carbs','fat','fiber'],0.)
for n,q,u,k,g in ROWS:
 if not k:continue
 p=values[k]['per100g']
 for z in total:total[z]+=(max(0,p['carbs']-p['fiber']) if z=='carbs' else p[z])*g/200
r=dict(id=RID,name='Broccoli-Suppe mit glasierten Birnen',type='Hauptmahlzeit',diet='Vegetarisch',dish='🥣',cuisine='Europäisch inspiriert',mealTimes=['Mittagessen','Abendessen'],prepMinutes=10,cookMinutes=20,difficulty='Einfach',allergens=['Milch','Sellerie'],tags=['Chuchitisch','Broccoli','Birne','Suppe','Originalfoto'],ingredients=[dict(name=n,amount=round(q/2,4),unit=u) for n,q,u,k,g in ROWS],steps=['Broccoli waschen. Röschen abtrennen und den Strunk schälen beziehungsweise harte Stellen entfernen; den Strunk klein schneiden. Zwiebel schälen und fein hacken.','Die Hälfte des Rapsöls in einem Topf erhitzen. Zwiebel, Broccoliröschen und Strunkstücke bei mittlerer Hitze einige Minuten andünsten, ohne sie stark zu bräunen.','Mit Gemüsebouillon ablöschen, aufkochen und ungefähr 10 Minuten sanft köcheln, bis der Broccoli weich ist.','Topf vom Herd nehmen, die Suppe vorsichtig glatt pürieren und mit Salz abschmecken. Warm halten, aber nicht stark weiterkochen.','Birne schälen, entkernen und längs in Schnitze schneiden. Butter mit dem restlichen Rapsöl in einer Pfanne bei mittlerer Hitze schmelzen.','Birnenschnitze hineinlegen, mit Honig beträufeln und vorsichtig auf beiden Seiten goldbraun glasieren. Die Birnen sollen weich werden, aber ihre Form behalten.','Suppe auf Schüsseln verteilen und die glasierten Birnenschnitze darauf anrichten.'],nutrition={k:round(v,2) for k,v in total.items()},nutritionEstimate=dict(method='Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.',basis='Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. '+' '.join(notes),sources='docs/recipe-candidates/import-2026-10-21/nutrition-values.json',ingredients=[dict(name=n,grams=round(g/2,4),foodKey=k,excluded=k is None) for n,q,u,k,g in ROWS]),status='approved',description='Pürierte Broccolisuppe mit in Butter und Honig glasierten Birnenschnitzen nach Chuchitisch. Mengen und geschätzte Nährwerte pro Person; Originalfoto als Serviervorschlag.',equipment=['Kochtopf','Küchenmesser','Schneidebrett','Stabmixer','Bratpfanne'],prepNotes=notes,doneness='Der Broccoli ist vollständig weich und die Suppe glatt püriert. Die Birnenschnitze sind goldbraun und weich, behalten jedoch ihre Form.',substitutions=['Geschmacksneutrales Pflanzenöl kann Rapsöl ersetzen; für Milchfreiheit Butter durch eine geeignete pflanzliche Alternative ersetzen und Allergene sowie Nährwerte neu prüfen.'],leftovers='Suppe und Birnen möglichst getrennt rasch abkühlen, abgedeckt gekühlt lagern und zeitnah verbrauchen. Suppe vollständig durcherhitzen; Birnen separat kurz erwärmen.',safety='Beim Pürieren heisser Suppe den Topf vom Herd nehmen und den Mixerkopf eingetaucht halten. Butter und Honig nicht zu stark erhitzen; die Birnen unter Aufsicht glasieren.',recipeCredit=dict(author='Hannes und Martina',provider='Chuchitisch',source=SOURCE,license='CC BY-SA 3.0',licenseUrl=LICENSE,originalServings=2,adaptation='Auf eine Person umgerechnet; Schritte gegliedert und Garmerkmale ergänzt. '+' '.join(notes)),resilience=dict(power='normal',refrigeration='required',shelfStableShare=.2,waterMl=100,noCook=False,onePot=False))
(ROOT/'data/quality-batch-chuchitisch-v7.json').write_text(json.dumps([r],ensure_ascii=False,indent=2)+'\n');print(r['nutrition'])
