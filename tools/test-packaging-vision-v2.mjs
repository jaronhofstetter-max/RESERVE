import fs from'node:fs';import vm from'node:vm';
const source=fs.readFileSync('packaging-vision-v2.js','utf8');new vm.Script(source);
for(const contract of ["reservePackagingVisionExamplesV2","examples.filter","near.length<3","confidence>=.78","manuelle Korrektur","slice(-120)"])if(!source.includes(contract))throw Error('Packaging vision contract missing: '+contract);
const match=source.match(/TYPES=\[([^\]]+)\]/);if(!match||match[1].split(',').length!==11)throw Error('Expected 11 packaging types');
const localStorage={getItem:()=>null,setItem:()=>{}},document={readyState:'loading',getElementById:()=>null,addEventListener:()=>{}},window={};vm.runInNewContext(source,{window,document,localStorage,console,setTimeout:()=>0,clearTimeout:()=>{}});const api=window.RESERVE_PACKAGING_VISION;
if(api.classifyVector([0,0],[]))throw Error('Classifier must wait for examples');
const examples=[{type:'Flasche',vector:[.1,.1]},{type:'Flasche',vector:[.11,.1]},{type:'Flasche',vector:[.09,.12]},{type:'Beutel',vector:[.9,.9]}],hit=api.classifyVector([.1,.11],examples);if(hit?.type!=='Flasche'||hit.confidence<.7)throw Error('Nearest confirmed packaging was not recognized');
console.log('Packaging vision v2: local features + confidence gate + correction learning OK');
