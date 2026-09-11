import fs from 'node:fs';

const path='PILOT-5.md';
const text=fs.readFileSync(path,'utf8');

const required=[
  'Pilot mit 5 Testpersonen',
  'Onboarding',
  'Einen ersten Vorrat anlegen',
  'Einen Artikel auf die Einkaufsliste setzen',
  'Ein Rezept finden',
  'Nur Tester-Nummern verwenden',
  'Keine Namen, E-Mail-Adressen oder anderen personenbezogenen Daten'
];

for(const item of required){
  if(!text.includes(item)) throw new Error(`Pilot sheet missing required content: ${item}`);
}

for(let tester=1;tester<=5;tester++){
  const row=new RegExp(`\\|\\s*${tester}\\s*\\|`);
  if(!row.test(text)) throw new Error(`Pilot sheet missing tester row ${tester}`);
}

const testerRows=(text.match(/^\|\s*[1-5]\s*\|/gm)||[]).length;
if(testerRows!==5) throw new Error(`Expected exactly 5 tester rows, found ${testerRows}`);

console.log('Pilot-5 structure check passed');
