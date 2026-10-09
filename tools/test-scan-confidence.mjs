import fs from'node:fs';import vm from'node:vm';
const source=fs.readFileSync('scan-confidence-v1.js','utf8');new vm.Script(source);
for(const contract of ['Scan-Ergebnis prüfen','Noch nicht sicher erkannt','Bitte auswählen','RESERVE_SCAN_CONFIDENCE'])if(!source.includes(contract))throw Error('Scan confidence contract missing: '+contract);
console.log('Scan confidence summary: honest open/check/confirmed states OK');
