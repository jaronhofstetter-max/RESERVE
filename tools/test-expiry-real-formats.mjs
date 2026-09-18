/* RESERVE expiry date parser regression tests — real-world package formats supplied during pantry testing. */
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('expiry-camera-v1.js','utf8');
const sandbox={
  window:{},
  document:{
    getElementById:()=>null,
    addEventListener:()=>{},
    readyState:'complete'
  },
  setTimeout:()=>0,
  console
};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const api=sandbox.RESERVE_EXPIRY_CAMERA;
if(!api?.parseDate)throw Error('RESERVE_EXPIRY_CAMERA parser fehlt');

const cases=[
  ['Mindestens haltbar bis Ende 04.2026','2026-04-30'],
  ['MHD 27/01/26','2026-01-27'],
  ['Best before 08/06/93','1993-06-08'],
  ['30/04/2027 4A700C 00:29:36','2027-04-30'],
  ['Prod. 23 09 2024 B.B. 23 09 2027','2027-09-23'],
  ['Mindestens haltbar bis 10/08/2027 M0332 08:54','2027-08-10'],
  ['28.04.2026 15:07 L2022714673','2026-04-28'],
  ['22.02.2027','2027-02-22'],
  ['H1E 12-11-2027','2027-11-12'],
  ['31.12.2026 11:14 L2026835425','2026-12-31'],
  ['L27U02 02.2029','2029-02-28'],
  ['02.02.2027 05:18 L2026545717','2027-02-02'],
  ['Best before 03:29 19 03 2029 Prod. 19 03 2026','2029-03-19'],
  ['12.2027 L1965 10 48','2027-12-31'],
  ['MHD 21-07-2028 PO 160382','2028-07-21'],
  ['PRO: 15.01.2026 EXP: 15.01.2028','2028-01-15'],
  ['Mindestens haltbar bis Ende 12.2024 DH PA2','2024-12-31'],
  ['Mindestens haltbar bis Ende 10.2024 DE3','2024-10-31'],
  ['Prod. 10 05 2024 B.B. 10 05 2027 L144131 11 07:28','2027-05-10'],
  ['Prod. 16 01 2025 B.B. 16 01 2028 L145016 101 21:21','2028-01-16'],
  ['06.05.2025 L07Nov/A07:43','2025-05-06'],
  ['06.2026 L5008','2026-06-30'],
  ['06.2034 L6222','2034-06-30'],
  ['Mindestens haltbar bis Ende 02.2027 CF 1909 1','2027-02-28'],
  ['BBE: 02.2027','2027-02-28']
];
for(const [text,want] of cases){
  const got=api.parseDate(text);
  if(got!==want)throw Error(`MHD parser: "${text}" => ${got}, erwartet ${want}`);
}
// A badly misread far-future month must not be auto-applied.
if(api.parseDate('04.2057 L1965 10 48')!=='')throw Error('Unplausibles OCR-MHD 04.2057 wurde automatisch akzeptiert');
// A production date must lose against a nearby explicitly marked best-before date.
const mixed=api.candidates('Prod. 19 03 2026. Mindestens haltbar bis 19 03 2029');
if(mixed[0]?.date!=='2029-03-19')throw Error('Produktionsdatum wurde fälschlich als MHD priorisiert: '+JSON.stringify(mixed));
console.log('Expiry parser real-package regression tests: OK');
