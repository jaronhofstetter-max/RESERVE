import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('product-capture-assist-v1.js','utf8'),context);
const api=context.window.RESERVE_PRODUCT_CAPTURE_ASSIST;
const equal=(actual,expected,label)=>{if(actual!==expected)throw new Error(`${label}: ${actual} !== ${expected}`)};

equal(api.quantityFromText('NETTO 500 g'),'500 g','single weight');
equal(api.quantityFromText('2 x 250 g'),'2 × 250 g','multipack');
equal(api.quantityFromText('Contenu 75 cl'),'750 ml','volume');
equal(api.quantityFromText('12 Stück'),'12 Stück','pieces');
equal(api.packagingFromProduct({packaging_tags:['de:glass-jar']},'Honig').type,'Glas','glass metadata');
equal(api.packagingFromProduct({packaging:'plastic bottle'},'Saft').type,'Flasche','bottle metadata');
equal(api.packagingFromProduct({packaging:'pouch'},'Mandeln').type,'Beutel','bag metadata');
console.log('Product quantity and packaging assist: OK');
