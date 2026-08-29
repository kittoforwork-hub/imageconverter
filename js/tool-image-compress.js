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


  const MAX_DIMENSION_LIMIT =
    20000;


  const CONCURRENCY =
    3;


  const MAX_CANVAS_PIXELS =
    100000000;


  // ============================================================
  // HELPERS
  // ============================================================

  function getQuality() {

    if (
      !qualityEl
    ) {

      return 0.85;

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

      return 0.85;

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


  function getOutputDimensions(
    naturalW,
    naturalH,
    maxSize
  ) {

    if (
      !naturalW ||
      !naturalH
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
        naturalW,
        naturalH
      ) <= maxSize
    ) {

      return {

        width:
          Math.max(
            1,
            Math.round(
              naturalW
            )
          ),

        height:
          Math.max(
            1,
            Math.round(
              naturalH
            )
          )

      };
    }


    const scale =
      maxSize /
      Math.max(
        naturalW,
        naturalH
      );


    const width =
      Math.max(
        1,
        Math.round(
          naturalW *
          scale
        )
      );


    const height =
      Math.max(
        1,
        Math.round(
          naturalH *
          scale
        )
      );


    return {

      width,

      height

    };
  }


  function fitCanvasDimensions(
    width,
    height
  ) {

    let outW =
      width;

    let outH =
      height;


    const pixels =
      outW *
      outH;


    if (
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
            result.percent.toFixed(1),

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
            increase.toFixed(1)

        }
      );

    }


    return t(
      'image.savingSame'
    );
  }


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


  function setProgress(
    job,
    value
  ) {

    if (
      !job.progressEl
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


      /*
       * สำคัญสำหรับ app.js
       */
      this.el.dataset.processing =
        'false';


      this.previewImg.src =
        this.sourceUrl;


      this.previewImg.onload =
        () => {

          this.naturalW =
            this.previewImg.naturalWidth;


          this.naturalH =
            this.previewImg.naturalHeight;


          if (
            this.origDimEl
          ) {

            this.origDimEl.textContent =
              `${this.naturalW}×${this.naturalH}`;

          }


          this.updatePreviewInfo();

        };


      this.previewImg.onerror =
        () => {

          if (
            this.origDimEl
          ) {

            this.origDimEl.textContent =
              t(
                'image.readFailed'
              );

          }


          if (
            this.statusEl
          ) {

            this.statusEl.textContent =
              t(
                'image.openFailed'
              );


            this.statusEl.classList.remove(
              'is-ready'
            );


            this.statusEl.classList.add(
              'is-error'
            );

          }


          if (
            this.compressBtn
          ) {

            this.compressBtn.disabled =
              true;

          }

        };


      if (
        this.compressBtn
      ) {

        this.compressBtn.addEventListener(
          'click',
          () => {

            this.compress();

          }
        );

      }


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


      this.updateLanguageUI();
    }


    // ========================================================
    // LANGUAGE UI
    // ========================================================

    updateLanguageUI() {

      if (
        this.isProcessing
      ) {

        return;

      }


      /*
       * Result exists
       */
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


      /*
       * If current state is error,
       * don't overwrite it during language refresh.
       */
      if (
        this.statusEl &&
        this.statusEl.classList.contains(
          'is-error'
        )
      ) {

        return;

      }


      /*
       * Waiting
       */
      if (
        this.statusEl
      ) {

        this.statusEl.textContent =
          t(
            'image.waitingCompress'
          );


        this.statusEl.classList.remove(
          'is-ready'
        );

      }


      /*
       * Original image metadata
       */
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
        !this.naturalW ||
        !this.naturalH
      ) {

        return;

      }


      const dimensions =
        getOutputDimensions(
          this.naturalW,
          this.naturalH,
          this.maxSize
        );


      const safeDimensions =
        fitCanvasDimensions(
          dimensions.width,
          dimensions.height
        );


      if (
        this.newDimEl
      ) {

        this.newDimEl.textContent =
          `${safeDimensions.width}×${safeDimensions.height}`;

      }

    }


    // ========================================================
    // UPDATE OPTIONS
    // ========================================================

    updateOptionsFromGlobal(
      invalidate = true
    ) {

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
        changed
      ) {

        this.markStale();

      }

    }


    // ========================================================
    // MARK STALE
    // ========================================================

    markStale() {

      if (
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
    // COMPRESS
    // ========================================================

    async compress() {

      if (
        this.isProcessing
      ) {

        return;

      }


      /*
       * Wait for image
       */

      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        await new Promise(
          resolve => {

            if (
              this.naturalW &&
              this.naturalH
            ) {

              resolve();

              return;

            }


            const onLoad =
              () => {

                resolve();

              };


            this.previewImg.addEventListener(
              'load',
              onLoad,
              {
                once:
                  true
              }
            );

          }
        );

      }


      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        if (
          this.statusEl
        ) {

          this.statusEl.textContent =
            t(
              'image.readInfoFailed'
            );


          this.statusEl.classList.remove(
            'is-ready'
          );


          this.statusEl.classList.add(
            'is-error'
          );

        }


        return;

      }


      this.updateOptionsFromGlobal(
        false
      );


      this.isProcessing =
        true;


      this.el.dataset.processing =
        'true';


      this.compressBtn.disabled =
        true;


      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );


      this.statusEl.textContent =
        t(
          'image.compressing'
        );


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


      let canvas =
        null;


      try {

        // ----------------------------------------------------
        // Calculate dimensions
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
            t(
              'errors.invalidImageDimensions'
            )
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
            t(
              'errors.canvasContext'
            )
          );

        }


        // ----------------------------------------------------
        // JPG background
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


        ctx.imageSmoothingEnabled =
          true;


        ctx.imageSmoothingQuality =
          'high';


        setProgress(
          this,
          42
        );


        ctx.drawImage(
          this.previewImg,
          0,
          0,
          dimensions.width,
          dimensions.height
        );


        setProgress(
          this,
          68
        );


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
                        t(
                          'errors.createFailed'
                        )
                      )
                    );

                  }

                },
                this.format,
                quality
              );

            }
          );


        if (
          !blob
        ) {

          throw new Error(
            t(
              'errors.createFailed'
            )
          );

        }


        setProgress(
          this,
          82
        );


        if (
          this.resultUrl
        ) {

          revokeUrl(
            this.resultUrl
          );

        }


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


      } catch (
        error
      ) {

        console.error(
          '[Image Compress]',
          error
        );


        setProgress(
          this,
          0
        );


        if (
          this.downloadBtn
        ) {

          this.downloadBtn.classList.add(
            'hidden'
          );

        }


        this.statusEl.textContent =
          t(
            'image.compressionFailed',
            {
              message:
                error &&
                error.message
                  ? error.message
                  : t(
                      'errors.somethingWentWrong'
                    )
            }
          );


        this.statusEl.classList.remove(
          'is-ready'
        );


        this.statusEl.classList.add(
          'is-error'
        );

      } finally {

        if (
          canvas
        ) {

          canvas.width =
            1;


          canvas.height =
            1;


          canvas =
            null;

        }


        this.isProcessing =
          false;


        this.compressBtn.disabled =
          false;


        this.el.dataset.processing =
          'false';

      }

    }


    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {

      if (
        this.sourceUrl
      ) {

        revokeUrl(
          this.sourceUrl
        );

      }


      if (
        this.resultUrl
      ) {

        revokeUrl(
          this.resultUrl
        );

      }


      this.sourceUrl =
        null;


      this.resultUrl =
        null;


      this.resultBlob =
        null;


      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';

    }

  }


  // ============================================================
  // BULK UI
  // ============================================================

  function updateBulkUI() {

    if (
      countEl
    ) {

      countEl.textContent =
        String(
          jobs.length
        );

    }


    if (
      bulkbar
    ) {

      bulkbar.classList.toggle(
        'hidden',
        jobs.length === 0
      );

    }


    const hasReady =
      jobs.some(
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

    const files =
      Array.from(
        fileList || []
      );


    files
      .filter(
        file =>
          file &&
          ALLOWED_FORMATS.includes(
            file.type
          )
      )
      .forEach(
        file => {

          const job =
            new CompressJob(
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
  // REFRESH GLOBAL SETTINGS
  // ============================================================

  function refreshAllJobs() {

    jobs.forEach(
      job => {

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
          job =>
            job.dispose()
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
          !jobs.length
        ) {

          return;

        }


        refreshAllJobs();


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
              index <
              jobs.length
            ) {

              const job =
                jobs[index++];


              if (
                !job ||
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
              jobs.length
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
          job =>
            job.dispose()
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

      /*
       * Bulk buttons
       */

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


      /*
       * Labels inside current jobs
       */

      jobs.forEach(
        job => {

          job.updateLanguageUI();

          if (
            job.origDimEl &&
            !job.naturalW
          ) {

            job.origDimEl.textContent =
              t(
                'image.reading'
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
