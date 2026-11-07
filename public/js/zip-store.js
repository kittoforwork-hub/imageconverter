/* ZIP (store method): no CDN dependency; entries are validated and checksummed. */
(() => {
  'use strict';
  const encoder = new TextEncoder();
  const table = new Uint32Array(256);
  for (let n=0; n<256; n++) { let c=n; for(let j=0;j<8;j++) c=(c&1)?0xedb88320^(c>>>1):(c>>>1); table[n]=c>>>0; }
  function crc32(bytes, prev = 0xffffffff) { let crc=prev; for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return crc>>>0; }
  function u16(view, offset, n) {view.setUint16(offset,n,true);}
  function u32(view, offset, n) {view.setUint32(offset,n,true);}
  async function makeZip(files, progress=()=>{}) {
    if(!files.length)throw new Error('ไม่มีไฟล์');
    if(files.length>500)throw new Error('จำนวนไฟล์เกิน 500');
    const size = files.reduce((s,item)=>s+item.blob.size,0);
    if(size>300*1024*1024)throw new Error('ZIP มีขนาดเกิน 300 MB กรุณาแบ่งดาวน์โหลด');
    let offset=0;let done=0;const parts=[];const central=[];
    const now=new Date(); const dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2);
    const usedNames=new Set();
    for (const item of files) {
      let name=String(item.name||'image.png').replace(/[\\/\x00-\x1f]/g,'_').slice(0,140);
      const base=name.replace(/(\.[^.]+)$/,''); const ext=name.slice(base.length);
      let counter=2;while(usedNames.has(name.toLowerCase()))name=`${base} (${counter++})${ext}`;
      usedNames.add(name.toLowerCase());
      const utf8=encoder.encode(name); if(utf8.length>65535)throw new Error('ชื่อไฟล์ยาวเกินไป');
      const blob=item.blob;const bytes=new Uint8Array(await blob.arrayBuffer());
      const checksum=(crc32(bytes)^0xffffffff)>>>0;
      const head=new Uint8Array(30+utf8.length);const h=new DataView(head.buffer);
      u32(h,0,0x04034b50);u16(h,4,20);u16(h,6,0x0800);u16(h,8,0);u16(h,10,dosTime);u16(h,12,dosDate);u32(h,14,checksum);
      u32(h,18,blob.size);u32(h,22,blob.size);u16(h,26,utf8.length);u16(h,28,0);head.set(utf8,30);
      parts.push(head,blob);
      const c=new Uint8Array(46+utf8.length);const v=new DataView(c.buffer);
      u32(v,0,0x02014b50);u16(v,4,20);u16(v,6,20);u16(v,8,0x0800);u16(v,10,0);u16(v,12,dosTime);u16(v,14,dosDate);
      u32(v,16,checksum);u32(v,20,blob.size);u32(v,24,blob.size);u16(v,28,utf8.length);u16(v,30,0);u16(v,32,0);u16(v,34,0);u16(v,36,0);u32(v,38,0);u32(v,42,offset);c.set(utf8,46);central.push(c);
      offset+=head.length+blob.size;
      done++;progress(done/files.length);
    }
    const centralSize=central.reduce((sum,a)=>sum+a.length,0);
    const end=new Uint8Array(22);const ev=new DataView(end.buffer);
    u32(ev,0,0x06054b50);u16(ev,4,0);u16(ev,6,0);u16(ev,8,files.length);u16(ev,10,files.length);u32(ev,12,centralSize);u32(ev,16,offset);u16(ev,20,0);
    return new Blob([...parts,...central,end],{type:'application/zip'});
  }
  window.KittoZipStore={makeZip};
})();
