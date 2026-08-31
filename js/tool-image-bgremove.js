/* global window, document, URL, JSZip */

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
  // STATE
  // ============================================================

  let jobSeq =
    0;


  const jobs =
    [];


  // ============================================================
  // AI LIBRARY
  // ============================================================

  /*
   * ใช้ version เดิมของโปรเจกต์
   * เพื่อไม่ให้ behavior เปลี่ยนโดยไม่ตั้งใจ
   */
  const LIB_URL =
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';


  let removeBackgroundFn =
    null;


  let libPromise =
    null;


  /*
   * นับจำนวน job ที่กำลังใช้งาน library
   * ป้องกัน release reference ระหว่าง inference
   */
  let activeLibraryUsers =
    0;


  // ============================================================
  // AI CONFIGURATION
  // ============================================================

  /*
   * เน้นคุณภาพ
   *
   * isnet:
   * - คุณภาพสูงกว่า quantized model
   * - ใช้ทรัพยากรมากกว่า
   *
   * device:
   * - gpu ช่วยให้ browser ที่รองรับ WebGPU ทำงานเร็วขึ้น
   * - library สามารถใช้ execution device ตาม config
   *
   * proxyToWorker:
   * - ช่วยไม่ให้ inference หนักบน main thread
   */
  const AI_CONFIG = {

    debug:
      false,

    proxyToWorker:
      true,

    device:
      'gpu',

    model:
      'isnet',

    output: {

      format:
        'image/png',

      type:
        'foreground',

      quality:
        1

    }

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
      !libPromise
    ) {

      libPromise =
        import(
          /* webpackIgnore: true */
          LIB_URL
        )
          .then(
            mod => {

              if (
                !mod ||
                typeof mod.removeBackground !==
                  'function'
              ) {

                throw new Error(
                  'BACKGROUND_FUNCTION_NOT_FOUND'
                );

              }


              removeBackgroundFn =
                mod.removeBackground;


              return removeBackgroundFn;

            }
          )
          .catch(
            error => {

              removeBackgroundFn =
                null;


              libPromise =
                null;


              throw error;

            }
          );

    }


    return libPromise;

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
  // RELEASE ONE LIBRARY USER
  // ============================================================

  function releaseLibraryUser() {

    activeLibraryUsers =
      Math.max(
        0,
        activeLibraryUsers -
          1
      );


    /*
     * อย่า clear function ทันที
     * เพราะ job อื่นอาจยังใช้งานอยู่
     *
     * การ cache function ไว้ยังมีประโยชน์มาก
     * เพราะ model assets ถูก cache ใน browser
     */
  }


  // ============================================================
  // RELEASE LIBRARY
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


    removeBackgroundFn =
      null;


    libPromise =
      null;

  }


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
      // Source URL
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


      // ------------------------------------------------------
      // Basic validation
      // ------------------------------------------------------

      if (
        !this.beforeImg ||
        !this.processBtn
      ) {

        this.disposed =
          true;


        this.revokeSource();


        return;

      }


      // ------------------------------------------------------
      // File info
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


          const originalDimEl =
            el.querySelector(
              '.js-origdim'
            );


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

        };


      // ------------------------------------------------------
      // Process
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
      // Initial UI
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
       * progress callback owns the dynamic message
       */
      if (
        this.isProcessing
      ) {

        return;

      }


      /*
       * Success
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
    // ERROR
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
        value +
        '%';

    }


    // ========================================================
    // PROGRESS TEXT
    // ========================================================

    updateProgressText(
      key,
      pct
    ) {

      if (
        this.disposed ||
        !this.statusEl
      ) {

        return;

      }


      const keyText =
        typeof key ===
          'string'
          ? key.toLowerCase()
          : '';


      /*
       * library progress keys มักอยู่ในรูป
       * fetch / load / compute / decode / inference / mask
       */
      const loadingModel =
        keyText.includes(
          'fetch'
        ) ||
        keyText.includes(
          'load'
        );


      this.statusEl.textContent =
        t(
          loadingModel
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
       * Reset old error
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


      let libraryAcquired =
        false;


      try {

        // ----------------------------------------------------
        // Acquire AI library
        // ----------------------------------------------------

        const removeBackground =
          await acquireLibrary();


        libraryAcquired =
          true;


        if (
          this.disposed
        ) {

          return;

        }


        this.setProgress(
          4
        );


        if (
          this.statusEl
        ) {

          this.statusEl.textContent =
            t(
              'image.loadingModelProgress',
              {
                percent:
                  4
              }
            );

        }


        // ----------------------------------------------------
        // Run background removal
        // ----------------------------------------------------

        const blob =
          await removeBackground(
            this.file,
            {

              ...AI_CONFIG,

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


                  this.updateProgressText(
                    key,
                    pct
                  );

                }

            }
          );


        // ----------------------------------------------------
        // Job may have been removed while inference ran
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Previous result URL
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
            )}-nobg.png`;


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
          '[Image Background Removal]',
          err
        );


        if (
          this.disposed
        ) {

          return;

        }


        /*
         * อย่าเก็บ err.message ที่อาจเป็นภาษา
         * หรือข้อความจาก library โดยตรง
         *
         * เก็บ translation key แทน
         */
        let key =
          'image.backgroundRemovalFailed';


        const code =
          err &&
          typeof err.message ===
            'string'
            ? err.message
            : '';


        if (
          code ===
          'BACKGROUND_FUNCTION_NOT_FOUND'
        ) {

          key =
            'errors.backgroundFunctionNotFound';

        } else if (
          code ===
          'BACKGROUND_EMPTY_RESULT'
        ) {

          key =
            'image.backgroundRemovalFailed';

        } else if (
          code
            .toLowerCase()
            .includes(
              'out of memory'
            )
        ) {

          key =
            'image.backgroundRemovalFailed';

        }


        this.setError(
          key
        );


        this.setProgress(
          0
        );

      } finally {

        if (
          libraryAcquired
        ) {

          releaseLibraryUser();

          libraryAcquired =
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


        if (
          U &&
          typeof U.yieldToUI ===
            'function'
        ) {

          await U.yieldToUI();

        } else {

          await new Promise(
            resolve =>
              requestAnimationFrame(
                resolve
              )
          );

        }

      }

    }


    // ========================================================
    // REVOKE SOURCE
    // ========================================================

    revokeSource() {

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
       * สำคัญที่สุด:
       * ป้องกัน async inference ที่กลับมาเขียน
       * result ลง job ที่ถูกลบไปแล้ว
       */
      this.disposed =
        true;


      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';


      this.revokeSource();


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
     * ไม่เรียก updateLanguageUI
     * ตอนมี processing
     * เพื่อไม่ไปทับข้อความ progress
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
            'image/'
          )
      )
      .forEach(
        file => {

          /*
           * กัน duplicate file
           */
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
       * force release เฉพาะกรณีไม่มี jobs ใช้งานแล้ว
       */
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
         * Intentional sequential processing
         *
         * Background removal ใช้ model + memory สูง
         * การทำทีละรูปช่วยลด peak memory
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


          if (
            U &&
            typeof U.yieldToUI ===
              'function'
          ) {

            await U.yieldToUI();

          } else {

            await new Promise(
              resolve =>
                requestAnimationFrame(
                  resolve
                )
            );

          }

        }

      } finally {

        if (
          activeLibraryUsers ===
            0
        ) {

          releaseLibraryReference(
            true
          );

        }


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


            let name =
              `${base}-nobg.png`;


            let n =
              2;


            while (
              usedNames.has(
                name
              )
            ) {

              name =
                `${base}-nobg-${n++}.png`;

            }


            usedNames.add(
              name
            );


            zip.file(
              name,
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

      /*
       * Bulk buttons
       */

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


      /*
       * Job statuses
       */
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
