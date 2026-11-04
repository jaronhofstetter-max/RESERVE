// Only public configuration; official pinned dependency is installed from the lockfile.
import fs from 'node:fs';
import crypto from 'node:crypto';
const config=fs.readFileSync('reserve-account-config-v1.js','utf8');
if(!/(?:enabled|testEnabled)\s*:\s*true/.test(config)){console.log('Account backend disabled: no SDK published and no remote request needed.');process.exit(0);}
const source='experiments/account-storage/node_modules/@supabase/supabase-js/dist/umd/supabase.js';
const expected='ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3';
const bytes=fs.readFileSync(source);if(crypto.createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Pinned Supabase SDK hash changed.');
const target='assets/account-sdk';fs.mkdirSync(target,{recursive:true});fs.writeFileSync(target+'/supabase-2.118.0.js',bytes);
fs.copyFileSync('experiments/account-storage/node_modules/@supabase/supabase-js/LICENSE',target+'/LICENSE');
console.log('Pinned Supabase auth SDK prepared; no project contacted.');
