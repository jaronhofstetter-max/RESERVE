import fs from 'node:fs';
const feedback=fs.readFileSync('feedback-v1.js','utf8');
const ci=fs.readFileSync('.github/workflows/pr-ci.yml','utf8');
for(const needle of ['reserve-feedback-button','Problem melden / Idee senden','issues/new'])if(!feedback.includes(needle))throw Error(`feedback-v1.js fehlt: ${needle}`);
for(const needle of ['node --check feedback-v1.js','feedback-v1.js','node tools/e2e-feedback.mjs'])if(!ci.includes(needle))throw Error(`PR-CI fehlt: ${needle}`);
console.log('✓ Feedback v1 ist in PR-CI integriert');
