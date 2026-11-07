/* Node built-in regression tests for v4 core logic. No external test dependencies. */
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const local=new Map();
const app={};
const runtime={window:app,self:app,Date,Uint8ClampedArray,localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},console};
vm.createContext(runtime);
for(const file of ['kitto-filename.js','kitto-image-refine.js','kitto-settings.js']){
  vm.runInContext(await readFile(path.join(root,'public/js',file),'utf8'),runtime,{filename:file});
}
const name=app.KittoFileName;
assert.equal(name.render('PRODUCT-{n}','cat.png',1,{start:1,digits:3,date:new Date(2026,10,7)}),'PRODUCT-002');
assert.equal(name.render('{name}-{date}','my.file.jpg',0,{date:new Date(2026,10,7)}),'my.file-20261107');
assert.equal(name.render('../bad\\name:<x>','file.jpg',0,{}),'.._bad_name__x_');
assert.ok(!name.render('<>/?','x.jpg',0).includes('/'));
const unique=name.uniqueNames([{template:'{name}',source:'foo.png',index:0},{template:'{name}',source:'foo.webp',index:1},{template:'{name}',source:'Foo.png',index:2}],'jpg');
assert.deepEqual([...unique],['foo.jpg','foo (2).jpg','Foo (3).jpg']);
const a=new Uint8ClampedArray([10,20,30,0, 30,40,50,30, 50,60,70,255]);
const original=Array.from(a);
app.KittoRefineAlpha(a,3,1,0,0);assert.deepEqual(Array.from(a),original);
app.KittoRefineAlpha(a,3,1,30,0);assert.equal(a[3],0);assert.equal(a[7],0);assert.equal(a[11],255);
assert.deepEqual([a[0],a[1],a[2]],[10,20,30], 'Alpha refinement must not recolor source pixels');
assert.throws(()=>app.KittoRefineAlpha(new Uint8ClampedArray(4),4000,4000,20,1),/ใหญ่/);
assert.equal(app.KittoSettings.get().quality,85);
app.KittoSettings.set({quality:95,concurrency:'3',zipMode:'zip',reduceMotion:true});
assert.equal(app.KittoSettings.get().quality,95);
assert.equal(app.KittoSettings.effectiveConcurrency(2,500),3);
app.KittoSettings.set({quality:5,concurrency:'99',zipMode:'unknown'});
assert.equal(app.KittoSettings.get().quality,85);
assert.equal(app.KittoSettings.get().concurrency,'auto');
assert.equal(app.KittoSettings.effectiveConcurrency(2,500),1);
assert.equal(app.KittoSettings.effectiveConcurrency(8,1440),2);
app.KittoSettings.reset();assert.equal(app.KittoSettings.get().reduceMotion,false);
const sw=await readFile(path.join(root,'public/sw.js'),'utf8');
assert.match(sw,/kitto-app-v4\.0\.1/);
assert.match(sw,/cache:'no-cache'/);
assert.doesNotMatch(sw,/manifest\.webmanifest/);
for(const required of ['kitto-settings.js','kitto-settings-ui.js','kitto-filename.js','kitto-image-refine.js','kitto-worker-pool.js','kitto-v4.css'])assert.ok(sw.includes(required),`Missing v4 offline cache: ${required}`);
for(const page of ['index.html','file-converter.html','workflow.html','notepad.html']){
  const html=await readFile(path.join(root,'public',page),'utf8');
  assert.match(html,/kitto-v4\.css/);
  assert.match(html,/kitto-settings-ui\.js/);
  assert.doesNotMatch(html,/rel=["']manifest["']/);
}
const crop=await readFile(path.join(root,'public/js/tool-image-crop.js'),'utf8');
assert.match(crop,/restoreEdit\(delta\)/);
assert.match(crop,/captureEdit\(\)/);

// Worker reuse and cancellation are tested without needing Cloudflare or a browser.
let created=0,terminated=0;
class MockWorker {
  constructor(){created++;this.ended=false;this.onmessage=null;this.onerror=null;}
  postMessage({blob}){setTimeout(()=>{if(!this.ended)this.onmessage?.({data:{ok:true,blob}});},8);}
  terminate(){if(!this.ended){this.ended=true;terminated++;}}
}
const workerRuntime={window:{},Worker:MockWorker,DOMException,setTimeout,clearTimeout,console};
vm.createContext(workerRuntime);
vm.runInContext(await readFile(path.join(root,'public/js/kitto-worker-pool.js'),'utf8'),workerRuntime);
const pool=new workerRuntime.window.KittoWorkerPool('/fake-worker.js',2);
await pool.transform(new Blob(['one']),{},new AbortController().signal);
await pool.transform(new Blob(['two']),{},new AbortController().signal);
assert.equal(created,1,'worker should be reused for consecutive files');
const controller=new AbortController();
const interrupted=pool.transform(new Blob(['late']),{},controller.signal);
controller.abort();
await assert.rejects(interrupted,/Canceled/);
assert.equal(terminated,1,'aborted worker should be terminated');
await pool.transform(new Blob(['next']),{},new AbortController().signal);
assert.equal(created,2,'a new worker should replace the terminated one');
pool.dispose();
assert.equal(terminated,2,'pool should terminate remaining idle worker');

console.log('v4 regression checks passed: filenames, alpha edges, preferences, crop undo, offline updates.');

assert.equal(name.render('{n}','a.png',0,{start:0,digits:2}),'00');
const bounded = new workerRuntime.window.KittoWorkerPool('/fake-worker.js',1);
const previousCount = created;
await Promise.all([1,2,3].map(() => bounded.transform(new Blob(['one']),{})));
assert.equal(created-previousCount,1);
const activeJob = bounded.transform(new Blob(['active']),{});
const waitingJob = bounded.transform(new Blob(['pending']),{});
bounded.dispose();
await Promise.all([assert.rejects(activeJob,/Canceled/),assert.rejects(waitingJob,/Canceled/)]);
