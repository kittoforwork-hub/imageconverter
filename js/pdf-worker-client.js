/* global window, Worker */
window.PdfWorkerClient = (() => {
  'use strict';

  const supported = typeof Worker !== 'undefined';

  let worker = null;
  let seq = 0;
  const pending = new Map();

  function getWorkerUrl() {
    const currentScript = document.currentScript;
    const base = currentScript && currentScript.src
      ? currentScript.src
      : new URL('js/pdf-worker-client.js', document.baseURI).href;

    return new URL('pdf-worker.js', base).href;
  }

  async function createWorker() {
    const url = getWorkerUrl();

    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(
        'โหลด PDF worker ไม่สำเร็จ (HTTP ' + res.status + ')'
      );
    }

    const source = await res.text();

    if (
      !/\bimportScripts\s*\(/.test(source) ||
      !/\bself\.onmessage\s*=/.test(source)
    ) {
      throw new Error(
        'ไฟล์ PDF worker ไม่ถูกต้องหรือถูกเซิร์ฟเวอร์ rewrite ไปยังไฟล์อื่น'
      );
    }

    const blob = new Blob([source], {
      type: 'text/javascript'
    });

    const blobUrl = URL.createObjectURL(blob);
    const w = new Worker(blobUrl);

    w.__pdfWorkerBlobUrl = blobUrl;

    return w;
  }

  async function ensureWorker() {
    if (worker) return worker;

    worker = await createWorker();

    worker.onmessage = (e) => {
      const {
        reqId,
        ok,
        result,
        error
      } = e.data;

      const entry = pending.get(reqId);
      if (!entry) return;

      pending.delete(reqId);

      if (ok) {
        entry.resolve(result);
      } else {
        entry.reject(new Error(error));
      }
    };

    worker.onerror = (e) => {
      pending.forEach(entry => {
        entry.reject(
          new Error(
            'PDF worker error: ' +
            (e.message || 'unknown error')
          )
        );
      });

      pending.clear();

      try {
        worker.terminate();
      } catch (_) {}

      try {
        if (
          worker &&
          worker.__pdfWorkerBlobUrl
        ) {
          URL.revokeObjectURL(
            worker.__pdfWorkerBlobUrl
          );
        }
      } catch (_) {}

      worker = null;
    };

    return worker;
  }

  function call(type, payload, transfer) {
    if (!supported) {
      return Promise.reject(
        new Error(
          'เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์'
        )
      );
    }

    const reqId = 'req-' + (++seq);

    return ensureWorker().then(
      w =>
        new Promise((resolve, reject) => {
          pending.set(reqId, {
            resolve,
            reject
          });

          try {
            w.postMessage(
              {
                reqId,
                type,
                payload
              },
              transfer || []
            );
          } catch (err) {
            pending.delete(reqId);
            reject(err);
          }
        })
    );
  }

  function applyWatermark(buffer, opts = {}) {
    const transfer = [buffer];

    // PNG watermark สามารถส่งแบบ Transferable ได้
    // เพื่อลดการ copy ArrayBuffer
    if (
      opts.watermarkImage &&
      opts.watermarkImage instanceof ArrayBuffer
    ) {
      transfer.push(opts.watermarkImage);
    }

    return call(
      'applyWatermark',
      Object.assign(
        {
          buffer
        },
        opts
      ),
      transfer
    );
  }

  function dispose() {
    pending.forEach(entry => {
      entry.reject(
        new Error('PDF worker stopped')
      );
    });

    pending.clear();

    if (worker) {
      try {
        worker.terminate();
      } catch (_) {}

      try {
        if (worker.__pdfWorkerBlobUrl) {
          URL.revokeObjectURL(
            worker.__pdfWorkerBlobUrl
          );
        }
      } catch (_) {}

      worker = null;
    }
  }

  return {
    supported,

    mergePdfs: (buffers) =>
      call(
        'mergePdfs',
        { buffers },
        buffers.slice()
      ),

    buildPagesPdf: (buffer, indices) =>
      call(
        'buildPagesPdf',
        {
          buffer,
          indices
        },
        [buffer]
      ),

    applyWatermark,

    applyPageNumbers: (buffer, opts) =>
      call(
        'applyPageNumbers',
        Object.assign(
          {
            buffer
          },
          opts
        ),
        [buffer]
      ),

    dispose
  };
})();
