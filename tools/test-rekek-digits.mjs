import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx={};vm.runInNewContext(fs.readFileSync('rekek-digit-core-v1.js','utf8'),ctx);const core=ctx.RESERVE_DIGIT_CORE;
const bytes=fs.readFileSync('assets/rekek/digit-v4.bin'),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),params=core.weights(buffer);
const cases=JSON.parse(fs.readFileSync('tests/fixtures/rekek-digit-parity.json','utf8')).fixtures;
for(const c of cases){const r=core.infer(new Float32Array(c.input),params);assert.equal(r.digit,c.logits.indexOf(Math.max(...c.logits)));assert.ok(Math.max(...r.logits.map((v,i)=>Math.abs(v-c.logits[i])))<.001,'PyTorch numerical parity');}
assert.throws(()=>core.weights(new ArrayBuffer(4)));assert.throws(()=>core.readImage(new Uint8ClampedArray(0),400,1,params));
const blank=new Uint8ClampedArray(32*32*4).fill(255);const r=core.readImage(blank,32,32,params);assert.equal(r.autoConfirmed,false);assert.equal(r.status,'unreadable');
console.log('REKEK browser digit model: 5 real PyTorch parity fixtures and failure guards passed.');
