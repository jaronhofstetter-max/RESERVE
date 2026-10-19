// Bounded detector input reduces pixel work; it is not an accuracy claim.
export const MAX_EDGE=960;
export function imageSize(width,height){
 const scale=Math.min(1,MAX_EDGE/Math.max(width,height));
 return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
