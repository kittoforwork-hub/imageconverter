/* global window, document, URL, Blob */

(() => {
  'use strict';

  const U =
    window.Utils;

  const PW =
    window.PdfWorkerClient;

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

    return String(key);
  }


  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone =
    document.getElementById(
      'dz-pdf-watermark'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-watermark'
    );

  const formCard =
    document.getElementById(
      'form-pdf-watermark'
    );


  // ============================================================
  // GUARD
  // ============================================================

  if (
    !dropzone ||
    !fileInput ||
    !formCard ||
    !U ||
    !PW
  ) {

    console.error(
      'PDF watermark: required elements are missing'
    );

    return;
  }


  // ============================================================
  // FORM ELEMENTS
  // ============================================================

  const nameEl =
    formCard.querySelector(
      '.js-pdfname'
    );

  const textEl =
    document.getElementById(
      'text-pdf-watermark'
    );

  const imageInput =
    document.getElementById(
      'image-pdf-watermark'
    );

  const imageNameEl =
    formCard.querySelector(
      '.js-watermark-image-name'
    );

  const imageSizeEl =
    document.getElementById(
      'image-size-pdf-watermark'
    );

  const imageSizeVal =
    formCard.querySelector(
      '.js-image-size-val'
    );

  const sizeEl =
    document.getElementById(
      'size-pdf-watermark'
    );

  const opacityEl =
    document.getElementById(
      'opacity-pdf-watermark'
    );

  const opacityVal =
    formCard.querySelector(
      '.js-opacity-val'
    );

  const angleEl =
    document.getElementById(
      'angle-pdf-watermark'
    );

  const applyBtn =
    document.getElementById(
      'apply-pdf-watermark'
    );

  const downloadBtn =
    document.getElementById(
      'download-pdf-watermark'
    );

  const statusEl =
    formCard.querySelector(
      '.js-status'
    );


  // ============================================================
  // STATE
  // ============================================================

  let currentFile =
    null;

  let watermarkImageFile =
    null;

  let isProcessing =
    false;


  /*
   * Object URL ของผลลัพธ์
   */
  const result = {};


  // ============================================================
  // STATUS
  // ============================================================

  function setStatus(
    text,
    state
  ) {

    if (!statusEl) {
      return;
    }


    statusEl.textContent =
      text;


    statusEl.classList.remove(
      'is-ready',
      'is-error'
    );


    if (state) {

      statusEl.classList.add(
        state
      );

    }
  }


  // ============================================================
  // DEFAULT STATUS
  // ============================================================

  function updateIdleStatus() {

    if (!currentFile) {

      setStatus(
        t(
          'pdf.noPdfSelected'
        ),
        null
      );

      return;
    }


    setStatus(
      t(
        'pdf.readyWatermark'
      ),
      null
    );
  }


  // ============================================================
  // RESULT CLEANUP
  // ============================================================

  function resetResult() {

    if (
      result.url
    ) {

      try {

        URL.revokeObjectURL(
          result.url
        );

      } catch (_) {}


      result.url =
        null;
    }


    if (
      downloadBtn
    ) {

      downloadBtn.classList.add(
        'hidden'
      );


      downloadBtn.removeAttribute(
        'href'
      );


      downloadBtn.removeAttribute(
        'download'
      );

    }

  }


  // ============================================================
  // PROCESSING
  // ============================================================

  function setProcessing(
    on
  ) {

    isProcessing =
      !!on;


    if (
      applyBtn
    ) {

      applyBtn.disabled =
        isProcessing;


      applyBtn.textContent =
        isProcessing
          ? t(
              'pdf.applyingWatermark'
            )
          : t(
              'pdf.applyWatermark'
            );

    }


    formCard.dataset.processing =
      isProcessing
        ? 'true'
        : 'false';

  }


  // ============================================================
  // OPACITY
  // ============================================================

  function updateOpacityLabel() {

    if (!opacityEl) {
      return;
    }


    let value =
      Number(
        opacityEl.value
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      value =
        0.25;
    }


    value =
      Math.max(
        0,
        Math.min(
          1,
          value
        )
      );


    if (
      opacityVal
    ) {

      opacityVal.textContent =
        Math.round(
          value * 100
        ) +
        '%';

    }

  }


  if (
    opacityEl
  ) {

    opacityEl.addEventListener(
      'input',
      updateOpacityLabel
    );


    updateOpacityLabel();

  }


  // ============================================================
  // IMAGE SIZE
  // ============================================================

  function updateImageSizeLabel() {

    if (
      !imageSizeEl
    ) {
      return;
    }


    let value =
      Number(
        imageSizeEl.value
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      value =
        180;
    }


    if (
      imageSizeVal
    ) {

      imageSizeVal.textContent =
        String(
          Math.round(
            value
          )
        );

    }

  }


  if (
    imageSizeEl &&
    imageSizeVal
  ) {

    imageSizeEl.addEventListener(
      'input',
      updateImageSizeLabel
    );


    updateImageSizeLabel();

  }


  // ============================================================
  // IMAGE NAME UI
  // ============================================================

  function updateImageNameUI() {

    if (
      !imageNameEl
    ) {
      return;
    }


    if (
      watermarkImageFile
    ) {

      imageNameEl.textContent =
        `${watermarkImageFile.name} · ${U.formatBytes(
          watermarkImageFile.size
        )}`;

      return;
    }


    imageNameEl.textContent =
      t(
        'pdf.noImageSelected'
      );
  }


  // ============================================================
  // PNG WATERMARK SELECTOR
  // ============================================================

  if (
    imageInput
  ) {

    imageInput.addEventListener(
      'change',
      () => {

        const file =
          imageInput.files &&
          imageInput.files[0];


        if (!file) {

          watermarkImageFile =
            null;


          updateImageNameUI();


          resetResult();


          updateIdleStatus();


          return;
        }


        // ------------------------------------------------------
        // MIME
        // ------------------------------------------------------

        if (
          file.type !==
          'image/png'
        ) {

          imageInput.value =
            '';


          watermarkImageFile =
            null;


          if (
            imageNameEl
          ) {

            imageNameEl.textContent =
              t(
                'errors.pngOnly'
              );

          }


          setStatus(
            t(
              'errors.pngOnly'
            ),
            'is-error'
          );


          return;
        }


        // ------------------------------------------------------
        // Size
        // ------------------------------------------------------

        if (
          file.size <=
          0
        ) {

          imageInput.value =
            '';


          watermarkImageFile =
            null;


          if (
            imageNameEl
          ) {

            imageNameEl.textContent =
              t(
                'errors.emptyPng'
              );

          }


          setStatus(
            t(
              'errors.invalidPng'
            ),
            'is-error'
          );


          return;
        }


        watermarkImageFile =
          file;


        updateImageNameUI();


        resetResult();


        setStatus(
          t(
            'pdf.watermarkImageSelected'
          ),
          null
        );
      }
    );
  }


  // ============================================================
  // LOAD PDF
  // ============================================================

  function loadFile(
    file
  ) {

    if (!file) {
      return;
    }


    if (
      !PW.supported
    ) {

      alert(
        t(
          'errors.pdfWorkerUnsupported'
        )
      );

      return;
    }


    // ----------------------------------------------------------
    // Validate
    // ----------------------------------------------------------

    const isPdf =
      file.type ===
        'application/pdf' ||
      /\.pdf$/i.test(
        file.name
      );


    if (
      !isPdf
    ) {

      setStatus(
        t(
          'errors.pdfOnly'
        ),
        'is-error'
      );

      return;
    }


    // ----------------------------------------------------------
    // Large file
    // ----------------------------------------------------------

    if (
      !U.confirmLargeFile(
        file,
        50
      )
    ) {

      return;
    }


    // ----------------------------------------------------------
    // Current file
    // ----------------------------------------------------------

    currentFile =
      file;


    if (
      nameEl
    ) {

      nameEl.textContent =
        `${file.name} · ${U.formatBytes(
          file.size
        )}`;

    }


    formCard.classList.remove(
      'hidden'
    );


    resetResult();


    updateIdleStatus();


    formCard.dataset.processing =
      'false';
  }


  // ============================================================
  // APPLY WATERMARK
  // ============================================================

  if (
    applyBtn
  ) {

    applyBtn.addEventListener(
      'click',
      async () => {

        if (
          isProcessing ||
          !currentFile
        ) {

          return;
        }


        // ------------------------------------------------------
        // Watermark content
        // ------------------------------------------------------

        const text =
          (
            textEl &&
            textEl.value
              ? textEl.value
              : ''
          ).trim();


        const hasText =
          text.length >
          0;


        const hasImage =
          !!watermarkImageFile;


        if (
          !hasText &&
          !hasImage
        ) {

          setStatus(
            t(
              'errors.watermarkRequired'
            ),
            'is-error'
          );


          return;
        }


        // ------------------------------------------------------
        // Font size
        // ------------------------------------------------------

        let size =
          Number(
            sizeEl &&
            sizeEl.value
          );


        if (
          !Number.isFinite(
            size
          )
        ) {

          size =
            48;
        }


        size =
          Math.max(
            8,
            Math.min(
              200,
              size
            )
          );


        // ------------------------------------------------------
        // Image size
        // ------------------------------------------------------

        let imageSize =
          Number(
            imageSizeEl &&
            imageSizeEl.value
          );


        if (
          !Number.isFinite(
            imageSize
          )
        ) {

          imageSize =
            180;
        }


        imageSize =
          Math.max(
            40,
            Math.min(
              1200,
              imageSize
            )
          );


        // ------------------------------------------------------
        // Opacity
        // ------------------------------------------------------

        let opacity =
          Number(
            opacityEl &&
            opacityEl.value
          );


        if (
          !Number.isFinite(
            opacity
          )
        ) {

          opacity =
            0.25;
        }


        opacity =
          Math.max(
            0.05,
            Math.min(
              1,
              opacity
            )
          );


        // ------------------------------------------------------
        // Angle
        // ------------------------------------------------------

        let angle =
          Number(
            angleEl &&
            angleEl.value
          );


        if (
          !Number.isFinite(
            angle
          )
        ) {

          angle =
            45;
        }


        angle =
          Math.max(
            -360,
            Math.min(
              360,
              angle
            )
          );


        // ------------------------------------------------------
        // Processing
        // ------------------------------------------------------

        setProcessing(
          true
        );


        resetResult();


        if (
          hasText &&
          hasImage
        ) {

          setStatus(
            t(
              'pdf.applyingTextAndImage'
            ),
            null
          );

        } else if (
          hasImage
        ) {

          setStatus(
            t(
              'pdf.applyingImageWatermark'
            ),
            null
          );

        } else {

          setStatus(
            t(
              'pdf.applyingTextWatermark'
            ),
            null
          );

        }


        try {

          // ====================================================
          // PDF
          // ====================================================

          const pdfBytes =
            await U.readAsArrayBuffer(
              currentFile
            );


          // ====================================================
          // PNG
          // ====================================================

          let watermarkImage =
            null;


          if (
            hasImage
          ) {

            watermarkImage =
              await U.readAsArrayBuffer(
                watermarkImageFile
              );

          }


          // ====================================================
          // WORKER
          // ====================================================

          const response =
            await PW.applyWatermark(
              pdfBytes,
              {
                text,
                size,
                opacity,
                angle,
                watermarkImage,
                imageSize
              }
            );


          // ====================================================
          // VALIDATE
          // ====================================================

          if (
            !response ||
            !response.bytes
          ) {

            throw new Error(
              t(
                'errors.workerPdfMissing'
              )
            );

          }


          // ====================================================
          // RESULT
          // ====================================================

          const blob =
            new Blob(
              [
                response.bytes
              ],
              {
                type:
                  'application/pdf'
              }
            );


          if (
            blob.size <=
            0
          ) {

            throw new Error(
              t(
                'errors.emptyPdfResult'
              )
            );

          }


          // ====================================================
          // URL
          // ====================================================

          const url =
            U.replaceObjectUrl(
              result,
              'url',
              blob
            );


          downloadBtn.href =
            url;


          downloadBtn.download =
            `${U.baseName(
              currentFile.name
            )}-watermark.pdf`;


          downloadBtn.classList.remove(
            'hidden'
          );


          // ====================================================
          // DONE
          // ====================================================

          setStatus(
            t(
              'image.readyDownload',
              {
                size:
                  U.formatBytes(
                    blob.size
                  )
              }
            ),
            'is-ready'
          );


        } catch (
          err
        ) {

          console.error(
            'PDF watermark failed:',
            err
          );


          const message =
            (
              err &&
              err.message
            ) ||
            t(
              'errors.processingFailed'
            );


          setStatus(
            t(
              'pdf.watermarkFailed',
              {
                message
              }
            ),
            'is-error'
          );

        } finally {

          setProcessing(
            false
          );

        }

      }
    );

  }


  // ============================================================
  // DROPZONE
  // ============================================================

  U.setupDropzone(
    dropzone,
    fileInput,
    files => {

      const file =
        Array.from(
          files || []
        ).find(
          item =>
            item.type ===
              'application/pdf' ||
            /\.pdf$/i.test(
              item.name
            )
        );


      if (
        file
      ) {

        loadFile(
          file
        );

      }

    }
  );


  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {

      /*
       * ไม่แตะ filename
       * ไม่แตะค่าที่ผู้ใช้กรอก
       */

      updateImageNameUI();

      updateOpacityLabel();

      updateImageSizeLabel();


      /*
       * ปุ่ม Apply
       */

      if (
        applyBtn
      ) {

        applyBtn.textContent =
          isProcessing
            ? t(
                'pdf.applyingWatermark'
              )
            : t(
                'pdf.applyWatermark'
              );

      }


      /*
       * Download
       */

      if (
        downloadBtn &&
        !downloadBtn.disabled
      ) {

        downloadBtn.textContent =
          t(
            'common.download'
          );

      }


      /*
       * Current status
       */

      if (
        isProcessing
      ) {

        if (
          textEl?.value.trim() &&
          watermarkImageFile
        ) {

          setStatus(
            t(
              'pdf.applyingTextAndImage'
            ),
            null
          );

        } else if (
          watermarkImageFile
        ) {

          setStatus(
            t(
              'pdf.applyingImageWatermark'
            ),
            null
          );

        } else {

          setStatus(
            t(
              'pdf.applyingTextWatermark'
            ),
            null
          );

        }

      } else if (
        result.url
      ) {

        /*
         * ไม่สามารถดึง Blob จาก URL
         * จึงคง ready แบบ generic
         */
        setStatus(
          t(
            'image.ready'
          ),
          'is-ready'
        );

      } else if (
        currentFile
      ) {

        updateIdleStatus();

      }

    }
  );


  // ============================================================
  // CLEANUP
  // ============================================================

  U.onClearCache(
    () => {

      currentFile =
        null;


      watermarkImageFile =
        null;


      setProcessing(
        false
      );


      resetResult();


      if (
        imageInput
      ) {

        imageInput.value =
          '';

      }


      updateImageNameUI();


      formCard.classList.add(
        'hidden'
      );


      setStatus(
        t(
          'pdf.readyWatermark'
        ),
        null
      );

    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateOpacityLabel();

  updateImageSizeLabel();

  updateImageNameUI();

})();
