/* Numeric four-digit dates only. Use nearby, high-confidence, unambiguous
 * printed dates with the SAME separator, never device locale or reference labels.
 * This resolves order, not which date is an expiry. Roles remain separate.
 */
const TOKEN=/^(\d{1,2})\s*([./-])\s*(\d{1,2})\s*\2\s*((?:19|20)\d{2})$/;
function token(c,line){
 if(!['dmy','mdy'].includes(c.kind)||c.precision!=='day')return null;
 const m=TOKEN.exec(c.printed);if(!m)return null;
 if(c.start>0&&/[A-Za-z0-9./-]/.test(line.text[c.start-1]))return null;
 if(/^[A-Za-z0-9]|^[./-]\d/.test(line.text.slice(c.end)))return null;
 return{a:+m[1],b:+m[3],separator:m[2]};
}
function box(c,line){const[x,y,xx,yy]=line.bbox,w=xx-x,h=yy-y,n=Math.max(1,line.text.length);return w>=h?[x+w*c.start/n,y,x+w*c.end/n,yy]:[x,y+h*c.start/n,xx,y+h*c.end/n];}
function local(a,b){
 const[x,y,xx,yy]=a,[ox,oy,oxx,oyy]=b,h=Math.max(4,yy-y,oyy-oy),dx=Math.max(x-oxx,ox-xx,0),dy=Math.max(y-oyy,oy-yy,0);
 const overlap=Math.max(0,Math.min(xx,oxx)-Math.max(x,ox))/Math.max(1,Math.min(xx-x,oxx-ox));
 return(dy===0&&dx<=4*h)||(overlap>=.5&&dy<=4*h);
}
export function resolveDateOrders(raw){
 const sources=[];
 raw.lines.forEach((line,index)=>{
  if(!Number.isFinite(line.confidence)||line.confidence<.9||/\b(?:lot|batch|charge|chargen(?:nummer|-?nr)?)\b/i.test(line.text))return;
  for(const c of line.parsed_dates||[]){
   const t=token(c,line);if(!t||c.ambiguous)continue;
   const order=t.a>12&&t.b<=12?'dmy':t.b>12&&t.a<=12?'mdy':null;
   if(order&&order===c.kind)sources.push({order,separator:t.separator,bbox:box(c,line),line_index:index});
  }
 });
 let resolved=0,unresolved=0;
 const lines=raw.lines.map(line=>{
  const groups=new Map();for(const c of line.parsed_dates||[]){if(c.ambiguous&&token(c,line)){const key=c.start+':'+c.end;groups.set(key,[...(groups.get(key)||[]),c]);}}
  const choices=new Map();
  for(const[key,group]of groups){
   const c=group[0],t=token(c,line);
   if(!Number.isFinite(line.confidence)||line.confidence<.9||!group.some(c=>c.kind==='dmy')||!group.some(c=>c.kind==='mdy')){unresolved++;continue;}
   const evidence=sources.filter(s=>s.separator===t.separator&&local(box(c,line),s.bbox)),orders=new Set(evidence.map(s=>s.order));
   if(orders.size!==1){unresolved++;continue;}
   const order=[...orders][0];choices.set(key,{order,evidence:evidence.map(s=>({line_index:s.line_index,order:s.order}))});resolved++;
  }
  return{...line,parsed_dates:(line.parsed_dates||[]).flatMap(c=>{
   const choice=choices.get(c.start+':'+c.end);if(!choice||!c.ambiguous)return[c];
   return c.kind===choice.order?[{...c,ambiguous:false,order_evidence:choice.evidence}]:[];
  })};
 });
 return{raw:{...raw,lines},resolved,unresolved};
}
