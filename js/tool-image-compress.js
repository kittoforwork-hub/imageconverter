/* global window, document, URL, JSZip, requestAnimationFrame */

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
      'dz-img-compress'
    );

  const fileInput =
    document.getElementById(
      'input-img-compress'
    );

  const bulkbar =
    document.getElementById(
      'bulk-img-compress'
    );

  const countEl =
    document.getElementById(
      'count-img-compress'
    );

  const qualityEl =
    document.getElementById(
      'quality-img-compress'
    );

  const maxSizeEl =
    document.getElementById(
      'maxsize-img-compress'
    );

  const formatEl =
    document.getElementById(
      'format-img-compress'
    );

  const clearAllBtn =
    document.getElementById(
      'clearAll-img-compress'
    );

  const compressAllBtn =
    document.getElementById(
      'compressAll-img-compress'
    );

  const downloadZipBtn =
    document.getElementById(
      'downloadZip-img-compress'
    );

  const jobsEl =
    document.getElementById(
      'jobs-img-compress'
    );

  const jobTemplate =
    document.getElementById(
      'tpl-img-compress'
    );


  // ============================================================
  // VALIDATION
  // ============================================================

  if (
    !dropzone ||
    !fileInput ||
    !jobsEl ||
    !jobTemplate
  ) {

    console.warn(
      '[Image Compress] Required elements not found.'
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
  // CONSTANTS
  // ============================================================

  const EXT_BY_FORMAT = {

    'image/png':
      'png',

    'image/jpeg':
      'jpg',

    'image/webp':
      'webp'

  };


  const ALLOWED_FORMATS = [

    'image/jpeg',

    'image/png',

    'image/webp'

  ];


  const DEFAULT_QUALITY =
    0.85;


  const MAX_DIMENSION_LIMIT =
    20000;


  const CONCURRENCY =
    3;


  const MAX_CANVAS_PIXELS =
    100000000;


  // ============================================================
  // FILE HELPERS
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
        !job.disposed &&
        getFileKey(
          job.file
        ) === key
    );

  }


  // ============================================================
  // OPTION HELPERS
  // ============================================================

  function getQuality() {

    if (
      !qualityEl
    ) {

      return DEFAULT_QUALITY;

    }


    const value =
      parseFloat(
        qualityEl.value
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      return DEFAULT_QUALITY;

    }


    return Math.min(
      1,
      Math.max(
        0.05,
        value
      )
    );

  }


  function getMaxSize() {

    if (
      !maxSizeEl
    ) {

      return 0;

    }


    const value =
      parseInt(
        maxSizeEl.value,
        10
      );


    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {

      return 0;

    }


    return Math.min(
      MAX_DIMENSION_LIMIT,
      value
    );

  }


  function getFormat() {

    const value =
      formatEl
        ? formatEl.value
        : 'image/jpeg';


    if (
      !ALLOWED_FORMATS.includes(
        value
      )
    ) {

      return 'image/jpeg';

    }


    return value;

  }


  // ============================================================
  // DIMENSION HELPERS
  // ============================================================

  function getOutputDimensions(
    naturalW,
    naturalH,
    maxSize
  ) {

    const sourceW =
      Math.max(
        1,
        Math.round(
          Number(
            naturalW
          ) || 0
        )
      );


    const sourceH =
      Math.max(
        1,
        Math.round(
          Number(
            naturalH
          ) || 0
        )
      );


    if (
      !sourceW ||
      !sourceH
    ) {

      return {

        width:
          1,

        height:
          1

      };

    }


    if (
      !maxSize ||
      Math.max(
        sourceW,
        sourceH
      ) <= maxSize
    ) {

      return {

        width:
          sourceW,

        height:
          sourceH

      };

    }


    const scale =
      maxSize /
      Math.max(
        sourceW,
        sourceH
      );


    return {

      width:
        Math.max(
          1,
          Math.round(
            sourceW *
            scale
          )
        ),

      height:
        Math.max(
          1,
          Math.round(
            sourceH *
            scale
          )
        )

    };

  }


  function fitCanvasDimensions(
    width,
    height
  ) {

    let outW =
      Math.max(
        1,
        Math.round(
          Number(
            width
          ) || 1
        )
      );


    let outH =
      Math.max(
        1,
        Math.round(
          Number(
            height
          ) || 1
        )
      );


    const pixels =
      outW *
      outH;


    if (
      !Number.isFinite(
        pixels
      ) ||
      pixels <=
        MAX_CANVAS_PIXELS
    ) {

      return {

        width:
          outW,

        height:
          outH

      };

    }


    const scale =
      Math.sqrt(
        MAX_CANVAS_PIXELS /
        pixels
      );


    outW =
      Math.max(
        1,
        Math.floor(
          outW *
          scale
        )
      );


    outH =
      Math.max(
        1,
        Math.floor(
          outH *
          scale
        )
      );


    return {

      width:
        outW,

      height:
        outH

    };

  }


  // ============================================================
  // SAVING HELPERS
  // ============================================================

  function calculateSaving(
    originalSize,
    newSize
  ) {

    if (
      !Number.isFinite(
        originalSize
      ) ||
      originalSize <= 0 ||
      !Number.isFinite(
        newSize
      ) ||
      newSize < 0
    ) {

      return {

        percent:
          0,

        bytes:
          0,

        isSmaller:
          false

      };

    }


    const bytes =
      originalSize -
      newSize;


    const percent =
      (
        bytes /
        originalSize
      ) *
      100;


    return {

      percent,

      bytes,

      isSmaller:
        newSize <
        originalSize

    };

  }


  function formatSaving(
    originalSize,
    newSize
  ) {

    if (
      !Number.isFinite(
        originalSize
      ) ||
      originalSize <= 0
    ) {

      return '—';

    }


    const result =
      calculateSaving(
        originalSize,
        newSize
      );


    if (
      result.isSmaller
    ) {

      return t(
        'image.savingSmaller',
        {

          percent:
            result.percent.toFixed(
              1
            ),

          size:
            U.formatBytes(
              result.bytes
            )

        }
      );

    }


    if (
      newSize >
      originalSize
    ) {

      const increase =
        (
          (
            newSize -
            originalSize
          ) /
          originalSize
        ) *
        100;


      return t(
        'image.savingLarger',
        {

          percent:
            increase.toFixed(
              1
            )

        }
      );

    }


    return t(
      'image.savingSame'
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
  // PROGRESS
  // ============================================================

  function setProgress(
    job,
    value
  ) {

    if (
      !job ||
      !job.progressEl ||
      job.disposed
    ) {

      return;

    }


    const percent =
      Math.min(
        100,
        Math.max(
          0,
          Number(
            value
          ) || 0
        )
      );


    job.progressEl.style.width =
      `${percent}%`;

  }


  // ============================================================
  // INTERNAL ERROR KEYS
  // ============================================================

  const ERROR_CODE_TO_KEY = {

    IMAGE_LOAD_FAILED:
      'image.readInfoFailed',

    INVALID_IMAGE_DIMENSIONS:
      'errors.invalidImageDimensions',

    CANVAS_CONTEXT_FAILED:
      'errors.canvasContext',

    CREATE_FAILED:
      'errors.createFailed',

    JSZIP_NOT_AVAILABLE:
      'errors.processingFailed',

    PROCESSING_FAILED:
      'image.compressionFailed'

  };


  function errorKeyFromError(
    error
  ) {

    const code =
      error &&
      typeof error.message ===
        'string'
        ? error.message
        : 'PROCESSING_FAILED';


    return (
      ERROR_CODE_TO_KEY[
        code
      ] ||
      'image.compressionFailed'
    );

  }


  // ============================================================
  // COMPRESS JOB
  // ============================================================

  class CompressJob {

    constructor(
      file
    ) {

      this.id =
        'compress-' +
        (++jobSeq);


      this.file =
        file;


      this.format =
        getFormat();


      this.quality =
        getQuality();


      this.maxSize =
        getMaxSize();


      this.naturalW =
        0;


      this.naturalH =
        0;


      this.resultBlob =
        null;


      this.resultUrl =
        null;


      this.sourceUrl =
        null;


      this.isProcessing =
        false;


      this.disposed =
        false;


      this.imageReadFailed =
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
    // DOM
    // ========================================================

    buildDom() {

      const el =
        this.el;


      this.sourceUrl =
        URL.createObjectURL(
          this.file
        );


      this.previewImg =
        el.querySelector(
          '.js-preview'
        );


      this.statusEl =
        el.querySelector(
          '.js-status'
        );


      this.compressBtn =
        el.querySelector(
          '.js-compress-btn'
        );


      this.downloadBtn =
        el.querySelector(
          '.js-download-btn'
        );


      this.progressEl =
        el.querySelector(
          '.js-progress'
        );


      this.newDimEl =
        el.querySelector(
          '.js-newdim'
        );


      this.newSizeEl =
        el.querySelector(
          '.js-newsize'
        );


      this.savingEl =
        el.querySelector(
          '.js-saving'
        );


      this.filenameEl =
        el.querySelector(
          '.js-filename'
        );


      this.origDimEl =
        el.querySelector(
          '.js-origdim'
        );


      this.origSizeEl =
        el.querySelector(
          '.js-origsize'
        );


      // ------------------------------------------------------
      // Basic validation
      // ------------------------------------------------------

      if (
        !this.previewImg ||
        !this.compressBtn
      ) {

        this.disposed =
          true;


        return;

      }


      // ------------------------------------------------------
      // File information
      // ------------------------------------------------------

      if (
        this.filenameEl
      ) {

        this.filenameEl.textContent =
          this.file.name;

      }


      if (
        this.origSizeEl
      ) {

        this.origSizeEl.textContent =
          U.formatBytes(
            this.file.size
          );

      }


      if (
        this.origDimEl
      ) {

        this.origDimEl.textContent =
          t(
            'image.reading'
          );

      }


      if (
        this.newDimEl
      ) {

        this.newDimEl.textContent =
          '—';

      }


      if (
        this.newSizeEl
      ) {

        this.newSizeEl.textContent =
          '—';

      }


      if (
        this.savingEl
      ) {

        this.savingEl.textContent =
          '—';

      }


      setProgress(
        this,
        0
      );


      // ------------------------------------------------------
      // Processing state
      // ------------------------------------------------------

      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Image
      // ------------------------------------------------------

      this.previewImg.onload =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


          this.naturalW =
            this.previewImg.naturalWidth;


          this.naturalH =
            this.previewImg.naturalHeight;


          this.imageReadFailed =
            !(
              this.naturalW &&
              this.naturalH
            );


          if (
            this.origDimEl
          ) {

            if (
              this.naturalW &&
              this.naturalH
            ) {

              this.origDimEl.textContent =
                `${this.naturalW}×${this.naturalH}`;

            } else {

              this.origDimEl.textContent =
                t(
                  'image.readFailed'
                );

            }

          }


          if (
            this.naturalW &&
            this.naturalH
          ) {

            if (
              this.errorKey ===
              'image.readInfoFailed'
            ) {

              this.errorKey =
                null;

              this.errorParams =
                null;

            }


            if (
              this.statusEl &&
              !this.isProcessing
            ) {

              this.statusEl.textContent =
                t(
                  'image.waitingCompress'
                );


              this.statusEl.classList.remove(
                'is-error'
              );

            }


            if (
              this.compressBtn
            ) {

              this.compressBtn.disabled =
                false;

            }


            this.updatePreviewInfo();

          }

        };


      this.previewImg.onerror =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


          this.imageReadFailed =
            true;


          this.naturalW =
            0;


          this.naturalH =
            0;


          this.setError(
            'image.openFailed'
          );


          if (
            this.origDimEl
          ) {

            this.origDimEl.textContent =
              t(
                'image.readFailed'
              );

          }


          if (
            this.compressBtn
          ) {

            this.compressBtn.disabled =
              true;

          }

        };


      this.previewImg.src =
        this.sourceUrl;


      // ------------------------------------------------------
      // Compress
      // ------------------------------------------------------

      this.compressBtn.addEventListener(
        'click',
        () => {

          this.compress();

        }
      );


      // ------------------------------------------------------
      // Remove
      // ------------------------------------------------------

      const removeBtn =
        el.querySelector(
          '.js-remove-btn'
        );


      if (
        removeBtn
      ) {

        removeBtn.addEventListener(
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


      // ------------------------------------------------------
      // Initial language
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


      if (
        this.isProcessing
      ) {

        this.statusEl.textContent =
          t(
            'image.compressing'
          );


        return;

      }


      if (
        this.resultBlob
      ) {

        const saving =
          calculateSaving(
            this.file.size,
            this.resultBlob.size
          );


        if (
          saving.isSmaller
        ) {

          this.statusEl.textContent =
            t(
              'image.readySavedPercent',
              {

                percent:
                  saving.percent.toFixed(
                    1
                  )

              }
            );

        } else if (
          this.resultBlob.size >
          this.file.size
        ) {

          this.statusEl.textContent =
            t(
              'image.readyFileLarger'
            );

        } else {

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

        }


        this.statusEl.classList.remove(
          'is-error'
        );


        this.statusEl.classList.add(
          'is-ready'
        );


        return;

      }


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


        if (
          this.origDimEl &&
          this.imageReadFailed
        ) {

          this.origDimEl.textContent =
            t(
              'image.readFailed'
            );

        }


        return;

      }


      this.statusEl.textContent =
        t(
          'image.waitingCompress'
        );


      this.statusEl.classList.remove(
        'is-ready'
      );


      if (
        this.origDimEl &&
        !this.naturalW
      ) {

        this.origDimEl.textContent =
          t(
            'image.reading'
          );

      }

    }


    // ========================================================
    // PREVIEW INFO
    // ========================================================

    updatePreviewInfo() {

      if (
        this.disposed ||
        !this.naturalW ||
        !this.naturalH
      ) {

        return;

      }


      let dimensions =
        getOutputDimensions(
          this.naturalW,
          this.naturalH,
          this.maxSize
        );


      dimensions =
        fitCanvasDimensions(
          dimensions.width,
          dimensions.height
        );


      if (
        this.newDimEl
      ) {

        this.newDimEl.textContent =
          `${dimensions.width}×${dimensions.height}`;

      }

    }


    // ========================================================
    // UPDATE OPTIONS
    // ========================================================

    updateOptionsFromGlobal(
      invalidate = true
    ) {

      if (
        this.disposed
      ) {

        return false;

      }


      const nextFormat =
        getFormat();


      const nextQuality =
        getQuality();


      const nextMaxSize =
        getMaxSize();


      const changed =
        nextFormat !==
          this.format ||
        nextQuality !==
          this.quality ||
        nextMaxSize !==
          this.maxSize;


      this.format =
        nextFormat;


      this.quality =
        nextQuality;


      this.maxSize =
        nextMaxSize;


      if (
        this.naturalW &&
        this.naturalH
      ) {

        this.updatePreviewInfo();

      }


      if (
        invalidate &&
        changed &&
        !this.isProcessing
      ) {

        this.markStale();

      }


      return changed;

    }


    // ========================================================
    // MARK STALE
    // ========================================================

    markStale() {

      if (
        this.disposed ||
        this.isProcessing
      ) {

        return;

      }


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


      setProgress(
        this,
        0
      );


      if (
        this.newSizeEl
      ) {

        this.newSizeEl.textContent =
          '—';

      }


      if (
        this.savingEl
      ) {

        this.savingEl.textContent =
          '—';

      }


      /*
       * อย่า reset imageReadFailed
       * เพราะ state ของรูปต้องคงอยู่ตามความจริง
       */

      this.errorKey =
        null;


      this.errorParams =
        null;


      if (
        this.statusEl
      ) {

        this.statusEl.textContent =
          t(
            'image.waitingCompress'
          );


        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );

      }

    }


    // ========================================================
    // WAIT FOR IMAGE
    // ========================================================

    async waitForImage() {

      if (
        this.disposed
      ) {

        return false;

      }


      if (
        this.naturalW &&
        this.naturalH
      ) {

        return true;

      }


      if (
        this.imageReadFailed
      ) {

        return false;

      }


      /*
       * Browser โหลดเสร็จแล้ว
       */
      if (
        this.previewImg.complete
      ) {

        if (
          this.previewImg.naturalWidth &&
          this.previewImg.naturalHeight
        ) {

          this.naturalW =
            this.previewImg.naturalWidth;


          this.naturalH =
            this.previewImg.naturalHeight;


          this.imageReadFailed =
            false;


          return true;

        }


        this.imageReadFailed =
          true;


        return false;

      }


      return new Promise(
        resolve => {

          let settled =
            false;


          const cleanup =
            () => {

              this.previewImg.removeEventListener(
                'load',
                onLoad
              );


              this.previewImg.removeEventListener(
                'error',
                onError
              );

            };


          const finish =
            value => {

              if (
                settled
              ) {

                return;

              }


              settled =
                true;


              cleanup();


              resolve(
                value
              );

            };


          const onLoad =
            () => {

              if (
                this.disposed
              ) {

                finish(
                  false
                );

                return;

              }


              this.naturalW =
                this.previewImg.naturalWidth;


              this.naturalH =
                this.previewImg.naturalHeight;


              this.imageReadFailed =
                !(
                  this.naturalW &&
                  this.naturalH
                );


              finish(
                !!(
                  this.naturalW &&
                  this.naturalH
                )
              );

            };


          const onError =
            () => {

              this.imageReadFailed =
                true;


              finish(
                false
              );

            };


          this.previewImg.addEventListener(
            'load',
            onLoad
          );


          this.previewImg.addEventListener(
            'error',
            onError
          );

        }
      );

    }


    // ========================================================
    // COMPRESS
    // ========================================================

    async compress() {

      if (
        this.disposed ||
        this.isProcessing
      ) {

        return;

      }


      const loaded =
        await this.waitForImage();


      if (
        this.disposed
      ) {

        return;

      }


      if (
        !loaded ||
        !this.naturalW ||
        !this.naturalH
      ) {

        this.setError(
          'image.readInfoFailed'
        );


        if (
          this.compressBtn
        ) {

          this.compressBtn.disabled =
            true;

        }


        return;

      }


      /*
       * อ่านค่าปัจจุบันจาก global controls
       */
      this.updateOptionsFromGlobal(
        false
      );


      this.isProcessing =
        true;


      this.el.dataset.processing =
        'true';


      if (
        this.compressBtn
      ) {

        this.compressBtn.disabled =
          true;

      }


      if (
        this.statusEl
      ) {

        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );


        this.statusEl.textContent =
          t(
            'image.compressing'
          );

      }


      setProgress(
        this,
        8
      );


      await new Promise(
        resolve =>
          requestAnimationFrame(
            resolve
          )
      );


      if (
        this.disposed
      ) {

        this.finishProcessing();

        return;

      }


      let canvas =
        null;


      try {

        // ----------------------------------------------------
        // Dimensions
        // ----------------------------------------------------

        let dimensions =
          getOutputDimensions(
            this.naturalW,
            this.naturalH,
            this.maxSize
          );


        dimensions =
          fitCanvasDimensions(
            dimensions.width,
            dimensions.height
          );


        if (
          dimensions.width <= 0 ||
          dimensions.height <= 0
        ) {

          throw new Error(
            'INVALID_IMAGE_DIMENSIONS'
          );

        }


        if (
          this.newDimEl
        ) {

          this.newDimEl.textContent =
            `${dimensions.width}×${dimensions.height}`;

        }


        setProgress(
          this,
          25
        );


        // ----------------------------------------------------
        // Canvas
        // ----------------------------------------------------

        canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          dimensions.width;


        canvas.height =
          dimensions.height;


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

          throw new Error(
            'CANVAS_CONTEXT_FAILED'
          );

        }


        ctx.imageSmoothingEnabled =
          true;


        ctx.imageSmoothingQuality =
          'high';


        // ----------------------------------------------------
        // JPEG background
        // ----------------------------------------------------

        if (
          this.format ===
          'image/jpeg'
        ) {

          ctx.fillStyle =
            '#FFFFFF';


          ctx.fillRect(
            0,
            0,
            dimensions.width,
            dimensions.height
          );

        }


        setProgress(
          this,
          42
        );


        // ----------------------------------------------------
        // Draw
        // ----------------------------------------------------

        ctx.drawImage(
          this.previewImg,
          0,
          0,
          dimensions.width,
          dimensions.height
        );


        if (
          this.disposed
        ) {

          return;

        }


        setProgress(
          this,
          68
        );


        // ----------------------------------------------------
        // Encode
        // ----------------------------------------------------

        const quality =
          this.format ===
            'image/png'
            ? undefined
            : this.quality;


        const blob =
          await new Promise(
            (
              resolve,
              reject
            ) => {

              try {

                canvas.toBlob(
                  result => {

                    if (
                      result
                    ) {

                      resolve(
                        result
                      );

                    } else {

                      reject(
                        new Error(
                          'CREATE_FAILED'
                        )
                      );

                    }

                  },
                  this.format,
                  quality
                );

              } catch (
                error
              ) {

                reject(
                  error
                );

              }

            }
          );


        /*
         * สำคัญมาก:
         * user อาจ remove job ระหว่าง toBlob
         */
        if (
          this.disposed
        ) {

          return;

        }


        if (
          !blob
        ) {

          throw new Error(
            'CREATE_FAILED'
          );

        }


        setProgress(
          this,
          82
        );


        // ----------------------------------------------------
        // Previous result
        // ----------------------------------------------------

        if (
          this.resultUrl
        ) {

          revokeUrl(
            this.resultUrl
          );

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


        const ext =
          EXT_BY_FORMAT[
            this.format
          ] ||
          'jpg';


        const outputName =
          `${U.baseName(
            this.file.name
          )}.${ext}`;


        if (
          this.downloadBtn
        ) {

          this.downloadBtn.href =
            this.resultUrl;


          this.downloadBtn.download =
            outputName;


          this.downloadBtn.classList.remove(
            'hidden'
          );

        }


        if (
          this.newSizeEl
        ) {

          this.newSizeEl.textContent =
            U.formatBytes(
              blob.size
            );

        }


        if (
          this.savingEl
        ) {

          this.savingEl.textContent =
            formatSaving(
              this.file.size,
              blob.size
            );

        }


        setProgress(
          this,
          100
        );


        const saving =
          calculateSaving(
            this.file.size,
            blob.size
          );


        // ----------------------------------------------------
        // Success status
        // ----------------------------------------------------

        if (
          this.statusEl
        ) {

          if (
            saving.isSmaller
          ) {

            this.statusEl.textContent =
              t(
                'image.readySavedPercent',
                {

                  percent:
                    saving.percent.toFixed(
                      1
                    )

                }
              );

          } else if (
            blob.size >
            this.file.size
          ) {

            this.statusEl.textContent =
              t(
                'image.readyFileLarger'
              );

          } else {

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

          }


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
          '[Image Compress]',
          error
        );


        if (
          this.disposed
        ) {

          return;

        }


        setProgress(
          this,
          0
        );


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


        const key =
          errorKeyFromError(
            error
          );


        this.setError(
          key
        );

      } finally {

        if (
          canvas
        ) {

          try {

            canvas.width =
              1;

            canvas.height =
              1;

          } catch (_) {}


          canvas =
            null;

        }


        this.finishProcessing();

      }

    }


    // ========================================================
    // FINISH PROCESSING
    // ========================================================

    finishProcessing() {

      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';


      if (
        this.disposed
      ) {

        return;

      }


      if (
        this.compressBtn
      ) {

        this.compressBtn.disabled =
          this.imageReadFailed;

      }

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


      this.errorKey =
        key;


      this.errorParams =
        params;


      this.imageReadFailed =
        key ===
        'image.openFailed' ||
        key ===
        'image.readInfoFailed';


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
    // DISPOSE
    // ========================================================

    dispose() {

      if (
        this.disposed
      ) {

        return;

      }


      /*
       * ตัด async chain ทันที
       */
      this.disposed =
        true;


      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Source URL
      // ------------------------------------------------------

      if (
        this.sourceUrl
      ) {

        revokeUrl(
          this.sourceUrl
        );


        this.sourceUrl =
          null;

      }


      // ------------------------------------------------------
      // Result URL
      // ------------------------------------------------------

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


    if (
      countEl
    ) {

      countEl.textContent =
        String(
          activeJobs.length
        );

    }


    if (
      bulkbar
    ) {

      bulkbar.classList.toggle(
        'hidden',
        activeJobs.length === 0
      );

    }


    const hasReady =
      activeJobs.some(
        job =>
          !!job.resultBlob
      );


    if (
      downloadZipBtn
    ) {

      downloadZipBtn.classList.toggle(
        'hidden',
        !hasReady
      );

    }

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
          ALLOWED_FORMATS.includes(
            file.type
          )
      )
      .forEach(
        file => {

          /*
           * ไม่เพิ่มไฟล์เดิมซ้ำ
           */
          if (
            hasDuplicateFile(
              file
            )
          ) {

            return;

          }


          const job =
            new CompressJob(
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
  // REFRESH GLOBAL SETTINGS
  // ============================================================

  function refreshAllJobs() {

    jobs.forEach(
      job => {

        if (
          !job ||
          job.disposed
        ) {

          return;

        }


        job.updateOptionsFromGlobal(
          true
        );

      }
    );


    updateBulkUI();

  }


  if (
    qualityEl
  ) {

    qualityEl.addEventListener(
      'change',
      refreshAllJobs
    );

  }


  if (
    maxSizeEl
  ) {

    maxSizeEl.addEventListener(
      'change',
      refreshAllJobs
    );

  }


  if (
    formatEl
  ) {

    formatEl.addEventListener(
      'change',
      refreshAllJobs
    );

  }


  // ============================================================
  // CLEAR ALL
  // ============================================================

  if (
    clearAllBtn
  ) {

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

  }


  // ============================================================
  // COMPRESS ALL
  // ============================================================

  if (
    compressAllBtn
  ) {

    compressAllBtn.addEventListener(
      'click',
      async () => {

        if (
          compressAllBtn.disabled
        ) {

          return;

        }


        const queue =
          jobs.filter(
            job =>
              job &&
              !job.disposed
          );


        if (
          !queue.length
        ) {

          return;

        }


        /*
         * อ่านค่าปัจจุบันก่อนเริ่ม
         */
        queue.forEach(
          job => {

            job.updateOptionsFromGlobal(
              true
            );

          }
        );


        compressAllBtn.disabled =
          true;


        compressAllBtn.textContent =
          t(
            'image.compressingAll'
          );


        try {

          let index =
            0;


          async function worker() {

            while (
              true
            ) {

              const currentIndex =
                index++;


              if (
                currentIndex >=
                queue.length
              ) {

                return;

              }


              const job =
                queue[
                  currentIndex
                ];


              if (
                !job ||
                job.disposed ||
                job.isProcessing
              ) {

                continue;

              }


              await job.compress();

            }

          }


          const workerCount =
            Math.min(
              CONCURRENCY,
              queue.length
            );


          await Promise.all(
            Array.from(
              {
                length:
                  workerCount
              },
              () =>
                worker()
            )
          );


        } finally {

          compressAllBtn.disabled =
            false;


          compressAllBtn.textContent =
            t(
              'image.compressAll'
            );


          updateBulkUI();

        }

      }
    );

  }


  // ============================================================
  // DOWNLOAD ZIP
  // ============================================================

  if (
    downloadZipBtn
  ) {

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
                !job ||
                job.disposed ||
                !job.resultBlob
              ) {

                return;

              }


              const ext =
                EXT_BY_FORMAT[
                  job.format
                ] ||
                'jpg';


              const base =
                U.baseName(
                  job.file.name
                );


              let name =
                `${base}.${ext}`;


              let n =
                2;


              while (
                usedNames.has(
                  name
                )
              ) {

                name =
                  `${base}-${n++}.${ext}`;

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
            'compressed-images.zip'
          );


        } catch (
          error
        ) {

          console.error(
            '[Image Compress] ZIP failed:',
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

  }


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
        compressAllBtn &&
        !compressAllBtn.disabled
      ) {

        compressAllBtn.textContent =
          t(
            'image.compressAll'
          );

      }


      if (
        downloadZipBtn &&
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
            !job ||
            job.disposed
          ) {

            return;

          }


          job.updateLanguageUI();


          if (
            job.origDimEl &&
            !job.naturalW &&
            !job.imageReadFailed
          ) {

            job.origDimEl.textContent =
              t(
                'image.reading'
              );

          }


          if (
            job.origDimEl &&
            job.imageReadFailed
          ) {

            job.origDimEl.textContent =
              t(
                'image.readFailed'
              );

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
