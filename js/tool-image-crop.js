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


  const EXT_BY_FORMAT = {

    'image/png':
      'png',

    'image/jpeg':
      'jpg',

    'image/webp':
      'webp'

  };


  const DEFAULT_JPEG_QUALITY =
    0.92;


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
        !job.disposed &&
        getFileKey(
          job.file
        ) === key
    );

  }


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


      this.disposed =
        false;


      this.hasError =
        false;


      this.errorMessage =
        '';


      this.errorKey =
        null;


      this.errorParams =
        null;


      this.resizeRaf =
        0;


      this.dragPointerId =
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


      // ------------------------------------------------------
      // Source URL
      // ------------------------------------------------------

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
      // Required elements
      // ------------------------------------------------------

      if (
        !this.stage ||
        !this.imgEl ||
        !this.boxEl ||
        !this.cropBtn
      ) {

        this.disposed =
          true;


        return;

      }


      // ------------------------------------------------------
      // Processing state
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


      // ------------------------------------------------------
      // Image source
      // ------------------------------------------------------

      this.imgEl.src =
        this.objectUrl;


      // ------------------------------------------------------
      // Image load
      // ------------------------------------------------------

      this.imgEl.onload =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


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

              if (
                this.disposed
              ) {

                return;

              }


              this.initBox();

            }
          );

        };


      // ------------------------------------------------------
      // Image error
      // ------------------------------------------------------

      this.imgEl.onerror =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


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

      if (
        this.ratioGroup
      ) {

        this.ratioGroup.addEventListener(
          'click',
          event => {

            if (
              this.disposed ||
              this.isCropping
            ) {

              return;

            }


            const btn =
              event.target.closest(
                '.seg-btn'
              );


            if (
              !btn ||
              !this.ratioGroup.contains(
                btn
              )
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


            this.clearErrorState();


            this.invalidateResult();

            this.applyRatioToBox();

          }
        );

      }


      // ------------------------------------------------------
      // Format controls
      // ------------------------------------------------------

      if (
        this.formatGroup
      ) {

        this.formatGroup.addEventListener(
          'click',
          event => {

            if (
              this.disposed ||
              this.isCropping
            ) {

              return;

            }


            const btn =
              event.target.closest(
                '.seg-btn'
              );


            if (
              !btn ||
              !this.formatGroup.contains(
                btn
              )
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


            const selectedFormat =
              btn.dataset.format;


            if (
              Object.prototype.hasOwnProperty.call(
                EXT_BY_FORMAT,
                selectedFormat
              )
            ) {

              this.format =
                selectedFormat;

            } else {

              this.format =
                'image/png';

            }


            this.hasError =
              false;


            this.clearErrorState();


            this.invalidateResult();

          }
        );

      }


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

      if (
        this.removeBtn
      ) {

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

      }


      // ------------------------------------------------------
      // Initial language state
      // ------------------------------------------------------

      this.updateLanguageUI();


      // ------------------------------------------------------
      // Drag system
      // ------------------------------------------------------

      this.wireDrag();


      // ------------------------------------------------------
      // Responsive
      // ------------------------------------------------------

      this.wireResponsive();

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
    // CLEAR ERROR
    // ========================================================

    clearErrorState() {

      this.hasError =
        false;


      this.errorMessage =
        '';


      this.errorKey =
        null;


      this.errorParams =
        null;


      if (
        this.statusEl
      ) {

        this.statusEl.classList.remove(
          'is-error'
        );

      }

    }


    // ========================================================
    // DISPLAY RECT
    // ========================================================

    getDisplayRect() {

      if (
        !this.stage ||
        !this.imgEl
      ) {

        return {

          left:
            0,

          top:
            0,

          width:
            0,

          height:
            0

        };

      }


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
    // NORMALIZE BOX
    // ========================================================

    normalizeBox(
      box
    ) {

      const d =
        this.getDisplayRect();


      if (
        !d.width ||
        !d.height
      ) {

        return box;

      }


      let width =
        Math.min(
          Math.max(
            box.width,
            this.getMinWidth()
          ),
          d.width
        );


      let height =
        Math.min(
          Math.max(
            box.height,
            this.getMinHeight()
          ),
          d.height
        );


      if (
        this.ratio
      ) {

        /*
         * รักษา ratio เสมอ
         */
        const ratio =
          this.ratio;


        const candidateFromWidth =
          width /
          ratio;


        const candidateFromHeight =
          height *
          ratio;


        if (
          candidateFromWidth <=
          d.height
        ) {

          height =
            candidateFromWidth;

        } else {

          width =
            candidateFromHeight;

        }


        /*
         * กรณีเล็กเกินไปหลังคำนวณ
         */
        if (
          width <
          this.getMinWidth()
        ) {

          width =
            this.getMinWidth();

          height =
            width /
            ratio;

        }


        if (
          height <
          this.getMinHeight()
        ) {

          height =
            this.getMinHeight();

          width =
            height *
            ratio;

        }

      }


      /*
       * ให้ box ไม่เกิน image
       */
      width =
        Math.min(
          width,
          d.width
        );


      height =
        Math.min(
          height,
          d.height
        );


      if (
        this.ratio
      ) {

        if (
          width /
            this.ratio >
          d.height
        ) {

          height =
            d.height;

          width =
            height *
            this.ratio;

        }


        if (
          height *
            this.ratio >
          d.width
        ) {

          width =
            d.width;

          height =
            width /
            this.ratio;

        }

      }


      let left =
        box.left;


      let top =
        box.top;


      left =
        Math.min(
          Math.max(
            left,
            d.left
          ),
          d.left +
            d.width -
            width
        );


      top =
        Math.min(
          Math.max(
            top,
            d.top
          ),
          d.top +
            d.height -
            height
        );


      return {

        left,

        top,

        width,

        height

      };

    }


    // ========================================================
    // MINIMUM SIZE
    // ========================================================

    getMinWidth() {

      if (
        !this.ratio
      ) {

        return Math.min(
          MIN_BOX,
          this.getDisplayRect().width ||
            MIN_BOX
        );

      }


      return MIN_BOX;

    }


    getMinHeight() {

      if (
        !this.ratio
      ) {

        return Math.min(
          MIN_BOX,
          this.getDisplayRect().height ||
            MIN_BOX
        );

      }


      return MIN_BOX;

    }


    // ========================================================
    // INITIAL CROP BOX
    // ========================================================

    initBox() {

      if (
        this.disposed
      ) {

        return;

      }


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


      let h;


      if (
        this.ratio
      ) {

        h =
          w /
          this.ratio;

      } else {

        h =
          d.height *
          0.7;

      }


      /*
       * Fit inside image
       */
      if (
        w >
        d.width
      ) {

        w =
          d.width;

      }


      if (
        h >
        d.height
      ) {

        h =
          d.height;

      }


      if (
        this.ratio
      ) {

        if (
          w /
            this.ratio >
          d.height
        ) {

          h =
            d.height;

          w =
            h *
            this.ratio;

        }


        if (
          h *
            this.ratio >
          d.width
        ) {

          w =
            d.width;

          h =
            w /
            this.ratio;

        }

      }


      const minW =
        this.getMinWidth();


      const minH =
        this.getMinHeight();


      if (
        w <
        minW
      ) {

        w =
          minW;

        h =
          this.ratio
            ? w /
              this.ratio
            : Math.max(
                h,
                minH
              );

      }


      if (
        h <
        minH
      ) {

        h =
          minH;

        w =
          this.ratio
            ? h *
              this.ratio
            : Math.max(
                w,
                minW
              );

      }


      /*
       * Final boundary
       */
      w =
        Math.min(
          w,
          d.width
        );


      h =
        Math.min(
          h,
          d.height
        );


      if (
        this.ratio
      ) {

        if (
          w /
            this.ratio >
          d.height
        ) {

          h =
            d.height;

          w =
            h *
            this.ratio;

        }


        if (
          h *
            this.ratio >
          d.width
        ) {

          w =
            d.width;

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


      this.box =
        this.normalizeBox(
          this.box
        );


      this.render();

    }


    // ========================================================
    // APPLY RATIO
    // ========================================================

    applyRatioToBox() {

      if (
        this.disposed
      ) {

        return;

      }


      const d =
        this.getDisplayRect();


      if (
        !d.width ||
        !d.height
      ) {

        return;

      }


      /*
       * ถ้าเป็น Free
       * แค่ทำให้ box อยู่ใน image
       */
      if (
        !this.ratio
      ) {

        this.box =
          this.normalizeBox(
            this.box
          );


        this.invalidateResult();

        this.render();


        return;

      }


      /*
       * ใช้ขนาดเดิมให้มากที่สุด
       * แต่ปรับให้ตรง ratio
       */
      let width =
        this.box.width;


      let height =
        width /
        this.ratio;


      if (
        height >
        d.height
      ) {

        height =
          d.height;

        width =
          height *
          this.ratio;

      }


      if (
        width >
        d.width
      ) {

        width =
          d.width;

        height =
          width /
          this.ratio;

      }


      const centerX =
        this.box.left +
        this.box.width / 2;


      const centerY =
        this.box.top +
        this.box.height / 2;


      let left =
        centerX -
        width / 2;


      let top =
        centerY -
        height / 2;


      left =
        Math.min(
          Math.max(
            left,
            d.left
          ),
          d.left +
            d.width -
            width
        );


      top =
        Math.min(
          Math.max(
            top,
            d.top
          ),
          d.top +
            d.height -
            height
        );


      this.box = {

        left,

        top,

        width,

        height

      };


      this.box =
        this.normalizeBox(
          this.box
        );


      this.invalidateResult();

      this.render();

    }


    // ========================================================
    // KEEP BOX INSIDE IMAGE
    // ========================================================

    keepBoxInsideImage() {

      if (
        this.disposed
      ) {

        return;

      }


      if (
        !this.box.width ||
        !this.box.height
      ) {

        return;

      }


      this.box =
        this.normalizeBox(
          this.box
        );

    }


    // ========================================================
    // RESPONSIVE
    // ========================================================

    wireResponsive() {

      const handleResize =
        () => {

          if (
            this.disposed
          ) {

            return;

          }


          if (
            this.resizeRaf
          ) {

            cancelAnimationFrame(
              this.resizeRaf
            );

          }


          this.resizeRaf =
            requestAnimationFrame(
              () => {

                this.resizeRaf =
                  0;


                if (
                  this.disposed
                ) {

                  return;

                }


                if (
                  !this.box.width
                ) {

                  this.initBox();

                  return;

                }


                this.keepBoxInsideImage();

                this.render();

              }
            );

        };


      window.addEventListener(
        'resize',
        handleResize
      );


      this._resizeHandler =
        handleResize;

    }


    // ========================================================
    // RENDER
    // ========================================================

    render() {

      if (
        this.disposed ||
        !this.boxEl
      ) {

        return;

      }


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
        this.cropdimEl &&
        d.width &&
        d.height &&
        this.imgEl.naturalWidth &&
        this.imgEl.naturalHeight
      ) {

        const scaleX =
          this.imgEl.naturalWidth /
          d.width;


        const scaleY =
          this.imgEl.naturalHeight /
          d.height;


        const outW =
          Math.max(
            1,
            Math.round(
              this.box.width *
              scaleX
            )
          );


        const outH =
          Math.max(
            1,
            Math.round(
              this.box.height *
              scaleY
            )
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


      let pointerId =
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


      const cleanupPointer =
        () => {

          window.removeEventListener(
            'pointermove',
            onMove
          );


          window.removeEventListener(
            'pointerup',
            onUp
          );


          window.removeEventListener(
            'pointercancel',
            onUp
          );


          if (
            pointerId !==
            null
          ) {

            try {

              if (
                boxEl.hasPointerCapture(
                  pointerId
                )
              ) {

                boxEl.releasePointerCapture(
                  pointerId
                );

              }

            } catch (_) {}

          }


          pointerId =
            null;


          this.dragPointerId =
            null;

        };


      const onDown =
        (
          event,
          m
        ) => {

          if (
            this.disposed ||
            this.isCropping ||
            this.hasError
          ) {

            return;

          }


          if (
            event.pointerType ===
            'mouse' &&
            event.button !==
            0
          ) {

            return;

          }


          mode =
            m;


          pointerId =
            event.pointerId;


          this.dragPointerId =
            event.pointerId;


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
            m !==
            'move'
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

            }[
              m
            ];


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

          } else {

            anchor =
              null;

          }


          event.preventDefault();

          event.stopPropagation();


          try {

            boxEl.setPointerCapture(
              event.pointerId
            );

          } catch (_) {}


          window.addEventListener(
            'pointermove',
            onMove
          );


          window.addEventListener(
            'pointerup',
            onUp
          );


          window.addEventListener(
            'pointercancel',
            onUp
          );

        };


      const onMove =
        event => {

          if (
            !mode ||
            this.disposed ||
            event.pointerId !==
              pointerId
          ) {

            return;

          }


          const d =
            this.getDisplayRect();


          if (
            !d.width ||
            !d.height
          ) {

            return;

          }


          const p =
            toStageCoords(
              event
            );


          /*
           * ----------------------------------------------------
           * MOVE
           * ----------------------------------------------------
           */

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

            /*
             * --------------------------------------------------
             * RESIZE
             * --------------------------------------------------
             */

            const cursorX =
              Math.min(
                Math.max(
                  p.x,
                  d.left
                ),
                d.left +
                  d.width
              );


            const cursorY =
              Math.min(
                Math.max(
                  p.y,
                  d.top
                ),
                d.top +
                  d.height
              );


            const dir =
              mode;


            const fromLeft =
              dir ===
                'nw' ||
              dir ===
                'sw';


            const fromTop =
              dir ===
                'nw' ||
              dir ===
                'ne';


            /*
             * ขนาดเริ่มต้นจาก cursor กับ anchor
             */
            let width =
              Math.abs(
                cursorX -
                anchor.x
              );


            let height =
              Math.abs(
                cursorY -
                anchor.y
              );


            /*
             * ------------------------------------------------
             * FREE RATIO
             * ------------------------------------------------
             */

            if (
              !this.ratio
            ) {

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


              /*
               * จำกัดตามด้าน anchor
               */

              const maxWidth =
                fromLeft
                  ? anchor.x -
                    d.left
                  : d.left +
                    d.width -
                    anchor.x;


              const maxHeight =
                fromTop
                  ? anchor.y -
                    d.top
                  : d.top +
                    d.height -
                    anchor.y;


              width =
                Math.min(
                  width,
                  Math.max(
                    MIN_BOX,
                    maxWidth
                  )
                );


              height =
                Math.min(
                  height,
                  Math.max(
                    MIN_BOX,
                    maxHeight
                  )
                );


            } else {

              /*
               * ------------------------------------------------
               * LOCKED RATIO
               * ------------------------------------------------
               */

              const ratio =
                this.ratio;


              /*
               * ใช้ dimension ที่ cursor ลากมากที่สุด
               * แล้วคำนวณอีกด้านจาก ratio
               */
              const widthDriven =
                Math.abs(
                  cursorX -
                  anchor.x
                );


              const heightDriven =
                Math.abs(
                  cursorY -
                  anchor.y
                );


              width =
                Math.max(
                  widthDriven,
                  MIN_BOX
                );


              height =
                width /
                ratio;


              /*
               * ถ้าความสูงตาม ratio
               * ใหญ่เกินระยะ cursor
               * ให้ใช้ height เป็นตัวนำ
               */
              if (
                height >
                Math.max(
                  heightDriven,
                  MIN_BOX
                )
              ) {

                height =
                  Math.max(
                    heightDriven,
                    MIN_BOX
                  );


                width =
                  height *
                  ratio;

              }


              /*
               * ความกว้างสูงสุดจาก anchor
               */
              const maxWidth =
                fromLeft
                  ? anchor.x -
                    d.left
                  : d.left +
                    d.width -
                    anchor.x;


              /*
               * ความสูงสูงสุดจาก anchor
               */
              const maxHeight =
                fromTop
                  ? anchor.y -
                    d.top
                  : d.top +
                    d.height -
                    anchor.y;


              /*
               * จำกัดด้วยทั้งสองแกน
               */
              width =
                Math.min(
                  width,
                  maxWidth
                );


              height =
                width /
                ratio;


              if (
                height >
                maxHeight
              ) {

                height =
                  maxHeight;


                width =
                  height *
                  ratio;

              }


              /*
               * Minimum
               */
              const minWidth =
                MIN_BOX;


              const minHeight =
                MIN_BOX /
                ratio;


              if (
                width <
                minWidth
              ) {

                width =
                  minWidth;

                height =
                  width /
                  ratio;

              }


              if (
                height <
                minHeight
              ) {

                height =
                  minHeight;

                width =
                  height *
                  ratio;

              }


              /*
               * Final safety
               */
              width =
                Math.min(
                  width,
                  maxWidth,
                  d.width
                );


              height =
                width /
                ratio;


              if (
                height >
                maxHeight
              ) {

                height =
                  maxHeight;

                width =
                  height *
                  ratio;

              }

            }


            let left =
              fromLeft
                ? anchor.x -
                  width
                : anchor.x;


            let top =
              fromTop
                ? anchor.y -
                  height
                : anchor.y;


            /*
             * Boundary correction
             */
            if (
              left <
              d.left
            ) {

              left =
                d.left;


              if (
                this.ratio
              ) {

                width =
                  anchor.x -
                  left;

                height =
                  width /
                  this.ratio;

              } else {

                width =
                  anchor.x -
                  left;

              }

            }


            if (
              top <
              d.top
            ) {

              top =
                d.top;


              if (
                this.ratio
              ) {

                height =
                  anchor.y -
                  top;

                width =
                  height *
                  this.ratio;

              } else {

                height =
                  anchor.y -
                  top;

              }

            }


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


            /*
             * Ensure minimum dimensions
             * โดยไม่ทำลาย ratio
             */
            if (
              this.ratio
            ) {

              if (
                width <
                MIN_BOX
              ) {

                width =
                  MIN_BOX;

                height =
                  width /
                  this.ratio;

              }


              if (
                height <
                MIN_BOX /
                  this.ratio
              ) {

                height =
                  MIN_BOX /
                  this.ratio;

                width =
                  height *
                  this.ratio;

              }

            } else {

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

            }


            /*
             * Recalculate position from anchor
             */
            left =
              fromLeft
                ? anchor.x -
                  width
                : anchor.x;


            top =
              fromTop
                ? anchor.y -
                  height
                : anchor.y;


            this.box = {

              left,

              top,

              width,

              height

            };


            this.box =
              this.normalizeBox(
                this.box
              );

          }


          this.clearErrorState();

          this.invalidateResult();

          this.render();

        };


      const onUp =
        event => {

          if (
            pointerId !==
            null &&
            event.pointerId !==
              pointerId
          ) {

            return;

          }


          mode =
            null;


          startBox =
            null;


          anchor =
            null;


          cleanupPointer();

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
          'is-ready'
        );

      }


      this.updateLanguageUI();

    }


    // ========================================================
    // CROP
    // ========================================================

    async crop() {

      if (
        this.disposed ||
        this.isCropping
      ) {

        return;

      }


      if (
        !this.imgEl.naturalWidth ||
        !this.imgEl.naturalHeight
      ) {

        this.setError(
          'image.readInfoFailed'
        );


        return;

      }


      if (
        !this.box.width ||
        !this.box.height
      ) {

        this.setError(
          'errors.invalidImageDimensions'
        );


        return;

      }


      this.isCropping =
        true;


      this.clearErrorState();


      this.el.dataset.processing =
        'true';


      if (
        this.cropBtn
      ) {

        this.cropBtn.disabled =
          true;

      }


      this.setControlsDisabled(
        true
      );


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

        // --------------------------------------------------
        // Display rect
        // --------------------------------------------------

        const d =
          this.getDisplayRect();


        if (
          !d.width ||
          !d.height
        ) {

          throw new Error(
            'INVALID_IMAGE_DIMENSIONS'
          );

        }


        // --------------------------------------------------
        // Clamp box before converting
        // --------------------------------------------------

        this.box =
          this.normalizeBox(
            this.box
          );


        // --------------------------------------------------
        // Scale
        // --------------------------------------------------

        const scaleX =
          this.imgEl.naturalWidth /
          d.width;


        const scaleY =
          this.imgEl.naturalHeight /
          d.height;


        // --------------------------------------------------
        // Crop source rectangle
        // --------------------------------------------------

        let sx =
          (
            this.box.left -
            d.left
          ) *
          scaleX;


        let sy =
          (
            this.box.top -
            d.top
          ) *
          scaleY;


        let sw =
          this.box.width *
          scaleX;


        let sh =
          this.box.height *
          scaleY;


        /*
         * Clamp to image bounds
         */
        sx =
          Math.max(
            0,
            Math.min(
              sx,
              this.imgEl.naturalWidth
            )
          );


        sy =
          Math.max(
            0,
            Math.min(
              sy,
              this.imgEl.naturalHeight
            )
          );


        sw =
          Math.min(
            sw,
            this.imgEl.naturalWidth -
              sx
          );


        sh =
          Math.min(
            sh,
            this.imgEl.naturalHeight -
              sy
          );


        if (
          sw <=
          0 ||
          sh <=
          0
        ) {

          throw new Error(
            'INVALID_CROP_AREA'
          );

        }


        // --------------------------------------------------
        // Output dimensions
        // --------------------------------------------------

        const outputW =
          Math.max(
            1,
            Math.round(
              sw
            )
          );


        const outputH =
          Math.max(
            1,
            Math.round(
              sh
            )
          );


        // --------------------------------------------------
        // Canvas
        // --------------------------------------------------

        const canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          outputW;


        canvas.height =
          outputH;


        const ctx =
          canvas.getContext(
            '2d'
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
            outputW,
            outputH
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
          outputW,
          outputH
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
                        'CREATE_FAILED'
                      )
                    );

                  }

                },
                this.format,
                this.format ===
                  'image/jpeg'
                  ? DEFAULT_JPEG_QUALITY
                  : undefined
              );

            }
          );


        /*
         * สำคัญ:
         * ถ้า user ลบ job ระหว่าง toBlob
         * ต้องหยุดตรงนี้
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


        // --------------------------------------------------
        // Previous URL
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
          )}-cropped.${ext}`;


        if (
          this.downloadBtn
        ) {

          this.downloadBtn.href =
            this.resultUrl;


          this.downloadBtn.download =
            filename;


          this.downloadBtn.classList.remove(
            'hidden'
          );

        }


        this.clearErrorState();


        // --------------------------------------------------
        // Success
        // --------------------------------------------------

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
        err
      ) {

        console.error(
          '[Image Crop]',
          err
        );


        if (
          this.disposed
        ) {

          return;

        }


        const code =
          err &&
          err.message
            ? err.message
            : 'PROCESSING_FAILED';


        let errorKey =
          'image.croppingFailed';


        if (
          code ===
          'INVALID_IMAGE_DIMENSIONS'
        ) {

          errorKey =
            'errors.invalidImageDimensions';

        } else if (
          code ===
          'INVALID_CROP_AREA'
        ) {

          errorKey =
            'errors.invalidImageDimensions';

        } else if (
          code ===
          'CANVAS_CONTEXT_FAILED'
        ) {

          errorKey =
            'errors.canvasContext';

        } else if (
          code ===
          'CREATE_FAILED'
        ) {

          errorKey =
            'errors.createFailed';

        }


        this.setError(
          errorKey
        );

      } finally {

        this.isCropping =
          false;


        this.el.dataset.processing =
          'false';


        if (
          !this.disposed
        ) {

          this.setControlsDisabled(
            false
          );


          if (
            this.cropBtn
          ) {

            this.cropBtn.disabled =
              false;

          }

        }

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


      this.hasError =
        true;


      this.errorKey =
        key;


      this.errorParams =
        params;


      this.errorMessage =
        t(
          key,
          params ||
            undefined
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
        this.ratioGroup
      ) {

        this.ratioGroup
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
        this.removeBtn
      ) {

        /*
         * Remove ไม่ควรล็อก
         * เพื่อให้ user สามารถยกเลิก job ได้
         * แม้กำลัง crop
         */
        this.removeBtn.disabled =
          false;

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
       * สำคัญมาก
       * ป้องกัน async crop นำผลลัพธ์กลับมาใช้
       */
      this.disposed =
        true;


      this.isCropping =
        false;


      this.el.dataset.processing =
        'false';


      // ------------------------------------------------------
      // Animation frame
      // ------------------------------------------------------

      if (
        this.resizeRaf
      ) {

        cancelAnimationFrame(
          this.resizeRaf
        );


        this.resizeRaf =
          0;

      }


      // ------------------------------------------------------
      // Responsive listener
      // ------------------------------------------------------

      if (
        this._resizeHandler
      ) {

        window.removeEventListener(
          'resize',
          this._resizeHandler
        );


        this._resizeHandler =
          null;

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

        } catch (_) {}


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

        } catch (_) {}


        this.resultUrl =
          null;

      }


      this.resultBlob =
        null;


      this.box =
        {

          left:
            0,

          top:
            0,

          width:
            0,

          height:
            0

        };

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

          /*
           * กันไฟล์ซ้ำ
           */
          if (
            hasDuplicateFile(
              file
            )
          ) {

            return;

          }


          const job =
            new CropJob(
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

  jobs.forEach(
    job => {

      if (
        !job.disposed
      ) {

        job.updateLanguageUI();

      }

    }
  );

})();
