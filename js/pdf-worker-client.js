/* global window, Worker */
window.PdfWorkerClient = (() => {
  'use strict';

  const supported =
    typeof window !== 'undefined' &&
    typeof Worker !== 'undefined';

  let worker = null;
  let workerUrl = null;
  let seq = 0;

  const pending = new Map();

  /**
   * หา URL ของ pdf-worker.js
   * โดยอ้างอิงจากตำแหน่งของ pdf-worker-client.js
   */
  function getWorkerUrl() {
    const scripts = Array.from(
      document.querySelectorAll('script[src]')
    );

    const clientScript = scripts.find((script) => {
      try {
        const src = new URL(script.src, document.baseURI).href;
        return src.endsWith('/pdf-worker-client.js');
      } catch {
        return false;
      }
    });

    if (clientScript) {
      return new URL('pdf-worker.js', clientScript.src).href;
    }

    return new URL('js/pdf-worker.js', document.baseURI).href;
  }

  /**
   * โหลด worker source แล้วสร้าง Blob Worker
   * วิธีนี้ช่วยป้องกัน path/rewrite problem
   */
  async function createWorker() {
    const sourceUrl = getWorkerUrl();

    const response = await fetch(sourceUrl, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(
        `โหลด PDF worker ไม่สำเร็จ (HTTP ${response.status})`
      );
    }

    const source = await response.text();

    // กันกรณี server rewrite URL ไปหน้า HTML หรือไฟล์ผิด
    if (!source.includes('self.onmessage')) {
      throw new Error(
        'ไม่พบ self.onmessage ใน pdf-worker.js'
      );
    }

    if (!source.includes('importScripts')) {
      throw new Error(
        'pdf-worker.js ไม่พบ importScripts()'
      );
    }

    const blob = new Blob(
      [source],
      { type: 'application/javascript' }
    );

    workerUrl = URL.createObjectURL(blob);

    const instance = new Worker(workerUrl);

    instance.onmessage = (event) => {
      const data = event.data || {};
      const reqId = data.reqId;

      if (!reqId) return;

      const entry = pending.get(reqId);
      if (!entry) return;

      pending.delete(reqId);

      if (data.ok) {
        entry.resolve(data.result);
      } else {
        entry.reject(
          new Error(
            data.error || 'PDF worker ทำงานไม่สำเร็จ'
          )
        );
      }
    };

    instance.onerror = (event) => {
      const message =
        event?.message ||
        'เกิดข้อผิดพลาดใน PDF worker';

      pending.forEach(({ reject }) => {
        reject(new Error(`PDF worker error: ${message}`));
      });

      pending.clear();

      try {
        instance.terminate();
      } catch (_) {}

      if (workerUrl) {
        try {
          URL.revokeObjectURL(workerUrl);
        } catch (_) {}
        workerUrl = null;
      }

      worker = null;
    };

    return instance;
  }

  async function ensureWorker() {
    if (worker) {
      return worker;
    }

    worker = await createWorker();

    return worker;
  }

  function call(type, payload, transfer = []) {
    if (!supported) {
      return Promise.reject(
        new Error(
          'เบราว์เซอร์นี้ไม่รองรับ Web Worker'
        )
      );
    }

    const reqId = `req-${++seq}`;

    return ensureWorker().then((instance) => {
      return new Promise((resolve, reject) => {
        pending.set(reqId, {
          resolve,
          reject
        });

        try {
          instance.postMessage(
            {
              reqId,
              type,
              payload
            },
            transfer
          );
        } catch (error) {
          pending.delete(reqId);
          reject(error);
        }
      });
    });
  }

  function dispose() {
    pending.forEach(({ reject }) => {
      reject(
        new Error('PDF worker ถูกหยุดการทำงาน')
      );
    });

    pending.clear();

    if (worker) {
      try {
        worker.terminate();
      } catch (_) {}

      worker = null;
    }

    if (workerUrl) {
      try {
        URL.revokeObjectURL(workerUrl);
      } catch (_) {}

      workerUrl = null;
    }
  }

  /**
   * API
   */
  return {
    supported,

    mergePdfs(buffers) {
      return call(
        'mergePdfs',
        { buffers },
        buffers.map((buffer) => buffer)
      );
    },

    buildPagesPdf(buffer, indices) {
      return call(
        'buildPagesPdf',
        {
          buffer,
          indices
        },
        [buffer]
      );
    },

    applyWatermark(buffer, opts = {}) {
      return call(
        'applyWatermark',
        {
          buffer,
          ...opts
        },
        [buffer]
      );
    },

    applyPageNumbers(buffer, opts = {}) {
      return call(
        'applyPageNumbers',
        {
          buffer,
          ...opts
        },
        [buffer]
      );
    },

    dispose
  };
})();
