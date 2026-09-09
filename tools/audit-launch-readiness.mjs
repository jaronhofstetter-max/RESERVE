import fs from 'node:fs';

const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const index = read('index.html');
const manifest = read('manifest.webmanifest');
const failures = [];
const warnings = [];

if (/HOEFLIGHT/i.test(index)) failures.push('Legacy HOEFLIGHT branding remains in index.html.');
if (/const defaults=\[[^\]]+/s.test(index)) failures.push('Demo pantry defaults are still enabled for first-time users.');
if (!/RESERVE/i.test(manifest)) failures.push('PWA manifest is not branded RESERVE.');
if (!fs.existsSync('datenschutz.html')) warnings.push('Public privacy page datenschutz.html is missing.');
if (!fs.existsSync('impressum.html')) warnings.push('Public provider/contact page impressum.html is missing.');
if (!/Allergien \/ strikt vermeiden/.test(index)) warnings.push('Allergy/strict-avoidance input could not be confirmed.');
if (!/recipe-visual\{display:none!important\}/.test(read('hoe-flight-theme.css'))) warnings.push('Unverified recipe images may no longer be hidden.');

console.log('RESERVE launch-readiness audit');
for (const x of failures) console.error('FAIL:', x);
for (const x of warnings) console.warn('WARN:', x);
if (!failures.length) console.log('PASS: no launch blockers detected by automated checks.');
process.exitCode = failures.length ? 1 : 0;
