const fs=require('node:fs'),assert=require('node:assert/strict'),R=require('./date-roles.cjs');
(async()=>{const{dates,normalize}=await import('./date-parser.js');const cases=JSON.parse(fs.readFileSync(__dirname+'/role-cases.json'));
for(const t of cases){const raw=structuredClone(t.raw);for(const l of raw.lines){l.text=normalize(l.text);l.parsed_dates=dates(l.text);}const p=R.select(raw);assert.equal(p.strict_expiry?.date||null,t.expected_strict,t.raw.id);assert.equal(p.suggestion?.date||null,t.expected_suggestion,t.raw.id);assert.deepEqual(p.candidates.map(c=>c.role),t.expected_roles,t.raw.id);}
console.log(cases.length+' constructed role/parser cases pass; not accuracy evidence.');})();
