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

    return String(
      key
    );
  }


  // ============================================================
  // CONFIG / STATE
  // ============================================================

  const supported =
    typeof Worker !== 'undefined';

  let worker = null;

  let workerPromise = null;

  let seq = 0;

  /*
   * Worker generation
   *
   * ทุกครั้งที่ dispose / reset Worker
   * generation จะเพิ่มขึ้น
   *
   * Worker ที่ถูกสร้างจาก generation เก่า
   * จะไม่มีสิทธิ์กลายเป็น Worker ตัวใหม่
   *
   * ใช้ป้องกัน race condition เช่น:
   *
   * createWorker()
   *      ↓
   * dispose()
   *      ↓
   * createWorker() เสร็จ
   *
   * Worker เก่าจะถูก terminate ทิ้งทันที
   */
  let workerGeneration = 0;


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
              String(
                error
              )
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


    let w =
      null;


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

      } catch (
        _
      ) {}


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
     * ให้ล้าง reference ก่อน
     */
    if (
      targetWorker === worker
    ) {

      worker =
        null;

    }


    if (
      !targetWorker
    ) {

      return;

    }


    try {

      targetWorker.terminate();

    } catch (
      _
    ) {}


    /*
     * Blob URL เป็น resource ที่ต้อง revoke
     * หลังจาก Worker ตัวนั้นหมดอายุ
     */
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

    } catch (
      _
    ) {}

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

        } catch (
          _
        ) {}

      }
    );

  }


  // ============================================================
  // FORMAT WORKER ERROR
  // ============================================================

  function createClientErrorFromWorkerData(
    data
  ) {

    /*
     * P0 FIX:
     *
     * pdf-worker.js ส่ง:
     *
     *   errorKey
     *   errorData
     *   error
     *
     * Client เดิมอ่านเฉพาะ `error`
     * ทำให้ localized error key หาย
     *
     * ตอนนี้จะใช้ errorKey/errorData ก่อน
     * และ fallback เป็น error
     */

    const errorKey =
      data &&
      typeof data.errorKey ===
        'string' &&
      data.errorKey
        ? data.errorKey
        : null;


    const errorData =
      data &&
      data.errorData &&
      typeof data.errorData ===
        'object'
        ? data.errorData
        : {};


    if (
      errorKey
    ) {

      const translated =
        t(
          errorKey,
          errorData
        );


      /*
       * เก็บ metadata ไว้กับ Error
       * เผื่อ caller ต้องการตรวจสอบภายหลัง
       */
      const error =
        new Error(
          translated
        );


      error.errorKey =
        errorKey;


      error.errorData =
        errorData;


      return error;

    }


    if (
      data &&
      typeof data.error ===
        'string' &&
      data.error
    ) {

      return new Error(
        data.error
      );

    }


    return new Error(
      t(
        'pdfWorker.requestFailed'
      )
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


    /*
     * จับ generation ปัจจุบันไว้
     *
     * ถ้ามี dispose() ระหว่าง createWorker()
     * generation จะเปลี่ยน
     * และ Worker ที่กำลังสร้างอยู่จะถูกถือว่า stale
     */
    const generation =
      workerGeneration;


    const creationPromise =
      createWorker()
        .then(
          w => {

            /*
             * --------------------------------------------------
             * P0 FIX: DISPOSE RACE
             * --------------------------------------------------
             *
             * ถ้าระหว่าง createWorker() มี dispose()
             * generation จะไม่ตรงกัน
             *
             * Worker ตัวนี้ห้ามถูกติดตั้งกลับเข้าระบบ
             */
            if (
              generation !==
              workerGeneration
            ) {

              terminateWorker(
                w
              );


              throw new Error(
                t(
                  'pdfWorker.stopped'
                )
              );

            }


            /*
             * ถ้ามี Worker ตัวอื่นติดตั้งไปแล้ว
             * Worker ตัวนี้ถือว่า stale เช่นกัน
             */
            if (
              worker &&
              worker !== w
            ) {

              terminateWorker(
                w
              );


              return worker;

            }


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
                  event &&
                  event.data
                    ? event.data
                    : {};


                const {
                  reqId,
                  ok,
                  result
                } =
                  data;


                const entry =
                  pending.get(
                    reqId
                  );


                /*
                 * request อาจถูก reject ไปแล้วโดย
                 * dispose() หรือ worker error
                 */
                if (
                  !entry
                ) {

                  return;

                }


                /*
                 * ป้องกัน request คนละ Worker
                 * มา resolve entry นี้
                 */
                if (
                  entry.worker !==
                  w
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
                    createClientErrorFromWorkerData(
                      data
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


                /*
                 * terminateWorker จะ clear worker
                 * และ revoke Blob URL
                 */
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
             * ถ้ามีการติดตั้ง Worker ไประหว่างทาง
             * แต่ Promise สุดท้าย fail
             * อย่าปล่อย Worker ค้าง
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
        );


    workerPromise =
      creationPromise;


    /*
     * ----------------------------------------------------------
     * P0 FIX: workerPromise ownership
     * ----------------------------------------------------------
     *
     * สำคัญ:
     * Promise รุ่นเก่าห้ามไปล้าง workerPromise
     * ของ generation ใหม่
     *
     * จึงตรวจว่า workerPromise ยังเป็น Promise
     * ตัวเดียวกับที่เราสร้าง
     */
    creationPromise.finally(
      () => {

        if (
          workerPromise ===
          creationPromise
        ) {

          workerPromise =
            null;

        }

      }
    ).catch(
      () => {}
    );


    return creationPromise;

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


    /*
     * จับ generation ตั้งแต่ตอนเริ่ม request
     *
     * ถ้ามี dispose() ระหว่าง ensureWorker()
     * request นี้จะไม่ถูกส่งเข้า Worker รุ่นใหม่
     */
    const requestGeneration =
      workerGeneration;


    return ensureWorker()
      .then(
        w => {

          /*
           * ----------------------------------------------------
           * P0 FIX: GENERATION CHECK
           * ----------------------------------------------------
           */
          if (
            requestGeneration !==
            workerGeneration
          ) {

            throw new Error(
              t(
                'pdfWorker.stoppedBeforeSend'
              )
            );

          }


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

              /*
               * ตรวจอีกครั้งก่อนลง pending
               */
              if (
                requestGeneration !==
                workerGeneration ||
                worker !== w
              ) {

                reject(
                  new Error(
                    t(
                      'pdfWorker.stoppedBeforeSend'
                    )
                  )
                );


                return;

              }


              pending.set(
                reqId,
                {
                  resolve,
                  reject,

                  worker:
                    w,

                  generation:
                    requestGeneration
                }
              );


              try {

                /*
                 * ตรวจครั้งสุดท้ายก่อน postMessage
                 *
                 * ป้องกัน race ระหว่าง:
                 *
                 * pending.set()
                 *
                 * และ
                 *
                 * dispose()
                 */
                if (
                  requestGeneration !==
                    workerGeneration ||
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
     * ----------------------------------------------------------
     * P0 FIX: INVALIDATE CURRENT GENERATION
     * ----------------------------------------------------------
     *
     * ทำก่อนทุกอย่าง
     *
     * Worker ที่กำลังสร้างอยู่จะถูก mark เป็น stale
     * แม้ createWorker() จะเสร็จทีหลัง
     */
    workerGeneration++;


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
     * terminate Worker ที่ใช้งานอยู่
     */
    if (
      worker
    ) {

      terminateWorker(
        worker
      );

    }


    /*
     * ----------------------------------------------------------
     * IMPORTANT
     * ----------------------------------------------------------
     *
     * ไม่ terminate Worker ที่ยังไม่เสร็จจาก createWorker()
     * ตรงนี้ เพราะเรายังไม่มี reference ของ Worker
     *
     * แต่ generation check ใน ensureWorker()
     * จะจับ stale Worker แล้ว terminate ให้เองทันที
     * เมื่อ createWorker() resolve
     *
     * เราไม่ set workerPromise = null ตรงนี้
     * เพื่อไม่ให้ request ใหม่เข้าใจผิดว่า
     * Worker รุ่นเก่ายังเป็น Worker ที่ใช้ได้
     */

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
