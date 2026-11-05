import Formats from '../../date-format-v1.js';
export function regionPixels(region,width,height){
 if(!region||![width,height].every(n=>Number.isInteger(n)&&n>0))return null;
 const {x,y,w,h}=region;if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>1+1e-9||y+h>1+1e-9)return null;
 const left=Math.round(x*width),top=Math.round(y*height),right=Math.min(width,Math.round((x+w)*width)),bottom=Math.min(height,Math.round((y+h)*height));
 const rw=right-left,rh=bottom-top;if(rw<48||rh<8||rw/rh<2||rw/rh>20)return null;
 return{x:left,y:top,w:rw,h:rh};
}
export function lineDates(value){
 if(typeof value!=='string'||/[\r\n]/.test(value))return[];
 const text=value.normalize('NFKC').trim();let m;
 const make=(y,m,d)=>{const date=Formats.iso(y,m,d);return date?{date,precision:'day'}:null;};
 const unique=values=>values.filter((v,i,a)=>v&&a.findIndex(x=>x?.date===v.date&&x?.precision===v.precision)===i);
 if((m=/^(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})$/.exec(text)))return unique([make(m[1],m[2],m[3])]);
 if((m=/^(\d{1,2})\s*([./-])\s*(\d{1,2})\s*\2\s*(\d{4})$/.exec(text)))return unique([make(m[4],m[3],m[1]),make(m[4],m[1],m[3])]);
 if((m=/^(\d{1,2})\s*[./-]\s*(\d{4})$/.exec(text))){const d=make(m[2],m[1],1);return d?[{date:d.date.slice(0,7),precision:'month'}]:[];}
 if((m=/^(\d{4})\s*-\s*(\d{1,2})$/.exec(text))){const d=make(m[1],m[2],1);return d?[{date:d.date.slice(0,7),precision:'month'}]:[];}
 return[];
}
export function lineAgreement(v4,v5){
 if(!v4||!v5||!Number.isFinite(v4.confidence)||!Number.isFinite(v5.confidence)||v4.confidence<.8||v5.confidence<.9)return{accepted:false,reason:'low_confidence',choices:[]};
 const a=lineDates(v4.text),b=lineDates(v5.text);if(!a.length||!b.length)return{accepted:false,reason:'not_date',choices:[]};
 if(JSON.stringify(a)!==JSON.stringify(b))return{accepted:false,reason:'disagreement',choices:[]};
 return{accepted:true,reason:'agreement',choices:a};
}
