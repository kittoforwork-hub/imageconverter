/* global window, Worker, document, URL, fetch */

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
  // CONFIG
  // ============================================================

  /*
   * Request timeout
   *
   * ถ้า Worker ไม่ตอบกลับภายในเวลานี้
   * Promise จะ reject เพื่อป้องกัน request ค้างถาวร
   */
  const REQUEST_TIMEOUT =
    120000;


  /*
   * cache control ตอน fetch worker source
   *
   * ใช้ no-store เพื่อให้ debugging / deploy
   * ไม่ติด source เก่า
   */
  const WORKER_FETCH_CACHE =
    'no-store';


  // ============================================================
  // STATE
  // ============================================================

  const supported =
    typeof Worker !== 'undefined';


  let worker =
    null;


  /*
   * Promise สำหรับ Worker ที่กำลังสร้าง
   *
   * Promise รุ่นเก่าสามารถถูก invalidate ได้
   * โดย dispose() จะ set เป็น null
   *
   * finally() ของ Promise เก่าจะไม่แตะ Promise ใหม่
   * เพราะมี identity check
   */
  let workerPromise =
    null;


  /*
   * Request sequence
   */
  let seq =
    0;


  /*
   * Worker generation
   *
   * ทุกครั้งที่ dispose()
   * generation จะเพิ่ม
   *
   * Worker รุ่นเก่าจะไม่มีสิทธิ์กลับมาเป็น current worker
   */
  let workerGeneration =
    0;


  /*
   * requestId -> pending entry
   */
  const pending =
    new Map();


  /*
   * เก็บ URL ของ script ตั้งแต่ตอนโหลด
   *
   * ไม่ใช้ document.currentScript ตอนเรียกภายหลัง
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
  // SAFE ERROR MESSAGE
  // ============================================================

  function getErrorMessage(
    error
  ) {

    if (
      error &&
      typeof error.message === 'string' &&
      error.message
    ) {

      return error.message;

    }


    return String(
      error ||
      t(
        'pdfWorker.unknownError'
      )
    );

  }


  // ============================================================
  // CREATE CLIENT ERROR FROM WORKER DATA
  // ============================================================

  function createClientErrorFromWorkerData(
    data
  ) {

    /*
     * Worker ควรส่ง:
     *
     * {
     *   ok: false,
     *   errorKey,
     *   errorData,
     *   error
     * }
     *
     * Client จะใช้ errorKey ก่อน
     * และ fallback ไป error
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


      const error =
        new Error(
          translated
        );


      error.errorKey =
        errorKey;


      error.errorData =
        errorData;


      /*
       * ถ้า Worker ส่ง error code เพิ่มมา
       * สามารถรักษา metadata เอาไว้ได้
       */
      if (
        data &&
        data.errorCode
      ) {

        error.errorCode =
          data.errorCode;

      }


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
  // CLEAR REQUEST TIMER
  // ============================================================

  function clearRequestTimer(
    entry
  ) {

    if (
      !entry
    ) {

      return;

    }


    if (
      entry.timer !== null
    ) {

      clearTimeout(
        entry.timer
      );


      entry.timer =
        null;

    }

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

        clearRequestTimer(
          entry
        );


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
  // TERMINATE WORKER
  // ============================================================

  function terminateWorker(
    targetWorker = worker
  ) {

    /*
     * ถ้าเป็น current worker
     * ล้าง reference ก่อน
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


    /*
     * ป้องกัน event เก่า
     * หลัง terminate()
     */
    try {

      targetWorker.onmessage =
        null;

    } catch (
      _
    ) {}


    try {

      targetWorker.onerror =
        null;

    } catch (
      _
    ) {}


    try {

      targetWorker.onmessageerror =
        null;

    } catch (
      _
    ) {}


    try {

      targetWorker.terminate();

    } catch (
      _
    ) {}

  }


  // ============================================================
  // HANDLE WORKER FAILURE
  // ============================================================

  function handleWorkerFailure(
    targetWorker,
    error
  ) {

    /*
     * Worker ตัวเก่าไม่มีสิทธิ์
     * ทำลาย Worker ตัวใหม่
     */
    if (
      worker !== targetWorker
    ) {

      return;

    }


    rejectAllPending(
      error instanceof Error
        ? error
        : new Error(
            t(
              'pdfWorker.workerError'
            )
          )
    );


    terminateWorker(
      targetWorker
    );

  }


  // ============================================================
  // ATTACH WORKER HANDLERS
  // ============================================================

  function attachWorkerHandlers(
    targetWorker
  ) {

    /*
     * MESSAGE
     */
    targetWorker.onmessage =
      event => {

        /*
         * Worker เก่า
         */
        if (
          worker !== targetWorker
        ) {

          return;

        }


        const data =
          event &&
          event.data
            ? event.data
            : {};


        const reqId =
          data.reqId;


        /*
         * ไม่มี reqId
         * ไม่ใช่ response ของ RPC
         */
        if (
          typeof reqId !== 'string' ||
          !reqId
        ) {

          return;

        }


        const entry =
          pending.get(
            reqId
          );


        /*
         * Request อาจถูก timeout/dispose
         * ไปแล้ว
         */
        if (
          !entry
        ) {

          return;

        }


        /*
         * ป้องกัน Worker ผิดตัว
         */
        if (
          entry.worker !==
          targetWorker
        ) {

          return;

        }


        /*
         * ป้องกัน generation ผิดรุ่น
         */
        if (
          entry.generation !==
          workerGeneration
        ) {

          pending.delete(
            reqId
          );


          clearRequestTimer(
            entry
          );


          try {

            entry.reject(
              new Error(
                t(
                  'pdfWorker.stopped'
                )
              )
            );

          } catch (
            _
          ) {}


          return;

        }


        pending.delete(
          reqId
        );


        clearRequestTimer(
          entry
        );


        if (
          data.ok
        ) {

          try {

            entry.resolve(
              data.result
            );

          } catch (
            _
          ) {}

        } else {

          try {

            entry.reject(
              createClientErrorFromWorkerData(
                data
              )
            );

          } catch (
            error
          ) {

            entry.reject(
              error
            );

          }

        }

      };


    /*
     * WORKER ERROR
     */
    targetWorker.onerror =
      event => {

        /*
         * Worker เก่า
         */
        if (
          worker !== targetWorker
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


        const error =
          new Error(
            t(
              'pdfWorker.workerError',
              {
                message
              }
            )
          );


        /*
         * เก็บข้อมูลเพิ่ม
         */
        if (
          event
        ) {

          if (
            event.filename
          ) {

            error.filename =
              event.filename;

          }


          if (
            typeof event.lineno ===
              'number'
          ) {

            error.lineno =
              event.lineno;

          }


          if (
            typeof event.colno ===
              'number'
          ) {

            error.colno =
              event.colno;

          }

        }


        handleWorkerFailure(
          targetWorker,
          error
        );

      };


    /*
     * MESSAGE ERROR
     */
    targetWorker.onmessageerror =
      () => {

        if (
          worker !== targetWorker
        ) {

          return;

        }


        handleWorkerFailure(
          targetWorker,
          new Error(
            t(
              'pdfWorker.messageError'
            )
          )
        );

      };

  }


  // ============================================================
  // CREATE WORKER
  // ============================================================

  async function createWorker() {

    if (
      !supported
    ) {

      throw new Error(
        t(
          'pdfWorker.browserNotSupported'
        )
      );

    }


    const url =
      getWorkerUrl();


    // ----------------------------------------------------------
    // FETCH WORKER SOURCE FOR VALIDATION
    // ----------------------------------------------------------

    let res;


    try {

      res =
        await fetch(
          url,
          {
            cache:
              WORKER_FETCH_CACHE
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
              getErrorMessage(
                error
              )
          }
        )
      );

    }


    if (
      !res.ok
    ) {

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


    let source;


    try {

      source =
        await res.text();

    } catch (
      error
    ) {

      throw new Error(
        t(
          'pdfWorker.loadFailed',
          {
            message:
              getErrorMessage(
                error
              )
          }
        )
      );

    }


    // ----------------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------------

    if (
      typeof source !== 'string' ||
      !source.trim()
    ) {

      throw new Error(
        t(
          'pdfWorker.invalidWorker'
        )
      );

    }


    /*
     * Worker ของระบบนี้ควรมี onmessage
     *
     * รองรับทั้ง:
     *
     * self.onmessage =
     *
     * และ
     *
     * onmessage =
     */
    const hasMessageHandler =
      /\bself\.onmessage\s*=/.test(
        source
      ) ||
      /\bonmessage\s*=/.test(
        source
      );


    if (
      !hasMessageHandler
    ) {

      throw new Error(
        t(
          'pdfWorker.invalidWorker'
        )
      );

    }


    /*
     * ----------------------------------------------------------
     * IMPORTANT
     * ----------------------------------------------------------
     *
     * ไม่ใช้ Blob URL
     *
     * เพราะถ้า pdf-worker.js ใช้:
     *
     * importScripts('./pdf-lib.min.js')
     *
     * Blob Worker อาจทำให้ relative path
     * อ้างอิงจาก blob: URL แทนตำแหน่งจริง
     *
     * ดังนั้นให้ Browser โหลด Worker
     * จาก URL จริงโดยตรง
     */
    let w =
      null;


    try {

      w =
        new Worker(
          url
        );

    } catch (
      error
    ) {

      throw new Error(
        t(
          'pdfWorker.loadFailed',
          {
            message:
              getErrorMessage(
                error
              )
          }
        )
      );

    }


    return w;

  }


  // ============================================================
  // ENSURE WORKER
  // ============================================================

  async function ensureWorker() {

    // ----------------------------------------------------------
    // WORKER READY
    // ----------------------------------------------------------

    if (
      worker
    ) {

      return worker;

    }


    // ----------------------------------------------------------
    // WORKER IS CURRENTLY CREATING
    // ----------------------------------------------------------

    if (
      workerPromise
    ) {

      return workerPromise;

    }


    /*
     * จำ generation ตอนเริ่มสร้าง
     */
    const generation =
      workerGeneration;


    let creationPromise;


    creationPromise =
      createWorker()
        .then(
          w => {

            /*
             * --------------------------------------------------
             * STALE GENERATION
             * --------------------------------------------------
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
             * ถ้ามี Worker ตัวอื่นถูกติดตั้ง
             * Worker นี้ไม่ใช่ตัวที่ต้องใช้
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


            /*
             * ผูก handlers ทันที
             */
            attachWorkerHandlers(
              w
            );


            return w;

          }
        )
        .catch(
          error => {

            /*
             * ถ้า Worker นี้ถูกติดตั้งไปแล้ว
             * แต่ creation chain fail
             * ต้อง cleanup
             *
             * เฉพาะ current worker เท่านั้น
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


    /*
     * สำคัญมาก:
     *
     * workerPromise ต้อง set ก่อน return
     */
    workerPromise =
      creationPromise;


    /*
     * Promise รุ่นเก่าห้ามล้าง Promise รุ่นใหม่
     */
    creationPromise
      .finally(
        () => {

          if (
            workerPromise ===
            creationPromise
          ) {

            workerPromise =
              null;

          }

        }
      )
      .catch(
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


    if (
      typeof type !== 'string' ||
      !type
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidRequest'
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
     * generation ตอน request เริ่ม
     */
    const requestGeneration =
      workerGeneration;


    return ensureWorker()
      .then(
        w => {

          // ----------------------------------------------------
          // GENERATION CHECK
          // ----------------------------------------------------

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


          // ----------------------------------------------------
          // WORKER CHECK
          // ----------------------------------------------------

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
               * ตรวจสอบก่อนลง pending
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


              const entry = {

                resolve,

                reject,

                worker:
                  w,

                generation:
                  requestGeneration,

                timer:
                  null

              };


              pending.set(
                reqId,
                entry
              );


              /*
               * ------------------------------------------------
               * REQUEST TIMEOUT
               * ------------------------------------------------
               */
              entry.timer =
                setTimeout(
                  () => {

                    const current =
                      pending.get(
                        reqId
                      );


                    /*
                     * Request อาจเสร็จไปแล้ว
                     */
                    if (
                      current !==
                      entry
                    ) {

                      return;

                    }


                    pending.delete(
                      reqId
                    );


                    clearRequestTimer(
                      entry
                    );


                    try {

                      reject(
                        new Error(
                          t(
                            'pdfWorker.requestTimeout'
                          )
                        )
                      );

                    } catch (
                      _
                    ) {}

                  },
                  REQUEST_TIMEOUT
                );


              /*
               * ------------------------------------------------
               * FINAL RACE CHECK
               * ------------------------------------------------
               *
               * dispose() อาจเกิดหลัง pending.set()
               * ดังนั้นต้องตรวจอีกครั้ง
               */
              if (
                requestGeneration !==
                  workerGeneration ||
                worker !== w
              ) {

                pending.delete(
                  reqId
                );


                clearRequestTimer(
                  entry
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


              /*
               * ------------------------------------------------
               * POST MESSAGE
               * ------------------------------------------------
               */
              try {

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


                clearRequestTimer(
                  entry
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
  // MERGE PDFS
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
     * ตรวจว่าทุกตัวเป็น ArrayBuffer
     */
    for (
      const buffer of buffers
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

    }


    /*
     * IMPORTANT:
     *
     * ทุก ArrayBuffer จะถูก transfer
     * และจะ detach ฝั่ง caller
     *
     * caller ไม่ควรใช้ buffer เดิมหลังจากเรียก
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


    /*
     * ตรวจ page index ให้เป็น number
     */
    for (
      const index of indices
    ) {

      if (
        !Number.isInteger(
          index
        ) ||
        index < 0
      ) {

        return Promise.reject(
          new Error(
            t(
              'pdfWorker.invalidPageList'
            )
          )
        );

      }

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


    if (
      opts === null ||
      typeof opts !== 'object' ||
      Array.isArray(opts)
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidOptions'
          )
        )
      );

    }


    const transfer = [
      buffer
    ];


    /*
     * watermarkImage ต้องเป็น ArrayBuffer
     */
    if (
      opts.watermarkImage !== undefined &&
      opts.watermarkImage !== null
    ) {

      if (
        !(opts.watermarkImage instanceof ArrayBuffer)
      ) {

        return Promise.reject(
          new Error(
            t(
              'pdfWorker.invalidWatermarkImage'
            )
          )
        );

      }


      /*
       * ป้องกัน buffer เดิมถูก transfer ซ้ำ
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


    if (
      opts !== undefined &&
      opts !== null &&
      (
        typeof opts !== 'object' ||
        Array.isArray(opts)
      )
    ) {

      return Promise.reject(
        new Error(
          t(
            'pdfWorker.invalidOptions'
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
     * INVALIDATE GENERATION
     * ----------------------------------------------------------
     *
     * ทำก่อนทุกอย่าง
     *
     * Worker / request รุ่นเก่าทั้งหมด
     * จะไม่มีสิทธิ์กลับมาใช้งาน
     */
    workerGeneration++;


    /*
     * ----------------------------------------------------------
     * INVALIDATE CREATION PROMISE
     * ----------------------------------------------------------
     *
     * สำคัญ:
     *
     * ถ้า createWorker() กำลังทำงานอยู่
     * ให้ request ใหม่สามารถสร้าง Worker generation ใหม่ได้ทันที
     *
     * Promise รุ่นเก่ายังอาจ resolve ภายหลัง
     * แต่ generation check จะทำให้มันกลายเป็น stale
     */
    workerPromise =
      null;


    /*
     * ----------------------------------------------------------
     * REJECT PENDING REQUESTS
     * ----------------------------------------------------------
     */
    rejectAllPending(
      new Error(
        t(
          'pdfWorker.stopped'
        )
      )
    );


    /*
     * ----------------------------------------------------------
     * TERMINATE CURRENT WORKER
     * ----------------------------------------------------------
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
