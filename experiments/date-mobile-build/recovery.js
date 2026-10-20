/* Full-frame retry policy. Original decisions are immutable; retries need review. */
export function mergeRecovery(original,retries){
 if(original.candidates?.length)return original;
 const candidates=retries.flatMap(p=>p.candidates||[]).filter(c=>c.precision==='day'),eligible=candidates.filter(c=>!['manufactured','packed','sell_by','batch'].includes(c.role)),positive=eligible.filter(c=>['expiry','best_before','use_by'].includes(c.role)),pool=positive.length?positive:eligible,dates=new Map();
 for(const c of pool){const old=dates.get(c.date);dates.set(c.date,old&&old.role!==c.role?{...old,role:'unknown'}:old||c);}
 const choices=[...dates.values()],single=choices.length===1?choices[0]:null;
 // A retry containing competing values must never be overridden by another pass.
 const supported=single&&retries.some(p=>p.suggestion?.date===single.date&&p.suggestion?.precision==='day');
 return{...original,candidates,suggestion:supported?{...single,requires_confirmation:true}:null,strict_expiry:null,alternatives:choices.length>=2&&choices.length<=4?choices.map(c=>({date:c.date,precision:c.precision,role:c.role})):[],recovery:true,requires_confirmation:true};
}
