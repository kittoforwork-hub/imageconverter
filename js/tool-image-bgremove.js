/* global window, document, URL, JSZip */

/**
 * ============================================================
 * KITTO WORKSHOP UTILITY
 * AI BACKGROUND REMOVAL
 *
 * Single-file version
 *
 * - ไม่ต้องมี transformers.js แยก
 * - ไม่ต้องแก้ index.html
 * - โหลด Transformers.js แบบ dynamic import
 * - ใช้ Hugging Face public model
 * - WebGPU -> WASM fallback
 * - Browser cache
 * - Q8 quantized model
 * - ประมวลผลในเครื่องผู้ใช้
 *
 * Model:
 *   Ko033/isnet-general-use-onnx
 *
 * Pipeline:
 *   image-segmentation
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
  // CONFIG
  // ============================================================

  /*
   * Transformers.js
   *
   * ใช้ dynamic import ดังนั้น
   * index.html ไม่ต้องเปลี่ยน
   */
  const TRANSFORMERS_URL =
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';


  /*
   * Hugging Face model
   */
  const MODEL_ID =
    'Ko033/isnet-general-use-onnx';


  /*
   * Q8:
   * dynamic int8 / quantized
   *
   * ลดขนาด model และลด memory
   * เมื่อเทียบกับ fp32
   */
  const MODEL_DTYPE =
    'q8';


  /*
   * จำกัดขนาดภาพก่อน inference
   *
   * ภาพใหญ่มากจะถูกย่อก่อนเข้า model
   * เพื่อประหยัด RAM / VRAM
   *
   * ผลลัพธ์สุดท้ายจะมีขนาดเท่ากับ
   * ภาพที่นำเข้า model
   */
  const MAX_IMAGE_SIZE =
    1800;


  /*
   * minimum alpha threshold
   *
   * ค่า 0 = ไม่มี threshold
   *
   * ใช้เพื่อให้ขอบ soft edge ยังคงอยู่
   */
  const ALPHA_CUTOFF =
    0;


  /*
   * ลำดับความสำคัญของ device
   *
   * WebGPU -> WASM
   */
  const DEVICE_WEBGPU =
    'webgpu';

  const DEVICE_WASM =
    'wasm';


  // ============================================================
  // STATE
  // ============================================================

  let jobSeq =
    0;

  const jobs =
    [];


  // ============================================================
  // TRANSFORMERS STATE
  // ============================================================

  let transformersPromise =
    null;

  let transformersModule =
    null;

  let pipelinePromise =
    null;

  let segmenter =
    null;

  let activeDevice =
    null;


  // ============================================================
  // UTILS
  // ============================================================

  function clamp(
    value,
    min,
    max
  ) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }


  function safeNumber(
    value,
    fallback = 0
  ) {
    const n =
      Number(
        value
      );

    return Number.isFinite(
      n
    )
      ? n
      : fallback;
  }


  // ============================================================
  // WEBGPU CHECK
  // ============================================================

  function isWebGPUSupported() {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.gpu
    );
  }


  // ============================================================
  // TRANSFORMERS ENV CONFIG
  // ============================================================

  function configureTransformersEnv(
    env
  ) {
    if (
      !env
    ) {
      return;
    }


    /*
     * อนุญาต remote model
     */
    try {
      env.allowRemoteModels =
        true;
    } catch (_) {}


    /*
     * ใช้ browser cache
     */
    try {
      env.useBrowserCache =
        true;
    } catch (_) {}


    /*
     * WASM cache
     */
    try {
      env.useWasmCache =
        true;
    } catch (_) {}


    /*
     * ไม่ใช้ local model
     *
     * เพราะเราใช้ Hugging Face
     */
    try {
      env.allowLocalModels =
        false;
    } catch (_) {}


    /*
     * WASM threads
     *
     * ตั้ง 1 เพื่อไม่ต้องพึ่ง
     * crossOriginIsolated
     */
    try {
      if (
        env.backends &&
        env.backends.onnx &&
        env.backends.onnx.wasm
      ) {
        env.backends.onnx.wasm.numThreads =
          1;

        /*
         * ป้องกัน multi-thread config
         * ที่ browser ไม่มี COOP/COEP
         */
        env.backends.onnx.wasm.simd =
          true;
      }
    } catch (_) {}
  }


  // ============================================================
  // LOAD TRANSFORMERS.JS
  // ============================================================

  async function loadTransformers() {

    if (
      transformersModule
    ) {
      return transformersModule;
    }


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
          mod => {

            if (
              !mod
            ) {
              throw new Error(
                'Transformers.js ไม่สามารถโหลดได้'
              );
            }


            if (
              typeof mod.pipeline !==
              'function'
            ) {
              throw new Error(
                'Transformers.js pipeline() ไม่พร้อมใช้งาน'
              );
            }


            configureTransformersEnv(
              mod.env
            );


            transformersModule =
              mod;


            return mod;
          }
        )
        .catch(
          error => {

            transformersModule =
              null;

            transformersPromise =
              null;

            console.error(
              'Transformers.js load failed:',
              error
            );

            throw error;
          }
        );


    return transformersPromise;
  }


  // ============================================================
  // MODEL PROGRESS
  // ============================================================

  function handleModelProgress(
    info,
    onProgress
  ) {
    if (
      typeof onProgress !==
      'function'
    ) {
      return;
    }


    if (
      !info
    ) {
      return;
    }


    /*
     * Transformers.js progress object
     *
     * status:
     *   init
     *   progress
     *   done
     */
    const status =
      typeof info.status === 'string'
        ? info.status.toLowerCase()
        : '';


    let progress =
      safeNumber(
        info.progress,
        0
      );


    progress =
      clamp(
        progress,
        0,
        100
      );


    if (
      status ===
      'progress'
    ) {
      onProgress(
        Math.round(
          progress
        ),
        'download'
      );

      return;
    }


    if (
      status ===
      'init'
    ) {
      onProgress(
        0,
        'download'
      );

      return;
    }


    if (
      status ===
      'done'
    ) {
      onProgress(
        60,
        'download'
      );

      return;
    }


    /*
     * บาง runtime อาจใช้
     * status อื่น
     */
    if (
      progress > 0
    ) {
      onProgress(
        Math.round(
          progress
        ),
        'download'
      );
    }
  }


  // ============================================================
  // CREATE PIPELINE
  // ============================================================

  async function createSegmenter(
    onProgress
  ) {

    /*
     * ถ้ามี pipeline อยู่แล้ว
     * ใช้ตัวเดิมทันที
     */
    if (
      segmenter
    ) {
      return segmenter;
    }


    /*
     * ถ้ากำลังโหลดอยู่
     * ให้ทุก job รอ pipeline เดียวกัน
     */
    if (
      pipelinePromise
    ) {
      return pipelinePromise;
    }


    pipelinePromise =
      (async () => {

        const mod =
          await loadTransformers();


        /*
         * ======================================================
         * TRY WEBGPU
         * ======================================================
         */

        if (
          isWebGPUSupported()
        ) {
          try {

            activeDevice =
              DEVICE_WEBGPU;


            onProgress?.(
              0,
              'download'
            );


            const pipe =
              await mod.pipeline(
                'image-segmentation',
                MODEL_ID,
                {
                  dtype:
                    MODEL_DTYPE,

                  device:
                    DEVICE_WEBGPU,

                  progress_callback:
                    info => {
                      handleModelProgress(
                        info,
                        onProgress
                      );
                    }
                }
              );


            segmenter =
              pipe;


            return segmenter;

          } catch (
            webgpuError
          ) {

            console.warn(
              'WebGPU failed. Falling back to WASM.',
              webgpuError
            );


            /*
             * reset
             */
            segmenter =
              null;

            activeDevice =
              null;


            /*
             * pipeline ที่ล้มอาจยังถือ resource
             */
            try {
              if (
                typeof segmenter?.dispose ===
                'function'
              ) {
                await segmenter.dispose();
              }
            } catch (_) {}
          }
        }


        /*
         * ======================================================
         * WASM
         * ======================================================
         */

        activeDevice =
          DEVICE_WASM;


        onProgress?.(
          0,
          'download'
        );


        const pipe =
          await mod.pipeline(
            'image-segmentation',
            MODEL_ID,
            {
              dtype:
                MODEL_DTYPE,

              device:
                DEVICE_WASM,

              progress_callback:
                info => {
                  handleModelProgress(
                    info,
                    onProgress
                  );
                }
            }
          );


        segmenter =
          pipe;


        return segmenter;

      })()
        .catch(
          error => {

            segmenter =
              null;

            pipelinePromise =
              null;

            activeDevice =
              null;

            throw error;
          }
        );


    return pipelinePromise;
  }


  // ============================================================
  // IMAGE LOAD
  // ============================================================

  async function loadImage(
    file
  ) {

    const url =
      URL.createObjectURL(
        file
      );


    try {

      const image =
        await new Promise(
          (
            resolve,
            reject
          ) => {

            const img =
              new Image();


            img.onload =
              () => resolve(
                img
              );


            img.onerror =
              () =>
                reject(
                  new Error(
                    'ไม่สามารถอ่านรูปภาพได้'
                  )
                );


            img.src =
              url;
          }
        );


      return image;

    } finally {

      try {
        URL.revokeObjectURL(
          url
        );
      } catch (_) {}

    }
  }


  // ============================================================
  // CREATE INPUT CANVAS
  // ============================================================

  async function createInputCanvas(
    file
  ) {

    const image =
      await loadImage(
        file
      );


    const originalWidth =
      image.naturalWidth ||
      image.width;

    const originalHeight =
      image.naturalHeight ||
      image.height;


    if (
      originalWidth <= 0 ||
      originalHeight <= 0
    ) {
      throw new Error(
        'ขนาดรูปภาพไม่ถูกต้อง'
      );
    }


    /*
     * Resize แบบรักษาสัดส่วน
     */
    let width =
      originalWidth;

    let height =
      originalHeight;


    const longest =
      Math.max(
        width,
        height
      );


    if (
      longest >
      MAX_IMAGE_SIZE
    ) {

      const ratio =
        MAX_IMAGE_SIZE /
        longest;


      width =
        Math.max(
          1,
          Math.round(
            width *
            ratio
          )
        );


      height =
        Math.max(
          1,
          Math.round(
            height *
            ratio
          )
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
          willReadFrequently:
            true
        }
      );


    if (
      !ctx
    ) {
      throw new Error(
        'Browser ไม่รองรับ Canvas 2D'
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
      image,
      0,
      0,
      width,
      height
    );


    return {
      canvas,
      width,
      height,
      originalWidth,
      originalHeight
    };
  }


  // ============================================================
  // MASK EXTRACTION
  // ============================================================

  function extractMask(
    output
  ) {

    /*
     * image-segmentation pipeline:
     *
     * [
     *   {
     *     label,
     *     score,
     *     mask: RawImage
     *   }
     * ]
     */


    if (
      Array.isArray(
        output
      )
    ) {

      /*
       * โดยปกติ ISNet จะได้
       * mask หลักตัวแรก
       */
      for (
        const item of output
      ) {

        if (
          item &&
          item.mask
        ) {
          return item.mask;
        }
      }
    }


    /*
     * fallback:
     * output.mask
     */
    if (
      output &&
      output.mask
    ) {
      return output.mask;
    }


    /*
     * fallback:
     * output เป็น RawImage โดยตรง
     */
    if (
      output &&
      output.data &&
      output.width &&
      output.height
    ) {
      return output;
    }


    return null;
  }


  // ============================================================
  // GET MASK CHANNEL DATA
  // ============================================================

  function getMaskDimensions(
    mask
  ) {

    const width =
      safeNumber(
        mask?.width
      );


    const height =
      safeNumber(
        mask?.height
      );


    const channels =
      Math.max(
        1,
        safeNumber(
          mask?.channels,
          1
        )
      );


    return {
      width,
      height,
      channels
    };
  }


  // ============================================================
  // RESIZE MASK
  // ============================================================

  async function resizeMask(
    mask,
    width,
    height
  ) {

    if (
      !mask
    ) {
      throw new Error(
        'AI mask ว่าง'
      );
    }


    const current =
      getMaskDimensions(
        mask
      );


    if (
      current.width === width &&
      current.height === height
    ) {
      return mask;
    }


    /*
     * RawImage.resize()
     */
    if (
      typeof mask.resize ===
      'function'
    ) {

      try {

        return await mask.resize(
          width,
          height,
          {
            resample:
              'bilinear'
          }
        );

      } catch (
        error
      ) {

        console.warn(
          'Mask resize warning:',
          error
        );
      }
    }


    /*
     * ถ้า resize ไม่ได้
     * ใช้ browser canvas เป็น fallback
     */
    throw new Error(
      'ไม่สามารถปรับขนาด AI mask ได้'
    );
  }


  // ============================================================
  // MIN-MAX NORMALIZE MASK
  // ============================================================

  function normalizeMaskMinMax(
    data
  ) {

    if (
      !data ||
      !data.length
    ) {
      throw new Error(
        'AI mask ไม่มีข้อมูล'
      );
    }


    let min =
      Infinity;

    let max =
      -Infinity;


    /*
     * หา min / max
     */
    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const value =
        safeNumber(
          data[i],
          0
        );


      if (
        value <
        min
      ) {
        min =
          value;
      }


      if (
        value >
        max
      ) {
        max =
          value;
      }
    }


    /*
     * ป้องกัน division by zero
     */
    const range =
      max -
      min;


    /*
     * ถ้า mask แบนทั้งหมด
     */
    if (
      range <=
      0.000001
    ) {

      return {
        min,
        max,
        range,
        data:
          new Float32Array(
            data.length
          )
      };
    }


    /*
     * normalize เป็น 0-1
     */
    const normalized =
      new Float32Array(
        data.length
      );


    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      normalized[i] =
        clamp(
          (
            safeNumber(
              data[i],
              min
            ) -
            min
          ) /
          range,
          0,
          1
        );
    }


    return {
      min,
      max,
      range,
      data:
        normalized
    };
  }


  // ============================================================
  // MASK TO ALPHA
  // ============================================================

  function maskValueToAlpha(
    value
  ) {

    let alpha =
      safeNumber(
        value,
        0
      );


    /*
     * ถ้า data เป็น 0-1
     */
    if (
      alpha >= 0 &&
      alpha <= 1
    ) {
      alpha *=
        255;
    }


    alpha =
      clamp(
        alpha,
        0,
        255
      );


    /*
     * optional threshold
     */
    if (
      ALPHA_CUTOFF > 0 &&
      alpha <
      ALPHA_CUTOFF
    ) {
      return 0;
    }


    return Math.round(
      alpha
    );
  }


  // ============================================================
  // CREATE TRANSPARENT PNG
  // ============================================================

  async function createTransparentPng(
    file,
    rawMask
  ) {

    /*
     * โหลดและ resize image
     */
    const source =
      await createInputCanvas(
        file
      );


    const width =
      source.width;

    const height =
      source.height;


    /*
     * resize mask ให้ตรงกับ image
     */
    const mask =
      await resizeMask(
        rawMask,
        width,
        height
      );


    const maskInfo =
      getMaskDimensions(
        mask
      );


    const maskData =
      mask.data;


    if (
      !maskData
    ) {
      throw new Error(
        'AI mask ไม่มี pixel data'
      );
    }


    /*
     * ========================================================
     * NORMALIZE
     * ========================================================
     *
     * โมเดล ISNet ระบุให้
     * min-max normalize ต่อ image
     * ก่อนนำไปใช้เป็น alpha matte
     */
    const normalized =
      normalizeMaskMinMax(
        maskData
      );


    const normalizedData =
      normalized.data;


    const totalPixels =
      width *
      height;


    const channels =
      Math.max(
        1,
        maskInfo.channels
      );


    /*
     * ========================================================
     * OUTPUT CANVAS
     * ========================================================
     */

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
        'ไม่สามารถสร้าง output canvas ได้'
      );
    }


    /*
     * draw original
     */
    ctx.drawImage(
      source.canvas,
      0,
      0
    );


    /*
     * get pixels
     */
    const imageData =
      ctx.getImageData(
        0,
        0,
        width,
        height
      );


    const pixels =
      imageData.data;


    /*
     * ========================================================
     * APPLY ALPHA
     * ========================================================
     */

    for (
      let i = 0;
      i < totalPixels;
      i++
    ) {

      const pixelIndex =
        i *
        4;


      /*
       * mask 1 channel
       *
       * ถ้ามีมากกว่า 1 channel
       * ใช้ channel แรก
       */
      const maskIndex =
        i *
        channels;


      const alpha =
        maskValueToAlpha(
          normalizedData[
            maskIndex
          ]
        );


      pixels[
        pixelIndex + 3
      ] =
        alpha;
    }


    /*
     * เขียนกลับ
     */
    ctx.putImageData(
      imageData,
      0,
      0
    );


    /*
     * ========================================================
     * PNG
     * ========================================================
     */

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
                  'ไม่สามารถสร้าง PNG ได้'
                )
              );
            },
            'image/png'
          );
        }
      );


    return blob;
  }


  // ============================================================
  // RUN AI
  // ============================================================

  async function runBackgroundRemoval(
    file,
    onProgress
  ) {

    /*
     * ========================================================
     * MODEL
     * ========================================================
     */

    const pipe =
      await createSegmenter(
        onProgress
      );


    /*
     * ========================================================
     * INFERENCE
     * ========================================================
     */

    onProgress?.(
      65,
      'inference'
    );


    const output =
      await pipe(
        file
      );


    onProgress?.(
      88,
      'postprocess'
    );


    /*
     * ========================================================
     * EXTRACT MASK
     * ========================================================
     */

    const mask =
      extractMask(
        output
      );


    if (
      !mask
    ) {
      console.error(
        'Unexpected segmentation output:',
        output
      );

      throw new Error(
        'ไม่พบ AI mask จากโมเดล'
      );
    }


    /*
     * ========================================================
     * CREATE PNG
     * ========================================================
     */

    const blob =
      await createTransparentPng(
        file,
        mask
      );


    onProgress?.(
      100,
      'done'
    );


    return blob;
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


      /*
       * original image URL
       */
      this.objectUrl =
        URL.createObjectURL(
          this.file
        );


      /*
       * DOM refs
       */
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


      /*
       * ======================================================
       * FILE INFO
       * ======================================================
       */

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


      /*
       * ======================================================
       * BEFORE
       * ======================================================
       */

      if (
        this.beforeImg
      ) {
        this.beforeImg.src =
          this.objectUrl;
      }


      /*
       * ======================================================
       * STATE
       * ======================================================
       */

      el.dataset.processing =
        'false';


      /*
       * ======================================================
       * PROCESS
       * ======================================================
       */

      if (
        this.processBtn
      ) {

        this.processBtn.addEventListener(
          'click',
          () => {
            this.process();
          }
        );
      }


      /*
       * ======================================================
       * REMOVE JOB
       * ======================================================
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


            const index =
              jobs.indexOf(
                this
              );


            if (
              index >= 0
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


      /*
       * initial language
       */
      this.updateLanguageUI();
    }


    // ========================================================
    // LANGUAGE
    // ========================================================

    updateLanguageUI() {

      if (
        !this.statusEl
      ) {
        return;
      }


      /*
       * processing:
       * อย่าทับข้อความ
       */
      if (
        this.isProcessing
      ) {
        return;
      }


      /*
       * READY
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
       * ERROR
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
       * WAITING
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
        clamp(
          safeNumber(
            pct,
            0
          ),
          0,
          100
        );


      this.progressFill.style.width =
        value +
        '%';
    }


    // ========================================================
    // STATUS
    // ========================================================

    setStatus(
      key,
      params
    ) {

      if (
        !this.statusEl
      ) {
        return;
      }


      this.statusEl.textContent =
        t(
          key,
          params
        );
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


      if (
        this.processBtn
      ) {
        this.processBtn.disabled =
          true;
      }


      if (
        this.statusEl
      ) {

        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );
      }


      this.setProgress(
        0
      );


      this.setStatus(
        'image.preparingModel'
      );


      try {

        /*
         * ====================================================
         * AI
         * ====================================================
         */

        const blob =
          await runBackgroundRemoval(
            this.file,
            (
              pct,
              stage
            ) => {

              /*
               * progress
               */
              this.setProgress(
                pct
              );


              /*
               * model download
               */
              if (
                stage ===
                'download'
              ) {

                this.statusEl.textContent =
                  t(
                    'image.loadingModelProgress',
                    {
                      percent:
                        Math.round(
                          pct
                        )
                    }
                  );


                return;
              }


              /*
               * inference
               */
              if (
                stage ===
                'inference'
              ) {

                this.statusEl.textContent =
                  t(
                    'image.removingBackgroundProgress',
                    {
                      percent:
                        Math.round(
                          pct
                        )
                    }
                  );


                return;
              }


              /*
               * postprocess
               */
              if (
                stage ===
                'postprocess'
              ) {

                this.statusEl.textContent =
                  t(
                    'image.removingBackgroundProgress',
                    {
                      percent:
                        Math.round(
                          pct
                        )
                    }
                  );


                return;
              }
            }
          );


        /*
         * ====================================================
         * OLD URL
         * ====================================================
         */

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


        /*
         * ====================================================
         * SAVE RESULT
         * ====================================================
         */

        this.resultBlob =
          blob;


        this.resultUrl =
          URL.createObjectURL(
            blob
          );


        /*
         * ====================================================
         * PREVIEW
         * ====================================================
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
         * ====================================================
         * DOWNLOAD
         * ====================================================
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


        /*
         * ====================================================
         * DONE
         * ====================================================
         */

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


        /*
         * refresh bulk UI
         */
        updateBulkUI();


      } catch (
        error
      ) {

        console.error(
          'Background removal error:',
          error
        );


        /*
         * ==================================================
         * ERROR
         * ==================================================
         */

        this.errorKey =
          'image.backgroundRemovalFailed';


        this.errorParams =
          {
            message:
              error?.message ||
              String(
                error
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


        if (
          this.processBtn
        ) {
          this.processBtn.disabled =
            false;
        }


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


      /*
       * original preview
       */
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


      /*
       * result preview
       */
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


      if (
        fileInput
      ) {
        fileInput.value =
          '';
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
         * ทีละไฟล์
         *
         * สำคัญ:
         * model pipeline ใช้ resource สูง
         */
        for (
          const job of
          jobs
        ) {

          /*
           * ข้ามไฟล์ที่เสร็จแล้ว
           */
          if (
            job.resultBlob
          ) {
            continue;
          }


          /*
           * process
           */
          await job.process();


          /*
           * คืน control ให้ browser
           */
          await U.yieldToUI();
        }

      } finally {

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


            let number =
              2;


            while (
              usedNames.has(
                name
              )
            ) {

              name =
                `${base}-nobg-${number++}.png`;
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
        error
      ) {

        console.error(
          'Background removal ZIP failed:',
          error
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


      if (
        fileInput
      ) {
        fileInput.value =
          '';
      }


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
       * process all
       */
      if (
        !processAllBtn.disabled
      ) {

        processAllBtn.textContent =
          t(
            'image.removeBackgroundAll'
          );
      }


      /*
       * ZIP
       */
      if (
        !downloadZipBtn.disabled
      ) {

        downloadZipBtn.textContent =
          t(
            'image.downloadZip'
          );
      }


      /*
       * jobs
       */
      jobs.forEach(
        job => {
          job.updateLanguageUI();
        }
      );
    }
  );


  // ============================================================
  // DEBUG API
  // ============================================================

  window.KittoBGRemove = {

    /*
     * model
     */
    get model() {
      return MODEL_ID;
    },


    /*
     * dtype
     */
    get dtype() {
      return MODEL_DTYPE;
    },


    /*
     * current device
     */
    get device() {
      return activeDevice;
    },


    /*
     * WebGPU
     */
    get webgpu() {
      return isWebGPUSupported();
    },


    /*
     * preload model
     */
    async loadModel() {

      return createSegmenter(
        () => {}
      );
    },


    /*
     * dispose model
     */
    async dispose() {

      try {

        if (
          segmenter &&
          typeof segmenter.dispose ===
          'function'
        ) {

          await segmenter.dispose();
        }

      } catch (
        error
      ) {

        console.warn(
          'Model dispose warning:',
          error
        );
      }


      segmenter =
        null;


      pipelinePromise =
        null;
    }

  };


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateBulkUI();

})();
