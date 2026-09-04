/* global window, document, URL, JSZip */

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
  // SAFETY
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
      '[Background Removal] Required elements not found.'
    );

    return;

  }


  // ============================================================
  // AI CONFIG
  // ============================================================

  /*
   * Transformers.js
   */
  const TRANSFORMERS_VERSION =
    '3.8.1';


  const TRANSFORMERS_URL =
    `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`;


  /*
   * Apache-2.0 licensed ISNet general-use ONNX model.
   *
   * This model is specifically packaged for Transformers.js.
   */
  const MODEL_ID =
    'Ko033/isnet-general-use-onnx';


  /*
   * Prefer WebGPU.
   */
  const PREFER_WEBGPU =
    true;


  /*
   * Q8 keeps the browser-side CPU fallback considerably lighter.
   *
   * Transformers.js will select the quantized ONNX weights
   * provided by the model repository.
   */
  const WASM_DTYPE =
    'q8';


  /*
   * WebGPU can use FP16 when available.
   */
  const WEBGPU_DTYPE =
    'fp16';


  const OUTPUT_FORMAT =
    'image/png';


  const OUTPUT_EXTENSION =
    'png';


  /*
   * Model works internally at its configured inference size.
   * Final output uses the ORIGINAL image dimensions.
   */
  const MODEL_INPUT_SIZE =
    1024;


  /*
   * Browser safety.
   */
  const MAX_OUTPUT_DIMENSION =
    8192;


  const MAX_CANVAS_AREA =
    60000000;


  /*
   * Conservative alpha refinement.
   */
  const ALPHA_LOW =
    0.035;


  const ALPHA_HIGH =
    0.965;


  const EDGE_GAMMA =
    0.97;


  // ============================================================
  // STATE
  // ============================================================

  let jobSeq =
    0;


  const jobs =
    [];


  let transformersPromise =
    null;


  let modelPromise =
    null;


  let modelMode =
    null;


  let webgpuKnownBad =
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
  // UI YIELD
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

          return;

        }


        setTimeout(
          resolve,
          0
        );

      }
    );

  }


  // ============================================================
  // URL
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
  // IMAGE LOADING
  // ============================================================

  async function loadImage(
    file
  ) {

    const objectUrl =
      URL.createObjectURL(
        file
      );


    try {

      return await new Promise(
        (
          resolve,
          reject
        ) => {

          const img =
            new Image();


          img.onload =
            () =>
              resolve(
                img
              );


          img.onerror =
            () =>
              reject(
                new Error(
                  'IMAGE_DECODE_FAILED'
                )
              );


          img.src =
            objectUrl;

        }
      );

    } finally {

      revokeUrl(
        objectUrl
      );

    }

  }


  // ============================================================
  // TRANSFORMERS.JS
  // ============================================================

  async function loadTransformers() {

    if (
      transformersPromise
    ) {

      return transformersPromise;

    }


    transformersPromise =
      import(
        /* webpackIgnore: true */
        TRANSFORMERS_URL
      )
        .then(
          module => {

            if (
              !module
            ) {

              throw new Error(
                'TRANSFORMERS_LOAD_FAILED'
              );

            }


            if (
              typeof module.pipeline !==
                'function'
            ) {

              throw new Error(
                'TRANSFORMERS_PIPELINE_NOT_FOUND'
              );

            }


            return module;

          }
        )
        .catch(
          error => {

            console.error(
              '[Background Removal] Transformers.js failed:',
              error
            );


            transformersPromise =
              null;


            throw new Error(
              'TRANSFORMERS_LOAD_FAILED'
            );

          }
        );


    return transformersPromise;

  }


  // ============================================================
  // WEBGPU
  // ============================================================

  async function canUseWebGPU() {

    if (
      !PREFER_WEBGPU ||
      webgpuKnownBad
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


    try {

      const adapter =
        await navigator.gpu.requestAdapter();


      return !!adapter;

    } catch (
      error
    ) {

      console.warn(
        '[Background Removal] WebGPU unavailable:',
        error
      );


      return false;

    }

  }


  // ============================================================
  // MODEL PROGRESS
  // ============================================================

  function updateProgress(
    job,
    info
  ) {

    if (
      !job ||
      job.disposed ||
      !job.isProcessing ||
      !info
    ) {

      return;

    }


    let percent =
      Number(
        info.progress
      );


    if (
      !Number.isFinite(
        percent
      )
    ) {

      const loaded =
        Number(
          info.loaded
        );


      const total =
        Number(
          info.total
        );


      if (
        Number.isFinite(
          loaded
        ) &&
        Number.isFinite(
          total
        ) &&
        total >
          0
      ) {

        percent =
          (
            loaded /
            total
          ) *
          100;

      }

    }


    if (
      !Number.isFinite(
        percent
      )
    ) {

      return;

    }


    percent =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            percent
          )
        )
      );


    job.setProgress(
      percent
    );


    if (
      job.statusEl
    ) {

      job.statusEl.textContent =
        t(
          'image.loadingModelProgress',
          {
            percent
          }
        );

    }

  }


  // ============================================================
  // LOAD MODEL
  // ============================================================

  async function loadModel(
    mode,
    job
  ) {

    const {
      pipeline
    } =
      await loadTransformers();


    /*
     * Reuse existing model.
     */
    if (
      modelPromise &&
      modelMode === mode
    ) {

      return modelPromise;

    }


    /*
     * Engine changed.
     */
    modelPromise =
      null;


    modelMode =
      mode;


    const progress_callback =
      info =>
        updateProgress(
          job,
          info
        );


    const options =
      {

        progress_callback

      };


    /*
     * WebGPU:
     *
     * use the model's FP16 weights.
     */
    if (
      mode ===
      'gpu'
    ) {

      options.device =
        'webgpu';

      options.dtype =
        WEBGPU_DTYPE;

    } else {

      /*
       * WASM:
       *
       * use quantized weights.
       */
      options.device =
        'wasm';

      options.dtype =
        WASM_DTYPE;

    }


    modelPromise =
      pipeline(
        'background-removal',
        MODEL_ID,
        options
      );


    try {

      return await modelPromise;

    } catch (
      error
    ) {

      modelPromise =
        null;


      throw error;

    }

  }


  // ============================================================
  // ALPHA
  // ============================================================

  function clamp01(
    value
  ) {

    return Math.max(
      0,
      Math.min(
        1,
        Number(
          value
        ) || 0
      )
    );

  }


  function refineAlpha(
    value
  ) {

    let alpha =
      clamp01(
        value
      );


    if (
      alpha <=
      ALPHA_LOW
    ) {

      return 0;

    }


    if (
      alpha >=
      ALPHA_HIGH
    ) {

      return 1;

    }


    alpha =
      (
        alpha -
        ALPHA_LOW
      ) /
      (
        ALPHA_HIGH -
        ALPHA_LOW
      );


    /*
     * Smoothstep.
     */
    alpha =
      alpha *
      alpha *
      (
        3 -
        2 *
        alpha
      );


    /*
     * Very mild gamma adjustment.
     */
    alpha =
      Math.pow(
        alpha,
        EDGE_GAMMA
      );


    return clamp01(
      alpha
    );

  }


  // ============================================================
  // SOURCE CANVAS
  // ============================================================

  async function createSourceCanvas(
    file
  ) {

    const img =
      await loadImage(
        file
      );


    const width =
      img.naturalWidth;


    const height =
      img.naturalHeight;


    if (
      !width ||
      !height
    ) {

      throw new Error(
        'IMAGE_DIMENSIONS_INVALID'
      );

    }


    if (
      width >
        MAX_OUTPUT_DIMENSION ||
      height >
        MAX_OUTPUT_DIMENSION ||
      (
        width *
        height
      ) >
        MAX_CANVAS_AREA
    ) {

      throw new Error(
        'IMAGE_TOO_LARGE'
      );

    }


    const canvas =
      document.createElement(
        'canvas'
      );


    canvas.width =
      width;


    canvas.height =
      height;


    const ctx =
      canvas.getContext(
        '2d',
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
      );


    if (
      !ctx
    ) {

      throw new Error(
        'CANVAS_CONTEXT_FAILED'
      );

    }


    ctx.imageSmoothingEnabled =
      true;


    ctx.imageSmoothingQuality =
      'high';


    ctx.drawImage(
      img,
      0,
      0
    );


    return canvas;

  }


  // ============================================================
  // CONVERT MASK TO CANVAS
  // ============================================================

  async function createMaskCanvas(
    maskOutput,
    width,
    height
  ) {

    /*
     * Transformers.js background-removal pipelines can return
     * a RawImage-like output.
     *
     * We deliberately support both:
     *
     * 1. RawImage
     * 2. Canvas/ImageBitmap-like objects
     */
    if (
      !maskOutput
    ) {

      throw new Error(
        'MASK_EMPTY'
      );

    }


    /*
     * RawImage path.
     */
    if (
      typeof maskOutput.toCanvas ===
        'function'
    ) {

      const canvas =
        maskOutput.toCanvas();


      if (
        canvas
      ) {

        if (
          canvas.width ===
            width &&
          canvas.height ===
            height
        ) {

          return canvas;

        }


        const resized =
          document.createElement(
            'canvas'
          );


        resized.width =
          width;


        resized.height =
          height;


        const ctx =
          resized.getContext(
            '2d',
            {
              willReadFrequently:
                true
            }
          );


        if (
          !ctx
        ) {

          throw new Error(
            'MASK_CANVAS_CONTEXT_FAILED'
          );

        }


        ctx.imageSmoothingEnabled =
          true;


        ctx.imageSmoothingQuality =
          'high';


        ctx.drawImage(
          canvas,
          0,
          0,
          width,
          height
        );


        return resized;

      }

    }


    /*
     * Fallback: draw any drawable image-like object.
     */
    if (
      typeof maskOutput.width ===
        'number' ||
      typeof maskOutput.height ===
        'number'
    ) {

      const canvas =
        document.createElement(
          'canvas'
        );


      canvas.width =
        width;


      canvas.height =
        height;


      const ctx =
        canvas.getContext(
          '2d',
          {
            willReadFrequently:
              true
          }
        );


      if (
        !ctx
      ) {

        throw new Error(
          'MASK_CANVAS_CONTEXT_FAILED'
        );

      }


      ctx.imageSmoothingEnabled =
        true;


      ctx.imageSmoothingQuality =
        'high';


      ctx.drawImage(
        maskOutput,
        0,
        0,
        width,
        height
      );


      return canvas;

    }


    throw new Error(
      'MASK_FORMAT_UNSUPPORTED'
    );

  }


  // ============================================================
  // APPLY MASK
  // ============================================================

  async function applyMask(
    sourceCanvas,
    maskOutput
  ) {

    const width =
      sourceCanvas.width;


    const height =
      sourceCanvas.height;


    const maskCanvas =
      await createMaskCanvas(
        maskOutput,
        width,
        height
      );


    const sourceCtx =
      sourceCanvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
        }
      );


    const maskCtx =
      maskCanvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
        }
      );


    if (
      !sourceCtx ||
      !maskCtx
    ) {

      throw new Error(
        'CANVAS_CONTEXT_FAILED'
      );

    }


    const sourceData =
      sourceCtx.getImageData(
        0,
        0,
        width,
        height
      );


    const maskData =
      maskCtx.getImageData(
        0,
        0,
        width,
        height
      );


    const src =
      sourceData.data;


    const mask =
      maskData.data;


    /*
     * Use luminance from the mask.
     *
     * If the returned image has alpha, prefer alpha.
     */
    const output =
      sourceCtx.createImageData(
        width,
        height
      );


    const dst =
      output.data;


    for (
      let i = 0;
      i <
        dst.length;
      i += 4
    ) {

      const maskAlpha =
        mask[i + 3];


      const luminance =
        (
          mask[i] *
          0.299
        ) +
        (
          mask[i + 1] *
          0.587
        ) +
        (
          mask[i + 2] *
          0.114
        );


      /*
       * If mask alpha is fully meaningful, use it.
       * Otherwise use grayscale mask.
       */
      const raw =
        maskAlpha > 0
          ? maskAlpha /
            255
          : luminance /
            255;


      const alpha =
        refineAlpha(
          raw
        );


      dst[i] =
        src[i];


      dst[i + 1] =
        src[i + 1];


      dst[i + 2] =
        src[i + 2];


      dst[i + 3] =
        Math.round(
          alpha *
          255
        );

    }


    sourceCtx.putImageData(
      output,
      0,
      0
    );


    return sourceCanvas;

  }


  // ============================================================
  // PNG
  // ============================================================

  async function canvasToPNG(
    canvas
  ) {

    const blob =
      await new Promise(
        (
          resolve,
          reject
        ) => {

          canvas.toBlob(
            result => {

              if (
                !result
              ) {

                reject(
                  new Error(
                    'PNG_EXPORT_FAILED'
                  )
                );

                return;

              }


              resolve(
                result
              );

            },

            OUTPUT_FORMAT,

            1
          );

        }
      );


    if (
      !blob ||
      blob.size <=
        0
    ) {

      throw new Error(
        'BACKGROUND_EMPTY_RESULT'
      );

    }


    return blob;

  }


  // ============================================================
  // AI PROCESS
  // ============================================================

  async function processImage(
    file,
    job
  ) {

    const {
      RawImage
    } =
      await loadTransformers();


    const segmenter =
      await loadModel(
        modelMode,
        job
      );


    if (
      job.disposed
    ) {

      return null;

    }


    const image =
      await RawImage.fromBlob(
        file
      );


    if (
      !image ||
      !image.width ||
      !image.height
    ) {

      throw new Error(
        'IMAGE_DIMENSIONS_INVALID'
      );

    }


    if (
      job.statusEl
    ) {

      job.statusEl.textContent =
        t(
          'image.removingBackgroundProgress',
          {
            percent:
              0
          }
        );

    }


    await yieldToUI();


    /*
     * The model repository supports the Transformers.js
     * background-removal pipeline directly.
     */
    const output =
      await segmenter(
        image
      );


    if (
      job.disposed
    ) {

      return null;

    }


    if (
      !output
    ) {

      throw new Error(
        'BACKGROUND_EMPTY_RESULT'
      );

    }


    /*
     * Pipeline normally returns an array.
     */
    const maskOutput =
      Array.isArray(
        output
      )
        ? output[0]
        : output;


    if (
      !maskOutput
    ) {

      throw new Error(
        'MASK_EMPTY'
      );

    }


    await yieldToUI();


    /*
     * Final composition uses ORIGINAL dimensions.
     */
    const sourceCanvas =
      await createSourceCanvas(
        file
      );


    if (
      job.disposed
    ) {

      return null;

    }


    const outputCanvas =
      await applyMask(
        sourceCanvas,
        maskOutput
      );


    await yieldToUI();


    return await canvasToPNG(
      outputCanvas
    );

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
        'gpu'
      ) ||

      text.includes(
        'backend'
      ) ||

      text.includes(
        'device lost'
      ) ||

      text.includes(
        'out of memory'
      ) ||

      text.includes(
        'onnxruntime'
      ) ||

      text.includes(
        'ort'
      )

    );

  }


  // ============================================================
  // ERROR → I18N
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
      'TRANSFORMERS_LOAD_FAILED'
    ) {

      return 'errors.backgroundLibraryLoadFailed';

    }


    if (
      code ===
      'IMAGE_DECODE_FAILED'
    ) {

      return 'image.openFailed';

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
    // DOM
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


      if (
        !this.beforeImg ||
        !this.processBtn
      ) {

        this.disposed =
          true;


        this.revokeObjectUrl();


        return;

      }


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


      this.processBtn.addEventListener(
        'click',
        () => {

          this.process();

        }
      );


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


            const index =
              jobs.indexOf(
                this
              );


            if (
              index >=
              0
            ) {

              jobs.splice(
                index,
                1
              );

            }


            updateBulkUI();

          }
        );

      }


      this.updateLanguageUI();

    }


    // ========================================================
    // LANGUAGE UI
    // ========================================================

    updateLanguageUI() {

      if (
        this.disposed ||
        !this.statusEl ||
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
        `${value}%`;

    }


    // ========================================================
    // CLEAR RESULT
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


      if (
        this.afterWrap
      ) {

        this.afterWrap.classList.add(
          'hidden'
        );

      }

    }


    // ========================================================
    // PROCESS
    // ========================================================

    async process() {

      if (
        this.disposed ||
        this.resultBlob ||
        this.isProcessing ||
        !this.file
      ) {

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

        /*
         * Detect WebGPU.
         */
        const gpu =
          await canUseWebGPU();


        modelMode =
          gpu
            ? 'gpu'
            : 'cpu';


        this.processingMode =
          modelMode;


        let blob =
          null;


        /*
         * Primary engine.
         */
        try {

          blob =
            await processImage(
              this.file,
              this
            );

        } catch (
          primaryError
        ) {

          /*
           * WebGPU fallback.
           */
          if (
            modelMode ===
              'gpu' &&
            isLikelyWebGPUError(
              primaryError
            )
          ) {

            console.warn(
              '[Background Removal] WebGPU failed. Falling back to WASM.',
              primaryError
            );


            webgpuKnownBad =
              true;


            modelPromise =
              null;


            modelMode =
              'cpu';


            this.processingMode =
              'cpu';


            this.setProgress(
              0
            );


            if (
              this.statusEl
            ) {

              this.statusEl.textContent =
                t(
                  'image.preparingModel'
                );

            }


            await yieldToUI();


            blob =
              await processImage(
                this.file,
                this
              );

          } else {

            throw primaryError;

          }

        }


        if (
          this.disposed
        ) {

          return;

        }


        if (
          !blob ||
          blob.size <=
            0
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
          '[Background Removal] Failed:',
          error
        );


        if (
          this.disposed
        ) {

          return;

        }


        this.setError(
          getErrorKey(
            error
          )
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


    // ========================================================
    // OBJECT URL
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
         * Sequential processing.
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
          '[Background Removal] ZIP failed:',
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
