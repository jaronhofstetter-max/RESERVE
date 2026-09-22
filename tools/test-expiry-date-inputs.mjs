import {pathToFileURL} from 'node:url';
import path from 'node:path';

globalThis.window={};
await import(pathToFileURL(path.resolve('expiry-learning-v1.js')));
const {normalizeConfirmedDate}=window.RESERVE_EXPIRY_LEARNING;
const cases=[
  ['26.10.26','day','2026-10-26'],
  ['26.10.2026','day','2026-10-26'],
  ['2026-10-26','day','2026-10-26'],
  ['26/10/26','day','2026-10-26'],
  ['10.26','month','2026-10'],
  ['10.2026','month','2026-10'],
  ['2026-10','month','2026-10'],
  ['26','year','2026'],
  ['2026','year','2026'],
  ['31.02.26','day',''],
  ['13.26','month','']
];
for(const [input,precision,expected] of cases){const actual=normalizeConfirmedDate(input,precision);if(actual!==expected)throw Error(`${input} (${precision}): expected ${expected}, got ${actual}`)}
console.log('Expiry date input normalization: OK');
