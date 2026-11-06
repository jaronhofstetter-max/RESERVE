// Keep date type separate from date value; every offer still needs review.
import {agree, confirmChoice, collectOffers} from './fields.js';
const rules = [
 ['best_before', /\bmhd\b|\bbbe\b|mindestens\s+haltbar|best\s+before|\bb\.\s*b\.(?=\s|$)|(?:à|a)\s+consommer\s+de\s+pr[ée]f[ée]rence|da\s+consumarsi\s+preferibilmente/iu],
 ['use_by', /(?:zu\s+)?verbrauchen\s+bis|use\s+by|(?:à|a)\s+consommer\s+jusqu|da\s+consumarsi\s+entro/iu],
 ['production', /herstell|hergestellt|produktionsdatum|\bprod\.?(?=\s|:|$)|\bmfg\b|manufactur|produced/iu],
 ['packed', /packed|abgepackt|verpackungsdatum/iu],
 ['sell_by', /\bsel{1,2}\s+by\b|verkaufen\s+bis/iu],
];
export function dateKind(text) {
 const normalized=String(text??'').normalize('NFKC');
 const hits=rules.filter(([,re])=>re.test(normalized)).map(([kind])=>kind);
 if(hits.length>1)return 'ambiguous';
 if(hits.length)return hits[0];
 if(/^\s*(?:LOT\b|CHARGE\b|BATCH\b|L\s*[:：]?\s*\d)/iu.test(normalized))return 'batch';
 return 'unknown'; // EXP alone, unlabeled dates and unknown languages need review.
}
export function typedOffer(a,b,role) {
 const original=agree(a,b,role),kinds=[dateKind(a.text),dateKind(b.text)];
 // Only the nearest spatial evidence already associated with this candidate.
 // Never classify all text on a package as if it described one date.
 const evidence=(role.evidence||[]).filter(e=>Number.isFinite(e.distance));
 const nearest=Math.min(...evidence.map(e=>e.distance));
 for(const e of evidence)if(e.distance<=nearest+.25)kinds.push(dateKind(e.text));
 const definite=[...new Set(kinds.filter(k=>k!=='unknown'))];
 let kind=definite.length===1?definite[0]:definite.length?'ambiguous':'unknown';
 const blocked=['production','packed','sell_by','batch','ambiguous'].includes(kind);
 return {...original,dateKind:kind,needsDateKindConfirmation:true,
  ...(blocked?{status:'date_kind_unresolved',choices:[]}:{}),
  requiresReview:true,automaticExpiryAllowed:false};
}
export function collectTypedOffers(candidates) {
 const active=candidates.filter(c=>c.decision.choices.length);
 // Equal date values with different explicit meanings must not be collapsed.
 const key=o=>JSON.stringify(o.choices);
 const conflicts=new Set();
 for(const c of active){const kinds=new Set(active.filter(x=>key(x.decision)===key(c.decision)).map(x=>x.decision.dateKind).filter(k=>k!=='unknown'));if(kinds.size>1)conflicts.add(key(c.decision));}
 const safe=active.filter(c=>!conflicts.has(key(c.decision)));
 // If one candidate lacks a type, preserve that need for explicit review.
 const normalized=safe.map(c=>({...c,decision:{...c.decision,dateKind:safe.some(x=>key(x.decision)===key(c.decision)&&x.decision.dateKind==='unknown')?'unknown':c.decision.dateKind}}));
 return collectOffers(normalized);
}
export function confirmTypedChoice(offer,index,options={}) {
 const {dateKind:chosen}=options;
 if(!['best_before','use_by'].includes(chosen))throw Error('Bitte MHD oder Verbrauchsdatum getrennt auswählen.');
 if(!['unknown','best_before','use_by'].includes(offer.dateKind))throw Error('Datumszweck ist nicht eindeutig.');
 if(offer.dateKind!=='unknown'&&chosen!==offer.dateKind)throw Error('Die Auswahl widerspricht der gelesenen Beschriftung.');
 return {...confirmChoice(offer,index,options),dateKind:chosen};
}
