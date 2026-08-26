/* global window, Worker, OffscreenCanvas */
window.PdfWorkerClient = (() => {
  'use strict';

  // Feature check up front — every method below assumes both exist.
  // Supported in Chrome/Edge/Firefox for years, and Safari since 16.4
  // (2023), so this covers essentially everyone by now.
  const supported = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

  let worker = null;
  let seq = 0;
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker('js/pdf-worker.js');
    worker.onmessage = (e) => {
      const { reqId, ok, result, error } = e.data;
      const entry = pending.get(reqId);
      if (!entry) return;
      pending.delete(reqId);
      if (ok) entry.resolve(result);
      else entry.reject(new Error(error));
    };
    worker.onerror = (e) => {
      // A worker-level script error has no reqId to route to a specific
      // caller, so reject everything still in flight rather than leaving
      // those promises hanging forever.
      pending.forEach(entry => entry.reject(new Error('PDF worker error: ' + e.message)));
      pending.clear();
    };
    return worker;
  }

  function call(type, payload, transfer) {
    if (!supported) {
      return Promise.reject(new Error('เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์'));
    }
    const w = ensureWorker();
    const reqId = 'req-' + (++seq);
    return new Promise((resolve, reject) => {
      pending.set(reqId, { resolve, reject });
      w.postMessage({ reqId, type, payload }, transfer || []);
    });
  }

  return {
    supported,
    openDoc: (buffer) => call('openDoc', { buffer }, [buffer]),
    closeDoc: (docId) => call('closeDoc', { docId }),
    renderPage: (docId, opts) => call('renderPage', Object.assign({ docId }, opts)),
    mergePdfs: (buffers) => call('mergePdfs', { buffers }, buffers.slice()),
    buildPagesPdf: (buffer, indices) => call('buildPagesPdf', { buffer, indices }, [buffer]),
    applyWatermark: (buffer, opts) => call('applyWatermark', Object.assign({ buffer }, opts), [buffer]),
    applyPageNumbers: (buffer, opts) => call('applyPageNumbers', Object.assign({ buffer }, opts), [buffer])
  };
})();
