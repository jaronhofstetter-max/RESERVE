/* Local image-only recovery. No date strings, labels, coordinates or network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RESERVE_DATE_IMAGE=api;})(globalThis,function(){
 'use strict';
 function rotatedSize(width,height,angle){const r=angle*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r));return{width:Math.max(1,Math.ceil(width*c+height*s-1e-8)),height:Math.max(1,Math.ceil(width*s+height*c-1e-8))};}
 // Clipped local histograms, blended between tile centres. A second view only:
 // retain the original colour image as the first recognition pass.
 function contrast(data,width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||data.length!==width*height*4)throw Error('Invalid image dimensions');
  const gray=new Uint8Array(width*height),tw=Math.ceil(width/8),th=Math.ceil(height/8),nx=Math.ceil(width/tw),ny=Math.ceil(height/th),maps=[];
  for(let p=0;p<gray.length;p++){const i=p*4;gray[p]=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);}
  for(let ty=0;ty<ny;ty++)for(let tx=0;tx<nx;tx++){
   const x0=tx*tw,y0=ty*th,x1=Math.min(width,x0+tw),y1=Math.min(height,y0+th),area=(x1-x0)*(y1-y0),hist=new Uint32Array(256),map=new Uint8Array(256),limit=Math.max(1,Math.floor(2*area/256));
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)hist[gray[y*width+x]]++;
   let excess=0;for(let b=0;b<256;b++)if(hist[b]>limit){excess+=hist[b]-limit;hist[b]=limit;}
   const share=Math.floor(excess/256),remainder=excess%256;for(let b=0;b<256;b++)hist[b]+=share;
   // Spread the remainder evenly instead of favouring dark bins.
   for(let k=0;k<remainder;k++)hist[Math.floor((k+.5)*256/remainder)]++;
   let total=0;for(let b=0;b<256;b++){total+=hist[b];map[b]=Math.round(255*total/area);}maps.push(map);
  }
  const out=new Uint8ClampedArray(data.length);
  for(let y=0;y<height;y++){const fy=y/th-.5,ay=Math.floor(fy),wy=fy-ay,y0=Math.max(0,Math.min(ny-1,ay)),y1=Math.max(0,Math.min(ny-1,ay+1));
   for(let x=0;x<width;x++){const fx=x/tw-.5,ax=Math.floor(fx),wx=fx-ax,x0=Math.max(0,Math.min(nx-1,ax)),x1=Math.max(0,Math.min(nx-1,ax+1)),p=y*width+x,g=gray[p],v=(maps[y0*nx+x0][g]*(1-wx)+maps[y0*nx+x1][g]*wx)*(1-wy)+(maps[y1*nx+x0][g]*(1-wx)+maps[y1*nx+x1][g]*wx)*wy,i=p*4;out[i]=out[i+1]=out[i+2]=v;out[i+3]=data[i+3];}
  }return out;
 }
 return{version:'1.0',contrast,rotatedSize};
});
