// Reuse the production build commands so browser checks see the deployed module order.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('.github/workflows/pages.yml','utf8').split('\n');
const names=new Set(['Build validated live recipe library','Enable fast startup and compact recipe delivery','Enable RESERVE feature modules','Activate product-linked partial expiry training build','Enable approved retailer data when available','Smoke test production build']);
let count=0;
for(let i=0;i<source.length;i++){
 const name=source[i].match(/^      - name: (.+)$/)?.[1];
 if(!names.has(name))continue;
 let j=i+1;while(j<source.length&&!/^      - /.test(source[j]))j++;
 const block=source.slice(i+1,j),run=block.findIndex(line=>/^        run: /.test(line));
 if(run<0)throw Error('Missing production command: '+name);
 const literal=block[run].slice('        run: '.length);
 const command=literal==='|'?block.slice(run+1).filter(line=>line.startsWith('          ')).map(line=>line.slice(10)).join('\n'):literal;
 console.log('Production preparation: '+name);
 execFileSync('bash',['-e','-c',command],{stdio:'inherit'});count++;
}
if(count!==names.size)throw Error('Production preparation steps changed; review test builder.');
