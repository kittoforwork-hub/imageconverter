/* global window, Worker, document, URL, Blob */

window.PdfWorkerClient = (() => {
  'use strict';


  // ============================================================
  // I18N
  // ============================================================

  const I18n =
    window.I18n || null;


  function t(
    key,
    values
  ) {

    if (
      I18n &&
      typeof I18n.t === 'function'
    ) {

      return I18n.t(
        key,
        values
      );
    }

    return String(key);
  }


  // ============================================================
  // CONFIG / STATE
  // ============================================================

  const supported =
    typeof Worker !== 'undefined';

  let worker = null;
  let workerPromise = null;
  let seq = 0;

  const pending = new Map();


  /*
   * เก็บ URL ของ client ตั้งแต่ตอน script โหลด
   *
   * ไม่ใช้ document.currentScript ตอนผู้ใช้กดปุ่มทีหลัง
   * เพราะตอนนั้น document.currentScript มักเป็น null
   */
  const clientScriptUrl =
    document.currentScript &&
    document.currentScript.src
      ? document.currentScript.src
      : new URL(
          'js/pdf-worker-client.js',
          document.baseURI
        ).href;


  // ============================================================
  // GET WORKER URL
  // ============================================================

  function getWorkerUrl() {

    return new URL(
      'pdf-worker.js',
      clientScriptUrl
    ).href;

  }


  // ============================================================
  // CREATE WORKER
  // ============================================================

  async function createWorker() {

    if (!supported) {

      throw new Error(
        t(
          'pdfWorker.browserNotSupported'
        )
      );

    }


    const url =
      getWorkerUrl();


    // ----------------------------------------------------------
    // Fetch worker source ก่อน
    // ----------------------------------------------------------

    let res;

    try {

      res =
        await fetch(
          url,
          {
            cache:
              'no-store'
          }
        );

    } catch (
      error
    ) {

      throw new Error(
        t(
          'pdfWorker.loadFailed',
          {
            message:
              error?.message ||
              String(error)
          }
        )
      );

    }


    if (!res.ok) {

      throw new Error(
        t(
          'pdfWorker.httpFailed',
          {
            status:
              res.status
          }
        )
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
        t(
          'pdfWorker.invalidWorker'
        )
      );

    }


    // ----------------------------------------------------------
    // Create Blob Worker
    // ----------------------------------------------------------

    const blob =
      new Blob(
        [
          source
        ],
        {
          type:
            'text/javascript'
        }
      );


    const blobUrl =
      URL.createObjectURL(
        blob
      );


    let w = null;


    try {

      w =
        new Worker(
          blobUrl
        );

    } catch (
      error
    ) {

      try {

        URL.revokeObjectURL(
          blobUrl
        );

      } catch (_) {}


      throw error;

    }


    /*
     * เก็บ Blob URL ไว้กับ Worker
     * เพื่อ revoke เมื่อ Worker ถูกทำลาย
     */
    w.__pdfWorkerBlobUrl =
      blobUrl;


    return w;

  }


  // ============================================================
  // TERMINATE WORKER
  // ============================================================

  function terminateWorker(
    targetWorker = worker
  ) {

    /*
     * ถ้า target เป็น Worker ตัวปัจจุบัน
     * ให้ล้าง reference
     */
    if (
      targetWorker === worker
    ) {

      worker = null;

    }


    if (
      !targetWorker
    ) {

      return;

    }


    try {

      targetWorker.terminate();

    } catch (_) {}


    try {

      if (
        targetWorker.__pdfWorkerBlobUrl
      ) {

        URL.revokeObjectURL(
          targetWorker.__pdfWorkerBlobUrl
        );


        targetWorker.__pdfWorkerBlobUrl =
          null;

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
              t(
                'pdfWorker.stopped'
              )
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

          entry.reject(
            err
          );

        } catch (_) {}

      }
    );

  }


  // ============================================================
  // ENSURE WORKER
  // ============================================================

  async function ensureWorker() {

    // ----------------------------------------------------------
    // Worker พร้อมใช้
    // ----------------------------------------------------------

    if (
      worker
    ) {

      return worker;

    }


    // ----------------------------------------------------------
    // กำลังสร้าง Worker อยู่
    // ----------------------------------------------------------

    if (
      workerPromise
    ) {

      return workerPromise;

    }


    // ----------------------------------------------------------
    // สร้าง Worker
    // ----------------------------------------------------------

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

                /*
                 * ถ้า Worker นี้ไม่ใช่ Worker ปัจจุบัน
                 * message นี้ถือเป็น stale message
                 */
                if (
                  worker !== w
                ) {

                  return;

                }


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


                if (
                  !entry
                ) {

                  return;

                }


                pending.delete(
                  reqId
                );


                if (
                  ok
                ) {

                  entry.resolve(
                    result
                  );

                } else {

                  entry.reject(
                    new Error(
                      error ||
                      t(
                        'pdfWorker.requestFailed'
                      )
                    )
                  );

                }

              };


            // --------------------------------------------------
            // WORKER ERROR
            // --------------------------------------------------

            w.onerror =
              event => {

                /*
                 * ถ้าเป็น Worker เก่า
                 * อย่าไปทำลาย Worker ตัวใหม่
                 */
                if (
                  worker !== w
                ) {

                  return;

                }


                const message =
                  event &&
                  event.message
                    ? event.message
                    : t(
                        'pdfWorker.unknownError'
                      );


                rejectAllPending(
                  new Error(
                    t(
                      'pdfWorker.workerError',
                      {
                        message
                      }
                    )
                  )
                );


                terminateWorker(
                  w
                );

              };


            // --------------------------------------------------
            // MESSAGE ERROR
            // --------------------------------------------------

            w.onmessageerror =
              () => {

                if (
                  worker !== w
                ) {

                  return;

                }


                rejectAllPending(
                  new Error(
                    t(
                      'pdfWorker.messageError'
                    )
                  )
                );


                terminateWorker(
                  w
                );

              };


            return w;

          }
        )
        .catch(
          error => {

            /*
             * createWorker() อาจสร้าง Worker ได้แล้ว
             * แต่เกิด error ระหว่าง setup
             */
            if (
              worker
            ) {

              terminateWorker(
                worker
              );

            }


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

    if (
      !supported
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.backgroundNotSupported'
          )
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

          /*
           * Worker อาจถูก dispose ระหว่างที่
           * ensureWorker() กำลัง resolve
           */
          if (
            worker !== w
          ) {

            throw new Error(
              t(
                'pdfWorker.notReady'
              )
            );

          }


          return new Promise(
            (
              resolve,
              reject
            ) => {

              pending.set(
                reqId,
                {
                  resolve,
                  reject,
                  worker:
                    w
                }
              );


              try {

                /*
                 * ตรวจอีกครั้งก่อน postMessage
                 *
                 * ป้องกัน race ตอน clear/dispose
                 */
                if (
                  worker !== w
                ) {

                  pending.delete(
                    reqId
                  );


                  reject(
                    new Error(
                      t(
                        'pdfWorker.stoppedBeforeSend'
                      )
                    )
                  );


                  return;

                }


                w.postMessage(
                  {
                    reqId,
                    type,
                    payload
                  },
                  transferList
                );


              } catch (
                error
              ) {

                pending.delete(
                  reqId
                );


                reject(
                  error
                );

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
          t(
            'pdfWorker.invalidPdfBuffers'
          )
        )
      );

    }


    /*
     * ArrayBuffer ทุกตัวจะถูก transfer เข้า Worker
     *
     * หลังเรียกฟังก์ชันนี้ buffer ต้นฉบับจะถูก detach
     * ดังนั้น caller ไม่ควรใช้ buffer เดิมต่อ
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

    if (
      !(buffer instanceof ArrayBuffer)
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidPdfData'
          )
        )
      );

    }


    if (
      !Array.isArray(
        indices
      )
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidPageList'
          )
        )
      );

    }


    return call(
      'buildPagesPdf',
      {
        buffer,
        indices
      },
      [
        buffer
      ]
    );

  }


  // ============================================================
  // WATERMARK
  // ============================================================

  function applyWatermark(
    buffer,
    opts = {}
  ) {

    if (
      !(buffer instanceof ArrayBuffer)
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidPdfData'
          )
        )
      );

    }


    const transfer = [
      buffer
    ];


    /*
     * PNG watermark
     *
     * transfer ได้เฉพาะ ArrayBuffer
     * ไม่ใช่ Blob / Uint8Array โดยตรง
     */
    if (
      opts.watermarkImage &&
      opts.watermarkImage instanceof
        ArrayBuffer
    ) {

      /*
       * ป้องกันกรณีส่ง buffer เดิมซ้ำ
       * ซึ่งจะทำให้ transfer list มีตัวเดียวกัน 2 ครั้ง
       */
      if (
        opts.watermarkImage !==
        buffer
      ) {

        transfer.push(
          opts.watermarkImage
        );

      }

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

    if (
      !(buffer instanceof ArrayBuffer)
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidPdfData'
          )
        )
      );

    }


    return call(
      'applyPageNumbers',
      Object.assign(
        {
          buffer
        },
        opts || {}
      ),
      [
        buffer
      ]
    );

  }


  // ============================================================
  // DISPOSE
  // ============================================================

  function dispose() {

    /*
     * ยกเลิกทุก request ที่ยังรออยู่ก่อน
     * เพื่อไม่ให้ Promise ค้าง
     */
    rejectAllPending(
      new Error(
        t(
          'pdfWorker.stopped'
        )
      )
    );


    /*
     * ถ้ากำลังสร้าง Worker อยู่
     * workerPromise จะถูกปล่อยให้จบตาม lifecycle
     */
    if (
      worker
    ) {

      terminateWorker(
        worker
      );

    }

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
