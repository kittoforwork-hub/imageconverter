/* global window, Worker */
window.PdfWorkerClient = (() => {
  'use strict';

  // ============================================================
  // CONFIG / STATE
  // ============================================================

  const supported =
    typeof Worker !== 'undefined';

  let worker = null;
  let workerPromise = null;
  let seq = 0;

  const pending = new Map();


  // ============================================================
  // GET WORKER URL
  // ============================================================

  function getWorkerUrl() {
    /*
     * พยายามอ้างอิงจาก URL ของไฟล์ client ตัวนี้โดยตรง
     * เพื่อให้ทำงานได้แม้เว็บอยู่ใน sub-folder / route rewrite
     */
    const currentScript =
      document.currentScript;

    const base =
      currentScript &&
      currentScript.src
        ? currentScript.src
        : new URL(
            'js/pdf-worker-client.js',
            document.baseURI
          ).href;

    return new URL(
      'pdf-worker.js',
      base
    ).href;
  }


  // ============================================================
  // CREATE WORKER
  // ============================================================

  async function createWorker() {
    const url =
      getWorkerUrl();


    // ----------------------------------------------------------
    // Fetch ก่อนสร้าง Worker
    //
    // ป้องกัน server rewrite / fallback route
    // ส่ง HTML หรือไฟล์ผิดมาเป็น worker
    // ----------------------------------------------------------

    const res =
      await fetch(
        url,
        {
          cache: 'no-store'
        }
      );


    if (!res.ok) {
      throw new Error(
        'โหลด PDF worker ไม่สำเร็จ (HTTP ' +
        res.status +
        ')'
      );
    }


    const source =
      await res.text();


    // ----------------------------------------------------------
    // Basic validation
    // ----------------------------------------------------------

    if (
      !/\bimportScripts\s*\(/.test(
        source
      ) ||
      !/\bself\.onmessage\s*=/.test(
        source
      )
    ) {
      throw new Error(
        'ไฟล์ PDF worker ไม่ถูกต้องหรือถูกเซิร์ฟเวอร์ rewrite ไปยังไฟล์อื่น'
      );
    }


    // ----------------------------------------------------------
    // Create Blob Worker
    // ----------------------------------------------------------

    const blob =
      new Blob(
        [source],
        {
          type:
            'text/javascript'
        }
      );


    const blobUrl =
      URL.createObjectURL(
        blob
      );


    let w;

    try {
      w =
        new Worker(
          blobUrl
        );
    } catch (err) {
      URL.revokeObjectURL(
        blobUrl
      );

      throw err;
    }


    /*
     * เก็บ Blob URL เอาไว้ revoke ตอน worker ถูก destroy
     */
    w.__pdfWorkerBlobUrl =
      blobUrl;


    return w;
  }


  // ============================================================
  // TERMINATE WORKER
  // ============================================================

  function terminateWorker() {
    const oldWorker =
      worker;

    worker = null;


    if (!oldWorker) {
      return;
    }


    try {
      oldWorker.terminate();
    } catch (_) {}


    try {
      if (
        oldWorker.__pdfWorkerBlobUrl
      ) {
        URL.revokeObjectURL(
          oldWorker.__pdfWorkerBlobUrl
        );
      }
    } catch (_) {}
  }


  // ============================================================
  // REJECT ALL PENDING REQUESTS
  // ============================================================

  function rejectAllPending(
    error
  ) {
    const err =
      error instanceof Error
        ? error
        : new Error(
            String(
              error ||
              'PDF worker stopped'
            )
          );


    const entries =
      Array.from(
        pending.values()
      );


    pending.clear();


    entries.forEach(
      entry => {
        try {
          entry.reject(err);
        } catch (_) {}
      }
    );
  }


  // ============================================================
  // ENSURE WORKER
  // ============================================================

  async function ensureWorker() {

    // มี worker พร้อมใช้อยู่แล้ว
    if (worker) {
      return worker;
    }


    /*
     * ถ้ากำลังสร้าง worker อยู่
     * ทุก request ใช้ Promise เดียวกัน
     *
     * ป้องกันกรณีมีหลาย tool เรียกพร้อมกัน
     * แล้วสร้าง Worker ซ้ำหลายตัว
     */
    if (workerPromise) {
      return workerPromise;
    }


    workerPromise =
      createWorker()
        .then(
          w => {

            worker =
              w;


            // --------------------------------------------------
            // MESSAGE
            // --------------------------------------------------

            w.onmessage =
              event => {
                const data =
                  event.data ||
                  {};

                const {
                  reqId,
                  ok,
                  result,
                  error
                } = data;


                const entry =
                  pending.get(
                    reqId
                  );


                if (!entry) {
                  return;
                }


                pending.delete(
                  reqId
                );


                if (ok) {
                  entry.resolve(
                    result
                  );
                } else {
                  entry.reject(
                    new Error(
                      error ||
                      'PDF worker request failed'
                    )
                  );
                }
              };


            // --------------------------------------------------
            // WORKER ERROR
            // --------------------------------------------------

            w.onerror =
              event => {

                const message =
                  event &&
                  event.message
                    ? event.message
                    : 'unknown error';


                rejectAllPending(
                  new Error(
                    'PDF worker error: ' +
                    message
                  )
                );


                terminateWorker();
              };


            // --------------------------------------------------
            // MESSAGE ERROR
            // --------------------------------------------------

            w.onmessageerror =
              () => {

                rejectAllPending(
                  new Error(
                    'PDF worker message error'
                  )
                );


                terminateWorker();
              };


            return w;
          }
        )
        .catch(
          error => {

            terminateWorker();

            throw error;
          }
        )
        .finally(
          () => {
            workerPromise =
              null;
          }
        );


    return workerPromise;
  }


  // ============================================================
  // GENERIC RPC CALL
  // ============================================================

  function call(
    type,
    payload,
    transfer
  ) {
    if (!supported) {
      return Promise.reject(
        new Error(
          'เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์'
        )
      );
    }


    const reqId =
      'req-' +
      (++seq);


    const transferList =
      Array.isArray(
        transfer
      )
        ? transfer
        : [];


    return ensureWorker()
      .then(
        w => {

          return new Promise(
            (
              resolve,
              reject
            ) => {

              pending.set(
                reqId,
                {
                  resolve,
                  reject
                }
              );


              try {

                w.postMessage(
                  {
                    reqId,
                    type,
                    payload
                  },
                  transferList
                );


              } catch (err) {

                pending.delete(
                  reqId
                );

                reject(err);
              }
            }
          );
        }
      );
  }


  // ============================================================
  // MERGE PDF
  // ============================================================

  function mergePdfs(
    buffers
  ) {
    if (
      !Array.isArray(
        buffers
      )
    ) {
      return Promise.reject(
        new Error(
          'ข้อมูล PDF สำหรับรวมไม่ถูกต้อง'
        )
      );
    }


    /*
     * buffers ถูก transfer เข้า Worker
     * จึงไม่ควรใช้งาน ArrayBuffer เดิมต่อหลังจากเรียก
     */
    return call(
      'mergePdfs',
      {
        buffers
      },
      buffers.slice()
    );
  }


  // ============================================================
  // BUILD PAGES PDF
  // ============================================================

  function buildPagesPdf(
    buffer,
    indices
  ) {
    return call(
      'buildPagesPdf',
      {
        buffer,
        indices
      },
      [buffer]
    );
  }


  // ============================================================
  // WATERMARK
  // ============================================================

  function applyWatermark(
    buffer,
    opts = {}
  ) {
    const transfer = [
      buffer
    ];


    /*
     * PNG watermark เป็น ArrayBuffer
     * สามารถ transfer ตรงเข้า Worker ได้
     *
     * ข้อดี:
     * ไม่ต้อง copy memory ก้อนเดิมซ้ำ
     */
    if (
      opts.watermarkImage &&
      opts.watermarkImage instanceof
        ArrayBuffer
    ) {
      transfer.push(
        opts.watermarkImage
      );
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


  // ============================================================
  // PAGE NUMBERS
  // ============================================================

  function applyPageNumbers(
    buffer,
    opts
  ) {
    return call(
      'applyPageNumbers',
      Object.assign(
        {
          buffer
        },
        opts || {}
      ),
      [buffer]
    );
  }


  // ============================================================
  // DISPOSE
  // ============================================================

  function dispose() {

    rejectAllPending(
      new Error(
        'PDF worker stopped'
      )
    );


    terminateWorker();
  }


  // ============================================================
  // PUBLIC API
  // ============================================================

  return {

    supported,


    mergePdfs,


    buildPagesPdf,


    applyWatermark,


    applyPageNumbers,


    dispose

  };

})();
