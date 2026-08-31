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
  // CONSTANTS
  // ============================================================

  /*
   * Use a newer package version.
   *
   * 1.7.0 is the current npm latest.
   */
  const LIB_VERSION =
    '1.7.0';


  const LIB_URL =
    `https://cdn.jsdelivr.net/npm/@imgly/background-removal@${LIB_VERSION}/+esm`;


  /*
   * Speed-first model.
   *
   * 'isnet' (full precision) is the most accurate but also the
   * heaviest/slowest model shipped by @imgly/background-removal.
   * For fast, bulk, product-photo style removal (the iloveimg-like
   * use case this tool targets) 'isnet_fp16' gives near-identical
   * visual quality at a fraction of the inference time and download
   * size. Swap to 'isnet' if maximum edge accuracy ever matters more
   * than speed.
   */
  const MODEL =
    'isnet_fp16';


  const OUTPUT_FORMAT =
    'image/png';


  const OUTPUT_EXTENSION =
    'png';


  /*
   * WebGPU should be attempted first.
   * We do NOT blindly trust navigator.gpu.
   * The actual removal call is wrapped so that
   * an incompatible WebGPU backend can fall back.
   */
  const PREFER_GPU =
    true;


  /*
   * WebGPU calculations can be proxied to Worker.
   *
   * Both the WebGPU and CPU/WASM code paths are routed through a
   * worker so a slow removal never blocks the main thread and the
   * page stays responsive (progress bar, cancel clicks, etc.) even
   * on the CPU fallback.
   */
  const PROXY_TO_WORKER =
    true;


  /*
   * Background removal is memory heavy. Jobs are processed strictly
   * one at a time in "Process all" (see the sequential for-loop
   * below) rather than in parallel, since ISNet-family models can
   * spike RAM/VRAM usage significantly per inference.
   */


  const ALLOWED_IMAGE_PREFIX =
    'image/';


  /*
   * Large source images (typical of phone/camera photos, 4000px+ on
   * the long edge) slow inference down a lot and can exhaust GPU/WASM
   * memory without adding visible quality to the cutout. Images with
   * a longer side above this value are downscaled to it before being
   * handed to the model. Output resolution therefore matches this
   * cap for oversized inputs; images already at or under it are left
   * untouched (no quality loss for typical product photos).
   */
  const MAX_INPUT_DIMENSION =
    1800;


  const RESIZE_OUTPUT_QUALITY =
    0.92;


  // ============================================================
  // STATE
  // ============================================================

  let jobSeq =
    0;


  const jobs =
    [];


  let libraryPromise =
    null;


  let removeBackgroundFn =
    null;


  let libraryUsers =
    0;


  /*
   * Once a WebGPU failure happens in this browser session,
   * don't keep hammering the same backend.
   */
  let gpuKnownBad =
    false;


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
      resolve =>
        requestAnimationFrame(
          resolve
        )
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
  // IMAGE DOWNSCALE
  // ============================================================

  /*
   * Loads `file` into an <img>, and if its longer side exceeds
   * MAX_INPUT_DIMENSION, draws it to a canvas at a scaled-down size
   * and returns a new File (same basename, JPEG/PNG per original
   * type where practical) for the model to run on instead. If the
   * image is already small enough, the original File is returned
   * unchanged. Never throws — on any failure it falls back to the
   * original file so processing can still proceed at full size.
   */
  async function downscaleIfNeeded(
    file
  ) {

    if (
      !file ||
      typeof file.type !==
        'string' ||
      !file.type.startsWith(
        ALLOWED_IMAGE_PREFIX
      )
    ) {

      return file;

    }


    let objectUrl =
      null;


    try {

      objectUrl =
        URL.createObjectURL(
          file
        );


      const img =
        await new Promise(
          (
            resolve,
            reject
          ) => {

            const el =
              new Image();


            el.onload =
              () =>
                resolve(
                  el
                );


            el.onerror =
              reject;


            el.src =
              objectUrl;

          }
        );


      const width =
        img.naturalWidth;


      const height =
        img.naturalHeight;


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
        document.createElement(
          'canvas'
        );


      canvas.width =
        targetWidth;


      canvas.height =
        targetHeight;


      const ctx =
        canvas.getContext(
          '2d'
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
        img,
        0,
        0,
        targetWidth,
        targetHeight
      );


      const outType =
        file.type ===
        'image/png'
          ? 'image/png'
          : 'image/jpeg';


      const blob =
        await new Promise(
          resolve =>
            canvas.toBlob(
              resolve,
              outType,
              RESIZE_OUTPUT_QUALITY
            )
        );


      if (
        !blob
      ) {

        return file;

      }


      return new File(
        [
          blob
        ],
        file.name,
        {
          type:
            outType,

          lastModified:
            file.lastModified
        }
      );

    } catch (
      error
    ) {

      console.warn(
        '[Image Background Removal] Downscale skipped, using original file:',
        error
      );


      return file;

    } finally {

      revokeUrl(
        objectUrl
      );

    }

  }


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
              '[Image Background Removal] Library load failed:',
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


  // ============================================================
  // ACQUIRE LIBRARY
  // ============================================================

  async function acquireLibrary() {

    const fn =
      await loadLibrary();


    libraryUsers++;


    return fn;

  }


  // ============================================================
  // RELEASE LIBRARY USER
  // ============================================================

  function releaseLibraryUser() {

    libraryUsers =
      Math.max(
        0,
        libraryUsers -
          1
      );

  }


  // ============================================================
  // DEVICE CAPABILITY
  // ============================================================

  function canTryWebGPU() {

    if (
      !PREFER_GPU ||
      gpuKnownBad
    ) {

      return false;

    }


    if (
      typeof navigator ===
        'undefined'
    ) {

      return false;

    }


    if (
      !navigator.gpu ||
      typeof navigator.gpu.requestAdapter !==
        'function'
    ) {

      return false;

    }


    return true;

  }


  // ============================================================
  // WEBGPU PROBE
  // ============================================================

  async function probeWebGPU() {

    if (
      !canTryWebGPU()
    ) {

      return false;

    }


    try {

      const adapter =
        await navigator.gpu.requestAdapter();


      if (
        !adapter
      ) {

        return false;

      }


      /*
       * Only test the basic adapter.
       *
       * Do NOT call requestAdapterInfo().
       *
       * Some browser/runtime combinations
       * do not expose that function.
       */
      return true;

    } catch (
      error
    ) {

      console.warn(
        '[Image Background Removal] WebGPU probe failed:',
        error
      );


      return false;

    }

  }


  // ============================================================
  // BUILD CONFIG
  // ============================================================

  async function buildConfig(
    useGpu
  ) {

    const config = {

      debug:
        false,

      model:
        MODEL,

      output: {

        format:
          OUTPUT_FORMAT,

        type:
          'foreground',

        quality:
          1

      },

      /*
       * Route both GPU and CPU/WASM inference through a worker so
       * the main thread (and therefore the UI) never blocks on a
       * slow removal.
       */
      proxyToWorker:
        PROXY_TO_WORKER

    };


    /*
     * Explicitly select GPU only after capability probe.
     */
    if (
      useGpu
    ) {

      config.device =
        'gpu';

    } else {

      /*
       * Explicit CPU path
       *
       * Keep CPU as fallback only.
       */
      config.device =
        'cpu';

    }


    /*
     * Dynamically generated progress callback
     * is attached by BgJob.process().
     */

    return config;

  }


  // ============================================================
  // ERROR CLASSIFICATION
  // ============================================================

  function isLikelyWebGPUError(
    error
  ) {

    if (
      !error
    ) {

      return false;

    }


    const text =
      String(
        error.message ||
        error
      )
        .toLowerCase();


    return (

      text.includes(
        'webgpu'
      ) ||

      text.includes(
        'requestadapter'
      ) ||

      text.includes(
        'requestadapterinfo'
      ) ||

      text.includes(
        'no available backend'
      ) ||

      text.includes(
        'failed to create session'
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


      const dimEl =
        el.querySelector(
          '.js-origdim'
        );


      // ------------------------------------------------------
      // Validate
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


      if (
        dimEl
      ) {

        dimEl.textContent =
          t(
            'image.reading'
          );

      }


      // ------------------------------------------------------
      // Processing state
      // ------------------------------------------------------

      this.el.dataset.processing =
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
      // Remove
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
       * During processing, dynamic progress
       * controls the status text.
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
    // RESET RESULT
    // ========================================================

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


    // ========================================================
    // PROCESS GPU
    // ========================================================

    async processWithMode(
      removeBackground,
      mode,
      inputFile
    ) {

      if (
        this.disposed
      ) {

        return null;

      }


      const useGpu =
        mode ===
        'gpu';


      const config =
        await buildConfig(
          useGpu
        );


      config.progress =
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

        };


      /*
       * Show mode to user in a useful way.
       */
      if (
        this.statusEl
      ) {

        this.statusEl.textContent =
          t(
            'image.preparingModel'
          );

      }


      return removeBackground(
        inputFile,
        config
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
       * Reset error state
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


      let acquired =
        false;


      try {

        // ----------------------------------------------------
        // Acquire library
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


        await yieldToUI();


        // ----------------------------------------------------
        // Downscale oversized source images before inference.
        // This is the single biggest lever on wall-clock speed
        // for typical phone/camera photos.
        // ----------------------------------------------------

        const inputFile =
          await downscaleIfNeeded(
            this.file
          );


        if (
          this.disposed
        ) {

          return;

        }


        await yieldToUI();


        // ----------------------------------------------------
        // Try WebGPU first
        // ----------------------------------------------------

        let blob =
          null;


        if (
          await probeWebGPU()
        ) {

          this.processingMode =
            'gpu';


          try {

            blob =
              await this.processWithMode(
                removeBackground,
                'gpu',
                inputFile
              );

          } catch (
            gpuError
          ) {

            console.warn(
              '[Image Background Removal] WebGPU failed. Falling back to CPU/WASM.',
              gpuError
            );


            /*
             * Prevent repeated failures
             * during the same page session.
             */
            if (
              isLikelyWebGPUError(
                gpuError
              )
            ) {

              gpuKnownBad =
                true;

            }


            blob =
              null;


            /*
             * A failed GPU attempt may have left the progress bar
             * partway through. Reset it so the CPU fallback starts
             * from a clean, honest 0% instead of a stale value.
             */
            this.setProgress(
              0
            );

          }

        }


        // ----------------------------------------------------
        // CPU/WASM fallback
        // ----------------------------------------------------

        if (
          !blob
        ) {

          if (
            this.disposed
          ) {

            return;

          }


          this.processingMode =
            'cpu';


          await yieldToUI();


          blob =
            await this.processWithMode(
              removeBackground,
              'cpu',
              inputFile
            );

        }


        // ----------------------------------------------------
        // Validate result
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


        // ----------------------------------------------------
        // Result URL
        // ----------------------------------------------------

        this.clearResult();


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
         * If both GPU and CPU paths fail,
         * display a stable translated message.
         */
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

        if (
          acquired
        ) {

          releaseLibraryUser();


          acquired =
            false;

        }


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


    // ========================================================
    // REVOKE OBJECT URL
    // ========================================================

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
       * Invalidate all async continuations.
       */
      this.disposed =
        true;


      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';


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
     * Do not overwrite dynamic processing text.
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
                  done +
                    1,
                  total
                ),

              total
            }
          );


      processAllBtn.textContent =
        renderBatchLabel();


      try {

        /*
         * Sequential queue.
         *
         * This is deliberate:
         * ISNet can consume substantial memory.
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
