/* RESERVE expiry/consumption intelligence v1.1 */
(function(){
  const DAY=86400000,KEY='reserveConsumptionHistoryV1';
  const parseDate=s=>{if(!s)return null;const d=new Date(s+'T12:00:00');return Number.isFinite(d.getTime())?d:null};
  const rows=()=>{try{return stock}catch{return[]}};
  function expiryState(row,now=new Date()){const d=parseDate(row?.e);if(!d)return{state:'unknown',days:null,label:'Kein Ablaufdatum'};const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12),days=Math.ceil((d-today)/DAY);if(days<0)return{state:'expired',days,label:'Abgelaufen'};if(days===0)return{state:'today',days,label:'Läuft heute ab'};if(days<=3)return{state:'urgent',days,label:`Noch ${days} Tag${days===1?'':'e'}`};if(days<=7)return{state:'soon',days,label:`Noch ${days} Tage`};return{state:'ok',days,label:`Noch ${days} Tage`}}
  function priority(row,now=new Date()){const s=expiryState(row,now);return({expired:-100,today:0,urgent:1,soon:2,ok:3,unknown:4})[s.state]??4}
  function sorted(list=rows(),now=new Date()){return list.map((row,index)=>({row,index,expiry:expiryState(row,now)})).sort((a,b)=>priority(a.row,now)-priority(b.row,now)||(a.expiry.days??99999)-(b.expiry.days??99999))}
  function history(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function record(row,amount,unit,reason='manual'){const event={name:row?.n||'',amount:Number(amount)||0,unit:unit||'',barcode:row?.barcode||'',reason,at:new Date().toISOString()};const h=history();h.push(event);localStorage.setItem(KEY,JSON.stringify(h.slice(-1000)));return event}
  function consume(index,amount,reason='manual'){const list=rows(),row=list[index],have=row&&window.parseAmount?.(row.q);amount=Number(amount);if(!row||!have||!Number.isFinite(amount)||amount<=0||amount>have.v)return{ok:false};const remaining=Math.max(0,have.v-amount);record(row,amount,have.u,reason);if(remaining<=0)list.splice(index,1);else row.q=window.fmt(remaining,have.u);localStorage.setItem('reserveStock',JSON.stringify(list));window.refresh?.();return{ok:true,remaining,unit:have.u}}
  function expiringWithin(days=7,list=rows(),now=new Date()){return sorted(list,now).filter(x=>x.expiry.days!=null&&x.expiry.days>=0&&x.expiry.days<=days)}
  window.RESERVE_EXPIRY={version:'1.1',expiryState,sorted,expiringWithin,consume,history,record};
})();