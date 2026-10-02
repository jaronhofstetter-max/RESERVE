import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('product-capture-assist-v1.js','utf8'),context);
const api=context.window.RESERVE_PRODUCT_CAPTURE_ASSIST;
const equal=(actual,expected,label)=>{if(actual!==expected)throw new Error(`${label}: ${actual} !== ${expected}`)};
equal(api.version,'1.4','wrinkle-tolerant capture version');

equal(api.quantityFromText('NETTO 500 g'),'500 g','single weight');
equal(api.quantityFromText('2 x 250 g'),'2 × 250 g','multipack');
equal(api.quantityFromText('Contenu 75 cl'),'750 ml','volume');
equal(api.quantityFromText('12 Stück'),'12 Stück','pieces');
equal(api.packagingFromProduct({packaging_tags:['de:glass-jar']},'Honig').type,'Glas','glass metadata');
equal(api.packagingFromProduct({packaging:'plastic bottle'},'Saft').type,'Flasche','bottle metadata');
equal(api.packagingFromProduct({packaging:'pouch'},'Mandeln').type,'Beutel','bag metadata');
const width=80,height=60,pixels=new Uint8ClampedArray(width*height*4);for(let i=0;i<pixels.length;i+=4)pixels[i]=pixels[i+1]=pixels[i+2]=218,pixels[i+3]=255;for(let y=8;y<25;y++)for(let x=45;x<75;x++){const i=(y*width+x)*4,v=x%6<2?25:225;pixels[i]=pixels[i+1]=pixels[i+2]=v}const wrinkledPrint=api.qualityFromPixels(pixels,width,height);if(!wrinkledPrint.acceptable||!wrinkledPrint.printDetail)throw new Error('Sharp print on uneven paper was rejected: '+JSON.stringify(wrinkledPrint));
console.log('Product quantity and packaging assist: OK');
