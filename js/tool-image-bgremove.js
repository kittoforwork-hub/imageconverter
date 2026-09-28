(() => {
'use strict';
const U =
window.Utils;
const I18n =
window.I18n || null;
function t(
key,
values
) {
if (
I18n &&
typeof I18n.t ===
'function'
) {
return I18n.t(
key,
values
);
}
return String(
key
);
}
const dropzone =
document.getElementById(
'dz-img-bgremove'
);
const fileInput =
document.getElementById(
'input-img-bgremove'
);
const bulkbar =
document.getElementById(
'bulk-img-bgremove'
);
const countEl =
document.getElementById(
'count-img-bgremove'
);
const clearAllBtn =
document.getElementById(
'clearAll-img-bgremove'
);
const processAllBtn =
document.getElementById(
'processAll-img-bgremove'
);
const downloadZipBtn =
document.getElementById(
'downloadZip-img-bgremove'
);
const jobsEl =
document.getElementById(
'jobs-img-bgremove'
);
const jobTemplate =
document.getElementById(
'tpl-img-bgremove'
);
if (
!dropzone ||
!fileInput ||
!bulkbar ||
!countEl ||
!clearAllBtn ||
!processAllBtn ||
!downloadZipBtn ||
!jobsEl ||
!jobTemplate
) {
console.warn(
'[Image Background Removal] Required elements not found.'
);
return;
}
const TRANSFORMERS_VERSION =
'3.8.1';
const TRANSFORMERS_URL =
`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`;
const GPU_MODEL_ID =
'onnx-community/BiRefNet-ONNX';
const CPU_MODEL_ID =
'onnx-community/BiRefNet_lite-ONNX';
const GPU_DTYPE =
'fp16';
const CPU_DTYPE =
'fp32';
const OUTPUT_FORMAT =
'image/png';
const OUTPUT_EXTENSION =
'png';
const PREFER_GPU =
true;
const MAX_OUTPUT_PIXELS =
32 * 1000 * 1000;
const MAX_DIMENSION_SAFETY =
12000;
const ALLOWED_IMAGE_PREFIX =
'image/';
const WORKER_IDLE_TIMEOUT =
5 * 60 * 1000;
let jobSeq =
0;
const jobs =
[];
let worker =
null;
let workerBlobUrl =
null;
let workerGeneration =
0;
const pendingWorkerRequests =
new Map();
let workerIdleTimer =
null;
async function yieldToUI() {
if (
U &&
typeof U.yieldToUI ===
'function'
) {
await U.yieldToUI();
return;
}
await new Promise(
resolve => {
if (
typeof requestAnimationFrame ===
'function'
) {
requestAnimationFrame(
resolve
);
} else {
setTimeout(
resolve,
0
);
}
}
);
}
function revokeUrl(
url
) {
if (
!url
) {
return;
}
try {
URL.revokeObjectURL(
url
);
} catch (_) {}
}
function getFileKey(
file
) {
if (
!file
) {
return '';
}
return [
file.name,
file.size,
file.lastModified,
file.type
].join('|');
}
function hasDuplicateFile(
file
) {
const key =
getFileKey(
file
);
return jobs.some(
job =>
job &&
!job.disposed &&
getFileKey(
job.file
) === key
);
}
function getErrorKey(
error
) {
const code =
error &&
typeof error.message ===
'string'
? error.message
: '';
if (
code ===
'BACKGROUND_FUNCTION_NOT_FOUND'
) {
return 'errors.backgroundFunctionNotFound';
}
if (
code ===
'BACKGROUND_LIBRARY_LOAD_FAILED'
) {
return 'errors.backgroundLibraryLoadFailed';
}
if (
code ===
'BACKGROUND_EMPTY_RESULT'
) {
return 'image.backgroundRemovalFailed';
}
return 'image.backgroundRemovalFailed';
}
function createWorkerSource() {
return `
'use strict';
// ========================================================
// TRANSFORMERS.JS / MODEL CONSTANTS
// ========================================================
const TRANSFORMERS_URL =
${JSON.stringify(TRANSFORMERS_URL)};
const GPU_MODEL_ID =
${JSON.stringify(GPU_MODEL_ID)};
const CPU_MODEL_ID =
${JSON.stringify(CPU_MODEL_ID)};
const GPU_DTYPE =
${JSON.stringify(GPU_DTYPE)};
const CPU_DTYPE =
${JSON.stringify(CPU_DTYPE)};
const OUTPUT_FORMAT =
${JSON.stringify(OUTPUT_FORMAT)};
const MAX_OUTPUT_PIXELS =
${MAX_OUTPUT_PIXELS};
const MAX_DIMENSION_SAFETY =
${MAX_DIMENSION_SAFETY};
// ========================================================
// STATE
// ========================================================
let transformersModule =
null;
let transformersPromise =
null;
let processor =
null;
let model =
null;
let loadedMode =
null;
let loadedModelId =
null;
let gpuKnownBad =
false;
const cancelledJobs =
new Set();
let currentJobId =
null;
// ========================================================
// POST
// ========================================================
function post(
type,
payload = {}
) {
self.postMessage({
type,
...payload
});
}
// ========================================================
// CANCEL
// ========================================================
function isCancelled(
jobId
) {
return (
!!jobId &&
cancelledJobs.has(
jobId
)
);
}
function throwIfCancelled(
jobId
) {
if (
isCancelled(
jobId
)
) {
throw new Error(
'BACKGROUND_CANCELLED'
);
}
}
function cancelJob(
jobId
) {
if (
jobId
) {
cancelledJobs.add(
jobId
);
}
}
// ========================================================
// LOAD TRANSFORMERS.JS
// ========================================================
async function loadTransformers() {
if (
transformersModule
) {
return transformersModule;
}
if (
transformersPromise
) {
return transformersPromise;
}
transformersPromise =
import(
TRANSFORMERS_URL
)
.then(
module => {
if (
!module
) {
throw new Error(
'BACKGROUND_TRANSFORMERS_LOAD_FAILED'
);
}
transformersModule =
module;
try {
if (
module.env
) {
module.env.allowRemoteModels =
true;
module.env.allowLocalModels =
false;
if (
module.env.backends &&
module.env.backends.onnx &&
module.env.backends.onnx.wasm
) {
module.env.backends.onnx.wasm.numThreads =
Math.max(
1,
Math.min(
4,
Number(
navigator.hardwareConcurrency
) || 2
)
);
}
if (
Object.prototype.hasOwnProperty.call(
module.env,
'logLevel'
)
) {
module.env.logLevel =
40;
}
}
} catch (_) {}
return module;
}
)
.catch(
error => {
console.error(
'[BG Worker] Transformers.js load failed:',
error
);
transformersPromise =
null;
throw new Error(
'BACKGROUND_TRANSFORMERS_LOAD_FAILED'
);
}
);
return transformersPromise;
}
// ========================================================
// WEBGPU PROBE
// ========================================================
async function probeWebGPU() {
if (
gpuKnownBad ||
typeof navigator ===
'undefined' ||
!navigator.gpu ||
typeof navigator.gpu.requestAdapter !==
'function'
) {
return false;
}
try {
const adapter =
await navigator.gpu.requestAdapter({
powerPreference:
'high-performance'
});
return !!adapter;
} catch (
error
) {
console.warn(
'[BG Worker] WebGPU unavailable:',
error
);
return false;
}
}
// ========================================================
// MODEL PROGRESS
// ========================================================
function makeProgressCallback(
jobId
) {
return info => {
if (
isCancelled(
jobId
)
) {
return;
}
if (
!info
) {
return;
}
if (
info.status ===
'progress_total'
) {
const pct =
Number(
info.progress
);
if (
Number.isFinite(
pct
)
) {
post(
'progress',
{
jobId,
phase:
'load',
key:
'download',
current:
pct,
total:
100
}
);
}
return;
}
if (
info.status ===
'ready'
) {
post(
'progress',
{
jobId,
phase:
'load',
key:
'ready',
current:
100,
total:
100
}
);
}
};
}
// ========================================================
// MODEL LOADING
// ========================================================
async function disposeLoadedModel() {
if (
model &&
typeof model.dispose ===
'function'
) {
try {
await model.dispose();
} catch (_) {}
}
model =
null;
processor =
null;
loadedMode =
null;
loadedModelId =
null;
}
async function loadModel(
mode,
jobId
) {
const isGpu =
mode ===
'gpu';
const modelId =
isGpu
? GPU_MODEL_ID
: CPU_MODEL_ID;
const dtype =
isGpu
? GPU_DTYPE
: CPU_DTYPE;
if (
model &&
processor &&
loadedMode ===
mode &&
loadedModelId ===
modelId
) {
return {
model,
processor
};
}
const {
AutoModel,
AutoProcessor
} =
await loadTransformers();
throwIfCancelled(
jobId
);
await disposeLoadedModel();
post(
'progress',
{
jobId,
phase:
'load',
key:
'download',
current:
0,
total:
100
}
);
const progressCallback =
makeProgressCallback(
jobId
);
try {
processor =
await AutoProcessor.from_pretrained(
modelId,
{
progress_callback:
progressCallback
}
);
throwIfCancelled(
jobId
);
model =
await AutoModel.from_pretrained(
modelId,
{
dtype,
...(isGpu
? {
device:
'webgpu'
}
: {}),
progress_callback:
progressCallback
}
);
throwIfCancelled(
jobId
);
loadedMode =
mode;
loadedModelId =
modelId;
post(
'progress',
{
jobId,
phase:
'load',
key:
'ready',
current:
100,
total:
100
}
);
return {
model,
processor
};
} catch (
error
) {
await disposeLoadedModel();
throw error;
}
}
// ========================================================
// INPUT SIZE SAFETY
// ========================================================
function getOutputSize(
width,
height
) {
let targetWidth =
Math.max(
1,
Math.round(
width
)
);
let targetHeight =
Math.max(
1,
Math.round(
height
)
);
const pixels =
targetWidth *
targetHeight;
let scale =
1;
if (
pixels >
MAX_OUTPUT_PIXELS
) {
scale =
Math.sqrt(
MAX_OUTPUT_PIXELS /
pixels
);
}
if (
targetWidth >
MAX_DIMENSION_SAFETY ||
targetHeight >
MAX_DIMENSION_SAFETY
) {
scale =
Math.min(
scale,
MAX_DIMENSION_SAFETY /
Math.max(
targetWidth,
targetHeight
)
);
}
if (
scale <
1
) {
targetWidth =
Math.max(
1,
Math.round(
targetWidth *
scale
)
);
targetHeight =
Math.max(
1,
Math.round(
targetHeight *
scale
)
);
}
return {
width:
targetWidth,
height:
targetHeight,
scaled:
scale < 1
};
}
// ========================================================
// MASK CLEANUP
// ========================================================
function cleanupMask(
mask
) {
if (
!mask ||
!mask.data
) {
return mask;
}
const data =
mask.data;
/*
* Preserve soft alpha. Only snap the extreme ends so tiny
* numerical noise does not leave an almost-invisible fringe.
*/
for (
let i =
0;
i <
data.length;
i++
) {
const value =
data[i];
if (
value <=
4
) {
data[i] =
0;
} else if (
value >=
251
) {
data[i] =
255;
}
}
return mask;
}
// ========================================================
// COMPOSE FINAL PNG AT ORIGINAL RESOLUTION
// ========================================================
async function composePng(
file,
mask,
width,
height,
jobId
) {
throwIfCancelled(
jobId
);
if (
typeof OffscreenCanvas ===
'undefined' ||
typeof createImageBitmap !==
'function'
) {
throw new Error(
'BACKGROUND_CANVAS_UNSUPPORTED'
);
}
const bitmap =
await createImageBitmap(
file
);
try {
throwIfCancelled(
jobId
);
const sourceWidth =
bitmap.width ||
width;
const sourceHeight =
bitmap.height ||
height;
const outputSize =
getOutputSize(
sourceWidth,
sourceHeight
);
const targetWidth =
outputSize.width;
const targetHeight =
outputSize.height;
const canvas =
new OffscreenCanvas(
targetWidth,
targetHeight
);
const ctx =
canvas.getContext(
'2d',
{
alpha:
true,
willReadFrequently:
false
}
);
if (
!ctx
) {
throw new Error(
'BACKGROUND_CANVAS_UNSUPPORTED'
);
}
ctx.imageSmoothingEnabled =
true;
ctx.imageSmoothingQuality =
'high';
ctx.drawImage(
bitmap,
0,
0,
targetWidth,
targetHeight
);
throwIfCancelled(
jobId
);
const maskCanvas =
new OffscreenCanvas(
mask.width,
mask.height
);
const maskCtx =
maskCanvas.getContext(
'2d',
{
alpha:
true,
willReadFrequently:
true
}
);
if (
!maskCtx
) {
throw new Error(
'BACKGROUND_CANVAS_UNSUPPORTED'
);
}
const maskImage =
new ImageData(
mask.width,
mask.height
);
const maskData =
mask.data;
for (
let y =
0;
y <
mask.height;
y++
) {
const rowStart =
y *
mask.width;
for (
let x =
0;
x <
mask.width;
x++
) {
const srcIndex =
rowStart +
x;
const dstIndex =
srcIndex *
4;
const alpha =
maskData[srcIndex];
maskImage.data[
dstIndex
] =
255;
maskImage.data[
dstIndex + 1
] =
255;
maskImage.data[
dstIndex + 2
] =
255;
maskImage.data[
dstIndex + 3
] =
alpha;
}
}
maskCtx.putImageData(
maskImage,
0,
0
);
throwIfCancelled(
jobId
);
ctx.globalCompositeOperation =
'destination-in';
ctx.drawImage(
maskCanvas,
0,
0,
targetWidth,
targetHeight
);
ctx.globalCompositeOperation =
'source-over';
post(
'progress',
{
jobId,
phase:
'output',
key:
outputSize.scaled
? 'resizeOutput'
: 'output',
current:
50,
total:
100
}
);
const blob =
await canvas.convertToBlob({
type:
OUTPUT_FORMAT,
quality:
1
});
if (
!blob ||
!blob.size
) {
throw new Error(
'BACKGROUND_EMPTY_RESULT'
);
}
post(
'progress',
{
jobId,
phase:
'output',
key:
'output',
current:
100,
total:
100
}
);
return blob;
} finally {
try {
bitmap.close();
} catch (_) {}
}
}
// ========================================================
// AI PROCESS
// ========================================================
async function runRemoval(
file,
jobId
) {
throwIfCancelled(
jobId
);
post(
'progress',
{
jobId,
phase:
'prepare',
key:
'prepare',
current:
0,
total:
100
}
);
const {
RawImage
} =
await loadTransformers();
throwIfCancelled(
jobId
);
const image =
await RawImage.fromBlob(
file
);
throwIfCancelled(
jobId
);
post(
'progress',
{
jobId,
phase:
'prepare',
key:
'decode',
current:
70,
total:
100
}
);
let mode =
'cpu';
if (
${String(PREFER_GPU)} &&
await probeWebGPU()
) {
mode =
'gpu';
}
/*
* Full BiRefNet on WebGPU first. If WebGPU/model creation or
* inference fails, retry once using the Lite CPU model.
*/
let loaded =
null;
if (
mode ===
'gpu'
) {
try {
post(
'mode',
{
jobId,
mode:
'gpu'
}
);
loaded =
await loadModel(
'gpu',
jobId
);
} catch (
gpuError
) {
console.warn(
'[BG Worker] Full BiRefNet WebGPU failed. Falling back to Lite CPU:',
gpuError
);
gpuKnownBad =
true;
await disposeLoadedModel();
mode =
'cpu';
post(
'gpuFallback',
{
jobId
}
);
}
}
if (
mode ===
'cpu'
) {
post(
'mode',
{
jobId,
mode:
'cpu'
}
);
loaded =
await loadModel(
'cpu',
jobId
);
}
throwIfCancelled(
jobId
);
post(
'progress',
{
jobId,
phase:
'prepare',
key:
'prepare',
current:
100,
total:
100
}
);
// --------------------------------------------------------
// PREPROCESS
// --------------------------------------------------------
const {
pixel_values
} =
await loaded.processor(
image
);
throwIfCancelled(
jobId
);
post(
'progress',
{
jobId,
phase:
'ai',
key:
'inference',
current:
10,
total:
100
}
);
// --------------------------------------------------------
// INFERENCE
// --------------------------------------------------------
const output =
await loaded.model({
input_image:
pixel_values
});
throwIfCancelled(
jobId
);
if (
!output ||
!output.output_image ||
!output.output_image[0]
) {
throw new Error(
'BACKGROUND_EMPTY_RESULT'
);
}
post(
'progress',
{
jobId,
phase:
'ai',
key:
'inference',
current:
75,
total:
100
}
);
// --------------------------------------------------------
// ALPHA MATTE
// --------------------------------------------------------
let mask =
await RawImage.fromTensor(
output.output_image[0]
.sigmoid()
.mul(255)
.to('uint8')
);
mask =
cleanupMask(
mask
);
const outputSize =
getOutputSize(
image.width,
image.height
);
mask =
await mask.resize(
outputSize.width,
outputSize.height
);
throwIfCancelled(
jobId
);
post(
'progress',
{
jobId,
phase:
'ai',
key:
'matting',
current:
100,
total:
100
}
);
// --------------------------------------------------------
// FINAL PNG
// --------------------------------------------------------
const blob =
await composePng(
file,
mask,
outputSize.width,
outputSize.height,
jobId
);
if (
!blob ||
!blob.size
) {
throw new Error(
'BACKGROUND_EMPTY_RESULT'
);
}
const buffer =
await blob.arrayBuffer();
throwIfCancelled(
jobId
);
post(
'result',
{
jobId,
buffer,
mime:
OUTPUT_FORMAT
}
);
}
// ========================================================
// MESSAGE HANDLER
// ========================================================
self.onmessage =
async event => {
const data =
event &&
event.data
? event.data
: null;
if (
!data
) {
return;
}
if (
data.type ===
'cancel'
) {
cancelJob(
data.jobId
);
return;
}
if (
data.type !==
'process' ||
!data.file ||
!data.jobId
) {
return;
}
const jobId =
data.jobId;
currentJobId =
jobId;
cancelledJobs.delete(
jobId
);
try {
await runRemoval(
data.file,
jobId
);
post(
'done',
{
jobId
}
);
} catch (
error
) {
console.error(
'[BG Worker] Processing failed:',
error
);
post(
'error',
{
jobId,
message:
error &&
error.message
? error.message
: String(
error
)
}
);
} finally {
cancelledJobs.delete(
jobId
);
if (
currentJobId ===
jobId
) {
currentJobId =
null;
}
}
};
post(
'ready'
);
`;
}
function clearWorkerIdleTimer() {
if (
workerIdleTimer
) {
clearTimeout(
workerIdleTimer
);
workerIdleTimer =
null;
}
}
function scheduleWorkerIdleCleanup() {
clearWorkerIdleTimer();
workerIdleTimer =
setTimeout(
() => {
if (
pendingWorkerRequests.size ===
0
) {
destroyWorker();
}
},
WORKER_IDLE_TIMEOUT
);
}
function rejectAllWorkerRequests(
message
) {
pendingWorkerRequests.forEach(
request => {
if (
request &&
typeof request.reject ===
'function'
) {
request.reject(
new Error(
message ||
'BACKGROUND_WORKER_TERMINATED'
)
);
}
}
);
pendingWorkerRequests.clear();
}
function destroyWorker(
message =
'BACKGROUND_WORKER_TERMINATED'
) {
clearWorkerIdleTimer();
rejectAllWorkerRequests(
message
);
if (
worker
) {
try {
worker.terminate();
} catch (_) {}
worker =
null;
}
if (
workerBlobUrl
) {
revokeUrl(
workerBlobUrl
);
workerBlobUrl =
null;
}
}
function ensureWorker() {
if (
worker
) {
return worker;
}
const source =
createWorkerSource();
const blob =
new Blob(
[source],
{
type:
'text/javascript'
}
);
workerBlobUrl =
URL.createObjectURL(
blob
);
workerGeneration++;
try {
worker =
new Worker(
workerBlobUrl,
{
type:
'module'
}
);
} catch (
error
) {
if (
workerBlobUrl
) {
revokeUrl(
workerBlobUrl
);
workerBlobUrl =
null;
}
worker =
null;
throw error;
}
worker.__generation =
workerGeneration;
worker.onmessage =
event => {
handleWorkerMessage(
event
);
};
worker.onerror =
error => {
console.error(
'[Image Background Removal] Worker error:',
error
);
const failedWorker =
worker;
worker =
null;
rejectAllWorkerRequests(
'BACKGROUND_WORKER_FAILED'
);
try {
failedWorker.terminate();
} catch (_) {}
if (
workerBlobUrl
) {
revokeUrl(
workerBlobUrl
);
workerBlobUrl =
null;
}
};
worker.onmessageerror =
error => {
console.error(
'[Image Background Removal] Worker message error:',
error
);
destroyWorker(
'BACKGROUND_WORKER_MESSAGE_ERROR'
);
};
return worker;
}
function getWeightedProgress(
phase,
rawPercent
) {
const percent =
Math.max(
0,
Math.min(
100,
Number(
rawPercent
) || 0
)
);
let start =
0;
let end =
100;
switch (
phase
) {
case 'prepare':
start =
0;
end =
10;
break;
case 'load':
start =
10;
end =
25;
break;
case 'ai':
start =
25;
end =
90;
break;
case 'output':
start =
90;
end =
97;
break;
case 'complete':
start =
97;
end =
100;
break;
default:
start =
0;
end =
100;
break;
}
return Math.round(
start +
(
(
end -
start
) *
(
percent /
100
)
)
);
}
function handleWorkerMessage(
event
) {
const data =
event &&
event.data
? event.data
: null;
if (
!data
) {
return;
}
if (
data.type ===
'ready'
) {
return;
}
const jobId =
data.jobId;
if (
!jobId
) {
return;
}
const pending =
pendingWorkerRequests.get(
jobId
);
if (
!pending
) {
return;
}
if (
data.type ===
'progress'
) {
const job =
pending.job;
if (
!job ||
job.disposed ||
!job.isProcessing
) {
return;
}
const current =
Number(
data.current
);
const total =
Number(
data.total
);
if (
!Number.isFinite(
current
) ||
!Number.isFinite(
total
) ||
total <=
0
) {
return;
}
const rawPercent =
Math.max(
0,
Math.min(
100,
(
current /
total
) *
100
)
);
const phase =
data.phase ||
'ai';
const weightedPercent =
getWeightedProgress(
phase,
rawPercent
);
job.setProgress(
weightedPercent
);
job.setProgressText(
data.key,
Math.round(
rawPercent
)
);
return;
}
if (
data.type ===
'mode'
) {
const job =
pending.job;
if (
job &&
!job.disposed
) {
job.processingMode =
data.mode;
if (
job.statusEl
) {
const modeText =
data.mode ===
'gpu'
? 'GPU'
: 'CPU';
job.statusEl.textContent =
`${t(
'image.preparingModel'
)} (${modeText})`;
}
}
return;
}
if (
data.type ===
'gpuFallback'
) {
const job =
pending.job;
if (
job &&
!job.disposed
) {
job.statusEl &&
(
job.statusEl.textContent =
t(
'image.preparingModel'
)
);
}
return;
}
if (
data.type ===
'result'
) {
try {
const blob =
new Blob(
[data.buffer],
{
type:
data.mime ||
OUTPUT_FORMAT
}
);
pending.resolve(
blob
);
} catch (
error
) {
pending.reject(
error
);
}
pendingWorkerRequests.delete(
jobId
);
scheduleWorkerIdleCleanup();
return;
}
if (
data.type ===
'done'
) {
scheduleWorkerIdleCleanup();
return;
}
if (
data.type ===
'error'
) {
pending.reject(
new Error(
data.message ||
'BACKGROUND_WORKER_PROCESS_FAILED'
)
);
pendingWorkerRequests.delete(
jobId
);
scheduleWorkerIdleCleanup();
return;
}
}
function processInWorker(
job,
file
) {
return new Promise(
(
resolve,
reject
) => {
const currentWorker =
ensureWorker();
const jobId =
job.workerJobId;
clearWorkerIdleTimer();
pendingWorkerRequests.set(
jobId,
{
resolve,
reject,
job
}
);
try {
currentWorker.postMessage(
{
type:
'process',
jobId,
file
}
);
} catch (
error
) {
pendingWorkerRequests.delete(
jobId
);
reject(
error
);
}
}
);
}
function cancelWorkerJob(
job
) {
if (
!job ||
!job.workerJobId
) {
return;
}
const currentWorker =
worker;
if (
!currentWorker
) {
return;
}
try {
currentWorker.postMessage(
{
type:
'cancel',
jobId:
job.workerJobId
}
);
} catch (_) {}
setTimeout(
() => {
if (
pendingWorkerRequests.has(
job.workerJobId
)
) {
destroyWorker(
'BACKGROUND_CANCELLED'
);
}
},
50
);
}
class BgJob {
constructor(
file
) {
this.id =
'bg-' +
(++jobSeq);
this.workerJobId =
this.id;
this.file =
file;
this.resultBlob =
null;
this.resultUrl =
null;
this.objectUrl =
null;
this.isProcessing =
false;
this.disposed =
false;
this.hasError =
false;
this.errorKey =
null;
this.errorParams =
null;
this.processingMode =
null;
this.displayedProgress =
0;
this.el =
jobTemplate
.content
.firstElementChild
.cloneNode(
true
);
this.buildDom();
}
buildDom() {
const el =
this.el;
this.objectUrl =
URL.createObjectURL(
this.file
);
this.beforeImg =
el.querySelector(
'.js-before img'
);
this.afterWrap =
el.querySelector(
'.js-after'
);
this.afterImg =
el.querySelector(
'.js-after img'
);
this.statusEl =
el.querySelector(
'.js-status'
);
this.progressFill =
el.querySelector(
'.js-progress'
);
this.processBtn =
el.querySelector(
'.js-remove-bg-btn'
);
this.downloadBtn =
el.querySelector(
'.js-download-btn'
);
const filenameEl =
el.querySelector(
'.js-filename'
);
const sizeEl =
el.querySelector(
'.js-origsize'
);
const dimEl =
el.querySelector(
'.js-origdim'
);
if (
!this.beforeImg ||
!this.processBtn
) {
this.disposed =
true;
this.revokeObjectUrl();
return;
}
if (
filenameEl
) {
filenameEl.textContent =
this.file.name;
}
if (
sizeEl &&
U &&
typeof U.formatBytes ===
'function'
) {
sizeEl.textContent =
U.formatBytes(
this.file.size
);
}
if (
dimEl
) {
dimEl.textContent =
t(
'image.reading'
);
}
this.el.dataset.processing =
'false';
this.beforeImg.src =
this.objectUrl;
this.beforeImg.onload =
() => {
if (
this.disposed
) {
return;
}
if (
dimEl
) {
dimEl.textContent =
`${this.beforeImg.naturalWidth}×${this.beforeImg.naturalHeight}`;
}
};
this.beforeImg.onerror =
() => {
if (
this.disposed
) {
return;
}
this.setError(
'image.openFailed'
);
if (
dimEl
) {
dimEl.textContent =
t(
'image.readFailed'
);
}
};
this.processBtn.addEventListener(
'click',
() => {
this.process();
}
);
const removeJobBtn =
el.querySelector(
'.js-remove-job-btn'
);
if (
removeJobBtn
) {
removeJobBtn.addEventListener(
'click',
() => {
this.dispose();
el.remove();
const idx =
jobs.indexOf(
this
);
if (
idx >=
0
) {
jobs.splice(
idx,
1
);
}
updateBulkUI();
}
);
}
this.updateLanguageUI();
}

updateLanguageUI() {
if (
this.disposed ||
!this.statusEl
) {
return;
}
if (
this.isProcessing
) {
return;
}
if (
this.resultBlob
) {
this.statusEl.textContent =
t(
'image.readyDownload',
{
size:
U.formatBytes(
this.resultBlob.size
)
}
);
this.statusEl.classList.remove(
'is-error'
);
this.statusEl.classList.add(
'is-ready'
);
return;
}
if (
this.hasError
) {
if (
this.errorKey
) {
this.statusEl.textContent =
t(
this.errorKey,
this.errorParams ||
undefined
);
}
this.statusEl.classList.remove(
'is-ready'
);
this.statusEl.classList.add(
'is-error'
);
return;
}
this.statusEl.textContent =
t(
'image.waitingBackground'
);
this.statusEl.classList.remove(
'is-ready',
'is-error'
);
}
setError(
key,
params =
null
) {
if (
this.disposed
) {
return;
}
this.hasError =
true;
this.errorKey =
key;
this.errorParams =
params;
if (
this.statusEl
) {
this.statusEl.textContent =
t(
key,
params ||
undefined
);
this.statusEl.classList.remove(
'is-ready'
);
this.statusEl.classList.add(
'is-error'
);
}
}
setProgress(
pct
) {
if (
this.disposed ||
!this.progressFill
) {
return;
}
const value =
Math.max(
0,
Math.min(
100,
Number(
pct
) || 0
)
);
this.displayedProgress =
Math.max(
this.displayedProgress,
value
);
this.progressFill.style.width =
`${this.displayedProgress}%`;
}
setWeightedProgress(
phase,
rawPercent
) {
const weighted =
getWeightedProgress(
phase,
rawPercent
);
this.setProgress(
weighted
);
}
setProgressText(
key,
pct
) {
if (
this.disposed ||
!this.statusEl
) {
return;
}
const raw =
typeof key ===
'string'
? key.toLowerCase()
: '';
const isLoading =
raw.includes(
'fetch'
) ||
raw.includes(
'load'
) ||
raw.includes(
'download'
) ||
raw.includes(
'prepare'
) ||
raw.includes(
'decode'
);
this.statusEl.textContent =
t(
isLoading
? 'image.loadingModelProgress'
: 'image.removingBackgroundProgress',
{
percent:
pct
}
);
}
clearResult() {
if (
this.resultUrl
) {
revokeUrl(
this.resultUrl
);
this.resultUrl =
null;
}
this.resultBlob =
null;
if (
this.downloadBtn
) {
this.downloadBtn.removeAttribute(
'href'
);
this.downloadBtn.removeAttribute(
'download'
);
this.downloadBtn.classList.add(
'hidden'
);
}
}
async process() {
if (
this.disposed ||
this.resultBlob ||
this.isProcessing
) {
return;
}
if (
!this.file
) {
return;
}
this.hasError =
false;
this.errorKey =
null;
this.errorParams =
null;
this.displayedProgress =
0;
this.isProcessing =
true;
this.el.dataset.processing =
'true';
if (
this.processBtn
) {
this.processBtn.disabled =
true;
}
this.setProgress(
0
);
this.clearResult();
if (
this.statusEl
) {
this.statusEl.classList.remove(
'is-ready',
'is-error'
);
this.statusEl.textContent =
t(
'image.preparingModel'
);
}
try {
await yieldToUI();
if (
this.disposed
) {
return;
}
const blob =
await processInWorker(
this,
this.file
);
if (
this.disposed
) {
return;
}
if (
!blob
) {
throw new Error(
'BACKGROUND_EMPTY_RESULT'
);
}
if (
typeof blob.size ===
'number' &&
blob.size <=
0
) {
throw new Error(
'BACKGROUND_EMPTY_RESULT'
);
}
this.resultBlob =
blob;
this.resultUrl =
URL.createObjectURL(
blob
);
if (
this.afterImg
) {
this.afterImg.src =
this.resultUrl;
}
if (
this.afterWrap
) {
this.afterWrap.classList.remove(
'hidden'
);
}
if (
this.downloadBtn
) {
this.downloadBtn.href =
this.resultUrl;
this.downloadBtn.download =
`${U.baseName(
this.file.name
)}-nobg.${OUTPUT_EXTENSION}`;
this.downloadBtn.classList.remove(
'hidden'
);
}
this.setWeightedProgress(
'complete',
100
);
if (
this.statusEl
) {
this.statusEl.textContent =
t(
'image.readyDownload',
{
size:
U.formatBytes(
blob.size
)
}
);
this.statusEl.classList.remove(
'is-error'
);
this.statusEl.classList.add(
'is-ready'
);
}
} catch (
error
) {
console.error(
'[Image Background Removal] Error:',
error
);
if (
this.disposed
) {
return;
}
if (
error &&
(
error.message ===
'BACKGROUND_CANCELLED' ||
error.message ===
'BACKGROUND_WORKER_TERMINATED'
)
) {
return;
}
const key =
getErrorKey(
error
);
this.setError(
key
);
this.setProgress(
0
);
this.clearResult();
} finally {
this.isProcessing =
false;
this.processingMode =
null;
this.el.dataset.processing =
'false';
if (
!this.disposed &&
this.processBtn
) {
this.processBtn.disabled =
false;
}
await yieldToUI();
}
}
revokeObjectUrl() {
if (
this.objectUrl
) {
revokeUrl(
this.objectUrl
);
this.objectUrl =
null;
}
}
dispose() {
if (
this.disposed
) {
return;
}
this.disposed =
true;
this.isProcessing =
false;
this.el.dataset.processing =
'false';
cancelWorkerJob(
this
);
this.revokeObjectUrl();
if (
this.resultUrl
) {
revokeUrl(
this.resultUrl
);
this.resultUrl =
null;
}
this.resultBlob =
null;
this.errorKey =
null;
this.errorParams =
null;
}
}
function updateBulkUI() {
const activeJobs =
jobs.filter(
job =>
job &&
!job.disposed
);
countEl.textContent =
String(
activeJobs.length
);
bulkbar.classList.toggle(
'hidden',
activeJobs.length ===
0
);
const hasReady =
activeJobs.some(
job =>
!!job.resultBlob
);
downloadZipBtn.classList.toggle(
'hidden',
!hasReady
);
activeJobs.forEach(
job => {
if (
!job.isProcessing
) {
job.updateLanguageUI();
}
}
);
}
function addFiles(
fileList
) {
Array.from(
fileList || []
)
.filter(
file =>
file &&
typeof file.type ===
'string' &&
file.type.startsWith(
ALLOWED_IMAGE_PREFIX
)
)
.forEach(
file => {
if (
hasDuplicateFile(
file
)
) {
return;
}
const job =
new BgJob(
file
);
if (
job.disposed
) {
return;
}
jobs.push(
job
);
jobsEl.appendChild(
job.el
);
}
);
updateBulkUI();
}
clearAllBtn.addEventListener(
'click',
() => {
jobs.forEach(
job => {
if (
job
) {
job.dispose();
}
}
);
jobs.length =
0;
jobsEl.innerHTML =
'';
destroyWorker(
'BACKGROUND_CANCELLED'
);
updateBulkUI();
}
);
processAllBtn.addEventListener(
'click',
async () => {
if (
processAllBtn.disabled
) {
return;
}
const queue =
jobs.filter(
job =>
job &&
!job.disposed &&
!job.resultBlob
);
if (
!queue.length
) {
return;
}
processAllBtn.disabled =
true;
const total =
queue.length;
let done =
0;
const renderBatchLabel =
() =>
t(
'image.removeBackgroundAllProcessing',
{
current:
Math.min(
done + 1,
total
),
total
}
);
processAllBtn.textContent =
renderBatchLabel();
try {
for (
const job of
queue
) {
if (
!job ||
job.disposed ||
job.resultBlob
) {
done++;
continue;
}
processAllBtn.textContent =
renderBatchLabel();
await job.process();
done++;
await yieldToUI();
}
} finally {
processAllBtn.disabled =
false;
processAllBtn.textContent =
t(
'image.removeBackgroundAll'
);
updateBulkUI();
if (
worker &&
pendingWorkerRequests.size ===
0
) {
scheduleWorkerIdleCleanup();
}
}
}
);
downloadZipBtn.addEventListener(
'click',
async () => {
if (
downloadZipBtn.disabled
) {
return;
}
const ready =
jobs.filter(
job =>
job &&
!job.disposed &&
!!job.resultBlob
);
if (
!ready.length
) {
return;
}
downloadZipBtn.disabled =
true;
downloadZipBtn.textContent =
t(
'image.compressingZip'
);
try {
if (
typeof JSZip !==
'function'
) {
throw new Error(
'JSZIP_NOT_AVAILABLE'
);
}
const zip =
new JSZip();
const usedNames =
new Set();
ready.forEach(
job => {
if (
job.disposed ||
!job.resultBlob
) {
return;
}
const base =
U.baseName(
job.file.name
);
let filename =
`${base}-nobg.png`;
let counter =
2;
while (
usedNames.has(
filename
)
) {
filename =
`${base}-nobg-${counter++}.png`;
}
usedNames.add(
filename
);
zip.file(
filename,
job.resultBlob
);
}
);
const content =
await zip.generateAsync(
{
type:
'blob',
compression:
'STORE'
}
);
U.downloadBlob(
content,
'no-background.zip'
);
} catch (
error
) {
console.error(
'[Image Background Removal] ZIP failed:',
error
);
} finally {
downloadZipBtn.disabled =
false;
downloadZipBtn.textContent =
t(
'image.downloadZip'
);
updateBulkUI();
}
}
);
if (
U &&
typeof U.setupDropzone ===
'function'
) {
U.setupDropzone(
dropzone,
fileInput,
addFiles
);
}
if (
U &&
typeof U.onClearCache ===
'function'
) {
U.onClearCache(
() => {
jobs.forEach(
job => {
if (
job
) {
job.dispose();
}
}
);
jobs.length =
0;
jobsEl.innerHTML =
'';
destroyWorker(
'BACKGROUND_CACHE_CLEARED'
);
updateBulkUI();
}
);
}
document.addEventListener(
'languagechange',
() => {
if (
!processAllBtn.disabled
) {
processAllBtn.textContent =
t(
'image.removeBackgroundAll'
);
}
if (
!downloadZipBtn.disabled
) {
downloadZipBtn.textContent =
t(
'image.downloadZip'
);
}
jobs.forEach(
job => {
if (
job &&
!job.disposed
) {
job.updateLanguageUI();
}
}
);
}
);
updateBulkUI();
})();
