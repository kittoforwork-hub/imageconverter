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

  const LIB_URL =
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';


  let removeBackgroundFn =
    null;

  let libPromise =
    null;


  // ============================================================
  // LOAD LIBRARY
  // ============================================================

  async function loadLibrary() {

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
                  t(
                    'errors.backgroundFunctionNotFound'
                  )
                );

              }


              removeBackgroundFn =
                mod.removeBackground;


              return removeBackgroundFn;

            }
          )
          .catch(
            err => {

              removeBackgroundFn =
                null;

              libPromise =
                null;


              throw new Error(
                t(
                  'errors.backgroundLibraryLoadFailed',
                  {
                    message:
                      err?.message ||
                      String(
                        err
                      )
                  }
                )
              );

            }
          );
    }


    return libPromise;
  }


  // ============================================================
  // RELEASE LIBRARY REFERENCE
  // ============================================================

  function releaseLibraryReference() {

    removeBackgroundFn =
      null;

    libPromise =
      null;
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


      this.isProcessing =
        false;


      this.objectUrl =
        null;


      /*
       * เก็บ key/params ของ error ล่าสุดไว้
       * เพื่อให้แปลภาษาใหม่ได้ตอน languagechange
       */
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


      this.objectUrl =
        URL.createObjectURL(
          this.file
        );


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


      if (
        filenameEl
      ) {

        filenameEl.textContent =
          this.file.name;

      }


      if (
        sizeEl
      ) {

        sizeEl.textContent =
          U.formatBytes(
            this.file.size
          );

      }


      this.beforeImg.src =
        this.objectUrl;


      // ------------------------------------------------------
      // Processing state
      // ------------------------------------------------------

      el.dataset.processing =
        'false';


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
              idx >= 0
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
        !this.statusEl
      ) {

        return;

      }


      /*
       * ตอนกำลัง process
       * progress callback จะเป็นคนกำหนดข้อความ
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
       * แปล error เดิมใหม่ด้วย key/params ที่เก็บไว้
       */
      if (
        this.statusEl.classList.contains(
          'is-error'
        )
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
        'is-ready'
      );
    }


    // ========================================================
    // PROGRESS
    // ========================================================

    setProgress(
      pct
    ) {

      if (
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
    // PROCESS
    // ========================================================

    async process() {

      if (
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


      this.isProcessing =
        true;


      this.el.dataset.processing =
        'true';


      this.processBtn.disabled =
        true;


      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );


      this.statusEl.textContent =
        t(
          'image.preparingModel'
        );


      this.setProgress(
        0
      );


      try {

        const removeBackground =
          await loadLibrary();


        const blob =
          await removeBackground(
            this.file,
            {

              proxyToWorker:
                true,

              output: {
                format:
                  'image/png'
              },

              progress: (
                key,
                current,
                total
              ) => {

                if (
                  !total
                ) {

                  return;

                }


                const pct =
                  Math.round(
                    (
                      current /
                      total
                    ) *
                    100
                  );


                this.setProgress(
                  pct
                );


                const keyText =
                  typeof key ===
                    'string'
                    ? key.toLowerCase()
                    : '';


                const downloading =
                  keyText.includes(
                    'fetch'
                  ) ||
                  keyText.includes(
                    'load'
                  );


                this.statusEl.textContent =
                  t(
                    downloading
                      ? 'image.loadingModelProgress'
                      : 'image.removingBackgroundProgress',
                    {
                      percent:
                        pct
                    }
                  );
              }
            }
          );


        // ----------------------------------------------------
        // Previous URL
        // ----------------------------------------------------

        if (
          this.resultUrl
        ) {

          try {

            URL.revokeObjectURL(
              this.resultUrl
            );

          } catch (_) {}


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


        this.afterImg.src =
          this.resultUrl;


        this.afterWrap.classList.remove(
          'hidden'
        );


        this.downloadBtn.href =
          this.resultUrl;


        this.downloadBtn.download =
          `${U.baseName(
            this.file.name
          )}-nobg.png`;


        this.downloadBtn.classList.remove(
          'hidden'
        );


        this.setProgress(
          100
        );


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


      } catch (
        err
      ) {

        console.error(
          'Background removal error:',
          err
        );


        this.errorKey =
          'image.backgroundRemovalFailed';

        this.errorParams =
          {
            message:
              err?.message ||
              String(
                err
              )
          };


        this.statusEl.textContent =
          t(
            this.errorKey,
            this.errorParams
          );


        this.statusEl.classList.remove(
          'is-ready'
        );


        this.statusEl.classList.add(
          'is-error'
        );


        this.setProgress(
          0
        );

      } finally {

        this.isProcessing =
          false;


        this.el.dataset.processing =
          'false';


        this.processBtn.disabled =
          false;


        releaseLibraryReference();


        await U.yieldToUI();
      }
    }


    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {

      this.isProcessing =
        false;


      if (
        this.el
      ) {

        this.el.dataset.processing =
          'false';

      }


      if (
        this.objectUrl
      ) {

        try {

          URL.revokeObjectURL(
            this.objectUrl
          );

        } catch (_) {}


        this.objectUrl =
          null;
      }


      if (
        this.resultUrl
      ) {

        try {

          URL.revokeObjectURL(
            this.resultUrl
          );

        } catch (_) {}


        this.resultUrl =
          null;
      }


      this.resultBlob =
        null;
    }

  }


  // ============================================================
  // BULK UI
  // ============================================================

  function updateBulkUI() {

    countEl.textContent =
      String(
        jobs.length
      );


    bulkbar.classList.toggle(
      'hidden',
      jobs.length === 0
    );


    downloadZipBtn.classList.toggle(
      'hidden',
      !jobs.some(
        job =>
          !!job.resultBlob
      )
    );


    jobs.forEach(
      job => {

        job.updateLanguageUI();

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
      fileList
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

          const job =
            new BgJob(
              file
            );


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

          job.dispose();

        }
      );


      jobs.length =
        0;


      jobsEl.innerHTML =
        '';


      releaseLibraryReference();


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
        !jobs.length
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
         * ประมวลผลทีละรูป
         * เพื่อควบคุม RAM
         */

        for (
          const job of
          jobs
        ) {

          if (
            job.resultBlob
          ) {

            continue;

          }


          await job.process();


          await U.yieldToUI();

        }

      } finally {

        releaseLibraryReference();


        await U.yieldToUI();


        processAllBtn.disabled =
          false;


        processAllBtn.textContent =
          t(
            'image.removeBackgroundAll'
          );


        downloadZipBtn.classList.toggle(
          'hidden',
          !jobs.some(
            job =>
              !!job.resultBlob
          )
        );

      }
    }
  );


  // ============================================================
  // DOWNLOAD ZIP
  // ============================================================

  downloadZipBtn.addEventListener(
    'click',
    async () => {

      const ready =
        jobs.filter(
          job =>
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

        const zip =
          new JSZip();


        const usedNames =
          new Set();


        ready.forEach(
          job => {

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
                'blob'
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
          'Background removal ZIP failed:',
          err
        );


      } finally {

        downloadZipBtn.disabled =
          false;


        downloadZipBtn.textContent =
          t(
            'image.downloadZip'
          );

      }
    }
  );


  // ============================================================
  // DROPZONE
  // ============================================================

  U.setupDropzone(
    dropzone,
    fileInput,
    addFiles
  );


  // ============================================================
  // CLEAR CACHE
  // ============================================================

  U.onClearCache(
    () => {

      jobs.forEach(
        job => {

          job.dispose();

        }
      );


      jobs.length =
        0;


      jobsEl.innerHTML =
        '';


      releaseLibraryReference();


      updateBulkUI();

    }
  );


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

          job.updateLanguageUI();

        }
      );

    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateBulkUI();

})();
