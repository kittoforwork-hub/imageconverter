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
 * MAIN THREAD
 *   ├─ UI
 *   ├─ Preview
 *   ├─ Queue
 *   └─ ZIP
 *
 * WEB WORKER
 *   ├─ Image decode
 *   ├─ Resize
 *   ├─ AI inference
 *   ├─ WebGPU
 *   └─ CPU/WASM fallback
 *
 * Features:
 *   - Real AI progress callback
 *   - Weighted progress bar
 *   - Worker-based inference
 *   - WebGPU first
 *   - CPU/WASM fallback
 *   - Model reused between images
 *   - Sequential batch queue
 *   - Large image resize inside Worker
 *   - Worker hard-cancel
 *   - ZIP download
 *   - i18n compatible
 *
 * ============================================================
 */

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
      typeof I18n.t ===
        'function'
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

  const LIB_VERSION =
    '1.7.0';

  const LIB_URL =
    `https://cdn.jsdelivr.net/npm/@imgly/background-removal@${LIB_VERSION}/+esm`;

  /*
   * Full precision ISNet.
   *
   * Kept intentionally because the previous version used this
   * for more reliable results.
   */
  const MODEL =
    'isnet';

  const OUTPUT_FORMAT =
    'image/png';

  const OUTPUT_EXTENSION =
    'png';

  /*
   * GPU first.
   */
  const PREFER_GPU =
    true;

  /*
   * IMPORTANT:
   *
   * Large photos can consume a huge amount of memory.
   * Resize is performed INSIDE the Worker.
   *
   * 1536 gives a good balance for product images.
   */
  const MAX_INPUT_DIMENSION =
    1536;

  const RESIZE_OUTPUT_QUALITY =
    0.92;

  const ALLOWED_IMAGE_PREFIX =
    'image/';

  /*
   * Keep Worker alive after a job so that the model does not have
   * to initialize again for every image.
   */
  const WORKER_IDLE_TIMEOUT =
    5 * 60 * 1000;

  // ============================================================
  // STATE
  // ============================================================

  let jobSeq =
    0;

  const jobs =
    [];

  let worker =
    null;

  let workerBlobUrl =
    null;

  let workerGeneration =
    0;

  const pendingWorkerRequests =
    new Map();

  let workerIdleTimer =
    null;

  // ============================================================
  // SAFE YIELD
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
      resolve => {

        if (
          typeof requestAnimationFrame ===
            'function'
        ) {

          requestAnimationFrame(
            resolve
          );

        } else {

          setTimeout(
            resolve,
            0
          );

        }

      }
    );

  }

  // ============================================================
  // URL HELPERS
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
  // ERROR -> I18N
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
  // WORKER SOURCE
  // ============================================================

  function createWorkerSource() {

    return `

      'use strict';

      // ========================================================
      // WORKER CONSTANTS
      // ========================================================

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

      // ========================================================
      // WORKER STATE
      // ========================================================

      let removeBackgroundFn =
        null;

      let libraryPromise =
        null;

      let currentJobId =
        null;

      const cancelledJobs =
        new Set();

      let gpuKnownBad =
        false;

      // ========================================================
      // POST HELPER
      // ========================================================

      function post(
        type,
        payload = {}
      ) {

        self.postMessage({
          type,
          ...payload
        });

      }

      // ========================================================
      // CANCEL
      // ========================================================

      function isCancelled(
        jobId
      ) {

        return (
          !!jobId &&
          cancelledJobs.has(
            jobId
          )
        );

      }

      function cancelJob(
        jobId
      ) {

        if (
          !jobId
        ) {

          return;

        }

        cancelledJobs.add(
          jobId
        );

      }

      // ========================================================
      // LOAD AI LIBRARY
      // ========================================================

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
            LIB_URL
          )
            .then(
              module => {

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

                removeBackgroundFn =
                  fn;

                return fn;

              }
            )
            .catch(
              error => {

                console.error(
                  '[BG Worker] Library load failed:',
                  error
                );

                removeBackgroundFn =
                  null;

                libraryPromise =
                  null;

                throw new Error(
                  'BACKGROUND_LIBRARY_LOAD_FAILED'
                );

              }
            );

        return libraryPromise;

      }

      // ========================================================
      // WEBGPU
      // ========================================================

      function supportsWebGPU() {

        return (
          !gpuKnownBad &&
          typeof navigator !==
            'undefined' &&
          !!navigator.gpu &&
          typeof navigator.gpu.requestAdapter ===
            'function'
        );

      }

      async function probeWebGPU() {

        if (
          !supportsWebGPU()
        ) {

          return false;

        }

        try {

          const adapter =
            await navigator.gpu.requestAdapter();

          return !!adapter;

        } catch (
          error
        ) {

          console.warn(
            '[BG Worker] WebGPU probe failed:',
            error
          );

          return false;

        }

      }

      // ========================================================
      // WORKER IMAGE RESIZE
      // ========================================================

      async function resizeIfNeeded(
        file,
        jobId
      ) {

        if (
          isCancelled(
            jobId
          )
        ) {

          throw new Error(
            'BACKGROUND_CANCELLED'
          );

        }

        /*
         * Browser support check.
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

        let bitmap =
          null;

        try {

          /*
           * Decode happens inside Worker.
           */
          bitmap =
            await createImageBitmap(
              file
            );

          if (
            isCancelled(
              jobId
            )
          ) {

            throw new Error(
              'BACKGROUND_CANCELLED'
            );

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

          /*
           * No resize required.
           */
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
                width *
                scale
              )
            );

          const targetHeight =
            Math.max(
              1,
              Math.round(
                height *
                scale
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
                alpha:
                  true
              }
            );

          if (
            !ctx
          ) {

            return file;

          }

          ctx.imageSmoothingEnabled =
            true;

          ctx.imageSmoothingQuality =
            'high';

          ctx.drawImage(
            bitmap,
            0,
            0,
            targetWidth,
            targetHeight
          );

          /*
           * Keep PNG source as PNG.
           * Other formats use JPEG for a smaller temporary input.
           */
          const type =
            file.type ===
              'image/png'
              ? 'image/png'
              : 'image/jpeg';

          const blob =
            await canvas.convertToBlob({
              type,
              quality:
                RESIZE_OUTPUT_QUALITY
            });

          if (
            !blob
          ) {

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

        } catch (
          error
        ) {

          if (
            error &&
            error.message ===
              'BACKGROUND_CANCELLED'
          ) {

            throw error;

          }

          console.warn(
            '[BG Worker] Resize skipped:',
            error
          );

          return file;

        } finally {

          if (
            bitmap
          ) {

            try {

              bitmap.close();

            } catch (_) {}

          }

        }

      }

      // ========================================================
      // AI PROCESS
      // ========================================================

      async function runRemoval(
        file,
        jobId
      ) {

        if (
          isCancelled(
            jobId
          )
        ) {

          throw new Error(
            'BACKGROUND_CANCELLED'
          );

        }

        /*
         * --------------------------------------------
         * Prepare
         * --------------------------------------------
         */

        post(
          'progress',
          {
            jobId,
            phase:
              'prepare',
            key:
              'prepare',
            current:
              0,
            total:
              100
          }
        );

        const resizedFile =
          await resizeIfNeeded(
            file,
            jobId
          );

        if (
          isCancelled(
            jobId
          )
        ) {

          throw new Error(
            'BACKGROUND_CANCELLED'
          );

        }

        /*
         * Prepare phase completed.
         */
        post(
          'progress',
          {
            jobId,
            phase:
              'prepare',
            key:
              'prepare',
            current:
              100,
            total:
              100
          }
        );

        /*
         * --------------------------------------------
         * Load library
         * --------------------------------------------
         */

        post(
          'progress',
          {
            jobId,
            phase:
              'load',
            key:
              'load',
            current:
              0,
            total:
              100
          }
        );

        const removeBackground =
          await loadLibrary();

        if (
          isCancelled(
            jobId
          )
        ) {

          throw new Error(
            'BACKGROUND_CANCELLED'
          );

        }

        post(
          'progress',
          {
            jobId,
            phase:
              'load',
            key:
              'load',
            current:
              100,
            total:
              100
          }
        );

        let blob =
          null;

        /*
         * --------------------------------------------
         * WebGPU
         * --------------------------------------------
         */

        if (
          PREFER_GPU_PLACEHOLDER
        ) {

          // Intentionally replaced below by the Worker constant.
        }

        const shouldTryGpu =
          !gpuKnownBad &&
          await probeWebGPU();

        if (
          shouldTryGpu &&
          !isCancelled(
            jobId
          )
        ) {

          try {

            post(
              'mode',
              {
                jobId,
                mode:
                  'gpu'
              }
            );

            const gpuConfig = {

              debug:
                false,

              model:
                MODEL,

              device:
                'gpu',

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
                    isCancelled(
                      jobId
                    )
                  ) {

                    return;

                  }

                  post(
                    'progress',
                    {
                      jobId,
                      phase:
                        'ai',
                      key,
                      current,
                      total
                    }
                  );

                }

            };

            blob =
              await removeBackground(
                resizedFile,
                gpuConfig
              );

          } catch (
            gpuError
          ) {

            console.warn(
              '[BG Worker] WebGPU failed. Falling back to CPU:',
              gpuError
            );

            gpuKnownBad =
              true;

            blob =
              null;

            post(
              'gpuFallback',
              {
                jobId
              }
            );

          }

        }

        /*
         * --------------------------------------------
         * CPU / WASM FALLBACK
         * --------------------------------------------
         */

        if (
          !blob &&
          !isCancelled(
            jobId
          )
        ) {

          post(
            'mode',
            {
              jobId,
              mode:
                'cpu'
            }
          );

          const cpuConfig = {

            debug:
              false,

            model:
              MODEL,

            device:
              'cpu',

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
                  isCancelled(
                    jobId
                  )
                ) {

                  return;

                }

                post(
                  'progress',
                  {
                    jobId,
                    phase:
                      'ai',
                    key,
                    current,
                    total
                  }
                );

              }

          };

          blob =
            await removeBackground(
              resizedFile,
              cpuConfig
            );

        }

        if (
          isCancelled(
            jobId
          )
        ) {

          throw new Error(
            'BACKGROUND_CANCELLED'
          );

        }

        /*
         * --------------------------------------------
         * Result validation
         * --------------------------------------------
         */

        if (
          !blob
        ) {

          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );

        }

        if (
          typeof blob.size ===
            'number' &&
          blob.size <=
            0
        ) {

          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );

        }

        /*
         * --------------------------------------------
         * Output phase
         * --------------------------------------------
         */

        post(
          'progress',
          {
            jobId,
            phase:
              'output',
            key:
              'output',
            current:
              0,
            total:
              100
          }
        );

        const buffer =
          await blob.arrayBuffer();

        if (
          isCancelled(
            jobId
          )
        ) {

          throw new Error(
            'BACKGROUND_CANCELLED'
          );

        }

        post(
          'progress',
          {
            jobId,
            phase:
              'output',
            key:
              'output',
            current:
              100,
            total:
              100
          }
        );

        /*
         * --------------------------------------------
         * Return transferable ArrayBuffer
         * --------------------------------------------
         */

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

      // ========================================================
      // MESSAGE HANDLER
      // ========================================================

      self.onmessage =
        async event => {

          const data =
            event &&
            event.data
              ? event.data
              : null;

          if (
            !data
          ) {

            return;

          }

          /*
           * ------------------------------------------
           * CANCEL
           * ------------------------------------------
           */

          if (
            data.type ===
              'cancel'
          ) {

            cancelJob(
              data.jobId
            );

            return;

          }

          /*
           * ------------------------------------------
           * PROCESS
           * ------------------------------------------
           */

          if (
            data.type !==
              'process' ||
            !data.file ||
            !data.jobId
          ) {

            return;

          }

          const jobId =
            data.jobId;

          currentJobId =
            jobId;

          cancelledJobs.delete(
            jobId
          );

          try {

            await runRemoval(
              data.file,
              jobId
            );

            post(
              'done',
              {
                jobId
              }
            );

          } catch (
            error
          ) {

            console.error(
              '[BG Worker] Processing failed:',
              error
            );

            post(
              'error',
              {
                jobId,
                message:
                  error &&
                  error.message
                    ? error.message
                    : String(
                        error
                      )
              }
            );

          } finally {

            cancelledJobs.delete(
              jobId
            );

            if (
              currentJobId ===
                jobId
            ) {

              currentJobId =
                null;

            }

          }

        };

      /*
       * Worker startup notification.
       */
      post(
        'ready'
      );

    `

      /*
       * IMPORTANT:
       *
       * The placeholder below is injected as plain text so the
       * generated Worker source stays completely self contained.
       */
      .replace(
        /PREFER_GPU_PLACEHOLDER/g,
        String(
          PREFER_GPU
        )
      );

  }

  // ============================================================
  // WORKER IDLE TIMER
  // ============================================================

  function clearWorkerIdleTimer() {

    if (
      workerIdleTimer
    ) {

      clearTimeout(
        workerIdleTimer
      );

      workerIdleTimer =
        null;

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
  // REJECT WORKER REQUESTS
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

  // ============================================================
  // DESTROY WORKER
  // ============================================================

  function destroyWorker(
    message =
      'BACKGROUND_WORKER_TERMINATED'
  ) {

    clearWorkerIdleTimer();

    rejectAllWorkerRequests(
      message
    );

    if (
      worker
    ) {

      try {

        worker.terminate();

      } catch (_) {}

      worker =
        null;

    }

    if (
      workerBlobUrl
    ) {

      revokeUrl(
        workerBlobUrl
      );

      workerBlobUrl =
        null;

    }

  }

  // ============================================================
  // CREATE WORKER
  // ============================================================

  function ensureWorker() {

    if (
      worker
    ) {

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

    workerGeneration++;

    try {

      worker =
        new Worker(
          workerBlobUrl,
          {
            type:
              'module'
          }
        );

    } catch (
      error
    ) {

      /*
       * Worker construction can fail synchronously because of
       * CSP, browser capability, or an invalid Worker URL.
       * Clean up the Blob URL so repeated attempts do not leak
       * resources.
       */
      if (
        workerBlobUrl
      ) {

        revokeUrl(
          workerBlobUrl
        );

        workerBlobUrl =
          null;

      }

      worker =
        null;

      throw error;

    }

    worker.__generation =
      workerGeneration;

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

        const failedWorker =
          worker;

        worker =
          null;

        rejectAllWorkerRequests(
          'BACKGROUND_WORKER_FAILED'
        );

        try {

          failedWorker.terminate();

        } catch (_) {}

        if (
          workerBlobUrl
        ) {

          revokeUrl(
            workerBlobUrl
          );

          workerBlobUrl =
            null;

        }

      };

    worker.onmessageerror =
      error => {

        console.error(
          '[Image Background Removal] Worker message error:',
          error
        );

        /*
         * A messageerror means the Worker could no longer
         * deliver structured-cloned data reliably. Keeping the
         * Worker alive here can leave the current request pending
         * forever, especially during large-image processing.
         * Treat it as a hard Worker failure so all pending jobs
         * are rejected and the Worker can be recreated cleanly.
         */
        destroyWorker(
          'BACKGROUND_WORKER_MESSAGE_ERROR'
        );

      };

    return worker;

  }

  // ============================================================
  // WEIGHTED PROGRESS
  // ============================================================

  /*
   * Overall progress:
   *
   * 0   - 10     Prepare / resize
   * 10  - 25     Load AI/model
   * 25  - 90     AI inference
   * 90  - 97     Output generation
   * 97  - 100    Complete
   */

  function getWeightedProgress(
    phase,
    rawPercent
  ) {

    const percent =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            rawPercent
          ) || 0
        )
      );

    let start =
      0;

    let end =
      100;

    switch (
      phase
    ) {

      case 'prepare':

        start =
          0;

        end =
          10;

        break;

      case 'load':

        start =
          10;

        end =
          25;

        break;

      case 'ai':

        start =
          25;

        end =
          90;

        break;

      case 'output':

        start =
          90;

        end =
          97;

        break;

      case 'complete':

        start =
          97;

        end =
          100;

        break;

      default:

        start =
          0;

        end =
          100;

        break;

    }

    return Math.round(
      start +
      (
        (
          end -
          start
        ) *
        (
          percent /
          100
        )
      )
    );

  }

  // ============================================================
  // WORKER MESSAGE HANDLER
  // ============================================================

  function handleWorkerMessage(
    event
  ) {

    const data =
      event &&
      event.data
        ? event.data
        : null;

    if (
      !data
    ) {

      return;

    }

    /*
     * ------------------------------------------
     * WORKER READY
     * ------------------------------------------
     */

    if (
      data.type ===
        'ready'
    ) {

      return;

    }

    const jobId =
      data.jobId;

    if (
      !jobId
    ) {

      return;

    }

    const pending =
      pendingWorkerRequests.get(
        jobId
      );

    if (
      !pending
    ) {

      return;

    }

    // ========================================================
    // PROGRESS
    // ========================================================

    if (
      data.type ===
        'progress'
    ) {

      const job =
        pending.job;

      if (
        !job ||
        job.disposed ||
        !job.isProcessing
      ) {

        return;

      }

      const current =
        Number(
          data.current
        );

      const total =
        Number(
          data.total
        );

      if (
        !Number.isFinite(
          current
        ) ||
        !Number.isFinite(
          total
        ) ||
        total <=
          0
      ) {

        return;

      }

      const rawPercent =
        Math.max(
          0,
          Math.min(
            100,
            (
              current /
              total
            ) *
            100
          )
        );

      const phase =
        data.phase ||
        'ai';

      const weightedPercent =
        getWeightedProgress(
          phase,
          rawPercent
        );

      /*
       * Bar uses weighted progress.
       */
      job.setProgress(
        weightedPercent
      );

      /*
       * Text uses real phase progress.
       */
      job.setProgressText(
        data.key,
        Math.round(
          rawPercent
        )
      );

      return;

    }

    // ========================================================
    // MODE
    // ========================================================

    if (
      data.type ===
        'mode'
    ) {

      const job =
        pending.job;

      if (
        job &&
        !job.disposed
      ) {

        job.processingMode =
          data.mode;

        /*
         * GPU/CPU selection happens before actual inference.
         * Keep current progress instead of jumping backwards.
         */

        if (
          job.statusEl
        ) {

          const modeText =
            data.mode ===
              'gpu'
              ? 'GPU'
              : 'CPU';

          /*
           * Use existing i18n text where possible.
           */
          job.statusEl.textContent =
            `${t(
              'image.preparingModel'
            )} (${modeText})`;

        }

      }

      return;

    }

    // ========================================================
    // GPU FALLBACK
    // ========================================================

    if (
      data.type ===
        'gpuFallback'
    ) {

      const job =
        pending.job;

      if (
        job &&
        !job.disposed
      ) {

        /*
         * CPU starts from the current point and never visually
         * goes backwards because setProgress() is monotonic.
         */
        job.statusEl &&
          (
            job.statusEl.textContent =
              t(
                'image.preparingModel'
              )
          );

      }

      return;

    }

    // ========================================================
    // RESULT
    // ========================================================

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

      } catch (
        error
      ) {

        pending.reject(
          error
        );

      }

      pendingWorkerRequests.delete(
        jobId
      );

      scheduleWorkerIdleCleanup();

      return;

    }

    // ========================================================
    // DONE
    // ========================================================

    if (
      data.type ===
        'done'
    ) {

      scheduleWorkerIdleCleanup();

      return;

    }

    // ========================================================
    // ERROR
    // ========================================================

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

        clearWorkerIdleTimer();

        pendingWorkerRequests.set(
          jobId,
          {
            resolve,
            reject,
            job
          }
        );

        try {

          /*
           * File is structured-cloned into the Worker.
           * No massive base64 conversion.
           */
          currentWorker.postMessage(
            {
              type:
                'process',
              jobId,
              file
            }
          );

        } catch (
          error
        ) {

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
  // CANCEL CURRENT WORKER
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

    /*
     * First tell the Worker that the job has been cancelled.
     */
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
     * If the model itself is still blocking inside WASM/WebGPU,
     * the only hard-stop available is terminating the Worker.
     *
     * This does NOT freeze the UI.
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
  // BG JOB
  // ============================================================

  class BgJob {

    constructor(
      file
    ) {

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

      /*
       * Monotonic progress.
       *
       * Never allow the visible progress bar to go backwards.
       */
      this.displayedProgress =
        0;

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
    // BUILD DOM
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

      /*
       * ------------------------------------------
       * Validate
       * ------------------------------------------
       */

      if (
        !this.beforeImg ||
        !this.processBtn
      ) {

        this.disposed =
          true;

        this.revokeObjectUrl();

        return;

      }

      /*
       * ------------------------------------------
       * File information
       * ------------------------------------------
       */

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
        dimEl
      ) {

        dimEl.textContent =
          t(
            'image.reading'
          );

      }

      /*
       * ------------------------------------------
       * State
       * ------------------------------------------
       */

      this.el.dataset.processing =
        'false';

      /*
       * ------------------------------------------
       * Before image
       * ------------------------------------------
       */

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
            dimEl
          ) {

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

          if (
            dimEl
          ) {

            dimEl.textContent =
              t(
                'image.readFailed'
              );

          }

        };

      /*
       * ------------------------------------------
       * Process button
       * ------------------------------------------
       */

      this.processBtn.addEventListener(
        'click',
        () => {

          this.process();

        }
      );

      /*
       * ------------------------------------------
       * Remove job
       * ------------------------------------------
       */

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

      /*
       * ------------------------------------------
       * Initial UI
       * ------------------------------------------
       */

      this.updateLanguageUI();

    }

    // ==========================================================
    // LANGUAGE UI
    // ==========================================================

    updateLanguageUI() {

      if (
        this.disposed ||
        !this.statusEl
      ) {

        return;

      }

      /*
       * Do not overwrite live processing text.
       */
      if (
        this.isProcessing
      ) {

        return;

      }

      /*
       * Success.
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
       * Error.
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
       * Waiting.
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

    // ==========================================================
    // SET ERROR
    // ==========================================================

    setError(
      key,
      params =
        null
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

    // ==========================================================
    // PROGRESS
    // ==========================================================

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

      /*
       * Progress NEVER visually moves backwards.
       */
      this.displayedProgress =
        Math.max(
          this.displayedProgress,
          value
        );

      this.progressFill.style.width =
        `${this.displayedProgress}%`;

    }

    // ==========================================================
    // WEIGHTED PROGRESS
    // ==========================================================

    setWeightedProgress(
      phase,
      rawPercent
    ) {

      const weighted =
        getWeightedProgress(
          phase,
          rawPercent
        );

      this.setProgress(
        weighted
      );

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
        typeof key ===
          'string'
          ? key.toLowerCase()
          : '';

      const isLoading =
        raw.includes(
          'fetch'
        ) ||
        raw.includes(
          'load'
        ) ||
        raw.includes(
          'download'
        ) ||
        raw.includes(
          'prepare'
        ) ||
        raw.includes(
          'decode'
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

    // ==========================================================
    // CLEAR RESULT
    // ==========================================================

    clearResult() {

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

      if (
        !this.file
      ) {

        return;

      }

      /*
       * Reset state.
       */
      this.hasError =
        false;

      this.errorKey =
        null;

      this.errorParams =
        null;

      this.displayedProgress =
        0;

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

      this.clearResult();

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

      try {

        await yieldToUI();

        if (
          this.disposed
        ) {

          return;

        }

        /*
         * ------------------------------------------
         * WORKER INFERENCE
         * ------------------------------------------
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

        if (
          !blob
        ) {

          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );

        }

        if (
          typeof blob.size ===
            'number' &&
          blob.size <=
            0
        ) {

          throw new Error(
            'BACKGROUND_EMPTY_RESULT'
          );

        }

        /*
         * ------------------------------------------
         * Save result
         * ------------------------------------------
         */

        this.resultBlob =
          blob;

        this.resultUrl =
          URL.createObjectURL(
            blob
          );

        /*
         * ------------------------------------------
         * Preview
         * ------------------------------------------
         */

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

        /*
         * ------------------------------------------
         * Download
         * ------------------------------------------
         */

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

        /*
         * ------------------------------------------
         * Finish progress
         * ------------------------------------------
         */

        this.setWeightedProgress(
          'complete',
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
        error
      ) {

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
          (
            error.message ===
              'BACKGROUND_CANCELLED' ||
            error.message ===
              'BACKGROUND_WORKER_TERMINATED'
          )
        ) {

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
    // REVOKE OBJECT URL
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
       * Stop Worker processing.
       */
      cancelWorkerJob(
        this
      );

      this.revokeObjectUrl();

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
     * Do not overwrite processing text.
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
       * Hard stop worker.
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
         * Sequential processing.
         *
         * This deliberately avoids multiple simultaneous AI
         * inferences because ISNet can consume large amounts
         * of RAM/VRAM.
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
         * Worker stays alive for reuse.
         */
        if (
          worker &&
          pendingWorkerRequests.size ===
            0
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

      } catch (
        error
      ) {

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
