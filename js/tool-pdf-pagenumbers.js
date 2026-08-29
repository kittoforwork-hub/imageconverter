/* global window, document */

(() => {
  'use strict';


  // ============================================================
  // GLOBALS
  // ============================================================

  const U =
    window.Utils;

  const PW =
    window.PdfWorkerClient;

  const I18n =
    window.I18n || null;


  // ============================================================
  // TRANSLATION
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
      'dz-pdf-pagenumbers'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-pagenumbers'
    );

  const formCard =
    document.getElementById(
      'form-pdf-pagenumbers'
    );


  // ------------------------------------------------------------
  // Safety
  // ------------------------------------------------------------

  if (
    !dropzone ||
    !fileInput ||
    !formCard
  ) {

    return;

  }


  const nameEl =
    formCard.querySelector(
      '.js-pdfname'
    );

  const templateEl =
    document.getElementById(
      'template-pdf-pagenumbers'
    );

  const startEl =
    document.getElementById(
      'start-pdf-pagenumbers'
    );

  const positionEl =
    document.getElementById(
      'position-pdf-pagenumbers'
    );

  const sizeEl =
    document.getElementById(
      'size-pdf-pagenumbers'
    );

  const applyBtn =
    document.getElementById(
      'apply-pdf-pagenumbers'
    );

  const downloadBtn =
    document.getElementById(
      'download-pdf-pagenumbers'
    );

  const statusEl =
    formCard.querySelector(
      '.js-status'
    );


  if (
    !nameEl ||
    !templateEl ||
    !startEl ||
    !positionEl ||
    !sizeEl ||
    !applyBtn ||
    !downloadBtn ||
    !statusEl
  ) {

    return;

  }


  // ============================================================
  // STATE
  // ============================================================

  let currentFile =
    null;


  const result =
    {};


  /*
   * idle
   * ready
   * processing
   * success
   * error
   */
  let state =
    'idle';


  let errorMessage =
    '';


  let resultBlobSize =
    0;


  // ============================================================
  // RESULT URL
  // ============================================================

  function clearResultUrl() {

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

  }


  // ============================================================
  // STATUS UI
  // ============================================================

  function renderStatus() {

    statusEl.classList.remove(
      'is-ready',
      'is-error'
    );


    // ----------------------------------------------------------
    // Processing
    // ----------------------------------------------------------

    if (
      state ===
      'processing'
    ) {

      statusEl.textContent =
        t(
          'pdf.applyingPageNumbers'
        );

      return;

    }


    // ----------------------------------------------------------
    // Success
    // ----------------------------------------------------------

    if (
      state ===
      'success'
    ) {

      statusEl.textContent =
        t(
          'pdf.readyPageNumberDownload',
          {
            size:
              U.formatBytes(
                resultBlobSize
              )
          }
        );


      statusEl.classList.add(
        'is-ready'
      );


      return;

    }


    // ----------------------------------------------------------
    // Error
    // ----------------------------------------------------------

    if (
      state ===
      'error'
    ) {

      statusEl.textContent =
        t(
          'pdf.pageNumberFailed',
          {
            message:
              errorMessage
          }
        );


      statusEl.classList.add(
        'is-error'
      );


      return;

    }


    // ----------------------------------------------------------
    // Ready
    // ----------------------------------------------------------

    if (
      state ===
      'ready'
    ) {

      statusEl.textContent =
        t(
          'pdf.readyPageNumber'
        );


      return;

    }


    statusEl.textContent =
      '';

  }


  // ============================================================
  // LOAD FILE
  // ============================================================

  function loadFile(
    file
  ) {

    if (
      !file ||
      file.type !==
        'application/pdf'
    ) {

      return;

    }


    if (
      !PW ||
      !PW.supported
    ) {

      state =
        'error';


      errorMessage =
        t(
          'pdf.browserPdfWorkerUnsupported'
        );


      renderStatus();

      return;

    }


    /*
     * Large file warning
     *
     * ไม่ใส่ข้อความ custom แล้ว
     * เพื่อให้ Utils ใช้ภาษาปัจจุบันของ I18n
     */
    if (
      !U.confirmLargeFile(
        file,
        50
      )
    ) {

      return;

    }


    currentFile =
      file;


    nameEl.textContent =
      file.name;


    formCard.classList.remove(
      'hidden'
    );


    clearResultUrl();


    resultBlobSize =
      0;


    downloadBtn.removeAttribute(
      'href'
    );


    downloadBtn.removeAttribute(
      'download'
    );


    downloadBtn.classList.add(
      'hidden'
    );


    state =
      'ready';


    errorMessage =
      '';


    renderStatus();

  }


  // ============================================================
  // APPLY PAGE NUMBERS
  // ============================================================

  applyBtn.addEventListener(
    'click',
    async () => {

      if (
        !currentFile ||
        state ===
          'processing'
      ) {

        return;

      }


      const template =
        templateEl.value.trim() ||
        '{n} / {total}';


      const startAt =
        parseInt(
          startEl.value,
          10
        ) ||
        1;


      const size =
        parseFloat(
          sizeEl.value
        ) ||
        11;


      const position =
        positionEl.value;


      state =
        'processing';


      errorMessage =
        '';


      clearResultUrl();


      resultBlobSize =
        0;


      downloadBtn.removeAttribute(
        'href'
      );


      downloadBtn.removeAttribute(
        'download'
      );


      downloadBtn.classList.add(
        'hidden'
      );


      applyBtn.disabled =
        true;


      applyBtn.dataset.processing =
        'true';


      applyBtn.textContent =
        t(
          'pdf.applyingPageNumbers'
        );


      statusEl.classList.remove(
        'is-ready',
        'is-error'
      );


      renderStatus();


      try {

        /*
         * อ่านไฟล์ใหม่ทุกครั้ง
         */
        const bytes =
          await U.readAsArrayBuffer(
            currentFile
          );


        const response =
          await PW.applyPageNumbers(
            bytes,
            {
              template,
              startAt,
              size,
              position
            }
          );


        const outBytes =
          response.bytes;


        const blob =
          new Blob(
            [
              outBytes
            ],
            {
              type:
                'application/pdf'
            }
          );


        const url =
          U.replaceObjectUrl(
            result,
            'url',
            blob
          );


        resultBlobSize =
          blob.size;


        downloadBtn.href =
          url;


        downloadBtn.download =
          `${U.baseName(
            currentFile.name
          )}-numbered.pdf`;


        downloadBtn.classList.remove(
          'hidden'
        );


        state =
          'success';


        renderStatus();

      } catch (
        err
      ) {

        console.error(
          '[PDF Page Numbers]',
          err
        );


        errorMessage =
          err &&
          err.message
            ? err.message
            : t(
                'errors.processingFailed'
              );


        state =
          'error';


        renderStatus();

      } finally {

        applyBtn.disabled =
          false;


        applyBtn.dataset.processing =
          'false';


        applyBtn.textContent =
          t(
            'pdf.applyPageNumber'
          );

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
      files => {

        const file =
          Array.from(
            files || []
          ).find(
            item =>
              item &&
              item.type ===
                'application/pdf'
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

        clearResultUrl();


        currentFile =
          null;


        state =
          'idle';


        errorMessage =
          '';


        resultBlobSize =
          0;


        nameEl.textContent =
          '—';


        downloadBtn.removeAttribute(
          'href'
        );


        downloadBtn.removeAttribute(
          'download'
        );


        downloadBtn.classList.add(
          'hidden'
        );


        formCard.classList.add(
          'hidden'
        );


        renderStatus();

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
       * ปุ่ม Apply
       */
      if (
        applyBtn.disabled
      ) {

        applyBtn.textContent =
          t(
            'pdf.applyingPageNumbers'
          );

      } else {

        applyBtn.textContent =
          t(
            'pdf.applyPageNumber'
          );

      }


      /*
       * Status
       */
      renderStatus();

    }
  );


  // ============================================================
  // INITIAL
  // ============================================================

  renderStatus();

})();
