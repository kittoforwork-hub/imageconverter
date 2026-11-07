/* Dependency-free contract smoke tests for queue, ZIP writer and offline mode. */
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime={window:{}, Blob, TextEncoder, DataView, Uint8Array, Uint32Array,
  AbortController, URL, setTimeout, clearTimeout};
vm.createContext(runtime);
for (const file of ['kitto-queue.js','zip-store.js']) {
  const source=await readFile(path.join(root,'public/js',file),'utf8');
  vm.runInContext(source,runtime,{filename:file});
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let active=0, peak=0;
const queue=new runtime.window.KittoQueue(async(item,signal,progress)=>{
  active++; peak=Math.max(peak,active);
  progress(.5,'Working');
  await wait(10);
  active--;
  if(signal.aborted)throw new Error('Canceled');
  return {blob:new Blob([item.file.name]),name:item.file.name+'.txt'};
},()=>{},2);
const files=Array.from({length:6},(_,index)=>({name:'test-'+index,size:12,lastModified:1}));
queue.add(files,{quality:.85});
await wait(130);
assert.equal(queue.items.filter(item=>item.status==='done').length,6);
assert.ok(peak<=2,`queue concurrency exceeded: ${peak}`);
assert.ok(queue.items.every(i=>i.config.quality === .85));
const q2=new runtime.window.KittoQueue(async(_item,signal)=>{
  await wait(30);
  if(signal.aborted)throw new Error('Canceled');
  return {blob:new Blob(['a']),name:'ok.txt'};
});
q2.add([{name:'cancel-me',size:1}]);
q2.cancel(q2.items[0].id);
q2.retry(q2.items[0].id);
await wait(85);
assert.equal(q2.items[0].status,'done','retry after cancel did not recover');
const zip=await runtime.window.KittoZipStore.makeZip([
  {name:'สินค้า.jpg',blob:new Blob(['one'])},
  {name:'สินค้า.jpg',blob:new Blob(['two'])}
]);
const buf=Buffer.from(await zip.arrayBuffer());
assert.equal(buf.readUInt32LE(0),0x04034b50);
assert.equal(buf.readUInt32LE(buf.length-22),0x06054b50);
assert.equal(buf.readUInt16LE(buf.length-22+10),2,'ZIP should contain two entries');
assert.ok(buf.includes(Buffer.from('สินค้า.jpg')));
assert.ok(buf.includes(Buffer.from('สินค้า (2).jpg')));
for (const page of ['index.html','file-converter.html','notepad.html','workflow.html']) {
  const html=await readFile(path.join(root,'public',page),'utf8');
  assert.ok(!/<link\b[^>]*rel=["']manifest["']/i.test(html), `${page} must not register an install manifest`);
}
const shell=await readFile(path.join(root,'public/js/page-shell.js'),'utf8');
assert.ok(!shell.includes('beforeinstallprompt'),'No app install prompt handler should remain');
assert.ok(!shell.includes('app-install'),'No install app button should remain');
const offlineWorker=await readFile(path.join(root,'public/sw.js'),'utf8');
assert.ok(!offlineWorker.includes('manifest.webmanifest'),'Offline cache must not cache the old manifest');
for(const file of ['workflow.html','sw.js','js/workflow-worker.js','js/workflow-image-core.js']){
  await access(path.join(root,'public',file));
}
console.log('Smoke tests passed: batch concurrency, cancellation/retry, ZIP output and offline shell.');
