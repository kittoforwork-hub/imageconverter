/* Optional alpha-mask edge refinement after background removal. No additional AI request. */
(function(root){
  'use strict';
  function refineAlphaPixels(data,width,height,trim=0,softness=0){
    if(!data||!width||!height)return data;
    const threshold=Math.max(0,Math.min(100,Number(trim)||0));
    const blur=Math.max(0,Math.min(2,Number(softness)||0));
    if(!threshold&&!blur)return data;
    if(width*height>12e6)throw new Error('ภาพใหญ่เกินไปสำหรับการเก็บขอบภาพ กรุณาลดขนาดรูปหรือปิดปรับขอบ');
    // Alpha is copied before filtering, so we never blur pixels from a previously modified row.
    const before=new Uint8ClampedArray(width*height);
    for(let p=0,i=3;p<before.length;p++,i+=4)before[p]=data[i];
    const radius=blur>=1?Math.round(blur):0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const p=y*width+x;
      let a=before[p];
      if(radius&&a!==255&&a!==0){
        let n=0,total=0;
        for(let yy=Math.max(0,y-radius);yy<=Math.min(height-1,y+radius);yy++)
          for(let xx=Math.max(0,x-radius);xx<=Math.min(width-1,x+radius);xx++){total+=before[yy*width+xx];n++;}
        a=Math.round((a+(total/n))*0.5);
      }
      if(threshold)a=Math.max(0,Math.min(255,Math.round((a-threshold)*255/(255-threshold))));
      data[p*4+3]=a;
    }
    return data;
  }
  root.KittoRefineAlpha=refineAlphaPixels;
})(typeof self!=='undefined'?self:globalThis);
