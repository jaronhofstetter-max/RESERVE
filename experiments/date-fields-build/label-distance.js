// Compare line centres perpendicular to the printed baseline, not page Y alone.
// This avoids preferring a long label merely because its right edge is closer.
export function labelDistance(dateBox,labelBox){
 const valid=b=>Array.isArray(b)&&b.length===4&&b.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
 if(!valid(dateBox)||!valid(labelBox))return null;
 const centre=b=>[b.reduce((s,p)=>s+p[0],0)/4,b.reduce((s,p)=>s+p[1],0)/4];
 const left=[(labelBox[0][0]+labelBox[3][0])/2,(labelBox[0][1]+labelBox[3][1])/2];
 const right=[(labelBox[1][0]+labelBox[2][0])/2,(labelBox[1][1]+labelBox[2][1])/2];
 const vx=right[0]-left[0],vy=right[1]-left[1],length=Math.hypot(vx,vy);
 if(length<1)return null;
 const u=[vx/length,vy/length],n=[-u[1],u[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 const extent=(box,axis)=>{const v=box.map(p=>dot(p,axis));return Math.max(...v)-Math.min(...v);};
 const a=centre(dateBox),b=centre(labelBox),delta=[a[0]-b[0],a[1]-b[1]],height=Math.max(8,Math.min(extent(dateBox,n),extent(labelBox,n)));
 const perpendicular=Math.abs(dot(delta,n)),along=Math.abs(dot(delta,u));
 const gap=Math.max(0,along-(extent(dateBox,u)+extent(labelBox,u))/2);
 const acrossGap=Math.max(0,perpendicular-(extent(dateBox,n)+extent(labelBox,n))/2);
 if(acrossGap>height*3.5||gap>Math.max(extent(dateBox,u),height*5))return null;
 // Horizontal separation is only a tie-breaker inside the existing neighbourhood.
 return perpendicular/height+Math.min(.1,gap/Math.max(extent(dateBox,u),height)*.02);
}

export function textFrame(box){
 if(!Array.isArray(box)||box.length!==4||!box.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null;
 const left=[(box[0][0]+box[3][0])/2,(box[0][1]+box[3][1])/2],right=[(box[1][0]+box[2][0])/2,(box[1][1]+box[2][1])/2];
 const length=Math.hypot(right[0]-left[0],right[1]-left[1]);if(length<1)return null;
 const u=[(right[0]-left[0])/length,(right[1]-left[1])/length],n=[-u[1],u[0]],bounds=projectBox(box,u,n);
 return{u,n,bounds,width:bounds[2]-bounds[0],height:bounds[3]-bounds[1]};
}
export function projectBox(box,u,n){const a=box.map(p=>p[0]*u[0]+p[1]*u[1]),b=box.map(p=>p[0]*n[0]+p[1]*n[1]);return[Math.min(...a),Math.min(...b),Math.max(...a),Math.max(...b)];}
