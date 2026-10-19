"""Reproduce reviewed Chuchitisch 575 adaptation and nutrition from USDA SR Legacy."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/recipe-candidates/import-2026-10-19'
values = json.loads((DOC / 'nutrition-values.json').read_text())
# Original four-person quantities; grams in final column are nutrition weights.
rows = [
    ('Rote Linsen, trocken',200,'g','172420',200),
    ('Passierte Tomaten (Passata)',700,'g','170460',700),
    ('Zwiebel',100,'g','170000',100),
    ('Knoblauch',6,'g','169230',6),
    ('Peperoncino',15,'g','170106',15),
    ('Currypulver',4,'g','170924',4),
    ('Kurkuma, gemahlen',3,'g','172231',3),
    ('Wasser',500,'ml',None,500),
    ('Salz',2,'g',None,2),
    ('Pfeffer',.5,'g','170931',.5),
    ('Rapsöl',30,'ml','172336',27.3),
    ('Griechischer Naturjoghurt',150,'g','171304',150),
    ('Petersilie, glatt',5,'g','170416',5),
]
notes = [
    'Original für 4 Personen; alle Zutaten und geschätzten Nährwerte auf eine Person umgerechnet.',
    'Richtgewichte für den Originalansatz, keine exakten Originalgewichte: 1 Zwiebel = 100 g, 2 Knoblauchzehen = 6 g, 1 entkernte Peperoncino = 15 g, 2 TL Curry = 4 g, 1 TL Kurkuma = 3 g, ¼ Bund Petersilie = 5 g. Schärfe nach Geschmack anpassen.',
    '2 EL Pflanzenöl als 30 ml Rapsöl konkretisiert; für Nährwerte Dichte 0.91 g/ml. 1½ dl griechischer Joghurt mit 150 g angenähert (Dichte 1 g/ml); Vollmilchvariante für die Berechnung. Salz 2 g und Pfeffer 0.5 g als ergänzte Richtmengen nach Geschmack, keine Originalmengen.',
    'Tomatenpüree bezeichnet auf der Originalseite ausdrücklich Passata, nicht konzentriertes Tomatenmark. USDA-Tomatenpüree dient als Nährwertnäherung; trockene rote Linsen werden mit generischen trockenen Linsen angenähert. Marken und Sorten können abweichen.',
    'Foto der Originalquelle; Serviervorschlag. Sichtbare Joghurt- und Petersiliengarnitur ist in dieser Rezeptfassung enthalten. Die abgebildete Schüsselgrösse ist keine Portionsvorgabe.',
    'Currypulver kann Senf oder Sellerie enthalten: Produktetikett prüfen. Sicher enthaltenes Hauptallergen: Milch.',
]
totals = dict.fromkeys(['kcal','protein','carbs','fat','fiber'],0.)
for name,amount,unit,key,grams in rows:
    if key:
        per = values[key]['per100g']
        for nutrient in totals:
            value = max(0,per['carbs']-per['fiber']) if nutrient == 'carbs' else per[nutrient]
            totals[nutrient] += value * grams / 100 / 4
recipe = dict(
    id='chuchitisch-linsen-tomatensuppe',name='Orientalische Linsen-Tomatensuppe nach Chuchitisch',
    type='Hauptmahlzeit',diet='Vegetarisch',dish='🥣',cuisine='Orientalisch inspiriert',
    mealTimes=['Mittagessen','Abendessen'],prepMinutes=10,cookMinutes=20,difficulty='Einfach',
    allergens=['Milch'],tags=['Chuchitisch','Linsen','Suppe','Originalfoto'],
    ingredients=[dict(name=n,amount=round(q/4,4),unit=u) for n,q,u,k,g in rows],
    steps=[
        'Linsen in einem Sieb abspülen. Zwiebel und Knoblauch schälen und fein hacken. Peperoncino waschen, entkernen und fein schneiden; danach Hände waschen.',
        'Rapsöl in einem Topf erhitzen. Zwiebel, Knoblauch und Peperoncino bei mittlerer Hitze einige Minuten anschwitzen, ohne sie dunkel werden zu lassen.',
        'Linsen, Currypulver und Kurkuma zugeben und kurz unter Rühren mitdünsten, bis die Gewürze duften.',
        'Passata und Wasser einrühren, aufkochen und bei reduzierter Hitze ungefähr 15 Minuten köcheln lassen. Gelegentlich umrühren; bei Bedarf etwas Wasser ergänzen. Linsen vollständig weich garen.',
        'Mit Salz und Pfeffer nach Geschmack abschmecken. Petersilie waschen, fein hacken und mit dem griechischen Joghurt verrühren.',
        'Suppe auf Schüsseln verteilen und den Petersilienjoghurt dazu servieren.',
    ],
    nutrition={k:round(v,2) for k,v in totals.items()},
    nutritionEstimate=dict(method='Zutatenberechnung mit USDA SR Legacy; Schätzung, keine Messung des fertigen Gerichts.',basis='Pro Person; verfügbare Kohlenhydrate = Gesamtkohlenhydrate minus Ballaststoffe. '+' '.join(notes),sources='docs/recipe-candidates/import-2026-10-19/nutrition-values.json',ingredients=[dict(name=n,grams=round(g/4,4),foodKey=k,excluded=k is None) for n,q,u,k,g in rows]),
    status='approved',description='Tomaten-Linsensuppe mit Curry, Kurkuma und Petersilienjoghurt nach Chuchitisch. Mengen und geschätzte Nährwerte pro Person; Originalfoto als Serviervorschlag.',
    equipment=['Kochtopf','Küchenmesser','Schneidebrett','Sieb','kleine Schüssel'],prepNotes=notes,
    doneness='Die roten Linsen sind vollständig weich, ohne harten Kern; die Suppe ist sämig. Bei Bedarf länger köcheln und etwas Wasser nachgiessen.',
    substitutions=['Für eine vegane Variante pflanzlichen Joghurt verwenden; Allergene und Nährwerte dafür neu prüfen. Die berechnete Originalfassung enthält Milch.'],
    leftovers='Joghurt möglichst separat halten. Reste rasch abkühlen, abgedeckt gekühlt lagern und zeitnah verbrauchen; Suppe vor dem Essen vollständig durcherhitzen.',
    safety='Beim Schneiden der Peperoncino nicht in die Augen fassen und danach Hände reinigen. Heisse Suppe vorsichtig umrühren; trockene Linsen vollständig durchgaren.',
    recipeCredit=dict(author='Hannes und Martina',provider='Chuchitisch',source='https://chuchitisch.ch/recipes/575',license='CC BY-SA 3.0',licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',originalServings=4,adaptation='Auf eine Person umgerechnet; Schritte gegliedert und Garmerkmale ergänzt. '+' '.join(notes)),
    resilience=dict(power='normal',refrigeration='required',shelfStableShare=.6,waterMl=125,noCook=False,onePot=True),
)
(ROOT/'data/quality-batch-chuchitisch-v5.json').write_text(json.dumps([recipe],ensure_ascii=False,indent=2)+'\n')
print(recipe['nutrition'])
