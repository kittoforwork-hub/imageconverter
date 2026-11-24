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

  const concurrency = navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4 ? 1 : 2;
  const pool = typeof Worker === 'function' && typeof OffscreenCanvas === 'function' &&
    typeof createImageBitmap === 'function' && window.KittoWorkerPool
    ? new window.KittoWorkerPool(
      new URL('image-convert-core.js', document.currentScript.src), concurrency
    )
    : null;
  const batchProgress = document.getElementById('progress-img-convert');
  const zipError = document.getElementById('zip-error-img-convert');


  const EXT_BY_FORMAT = {

    'image/png':
      'png',

    'image/jpeg':
      'jpg',

    'image/webp':
      'webp'

  };


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


      this.disposed =
        false;


      /*
       * Error key / params
       * เก็บไว้เพื่อแปลใหม่เมื่อ language เปลี่ยน
       */
      this.errorKey =
        null;


      this.errorParams =
        null;


      this.imageReadFailed =
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


      this.sizePreset =
        el.querySelector(
          '.js-size-preset'
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
      // Processing state
      // ------------------------------------------------------

      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Image
      // ------------------------------------------------------

      this.thumbImg.onload =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


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

            const rotated =
              this.getRotatedNaturalSize();


            if (
              !this.widthInput.value
            ) {

              this.widthInput.value =
                rotated.w;

            }


            if (
              !this.heightInput.value
            ) {

              this.heightInput.value =
                rotated.h;

            }

          }

        };


      this.thumbImg.onerror =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


          this.imageReadFailed =
            true;


          if (
            originalDimEl
          ) {

            originalDimEl.textContent =
              t(
                'image.readFailed'
              );

          }


          this.setError(
            'errors.imageLoadFailed'
          );


          if (
            this.convertBtn
          ) {

            this.convertBtn.disabled =
              true;

          }

        };


      this.thumbImg.src =
        url;


      // ------------------------------------------------------
      // Initial UI
      // ------------------------------------------------------

      this.updateQualityVisibility();

      this.updateLanguageUI();


      // ------------------------------------------------------
      // Format
      // ------------------------------------------------------

      if (
        this.formatGroup
      ) {

        this.formatGroup.addEventListener(
          'click',
          event => {

            if (
              this.isConverting ||
              this.disposed
            ) {

              return;

            }


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

      }


      // ------------------------------------------------------
      // Rotate / Flip
      // ------------------------------------------------------

      if (
        this.rotateGroup
      ) {

        this.rotateGroup.addEventListener(
          'click',
          event => {

            if (
              this.isConverting ||
              this.disposed
            ) {

              return;

            }


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


              this.swapDimensions();
              if (this.sizePreset) this.sizePreset.value = 'custom';

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


              this.swapDimensions();
              if (this.sizePreset) this.sizePreset.value = 'custom';

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

      }


      // ------------------------------------------------------
      // Aspect lock
      // ------------------------------------------------------

      if (
        this.lockBtn
      ) {

        this.lockBtn.addEventListener(
          'click',
          () => {

            if (
              this.isConverting ||
              this.disposed
            ) {

              return;

            }


            this.aspectLocked =
              !this.aspectLocked;


            this.lockBtn.classList.toggle(
              'is-locked',
              this.aspectLocked
            );

          }
        );

      }


      // ------------------------------------------------------
      // Size presets (fit inside the selected box; never crop)
      // ------------------------------------------------------

      if (this.sizePreset) {
        this.sizePreset.addEventListener('change', () => {
          if (this.isConverting || this.disposed) return;

          const presets = {
            square: [1000, 1000],
            portrait: [1080, 1350],
            story: [1080, 1920],
            landscape: [1200, 630],
            a4: [2480, 3508]
          };
          const box = presets[this.sizePreset.value];

          if (!box || !this.naturalW || !this.naturalH) {
            return;
          }

          const natural = this.getRotatedNaturalSize();
          const scale = Math.min(
            1,
            box[0] / natural.w,
            box[1] / natural.h
          );

          this.widthInput.value = String(Math.max(1, Math.round(natural.w * scale)));
          this.heightInput.value = String(Math.max(1, Math.round(natural.h * scale)));
          this.aspectLocked = true;
          this.lockBtn?.classList.add('is-locked');
          this.markStale();
        });
      }


      // ------------------------------------------------------
      // Width
      // ------------------------------------------------------

      if (
        this.widthInput
      ) {

        this.widthInput.addEventListener(
          'input',
          () => {

            if (
              this.isConverting ||
              this.disposed
            ) {

              return;

            }


            if (
              this.aspectLocked &&
              this.widthInput.value &&
              this.naturalW &&
              this.naturalH
            ) {

              const natural =
                this.getRotatedNaturalSize();


              const ratio =
                natural.h /
                natural.w;


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


            if (this.sizePreset) this.sizePreset.value = 'custom';
            this.markStale();

          }
        );

      }


      // ------------------------------------------------------
      // Height
      // ------------------------------------------------------

      if (
        this.heightInput
      ) {

        this.heightInput.addEventListener(
          'input',
          () => {

            if (
              this.isConverting ||
              this.disposed
            ) {

              return;

            }


            if (
              this.aspectLocked &&
              this.heightInput.value &&
              this.naturalW &&
              this.naturalH
            ) {

              const natural =
                this.getRotatedNaturalSize();


              const ratio =
                natural.w /
                natural.h;


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


            if (this.sizePreset) this.sizePreset.value = 'custom';
            this.markStale();

          }
        );

      }


      // ------------------------------------------------------
      // Quality
      // ------------------------------------------------------

      if (
        this.qualityInput
      ) {

        this.qualityInput.addEventListener(
          'input',
          () => {

            if (
              this.isConverting ||
              this.disposed
            ) {

              return;

            }


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


            if (
              this.qualityVal
            ) {

              this.qualityVal.textContent =
                percent +
                '%';

            }


            this.markStale();

          }
        );

      }


      // ------------------------------------------------------
      // Convert
      // ------------------------------------------------------

      if (
        this.convertBtn
      ) {

        this.convertBtn.addEventListener(
          'click',
          () => {

            this.convert();

          }
        );

      }


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
    // ROTATED NATURAL SIZE
    // ========================================================

    getRotatedNaturalSize() {

      const swapped =
        this.rotation %
        180 !==
        0;


      return {

        w:
          swapped
            ? this.naturalH
            : this.naturalW,

        h:
          swapped
            ? this.naturalW
            : this.naturalH

      };

    }


    // ========================================================
    // SWAP DIMENSIONS
    // ========================================================

    swapDimensions() {

      if (
        !this.widthInput ||
        !this.heightInput
      ) {

        return;

      }


      const width =
        this.widthInput.value;


      const height =
        this.heightInput.value;


      /*
       * เวลา rotate 90 / 270
       * ให้ output width / height สลับตาม
       * เพื่อไม่ให้ภาพโดนยืดหรือบีบ
       */
      this.widthInput.value =
        height;


      this.heightInput.value =
        width;

    }


    // ========================================================
    // LANGUAGE UI
    // ========================================================

    updateLanguageUI() {

      if (
        !this.statusEl ||
        this.disposed
      ) {

        return;

      }


      /*
       * กำลังแปลง
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
       * error
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
       * รอแปลง
       */
      this.statusEl.textContent =
        t(
          'image.waitingConvert'
        );

    }


    // ========================================================
    // ERROR
    // ========================================================

    setError(
      key,
      params = null
    ) {

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
    // SET CONTROL STATE
    // ========================================================

    setControlsDisabled(
      disabled
    ) {

      if (
        this.disposed
      ) {

        return;

      }


      if (
        this.widthInput
      ) {

        this.widthInput.disabled =
          disabled;

      }


      if (
        this.heightInput
      ) {

        this.heightInput.disabled =
          disabled;

      }


      if (
        this.lockBtn
      ) {

        this.lockBtn.disabled =
          disabled;

      }


      if (
        this.qualityInput
      ) {

        this.qualityInput.disabled =
          disabled;

      }


      if (
        this.formatGroup
      ) {

        this.formatGroup
          .querySelectorAll(
            '.seg-btn'
          )
          .forEach(
            btn => {

              btn.disabled =
                disabled;

            }
          );

      }


      if (
        this.rotateGroup
      ) {

        this.rotateGroup
          .querySelectorAll(
            '.seg-btn'
          )
          .forEach(
            btn => {

              btn.disabled =
                disabled;

            }
          );

      }


      const removeBtn =
        this.el.querySelector(
          '.js-remove-btn'
        );


      if (
        removeBtn
      ) {

        removeBtn.disabled =
          disabled;

      }

    }


    // ========================================================
    // MARK STALE
    // ========================================================

    markStale() {

      if (
        this.isConverting ||
        this.disposed
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

        } catch (_) { }


        this.resultUrl =
          null;

      }


      const hadResult = Boolean(this.resultBlob);
      this.resultBlob =
        null;

      if (hadResult) updateBulkUI();

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


      this.errorKey =
        null;


      this.errorParams =
        null;


      if (this.imageReadFailed) {
        this.setError('errors.imageLoadFailed');
        return;
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
       * Browser อาจโหลด image สำเร็จไปแล้ว
       * แต่ onload ยังไม่ถูกใช้งานตาม flow ปกติ
       */
      if (
        this.thumbImg.complete
      ) {

        if (
          this.thumbImg.naturalWidth &&
          this.thumbImg.naturalHeight
        ) {

          this.naturalW =
            this.thumbImg.naturalWidth;


          this.naturalH =
            this.thumbImg.naturalHeight;


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

              this.thumbImg.removeEventListener(
                'load',
                onLoad
              );


              this.thumbImg.removeEventListener(
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


              this.cancelImageWait = null;
              cleanup();

              resolve(
                value
              );

            };


          this.cancelImageWait = () => finish(false);

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
                this.thumbImg.naturalWidth;


              this.naturalH =
                this.thumbImg.naturalHeight;


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


          this.thumbImg.addEventListener(
            'load',
            onLoad,
            {
              once:
                true
            }
          );


          this.thumbImg.addEventListener(
            'error',
            onError,
            {
              once:
                true
            }
          );

        }
      );

    }


    // ========================================================
    // CONVERT
    // ========================================================

    async convert() {
      if (this.isConverting || this.disposed) return;

      this.markStale();
      this.isConverting = true;
      this.el.dataset.processing = 'true';
      this.setControlsDisabled(true);
      this.convertBtn.disabled = true;
      this.statusEl.textContent = t('image.converting');
      const controller = new AbortController();
      this.conversion = controller;

      try {
        const loaded = await this.waitForImage();
        if (this.disposed) return;
        if (!loaded || !this.naturalW || !this.naturalH) {
          this.setError('image.imageReadFailed');
          return;
        }

        const rotated = this.getRotatedNaturalSize();
        const width = Math.max(1, parseInt(this.widthInput.value, 10) || rotated.w);
        const height = Math.max(1, parseInt(this.heightInput.value, 10) || rotated.h);
        if (width > 16384 || height > 16384 || width * height > 64000000) {
          this.setError('errors.invalidImageDimensions');
          return;
        }

        const options = {
          width,
          height,
          format: this.format,
          rotation: this.rotation,
          flipH: this.flipH,
          flipV: this.flipV,
          quality: this.format === 'image/png' ? undefined : Number(this.qualityInput.value)
        };

        let blob;
        if (pool && Object.hasOwn(EXT_BY_FORMAT, this.file.type)) {
          try {
            ({ blob } = await pool.transform(this.file, options, controller.signal));
          } catch (error) {
            if (controller.signal.aborted) return;
            if (error.message === 'CREATE_FAILED') throw error;
          }
        }

        if (!blob) {
          // Yield a paint before drawing on browsers or image formats using the DOM canvas.
          if (document.visibilityState === 'visible') {
            await Promise.race([U.yieldToUI().then(U.yieldToUI), new Promise(resolve => setTimeout(resolve, 80))]);
          }
          if (this.disposed) return;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          blob = await window.KittoEncodeImage(this.thumbImg, options, canvas);
        }

        if (this.disposed) return;

        this.resultUrl = URL.createObjectURL(blob);
        this.resultBlob = blob;
        this.downloadBtn.href = this.resultUrl;
        this.downloadBtn.download = `${U.baseName(this.file.name)}.${EXT_BY_FORMAT[this.format]}`;
        this.downloadBtn.classList.remove('hidden');
        this.statusEl.textContent = t('image.readyDownload', { size: U.formatBytes(blob.size) });
        this.statusEl.classList.add('is-ready');
      } catch (error) {
        if (this.disposed) return;
        console.error('[Image Convert]', error);
        const errorKeys = {
          CANVAS_CONTEXT_FAILED: 'errors.canvasContext',
          CREATE_FAILED: 'errors.createFailed'
        };
        this.setError(errorKeys[error.message] || 'errors.processingFailed');
      } finally {
        this.conversion = null;
        this.isConverting = false;
        this.el.dataset.processing = 'false';
        if (!this.disposed) {
          this.setControlsDisabled(false);
          this.convertBtn.disabled = this.imageReadFailed;
          updateBulkUI();
        }
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
       * สำคัญ:
       * ป้องกัน async convert() ที่ยังทำงานอยู่
       * ไม่ให้เอา result กลับมาใส่ job
       */
      this.disposed =
        true;
      this.cancelImageWait?.();
      this.conversion?.abort();
      this.thumbImg.onload = this.thumbImg.onerror = null;
      this.thumbImg.removeAttribute('src');


      this.isConverting =
        false;


      if (
        this.el
      ) {

        this.el.dataset.processing =
          'false';

      }


      // ------------------------------------------------------
      // Source URL
      // ------------------------------------------------------

      if (
        this.objectUrl
      ) {

        try {

          URL.revokeObjectURL(
            this.objectUrl
          );

        } catch (_) { }


        this.objectUrl =
          null;

      }


      // ------------------------------------------------------
      // Result URL
      // ------------------------------------------------------

      if (
        this.resultUrl
      ) {

        try {

          URL.revokeObjectURL(
            this.resultUrl
          );

        } catch (_) { }


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


    if (!hasReady) zipError.hidden = true;

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

    let added =
      0;
    const fragment = document.createDocumentFragment();
    const existing = new Set(jobs.map(job => getFileKey(job.file)));


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

          const key = getFileKey(file);
          if (existing.has(key)) return;
          existing.add(key);

          const job =
            new ConvertJob(
              file
            );


          jobs.push(
            job
          );


          fragment.appendChild(
            job.el
          );


          added++;

        }
      );


    jobsEl.append(fragment);
    updateBulkUI();


    return added;

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

          if (
            job.disposed ||
            job.isConverting
          ) {

            return;

          }


          job.format =
            format;


          if (
            job.formatGroup
          ) {

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

          }


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
        !jobs.length ||
        convertAllBtn.disabled
      ) {

        return;

      }


      const queue = jobs.filter(job => !job.isConverting);
      if (!queue.length) return;

      convertAllBtn.disabled =
        true;


      convertAllBtn.textContent =
        t(
          'image.convertingAll'
        );


      batchProgress.max = queue.length;
      batchProgress.value = 0;
      batchProgress.hidden = false;
      bulkFormatEl.disabled = true;

      try {
        let index = 0;
        let completed = 0;
        async function worker() {
          while (index < queue.length) {
            const job = queue[index++];
            if (!job.disposed) await job.convert();
            batchProgress.value = ++completed;
          }
        }

        await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));

      } finally {
        batchProgress.hidden = true;
        bulkFormatEl.disabled = false;

        convertAllBtn.disabled =
          false;


        convertAllBtn.textContent =
          t(
            'image.convertAll'
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
            !job.disposed &&
            !!job.resultBlob
        );


      if (
        !ready.length
      ) {

        return;

      }


      zipError.hidden = true;
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

        zipError.textContent = t('errors.zipCreateFailed');
        zipError.hidden = false;
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


        updateBulkUI();

      }

    }
  );


  // ============================================================
  // DROPZONE
  // ============================================================

  if (
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
    typeof U.onClearCache ===
    'function'
  ) {

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

          if (
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
