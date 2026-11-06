// Isolated proposal: does not alter the frozen v3.4 parser or OCR.
import {agree, confirmChoice} from './fields.js';
const rules = [
 ['best_before', /\bmhd\b|\bbbe\b|mindestens\s+haltbar|best\s+before|\bb\.\s*b\.(?=\s|$)|(?:à|a)\s+consommer\s+de\s+pr[ée]f[ée]rence|da\s+consumarsi\s+preferibilmente/iu],
 ['use_by', /(?:zu\s+)?verbrauchen\s+bis|use\s+by|(?:à|a)\s+consommer\s+jusqu|da\s+consumarsi\s+entro/iu],
 ['production', /herstell|hergestellt|produktionsdatum|\bprod\.?(?=\s|:|$)|\bmfg\b|manufactur|produced/iu],
 ['packed', /packed|abgepackt|verpackungsdatum/iu],
 ['sell_by', /sell\s+by|verkaufen\s+bis/iu],
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
 const definite=[...new Set(kinds.filter(k=>k!=='unknown'))];
 let kind=definite.length===1?definite[0]:definite.length?'ambiguous':'unknown';
 const blocked=['production','packed','sell_by','batch','ambiguous'].includes(kind);
 return {...original,dateKind:kind,needsDateKindConfirmation:true,
  ...(blocked?{status:'date_kind_unresolved',choices:[]}:{}),
  requiresReview:true,automaticExpiryAllowed:false};
}
export function confirmTypedChoice(offer,index,options={}) {
 const {dateKind:chosen}=options;
 if(!['best_before','use_by'].includes(chosen))throw Error('Bitte MHD oder Verbrauchsdatum getrennt auswählen.');
 if(!['unknown','best_before','use_by'].includes(offer.dateKind))throw Error('Datumszweck ist nicht eindeutig.');
 if(offer.dateKind!=='unknown'&&chosen!==offer.dateKind)throw Error('Die Auswahl widerspricht der gelesenen Beschriftung.');
 return {...confirmChoice(offer,index,options),dateKind:chosen};
}
