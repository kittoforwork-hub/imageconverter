import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import worker from '../src/index.js';

const origin = 'https://kitto.test';
const request = (url, opts) => new Request(origin + url, opts);
const post = (body, headers) => request('/api/remove-background', {
  method: 'POST', headers: { 'Content-Type': 'image/png', ...headers }, body
});
const assets = { fetch: () => new Response('static page') };
const fileBytes = new Uint8Array([1,2,3]);
let upstream;
const env = { ASSETS:assets, IMAGES:{ input(stream) {
  assert.ok(stream instanceof ReadableStream);
  return { transform(options) {
    assert.equal(options.segment,'foreground');
    return { async output(options) {
      assert.equal(options.format,'image/png');
      if (upstream instanceof Error) throw upstream;
      return { response: () => upstream };
    }};
  }};
}}};

async function check(req,status,code,bindings=env) {
  const response = await worker.fetch(req,bindings);
  assert.equal(response.status,status);
  assert.equal((await response.json()).code,code);
}
assert.equal(await (await worker.fetch(request('/'),env)).text(),'static page');
assert.equal((await (await worker.fetch(request('/api/health'),env)).json()).backgroundRemoval,true);
await check(request('/api/missing'),404,'NOT_FOUND');
await check(request('/api/remove-background'),405,'METHOD_NOT_ALLOWED');
await check(post(fileBytes,{Origin:'https://foreign.test'}),403,'ORIGIN_NOT_ALLOWED');
await check(post(fileBytes),503,'BACKGROUND_SERVICE_NOT_CONFIGURED',{ASSETS:assets});
await check(post(null),400,'BACKGROUND_EMPTY_FILE');
await check(post(fileBytes,{'Content-Type':'text/html'}),415,'BACKGROUND_UNSUPPORTED_FORMAT');
await check(post(fileBytes,{'Content-Length':'20971521'}),413,'BACKGROUND_FILE_TOO_LARGE');
await check(post(new Uint8Array(20971521)),413,'BACKGROUND_FILE_TOO_LARGE');
for (const [number,status,code] of [
  ['9422',429,'BACKGROUND_FREE_LIMIT_REACHED'],['9432',503,'BACKGROUND_IMAGES_BILLING_NOT_SUPPORTED'],
  ['9413',413,'BACKGROUND_IMAGE_PROCESSING_LIMIT'],['9522',413,'BACKGROUND_IMAGE_PROCESSING_LIMIT'],
  ['9520',415,'BACKGROUND_UNSUPPORTED_FORMAT']
]) {
  for (const failure of [Object.assign(new Error('Images error'),{code:Number(number)}), new Response(number,{status:400})]) {
    upstream=failure;
    await check(post(fileBytes),status,code);
  }
}

const browser={window:{},AbortController,setTimeout,clearTimeout};
browser.fetch=(path,options)=>worker.fetch(request(path,options),env);
vm.runInNewContext(await readFile(new URL('../public/js/background-client.js',import.meta.url),'utf8'),browser);
const remove=browser.window.KittoBackground.remove;
const file=new File([fileBytes],'product.PNG');
upstream=new Response(fileBytes,{headers:{'Content-Type':'image/png'}});
const blob=await remove(file);
assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),fileBytes);
assert.equal(blob.type,'image/png');
await assert.rejects(remove(new File([],'empty.png')),/BACKGROUND_EMPTY_FILE/);
await assert.rejects(remove(new File(['text'],'x.txt')),/BACKGROUND_UNSUPPORTED_FORMAT/);
browser.fetch=async()=>new Response('static fallback',{headers:{'Content-Type':'text/html'}});
await assert.rejects(remove(file),/BACKGROUND_INVALID_OUTPUT/);
browser.fetch=async()=>new Response(null,{headers:{'Content-Type':'image/png'}});
await assert.rejects(remove(file),/BACKGROUND_EMPTY_RESULT/);
browser.fetch=(_,opts)=>new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('aborted'))));
const controller=new AbortController();
const canceled=remove(file,controller.signal);
controller.abort();
await assert.rejects(canceled,/BACKGROUND_CANCELLED/);
browser.setTimeout=(callback)=>setTimeout(callback,0);
await assert.rejects(remove(file),/BACKGROUND_TIMEOUT/);

// Exercise the public editor API with a storage quota failure followed by recovery.
const textarea=new EventTarget();
textarea.focus=()=>{};
const status={};
const stored=new Map([['online-notepad-content-v1','old note']]);
const noteRuntime={
  window:new EventTarget(),document:Object.assign(new EventTarget(),{
    documentElement:{dataset:{}},querySelector:()=>null,
    getElementById:id=>({'notepad-textarea':textarea,'notepad-save-status':status})[id]
  }),
  console:{error:()=>{},warn:()=>{}},setTimeout,clearTimeout,
  localStorage:{getItem:key=>stored.get(key),setItem(){throw new Error('QuotaExceededError');}}
};
vm.runInNewContext(await readFile(new URL('../public/js/notepad.js',import.meta.url),'utf8'),noteRuntime);
const editor=noteRuntime.window.OnlineNotepad;
assert.equal(editor.getText(),'old note');
editor.setText('new note');
editor.save();
assert.equal(status.textContent,'notepad.status.saveFailed');
assert.equal(editor.getText(),'new note');
noteRuntime.localStorage.setItem=(key,value)=>stored.set(key,value);
editor.save();
assert.equal(status.textContent,'notepad.status.saved');
assert.equal(JSON.parse(stored.get('kitto-notebook-v2')).notes[0].content,'new note');
console.log('Passed Worker routes, upload validation, background client and notebook storage recovery.');
