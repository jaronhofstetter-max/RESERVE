// Static, version-pinned PDF.js runtime. No document bytes leave the device.
import fs from 'node:fs/promises';import {execFileSync}from'node:child_process';import crypto from'node:crypto';
const version='6.4.299',integrity='AVl138zALtfaAPvADulE0PZThbYzCBS79nL4pOSL/6Sm/4AH5A21BD9VHt97OlCuzJuCpmeZtAtkinisF4Vb1g==';
const response=await fetch(`https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-${version}.tgz`);if(!response.ok)throw Error('PDF runtime download failed');
const bytes=Buffer.from(await response.arrayBuffer());if(crypto.createHash('sha512').update(bytes).digest('base64')!==integrity)throw Error('PDF runtime hash mismatch');
const dir='build/personal-recipe-pdf',out='assets/recipe-pdf';await fs.mkdir(dir,{recursive:true});await fs.writeFile(dir+'/runtime.tgz',bytes);execFileSync('tar',['-xzf',dir+'/runtime.tgz','-C',dir]);await fs.mkdir(out,{recursive:true});
for(const name of ['pdf.mjs','pdf.worker.mjs'])await fs.copyFile(dir+'/package/legacy/build/'+name,out+'/'+name);
for(const name of ['cmaps','standard_fonts','wasm'])await fs.cp(dir+'/package/'+name,out+'/'+name,{recursive:true});
await fs.copyFile(dir+'/package/LICENSE',out+'/LICENSE');console.log('Pinned PDF.js '+version+' static runtime ready');
