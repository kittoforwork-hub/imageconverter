/* global window, document, URL, JSZip */

/*
 * ============================================================
 * IMAGE BACKGROUND REMOVAL
 * ============================================================
 *
 * Single-file implementation.
 *
 * No transformer.js required.
 * No index.html changes required.
 *
 * Architecture:
 *
 * Main Thread
 *   ├─ UI
 *   ├─ Preview
 *   ├─ Queue
 *   └─ ZIP
 *
 * Web Worker
 *   ├─ Image decode
 *   ├─ Resize
 *   ├─ @imgly/background-removal
 *   ├─ WebGPU
 *   └─ CPU/WASM fallback
 *
 * ============================================================
 */

(() => {
  'use strict';

  // ============================================================
  // GLOBALS
  // ============================================================

  const U = window.Utils;
  const I18n = window.I18n || null;

  // ============================================================
  // TRANSLATION
  // ============================================================

  function t(key, values) {
    if (
      I18n &&
      typeof I18n.t === 'function'
    ) {
      return I18n.t(key, values);
    }

    return String(key);
  }

  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone =
    document.getElementById('dz-img-bgremove');

  const fileInput =
    document.getElementById('input-img-bgremove');

  const bulkbar =
    document.getElementById('bulk-img-bgremove');

  const countEl =
    document.getElementById('count-img-bgremove');

  const clearAllBtn =
    document.getElementById('clearAll-img-bgremove');

  const processAllBtn =
    document.getElementById('processAll-img-bgremove');

  const downloadZipBtn =
    document.getElementById('downloadZip-img-bgremove');

  const jobsEl =
    document.getElementById('jobs-img-bgremove');

  const jobTemplate =
    document.getElementById('tpl-img-bgremove');

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

  const LIB_VERSION = '1.7.0';

  const LIB_URL =
    `https://cdn.jsdelivr.net/npm/@imgly/background-removal@${LIB_VERSION}/+esm`;

  /*
   * Full precision model.
   *
   * This is intentionally kept as "isnet" because the previous
   * implementation already identified unstable/incorrect results
   * with isnet_fp16 for some inputs.
   */
  const MODEL = 'isnet';

  const OUTPUT_FORMAT = 'image/png';
  const OUTPUT_EXTENSION = 'png';

  /*
   * Browser should attempt WebGPU first.
   */
  const PREFER_GPU = true;

  /*
   * Much safer than sending 3000-6000px camera images directly
   * into the segmentation model.
   *
   * Resize happens inside Worker, not the main thread.
   */
  const MAX_INPUT_DIMENSION = 1536;

  /*
   * Quality of the temporary worker resize.
   */
  const RESIZE_OUTPUT_QUALITY = 0.92;

  const ALLOWED_IMAGE_PREFIX = 'image/';

  /*
   * Worker inactivity cleanup.
   *
   * Worker itself stays alive between jobs so model initialization
   * does not happen again for every image.
   */
  const WORKER_IDLE_TIMEOUT = 5 * 60 * 1000;

  // ============================================================
  // STATE
  // ============================================================

  let jobSeq = 0;

  const jobs = [];

  let worker = null;
  let workerBlobUrl = null;
  let workerGeneration = 0;

  let workerRequestSeq = 0;

  const pendingWorkerRequests =
    new Map();

  let workerIdleTimer = null;

  let gpuKnownBad = false;

  // ============================================================
  // SAFE YIELD
  // ============================================================

  async function yieldToUI() {
    if (
      U &&
      typeof U.yieldToUI === 'function'
    ) {
      await U.yieldToUI();
      return;
    }

    await new Promise(resolve => {
      if (
        typeof requestAnimationFrame ===
        'function'
      ) {
        requestAnimationFrame(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  // ============================================================
  // URL
  // ============================================================

  function revokeUrl(url) {
    if (!url) {
      return;
    }

    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  }

  // ============================================================
  // FILE KEY
  // ============================================================

  function getFileKey(file) {
    if (!file) {
      return '';
    }

    return [
      file.name,
      file.size,
      file.lastModified,
      file.type
    ].join('|');
  }

  function hasDuplicateFile(file) {
    const key =
      getFileKey(file);

    return jobs.some(job =>
      job &&
      !job.disposed &&
      getFileKey(job.file) === key
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  function getErrorKey(error) {
    const code =
      error &&
      typeof error.message === 'string'
        ? error.message
        : '';

    if (
      code ===
      'BACKGROUND_FUNCTION_NOT_FOUND'
    ) {
      return 'errors.backgroundFunctionNotFound';
    }

    if (
      code ===
      'BACKGROUND_LIBRARY_LOAD_FAILED'
    ) {
      return 'errors.backgroundLibraryLoadFailed';
    }

    if (
      code ===
      'BACKGROUND_EMPTY_RESULT'
    ) {
      return 'image.backgroundRemovalFailed';
    }

    return 'image.backgroundRemovalFailed';
  }

  // ============================================================
  // WORKER SCRIPT
  // ============================================================

  function createWorkerSource() {
    return `
      'use strict';

      const LIB_URL =
        ${JSON.stringify(LIB_URL)};

      const MODEL =
        ${JSON.stringify(MODEL)};

      const OUTPUT_FORMAT =
        ${JSON.stringify(OUTPUT_FORMAT)};

      const MAX_INPUT_DIMENSION =
        ${MAX_INPUT_DIMENSION};

      const RESIZE_OUTPUT_QUALITY =
        ${RESIZE_OUTPUT_QUALITY};

      let removeBackgroundFn = null;

      let libraryPromise = null;

      let currentJobId = null;

      let cancelledJobs = new Set();

      function post(type, payload = {}) {
        self.postMessage({
          type,
          ...payload
        });
      }

      function isCancelled(jobId) {
        return (
          !jobId ||
          cancelledJobs.has(jobId)
        );
      }

      function cancelJob(jobId) {
        if (!jobId) {
          return;
        }

        cancelledJobs.add(jobId);
      }

      async function loadLibrary() {
        if (removeBackgroundFn) {
          return removeBackgroundFn;
        }

        if (libraryPromise) {
          return libraryPromise;
        }

        libraryPromise =
          import(LIB_URL)
            .then(module => {

              const fn =
                module &&
                typeof module.removeBackground ===
                  'function'
                  ? module.removeBackground
                  : module &&
                    typeof module.default ===
                      'function'
                    ? module.default
                    : null;

              if (
                typeof fn !==
                'function'
              ) {
                throw new Error(
                  'BACKGROUND_FUNCTION_NOT_FOUND'
                );
              }

              removeBackgroundFn = fn;

              return fn;
            })
            .catch(error => {

              console.error(
                '[BG Worker] Library load failed:',
                error
              );

              removeBackgroundFn = null;
              libraryPromise = null;

              throw new Error(
                'BACKGROUND_LIBRARY_LOAD_FAILED'
              );
            });

        return libraryPromise;
      }

      function supportsWebGPU() {
        return (
          typeof navigator !== 'undefined' &&
          !!navigator.gpu &&
          typeof navigator.gpu.requestAdapter ===
            'function'
        );
      }

      async function probeWebGPU() {
        if (!supportsWebGPU()) {
          return false;
        }

        try {
          const adapter =
            await navigator.gpu.requestAdapter();

          return !!adapter;
        } catch (error) {

          console.warn(
            '[BG Worker] WebGPU probe failed:',
            error
          );

          return false;
        }
      }

      async function resizeIfNeeded(file, jobId) {

        if (isCancelled(jobId)) {
          throw new Error(
            'BACKGROUND_CANCELLED'
          );
        }

        /*
         * Workers normally expose createImageBitmap.
         * If unsupported, return the original file.
         */
        if (
          typeof createImageBitmap !==
          'function'
        ) {
          return file;
        }

        if (
          typeof OffscreenCanvas ===
          'undefined'
        ) {
          return file;
        }

        let bitmap = null;

        try {

          bitmap =
            await createImageBitmap(file);

          if (
            isCancelled(jobId)
          ) {
            return file;
          }

          const width =
            bitmap.width;

          const height =
            bitmap.height;

          const longSide =
            Math.max(
              width,
              height
            );

          if (
            !width ||
            !height ||
            longSide <=
              MAX_INPUT_DIMENSION
          ) {
            return file;
          }

          const scale =
            MAX_INPUT_DIMENSION /
            longSide;

          const targetWidth =
            Math.max(
              1,
              Math.round(
                width * scale
              )
            );

          const targetHeight =
            Math.max(
              1,
              Math.round(
                height * scale
              )
            );

          const canvas =
            new OffscreenCanvas(
              targetWidth,
              targetHeight
            );

          const ctx =
            canvas.getContext(
              '2d',
              {
                alpha: true
              }
            );

          if (!ctx) {
            return file;
          }

          ctx.imageSmoothingEnabled = true;

          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            bitmap,
            0,
            0,
            targetWidth,
            targetHeight
          );

          /*
           * Preserve PNG if source is PNG.
           * JPEG is used for other formats because it keeps the
           * temporary inference input substantially smaller.
           */
          const type =
            file.type === 'image/png'
              ? 'image/png'
              : 'image/jpeg';

          const blob =
            await canvas.convertToBlob({
              type,
              quality:
                RESIZE_OUTPUT_QUALITY
            });

          if (!blob) {
            return file;
          }

          return new File(
            [blob],
            file.name,
            {
              type,
              lastModified:
                file.lastModified
            }
          );

        } catch (error) {

          console.warn(
            '[BG Worker] Resize skipped:',
            error
          );

          return file;

        } finally {

          if (bitmap) {
            try {
              bitmap.close();
            } catch (_) {}
          }
        }
      }

      async function runRemoval(
        file,
        jobId
      ) {

        if (isCancelled(jobId)) {
          throw new Error(
            'BACKGROUND_CANCELLED'
          );
        }

        const removeBackground =
          await loadLibrary();

        if (isCancelled(jobId)) {
          throw new Error(
            'BACKGROUND_CANCELLED'
          );
        }

        post('progress', {
          jobId,
          key: 'prepare',
          current: 0,
          total: 100
        });

        const inputFile =
          await resizeIfNeeded(
            file,
            jobId
          );

        if (isCancelled(jobId)) {
          throw new Error(
            'BACKGROUND_CANCELLED'
          );
        }

        /*
         * ----------------------------------------
         * GPU
         * ----------------------------------------
         */

        let blob = null;

        if (
          !isCancelled(jobId) &&
          !self.__GPU_BAD__ &&
          await probeWebGPU()
        ) {

          try {

            post('mode', {
              jobId,
              mode: 'gpu'
            });

            const gpuConfig = {

              debug: false,

              model: MODEL,

              device: 'gpu',

              output: {
                format:
                  OUTPUT_FORMAT,

                type:
                  'foreground',

                quality:
                  1
              },

              progress:
                (
                  key,
                  current,
                  total
                ) => {

                  if (
                    isCancelled(jobId)
                  ) {
                    return;
                  }

                  post('progress', {
                    jobId,
                    key,
                    current,
                    total
                  });
                }
            };

            blob =
              await removeBackground(
                inputFile,
                gpuConfig
              );

          } catch (gpuError) {

            console.warn(
              '[BG Worker] GPU failed. Falling back to CPU:',
              gpuError
            );

            self.__GPU_BAD__ = true;

            blob = null;

            post('gpuFallback', {
              jobId
            });
          }
        }

        /*
         * ----------------------------------------
         * CPU / WASM
         * ----------------------------------------
         */

        if (
          !blob &&
          !isCancelled(jobId)
        ) {

          post('mode', {
            jobId,
            mode: 'cpu'
          });

          const cpuConfig = {

            debug: false,

            model: MODEL,

            device: 'cpu',

            output: {
              format:
                OUTPUT_FORMAT,

              type:
                'foreground',

              quality:
                1
            },

            progress:
              (
                key,
                current,
                total
              ) => {

                if (
                  isCancelled(jobId)
                ) {
                  return;
                }

                post('progress', {
                  jobId,
                  key,
                  current,
                  total
                });
              }
          };

          blob =
            await removeBackground(
              inputFile,
              cpuConfig
            );
        }

        if (isCancelled(jobId)) {
          throw new Error(
            'BACKGROUND_CANCELLED'
          );
        }

        if (!blob) {
          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );
        }

        if (
          typeof blob.size === 'number' &&
          blob.size <= 0
        ) {
          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );
        }

        post('progress', {
          jobId,
          key: 'complete',
          current: 100,
          total: 100
        });

        /*
         * ArrayBuffer transfer is used instead of passing Blob
         * directly. This makes ownership transfer explicit and
         * avoids unnecessary structured-clone copies.
         */
        const buffer =
          await blob.arrayBuffer();

        if (isCancelled(jobId)) {
          throw new Error(
            'BACKGROUND_CANCELLED'
          );
        }

        post(
          'result',
          {
            jobId,
            buffer,
            mime:
              blob.type ||
              OUTPUT_FORMAT
          }
        );
      }

      self.onmessage = async event => {

        const data =
          event && event.data
            ? event.data
            : null;

        if (!data) {
          return;
        }

        /*
         * ----------------------------------------
         * CANCEL
         * ----------------------------------------
         */

        if (data.type === 'cancel') {

          cancelJob(
            data.jobId
          );

          return;
        }

        /*
         * ----------------------------------------
         * PROCESS
         * ----------------------------------------
         */

        if (
          data.type !== 'process' ||
          !data.file ||
          !data.jobId
        ) {
          return;
        }

        const jobId =
          data.jobId;

        currentJobId =
          jobId;

        /*
         * Re-enable this ID in case the worker has
         * reused internal state.
         */
        cancelledJobs.delete(
          jobId
        );

        try {

          await runRemoval(
            data.file,
            jobId
          );

          post('done', {
            jobId
          });

        } catch (error) {

          console.error(
            '[BG Worker] Processing failed:',
            error
          );

          post('error', {
            jobId,
            message:
              error &&
              error.message
                ? error.message
                : String(error)
          });

        } finally {

          cancelledJobs.delete(
            jobId
          );

          if (
            currentJobId ===
            jobId
          ) {
            currentJobId = null;
          }
        }
      };

      post('ready');
    `;
  }

  // ============================================================
  // WORKER CLEANUP
  // ============================================================

  function clearWorkerIdleTimer() {
    if (workerIdleTimer) {
      clearTimeout(
        workerIdleTimer
      );

      workerIdleTimer = null;
    }
  }

  function scheduleWorkerIdleCleanup() {
    clearWorkerIdleTimer();

    workerIdleTimer =
      setTimeout(
        () => {

          if (
            pendingWorkerRequests.size ===
            0
          ) {
            destroyWorker();
          }

        },
        WORKER_IDLE_TIMEOUT
      );
  }

  // ============================================================
  // WORKER DESTROY
  // ============================================================

  function rejectAllWorkerRequests(
    message
  ) {

    pendingWorkerRequests.forEach(
      request => {

        if (
          request &&
          typeof request.reject ===
            'function'
        ) {
          request.reject(
            new Error(
              message ||
              'BACKGROUND_WORKER_TERMINATED'
            )
          );
        }

      }
    );

    pendingWorkerRequests.clear();
  }

  function destroyWorker(
    message = 'BACKGROUND_WORKER_TERMINATED'
  ) {

    clearWorkerIdleTimer();

    rejectAllWorkerRequests(
      message
    );

    if (worker) {

      try {
        worker.terminate();
      } catch (_) {}

      worker = null;
    }

    if (workerBlobUrl) {

      revokeUrl(
        workerBlobUrl
      );

      workerBlobUrl = null;
    }
  }

  // ============================================================
  // WORKER CREATE
  // ============================================================

  function ensureWorker() {

    if (worker) {
      return worker;
    }

    const source =
      createWorkerSource();

    const blob =
      new Blob(
        [source],
        {
          type:
            'text/javascript'
        }
      );

    workerBlobUrl =
      URL.createObjectURL(
        blob
      );

    const generation =
      ++workerGeneration;

    worker =
      new Worker(
        workerBlobUrl,
        {
          type:
            'module'
        }
      );

    worker.__generation =
      generation;

    worker.onmessage =
      event => {

        handleWorkerMessage(
          event
        );

      };

    worker.onerror =
      error => {

        console.error(
          '[Image Background Removal] Worker error:',
          error
        );

        const current =
          worker;

        if (
          current === worker
        ) {
          worker = null;
        }

        rejectAllWorkerRequests(
          'BACKGROUND_WORKER_FAILED'
        );

        try {
          current.terminate();
        } catch (_) {}

        if (workerBlobUrl) {

          revokeUrl(
            workerBlobUrl
          );

          workerBlobUrl = null;
        }
      };

    worker.onmessageerror =
      error => {

        console.error(
          '[Image Background Removal] Worker message error:',
          error
        );

        rejectAllWorkerRequests(
          'BACKGROUND_WORKER_MESSAGE_FAILED'
        );
      };

    return worker;
  }

  // ============================================================
  // WORKER MESSAGE
  // ============================================================

  function handleWorkerMessage(
    event
  ) {

    const data =
      event && event.data
        ? event.data
        : null;

    if (!data) {
      return;
    }

    // Worker initialized.
    if (
      data.type === 'ready'
    ) {
      return;
    }

    const jobId =
      data.jobId;

    if (!jobId) {
      return;
    }

    const pending =
      pendingWorkerRequests.get(
        jobId
      );

    if (!pending) {
      return;
    }

    // ------------------------------
    // Progress
    // ------------------------------

    if (
      data.type === 'progress'
    ) {

      const job =
        pending.job;

      if (
        job &&
        !job.disposed &&
        job.isProcessing
      ) {

        const current =
          Number(
            data.current
          );

        const total =
          Number(
            data.total
          );

        if (
          Number.isFinite(current) &&
          Number.isFinite(total) &&
          total > 0
        ) {

          const pct =
            Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (
                    current /
                    total
                  ) *
                  100
                )
              )
            );

          job.setProgress(
            pct
          );

          job.setProgressText(
            data.key,
            pct
          );
        }
      }

      return;
    }

    // ------------------------------
    // Mode
    // ------------------------------

    if (
      data.type === 'mode'
    ) {

      const job =
        pending.job;

      if (
        job &&
        !job.disposed
      ) {

        job.processingMode =
          data.mode;

        if (
          job.statusEl
        ) {

          job.statusEl.textContent =
            t(
              'image.preparingModel'
            );
        }
      }

      return;
    }

    // ------------------------------
    // GPU fallback
    // ------------------------------

    if (
      data.type ===
      'gpuFallback'
    ) {

      const job =
        pending.job;

      if (
        job &&
        !job.disposed &&
        job.statusEl
      ) {

        job.statusEl.textContent =
          t(
            'image.preparingModel'
          );
      }

      return;
    }

    // ------------------------------
    // Result
    // ------------------------------

    if (
      data.type ===
      'result'
    ) {

      try {

        const blob =
          new Blob(
            [data.buffer],
            {
              type:
                data.mime ||
                OUTPUT_FORMAT
            }
          );

        pending.resolve(
          blob
        );

      } catch (error) {

        pending.reject(
          error
        );
      }

      pendingWorkerRequests.delete(
        jobId
      );

      return;
    }

    // ------------------------------
    // Done
    // ------------------------------

    if (
      data.type === 'done'
    ) {
      scheduleWorkerIdleCleanup();
      return;
    }

    // ------------------------------
    // Error
    // ------------------------------

    if (
      data.type ===
      'error'
    ) {

      pending.reject(
        new Error(
          data.message ||
          'BACKGROUND_WORKER_PROCESS_FAILED'
        )
      );

      pendingWorkerRequests.delete(
        jobId
      );

      scheduleWorkerIdleCleanup();

      return;
    }
  }

  // ============================================================
  // WORKER PROCESS
  // ============================================================

  function processInWorker(
    job,
    file
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const currentWorker =
          ensureWorker();

        const jobId =
          job.workerJobId;

        pendingWorkerRequests.set(
          jobId,
          {
            resolve,
            reject,
            job
          }
        );

        clearWorkerIdleTimer();

        try {

          currentWorker.postMessage(
            {
              type:
                'process',

              jobId,

              file
            }
          );

        } catch (error) {

          pendingWorkerRequests.delete(
            jobId
          );

          reject(
            error
          );
        }
      }
    );
  }

  // ============================================================
  // CANCEL WORKER JOB
  // ============================================================

  function cancelWorkerJob(
    job
  ) {

    if (
      !job ||
      !job.workerJobId
    ) {
      return;
    }

    const currentWorker =
      worker;

    if (
      !currentWorker
    ) {
      return;
    }

    try {

      currentWorker.postMessage(
        {
          type:
            'cancel',

          jobId:
            job.workerJobId
        }
      );

    } catch (_) {}

    /*
     * The library itself does not expose a reliable synchronous
     * inference cancellation API.
     *
     * Terminating the worker is therefore the hard-stop mechanism.
     *
     * This is deliberate:
     *
     * remove job
     *   ↓
     * worker stops
     *   ↓
     * main UI remains responsive
     *
     * The next job automatically creates another Worker.
     */
    setTimeout(
      () => {

        if (
          pendingWorkerRequests.has(
            job.workerJobId
          )
        ) {

          destroyWorker(
            'BACKGROUND_CANCELLED'
          );
        }

      },
      50
    );
  }

  // ============================================================
  // IMAGE JOB
  // ============================================================

  class BgJob {

    constructor(file) {

      this.id =
        'bg-' +
        (++jobSeq);

      this.workerJobId =
        this.id;

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

      this.processingMode =
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

    // ==========================================================
    // DOM
    // ==========================================================

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

      const dimEl =
        el.querySelector(
          '.js-origdim'
        );

      if (
        !this.beforeImg ||
        !this.processBtn
      ) {

        this.disposed =
          true;

        this.revokeObjectUrl();

        return;
      }

      // --------------------------------------------------------
      // File info
      // --------------------------------------------------------

      if (filenameEl) {

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

      if (dimEl) {

        dimEl.textContent =
          t(
            'image.reading'
          );
      }

      // --------------------------------------------------------
      // State
      // --------------------------------------------------------

      this.el.dataset.processing =
        'false';

      // --------------------------------------------------------
      // Before preview
      // --------------------------------------------------------

      this.beforeImg.src =
        this.objectUrl;

      this.beforeImg.onload =
        () => {

          if (
            this.disposed
          ) {
            return;
          }

          if (dimEl) {

            dimEl.textContent =
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

          if (dimEl) {

            dimEl.textContent =
              t(
                'image.readFailed'
              );
          }
        };

      // --------------------------------------------------------
      // Process
      // --------------------------------------------------------

      this.processBtn.addEventListener(
        'click',
        () => {
          this.process();
        }
      );

      // --------------------------------------------------------
      // Remove
      // --------------------------------------------------------

      const removeJobBtn =
        el.querySelector(
          '.js-remove-job-btn'
        );

      if (removeJobBtn) {

        removeJobBtn.addEventListener(
          'click',
          () => {

            this.dispose();

            el.remove();

            const idx =
              jobs.indexOf(
                this
              );

            if (idx >= 0) {
              jobs.splice(
                idx,
                1
              );
            }

            updateBulkUI();
          }
        );
      }

      // --------------------------------------------------------
      // UI
      // --------------------------------------------------------

      this.updateLanguageUI();
    }

    // ==========================================================
    // LANGUAGE
    // ==========================================================

    updateLanguageUI() {

      if (
        this.disposed ||
        !this.statusEl
      ) {
        return;
      }

      if (
        this.isProcessing
      ) {
        return;
      }

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

      this.statusEl.textContent =
        t(
          'image.waitingBackground'
        );

      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );
    }

    // ==========================================================
    // ERROR
    // ==========================================================

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

      if (this.statusEl) {

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

    // ==========================================================
    // PROGRESS
    // ==========================================================

    setProgress(pct) {

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
            Number(pct) || 0
          )
        );

      this.progressFill.style.width =
        `${value}%`;
    }

    // ==========================================================
    // PROGRESS TEXT
    // ==========================================================

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
        typeof key === 'string'
          ? key.toLowerCase()
          : '';

      const isLoading =
        raw.includes('fetch') ||
        raw.includes('load') ||
        raw.includes('download') ||
        raw.includes('prepare') ||
        raw.includes('decode');

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

    // ==========================================================
    // CLEAR RESULT
    // ==========================================================

    clearResult() {

      if (this.resultUrl) {

        revokeUrl(
          this.resultUrl
        );

        this.resultUrl =
          null;
      }

      this.resultBlob =
        null;

      if (this.downloadBtn) {

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
    }

    // ==========================================================
    // PROCESS
    // ==========================================================

    async process() {

      if (
        this.disposed ||
        this.resultBlob ||
        this.isProcessing
      ) {
        return;
      }

      if (!this.file) {
        return;
      }

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

      if (this.processBtn) {
        this.processBtn.disabled =
          true;
      }

      this.setProgress(
        0
      );

      this.clearResult();

      if (this.statusEl) {

        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );

        this.statusEl.textContent =
          t(
            'image.preparingModel'
          );
      }

      try {

        await yieldToUI();

        if (
          this.disposed
        ) {
          return;
        }

        /*
         * ======================================================
         * WORKER INFERENCE
         * ======================================================
         */

        const blob =
          await processInWorker(
            this,
            this.file
          );

        if (
          this.disposed
        ) {
          return;
        }

        if (!blob) {
          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );
        }

        if (
          typeof blob.size ===
            'number' &&
          blob.size <= 0
        ) {
          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );
        }

        this.resultBlob =
          blob;

        this.resultUrl =
          URL.createObjectURL(
            blob
          );

        // ------------------------------------------------------
        // Preview
        // ------------------------------------------------------

        if (this.afterImg) {

          this.afterImg.src =
            this.resultUrl;
        }

        if (this.afterWrap) {

          this.afterWrap.classList.remove(
            'hidden'
          );
        }

        // ------------------------------------------------------
        // Download
        // ------------------------------------------------------

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

        // ------------------------------------------------------
        // Success
        // ------------------------------------------------------

        this.setProgress(
          100
        );

        if (this.statusEl) {

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

      } catch (error) {

        console.error(
          '[Image Background Removal] Error:',
          error
        );

        if (
          this.disposed
        ) {
          return;
        }

        /*
         * Cancel is intentionally silent.
         */
        if (
          error &&
          error.message ===
            'BACKGROUND_CANCELLED'
        ) {
          return;
        }

        if (
          error &&
          error.message ===
            'BACKGROUND_WORKER_TERMINATED'
        ) {
          return;
        }

        if (
          error &&
          error.message ===
            'BACKGROUND_WORKER_FAILED'
        ) {

          this.setError(
            'image.backgroundRemovalFailed'
          );

          this.setProgress(
            0
          );

          return;
        }

        const key =
          getErrorKey(
            error
          );

        this.setError(
          key
        );

        this.setProgress(
          0
        );

        this.clearResult();

      } finally {

        this.isProcessing =
          false;

        this.processingMode =
          null;

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

    // ==========================================================
    // REVOKE
    // ==========================================================

    revokeObjectUrl() {

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

    // ==========================================================
    // DISPOSE
    // ==========================================================

    dispose() {

      if (
        this.disposed
      ) {
        return;
      }

      this.disposed =
        true;

      this.isProcessing =
        false;

      this.el.dataset.processing =
        'false';

      /*
       * Stop current Worker job immediately.
       */
      cancelWorkerJob(
        this
      );

      this.revokeObjectUrl();

      if (this.resultUrl) {

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

  function addFiles(fileList) {

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

          if (job) {
            job.dispose();
          }
        }
      );

      jobs.length =
        0;

      jobsEl.innerHTML =
        '';

      /*
       * Hard cleanup.
       */
      destroyWorker(
        'BACKGROUND_CANCELLED'
      );

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

      const total =
        queue.length;

      let done =
        0;

      const renderBatchLabel =
        () =>
          t(
            'image.removeBackgroundAllProcessing',
            {
              current:
                Math.min(
                  done + 1,
                  total
                ),

              total
            }
          );

      processAllBtn.textContent =
        renderBatchLabel();

      try {

        /*
         * IMPORTANT:
         *
         * One image at a time.
         *
         * The Worker remains alive between jobs,
         * so the model does not have to initialize
         * from scratch on every image.
         */
        for (
          const job of queue
        ) {

          if (
            !job ||
            job.disposed ||
            job.resultBlob
          ) {

            done++;

            continue;
          }

          processAllBtn.textContent =
            renderBatchLabel();

          await job.process();

          done++;

          await yieldToUI();
        }

      } finally {

        processAllBtn.disabled =
          false;

        processAllBtn.textContent =
          t(
            'image.removeBackgroundAll'
          );

        updateBulkUI();

        /*
         * Keep worker alive for the next job/session,
         * but allow the idle timer to eventually clean it up.
         */
        if (
          worker &&
          pendingWorkerRequests.size === 0
        ) {
          scheduleWorkerIdleCleanup();
        }
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

              compression:
                'STORE'
            }
          );

        U.downloadBlob(
          content,
          'no-background.zip'
        );

      } catch (error) {

        console.error(
          '[Image Background Removal] ZIP failed:',
          error
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

            if (job) {
              job.dispose();
            }
          }
        );

        jobs.length =
          0;

        jobsEl.innerHTML =
          '';

        /*
         * Destroy worker as part of cache cleanup.
         */
        destroyWorker(
          'BACKGROUND_CACHE_CLEARED'
        );

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
