import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const initial=[
  {n:'Thé alla Pesca',q:'3000 ml',containerType:'Packung'},
  {n:'Maiskolben',q:'190 g',containerType:'Packung'},
  {n:'Milch',q:'1 l',containerType:'Packung',containerTypeConfirmed:true},
  {n:'Penne Rigate',q:'500 g',containerType:'Packung'}
];
const storage=new Map([['reserveStock',JSON.stringify(initial)]]);
const document={readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}};
const context={window:{dispatchEvent(){},RESERVE_MULTIPACK:{parse(q){const m=String(q).match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/);return m?{v:Number(m[1]),u:m[2],multipack:false}:null}}},document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Event:class{},console,setTimeout(){}};
context.window.window=context.window;context.window.document=document;context.window.localStorage=context.localStorage;context.window.Event=context.Event;context.window.setTimeout=context.setTimeout;
vm.createContext(context);
vm.runInContext(fs.readFileSync('container-units-v1.js','utf8'),context);
assert.equal(context.window.RESERVE_CONTAINER_UNITS.migrateLegacy(),true);
const rows=JSON.parse(storage.get('reserveStock'));
assert.equal(rows[0].containerType,'Flasche');
assert.equal(rows[1].containerType,'Glas');
assert.equal(rows[2].containerType,'Packung','confirmed values must not be changed');
assert.equal(rows[3].containerType,'Packung');
console.log('Legacy container correction: OK');
