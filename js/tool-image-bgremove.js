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
      '[BiRefNet Background Removal] Required elements not found.'
    );

    return;

  }


  // ============================================================
  // CONSTANTS
  // ============================================================

  /*
   * Transformers.js
   *
   * v3.8.1 is the current stable release documented by Hugging Face.
   */
  const TRANSFORMERS_VERSION =
    '3.8.1';


  const TRANSFORMERS_URL =
    `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`;


  /*
   * Full BiRefNet model.
   *
   * We intentionally use the full-resolution 1024px model rather
   * than the 512px variant because the purpose here is quality.
   */
  const MODEL_ID =
    'onnx-community/BiRefNet-ONNX';


  /*
   * FP16 weights are much smaller than FP32:
   *
   * FP16 ~= 490 MB
   * FP32 ~= 973 MB
   *
   * FP16 is the practical choice for browser WebGPU.
   */
  const MODEL_DTYPE =
    'fp16';


  const OUTPUT_FORMAT =
    'image/png';


  const OUTPUT_EXTENSION =
    'png';


  /*
   * WebGPU first.
   */
  const PREFER_WEBGPU =
    true;


  /*
   * Keep original source resolution.
   *
   * Unlike the previous version, we do NOT permanently resize the
   * user's source image to 1800px before generating the final file.
   */
  const MAX_OUTPUT_DIMENSION =
    8192;


  /*
   * Alpha refinement.
   *
   * Values in the middle are adjusted more strongly than already
   * opaque / already transparent pixels.
   */
  const ALPHA_LOW =
    0.08;


  const ALPHA_HIGH =
    0.92;


  /*
   * Mild edge sharpening.
   *
   * This is deliberately conservative so thin object details don't
   * get destroyed by aggressive thresholding.
   */
  const EDGE_GAMMA =
    0.92;


  /*
   * Halo removal.
   *
   * Designed primarily for white/light product-photo backgrounds.
   * The estimation is conservative and only strongly affects
   * partially transparent edge pixels.
   */
  const DECONTAMINATION_STRENGTH =
    0.72;


  const BORDER_SAMPLE_SIZE =
    12;


  /*
   * Browser canvas security / maximum-size protection.
   */
  const MAX_CANVAS_AREA =
    50000000;


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


  let processorPromise =
    null;


  let engineMode =
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

    const url =
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
            url;

        }
      );

    } finally {

      revokeUrl(
        url
      );

    }

  }


  // ============================================================
  // TRANSFORMERS.JS LOAD
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


            return module;

          }
        )
        .catch(
          error => {

            console.error(
              '[BiRefNet Background Removal] Transformers.js load failed:',
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
  // WEBGPU DETECTION
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
        '[BiRefNet Background Removal] WebGPU probe failed:',
        error
      );


      return false;

    }

  }


  // ============================================================
  // MODEL LOAD
  // ============================================================

  async function loadModel(
    mode,
    progressCallback
  ) {

    const {

      AutoModel,
      AutoProcessor

    } =
      await loadTransformers();


    /*
     * Keep a separate cache per engine.
     */
    if (
      mode ===
      'gpu'
    ) {

      if (
        !modelPromise
      ) {

        modelPromise =
          AutoModel.from_pretrained(
            MODEL_ID,
            {

              dtype:
                MODEL_DTYPE,

              device:
                'webgpu',

              progress_callback:
                progressCallback

            }
          );

      }


      if (
        !processorPromise
      ) {

        processorPromise =
          AutoProcessor.from_pretrained(
            MODEL_ID,
            {

              progress_callback:
                progressCallback

            }
          );

      }

    } else {

      if (
        !modelPromise
      ) {

        modelPromise =
          AutoModel.from_pretrained(
            MODEL_ID,
            {

              dtype:
                MODEL_DTYPE,

              device:
                'wasm',

              progress_callback:
                progressCallback

            }
          );

      }


      if (
        !processorPromise
      ) {

        processorPromise =
          AutoProcessor.from_pretrained(
            MODEL_ID,
            {

              progress_callback:
                progressCallback

            }
          );

      }

    }


    const model =
      await modelPromise;


    const processor =
      await processorPromise;


    return {

      model,

      processor

    };

  }


  // ============================================================
  // RESET MODEL CACHE
  // ============================================================

  function resetModelCache() {

    modelPromise =
      null;


    processorPromise =
      null;

  }


  // ============================================================
  // PROGRESS CALLBACK
  // ============================================================

  function createProgressHandler(
    job
  ) {

    return progress => {

      if (
        !job ||
        job.disposed ||
        !job.isProcessing
      ) {

        return;

      }


      if (
        !progress
      ) {

        return;

      }


      let percent =
        null;


      if (
        Number.isFinite(
          Number(
            progress.progress
          )
        )
      ) {

        percent =
          Number(
            progress.progress
          );

      }


      if (
        percent ===
        null &&
        Number.isFinite(
          Number(
            progress.loaded
          )
        ) &&
        Number.isFinite(
          Number(
            progress.total
          )
        ) &&
        Number(
          progress.total
        ) >
          0
      ) {

        percent =
          (
            Number(
              progress.loaded
            ) /
            Number(
              progress.total
            )
          ) *
          100;

      }


      if (
        percent ===
        null
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


      job.statusEl &&
        (
          job.statusEl.textContent =
            t(
              'image.loadingModelProgress',
              {
                percent
              }
            )
        );

    };

  }


  // ============================================================
  // MASK HELPERS
  // ============================================================

  function clamp01(
    value
  ) {

    return Math.max(
      0,
      Math.min(
        1,
        value
      )
    );

  }


  function smoothstep(
    edge0,
    edge1,
    x
  ) {

    if (
      edge0 ===
      edge1
    ) {

      return x <
        edge0
        ? 0
        : 1;

    }


    const t =
      clamp01(
        (
          x -
          edge0
        ) /
        (
          edge1 -
          edge0
        )
      );


    return (
      t *
      t *
      (
        3 -
        2 *
        t
      )
    );

  }


  function refineAlpha(
    alpha
  ) {

    let a =
      clamp01(
        alpha
      );


    /*
     * Preserve hard foreground/background decisions while
     * improving the transition band.
     */
    if (
      a <=
      ALPHA_LOW
    ) {

      return 0;

    }


    if (
      a >=
      ALPHA_HIGH
    ) {

      return 1;

    }


    a =
      smoothstep(
        ALPHA_LOW,
        ALPHA_HIGH,
        a
      );


    /*
     * Mild gamma correction.
     */
    a =
      Math.pow(
        a,
        EDGE_GAMMA
      );


    return clamp01(
      a
    );

  }


  // ============================================================
  // BACKGROUND COLOR ESTIMATION
  // ============================================================

  function estimateBorderColor(
    imageData
  ) {

    const {
      data,
      width,
      height
    } =
      imageData;


    const sample =
      Math.max(
        1,
        Math.min(
          BORDER_SAMPLE_SIZE,
          Math.floor(
            Math.min(
              width,
              height
            ) /
            4
          )
        )
      );


    let r =
      0;


    let g =
      0;


    let b =
      0;


    let count =
      0;


    function addPixel(
      x,
      y
    ) {

      const idx =
        (
          y *
          width +
          x
        ) *
        4;


      const alpha =
        data[
          idx +
          3
        ];


      if (
        alpha <
        250
      ) {

        return;

      }


      r +=
        data[
          idx
        ];


      g +=
        data[
          idx +
          1
        ];


      b +=
        data[
          idx +
          2
        ];


      count++;

    }


    for (
      let y = 0;
      y < sample;
      y++
    ) {

      for (
        let x = 0;
        x < width;
        x++
      ) {

        addPixel(
          x,
          y
        );


        addPixel(
          x,
          height -
            1 -
            y
        );

      }

    }


    for (
      let y =
        sample;
      y <
        height -
        sample;
      y++
    ) {

      for (
        let x = 0;
        x < sample;
        x++
      ) {

        addPixel(
          x,
          y
        );

      }


      for (
        let x =
          width -
          sample;
        x < width;
        x++
      ) {

        addPixel(
          x,
          y
        );

      }

    }


    if (
      count <=
      0
    ) {

      return {
        r:
          255,
        g:
          255,
        b:
          255
      };

    }


    return {

      r:
        r /
        count,

      g:
        g /
        count,

      b:
        b /
        count

    };

  }


  // ============================================================
  // HIGH QUALITY COMPOSITE
  // ============================================================

  function compositeToCanvas(
    sourceCanvas,
    maskImage
  ) {

    const width =
      sourceCanvas.width;


    const height =
      sourceCanvas.height;


    const sourceCtx =
      sourceCanvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
        }
      );


    if (
      !sourceCtx
    ) {

      throw new Error(
        'SOURCE_CANVAS_CONTEXT_FAILED'
      );

    }


    const sourceImageData =
      sourceCtx.getImageData(
        0,
        0,
        width,
        height
      );


    const maskData =
      maskImage.data;


    if (
      !maskData
    ) {

      throw new Error(
        'MASK_DATA_MISSING'
      );

    }


    if (
      maskData.length <
        width *
        height
    ) {

      throw new Error(
        'MASK_SIZE_INVALID'
      );

    }


    const background =
      estimateBorderColor(
        sourceImageData
      );


    const outCanvas =
      document.createElement(
        'canvas'
      );


    outCanvas.width =
      width;


    outCanvas.height =
      height;


    const outCtx =
      outCanvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
        }
      );


    if (
      !outCtx
    ) {

      throw new Error(
        'OUTPUT_CANVAS_CONTEXT_FAILED'
      );

    }


    const outImageData =
      outCtx.createImageData(
        width,
        height
      );


    const src =
      sourceImageData.data;


    const dst =
      outImageData.data;


    for (
      let i = 0,
      p = 0;
      i < dst.length;
      i += 4,
      p++
    ) {

      const alphaRaw =
        (
          Number(
            maskData[p]
          ) ||
          0
        ) /
        255;


      const alpha =
        refineAlpha(
          alphaRaw
        );


      const sr =
        src[i];


      const sg =
        src[i + 1];


      const sb =
        src[i + 2];


      /*
       * Conservative edge decontamination.
       *
       * Only modify RGB where the pixel is partially transparent.
       */
      let rr =
        sr;


      let rg =
        sg;


      let rb =
        sb;


      if (
        alpha >
          0.02 &&
        alpha <
          0.98
      ) {

        const strength =
          (
            1 -
            alpha
          ) *
          DECONTAMINATION_STRENGTH;


        rr =
          clampByte(
            (
              sr -
              (
                1 -
                alpha
              ) *
              background.r
            ) /
            Math.max(
              alpha,
              0.18
            ) *
            (
              0.18 +
              0.82 *
              strength
            ) +
            sr *
            (
              1 -
              strength
            )
          );


        rg =
          clampByte(
            (
              sg -
              (
                1 -
                alpha
              ) *
              background.g
            ) /
            Math.max(
              alpha,
              0.18
            ) *
            (
              0.18 +
              0.82 *
              strength
            ) +
            sg *
            (
              1 -
              strength
            )
          );


        rb =
          clampByte(
            (
              sb -
              (
                1 -
                alpha
              ) *
              background.b
            ) /
            Math.max(
              alpha,
              0.18
            ) *
            (
              0.18 +
              0.82 *
              strength
            ) +
            sb *
            (
              1 -
              strength
            )
          );

      }


      dst[i] =
        rr;


      dst[i + 1] =
        rg;


      dst[i + 2] =
        rb;


      dst[i + 3] =
        Math.round(
          alpha *
          255
        );

    }


    outCtx.putImageData(
      outImageData,
      0,
      0
    );


    return outCanvas;

  }


  function clampByte(
    value
  ) {

    if (
      !Number.isFinite(
        value
      )
    ) {

      return 0;

    }


    return Math.max(
      0,
      Math.min(
        255,
        Math.round(
          value
        )
      )
    );

  }


  // ============================================================
  // CANVAS IMAGE
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
      width *
      height >
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
        '2d'
      );


    if (
      !ctx
    ) {

      throw new Error(
        'SOURCE_CANVAS_CONTEXT_FAILED'
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
  // CREATE OUTPUT BLOB
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
                result
              ) {

                resolve(
                  result
                );

                return;

              }


              reject(
                new Error(
                  'PNG_EXPORT_FAILED'
                )
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
  // AI INFERENCE
  // ============================================================

  async function runBiRefNet(
    file,
    job
  ) {

    const transformers =
      await loadTransformers();


    const {
      RawImage
    } =
      transformers;


    /*
     * Create input image without downscaling the user's original
     * output image.
     *
     * The processor itself performs the model-required resize.
     */
    const image =
      await RawImage.fromBlob(
        file
      );


    const progressCallback =
      createProgressHandler(
        job
      );


    job.statusEl &&
      (
        job.statusEl.textContent =
          t(
            'image.loadingModelProgress',
            {
              percent:
                0
            }
          )
      );


    const {
      model,
      processor
    } =
      await loadModel(
        engineMode,
        progressCallback
      );


    if (
      job.disposed
    ) {

      return null;

    }


    await yieldToUI();


    job.statusEl &&
      (
        job.statusEl.textContent =
          t(
            'image.removingBackgroundProgress',
            {
              percent:
                0
            }
          )
      );


    /*
     * Processor resizes according to the model's own
     * preprocessor configuration (1024x1024 for this model).
     */
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
     * BiRefNet output is logits.
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
      !outputs.output_image
    ) {

      throw new Error(
        'BACKGROUND_EMPTY_RESULT'
      );

    }


    /*
     * Convert logits to alpha mask.
     *
     * Official Transformers.js model usage:
     *
     * output_image[0]
     *   .sigmoid()
     *   .mul(255)
     *   .to('uint8')
     */
    let mask =
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
     * Resize mask to source resolution.
     */
    mask =
      await RawImage
        .fromTensor(
          mask
        )
        .resize(
          image.width,
          image.height,
          {
            resample:
              3
          }
        );


    if (
      job.disposed
    ) {

      return null;

    }


    await yieldToUI();


    /*
     * The final composition is performed on the ORIGINAL source
     * resolution, not on the model's 1024px input.
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
      compositeToCanvas(
        sourceCanvas,
        mask
      );


    await yieldToUI();


    const outputBlob =
      await canvasToPNG(
        outputCanvas
      );


    return outputBlob;

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
        'webnn'
      ) ||

      text.includes(
        'requestadapter'
      ) ||

      text.includes(
        'device lost'
      ) ||

      text.includes(
        'backend'
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


    switch (
      code
    ) {

      case
        'TRANSFORMERS_LOAD_FAILED':

        return 'errors.backgroundLibraryLoadFailed';


      case
        'BACKGROUND_EMPTY_RESULT':

        return 'image.backgroundRemovalFailed';


      case
        'IMAGE_DECODE_FAILED':

        return 'image.openFailed';


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
         * Detect engine.
         */
        const useGpu =
          await canUseWebGPU();


        engineMode =
          useGpu
            ? 'gpu'
            : 'cpu';


        this.processingMode =
          engineMode;


        /*
         * First attempt.
         */
        let blob =
          null;


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
           * WebGPU failure → hard fallback to WASM.
           */
          if (
            engineMode ===
              'gpu' &&
            (
              isLikelyWebGPUError(
                primaryError
              ) ||
              !blob
            )
          ) {

            console.warn(
              '[BiRefNet Background Removal] WebGPU failed. Switching to WASM.',
              primaryError
            );


            webgpuKnownBad =
              true;


            resetModelCache();


            engineMode =
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


        this.clearResult();


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
          '[BiRefNet Background Removal] Error:',
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
         * Sequential processing is intentional.
         *
         * BiRefNet is significantly heavier than ISNet and parallel
         * inference can exhaust GPU memory on normal desktops.
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
          '[BiRefNet Background Removal] ZIP failed:',
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
