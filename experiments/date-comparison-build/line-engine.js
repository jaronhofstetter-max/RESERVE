import '../date-mobile-build/engine.js';
import {Recognition} from '../date-mobile-build/node_modules/@gutenye/ocr-common/build/models/Recognition.js';
import {ImageRaw} from '../date-mobile-build/node_modules/@gutenye/ocr-common/build/backend/index.js';
globalThis.RESERVE_DATE_BROWSER_OCR.createLineReader=async options=>{
 const rec=await Recognition.create(options);
 return async image=>rec.run([{image:new ImageRaw(image),box:[[0,0],[image.width,0],[image.width,image.height],[0,image.height]]}]);
};
