/* Shared by live capture and the experimental parser. Offsets always refer to
 * the original OCR text. Never shorten a damaged full date into a month/year.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RESERVE_DATE_TOKENS=api;})(globalThis,function(){
 'use strict';
 function joinedTimes(text){
  const out=[];
  // A four-digit year directly followed by a complete, valid HH:MM clock.
  // The clock provides a boundary; arbitrary following digits do not.
  const re=/(?<!\d)((?:(?:19|20)\d{2}\s*[-/.]\s*\d{2}\s*[-/.]\s*\d{2}|\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*(?:19|20)\d{2}))((?:[01]\d|2[0-3]):[0-5]\d)(?!\d|:\d)/g;
  for(const m of text.matchAll(re))out.push({start:m.index,end:m.index+m[1].length,clockEnd:m.index+m[0].length});
  return out;
 }
 function view(text){
  // Replace one ASCII digit, rather than inserting text, to preserve span indices.
  // String offsets (UTF-16) must remain stable even before non-ASCII packaging text.
  let result=text;for(const t of joinedTimes(text))result=result.slice(0,t.end)+' '+result.slice(t.end+1);
  return result;
 }
 function keep(text,start,end){
  if(start<0||end<=start)return false;
  const clocks=joinedTimes(text),boundary=clocks.some(t=>t.start===start&&t.end===end);
  for(const m of text.matchAll(/(?<!\d)\d+(?:\s*[-/.:]\s*\d+)+/g)){
   let stop=m.index+m[0].length;
   // A trailing single day digit followed by another spaced digit is unresolved.
   // It may be a split day or a separate code. Neither interpretation is asserted.
   if(/^(?:19|20)\d{2}\s*[-/.]\s*\d{1,2}\s*[-/.:]\s*\d$/.test(m[0])){
    const extra=/^\s+\d(?!\d)/.exec(text.slice(stop));if(extra)stop+=extra[0].length;
   }
   if(start>=m.index&&end<=stop&&(start>m.index||end<stop)&&!boundary)return false;
  }
  if(start>0&&/\d/.test(text[start-1]))return false;
  if(/\d/.test(text[end]||'')&&!boundary)return false;
  return true;
 }
 return{view,keep,joinedTimes};
});
