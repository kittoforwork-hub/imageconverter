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
      '[BiRefNet] Required elements not found.'
    );

    return;

  }


  // ============================================================
  // AI CONFIG
  // ============================================================

  /*
   * Transformers.js
   *
   * Loaded dynamically from jsDelivr.
   */
  const TRANSFORMERS_VERSION =
    '3.8.1';


  const TRANSFORMERS_URL =
    `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`;


  /*
   * Official ONNX-community BiRefNet model.
   */
  const MODEL_ID =
    'onnx-community/BiRefNet-ONNX';


  /*
   * GPU uses FP16 because the repository provides:
   *
   * onnx/model_fp16.onnx
   *
   * at roughly 490 MB.
   */
  const GPU_DTYPE =
    'fp16';


  /*
   * WASM fallback uses FP32 because the repository provides:
   *
   * onnx/model.onnx
   *
   * at roughly 973 MB.
   */
  const CPU_DTYPE =
    'fp32';


  /*
   * Prefer GPU.
   */
  const PREFER_WEBGPU =
    true;


  /*
   * Final output format.
   */
  const OUTPUT_FORMAT =
    'image/png';


  const OUTPUT_EXTENSION =
    'png';


  /*
   * Model input is handled by the model processor.
   *
   * We DO NOT resize the user's final output.
   */
  const MODEL_INPUT_SIZE =
    1024;


  /*
   * Prevent browser canvas allocations that are unreasonable
   * for typical desktop/mobile hardware.
   */
  const MAX_OUTPUT_DIMENSION =
    8192;


  const MAX_CANVAS_AREA =
    60000000;


  // ============================================================
  // ALPHA REFINEMENT
  // ============================================================

  /*
   * Keep the threshold conservative.
   *
   * The goal is to avoid destroying small product details.
   */
  const ALPHA_LOW =
    0.045;


  const ALPHA_HIGH =
    0.955;


  const EDGE_GAMMA =
    0.96;


  // ============================================================
  // MEMORY / MODEL STATE
  // ============================================================

  let jobSeq =
    0;


  const jobs =
    [];


  let transformersPromise =
    null;


  let modelPromise =
    null;


  let processorPromise =
    null;


  let modelMode =
    null;


  let webgpuKnownBad =
    false;


  let modelLoading =
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
  // IMAGE LOADING
  // ============================================================

  async function loadHTMLImage(
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
            () => {

              resolve(
                img
              );

            };


          img.onerror =
            () => {

              reject(
                new Error(
                  'IMAGE_DECODE_FAILED'
                )
              );

            };


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
              !module ||
              typeof module.AutoModel !==
                'function' ||
              typeof module.AutoProcessor !==
                'function' ||
              typeof module.RawImage !==
                'function'
            ) {

              throw new Error(
                'TRANSFORMERS_LOAD_FAILED'
              );

            }


            return module;

          }
        )
        .catch(
          error => {

            console.error(
              '[BiRefNet] Transformers.js load failed:',
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
  // WEBGPU CHECK
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


      if (
        !adapter
      ) {

        return false;

      }


      return true;

    } catch (
      error
    ) {

      console.warn(
        '[BiRefNet] WebGPU probe failed:',
        error
      );


      return false;

    }

  }


  // ============================================================
  // MODEL PROGRESS
  // ============================================================

  function updateModelProgress(
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
  // RESET MODEL
  // ============================================================

  function resetModel() {

    modelPromise =
      null;


    processorPromise =
      null;

  }


  // ============================================================
  // LOAD BirefNet
  // ============================================================

  async function loadBiRefNet(
    mode,
    job
  ) {

    const {
      AutoModel,
      AutoProcessor
    } =
      await loadTransformers();


    /*
     * Reuse already-loaded model when possible.
     */
    if (
      modelPromise &&
      processorPromise &&
      modelMode === mode
    ) {

      return {

        model:
          await modelPromise,

        processor:
          await processorPromise

      };

    }


    /*
     * Engine changed:
     *
     * GPU → WASM
     * or
     * WASM → GPU
     *
     * therefore reload model.
     */
    resetModel();


    modelMode =
      mode;


    const progressCallback =
      info =>
        updateModelProgress(
          job,
          info
        );


    modelLoading =
      true;


    try {

      /*
       * --------------------------------------------------------
       * MODEL
       * --------------------------------------------------------
       */

      const modelOptions =
        {

          dtype:
            mode === 'gpu'
              ? GPU_DTYPE
              : CPU_DTYPE,

          device:
            mode === 'gpu'
              ? 'webgpu'
              : 'wasm',

          progress_callback:
            progressCallback

        };


      modelPromise =
        AutoModel.from_pretrained(
          MODEL_ID,
          modelOptions
        );


      /*
       * --------------------------------------------------------
       * PROCESSOR
       * --------------------------------------------------------
       */

      processorPromise =
        AutoProcessor.from_pretrained(
          MODEL_ID,
          {
            progress_callback:
              progressCallback
          }
        );


      const model =
        await modelPromise;


      const processor =
        await processorPromise;


      return {

        model,

        processor

      };

    } finally {

      modelLoading =
        false;

    }

  }


  // ============================================================
  // CLAMP
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


  function clampByte(
    value
  ) {

    return Math.max(
      0,
      Math.min(
        255,
        Math.round(
          Number(
            value
          ) || 0
        )
      )
    );

  }


  // ============================================================
  // ALPHA REFINEMENT
  // ============================================================

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
     * Smooth transition.
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
     * Very mild gamma correction.
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
  // CREATE SOURCE CANVAS
  // ============================================================

  async function createSourceCanvas(
    file
  ) {

    const img =
      await loadHTMLImage(
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


    ctx.clearRect(
      0,
      0,
      width,
      height
    );


    ctx.drawImage(
      img,
      0,
      0
    );


    return canvas;

  }


  // ============================================================
  // MASK NORMALIZATION
  // ============================================================

  function normalizeMask(
    rawMask
  ) {

    if (
      !rawMask
    ) {

      throw new Error(
        'MASK_DATA_MISSING'
      );

    }


    /*
     * RawImage exposes:
     *
     * data
     * width
     * height
     * channels
     */
    const width =
      Number(
        rawMask.width
      );


    const height =
      Number(
        rawMask.height
      );


    const channels =
      Number(
        rawMask.channels
      );


    const data =
      rawMask.data;


    if (
      !width ||
      !height ||
      !data
    ) {

      throw new Error(
        'MASK_DATA_INVALID'
      );

    }


    if (
      channels !==
      1
    ) {

      /*
       * BiRefNet should produce a single-channel matte.
       *
       * Fail explicitly rather than silently producing a bad mask.
       */
      throw new Error(
        'MASK_CHANNELS_INVALID'
      );

    }


    return {

      width,

      height,

      data

    };

  }


  // ============================================================
  // COMPOSITE
  // ============================================================

  async function compositeMask(
    file,
    mask
  ) {

    const sourceCanvas =
      await createSourceCanvas(
        file
      );


    const sourceCtx =
      sourceCanvas.getContext(
        '2d',
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
      );


    if (
      !sourceCtx
    ) {

      throw new Error(
        'CANVAS_CONTEXT_FAILED'
      );

    }


    const width =
      sourceCanvas.width;


    const height =
      sourceCanvas.height;


    const maskInfo =
      normalizeMask(
        mask
      );


    /*
     * The model gives us a 1024-class matte.
     *
     * Resize that matte to the original image dimensions.
     */
    const {
      RawImage
    } =
      await loadTransformers();


    const rawMask =
      new RawImage(
        maskInfo.data,
        maskInfo.width,
        maskInfo.height,
        1
      );


    const resizedMask =
      await rawMask.resize(
        width,
        height,
        {
          resample:
            3
        }
      );


    if (
      !resizedMask ||
      !resizedMask.data
    ) {

      throw new Error(
        'MASK_RESIZE_FAILED'
      );

    }


    const sourceImageData =
      sourceCtx.getImageData(
        0,
        0,
        width,
        height
      );


    const outputImageData =
      sourceCtx.createImageData(
        width,
        height
      );


    const src =
      sourceImageData.data;


    const dst =
      outputImageData.data;


    const alphaData =
      resizedMask.data;


    if (
      alphaData.length <
        width *
        height
    ) {

      throw new Error(
        'MASK_SIZE_INVALID'
      );

    }


    /*
     * Final alpha composition.
     *
     * RGB remains untouched.
     *
     * This is deliberate:
     * aggressive RGB decontamination can damage metallic products,
     * black tools, chromed tools and colored edges.
     */
    for (
      let p = 0,
      i = 0;
      p <
        width *
        height;
      p++,
      i += 4
    ) {

      const alphaRaw =
        (
          Number(
            alphaData[p]
          ) || 0
        ) /
        255;


      const alpha =
        refineAlpha(
          alphaRaw
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
      outputImageData,
      0,
      0
    );


    return sourceCanvas;

  }


  // ============================================================
  // CANVAS → PNG
  // ============================================================

  async function canvasToPNG(
    canvas
  ) {

    return await new Promise(
      (
        resolve,
        reject
      ) => {

        canvas.toBlob(
          blob => {

            if (
              !blob ||
              blob.size <=
                0
            ) {

              reject(
                new Error(
                  'PNG_EXPORT_FAILED'
                )
              );

              return;

            }


            resolve(
              blob
            );

          },

          OUTPUT_FORMAT,

          1
        );

      }
    );

  }


  // ============================================================
  // RUN BirefNet
  // ============================================================

  async function runBiRefNet(
    file,
    job
  ) {

    const {
      RawImage
    } =
      await loadTransformers();


    /*
     * Load original image.
     *
     * It stays at original resolution.
     */
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


    /*
     * Inform the user that model is loading.
     */
    if (
      job.statusEl
    ) {

      job.statusEl.textContent =
        t(
          'image.loadingModelProgress',
          {
            percent:
              0
          }
        );

    }


    const {
      model,
      processor
    } =
      await loadBiRefNet(
        modelMode,
        job
      );


    if (
      job.disposed
    ) {

      return null;

    }


    await yieldToUI();


    /*
     * ----------------------------------------------------------
     * PREPROCESS
     * ----------------------------------------------------------
     *
     * The repository's preprocessor config specifies 1024x1024.
     * We let AutoProcessor handle this transformation.
     */
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


    const {
      pixel_values
    } =
      await processor(
        image
      );


    if (
      job.disposed
    ) {

      return null;

    }


    await yieldToUI();


    /*
     * ----------------------------------------------------------
     * INFERENCE
     * ----------------------------------------------------------
     */

    const outputs =
      await model(
        {
          input_image:
            pixel_values
        }
      );


    if (
      job.disposed
    ) {

      return null;

    }


    if (
      !outputs ||
      !outputs.output_image ||
      !outputs.output_image[0]
    ) {

      throw new Error(
        'BACKGROUND_EMPTY_RESULT'
      );

    }


    /*
     * ----------------------------------------------------------
     * LOGITS → MASK
     * ----------------------------------------------------------
     *
     * This follows the official model example:
     *
     * output_image[0]
     *   .sigmoid()
     *   .mul(255)
     *   .to('uint8')
     */
    const maskTensor =
      outputs
        .output_image[0]
        .sigmoid()
        .mul(
          255
        )
        .to(
          'uint8'
        );


    if (
      job.disposed
    ) {

      return null;

    }


    /*
     * Convert tensor → RawImage.
     */
    const maskImage =
      RawImage.fromTensor(
        maskTensor
      );


    if (
      !maskImage
    ) {

      throw new Error(
        'MASK_DATA_MISSING'
      );

    }


    await yieldToUI();


    /*
     * ----------------------------------------------------------
     * COMPOSITE ON ORIGINAL RESOLUTION
     * ----------------------------------------------------------
     */
    const outputCanvas =
      await compositeMask(
        file,
        maskImage
      );


    if (
      job.disposed
    ) {

      return null;

    }


    await yieldToUI();


    /*
     * ----------------------------------------------------------
     * EXPORT
     * ----------------------------------------------------------
     */
    const blob =
      await canvasToPNG(
        outputCanvas
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
  // WEBGPU ERROR DETECTION
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
        'failed to create session'
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


    switch (
      code
    ) {

      case
        'TRANSFORMERS_LOAD_FAILED':

        return 'errors.backgroundLibraryLoadFailed';


      case
        'IMAGE_DECODE_FAILED':

        return 'image.openFailed';


      case
        'BACKGROUND_EMPTY_RESULT':

        return 'image.backgroundRemovalFailed';


      case
        'IMAGE_TOO_LARGE':

        return 'image.backgroundRemovalFailed';


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


      this.el.dataset.processing =
        'false';


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
         * ------------------------------------------------------
         * Select engine
         * ------------------------------------------------------
         */

        const gpuAvailable =
          await canUseWebGPU();


        modelMode =
          gpuAvailable
            ? 'gpu'
            : 'cpu';


        this.processingMode =
          modelMode;


        let blob =
          null;


        /*
         * ------------------------------------------------------
         * Primary attempt
         * ------------------------------------------------------
         */

        try {

          blob =
            await runBiRefNet(
              this.file,
              this
            );

        } catch (
          primaryError
        ) {

          /*
           * ----------------------------------------------------
           * GPU → WASM fallback
           * ----------------------------------------------------
           */

          if (
            modelMode ===
              'gpu' &&
            isLikelyWebGPUError(
              primaryError
            )
          ) {

            console.warn(
              '[BiRefNet] WebGPU failed. Falling back to WASM:',
              primaryError
            );


            webgpuKnownBad =
              true;


            resetModel();


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
              await runBiRefNet(
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


        /*
         * ------------------------------------------------------
         * RESULT
         * ------------------------------------------------------
         */

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


        /*
         * ------------------------------------------------------
         * DOWNLOAD
         * ------------------------------------------------------
         */

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
          '[BiRefNet] Processing failed:',
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
         *
         * One image at a time keeps GPU/WASM memory under control.
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
          '[BiRefNet] ZIP failed:',
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
