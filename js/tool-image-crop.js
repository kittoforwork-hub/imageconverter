/* global window, document, URL, requestAnimationFrame */

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
      'dz-img-crop'
    );

  const fileInput =
    document.getElementById(
      'input-img-crop'
    );

  const jobsEl =
    document.getElementById(
      'jobs-img-crop'
    );

  const jobTemplate =
    document.getElementById(
      'tpl-img-crop'
    );


  // ============================================================
  // SAFETY CHECK
  // ============================================================

  if (
    !dropzone ||
    !fileInput ||
    !jobsEl ||
    !jobTemplate
  ) {

    return;

  }


  // ============================================================
  // CONFIG
  // ============================================================

  const MIN_BOX =
    24;


  let jobSeq =
    0;


  const jobs =
    [];


  const RATIOS = {

    free:
      null,

    '1:1':
      1,

    '4:3':
      4 / 3,

    '16:9':
      16 / 9

  };


  // ============================================================
  // CROP JOB
  // ============================================================

  class CropJob {

    constructor(
      file
    ) {

      this.id =
        'crop-' +
        (++jobSeq);


      this.file =
        file;


      this.ratio =
        null;


      this.format =
        'image/png';


      this.box = {

        left:
          0,

        top:
          0,

        width:
          0,

        height:
          0

      };


      this.resultBlob =
        null;


      this.resultUrl =
        null;


      this.objectUrl =
        null;


      this.isCropping =
        false;


      this.hasError =
        false;


      this.errorMessage =
        '';


      /*
       * เก็บ key/params ของ error ล่าสุดไว้
       * เพื่อให้แปลภาษาใหม่ได้ตอน languagechange
       * (errorMessage ด้านบนใช้เป็น fallback
       * เมื่อไม่มี errorKey เท่านั้น)
       */
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


      this.objectUrl =
        URL.createObjectURL(
          this.file
        );


      // ------------------------------------------------------
      // Elements
      // ------------------------------------------------------

      this.stage =
        el.querySelector(
          '.js-crop-stage'
        );


      this.imgEl =
        el.querySelector(
          '.js-crop-img'
        );


      this.boxEl =
        el.querySelector(
          '.js-crop-box'
        );


      this.cropdimEl =
        el.querySelector(
          '.js-cropdim'
        );


      this.statusEl =
        el.querySelector(
          '.js-status'
        );


      this.downloadBtn =
        el.querySelector(
          '.js-download-btn'
        );


      this.cropBtn =
        el.querySelector(
          '.js-crop-btn'
        );


      this.removeBtn =
        el.querySelector(
          '.js-remove-btn'
        );


      this.ratioGroup =
        el.querySelector(
          '.js-ratio-group'
        );


      this.formatGroup =
        el.querySelector(
          '.js-format-group'
        );


      // ------------------------------------------------------
      // Processing state
      //
      // app.js uses this instead of reading translated text.
      // ------------------------------------------------------

      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // File
      // ------------------------------------------------------

      const filenameEl =
        el.querySelector(
          '.js-filename'
        );


      if (
        filenameEl
      ) {

        filenameEl.textContent =
          this.file.name;

      }


      this.imgEl.src =
        this.objectUrl;


      // ------------------------------------------------------
      // Image load
      // ------------------------------------------------------

      this.imgEl.onload =
        () => {

          const origDimEl =
            el.querySelector(
              '.js-origdim'
            );


          if (
            origDimEl
          ) {

            origDimEl.textContent =
              `${this.imgEl.naturalWidth}×${this.imgEl.naturalHeight}`;

          }


          requestAnimationFrame(
            () => {

              this.initBox();

            }
          );

        };


      // ------------------------------------------------------
      // Image error
      // ------------------------------------------------------

      this.imgEl.onerror =
        () => {

          this.hasError =
            true;


          this.errorKey =
            'image.openFailed';

          this.errorParams =
            null;

          this.errorMessage =
            t(
              this.errorKey
            );


          if (
            this.statusEl
          ) {

            this.statusEl.textContent =
              this.errorMessage;


            this.statusEl.classList.remove(
              'is-ready'
            );


            this.statusEl.classList.add(
              'is-error'
            );

          }


          if (
            this.cropBtn
          ) {

            this.cropBtn.disabled =
              true;

          }

        };


      // ------------------------------------------------------
      // Ratio controls
      // ------------------------------------------------------

      this.ratioGroup.addEventListener(
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


          this.ratioGroup
            .querySelectorAll(
              '.seg-btn'
            )
            .forEach(
              button => {

                button.classList.remove(
                  'is-active'
                );

              }
            );


          btn.classList.add(
            'is-active'
          );


          const ratioKey =
            btn.dataset.ratio;


          this.ratio =
            Object.prototype.hasOwnProperty.call(
              RATIOS,
              ratioKey
            )
              ? RATIOS[
                  ratioKey
                ]
              : null;


          this.hasError =
            false;


          this.invalidateResult();


          this.applyRatioToBox();

        }
      );


      // ------------------------------------------------------
      // Format controls
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
              button => {

                button.classList.remove(
                  'is-active'
                );

              }
            );


          btn.classList.add(
            'is-active'
          );


          this.format =
            btn.dataset.format;


          this.hasError =
            false;


          this.invalidateResult();

        }
      );


      // ------------------------------------------------------
      // Crop
      // ------------------------------------------------------

      this.cropBtn.addEventListener(
        'click',
        () => {

          this.crop();

        }
      );


      // ------------------------------------------------------
      // Remove
      // ------------------------------------------------------

      this.removeBtn.addEventListener(
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

        }
      );


      // ------------------------------------------------------
      // Initial language state
      // ------------------------------------------------------

      this.updateLanguageUI();


      // ------------------------------------------------------
      // Drag system
      // ------------------------------------------------------

      this.wireDrag();

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
       * Processing
       */
      if (
        this.isCropping
      ) {

        this.statusEl.textContent =
          t(
            'image.cropping'
          );


        return;

      }


      /*
       * Error
       * แปล error เดิมใหม่ด้วย key/params ที่เก็บไว้
       * ถ้ามี errorKey ให้แปลใหม่ตามภาษาปัจจุบันเสมอ
       */
      if (
        this.hasError
      ) {

        this.errorMessage =
          this.errorKey
            ? t(
                this.errorKey,
                this.errorParams ||
                  undefined
              )
            : this.errorMessage ||
              t(
                'image.croppingFailed'
              );


        this.statusEl.textContent =
          this.errorMessage;


        this.statusEl.classList.remove(
          'is-ready'
        );


        this.statusEl.classList.add(
          'is-error'
        );


        return;

      }


      /*
       * Result
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
       * Waiting
       */
      this.statusEl.textContent =
        t(
          'image.waitingCrop'
        );


      this.statusEl.classList.remove(
        'is-error',
        'is-ready'
      );

    }


    // ========================================================
    // DISPLAY RECT
    // ========================================================

    getDisplayRect() {

      const stageRect =
        this.stage.getBoundingClientRect();


      const imgRect =
        this.imgEl.getBoundingClientRect();


      return {

        left:
          imgRect.left -
          stageRect.left,

        top:
          imgRect.top -
          stageRect.top,

        width:
          imgRect.width,

        height:
          imgRect.height

      };
    }


    // ========================================================
    // INITIAL CROP BOX
    // ========================================================

    initBox() {

      const d =
        this.getDisplayRect();


      if (
        !d.width ||
        !d.height
      ) {

        return;

      }


      let w =
        d.width *
        0.7;


      let h =
        this.ratio
          ? w /
            this.ratio
          : d.height *
            0.7;


      /*
       * ป้องกันกรอบทะลุรูป
       */

      if (
        h >
        d.height
      ) {

        h =
          d.height;


        if (
          this.ratio
        ) {

          w =
            h *
            this.ratio;

        }

      }


      if (
        w >
        d.width
      ) {

        w =
          d.width;


        if (
          this.ratio
        ) {

          h =
            w /
            this.ratio;

        }

      }


      this.box = {

        left:
          d.left +
          (
            d.width -
            w
          ) /
          2,

        top:
          d.top +
          (
            d.height -
            h
          ) /
          2,

        width:
          w,

        height:
          h

      };


      this.render();

    }


    // ========================================================
    // APPLY RATIO
    // ========================================================

    applyRatioToBox() {

      if (
        !this.box.width
      ) {

        return;

      }


      const d =
        this.getDisplayRect();


      if (
        this.ratio
      ) {

        let h =
          this.box.width /
          this.ratio;


        let width =
          this.box.width;


        if (
          h >
          d.height
        ) {

          h =
            d.height;


          width =
            h *
            this.ratio;

        }


        if (
          width >
          d.width
        ) {

          width =
            d.width;


          h =
            width /
            this.ratio;

        }


        this.box.width =
          width;


        this.box.height =
          h;

      }


      /*
       * Keep box inside image
       */

      if (
        this.box.left +
          this.box.width >
        d.left +
          d.width
      ) {

        this.box.left =
          d.left +
          d.width -
          this.box.width;

      }


      if (
        this.box.top +
          this.box.height >
        d.top +
          d.height
      ) {

        this.box.top =
          d.top +
          d.height -
          this.box.height;

      }


      if (
        this.box.left <
        d.left
      ) {

        this.box.left =
          d.left;

      }


      if (
        this.box.top <
        d.top
      ) {

        this.box.top =
          d.top;

      }


      this.render();

    }


    // ========================================================
    // RENDER
    // ========================================================

    render() {

      this.boxEl.style.left =
        this.box.left +
        'px';


      this.boxEl.style.top =
        this.box.top +
        'px';


      this.boxEl.style.width =
        this.box.width +
        'px';


      this.boxEl.style.height =
        this.box.height +
        'px';


      const d =
        this.getDisplayRect();


      if (
        d.width &&
        this.imgEl.naturalWidth
      ) {

        const scaleX =
          this.imgEl.naturalWidth /
          d.width;


        const scaleY =
          this.imgEl.naturalHeight /
          d.height;


        const outW =
          Math.round(
            this.box.width *
            scaleX
          );


        const outH =
          Math.round(
            this.box.height *
            scaleY
          );


        this.cropdimEl.textContent =
          `${outW}×${outH} px`;

      }

    }


    // ========================================================
    // POINTER DRAG
    // ========================================================

    wireDrag() {

      const stage =
        this.stage;


      const boxEl =
        this.boxEl;


      let mode =
        null;


      let startPtr = {

        x:
          0,

        y:
          0

      };


      let startBox =
        null;


      let anchor =
        null;


      const toStageCoords =
        event => {

          const r =
            stage.getBoundingClientRect();


          return {

            x:
              event.clientX -
              r.left,

            y:
              event.clientY -
              r.top

          };

        };


      const onDown =
        (
          event,
          m
        ) => {

          mode =
            m;


          const p =
            toStageCoords(
              event
            );


          startPtr =
            p;


          startBox = {
            ...this.box
          };


          if (
            m !== 'move'
          ) {

            const opposite = {

              nw:
                'se',

              ne:
                'sw',

              sw:
                'ne',

              se:
                'nw'

            }[m];


            anchor = {

              x:
                opposite.includes(
                  'e'
                )
                  ? startBox.left +
                    startBox.width
                  : startBox.left,

              y:
                opposite.includes(
                  's'
                )
                  ? startBox.top +
                    startBox.height
                  : startBox.top

            };

          }


          event.preventDefault();

          event.stopPropagation();


          window.addEventListener(
            'pointermove',
            onMove
          );


          window.addEventListener(
            'pointerup',
            onUp
          );

        };


      const onMove =
        event => {

          if (
            !mode
          ) {

            return;

          }


          const d =
            this.getDisplayRect();


          const p =
            toStageCoords(
              event
            );


          const curX =
            Math.min(
              Math.max(
                p.x,
                d.left
              ),
              d.left +
                d.width
            );


          const curY =
            Math.min(
              Math.max(
                p.y,
                d.top
              ),
              d.top +
                d.height
            );


          // --------------------------------------------------
          // MOVE
          // --------------------------------------------------

          if (
            mode ===
            'move'
          ) {

            const dx =
              p.x -
              startPtr.x;


            const dy =
              p.y -
              startPtr.y;


            let left =
              startBox.left +
              dx;


            let top =
              startBox.top +
              dy;


            left =
              Math.min(
                Math.max(
                  left,
                  d.left
                ),
                d.left +
                  d.width -
                  startBox.width
              );


            top =
              Math.min(
                Math.max(
                  top,
                  d.top
                ),
                d.top +
                  d.height -
                  startBox.height
              );


            this.box = {

              left,

              top,

              width:
                startBox.width,

              height:
                startBox.height

            };

          } else {

            // ----------------------------------------------
            // RESIZE
            // ----------------------------------------------

            let width =
              Math.abs(
                curX -
                anchor.x
              );


            let height =
              Math.abs(
                curY -
                anchor.y
              );


            if (
              this.ratio
            ) {

              height =
                width /
                this.ratio;

            }


            width =
              Math.max(
                width,
                MIN_BOX
              );


            height =
              Math.max(
                height,
                MIN_BOX
              );


            let left =
              curX <
              anchor.x
                ? anchor.x -
                  width
                : anchor.x;


            let top =
              curY <
              anchor.y
                ? anchor.y -
                  height
                : anchor.y;


            // ----------------------------------------------
            // Left boundary
            // ----------------------------------------------

            if (
              left <
              d.left
            ) {

              width -=
                d.left -
                left;


              left =
                d.left;


              if (
                this.ratio
              ) {

                height =
                  width /
                  this.ratio;

              }

            }


            // ----------------------------------------------
            // Top boundary
            // ----------------------------------------------

            if (
              top <
              d.top
            ) {

              height -=
                d.top -
                top;


              top =
                d.top;


              if (
                this.ratio
              ) {

                width =
                  height *
                  this.ratio;

              }

            }


            // ----------------------------------------------
            // Right boundary
            // ----------------------------------------------

            if (
              left +
                width >
              d.left +
                d.width
            ) {

              width =
                d.left +
                d.width -
                left;


              if (
                this.ratio
              ) {

                height =
                  width /
                  this.ratio;

              }

            }


            // ----------------------------------------------
            // Bottom boundary
            // ----------------------------------------------

            if (
              top +
                height >
              d.top +
                d.height
            ) {

              height =
                d.top +
                d.height -
                top;


              if (
                this.ratio
              ) {

                width =
                  height *
                  this.ratio;

              }

            }


            width =
              Math.max(
                width,
                MIN_BOX
              );


            height =
              Math.max(
                height,
                MIN_BOX
              );


            this.box = {

              left,

              top,

              width,

              height

            };

          }


          this.hasError =
            false;


          this.invalidateResult();


          this.render();

        };


      const onUp =
        () => {

          mode =
            null;


          window.removeEventListener(
            'pointermove',
            onMove
          );


          window.removeEventListener(
            'pointerup',
            onUp
          );

        };


      boxEl.addEventListener(
        'pointerdown',
        event => {

          const handle =
            event.target.closest(
              '.crop-handle'
            );


          onDown(
            event,
            handle
              ? handle.dataset.dir
              : 'move'
          );

        }
      );

    }


    // ========================================================
    // INVALIDATE RESULT
    // ========================================================

    invalidateResult() {

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

        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );

      }


      this.updateLanguageUI();

    }


    // ========================================================
    // CROP
    // ========================================================

    async crop() {

      if (
        !this.imgEl.naturalWidth ||
        !this.imgEl.naturalHeight
      ) {

        return;

      }


      if (
        this.isCropping
      ) {

        return;

      }


      this.isCropping =
        true;


      this.hasError =
        false;


      this.errorMessage =
        '';


      this.errorKey =
        null;


      this.errorParams =
        null;


      this.el.dataset.processing =
        'true';


      this.cropBtn.disabled =
        true;


      if (
        this.statusEl
      ) {

        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );


        this.statusEl.textContent =
          t(
            'image.cropping'
          );

      }


      try {

        const d =
          this.getDisplayRect();


        if (
          !d.width ||
          !d.height
        ) {

          throw new Error(
            t(
              'errors.invalidImageDimensions'
            )
          );

        }


        const scaleX =
          this.imgEl.naturalWidth /
          d.width;


        const scaleY =
          this.imgEl.naturalHeight /
          d.height;


        const sx =
          (
            this.box.left -
            d.left
          ) *
          scaleX;


        const sy =
          (
            this.box.top -
            d.top
          ) *
          scaleY;


        const sw =
          this.box.width *
          scaleX;


        const sh =
          this.box.height *
          scaleY;


        // --------------------------------------------------
        // Canvas
        // --------------------------------------------------

        const canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          Math.max(
            1,
            Math.round(
              sw
            )
          );


        canvas.height =
          Math.max(
            1,
            Math.round(
              sh
            )
          );


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
            canvas.width,
            canvas.height
          );

        }


        // --------------------------------------------------
        // Draw
        // --------------------------------------------------

        ctx.drawImage(
          this.imgEl,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height
        );


        // --------------------------------------------------
        // Encode
        // --------------------------------------------------

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
                this.format ===
                  'image/jpeg'
                  ? 0.92
                  : undefined
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
        // Cleanup previous result
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
          this.format ===
          'image/png'
            ? 'png'
            : 'jpg';


        const filename =
          `${U.baseName(
            this.file.name
          )}-cropped.${ext}`;


        this.downloadBtn.href =
          this.resultUrl;


        this.downloadBtn.download =
          filename;


        this.downloadBtn.classList.remove(
          'hidden'
        );


        this.hasError =
          false;


        this.errorMessage =
          '';


        this.errorKey =
          null;


        this.errorParams =
          null;


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

        const message =
          err &&
          err.message
            ? err.message
            : t(
                'errors.processingFailed'
              );


        this.hasError =
          true;


        this.errorKey =
          'image.croppingFailed';

        this.errorParams =
          {
            message
          };

        this.errorMessage =
          t(
            this.errorKey,
            this.errorParams
          );


        this.statusEl.textContent =
          t(
            'image.croppingFailed',
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

        this.isCropping =
          false;


        this.el.dataset.processing =
          'false';


        this.cropBtn.disabled =
          false;

      }

    }


    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {

      this.isCropping =
        false;


      this.el.dataset.processing =
        'false';


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
            new CropJob(
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

            job.dispose();

          }
        );


        jobs.length =
          0;


        jobsEl.innerHTML =
          '';

      }
    );

  }


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {

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

  jobs.forEach(
    job => {

      job.updateLanguageUI();

    }
  );

})();
