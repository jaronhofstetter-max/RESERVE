import Tokens from '../../date-token-guard-v1.js';
/* Browser feasibility adapter: explicit four-digit years only. Review required.
 * This adapter is separately tested; it is not the frozen Python date parser.
 */
export function normalize(text){return text.replace(/\b(MHD|EXP|EXPIRY|BBE|BBD|MFG|MFD|PROD|SELL\s*BY|USE\s*BY|BEST\s*BEF[O0]RE)(?=\d)/gi,'$1 ');}
const monthGroups=['JAN JANUARY','FEB FEBRUARY','MAR MARCH','APR APRIL','MAY','JUN JUNE','JUL JULY','AUG AUGUST','SEP SEPT SEPTEMBER','OCT OCTOBER','NOV NOVEMBER','DEC DECEMBER'];
const months=Object.fromEntries(monthGroups.flatMap((s,i)=>s.split(' ').map(n=>[n,i+1]))),mr=Object.keys(months).sort((a,b)=>b.length-a.length).join('|');
function value(y,m,d){y=+y;m=+m;if(y<1990||y>2099||m<1||m>12)return null;const x=new Date(Date.UTC(y,m-1,d===undefined?1:+d));if(x.getUTCMonth()!==m-1||x.getUTCFullYear()!==y||d!==undefined&&x.getUTCDate()!==+d)return null;return `${y}-${String(m).padStart(2,'0')}`+(d===undefined?'':`-${String(+d).padStart(2,'0')}`);}
export function dates(original){
 const text=Tokens.view(original);
 const out=[];
 const put=(m,v,kind,ambiguous=false)=>{if(v)out.push({date:v,precision:v.length===7?'month':'day',start:m.index,end:m.index+m[0].length,printed:original.slice(m.index,m.index+m[0].length),kind,ambiguous});};
 const scan=(p,cb)=>{for(const m of text.matchAll(new RegExp(p,'gi')))cb(m)};
 const overlaps=m=>out.some(c=>c.start<m.index+m[0].length&&c.end>m.index);
 scan('(?<!\\d)((?:19|20)\\d{2})\\s*[-/.]\\s*(\\d{1,2})\\s*[-/.:]\\s*(\\d{1,2})(?!\\d)',m=>put(m,value(m[1],m[2],m[3]),'ymd'));
 scan('(?<!\\d)((?:19|20)\\d{2})\\s+(\\d{1,2})\\s+(\\d{1,2})(?!\\d)',m=>put(m,value(m[1],m[2],m[3]),'space_ymd'));
 scan('(?<!\\d)((?:19|20)\\d{2})\\s*[-./ ]?\\s*('+mr+')\\s*[-./ ]?\\s*(\\d{1,2})(?!\\d)',m=>put(m,value(m[1],months[m[2].toUpperCase()],m[3]),'year_alpha_day'));
 scan('(?<!\\d)(\\d{1,2})\\s*[-/.]\\s*(\\d{1,2})\\s*[-/.:]\\s*((?:19|20)\\d{2})(?!\\d)',m=>{if(overlaps(m))return;const a=+m[1],b=+m[2],dmy=value(m[3],b,a),mdy=value(m[3],a,b),amb=!!dmy&&!!mdy&&dmy!==mdy;put(m,dmy,'dmy',amb);if(mdy&&mdy!==dmy)put(m,mdy,'mdy',amb);});
 scan('(?<![A-Z0-9])(\\d{1,2})\\s*[-./ ]?\\s*('+mr+')\\s*[-./ ]?\\s*((?:19|20)\\d{2})(?!\\d)',m=>put(m,value(m[3],months[m[2].toUpperCase()],m[1]),'dmy_alpha'));
 scan('(?<![A-Z0-9])('+mr+')\\s+(\\d{1,2})\\s*,?\\s*((?:19|20)\\d{2})(?!\\d)',m=>put(m,value(m[3],months[m[1].toUpperCase()],m[2]),'mdy_alpha'));
 scan('(?<!\\d)(\\d{1,2})\\s+(\\d{1,2})\\s+((?:19|20)\\d{2})(?!\\d)',m=>{if(!overlaps(m))put(m,value(m[3],m[2],m[1]),'space_dmy');});
 scan('(?<!\\d)(\\d{8})(?!\\d)',m=>{if(overlaps(m))return;const s=m[1];put(m,value(s.slice(0,4),s.slice(4,6),s.slice(6)),'compact_ymd',true);put(m,value(s.slice(4),s.slice(2,4),s.slice(0,2)),'compact_dmy',true);});
 scan('(?<![A-Z0-9])('+mr+')\\s*((?:19|20)\\d{2})(?!\\d)',m=>{if(!overlaps(m))put(m,value(m[2],months[m[1].toUpperCase()]),'explicit_alpha_month_year');});
 scan('(?<!\\d)(\\d{1,2})\\s*[-/. ]\\s*((?:19|20)\\d{2})(?!\\d)',m=>{if(!overlaps(m))put(m,value(m[2],m[1]),'month_numeric');});
 scan('(?<!\\d)((?:19|20)\\d{2})\\s*[-/. ]\\s*(\\d{1,2})(?!\\d)',m=>{if(!overlaps(m))put(m,value(m[1],m[2]),'year_month');});
 scan('(?<!\\d)((?:19|20)\\d{2})(\\d{2})(?!\\d)',m=>{if(!overlaps(m))put(m,value(m[1],m[2]),'compact_year_month',true);});
 return out.filter((c,i)=>Tokens.keep(original,c.start,c.end)&&!out.some(o=>o.start<=c.start&&o.end>=c.end&&o.end-o.start>c.end-c.start)&&out.findIndex(o=>o.date===c.date&&o.precision===c.precision&&o.start===c.start&&o.end===c.end)===i);
}
