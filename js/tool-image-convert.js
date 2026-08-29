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
      'dz-img-convert'
    );

  const fileInput =
    document.getElementById(
      'input-img-convert'
    );

  const bulkbar =
    document.getElementById(
      'bulk-img-convert'
    );

  const countEl =
    document.getElementById(
      'count-img-convert'
    );

  const bulkFormatEl =
    document.getElementById(
      'bulkFormat-img-convert'
    );

  const clearAllBtn =
    document.getElementById(
      'clearAll-img-convert'
    );

  const convertAllBtn =
    document.getElementById(
      'convertAll-img-convert'
    );

  const downloadZipBtn =
    document.getElementById(
      'downloadZip-img-convert'
    );

  const jobsEl =
    document.getElementById(
      'jobs-img-convert'
    );

  const jobTemplate =
    document.getElementById(
      'tpl-img-convert'
    );


  // ============================================================
  // SAFETY CHECK
  // ============================================================

  if (
    !dropzone ||
    !fileInput ||
    !bulkbar ||
    !countEl ||
    !bulkFormatEl ||
    !clearAllBtn ||
    !convertAllBtn ||
    !downloadZipBtn ||
    !jobsEl ||
    !jobTemplate
  ) {

    return;

  }


  // ============================================================
  // STATE
  // ============================================================

  let jobSeq =
    0;


  const jobs =
    [];


  const EXT_BY_FORMAT = {

    'image/png':
      'png',

    'image/jpeg':
      'jpg',

    'image/webp':
      'webp'

  };


  // ============================================================
  // CONVERT JOB
  // ============================================================

  class ConvertJob {

    constructor(
      file
    ) {

      this.id =
        'conv-' +
        (++jobSeq);


      this.file =
        file;


      this.format =
        'image/png';


      this.rotation =
        0;


      this.flipH =
        false;


      this.flipV =
        false;


      this.aspectLocked =
        true;


      this.naturalW =
        0;


      this.naturalH =
        0;


      this.resultBlob =
        null;


      this.resultUrl =
        null;


      this.isConverting =
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
    // BUILD DOM
    // ========================================================

    buildDom() {

      const el =
        this.el;


      const url =
        URL.createObjectURL(
          this.file
        );


      this.objectUrl =
        url;


      this.thumbImg =
        el.querySelector(
          '.ticket-thumb img'
        );


      this.widthInput =
        el.querySelector(
          '.js-width'
        );


      this.heightInput =
        el.querySelector(
          '.js-height'
        );


      this.lockBtn =
        el.querySelector(
          '.js-lock'
        );


      this.qualityRow =
        el.querySelector(
          '.js-quality-row'
        );


      this.qualityInput =
        el.querySelector(
          '.js-quality'
        );


      this.qualityVal =
        el.querySelector(
          '.js-quality-val'
        );


      this.statusEl =
        el.querySelector(
          '.js-status'
        );


      this.convertBtn =
        el.querySelector(
          '.js-convert-btn'
        );


      this.downloadBtn =
        el.querySelector(
          '.js-download-btn'
        );


      this.formatGroup =
        el.querySelector(
          '.js-format-group'
        );


      this.rotateGroup =
        el.querySelector(
          '.js-rotate-group'
        );


      // ------------------------------------------------------
      // File info
      // ------------------------------------------------------

      const filenameEl =
        el.querySelector(
          '.js-filename'
        );


      const originalSizeEl =
        el.querySelector(
          '.js-origsize'
        );


      const originalExtEl =
        el.querySelector(
          '.js-origext'
        );


      const originalDimEl =
        el.querySelector(
          '.js-origdim'
        );


      if (
        filenameEl
      ) {

        filenameEl.textContent =
          this.file.name;

      }


      if (
        originalSizeEl
      ) {

        originalSizeEl.textContent =
          U.formatBytes(
            this.file.size
          );

      }


      if (
        originalExtEl
      ) {

        originalExtEl.textContent =
          U.extOf(
            this.file.name
          );

      }


      // ------------------------------------------------------
      // Processing state for app.js
      // ------------------------------------------------------

      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Image
      // ------------------------------------------------------

      this.thumbImg.src =
        url;


      this.thumbImg.onload =
        () => {

          this.naturalW =
            this.thumbImg.naturalWidth;


          this.naturalH =
            this.thumbImg.naturalHeight;


          if (
            originalDimEl
          ) {

            originalDimEl.textContent =
              `${this.naturalW}×${this.naturalH}`;

          }


          /*
           * ตั้งค่า default dimensions
           */
          if (
            this.naturalW &&
            this.naturalH
          ) {

            if (
              !this.widthInput.value
            ) {

              this.widthInput.value =
                this.naturalW;

            }


            if (
              !this.heightInput.value
            ) {

              this.heightInput.value =
                this.naturalH;

            }

          }

        };


      this.thumbImg.onerror =
        () => {

          if (
            originalDimEl
          ) {

            originalDimEl.textContent =
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
            this.convertBtn
          ) {

            this.convertBtn.disabled =
              true;

          }

        };


      // ------------------------------------------------------
      // Initial UI
      // ------------------------------------------------------

      this.updateQualityVisibility();

      this.updateLanguageUI();


      // ------------------------------------------------------
      // Format
      // ------------------------------------------------------

      this.formatGroup.addEventListener(
        'click',
        event => {

          const btn =
            event.target.closest(
              '.seg-btn'
            );


          if (
            !btn
          ) {

            return;

          }


          this.formatGroup
            .querySelectorAll(
              '.seg-btn'
            )
            .forEach(
              button =>
                button.classList.remove(
                  'is-active'
                )
            );


          btn.classList.add(
            'is-active'
          );


          this.format =
            btn.dataset.format;


          this.updateQualityVisibility();

          this.markStale();

        }
      );


      // ------------------------------------------------------
      // Rotate / Flip
      // ------------------------------------------------------

      this.rotateGroup.addEventListener(
        'click',
        event => {

          const btn =
            event.target.closest(
              '.seg-btn'
            );


          if (
            !btn
          ) {

            return;

          }


          const action =
            btn.dataset.action;


          if (
            action ===
            'rotate-left'
          ) {

            this.rotation =
              (
                this.rotation +
                270
              ) %
              360;

          } else if (
            action ===
            'rotate-right'
          ) {

            this.rotation =
              (
                this.rotation +
                90
              ) %
              360;

          } else if (
            action ===
            'flip-h'
          ) {

            this.flipH =
              !this.flipH;

          } else if (
            action ===
            'flip-v'
          ) {

            this.flipV =
              !this.flipV;

          }


          btn.classList.toggle(
            'is-active',
            (
              action ===
                'flip-h' &&
              this.flipH
            ) ||
            (
              action ===
                'flip-v' &&
              this.flipV
            )
          );


          this.markStale();

        }
      );


      // ------------------------------------------------------
      // Aspect lock
      // ------------------------------------------------------

      this.lockBtn.addEventListener(
        'click',
        () => {

          this.aspectLocked =
            !this.aspectLocked;


          this.lockBtn.classList.toggle(
            'is-locked',
            this.aspectLocked
          );

        }
      );


      // ------------------------------------------------------
      // Width
      // ------------------------------------------------------

      this.widthInput.addEventListener(
        'input',
        () => {

          if (
            this.aspectLocked &&
            this.widthInput.value &&
            this.naturalW
          ) {

            const ratio =
              this.naturalH /
              this.naturalW;


            const width =
              parseFloat(
                this.widthInput.value
              );


            if (
              Number.isFinite(
                width
              )
            ) {

              this.heightInput.value =
                Math.max(
                  1,
                  Math.round(
                    width *
                    ratio
                  )
                );

            }

          }


          this.markStale();

        }
      );


      // ------------------------------------------------------
      // Height
      // ------------------------------------------------------

      this.heightInput.addEventListener(
        'input',
        () => {

          if (
            this.aspectLocked &&
            this.heightInput.value &&
            this.naturalH
          ) {

            const ratio =
              this.naturalW /
              this.naturalH;


            const height =
              parseFloat(
                this.heightInput.value
              );


            if (
              Number.isFinite(
                height
              )
            ) {

              this.widthInput.value =
                Math.max(
                  1,
                  Math.round(
                    height *
                    ratio
                  )
                );

            }

          }


          this.markStale();

        }
      );


      // ------------------------------------------------------
      // Quality
      // ------------------------------------------------------

      this.qualityInput.addEventListener(
        'input',
        () => {

          const value =
            parseFloat(
              this.qualityInput.value
            );


          const percent =
            Number.isFinite(
              value
            )
              ? Math.round(
                  value *
                  100
                )
              : 0;


          this.qualityVal.textContent =
            percent +
            '%';


          this.markStale();

        }
      );


      // ------------------------------------------------------
      // Convert
      // ------------------------------------------------------

      this.convertBtn.addEventListener(
        'click',
        () => {

          this.convert();

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

    }


    // ========================================================
    // LANGUAGE UI
    // ========================================================

    updateLanguageUI() {

      if (
        !this.statusEl
      ) {

        return;

      }


      /*
       * กำลังแปลง
       *
       * ไม่แก้ข้อความตรงนี้ เพราะ convert()
       * จะดูแลข้อความ dynamic เอง
       */
      if (
        this.isConverting
      ) {

        this.statusEl.textContent =
          t(
            'image.converting'
          );

        return;

      }


      /*
       * มีผลลัพธ์แล้ว
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
       * ถ้า error อยู่
       * อย่าเขียนทับ error เดิม
       */
      if (
        this.statusEl.classList.contains(
          'is-error'
        )
      ) {

        return;

      }


      /*
       * รอแปลง
       */
      this.statusEl.textContent =
        t(
          'image.waitingConvert'
        );

    }


    // ========================================================
    // QUALITY VISIBILITY
    // ========================================================

    updateQualityVisibility() {

      if (
        !this.qualityRow
      ) {

        return;

      }


      this.qualityRow.classList.toggle(
        'hidden',
        this.format ===
          'image/png'
      );

    }


    // ========================================================
    // MARK STALE
    // ========================================================

    markStale() {

      if (
        this.isConverting
      ) {

        return;

      }


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
        this.statusEl
      ) {

        this.statusEl.textContent =
          t(
            'image.waitingConvert'
          );


        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );

      }

    }


    // ========================================================
    // CONVERT
    // ========================================================

    async convert() {

      if (
        this.isConverting
      ) {

        return;

      }


      // ------------------------------------------------------
      // Wait for image metadata
      // ------------------------------------------------------

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


            this.thumbImg.addEventListener(
              'load',
              resolve,
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


        return;

      }


      // ------------------------------------------------------
      // Set processing state
      // ------------------------------------------------------

      this.isConverting =
        true;


      this.el.dataset.processing =
        'true';


      this.convertBtn.disabled =
        true;


      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );


      this.statusEl.textContent =
        t(
          'image.converting'
        );


      try {

        // --------------------------------------------------
        // Rotation
        // --------------------------------------------------

        const rotSwaps =
          this.rotation %
            180 !==
          0;


        const rotW =
          rotSwaps
            ? this.naturalH
            : this.naturalW;


        const rotH =
          rotSwaps
            ? this.naturalW
            : this.naturalH;


        // --------------------------------------------------
        // Output dimensions
        // --------------------------------------------------

        const outW =
          Math.max(
            1,
            parseInt(
              this.widthInput.value,
              10
            ) ||
            rotW
          );


        const outH =
          Math.max(
            1,
            parseInt(
              this.heightInput.value,
              10
            ) ||
            rotH
          );


        // --------------------------------------------------
        // Canvas
        // --------------------------------------------------

        const canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          outW;


        canvas.height =
          outH;


        const ctx =
          canvas.getContext(
            '2d'
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


        // --------------------------------------------------
        // JPEG background
        // --------------------------------------------------

        if (
          this.format ===
          'image/jpeg'
        ) {

          ctx.fillStyle =
            '#FFFFFF';


          ctx.fillRect(
            0,
            0,
            outW,
            outH
          );

        }


        // --------------------------------------------------
        // Draw dimensions
        // --------------------------------------------------

        const dw =
          rotSwaps
            ? outH
            : outW;


        const dh =
          rotSwaps
            ? outW
            : outH;


        // --------------------------------------------------
        // Transform
        // --------------------------------------------------

        ctx.save();


        ctx.translate(
          outW / 2,
          outH / 2
        );


        ctx.rotate(
          (
            this.rotation *
            Math.PI
          ) /
          180
        );


        ctx.scale(
          this.flipH
            ? -1
            : 1,
          this.flipV
            ? -1
            : 1
        );


        ctx.drawImage(
          this.thumbImg,
          -dw / 2,
          -dh / 2,
          dw,
          dh
        );


        ctx.restore();


        // --------------------------------------------------
        // Encode
        // --------------------------------------------------

        const quality =
          this.format ===
          'image/png'
            ? undefined
            : parseFloat(
                this.qualityInput.value
              );


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


        // --------------------------------------------------
        // Previous result URL
        // --------------------------------------------------

        if (
          this.resultUrl
        ) {

          try {

            URL.revokeObjectURL(
              this.resultUrl
            );

          } catch (_) {}

        }


        // --------------------------------------------------
        // Store result
        // --------------------------------------------------

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
          'png';


        const filename =
          `${U.baseName(
            this.file.name
          )}.${ext}`;


        this.downloadBtn.href =
          this.resultUrl;


        this.downloadBtn.download =
          filename;


        this.downloadBtn.classList.remove(
          'hidden'
        );


        // --------------------------------------------------
        // Success
        // --------------------------------------------------

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


      } catch (
        err
      ) {

        console.error(
          '[Image Convert]',
          err
        );


        const message =
          err &&
          err.message
            ? err.message
            : t(
                'errors.processingFailed'
              );


        this.statusEl.textContent =
          t(
            'image.conversionFailed',
            {
              message
            }
          );


        this.statusEl.classList.remove(
          'is-ready'
        );


        this.statusEl.classList.add(
          'is-error'
        );

      } finally {

        this.isConverting =
          false;


        this.el.dataset.processing =
          'false';


        this.convertBtn.disabled =
          false;

      }

    }


    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {

      this.isConverting =
        false;


      if (
        this.el
      ) {

        this.el.dataset.processing =
          'false';

      }


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


    const hasReady =
      jobs.some(
        job =>
          !!job.resultBlob
      );


    downloadZipBtn.classList.toggle(
      'hidden',
      !hasReady
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

          const job =
            new ConvertJob(
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
  // BULK FORMAT
  // ============================================================

  bulkFormatEl.addEventListener(
    'change',
    () => {

      const format =
        bulkFormatEl.value;


      if (
        !format
      ) {

        return;

      }


      jobs.forEach(
        job => {

          job.format =
            format;


          job.formatGroup
            .querySelectorAll(
              '.seg-btn'
            )
            .forEach(
              button => {

                button.classList.toggle(
                  'is-active',
                  button.dataset.format ===
                    format
                );

              }
            );


          job.updateQualityVisibility();

          job.markStale();

        }
      );


      updateBulkUI();

    }
  );


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


      updateBulkUI();

    }
  );


  // ============================================================
  // CONVERT ALL
  // ============================================================

  convertAllBtn.addEventListener(
    'click',
    async () => {

      if (
        !jobs.length
      ) {

        return;

      }


      convertAllBtn.disabled =
        true;


      convertAllBtn.textContent =
        t(
          'image.convertingAll'
        );


      try {

        const CONCURRENCY =
          3;


        let index =
          0;


        async function worker() {

          while (
            index <
            jobs.length
          ) {

            const job =
              jobs[
                index++
              ];


            if (
              !job
            ) {

              continue;

            }


            await job.convert();

          }

        }


        await Promise.all(
          Array.from(
            {
              length:
                Math.min(
                  CONCURRENCY,
                  jobs.length
                )
            },
            () =>
              worker()
          )
        );


      } finally {

        convertAllBtn.disabled =
          false;


        convertAllBtn.textContent =
          t(
            'image.convertAll'
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

            const ext =
              EXT_BY_FORMAT[
                job.format
              ] ||
              'png';


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
          'converted-images.zip'
        );


      } catch (
        err
      ) {

        console.error(
          '[Image Convert] ZIP failed:',
          err
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
       * Bulk buttons
       */

      if (
        !convertAllBtn.disabled
      ) {

        convertAllBtn.textContent =
          t(
            'image.convertAll'
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


      /*
       * Existing jobs
       */

      jobs.forEach(
        job => {

          job.updateLanguageUI();

        }
      );

    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateBulkUI();

})();
