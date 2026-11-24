import fs from'node:fs';import vm from'node:vm';
const vision=fs.readFileSync('expiry-vision-v1.js','utf8'),camera=fs.readFileSync('expiry-camera-v1.js','utf8');new vm.Script(vision);new vm.Script(camera);
for(const contract of ['4500','15*60*1000','COOLDOWN_KEY','available','clearCooldown','retryAfterMs'])if(!vision.includes(contract))throw Error('Vision overload protection missing: '+contract);
const ctx={document:{getElementById:()=>null},setTimeout:()=>0};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(camera,ctx);
if(ctx.RESERVE_EXPIRY_CAMERA.recognitionTimeoutMs!==4500)throw Error('Public reader deadline must be 4.5 seconds');
console.log('Vision timeout/cooldown retained; bounded public reader deadline: OK');
