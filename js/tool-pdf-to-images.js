/* global window, document, URL, Blob, JSZip, pdfjsLib */

(() => {
  'use strict';

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

    return String(key);
  }


  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone =
    document.getElementById(
      'dz-pdf-to-images'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-to-images'
    );

  const bulkbar =
    document.getElementById(
      'bulk-pdf-to-images'
    );

  const nameEl =
    bulkbar?.querySelector(
      '.js-pdfname'
    );

  const formatEl =
    document.getElementById(
      'format-pdf-to-images'
    );

  const scaleEl =
    document.getElementById(
      'scale-pdf-to-images'
    );

  const renderBtn =
    document.getElementById(
      'render-pdf-to-images'
    );

  const downloadZipBtn =
    document.getElementById(
      'downloadZip-pdf-to-images'
    );

  const grid =
    document.getElementById(
      'grid-pdf-to-images'
    );

  const pageTemplate =
    document.getElementById(
      'tpl-page-thumb'
    );

  const progressWrap =
    document.getElementById(
      'progress-pdf-to-images'
    );

  const progressFill =
    progressWrap?.querySelector(
      '.js-progress'
    );

  const progressLabel =
    progressWrap?.querySelector(
      '.js-progress-label'
    );


  // ============================================================
  // GUARD
  // ============================================================

  if (
    !U ||
    !dropzone ||
    !fileInput ||
    !bulkbar ||
    !nameEl ||
    !formatEl ||
    !scaleEl ||
    !renderBtn ||
    !downloadZipBtn ||
    !grid ||
    !pageTemplate ||
    !progressWrap ||
    !progressFill ||
    !progressLabel
  ) {
    console.error(
      'PDF to Images: required elements are missing'
    );

    return;
  }


  // ============================================================
  // CONFIG
  // ============================================================

  const LARGE_FILE_WARN_MB =
    50;

  const HEAVY_WORK_PAGE_THRESHOLD =
    80;


  // ============================================================
  // STATE
  // ============================================================

  let currentFile =
    null;

  let currentDoc =
    null;

  let rendered =
    [];

  let cancelRequested =
    false;

  let loadSeq =
    0;


  // ============================================================
  // LANGUAGE UI
  // ============================================================

  function updateLanguageUI() {

    /*
     * ----------------------------------------------------------
     * Main render button
     * ----------------------------------------------------------
     */

    if (
      renderBtn.classList.contains(
        'is-working'
      )
    ) {

      if (
        cancelRequested
      ) {

        renderBtn.textContent =
          t(
            'pdf.cancelling'
          );

      } else {

        renderBtn.textContent =
          t(
            'pdf.cancel'
          );

      }

    } else {

      renderBtn.textContent =
        t(
          'pdf.renderAllPages'
        );

    }


    /*
     * ----------------------------------------------------------
     * ZIP button
     * ----------------------------------------------------------
     */

    if (
      downloadZipBtn.disabled
    ) {

      downloadZipBtn.textContent =
        t(
          'image.compressingZip'
        );

    } else {

      downloadZipBtn.textContent =
        t(
          'image.downloadZip'
        );

    }


    /*
     * ----------------------------------------------------------
     * Progress text
     * ----------------------------------------------------------
     */

    const total =
      currentDoc?.numPages || 0;

    const done =
      rendered.length;


    if (
      cancelRequested &&
      renderBtn.classList.contains(
        'is-working'
      )
    ) {

      progressLabel.textContent =
        t(
          'pdf.cancelling'
        );

    } else if (
      currentDoc &&
      progressWrap &&
      !progressWrap.classList.contains(
        'hidden'
      )
    ) {

      progressLabel.textContent =
        t(
          'pdf.pageProgress',
          {
            current:
              done,

            total
          }
        );

    }


    /*
     * ----------------------------------------------------------
     * Existing page cards
     * ----------------------------------------------------------
     */

    grid
      .querySelectorAll(
        '.page-card'
      )
      .forEach(
        card => {

          const label =
            card.querySelector(
              '.js-pagelabel'
            );

          if (!label) {
            return;
          }


          const page =
            Number(
              card.dataset.page
            );


          if (
            Number.isInteger(page) &&
            page > 0
          ) {

            label.textContent =
              t(
                'pdf.pageLabel',
                {
                  number:
                    page
                }
              );

          }

        }
      );

  }


  // ============================================================
  // LOAD FILE
  // ============================================================

  async function loadFile(
    file
  ) {

    const requestId =
      ++loadSeq;


    if (
      !file
    ) {
      return;
    }


    const validPdf =
      file.type ===
        'application/pdf' ||
      /\.pdf$/i.test(
        file.name
      );


    if (
      !validPdf
    ) {

      alert(
        t(
          'errors.pdfOnly'
        )
      );

      return;
    }


    if (
      !U.confirmLargeFile(
        file,
        LARGE_FILE_WARN_MB
      )
    ) {

      return;
    }


    try {

      currentFile =
        file;


      nameEl.textContent =
        file.name;


      bulkbar.classList.remove(
        'hidden'
      );


      grid.innerHTML =
        '';


      progressWrap.classList.add(
        'hidden'
      );


      downloadZipBtn.classList.add(
        'hidden'
      );


      rendered.forEach(
        item => {

          if (
            item.url
          ) {

            try {

              URL.revokeObjectURL(
                item.url
              );

            } catch (_) {}

          }

        }
      );


      rendered =
        [];


      if (
        currentDoc
      ) {

        try {

          await currentDoc.destroy();

        } catch (_) {}


        currentDoc =
          null;
      }


      const bytes =
        await U.readAsArrayBuffer(
          file
        );


      if (
        requestId !==
        loadSeq
      ) {

        return;
      }


      const loadingTask =
        pdfjsLib.getDocument({
          data:
            bytes,

          canvasFactory:
            window.KittoCanvasFactory
        });


      currentDoc =
        await loadingTask.promise;


      if (
        requestId !==
        loadSeq
      ) {

        try {

          await currentDoc.destroy();

        } catch (_) {}


        currentDoc =
          null;

        return;
      }

    } catch (
      error
    ) {

      if (
        requestId !==
        loadSeq
      ) {

        return;
      }


      console.error(
        'PDF loading error:',
        error
      );


      currentDoc =
        null;

      currentFile =
        null;


      bulkbar.classList.add(
        'hidden'
      );


      alert(
        t(
          'errors.pdfOpenFailed',
          {
            message:
              error?.message ||
              t(
                'errors.somethingWentWrong'
              )
          }
        )
      );

    }

  }


  // ============================================================
  // PROGRESS
  // ============================================================

  function setProgress(
    done,
    total
  ) {

    const percent =
      total
        ? Math.round(
            (
              done /
              total
            ) *
            100
          )
        : 0;


    progressFill.style.width =
      percent +
      '%';


    progressLabel.textContent =
      t(
        'pdf.pageProgress',
        {
          current:
            done,

          total
        }
      );

  }


  // ============================================================
  // RENDER ALL
  // ============================================================

  async function renderAll() {

    if (
      !currentDoc ||
      !currentFile
    ) {

      alert(
        t(
          'errors.selectPdfFirst'
        )
      );

      return;
    }


    const scale =
      Number(
        scaleEl.value
      ) ||
      1;


    const total =
      currentDoc.numPages;


    // ----------------------------------------------------------
    // Heavy work warning
    // ----------------------------------------------------------

    if (
      total *
        scale >=
      HEAVY_WORK_PAGE_THRESHOLD
    ) {

      const proceed =
        window.confirm(
          t(
            'pdf.heavyWorkWarning',
            {
              total,
              scale
            }
          )
        );


      if (
        !proceed
      ) {

        return;
      }

    }


    // ----------------------------------------------------------
    // Reset state
    // ----------------------------------------------------------

    cancelRequested =
      false;


    renderBtn.classList.add(
      'is-working'
    );


    renderBtn.textContent =
      t(
        'pdf.cancel'
      );


    grid.innerHTML =
      '';


    progressWrap.classList.remove(
      'hidden'
    );


    setProgress(
      0,
      total
    );


    rendered.forEach(
      item => {

        if (
          item.url
        ) {

          try {

            URL.revokeObjectURL(
              item.url
            );

          } catch (_) {}

        }

      }
    );


    rendered =
      [];


    const format =
      formatEl.value ===
      'image/png'
        ? 'image/png'
        : 'image/jpeg';


    const ext =
      format ===
      'image/png'
        ? 'png'
        : 'jpg';


    try {

      for (
        let pageNum = 1;
        pageNum <= total;
        pageNum++
      ) {

        if (
          cancelRequested
        ) {

          break;
        }


        const page =
          await currentDoc.getPage(
            pageNum
          );


        const viewport =
          page.getViewport({
            scale
          });


        const canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          Math.ceil(
            viewport.width
          );


        canvas.height =
          Math.ceil(
            viewport.height
          );


        const ctx =
          canvas.getContext(
            '2d',
            {
              willReadFrequently:
                true
            }
          );


        if (!ctx) {

          throw new Error(
            t(
              'errors.canvasContext'
            )
          );

        }


        /*
         * JPEG ไม่มี transparency
         */

        if (
          format ===
          'image/jpeg'
        ) {

          ctx.save();


          ctx.fillStyle =
            '#FFFFFF';


          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );


          ctx.restore();

        }


        await page.render({
          canvasContext:
            ctx,

          viewport
        }).promise;


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
                          'errors.imageCreateFailed'
                        )
                      )
                    );

                  }

                },
                format,
                format ===
                  'image/jpeg'
                  ? 0.92
                  : undefined
              );

            }
          );


        const url =
          URL.createObjectURL(
            blob
          );


        const name =
          `${U.baseName(
            currentFile.name
          )}-page` +
          `${String(
            pageNum
          ).padStart(
            2,
            '0'
          )}.${ext}`;


        rendered.push({
          pageNum,
          blob,
          url,
          name
        });


        page.cleanup();


        const card =
          pageTemplate.content
            .firstElementChild
            .cloneNode(
              true
            );


        card.dataset.page =
          String(
            pageNum
          );


        const img =
          card.querySelector(
            'img'
          );


        if (
          img
        ) {

          img.src =
            url;


          img.alt =
            t(
              'pdf.pageLabel',
              {
                number:
                  pageNum
              }
            );

        }


        const pageLabel =
          card.querySelector(
            '.js-pagelabel'
          );


        if (
          pageLabel
        ) {

          pageLabel.textContent =
            t(
              'pdf.pageLabel',
              {
                number:
                  pageNum
              }
            );

        }


        const dl =
          card.querySelector(
            '.js-download'
          );


        if (
          dl
        ) {

          dl.href =
            url;


          dl.download =
            name;

        }


        grid.appendChild(
          card
        );


        setProgress(
          pageNum,
          total
        );


        await U.yieldToUI();


        canvas.width =
          1;

        canvas.height =
          1;

      }

    } catch (
      error
    ) {

      console.error(
        'PDF render error:',
        error
      );


      progressLabel.textContent =
        t(
          'errors.pdfRenderFailed',
          {
            message:
              error?.message ||
              t(
                'errors.somethingWentWrong'
              )
          }
        );


      alert(
        t(
          'errors.pdfConvertFailed',
          {
            message:
              error?.message ||
              t(
                'errors.somethingWentWrong'
              )
          }
        )
      );

    } finally {

      renderBtn.classList.remove(
        'is-working'
      );


      const completed =
        !cancelRequested &&
        rendered.length ===
          total;


      progressWrap.classList.toggle(
        'hidden',
        completed
      );


      if (
        cancelRequested
      ) {

        progressLabel.textContent =
          t(
            'pdf.cancelledProgress',
            {
              done:
                rendered.length,

              total
            }
          );

      }


      downloadZipBtn.classList.toggle(
        'hidden',
        rendered.length === 0
      );


      updateLanguageUI();

    }

  }


  // ============================================================
  // RENDER / CANCEL BUTTON
  // ============================================================

  renderBtn.addEventListener(
    'click',
    () => {

      if (
        renderBtn.classList.contains(
          'is-working'
        )
      ) {

        cancelRequested =
          true;


        renderBtn.textContent =
          t(
            'pdf.cancelling'
          );


        return;
      }


      renderAll();

    }
  );


  // ============================================================
  // ZIP
  // ============================================================

  downloadZipBtn.addEventListener(
    'click',
    async () => {

      if (
        !rendered.length ||
        !currentFile
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


        rendered.forEach(
          item => {

            zip.file(
              item.name,
              item.blob
            );

          }
        );


        const content =
          await zip.generateAsync({
            type:
              'blob'
          });


        U.downloadBlob(
          content,
          `${U.baseName(
            currentFile.name
          )}-pages.zip`
        );

      } catch (
        error
      ) {

        console.error(
          'ZIP error:',
          error
        );


        alert(
          t(
            'errors.zipCreateFailed',
            {
              message:
                error?.message ||
                t(
                  'errors.somethingWentWrong'
                )
            }
          )
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
    files => {

      const file =
        Array.from(
          files || []
        ).find(
          f =>
            f.type ===
              'application/pdf' ||
            /\.pdf$/i.test(
              f.name
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

      updateLanguageUI();

    }
  );


  // ============================================================
  // CLEAR CACHE
  // ============================================================

  U.onClearCache(
    () => {

      ++loadSeq;


      cancelRequested =
        true;


      rendered.forEach(
        item => {

          if (
            item.url
          ) {

            try {

              URL.revokeObjectURL(
                item.url
              );

            } catch (_) {}

          }

        }
      );


      rendered =
        [];


      if (
        currentDoc
      ) {

        try {

          currentDoc.destroy();

        } catch (_) {}

        currentDoc =
          null;

      }


      currentFile =
        null;


      grid.innerHTML =
        '';


      bulkbar.classList.add(
        'hidden'
      );


      progressWrap.classList.add(
        'hidden'
      );


      downloadZipBtn.classList.add(
        'hidden'
      );


      renderBtn.classList.remove(
        'is-working'
      );


      renderBtn.disabled =
        false;


      renderBtn.textContent =
        t(
          'pdf.renderAllPages'
        );


      progressFill.style.width =
        '0%';


      progressLabel.textContent =
        t(
          'pdf.pageProgress',
          {
            current:
              0,

            total:
              0
          }
        );

    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  updateLanguageUI();

})();
