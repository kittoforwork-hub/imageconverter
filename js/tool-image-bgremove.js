/* global window, document, URL, JSZip, requestAnimationFrame */

(() => {
  'use strict';


  // ============================================================
  // GLOBALS
  // ============================================================

  const U =
    window.Utils;

  const I18n =
    window.I18n || null;


  // ============================================================
  // TRANSLATION HELPER
  // ============================================================

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
  // ELEMENTS
  // ============================================================

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


  // ============================================================
  // SAFETY CHECK
  // ============================================================

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


  // ============================================================
  // CONSTANTS
  // ============================================================

  const ALLOWED_IMAGE_PREFIX =
    'image/';


  const OUTPUT_FORMAT =
    'image/png';


  const OUTPUT_EXTENSION =
    'png';


  /*
   * ใช้รุ่นที่เน้นคุณภาพ
   *
   * isnet:
   * - คุณภาพสูงกว่า quantized variants
   * - ใช้ RAM / CPU มากกว่า
   */
  const MODEL =
    'isnet';


  /*
   * IMPORTANT
   *
   * ไม่กำหนด device: 'gpu'
   *
   * เพราะ WebGPU บาง environment มี backend incompatibility
   * เช่น requestAdapterInfo is not a function
   *
   * เมื่อไม่กำหนด device library จะใช้ CPU/WASM path
   */
  const DEVICE =
    null;


  /*
   * สำหรับ 1.5.5:
   *
   * proxyToWorker ไม่ได้ช่วย CPU/WASM ใน implementation
   * ตาม source ของ package
   *
   * จึงไม่บังคับให้ true
   */
  const PROXY_TO_WORKER =
    false;


  const LIB_URL =
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';


  const CONCURRENCY =
    1;


  // ============================================================
  // STATE
  // ============================================================

  let jobSeq =
    0;


  const jobs =
    [];


  /*
   * Library promise
   *
   * เก็บ module ไว้ทั้ง session เพื่อไม่ต้อง import ซ้ำ
   */
  let libraryPromise =
    null;


  let removeBackgroundFn =
    null;


  /*
   * จำนวน jobs ที่กำลังใช้ library
   */
  let activeLibraryUsers =
    0;


  // ============================================================
  // FILE KEY
  // ============================================================

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


  // ============================================================
  // LIBRARY ERROR CODE
  // ============================================================

  const ERROR_CODES = {

    FUNCTION_NOT_FOUND:
      'BACKGROUND_FUNCTION_NOT_FOUND',

    EMPTY_RESULT:
      'BACKGROUND_EMPTY_RESULT',

    LIBRARY_LOAD_FAILED:
      'BACKGROUND_LIBRARY_LOAD_FAILED',

    MODEL_LOAD_FAILED:
      'BACKGROUND_MODEL_LOAD_FAILED',

    PROCESSING_FAILED:
      'BACKGROUND_PROCESSING_FAILED'

  };


  // ============================================================
  // LOAD LIBRARY
  // ============================================================

  async function loadLibrary() {

    if (
      removeBackgroundFn
    ) {

      return removeBackgroundFn;

    }


    if (
      libraryPromise
    ) {

      return libraryPromise;

    }


    libraryPromise =
      import(
        /* webpackIgnore: true */
        LIB_URL
      )
        .then(
          module => {

            if (
              !module ||
              typeof module.removeBackground !==
                'function'
            ) {

              throw new Error(
                ERROR_CODES.FUNCTION_NOT_FOUND
              );

            }


            removeBackgroundFn =
              module.removeBackground;


            return removeBackgroundFn;

          }
        )
        .catch(
          error => {

            removeBackgroundFn =
              null;


            libraryPromise =
              null;


            console.error(
              '[Image Background Removal] Library load failed:',
              error
            );


            throw new Error(
              ERROR_CODES.LIBRARY_LOAD_FAILED
            );

          }
        );


    return libraryPromise;

  }


  // ============================================================
  // ACQUIRE LIBRARY
  // ============================================================

  async function acquireLibrary() {

    const fn =
      await loadLibrary();


    activeLibraryUsers++;


    return fn;

  }


  // ============================================================
  // RELEASE LIBRARY USER
  // ============================================================

  function releaseLibraryUser() {

    activeLibraryUsers =
      Math.max(
        0,
        activeLibraryUsers -
          1
      );

  }


  // ============================================================
  // RELEASE LIBRARY REFERENCE
  // ============================================================

  function releaseLibraryReference(
    force = false
  ) {

    if (
      !force &&
      activeLibraryUsers >
        0
    ) {

      return;

    }


    /*
     * ไม่ต้องรีบ clear cache
     *
     * model / module cache ใน browser
     * ช่วยให้ไฟล์ถัดไปทำงานเร็วขึ้น
     */
  }


  // ============================================================
  // SAFE UI YIELD
  // ============================================================

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
      resolve =>
        requestAnimationFrame(
          resolve
        )
    );

  }


  // ============================================================
  // ERROR → I18N KEY
  // ============================================================

  function getErrorKey(
    error
  ) {

    const code =
      error &&
      typeof error.message ===
        'string'
        ? error.message
        : '';


    switch (
      code
    ) {

      case ERROR_CODES.FUNCTION_NOT_FOUND:

        return 'errors.backgroundFunctionNotFound';


      case ERROR_CODES.LIBRARY_LOAD_FAILED:

        return 'errors.backgroundLibraryLoadFailed';


      case ERROR_CODES.EMPTY_RESULT:

      case ERROR_CODES.MODEL_LOAD_FAILED:

      case ERROR_CODES.PROCESSING_FAILED:

      default:

        return 'image.backgroundRemovalFailed';

    }

  }


  // ============================================================
  // JOB
  // ============================================================

  class BgJob {

    constructor(
      file
    ) {

      this.id =
        'bg-' +
        (++jobSeq);


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


      this.el =
        jobTemplate
          .content
          .firstElementChild
          .cloneNode(
            true
          );


      this.buildDom();

    }


    // ========================================================
    // BUILD DOM
    // ========================================================

    buildDom() {

      const el =
        this.el;


      // ------------------------------------------------------
      // Object URL
      // ------------------------------------------------------

      this.objectUrl =
        URL.createObjectURL(
          this.file
        );


      // ------------------------------------------------------
      // Elements
      // ------------------------------------------------------

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


      const originalDimEl =
        el.querySelector(
          '.js-origdim'
        );


      // ------------------------------------------------------
      // Validate required elements
      // ------------------------------------------------------

      if (
        !this.beforeImg ||
        !this.processBtn
      ) {

        this.disposed =
          true;


        this.revokeObjectUrl();


        return;

      }


      // ------------------------------------------------------
      // File information
      // ------------------------------------------------------

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
        originalDimEl
      ) {

        originalDimEl.textContent =
          t(
            'image.reading'
          );

      }


      // ------------------------------------------------------
      // Processing state
      // ------------------------------------------------------

      el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Before image
      // ------------------------------------------------------

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
            originalDimEl
          ) {

            originalDimEl.textContent =
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
            originalDimEl
          ) {

            originalDimEl.textContent =
              t(
                'image.readFailed'
              );

          }

        };


      // ------------------------------------------------------
      // Process button
      // ------------------------------------------------------

      this.processBtn.addEventListener(
        'click',
        () => {

          this.process();

        }
      );


      // ------------------------------------------------------
      // Remove job
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // Initial language state
      // ------------------------------------------------------

      this.updateLanguageUI();

    }


    // ========================================================
    // LANGUAGE UI
    // ========================================================

    updateLanguageUI() {

      if (
        this.disposed ||
        !this.statusEl
      ) {

        return;

      }


      /*
       * Processing
       *
       * Progress callback controls text
       */
      if (
        this.isProcessing
      ) {

        return;

      }


      /*
       * Result
       */
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


      /*
       * Error
       */
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


      /*
       * Waiting
       */
      this.statusEl.textContent =
        t(
          'image.waitingBackground'
        );


      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );

    }


    // ========================================================
    // SET ERROR
    // ========================================================

    setError(
      key,
      params = null
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


    // ========================================================
    // PROGRESS
    // ========================================================

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


      this.progressFill.style.width =
        `${value}%`;

    }


    // ========================================================
    // PROGRESS TEXT
    // ========================================================

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


      /*
       * Handle common model/network loading phases
       */
      const isLoading =
        raw.includes(
          'fetch'
        ) ||
        raw.includes(
          'load'
        ) ||
        raw.includes(
          'download'
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


    // ========================================================
    // PROCESS
    // ========================================================

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


      /*
       * ------------------------------------------------------
       * Reset previous error
       * ------------------------------------------------------
       */

      this.hasError =
        false;


      this.errorKey =
        null;


      this.errorParams =
        null;


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


      let acquired =
        false;


      try {

        // ----------------------------------------------------
        // Load function
        // ----------------------------------------------------

        const removeBackground =
          await acquireLibrary();


        acquired =
          true;


        if (
          this.disposed
        ) {

          return;

        }


        // ----------------------------------------------------
        // Configuration
        // ----------------------------------------------------

        const config = {

          debug:
            false,

          /*
           * For the CPU/WASM-safe path
           * do not request WebGPU
           */
          model:
            MODEL,

          output: {

            format:
              OUTPUT_FORMAT,

            quality:
              1,

            type:
              'foreground'

          },

          /*
           * 1.5.5 supports this option,
           * but proxying is not useful for the CPU/WASM path.
           */
          proxyToWorker:
            PROXY_TO_WORKER,

          progress:
            (
              key,
              current,
              total
            ) => {

              if (
                this.disposed ||
                !this.isProcessing
              ) {

                return;

              }


              const currentNumber =
                Number(
                  current
                );


              const totalNumber =
                Number(
                  total
                );


              if (
                !Number.isFinite(
                  currentNumber
                ) ||
                !Number.isFinite(
                  totalNumber
                ) ||
                totalNumber <=
                  0
              ) {

                return;

              }


              const pct =
                Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      (
                        currentNumber /
                        totalNumber
                      ) *
                      100
                    )
                  )
                );


              this.setProgress(
                pct
              );


              this.setProgressText(
                key,
                pct
              );

            }

        };


        /*
         * Do not send `device: 'gpu'`
         *
         * The library's config accepts cpu/gpu,
         * but forcing GPU causes the exact WebGPU
         * backend failure seen in the console.
         */
        if (
          DEVICE
        ) {

          config.device =
            DEVICE;

        }


        // ----------------------------------------------------
        // AI inference
        // ----------------------------------------------------

        const blob =
          await removeBackground(
            this.file,
            config
          );


        // ----------------------------------------------------
        // Removed while processing
        // ----------------------------------------------------

        if (
          this.disposed
        ) {

          return;

        }


        // ----------------------------------------------------
        // Validate output
        // ----------------------------------------------------

        if (
          !blob
        ) {

          throw new Error(
            ERROR_CODES.EMPTY_RESULT
          );

        }


        if (
          typeof blob.size ===
            'number' &&
          blob.size <=
            0
        ) {

          throw new Error(
            ERROR_CODES.EMPTY_RESULT
          );

        }


        // ----------------------------------------------------
        // Previous result
        // ----------------------------------------------------

        if (
          this.resultUrl
        ) {

          revokeUrl(
            this.resultUrl
          );


          this.resultUrl =
            null;

        }


        // ----------------------------------------------------
        // Store result
        // ----------------------------------------------------

        this.resultBlob =
          blob;


        this.resultUrl =
          URL.createObjectURL(
            blob
          );


        // ----------------------------------------------------
        // Preview
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Download
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Success
        // ----------------------------------------------------

        this.setProgress(
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
        err
      ) {

        console.error(
          '[Image Background Removal] Error:',
          err
        );


        if (
          this.disposed
        ) {

          return;

        }


        const errorKey =
          getErrorKey(
            err
          );


        this.setError(
          errorKey
        );


        this.setProgress(
          0
        );


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

      } finally {

        if (
          acquired
        ) {

          releaseLibraryUser();


          acquired =
            false;

        }


        this.isProcessing =
          false;


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


    // ========================================================
    // REVOKE SOURCE
    // ========================================================

    revokeObjectUrl() {

      if (
        !this.objectUrl
      ) {

        return;

      }


      revokeUrl(
        this.objectUrl
      );


      this.objectUrl =
        null;

    }


    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {

      if (
        this.disposed
      ) {

        return;

      }


      /*
       * This flag invalidates every async continuation
       */
      this.disposed =
        true;


      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Source URL
      // ------------------------------------------------------

      this.revokeObjectUrl();


      // ------------------------------------------------------
      // Result URL
      // ------------------------------------------------------

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


  // ============================================================
  // REVOKE URL
  // ============================================================

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


  // ============================================================
  // BULK UI
  // ============================================================

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


    /*
     * ไม่ทับ progress message
     */
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


  // ============================================================
  // ADD FILES
  // ============================================================

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


  // ============================================================
  // CLEAR ALL
  // ============================================================

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


      /*
       * Do not force-clear the module while
       * an inference is still running.
       */
      if (
        activeLibraryUsers ===
          0
      ) {

        releaseLibraryReference();

      }


      updateBulkUI();

    }
  );


  // ============================================================
  // PROCESS ALL
  // ============================================================

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


      processAllBtn.textContent =
        t(
          'image.removeBackgroundAllProcessing'
        );


      try {

        /*
         * Sequential processing intentionally.
         *
         * ISNet uses considerably more resources
         * than normal canvas-based image tools.
         *
         * This prevents multiple AI inference jobs
         * from competing for RAM at once.
         */
        for (
          const job of
          queue
        ) {

          if (
            !job ||
            job.disposed ||
            job.resultBlob
          ) {

            continue;

          }


          await job.process();


          await yieldToUI();

        }

      } finally {

        releaseLibraryReference(
          false
        );


        processAllBtn.disabled =
          false;


        processAllBtn.textContent =
          t(
            'image.removeBackgroundAll'
          );


        updateBulkUI();

      }

    }
  );


  // ============================================================
  // DOWNLOAD ZIP
  // ============================================================

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

              /*
               * PNG files are already compressed.
               *
               * STORE avoids wasting CPU trying to
               * compress PNG data again inside the ZIP.
               */
              compression:
                'STORE'
            }
          );


        U.downloadBlob(
          content,
          'no-background.zip'
        );

      } catch (
        err
      ) {

        console.error(
          '[Image Background Removal] ZIP failed:',
          err
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


  // ============================================================
  // DROPZONE
  // ============================================================

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


  // ============================================================
  // CLEAR CACHE
  // ============================================================

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


        if (
          activeLibraryUsers ===
            0
        ) {

          releaseLibraryReference(
            true
          );

        }


        updateBulkUI();

      }
    );

  }


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

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


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateBulkUI();

})();
