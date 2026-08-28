/* global window, Worker */
window.PdfWorkerClient = (() => {
  'use strict';

  // This worker only does pdf-lib work now (merge / watermark / page
  // numbers / page extraction) — see js/pdf-worker.js for why page
  // rendering (pdf.js) stays on the main thread instead.
  const supported = typeof Worker !== 'undefined';

  let worker = null;
  let seq = 0;
  const pending = new Map();

  function getWorkerUrl() {
    // Resolve from this script's actual URL instead of document.baseURI.
    // This prevents the worker path from breaking when the app is hosted
    // in a sub-folder, behind a reverse proxy, or on a rewritten route.
    const currentScript = document.currentScript;
    const base = currentScript && currentScript.src
      ? currentScript.src
      : new URL('js/pdf-worker-client.js', document.baseURI).href;
    return new URL('pdf-worker.js', base).href;
  }

  async function createWorker() {
    const url = getWorkerUrl();
    // Fetch first so a bad rewrite/server fallback cannot accidentally load
    // pdf-worker-client.js as the Worker and produce:
    // `importScripts is not defined`.
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('โหลด PDF worker ไม่สำเร็จ (HTTP ' + res.status + ')');
    const source = await res.text();
    if (!/\bimportScripts\s*\(/.test(source) || !/\bself\.onmessage\s*=/.test(source)) {
      throw new Error('ไฟล์ PDF worker ไม่ถูกต้องหรือถูกเซิร์ฟเวอร์ rewrite ไปยังไฟล์อื่น');
    }
    const blob = new Blob([source], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const w = new Worker(blobUrl);
    w.__pdfWorkerBlobUrl = blobUrl;
    return w;
  }

  async function ensureWorker() {
    if (worker) return worker;
    worker = await createWorker();
    worker.onmessage = (e) => {
      const { reqId, ok, result, error } = e.data;
      const entry = pending.get(reqId);
      if (!entry) return;
      pending.delete(reqId);
      if (ok) entry.resolve(result);
      else entry.reject(new Error(error));
    };
    worker.onerror = (e) => {
      // A worker-level error has no reqId to route to a specific caller.
      pending.forEach(entry => entry.reject(new Error('PDF worker error: ' + (e.message || 'unknown error'))));
      pending.clear();
      try { worker.terminate(); } catch (_) {}
      try { if (worker && worker.__pdfWorkerBlobUrl) URL.revokeObjectURL(worker.__pdfWorkerBlobUrl); } catch (_) {}
      worker = null;
    };
    return worker;
  }

  function call(type, payload, transfer) {
    if (!supported) {
      return Promise.reject(new Error('เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์'));
    }
    const reqId = 'req-' + (++seq);
    return ensureWorker().then(w => new Promise((resolve, reject) => {
      pending.set(reqId, { resolve, reject });
      try {
        w.postMessage({ reqId, type, payload }, transfer || []);
      } catch (err) {
        pending.delete(reqId);
        reject(err);
      }
    }));
  }

  function dispose() {
    pending.forEach(entry => entry.reject(new Error('PDF worker stopped')));
    pending.clear();
    if (worker) {
      try { worker.terminate(); } catch (_) {}
      try { if (worker && worker.__pdfWorkerBlobUrl) URL.revokeObjectURL(worker.__pdfWorkerBlobUrl); } catch (_) {}
      worker = null;
    }
  }

  return {
    supported,
    mergePdfs: (buffers) => call('mergePdfs', { buffers }, buffers.slice()),
    buildPagesPdf: (buffer, indices) => call('buildPagesPdf', { buffer, indices }, [buffer]),
    applyWatermark: (buffer, opts) => call('applyWatermark', Object.assign({ buffer }, opts), [buffer]),
    applyPageNumbers: (buffer, opts) => call('applyPageNumbers', Object.assign({ buffer }, opts), [buffer]),
    dispose
  };
})();
