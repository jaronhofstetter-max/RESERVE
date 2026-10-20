"""Reviewed Chuchitisch 486 import. --collect requires USDA SR Legacy JSON path."""
import hashlib, html, io, json, pathlib, re, sys, urllib.request
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]
DOC=ROOT/'docs/recipe-candidates/import-2026-10-20'
ID='chuchitisch-peperoni-apfel-suppe'
SOURCE='https://chuchitisch.ch/recipes/486'
LICENSE='https://creativecommons.org/licenses/by-sa/3.0/'
# Full original two-person approach. Last column = edible grams for nutrition.
ROWS=[('Zwiebel',100,'g','170000',100),('Rote Peperoni',600,'g','170108',600),('Karotte',100,'g','170393',100),('Gemüsebouillon',800,'ml','171583',800),('Apfel, geschält',150,'g','171689',150),('Naturjoghurt',150,'g','171284',150),('Honig',21,'g','169640',21),('Apfelessig',30,'ml','173469',30),('Olivenöl',30,'ml','171413',27.3),('Kürbiskerne',30,'g','170556',30),('Basilikum, frisch',2,'g','172232',2)]

if '--collect' in sys.argv:
    DOC.mkdir(parents=True,exist_ok=True)
    evidence=[]
    source=None
    for url in ['http://chuchitisch.ch/recipes/486','http://chuchitisch.ch/chuchitisch/lizenz']:
        raw=urllib.request.urlopen(url,timeout=30).read();page=raw.decode()
        if '/recipes/' in url:
            source=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',page,re.S).group(1),strict=False)
            assert source['name']=='Peperoni-Apfel-Suppe' and source['recipeYield']=='2 Personen'
            assert source['author']['name']=='Hannes und Martina' and 'by-sa/3.0' in source['license']
        else:
            assert all(s in page for s in ['sowohl Rezepte als auch Bilder','eigenen Fotos','by-sa/3.0'])
        clean=re.sub(r'<(script|style)\b.*?</\1>',' ',page,flags=re.S)
        clean=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',clean))).strip()
        evidence.append(dict(url=url,retrievedAt='2026-10-20',sha256=hashlib.sha256(raw).hexdigest(),text=clean))
    (DOC/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
    (DOC/'source-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
    data=json.loads(pathlib.Path(sys.argv[sys.argv.index('--collect')+1]).read_text())
    if isinstance(data,dict):data=data['SRLegacyFoods']
    mapping={1008:'kcal',1003:'protein',1005:'carbs',1004:'fat',1079:'fiber'}
    keys={row[3] for row in ROWS};values={}
    for record in data:
        key=str(record['fdcId'])
        if key not in keys:continue
        per={mapping[n['nutrient']['id']]:n['amount'] for n in record['foodNutrients'] if n['nutrient']['id'] in mapping}
        assert set(per)==set(mapping.values())
        values[key]=dict(description=record['description'],per100g=per,source=f'https://fdc.nal.usda.gov/food-details/{key}/nutrients')
    assert set(values)==keys
    (DOC/'nutrition-values.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
    photo_url=source['image'].replace('chuchitisch.ch//','chuchitisch.ch/')
    raw=urllib.request.urlopen(photo_url,timeout=30).read()
    im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1200,1200))
    photo_path=f'assets/recipe-photos/{ID}.webp';im.save(ROOT/photo_path,'WEBP',quality=85)
    path=ROOT/'data/recipe-photo-sources.json';manifest=json.loads(path.read_text())
    assert not any(p['recipeId']==ID for p in manifest['photos'])
    manifest['photos'].append(dict(recipeId=ID,path=photo_path,source=SOURCE,author='Hannes und Martina',license='CC BY-SA 3.0',licenseUrl=LICENSE,kind='photograph',servingSuggestion=True,title='Peperoni-Apfel-Suppe',provider='Chuchitisch',adaptation='Verkleinert und als WebP komprimiert; Bildinhalt unverändert.',review='Originalfoto der Rezeptseite: orangefarbene pürierte Suppe mit Kürbiskernen und Basilikum. Serviervorschlag; genaue Zutaten und Portionsmengen nicht visuell nachweisbar. Autorenkonto und globale Erklärung zu eigenen Fotos bilden die Urhebergrundlage; kein separat genannter Fotograf.',reviewedAt='2026-10-20',originalPhotoUrl=photo_url,originalPhotoSha256=hashlib.sha256(raw).hexdigest()))
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

values=json.loads((DOC/'nutrition-values.json').read_text())
notes=[
    'Original für 2 Personen; Zutaten und geschätzte Nährwerte auf eine Person umgerechnet. Kein Portionsbereich.',
    'Richtgewichte im Originalansatz, nicht exakte Originalmengen: 1 Zwiebel = 100 g, 4 entkernte Peperoni = 600 g, 1 Karotte = 100 g, 1 geschälter entkernter Apfel = 150 g, 1 Zweig Basilikum = 2 g. Rote Peperoni als konkrete Variante gewählt; schweizerisches Peperoni bedeutet Gemüsepaprika, nicht scharfe Chili.',
    '1½ dl Naturjoghurt = näherungsweise 150 g, 1 EL Honig = 21 g, 2 EL Apfelessig = 30 ml, 2 EL Olivenöl = 30 ml, 3 EL Kürbiskerne = 30 g. Öldichte 0.91 g/ml; Bouillon, Essig und Joghurt vereinfacht 1 ml = 1 g. EL-Gewichte sind Annahmen, keine Waagenmessung der Quelle.',
    'Naturjoghurt aus Vollmilch für die Berechnung. Gemüsebouillon als USDA-Gemüsebrühe angenähert; Salzgehalt und weitere Allergene hängen vom Produkt ab. Bouillon auf Sellerie prüfen.',
    'Originalfoto als Serviervorschlag. Kürbiskerne und Basilikum sind in den Zutaten und Nährwerten enthalten; die sichtbare Schüsselgrösse legt keine Portionsgrösse fest.',
]
total=dict.fromkeys(['kcal','protein','carbs','fat','fiber'],0.)
for n,q,u,k,g in ROWS:
    per=values[k]['per100g']
    for nutrient in total:total[nutrient]+=(max(0,per['carbs']-per['fiber']) if nutrient=='carbs' else per[nutrient])*g/200
r=dict(id=ID,name='Peperoni-Apfel-Suppe nach Chuchitisch',type='Hauptmahlzeit',diet='Vegetarisch',dish='🥣',cuisine='Schweizerisch inspiriert',mealTimes=['Mittagessen','Abendessen'],prepMinutes=10,cookMinutes=20,difficulty='Einfach',allergens=['Milch','Sellerie'],tags=['Chuchitisch','Suppe','Peperoni','Apfel','Originalfoto'],ingredients=[dict(name=n,amount=round(q/2,4),unit=u) for n,q,u,k,g in ROWS],steps=[
    'Peperoni waschen, entkernen und klein schneiden. Karotte schälen und klein schneiden. Zwiebel schälen und hacken.',
    'Olivenöl in einem Topf erhitzen. Zwiebel bei mittlerer Hitze kurz andünsten, dann Peperoni und Karotte zugeben und einige Minuten mitdünsten.',
    'Mit der Gemüsebouillon aufgiessen, aufkochen und etwa 15 Minuten sanft köcheln, bis Peperoni und Karotte weich sind.',
    'Topf vom Herd nehmen und die Suppe mit einem Stabmixer glatt pürieren. Den Mixerkopf eingetaucht halten, damit die heisse Suppe nicht spritzt.',
    'Apfel schälen, entkernen und grob reiben. Mit Honig, Naturjoghurt und Apfelessig in die nicht mehr kochende Suppe rühren. Nicht erneut aufkochen.',
    'Basilikum waschen und in Streifen schneiden. Kürbiskerne in einer beschichteten Pfanne ohne zusätzliches Fett unter Wenden leicht rösten, ohne sie dunkel werden zu lassen.',
    'Suppe auf Schüsseln verteilen und mit Basilikum sowie gerösteten Kürbiskernen servieren.',
],nutrition={k:round(v,2) for k,v in total.items()},nutritionEstimate=dict(method='Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.',basis='Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. '+' '.join(notes),sources='docs/recipe-candidates/import-2026-10-20/nutrition-values.json',ingredients=[dict(name=n,grams=round(g/2,4),foodKey=k,excluded=False) for n,q,u,k,g in ROWS]),status='approved',description='Pürierte Peperoni-Karotten-Suppe mit frisch geriebenem Apfel, Joghurt, Basilikum und gerösteten Kürbiskernen nach Chuchitisch. Mengen und geschätzte Nährwerte pro Person; Originalfoto als Serviervorschlag.',equipment=['Kochtopf','Küchenmesser','Schneidebrett','Stabmixer','grobe Reibe','beschichtete Pfanne'],prepNotes=notes,doneness='Peperoni und Karotte sind weich und lassen sich glatt pürieren. Joghurt und Apfel erst in die nicht mehr kochende Suppe rühren; Kerne leicht geröstet, nicht verbrannt.',substitutions=['Für eine pflanzliche Variante pflanzlichen Joghurt und ein alternatives Süssungsmittel verwenden; Nährwerte und Allergene neu prüfen. Die Originalfassung enthält Milch und Honig.'],leftovers='Suppe möglichst vor der Zugabe von Apfel und Joghurt vorbereiten und diese erst zum Servieren ergänzen. Reste rasch abkühlen, abgedeckt gekühlt lagern und zeitnah verbrauchen.',safety='Zum Pürieren den Topf vom Herd nehmen und den Mixerkopf eingetaucht halten. Heisse Flüssigkeit vorsichtig handhaben; Kerne beim Rösten nicht unbeaufsichtigt lassen.',recipeCredit=dict(author='Hannes und Martina',provider='Chuchitisch',source=SOURCE,license='CC BY-SA 3.0',licenseUrl=LICENSE,originalServings=2,adaptation='Auf eine Person umgerechnet; Schritte gegliedert und Garmerkmale ergänzt. '+' '.join(notes)),resilience=dict(power='normal',refrigeration='required',shelfStableShare=.2,waterMl=400,noCook=False,onePot=False))
(ROOT/'data/quality-batch-chuchitisch-v6.json').write_text(json.dumps([r],ensure_ascii=False,indent=2)+'\n')
print(r['nutrition'])
