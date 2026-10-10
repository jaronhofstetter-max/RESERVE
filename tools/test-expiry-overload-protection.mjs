import fs from'node:fs';import vm from'node:vm';
const vision=fs.readFileSync('expiry-vision-v1.js','utf8'),camera=fs.readFileSync('expiry-camera-v1.js','utf8');new vm.Script(vision);new vm.Script(camera);
for(const contract of ['4500','15*60*1000','COOLDOWN_KEY','available','clearCooldown','retryAfterMs'])if(!vision.includes(contract))throw Error('Vision overload protection missing: '+contract);
for(const contract of ["credibleSuggestion(best)","available?.()!==false",'local-first-overload-v1'])if(!camera.includes(contract))throw Error('Camera local-first contract missing: '+contract);
if(camera.indexOf('else if(credibleSuggestion(best))')>camera.indexOf("visionApi?.analyze?.(file,{signal:run.controller.signal})"))throw Error('Credible local suggestion must bypass cloud reserve');
console.log('Expiry overload protection: timeout + cooldown + local-first bypass OK');
