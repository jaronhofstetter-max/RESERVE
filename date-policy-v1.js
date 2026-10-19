/* A printed date and its meaning are independent. Missing legacy metadata stays unknown. */
(function(){'use strict';
 const labels={unknown:'Datum',best_before:'Mindestens haltbar bis',use_by:'Zu verbrauchen bis',manufactured:'Hergestellt am',packed:'Verpackt am',sell_by:'Verkaufen bis'};
 const kind=row=>Object.hasOwn(labels,row?.dateType)?row.dateType:'unknown';
 const informational=row=>['manufactured','packed','sell_by'].includes(kind(row));
 function note(row,days){
  const type=kind(row);if(days==null)return'Kein Datum';
  if(informational(row))return labels[type];
  if(days<0)return type==='best_before'?'MHD überschritten':type==='use_by'?'Verbrauchsdatum überschritten':'Datum überschritten – Bedeutung auf der Packung prüfen';
  if(days===0)return type==='best_before'?'MHD heute':type==='use_by'?'Zu verbrauchen bis heute':'Datum heute – Bedeutung auf der Packung prüfen';
  return type==='unknown'?`Datum in ${days} Tagen`:`${type==='best_before'?'MHD':'Verbrauchsdatum'} in ${days} Tagen`;
 }
 function options(value='unknown'){return Object.entries(labels).map(([key,label])=>`<option value="${key}"${key===value?' selected':''}>${key==='unknown'?'Unbekannt / nur Datum':label}</option>`).join('');}
 function inputHTML(id,value='unknown'){return `<label>Datumsart<select id="${id}">${options(value)}</select></label>`;}
 function reset(fieldId='scanExpiry',selectId='scanDateType'){
  const f=document.getElementById(fieldId),s=document.getElementById(selectId);if(s)s.value='unknown';if(f){delete f.dataset.dateType;delete f.dataset.dateTypeSource;}
 }
 function apply(type='unknown'){
  const f=document.getElementById('scanExpiry'),s=document.getElementById('scanDateType');type=kind({dateType:type});
  if(f){f.dataset.dateType=type;f.dataset.dateTypeSource='ocr';}if(s)s.value=type;
 }
 function fromInput(fieldId='scanExpiry',selectId='scanDateType'){
  const f=document.getElementById(fieldId),s=document.getElementById(selectId);
  return {dateType:f?.value?kind({dateType:s?.value||f?.dataset.dateType}):'unknown',datePrecision:f?.dataset.datePrecision||(f?.type==='month'?'month':'day')};
 }
 // Use only the selected date's immediately preceding cue. Never infer MHD from absence.
 // Other dates between a cue and this date invalidate the association.
 function infer(text,start,length){
  const before=String(text||'').slice(Math.max(0,start-65),start);
  const patterns=[['best_before',/mindestens\s*haltbar(?:\s*bis)?|haltbar\s*bis|\bmhd\b|best\s*before|best\s*(?:if\s*)?used\s*by|best\s*by|\bbbe\b|\bbbd\b|consommer\s*de\s*pr[ée]f[ée]rence\s*avant/gi],['use_by',/zu\s*verbrauchen\s*bis|use\s*by|consommer\s*jusqu['’]?\s*au/gi],['manufactured',/hergestellt(?:\s*am)?|\bmf[gd]\b|\bprod(?:uction)?(?:\s*date)?\b|\bpro(?=\s*:)/gi],['packed',/pack(?:ed|ing)?\s*(?:on|date)|verpackt\s*am/gi],['sell_by',/sell\s*by|verkaufen\s*bis/gi]];
  const matches=patterns.flatMap(([type,re])=>[...before.matchAll(re)].map(m=>({type,end:m.index+m[0].length,start:m.index})));
  matches.sort((a,b)=>b.end-a.end||a.start-b.start);const cue=matches[0];
  if(!cue||/[0-9]/.test(before.slice(cue.end)))return'unknown';
  return cue.type;
 }
 window.RESERVE_DATE_POLICY={version:'1.0',kind,informational,label:row=>labels[kind(row)],note,options,inputHTML,reset,apply,fromInput,infer};
})();
