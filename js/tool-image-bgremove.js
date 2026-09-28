/* global window, document, URL, JSZip */
(() => {
  'use strict';

  const U = window.Utils || {};
  const I18n = window.I18n || null;

  const t = (key, values) => {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, values);
    }

    return String(key);
  };

  const el = {
    dropzone: document.getElementById('dz-img-bgremove'),
    fileInput: document.getElementById('input-img-bgremove'),
    bulkbar: document.getElementById('bulk-img-bgremove'),
    count: document.getElementById('count-img-bgremove'),
    clearAll: document.getElementById('clearAll-img-bgremove'),
    processAll: document.getElementById('processAll-img-bgremove'),
    downloadZip: document.getElementById('downloadZip-img-bgremove'),
    jobs: document.getElementById('jobs-img-bgremove'),
    template: document.getElementById('tpl-img-bgremove')
  };

  if (Object.values(el).some(v => !v)) {
    console.warn(
      '[Image Background Removal] Required elements not found.'
    );
    return;
  }

  // ============================================================
  // LOW-RAM CONFIG
  // ============================================================

  const TRANSFORMERS_VERSION = '3.8.1';

  const TRANSFORMERS_URL =
    `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`;

  /*
   * Browser-ready BiRefNet Lite 512x512.
   */
  const MODEL_ID =
    'studioludens/birefnet-lite-512';

  /*
   * WebGPU:
   * - fp16 = smaller GPU memory footprint
   */
  const GPU_DTYPE =
    'fp16';

  /*
   * WASM:
   * - fp32 = stable CPU fallback
   */
  const CPU_DTYPE =
    'fp32';

  /*
   * The actual model input is 512x512.
   *
   * We intentionally do not feed 1024px into the AI stage.
   */
  const AI_MAX_DIMENSION =
    512;

  /*
   * Protect final canvas/ImageData usage.
   */
  const MAX_OUTPUT_PIXELS =
    8 * 1000 * 1000;

  const MAX_OUTPUT_DIMENSION =
    4500;

  const OUTPUT_FORMAT =
    'image/png';

  const OUTPUT_EXTENSION =
    'png';

  /*
   * WebGPU is allowed.
   *
   * If it stalls, the main thread watchdog will terminate the
   * worker and retry the job using WASM CPU.
   */
  const PREFER_GPU =
    true;

  /*
   * Once GPU stalls/fails badly during this page session,
   * disable further GPU attempts and use CPU directly.
   */
  let gpuDisabledForSession =
    false;

  /*
   * Keep the worker/model for a short period.
   */
  const WORKER_IDLE_TIMEOUT =
    60 * 1000;

  /*
   * Watchdog timeouts.
   *
   * Loading may legitimately take longer because the model
   * can be downloaded from Hugging Face/CDN.
   *
   * Inference has a shorter timeout because this is the part
   * that can hard-stall on problematic WebGPU implementations.
   */
  const WATCHDOG = {
    prepare:
      30 * 1000,

    load:
      90 * 1000,

    aiGpu:
      45 * 1000,

    aiCpu:
      120 * 1000,

    output:
      60 * 1000
  };

  // ============================================================
  // STATE
  // ============================================================

  const jobs = [];

  let jobSeq =
    0;

  let worker =
    null;

  let workerUrl =
    null;

  let idleTimer =
    null;

  const pending =
    new Map();

  /*
   * Only one inference may actively use the worker/model.
   *
   * This prevents multiple buttons/jobs from racing against
   * the same Transformers.js model instance and disposing it
   * while another job is using it.
   */
  let workerQueue =
    Promise.resolve();

  // ============================================================
  // HELPERS
  // ============================================================

  const yieldUI = async () => {
    if (
      typeof U.yieldToUI ===
      'function'
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
  };

  const baseName = name => {
    if (
      typeof U.baseName ===
      'function'
    ) {
      return U.baseName(name);
    }

    return String(
      name || 'image'
    ).replace(
      /\.[^.]+$/,
      ''
    );
  };

  const formatBytes = bytes => {
    if (
      typeof U.formatBytes ===
      'function'
    ) {
      return U.formatBytes(bytes);
    }

    if (
      !Number.isFinite(bytes)
    ) {
      return '';
    }

    const units = [
      'B',
      'KB',
      'MB',
      'GB'
    ];

    let n =
      Math.max(
        0,
        bytes
      );

    let i =
      0;

    while (
      n >= 1024 &&
      i <
        units.length - 1
    ) {
      n /= 1024;
      i++;
    }

    return `${n.toFixed(
      i ? 1 : 0
    )} ${units[i]}`;
  };

  const downloadBlob = (
    blob,
    filename
  ) => {
    if (
      typeof U.downloadBlob ===
      'function'
    ) {
      U.downloadBlob(
        blob,
        filename
      );
      return;
    }

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        'a'
      );

    a.href =
      url;

    a.download =
      filename;

    a.click();

    setTimeout(
      () => {
        revoke(url);
      },
      1000
    );
  };

  const revoke = url => {
    if (!url) {
      return;
    }

    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  const errorKey = error => {
    const code =
      error &&
      typeof error.message ===
        'string'
        ? error.message
        : '';

    if (
      code ===
      'BACKGROUND_TRANSFORMERS_LOAD_FAILED'
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
  };

  // ============================================================
  // WORKER SOURCE
  // ============================================================

  function workerSource() {
    return `
      'use strict';

      const TRANSFORMERS_URL =
        ${JSON.stringify(
          TRANSFORMERS_URL
        )};

      const MODEL_ID =
        ${JSON.stringify(
          MODEL_ID
        )};

      const GPU_DTYPE =
        ${JSON.stringify(
          GPU_DTYPE
        )};

      const CPU_DTYPE =
        ${JSON.stringify(
          CPU_DTYPE
        )};

      const AI_MAX_DIMENSION =
        ${AI_MAX_DIMENSION};

      const MAX_OUTPUT_PIXELS =
        ${MAX_OUTPUT_PIXELS};

      const MAX_OUTPUT_DIMENSION =
        ${MAX_OUTPUT_DIMENSION};

      const OUTPUT_FORMAT =
        ${JSON.stringify(
          OUTPUT_FORMAT
        )};

      const PREFER_GPU =
        ${String(
          PREFER_GPU
        )};

      let tf =
        null;

      let tfPromise =
        null;

      let processor =
        null;

      let model =
        null;

      let loadedMode =
        null;

      let gpuKnownBad =
        false;

      const cancelled =
        new Set();

      // ========================================================
      // POST
      // ========================================================

      const post = (
        type,
        payload = {},
        transfer = undefined
      ) => {

        const message = {
          type,
          ...payload
        };

        if (
          Array.isArray(transfer) &&
          transfer.length
        ) {

          self.postMessage(
            message,
            transfer
          );

        } else {

          self.postMessage(
            message
          );

        }

      };

      // ========================================================
      // CANCEL
      // ========================================================

      const isCancelled =
        jobId =>
          !!jobId &&
          cancelled.has(
            jobId
          );

      const checkCancel =
        jobId => {

          if (
            isCancelled(
              jobId
            )
          ) {

            throw new Error(
              'BACKGROUND_CANCELLED'
            );

          }

        };

      // ========================================================
      // PROGRESS
      // ========================================================

      function progress(
        jobId,
        phase,
        key,
        current,
        total = 100
      ) {

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
            phase,
            key,
            current,
            total
          }
        );

      }

      // ========================================================
      // LOAD TRANSFORMERS.JS
      // ========================================================

      async function loadTF() {

        if (tf) {
          return tf;
        }

        if (tfPromise) {
          return tfPromise;
        }

        tfPromise =
          import(
            TRANSFORMERS_URL
          )
            .then(
              module => {

                if (!module) {

                  throw new Error(
                    'BACKGROUND_TRANSFORMERS_LOAD_FAILED'
                  );

                }

                tf =
                  module;

                try {

                  if (tf.env) {

                    tf.env.allowRemoteModels =
                      true;

                    tf.env.allowLocalModels =
                      false;

                    if (
                      tf.env.backends &&
                      tf.env.backends.onnx &&
                      tf.env.backends.onnx.wasm
                    ) {

                      /*
                       * Low-RAM CPU mode.
                       * One WASM thread avoids spawning
                       * multiple worker threads and
                       * multiplying memory usage.
                       */
                      tf.env.backends.onnx.wasm.numThreads =
                        1;

                    }

                    if (
                      Object.prototype.hasOwnProperty.call(
                        tf.env,
                        'logLevel'
                      )
                    ) {

                      tf.env.logLevel =
                        40;

                    }

                  }

                } catch (_) {}

                return tf;

              }
            )
            .catch(
              error => {

                console.error(
                  '[BG Worker] Transformers.js load failed:',
                  error
                );

                tfPromise =
                  null;

                throw new Error(
                  'BACKGROUND_TRANSFORMERS_LOAD_FAILED'
                );

              }
            );

        return tfPromise;

      }

      // ========================================================
      // DISPOSE MODEL
      // ========================================================

      async function disposeModel() {

        if (
          model &&
          typeof model.dispose ===
            'function'
        ) {

          try {
            await model.dispose();
          } catch (_) {}

        }

        model =
          null;

        processor =
          null;

        loadedMode =
          null;

      }

      // ========================================================
      // WEBGPU PROBE
      // ========================================================

      async function probeWebGPU() {

        if (
          gpuKnownBad
        ) {
          return false;
        }

        if (
          typeof navigator ===
            'undefined' ||
          !navigator.gpu ||
          typeof navigator.gpu.requestAdapter !==
            'function'
        ) {

          return false;

        }

        try {

          /*
           * IMPORTANT:
           * Do not pass powerPreference.
           *
           * Chrome on Windows can log:
           * "powerPreference option is currently ignored"
           * which is harmless, but there is no reason to
           * request it here.
           */

          const adapterPromise =
            navigator.gpu.requestAdapter();

          /*
           * Adapter request itself should never sit forever.
           */
          const timeoutPromise =
            new Promise(
              resolve => {

                setTimeout(
                  () => {
                    resolve(
                      null
                    );
                  },
                  4000
                );

              }
            );

          const adapter =
            await Promise.race([
              adapterPromise,
              timeoutPromise
            ]);

          if (!adapter) {
            return false;
          }

          /*
           * This model's 512 graph uses up to 7 storage
           * buffers per shader stage according to the model
           * documentation.
           *
           * Keep a small safety margin and reject very old/
           * restricted adapters.
           */
          const limits =
            adapter.limits ||
            {};

          const maxStorageBuffers =
            Number(
              limits.maxStorageBuffersPerShaderStage
            );

          if (
            Number.isFinite(
              maxStorageBuffers
            ) &&
            maxStorageBuffers <
              8
          ) {

            console.warn(
              '[BG Worker] WebGPU storage buffer limit too low.'
            );

            return false;

          }

          /*
           * The fp16 model requires floating-point16 shader
           * support in WebGPU environments where that feature
           * is exposed.
           */
          if (
            adapter.features &&
            typeof adapter.features.has ===
              'function'
          ) {

            if (
              !adapter.features.has(
                'shader-f16'
              )
            ) {

              console.warn(
                '[BG Worker] WebGPU shader-f16 is unavailable.'
              );

              return false;

            }

          }

          return true;

        } catch (error) {

          console.warn(
            '[BG Worker] WebGPU probe failed:',
            error
          );

          return false;

        }

      }

      // ========================================================
      // DOWNLOAD PROGRESS
      // ========================================================

      function makeDownloadProgress(
        jobId
      ) {

        return info => {

          if (
            isCancelled(
              jobId
            ) ||
            !info
          ) {

            return;

          }

          if (
            info.status ===
            'progress_total'
          ) {

            const p =
              Number(
                info.progress
              );

            if (
              Number.isFinite(
                p
              )
            ) {

              progress(
                jobId,
                'load',
                'download',
                p,
                100
              );

            }

          }

        };

      }

      // ========================================================
      // LOAD MODEL
      // ========================================================

      async function loadModel(
        mode,
        jobId
      ) {

        if (
          model &&
          processor &&
          loadedMode ===
            mode
        ) {

          return {
            model,
            processor
          };

        }

        const {
          AutoModel,
          AutoProcessor
        } =
          await loadTF();

        checkCancel(
          jobId
        );

        await disposeModel();

        progress(
          jobId,
          'load',
          'download',
          0,
          100
        );

        const isGPU =
          mode ===
          'gpu';

        const progressCallback =
          makeDownloadProgress(
            jobId
          );

        try {

          processor =
            await AutoProcessor.from_pretrained(
              MODEL_ID,
              {
                progress_callback:
                  progressCallback
              }
            );

          checkCancel(
            jobId
          );

          model =
            await AutoModel.from_pretrained(
              MODEL_ID,
              {

                dtype:
                  isGPU
                    ? GPU_DTYPE
                    : CPU_DTYPE,

                device:
                  isGPU
                    ? 'webgpu'
                    : 'wasm',

                progress_callback:
                  progressCallback

              }
            );

          checkCancel(
            jobId
          );

          loadedMode =
            mode;

          progress(
            jobId,
            'load',
            'ready',
            100,
            100
          );

          return {
            model,
            processor
          };

        } catch (error) {

          await disposeModel();

          throw error;

        }

      }

      // ========================================================
      // OUTPUT SIZE
      // ========================================================

      function outputSize(
        width,
        height
      ) {

        let w =
          Math.max(
            1,
            Number(width) ||
              1
          );

        let h =
          Math.max(
            1,
            Number(height) ||
              1
          );

        let scale =
          1;

        const pixels =
          w * h;

        if (
          pixels >
          MAX_OUTPUT_PIXELS
        ) {

          scale =
            Math.min(
              scale,
              Math.sqrt(
                MAX_OUTPUT_PIXELS /
                pixels
              )
            );

        }

        const longSide =
          Math.max(
            w,
            h
          );

        if (
          longSide >
          MAX_OUTPUT_DIMENSION
        ) {

          scale =
            Math.min(
              scale,
              MAX_OUTPUT_DIMENSION /
              longSide
            );

        }

        if (
          scale <
          1
        ) {

          w =
            Math.max(
              1,
              Math.round(
                w * scale
              )
            );

          h =
            Math.max(
              1,
              Math.round(
                h * scale
              )
            );

        }

        return {
          width:
            w,

          height:
            h,

          scaled:
            scale < 1
        };

      }

      // ========================================================
      // CREATE CONTROLLED AI INPUT
      // ========================================================

      async function makeModelBlob(
        file,
        originalWidth,
        originalHeight,
        jobId
      ) {

        if (
          typeof createImageBitmap !==
            'function' ||
          typeof OffscreenCanvas ===
            'undefined'
        ) {

          return file;

        }

        let bitmap =
          null;

        try {

          const sourceWidth =
            Math.max(
              1,
              Number(
                originalWidth
              ) || AI_MAX_DIMENSION
            );

          const sourceHeight =
            Math.max(
              1,
              Number(
                originalHeight
              ) || AI_MAX_DIMENSION
            );

          const scale =
            Math.min(
              1,

              AI_MAX_DIMENSION /
                sourceWidth,

              AI_MAX_DIMENSION /
                sourceHeight
            );

          const targetWidth =
            Math.max(
              1,
              Math.round(
                sourceWidth *
                scale
              )
            );

          const targetHeight =
            Math.max(
              1,
              Math.round(
                sourceHeight *
                scale
              )
            );

          try {

            bitmap =
              await createImageBitmap(
                file,
                {
                  resizeWidth:
                    targetWidth,

                  resizeHeight:
                    targetHeight,

                  resizeQuality:
                    'medium'
                }
              );

          } catch (_) {

            bitmap =
              await createImageBitmap(
                file
              );

          }

          checkCancel(
            jobId
          );

          const finalWidth =
            Math.min(
              AI_MAX_DIMENSION,
              Math.max(
                1,
                bitmap.width
              )
            );

          const finalScale =
            Math.min(
              1,
              finalWidth /
                Math.max(
                  1,
                  bitmap.width
                ),
              AI_MAX_DIMENSION /
                Math.max(
                  1,
                  bitmap.height
                )
            );

          const canvasWidth =
            Math.max(
              1,
              Math.round(
                bitmap.width *
                finalScale
              )
            );

          const canvasHeight =
            Math.max(
              1,
              Math.round(
                bitmap.height *
                finalScale
              )
            );

          const canvas =
            new OffscreenCanvas(
              canvasWidth,
              canvasHeight
            );

          const ctx =
            canvas.getContext(
              '2d',
              {
                alpha:
                  false
              }
            );

          if (!ctx) {

            throw new Error(
              'BACKGROUND_CANVAS_UNSUPPORTED'
            );

          }

          ctx.imageSmoothingEnabled =
            true;

          ctx.imageSmoothingQuality =
            'medium';

          ctx.drawImage(
            bitmap,
            0,
            0,
            canvasWidth,
            canvasHeight
          );

          return await canvas.convertToBlob({
            type:
              file.type ===
                'image/png'
                ? 'image/png'
                : 'image/jpeg',

            quality:
              0.85
          });

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
      // PICK MODEL OUTPUT
      // ========================================================

      function pickOutputTensor(
        output
      ) {

        if (
          output &&
          output.logits
        ) {

          return output.logits;

        }

        if (
          output &&
          output.output_image &&
          output.output_image[0]
        ) {

          return output.output_image[0];

        }

        return null;

      }

      // ========================================================
      // COMPOSE FINAL PNG
      // ========================================================

      async function composePNG(
        file,
        mask,
        width,
        height,
        jobId
      ) {

        checkCancel(
          jobId
        );

        if (
          typeof createImageBitmap !==
            'function' ||
          typeof OffscreenCanvas ===
            'undefined'
        ) {

          throw new Error(
            'BACKGROUND_CANVAS_UNSUPPORTED'
          );

        }

        const size =
          outputSize(
            width,
            height
          );

        let bitmap =
          null;

        let resizedMask =
          mask;

        try {

          /*
           * Decode directly at protected output size.
           */
          bitmap =
            await createImageBitmap(
              file,
              {
                resizeWidth:
                  size.width,

                resizeHeight:
                  size.height,

                resizeQuality:
                  'high'
              }
            );

          checkCancel(
            jobId
          );

          const canvas =
            new OffscreenCanvas(
              size.width,
              size.height
            );

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

          if (!ctx) {

            throw new Error(
              'BACKGROUND_CANVAS_UNSUPPORTED'
            );

          }

          ctx.imageSmoothingEnabled =
            true;

          ctx.imageSmoothingQuality =
            'high';

          ctx.drawImage(
            bitmap,
            0,
            0,
            size.width,
            size.height
          );

          if (
            mask.width !==
              size.width ||
            mask.height !==
              size.height
          ) {

            resizedMask =
              await mask.resize(
                size.width,
                size.height
              );

          }

          checkCancel(
            jobId
          );

          const image =
            ctx.getImageData(
              0,
              0,
              size.width,
              size.height
            );

          const pixels =
            image.data;

          const alpha =
            resizedMask.data;

          for (
            let p = 0,
              i = 0;

            p <
              pixels.length;

            p += 4,
              i++
          ) {

            const a =
              alpha[i];

            pixels[p + 3] =
              a <= 3
                ? 0
                : a >= 252
                  ? 255
                  : a;

          }

          ctx.putImageData(
            image,
            0,
            0
          );

          if (
            resizedMask !==
              mask &&
            typeof resizedMask.dispose ===
              'function'
          ) {

            try {
              resizedMask.dispose();
            } catch (_) {}

          }

          resizedMask =
            null;

          progress(
            jobId,
            'output',
            size.scaled
              ? 'resizeOutput'
              : 'output',
            70,
            100
          );

          checkCancel(
            jobId
          );

          const blob =
            await canvas.convertToBlob({
              type:
                OUTPUT_FORMAT,

              quality:
                1
            });

          if (
            !blob ||
            !blob.size
          ) {

            throw new Error(
              'BACKGROUND_EMPTY_RESULT'
            );

          }

          progress(
            jobId,
            'output',
            'output',
            100,
            100
          );

          return blob;

        } finally {

          if (
            resizedMask &&
            resizedMask !==
              mask &&
            typeof resizedMask.dispose ===
              'function'
          ) {

            try {
              resizedMask.dispose();
            } catch (_) {}

          }

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
      // RUN BACKGROUND REMOVAL
      // ========================================================

      async function run(
        jobId,
        file,
        originalWidth,
        originalHeight,
        requestedMode
      ) {

        checkCancel(
          jobId
        );

        progress(
          jobId,
          'prepare',
          'prepare',
          0,
          100
        );

        const {
          RawImage
        } =
          await loadTF();

        checkCancel(
          jobId
        );

        let modelBlob =
          null;

        let image =
          null;

        let mask =
          null;

        try {

          /*
           * Keep giant original files away from
           * the AI runtime.
           */
          modelBlob =
            await makeModelBlob(
              file,
              originalWidth,
              originalHeight,
              jobId
            );

          checkCancel(
            jobId
          );

          image =
            await RawImage.fromBlob(
              modelBlob
            );

          checkCancel(
            jobId
          );

          progress(
            jobId,
            'prepare',
            'decode',
            100,
            100
          );

          // ----------------------------------------------------
          // MODE SELECTION
          // ----------------------------------------------------

          let mode =
            'cpu';

          if (
            requestedMode ===
            'gpu'
          ) {

            if (
              await probeWebGPU()
            ) {
              mode =
                'gpu';
            }

          } else if (
            requestedMode ===
            'auto'
          ) {

            if (
              PREFER_GPU &&
              !gpuKnownBad &&
              await probeWebGPU()
            ) {
              mode =
                'gpu';
            }

          }

          let loaded =
            null;

          // ----------------------------------------------------
          // GPU
          // ----------------------------------------------------

          if (
            mode ===
            'gpu'
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

              loaded =
                await loadModel(
                  'gpu',
                  jobId
                );

            } catch (
              gpuError
            ) {

              console.warn(
                '[BG Worker] WebGPU model load failed; switching to WASM:',
                gpuError
              );

              gpuKnownBad =
                true;

              await disposeModel();

              mode =
                'cpu';

              post(
                'gpuFallback',
                {
                  jobId
                }
              );

            }

          }

          // ----------------------------------------------------
          // CPU
          // ----------------------------------------------------

          if (
            mode ===
            'cpu'
          ) {

            post(
              'mode',
              {
                jobId,
                mode:
                  'cpu'
              }
            );

            loaded =
              await loadModel(
                'cpu',
                jobId
              );

          }

          checkCancel(
            jobId
          );

          // ----------------------------------------------------
          // PREPROCESS
          // ----------------------------------------------------

          const {
            pixel_values
          } =
            await loaded.processor(
              image
            );

          checkCancel(
            jobId
          );

          progress(
            jobId,
            'ai',
            'inference',
            10,
            100
          );

          // ----------------------------------------------------
          // INFERENCE
          // ----------------------------------------------------

          const output =
            await loaded.model({
              input_image:
                pixel_values
            });

          checkCancel(
            jobId
          );

          const tensor =
            pickOutputTensor(
              output
            );

          if (!tensor) {

            throw new Error(
              'BACKGROUND_EMPTY_RESULT'
            );

          }

          progress(
            jobId,
            'ai',
            'inference',
            70,
            100
          );

          // ----------------------------------------------------
          // ALPHA MASK
          // ----------------------------------------------------

          let alphaTensor =
            tensor
              .sigmoid()
              .mul(255)
              .to(
                'uint8'
              );

          /*
           * Release model output immediately.
           */
          if (
            tensor &&
            typeof tensor.dispose ===
              'function'
          ) {

            try {
              tensor.dispose();
            } catch (_) {}

          }

          /*
           * Remove batch/channel dimensions.
           */
          if (
            alphaTensor &&
            alphaTensor.dims &&
            Array.isArray(
              alphaTensor.dims
            ) &&
            alphaTensor.dims.length >
              2 &&
            typeof alphaTensor.squeeze ===
              'function'
          ) {

            const squeezed =
              alphaTensor.squeeze();

            if (
              squeezed !==
              alphaTensor
            ) {

              if (
                typeof alphaTensor.dispose ===
                  'function'
              ) {

                try {
                  alphaTensor.dispose();
                } catch (_) {}

              }

              alphaTensor =
                squeezed;

            }

          }

          mask =
            await RawImage.fromTensor(
              alphaTensor
            );

          if (
            alphaTensor &&
            typeof alphaTensor.dispose ===
              'function'
          ) {

            try {
              alphaTensor.dispose();
            } catch (_) {}

          }

          /*
           * Release input tensor as early as possible.
           */
          if (
            pixel_values &&
            typeof pixel_values.dispose ===
              'function'
          ) {

            try {
              pixel_values.dispose();
            } catch (_) {}

          }

          /*
           * Release any additional output tensors.
           */
          if (
            output &&
            typeof output ===
              'object'
          ) {

            for (
              const value of
                Object.values(
                  output
                )
            ) {

              if (
                value &&
                value !==
                  tensor &&
                typeof value.dispose ===
                  'function'
              ) {

                try {
                  value.dispose();
                } catch (_) {}

              }

            }

          }

          progress(
            jobId,
            'ai',
            'matting',
            100,
            100
          );

          // ----------------------------------------------------
          // FINAL IMAGE
          // ----------------------------------------------------

          const finalBlob =
            await composePNG(
              file,
              mask,
              originalWidth ||
                image.width ||
                1,
              originalHeight ||
                image.height ||
                1,
              jobId
            );

          if (
            !finalBlob ||
            !finalBlob.size
          ) {

            throw new Error(
              'BACKGROUND_EMPTY_RESULT'
            );

          }

          /*
           * Transfer the ArrayBuffer rather than copying it.
           *
           * This can materially reduce the main-thread memory
           * spike for large PNG results.
           */
          const buffer =
            await finalBlob.arrayBuffer();

          checkCancel(
            jobId
          );

          post(
            'result',
            {
              jobId,
              buffer,
              mime:
                OUTPUT_FORMAT
            },
            [
              buffer
            ]
          );

        } finally {

          image =
            null;

          modelBlob =
            null;

          if (
            mask &&
            typeof mask.dispose ===
              'function'
          ) {

            try {
              mask.dispose();
            } catch (_) {}

          }

          mask =
            null;

        }

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

          if (!data) {
            return;
          }

          // ----------------------------------------------------
          // CANCEL
          // ----------------------------------------------------

          if (
            data.type ===
            'cancel'
          ) {

            cancelled.add(
              data.jobId
            );

            return;

          }

          // ----------------------------------------------------
          // PROCESS
          // ----------------------------------------------------

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

          cancelled.delete(
            jobId
          );

          try {

            await run(
              jobId,
              data.file,
              data.originalWidth,
              data.originalHeight,
              data.requestedMode ||
                'auto'
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

            cancelled.delete(
              jobId
            );

          }

        };

      post(
        'ready'
      );
    `;
  }

  // ============================================================
  // WORKER MANAGEMENT
  // ============================================================

  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(
        idleTimer
      );

      idleTimer =
        null;
    }
  }

  function scheduleIdleDestroy() {
    clearIdleTimer();

    idleTimer =
      setTimeout(
        () => {

          if (
            pending.size ===
            0
          ) {
            destroyWorker();
          }

        },
        WORKER_IDLE_TIMEOUT
      );
  }

  function destroyWorker(
    message =
      'BACKGROUND_WORKER_TERMINATED'
  ) {

    clearIdleTimer();

    for (
      const request of
        pending.values()
    ) {

      if (
        request.watchdog
      ) {

        clearTimeout(
          request.watchdog
        );

        request.watchdog =
          null;

      }

      try {

        request.reject(
          new Error(
            message
          )
        );

      } catch (_) {}

    }

    pending.clear();

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
      workerUrl
    ) {

      revoke(
        workerUrl
      );

      workerUrl =
        null;

    }

  }

  function ensureWorker() {

    if (
      worker
    ) {
      return worker;
    }

    const blob =
      new Blob(
        [
          workerSource()
        ],
        {
          type:
            'text/javascript'
        }
      );

    workerUrl =
      URL.createObjectURL(
        blob
      );

    worker =
      new Worker(
        workerUrl,
        {
          type:
            'module'
        }
      );

    worker.onmessage =
      handleWorkerMessage;

    worker.onerror =
      error => {

        console.error(
          '[Image Background Removal] Worker error:',
          error
        );

        destroyWorker(
          'BACKGROUND_WORKER_FAILED'
        );

      };

    worker.onmessageerror =
      error => {

        console.error(
          '[Image Background Removal] Worker message error:',
          error
        );

        destroyWorker(
          'BACKGROUND_WORKER_MESSAGE_ERROR'
        );

      };

    return worker;

  }

  // ============================================================
  // PROGRESS
  // ============================================================

  function weightedProgress(
    phase,
    raw
  ) {

    const p =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            raw
          ) || 0
        )
      );

    let start =
      0;

    let end =
      100;

    if (
      phase ===
      'prepare'
    ) {

      start =
        0;

      end =
        10;

    } else if (
      phase ===
      'load'
    ) {

      start =
        10;

      end =
        25;

    } else if (
      phase ===
      'ai'
    ) {

      start =
        25;

      end =
        90;

    } else if (
      phase ===
      'output'
    ) {

      start =
        90;

      end =
        97;

    } else if (
      phase ===
      'complete'
    ) {

      start =
        97;

      end =
        100;

    }

    return Math.round(
      start +
      (
        (
          end -
          start
        ) *
        p /
        100
      )
    );

  }

  function watchdogDuration(
    request
  ) {

    const job =
      request &&
      request.job;

    const phase =
      request &&
      request.phase
        ? request.phase
        : 'prepare';

    if (
      phase ===
      'prepare'
    ) {
      return WATCHDOG.prepare;
    }

    if (
      phase ===
      'load'
    ) {
      return WATCHDOG.load;
    }

    if (
      phase ===
      'ai'
    ) {

      if (
        job &&
        job.mode ===
          'gpu'
      ) {
        return WATCHDOG.aiGpu;
      }

      return WATCHDOG.aiCpu;

    }

    if (
      phase ===
      'output'
    ) {
      return WATCHDOG.output;
    }

    return WATCHDOG.output;

  }

  function clearRequestWatchdog(
    request
  ) {

    if (
      request &&
      request.watchdog
    ) {

      clearTimeout(
        request.watchdog
      );

      request.watchdog =
        null;

    }

  }

  function armRequestWatchdog(
    request
  ) {

    if (
      !request ||
      request.settled
    ) {
      return;
    }

    clearRequestWatchdog(
      request
    );

    const duration =
      watchdogDuration(
        request
      );

    request.watchdog =
      setTimeout(
        () => {

          if (
            request.settled
          ) {
            return;
          }

          const message =
            request.job &&
            request.job.mode ===
              'gpu'
              ? 'BACKGROUND_GPU_TIMEOUT'
              : 'BACKGROUND_WORKER_STALLED';

          if (
            request.job &&
            request.job.mode ===
              'gpu'
          ) {

            /*
             * Stop trying WebGPU again for this page session.
             * The current worker is already considered unsafe.
             */
            gpuDisabledForSession =
              true;

          }

          /*
           * Destroying the worker is intentional.
           *
           * A Promise inside a worker can become permanently
           * unresolved when a WebGPU backend stalls. There is
           * no reliable way to force-cancel that Promise from
           * the main thread, so terminating the worker is the
           * actual watchdog.
           */
          destroyWorker(
            message
          );

        },
        duration
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

    if (!data) {
      return;
    }

    if (
      data.type ===
      'ready'
    ) {
      return;
    }

    const request =
      pending.get(
        data.jobId
      );

    if (!request) {
      return;
    }

    const job =
      request.job;

    // ----------------------------------------------------------
    // PROGRESS
    // ----------------------------------------------------------

    if (
      data.type ===
      'progress'
    ) {

      request.phase =
        data.phase ||
        request.phase ||
        'prepare';

      armRequestWatchdog(
        request
      );

      if (
        !job ||
        job.disposed ||
        !job.processing
      ) {
        return;
      }

      const total =
        Number(
          data.total
        );

      const current =
        Number(
          data.current
        );

      const raw =
        total >
        0
          ? (
              current /
              total
            ) *
            100
          : 0;

      job.setProgress(
        weightedProgress(
          data.phase,
          raw
        )
      );

      job.setProgressText(
        data.key,
        Math.round(
          raw
        )
      );

      return;

    }

    // ----------------------------------------------------------
    // MODE
    // ----------------------------------------------------------

    if (
      data.type ===
      'mode'
    ) {

      request.phase =
        'load';

      armRequestWatchdog(
        request
      );

      if (
        job &&
        !job.disposed
      ) {

        job.mode =
          data.mode;

        if (
          job.status
        ) {

          job.status.textContent =
            `${t(
              'image.preparingModel'
            )} (${String(
              data.mode
            ).toUpperCase()})`;

        }

      }

      return;

    }

    // ----------------------------------------------------------
    // GPU FALLBACK
    // ----------------------------------------------------------

    if (
      data.type ===
      'gpuFallback'
    ) {

      /*
       * Worker itself detected a GPU load/runtime failure
       * and has already switched to CPU.
       */
      request.phase =
        'load';

      armRequestWatchdog(
        request
      );

      if (
        job &&
        !job.disposed
      ) {

        job.mode =
          'cpu';

        if (
          job.status
        ) {

          job.status.textContent =
            t(
              'image.preparingModel'
            );

        }

      }

      return;

    }

    // ----------------------------------------------------------
    // RESULT
    // ----------------------------------------------------------

    if (
      data.type ===
      'result'
    ) {

      clearRequestWatchdog(
        request
      );

      request.settled =
        true;

      try {

        request.resolve(
          new Blob(
            [
              data.buffer
            ],
            {
              type:
                data.mime ||
                OUTPUT_FORMAT
            }
          )
        );

      } catch (
        error
      ) {

        request.reject(
          error
        );

      }

      pending.delete(
        data.jobId
      );

      scheduleIdleDestroy();

      return;

    }

    // ----------------------------------------------------------
    // DONE
    // ----------------------------------------------------------

    if (
      data.type ===
      'done'
    ) {

      /*
       * Result normally arrives before done.
       *
       * Do not resolve/delete here because the result handler
       * owns the Promise resolution.
       */
      scheduleIdleDestroy();

      return;

    }

    // ----------------------------------------------------------
    // ERROR
    // ----------------------------------------------------------

    if (
      data.type ===
      'error'
    ) {

      clearRequestWatchdog(
        request
      );

      request.settled =
        true;

      pending.delete(
        data.jobId
      );

      request.reject(
        new Error(
          data.message ||
          'BACKGROUND_WORKER_PROCESS_FAILED'
        )
      );

      scheduleIdleDestroy();

    }

  }

  // ============================================================
  // EXECUTE ONE WORKER JOB
  // ============================================================

  function executeWorkerJob(
    job,
    requestedMode
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        if (
          !job ||
          job.disposed
        ) {

          reject(
            new Error(
              'BACKGROUND_CANCELLED'
            )
          );

          return;

        }

        const current =
          ensureWorker();

        clearIdleTimer();

        const request = {
          resolve,
          reject,
          job,
          phase:
            'prepare',
          watchdog:
            null,
          settled:
            false
        };

        pending.set(
          job.id,
          request
        );

        armRequestWatchdog(
          request
        );

        try {

          current.postMessage(
            {
              type:
                'process',

              jobId:
                job.id,

              file:
                job.file,

              originalWidth:
                job.originalWidth,

              originalHeight:
                job.originalHeight,

              requestedMode:
                requestedMode ||
                'auto'
            }
          );

        } catch (error) {

          clearRequestWatchdog(
            request
          );

          request.settled =
            true;

          pending.delete(
            job.id
          );

          reject(
            error
          );

        }

      }
    );

  }

  // ============================================================
  // PROCESS IN WORKER
  // ============================================================

  function processInWorker(
    job,
    requestedMode
  ) {

    /*
     * Queue jobs so only one uses the model at a time.
     */
    const task =
      workerQueue.then(
        async () => {

          if (
            job.disposed
          ) {

            throw new Error(
              'BACKGROUND_CANCELLED'
            );

          }

          return await executeWorkerJob(
            job,
            requestedMode
          );

        }
      );

    /*
     * Keep the chain alive after rejection so the next
     * queued job can still run.
     */
    workerQueue =
      task.catch(
        () => {}
      );

    return task;

  }

  // ============================================================
  // CANCEL
  // ============================================================

  function cancelJob(
    job
  ) {

    if (
      !worker ||
      !job
    ) {
      return;
    }

    try {

      worker.postMessage(
        {
          type:
            'cancel',

          jobId:
            job.id
        }
      );

    } catch (_) {}

    setTimeout(
      () => {

        if (
          pending.has(
            job.id
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
  // JOB
  // ============================================================

  class BgJob {

    constructor(
      file
    ) {

      this.id =
        `bg-${++jobSeq}`;

      this.file =
        file;

      this.originalWidth =
        0;

      this.originalHeight =
        0;

      this.resultBlob =
        null;

      this.resultUrl =
        null;

      this.objectUrl =
        URL.createObjectURL(
          file
        );

      this.processing =
        false;

      this.disposed =
        false;

      this.mode =
        null;

      this.displayedProgress =
        0;

      this.el =
        el.template
          .content
          .firstElementChild
          .cloneNode(
            true
          );

      this.build();

    }

    build() {

      this.before =
        this.el.querySelector(
          '.js-before img'
        );

      this.afterWrap =
        this.el.querySelector(
          '.js-after'
        );

      this.after =
        this.el.querySelector(
          '.js-after img'
        );

      this.status =
        this.el.querySelector(
          '.js-status'
        );

      this.progress =
        this.el.querySelector(
          '.js-progress'
        );

      this.processBtn =
        this.el.querySelector(
          '.js-remove-bg-btn'
        );

      this.downloadBtn =
        this.el.querySelector(
          '.js-download-btn'
        );

      const name =
        this.el.querySelector(
          '.js-filename'
        );

      const size =
        this.el.querySelector(
          '.js-origsize'
        );

      const dim =
        this.el.querySelector(
          '.js-origdim'
        );

      const removeBtn =
        this.el.querySelector(
          '.js-remove-job-btn'
        );

      if (name) {

        name.textContent =
          this.file.name;

      }

      if (size) {

        size.textContent =
          formatBytes(
            this.file.size
          );

      }

      if (dim) {

        dim.textContent =
          t(
            'image.reading'
          );

      }

      this.before.src =
        this.objectUrl;

      this.before.onload =
        () => {

          if (
            this.disposed
          ) {
            return;
          }

          this.originalWidth =
            this.before.naturalWidth ||
            0;

          this.originalHeight =
            this.before.naturalHeight ||
            0;

          if (dim) {

            dim.textContent =
              `${this.originalWidth}×${this.originalHeight}`;

          }

        };

      this.before.onerror =
        () => {

          this.setError(
            'image.openFailed'
          );

        };

      this.processBtn.addEventListener(
        'click',
        () =>
          this.process()
      );

      if (removeBtn) {

        removeBtn.addEventListener(
          'click',
          () => {

            this.dispose();

            this.el.remove();

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

    // ----------------------------------------------------------
    // PROGRESS
    // ----------------------------------------------------------

    setProgress(
      value
    ) {

      if (
        this.disposed ||
        !this.progress
      ) {
        return;
      }

      this.displayedProgress =
        Math.max(
          this.displayedProgress,

          Math.max(
            0,
            Math.min(
              100,
              Number(
                value
              ) || 0
            )
          )
        );

      this.progress.style.width =
        `${this.displayedProgress}%`;

    }

    setProgressText(
      key,
      percent
    ) {

      if (
        !this.status ||
        this.disposed
      ) {
        return;
      }

      const raw =
        String(
          key ||
          ''
        ).toLowerCase();

      const loading =
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

      this.status.textContent =
        t(
          loading
            ? 'image.loadingModelProgress'
            : 'image.removingBackgroundProgress',
          {
            percent
          }
        );

    }

    // ----------------------------------------------------------
    // ERROR
    // ----------------------------------------------------------

    setError(
      key
    ) {

      if (
        this.disposed
      ) {
        return;
      }

      this.errorKey =
        key;

      if (
        this.status
      ) {

        this.status.textContent =
          t(
            key
          );

        this.status.classList.remove(
          'is-ready'
        );

        this.status.classList.add(
          'is-error'
        );

      }

    }

    // ----------------------------------------------------------
    // RESULT
    // ----------------------------------------------------------

    clearResult() {

      if (
        this.resultUrl
      ) {

        revoke(
          this.resultUrl
        );

      }

      this.resultUrl =
        null;

      this.resultBlob =
        null;

      if (
        this.downloadBtn
      ) {

        this.downloadBtn.classList.add(
          'hidden'
        );

        this.downloadBtn.removeAttribute(
          'href'
        );

        this.downloadBtn.removeAttribute(
          'download'
        );

      }

    }

    // ----------------------------------------------------------
    // LANGUAGE
    // ----------------------------------------------------------

    updateLanguageUI() {

      if (
        this.disposed ||
        this.processing ||
        !this.status
      ) {
        return;
      }

      if (
        this.resultBlob
      ) {

        this.status.textContent =
          t(
            'image.readyDownload',
            {
              size:
                formatBytes(
                  this.resultBlob.size
                )
            }
          );

        this.status.classList.remove(
          'is-error'
        );

        this.status.classList.add(
          'is-ready'
        );

        return;

      }

      this.status.textContent =
        t(
          'image.waitingBackground'
        );

      this.status.classList.remove(
        'is-error',
        'is-ready'
      );

    }

    // ----------------------------------------------------------
    // PROCESS
    // ----------------------------------------------------------

    async process() {

      if (
        this.disposed ||
        this.processing ||
        this.resultBlob
      ) {
        return;
      }

      /*
       * Usually the preview has already loaded.
       */
      if (
        this.before &&
        this.before.naturalWidth
      ) {

        this.originalWidth =
          this.before.naturalWidth;

        this.originalHeight =
          this.before.naturalHeight;

      }

      this.processing =
        true;

      this.displayedProgress =
        0;

      this.mode =
        null;

      this.clearResult();

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
        this.status
      ) {

        this.status.classList.remove(
          'is-ready',
          'is-error'
        );

        this.status.textContent =
          t(
            'image.preparingModel'
          );

      }

      /*
       * Track whether we already retried with CPU.
       */
      let cpuRetried =
        false;

      try {

        await yieldUI();

        /*
         * If GPU has already been disabled for this page,
         * use CPU directly.
         */
        let requestedMode =
          gpuDisabledForSession
            ? 'cpu'
            : 'auto';

        let blob;

        try {

          blob =
            await processInWorker(
              this,
              requestedMode
            );

        } catch (
          firstError
        ) {

          const message =
            firstError &&
            firstError.message
              ? firstError.message
              : '';

          const gpuFailed =
            this.mode ===
              'gpu' &&
            /BACKGROUND_GPU_TIMEOUT|BACKGROUND_WORKER_FAILED|BACKGROUND_WORKER_MESSAGE_ERROR|BACKGROUND_WORKER_TERMINATED/.test(
              message
            );

          /*
           * GPU watchdog/worker failure:
           *
           * - Disable GPU for this session.
           * - Destroyed worker is already gone.
           * - Retry the same image using CPU.
           */
          if (
            gpuFailed &&
            !cpuRetried &&
            !this.disposed
          ) {

            cpuRetried =
              true;

            gpuDisabledForSession =
              true;

            this.mode =
              'cpu';

            if (
              this.status
            ) {

              this.status.textContent =
                t(
                  'image.preparingModel'
                );

            }

            this.setProgress(
              Math.min(
                25,
                this.displayedProgress
              )
            );

            await yieldUI();

            blob =
              await processInWorker(
                this,
                'cpu'
              );

          } else {

            throw firstError;

          }

        }

        if (
          this.disposed
        ) {
          return;
        }

        this.resultBlob =
          blob;

        this.resultUrl =
          URL.createObjectURL(
            blob
          );

        if (
          this.after
        ) {

          this.after.src =
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
            `${baseName(
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
          this.status
        ) {

          this.status.textContent =
            t(
              'image.readyDownload',
              {
                size:
                  formatBytes(
                    blob.size
                  )
              }
            );

          this.status.classList.remove(
            'is-error'
          );

          this.status.classList.add(
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
          !this.disposed
        ) {

          const message =
            error &&
            error.message
              ? error.message
              : '';

          if (
            !/BACKGROUND_CANCELLED|BACKGROUND_WORKER_TERMINATED/.test(
              message
            )
          ) {

            this.setError(
              errorKey(
                error
              )
            );

            this.setProgress(
              0
            );

            this.clearResult();

          }

        }

      } finally {

        this.processing =
          false;

        this.mode =
          null;

        if (
          !this.disposed &&
          this.processBtn
        ) {

          this.processBtn.disabled =
            false;

        }

        updateBulkUI();

        await yieldUI();

      }

    }

    // ----------------------------------------------------------
    // DISPOSE
    // ----------------------------------------------------------

    dispose() {

      if (
        this.disposed
      ) {
        return;
      }

      this.disposed =
        true;

      if (
        this.processing
      ) {

        cancelJob(
          this
        );

      }

      revoke(
        this.objectUrl
      );

      revoke(
        this.resultUrl
      );

      this.objectUrl =
        null;

      this.resultUrl =
        null;

      this.resultBlob =
        null;

    }

  }

  // ============================================================
  // FILE HANDLING
  // ============================================================

  function hasDuplicate(
    file
  ) {

    const key =
      [
        file.name,
        file.size,
        file.lastModified,
        file.type
      ].join(
        '|'
      );

    return jobs.some(
      job =>
        !job.disposed &&
        [
          job.file.name,
          job.file.size,
          job.file.lastModified,
          job.file.type
        ].join(
          '|'
        ) ===
        key
    );

  }

  function addFiles(
    list
  ) {

    Array.from(
      list ||
      []
    ).forEach(
      file => {

        if (
          !file ||
          !String(
            file.type ||
            ''
          ).startsWith(
            'image/'
          )
        ) {
          return;
        }

        if (
          hasDuplicate(
            file
          )
        ) {
          return;
        }

        const job =
          new BgJob(
            file
          );

        jobs.push(
          job
        );

        el.jobs.appendChild(
          job.el
        );

      }
    );

    updateBulkUI();

  }

  function updateBulkUI() {

    const active =
      jobs.filter(
        job =>
          !job.disposed
      );

    el.count.textContent =
      String(
        active.length
      );

    el.bulkbar.classList.toggle(
      'hidden',
      active.length ===
        0
    );

    const hasReady =
      active.some(
        job =>
          !!job.resultBlob
      );

    el.downloadZip.classList.toggle(
      'hidden',
      !hasReady
    );

    active.forEach(
      job =>
        job.updateLanguageUI()
    );

  }

  // ============================================================
  // DROPZONE
  // ============================================================

  if (
    typeof U.setupDropzone ===
    'function'
  ) {

    U.setupDropzone(
      el.dropzone,
      el.fileInput,
      addFiles
    );

  } else {

    el.dropzone.addEventListener(
      'click',
      () =>
        el.fileInput.click()
    );

    el.fileInput.addEventListener(
      'change',
      event =>
        addFiles(
          event.target.files
        )
    );

    el.dropzone.addEventListener(
      'dragover',
      event => {

        event.preventDefault();

        el.dropzone.classList.add(
          'is-dragover'
        );

      }
    );

    el.dropzone.addEventListener(
      'dragleave',
      () => {

        el.dropzone.classList.remove(
          'is-dragover'
        );

      }
    );

    el.dropzone.addEventListener(
      'drop',
      event => {

        event.preventDefault();

        el.dropzone.classList.remove(
          'is-dragover'
        );

        addFiles(
          event.dataTransfer &&
          event.dataTransfer.files
        );

      }
    );

  }

  // ============================================================
  // CLEAR ALL
  // ============================================================

  el.clearAll.addEventListener(
    'click',
    () => {

      jobs.forEach(
        job =>
          job.dispose()
      );

      jobs.length =
        0;

      el.jobs.innerHTML =
        '';

      destroyWorker(
        'BACKGROUND_CANCELLED'
      );

      updateBulkUI();

    }
  );

  // ============================================================
  // PROCESS ALL
  // ============================================================

  el.processAll.addEventListener(
    'click',
    async () => {

      if (
        el.processAll.disabled
      ) {
        return;
      }

      const queue =
        jobs.filter(
          job =>
            !job.disposed &&
            !job.resultBlob
        );

      if (
        !queue.length
      ) {
        return;
      }

      el.processAll.disabled =
        true;

      let done =
        0;

      const total =
        queue.length;

      try {

        for (
          const job of
            queue
        ) {

          if (
            job.disposed ||
            job.resultBlob
          ) {

            done++;

            continue;

          }

          el.processAll.textContent =
            t(
              'image.removeBackgroundAllProcessing',
              {
                current:
                  done + 1,

                total
              }
            );

          await job.process();

          done++;

          await yieldUI();

        }

      } finally {

        el.processAll.disabled =
          false;

        el.processAll.textContent =
          t(
            'image.removeBackgroundAll'
          );

        updateBulkUI();

        if (
          worker &&
          pending.size ===
            0
        ) {

          scheduleIdleDestroy();

        }

      }

    }
  );

  // ============================================================
  // ZIP
  // ============================================================

  el.downloadZip.addEventListener(
    'click',
    async () => {

      const ready =
        jobs.filter(
          job =>
            !job.disposed &&
            job.resultBlob
        );

      if (
        !ready.length ||
        typeof JSZip !==
          'function'
      ) {
        return;
      }

      el.downloadZip.disabled =
        true;

      try {

        const zip =
          new JSZip();

        const used =
          new Set();

        for (
          const job of
            ready
        ) {

          let filename =
            `${baseName(
              job.file.name
            )}-nobg.png`;

          let n =
            2;

          while (
            used.has(
              filename
            )
          ) {

            filename =
              `${baseName(
                job.file.name
              )}-nobg-${n++}.png`;

          }

          used.add(
            filename
          );

          zip.file(
            filename,
            job.resultBlob
          );

        }

        const blob =
          await zip.generateAsync(
            {
              type:
                'blob',

              /*
               * STORE avoids an additional CPU/RAM spike
               * compressing already-compressed PNG files.
               */
              compression:
                'STORE'
            }
          );

        downloadBlob(
          blob,
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

        el.downloadZip.disabled =
          false;

        updateBulkUI();

      }

    }
  );

  // ============================================================
  // CACHE CLEAR HOOK
  // ============================================================

  if (
    typeof U.onClearCache ===
    'function'
  ) {

    U.onClearCache(
      () => {

        jobs.forEach(
          job =>
            job.dispose()
        );

        jobs.length =
          0;

        el.jobs.innerHTML =
          '';

        /*
         * Cache clear should also reset this so a fresh worker
         * can probe WebGPU again after the user cleared state.
         */
        gpuDisabledForSession =
          false;

        destroyWorker(
          'BACKGROUND_CACHE_CLEARED'
        );

        updateBulkUI();

      }
    );

  }

  // ============================================================
  // LANGUAGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {

      if (
        !el.processAll.disabled
      ) {

        el.processAll.textContent =
          t(
            'image.removeBackgroundAll'
          );

      }

      if (
        !el.downloadZip.disabled
      ) {

        el.downloadZip.textContent =
          t(
            'image.downloadZip'
          );

      }

      updateBulkUI();

    }
  );

  // ============================================================
  // INIT
  // ============================================================

  updateBulkUI();

})();
