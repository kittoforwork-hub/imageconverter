/* global window, document, URL, Blob */

(() => {
  'use strict';


  // ============================================================
  // GLOBALS
  // ============================================================

  const U =
    window.Utils;

  const I18n =
    window.I18n || null;

  const PDFDocument =
    window.PDFLib &&
    window.PDFLib.PDFDocument;


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
      'dz-pdf-from-images'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-from-images'
    );

  const listEl =
    document.getElementById(
      'list-pdf-from-images'
    );

  const rowTemplate =
    document.getElementById(
      'tpl-file-row'
    );

  const bulkbar =
    document.getElementById(
      'bulk-pdf-from-images'
    );

  const countEl =
    document.getElementById(
      'count-pdf-from-images'
    );

  const pageSizeEl =
    document.getElementById(
      'pagesize-pdf-from-images'
    );

  const clearAllBtn =
    document.getElementById(
      'clearAll-pdf-from-images'
    );

  const buildBtn =
    document.getElementById(
      'build-pdf-from-images'
    );

  const resultStrip =
    document.getElementById(
      'result-pdf-from-images'
    );

  const resultStatus =
    document.getElementById(
      'resultStatus-pdf-from-images'
    );

  const resultDownload =
    document.getElementById(
      'resultDownload-pdf-from-images'
    );


  // ============================================================
  // SAFETY
  // ============================================================

  if (
    !dropzone ||
    !fileInput ||
    !listEl ||
    !rowTemplate ||
    !bulkbar ||
    !countEl ||
    !pageSizeEl ||
    !clearAllBtn ||
    !buildBtn ||
    !resultStrip ||
    !resultStatus ||
    !resultDownload ||
    !PDFDocument
  ) {

    return;

  }


  // ============================================================
  // CONFIG
  // ============================================================

  const PAGE_SIZES = {

    a4: [
      595.28,
      841.89
    ],

    letter: [
      612,
      792
    ]

  };


  const LARGE_IMAGE_COUNT =
    30;


  const LARGE_TOTAL_BYTES =
    80 *
    1024 *
    1024;


  // ============================================================
  // STATE
  // ============================================================

  let items =
    [];

  let seq =
    0;


  const result =
    {};


  let isBuilding =
    false;


  let resultErrorKey =
    null;

  let resultErrorValues =
    null;


  // ============================================================
  // RESULT STATE
  // ============================================================

  function clearResult() {

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


    resultStatus.textContent =
      '';


    resultStrip.classList.add(
      'hidden'
    );


    resultErrorKey =
      null;

    resultErrorValues =
      null;

  }


  function showResultSuccess(
    blob
  ) {

    resultErrorKey =
      null;

    resultErrorValues =
      null;


    const url =
      U.replaceObjectUrl(
        result,
        'url',
        blob
      );


    resultDownload.href =
      url;


    resultDownload.download =
      'images.pdf';


    resultStatus.textContent =
      t(
        'pdf.createdResult',
        {
          pages:
            items.length,

          size:
            U.formatBytes(
              blob.size
            )
        }
      );


    resultStatus.classList.remove(
      'is-error'
    );


    resultStatus.classList.add(
      'is-ready'
    );


    resultStrip.classList.remove(
      'hidden'
    );

  }


  function showResultError(
    message
  ) {

    resultErrorKey =
      'pdf.buildFailed';


    resultErrorValues =
      {
        message
      };


    resultStatus.textContent =
      t(
        resultErrorKey,
        resultErrorValues
      );


    resultStatus.classList.remove(
      'is-ready'
    );


    resultStatus.classList.add(
      'is-error'
    );


    resultStrip.classList.remove(
      'hidden'
    );

  }


  // ============================================================
  // RENDER LIST
  // ============================================================

  function render() {

    listEl.innerHTML =
      '';


    items.forEach(
      (
        item,
        idx
      ) => {

        const row =
          rowTemplate
            .content
            .firstElementChild
            .cloneNode(
              true
            );


        const img =
          row.querySelector(
            'img'
          );


        const nameEl =
          row.querySelector(
            '.js-name'
          );


        const metaEl =
          row.querySelector(
            '.js-meta'
          );


        const moveUpBtn =
          row.querySelector(
            '.js-move-up'
          );


        const moveDownBtn =
          row.querySelector(
            '.js-move-down'
          );


        const removeBtn =
          row.querySelector(
            '.js-remove'
          );


        if (
          img
        ) {

          img.src =
            item.url;

        }


        if (
          nameEl
        ) {

          nameEl.textContent =
            `${idx + 1}. ${item.file.name}`;

        }


        if (
          metaEl
        ) {

          metaEl.textContent =
            item.img
              ? `${item.img.naturalWidth}×${item.img.naturalHeight}`
              : '';

        }


        if (
          moveUpBtn
        ) {

          moveUpBtn.disabled =
            idx === 0;


          moveUpBtn.title =
            t(
              'pdf.moveUp'
            );


          moveUpBtn.setAttribute(
            'aria-label',
            t(
              'pdf.moveUp'
            )
          );


          moveUpBtn.addEventListener(
            'click',
            () => {

              moveItem(
                idx,
                -1
              );

            }
          );

        }


        if (
          moveDownBtn
        ) {

          moveDownBtn.disabled =
            idx ===
            items.length - 1;


          moveDownBtn.title =
            t(
              'pdf.moveDown'
            );


          moveDownBtn.setAttribute(
            'aria-label',
            t(
              'pdf.moveDown'
            )
          );


          moveDownBtn.addEventListener(
            'click',
            () => {

              moveItem(
                idx,
                1
              );

            }
          );

        }


        if (
          removeBtn
        ) {

          removeBtn.title =
            t(
              'common.remove'
            );


          removeBtn.setAttribute(
            'aria-label',
            t(
              'common.remove'
            )
          );


          removeBtn.addEventListener(
            'click',
            () => {

              removeItem(
                item.id
              );

            }
          );

        }


        listEl.appendChild(
          row
        );

      }
    );


    countEl.textContent =
      String(
        items.length
      );


    bulkbar.classList.toggle(
      'hidden',
      items.length === 0
    );


    /*
     * ถ้าไม่มีรายการ ให้ล้าง result
     */
    if (
      items.length === 0
    ) {

      clearResult();

    }


    /*
     * ถ้ามีรายการใหม่ ให้ invalidate
     * PDF เดิม เพราะลำดับ/จำนวนภาพเปลี่ยน
     */
    else {

      if (
        !isBuilding
      ) {

        clearResult();

      }

    }

  }


  // ============================================================
  // MOVE
  // ============================================================

  function moveItem(
    idx,
    direction
  ) {

    const next =
      idx +
      direction;


    if (
      next < 0 ||
      next >= items.length
    ) {

      return;

    }


    [
      items[idx],
      items[next]
    ] = [
      items[next],
      items[idx]
    ];


    render();

  }


  // ============================================================
  // REMOVE
  // ============================================================

  function removeItem(
    id
  ) {

    const item =
      items.find(
        current =>
          current.id === id
      );


    if (
      item
    ) {

      try {

        URL.revokeObjectURL(
          item.url
        );

      } catch (_) {}

    }


    items =
      items.filter(
        current =>
          current.id !== id
      );


    render();

  }


  // ============================================================
  // ADD FILES
  // ============================================================

  async function addFiles(
    fileList
  ) {

    const files =
      Array.from(
        fileList || []
      ).filter(
        file =>
          file &&
          typeof file.type ===
            'string' &&
          file.type.startsWith(
            'image/'
          )
      );


    for (
      const file of files
    ) {

      const url =
        URL.createObjectURL(
          file
        );


      const img =
        await U.loadImage(
          url
        ).catch(
          () => null
        );


      items.push(
        {
          id:
            'img-' +
            (++seq),

          file,

          url,

          img
        }
      );

    }


    render();

  }


  // ============================================================
  // CLEAR ALL
  // ============================================================

  clearAllBtn.addEventListener(
    'click',
    () => {

      if (
        isBuilding
      ) {

        return;

      }


      items.forEach(
        item => {

          try {

            URL.revokeObjectURL(
              item.url
            );

          } catch (_) {}

        }
      );


      items =
        [];


      clearResult();

      render();

    }
  );


  // ============================================================
  // IMAGE -> PNG BYTES
  // ============================================================

  async function imageToPngBytes(
    img
  ) {

    if (
      !img ||
      !img.naturalWidth ||
      !img.naturalHeight
    ) {

      throw new Error(
        t(
          'errors.invalidImageDimensions'
        )
      );

    }


    const canvas =
      document.createElement(
        'canvas'
      );


    canvas.width =
      img.naturalWidth;


    canvas.height =
      img.naturalHeight;


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


    ctx.drawImage(
      img,
      0,
      0
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
            'image/png'
          );

        }
      );


    return new Uint8Array(
      await blob.arrayBuffer()
    );

  }


  // ============================================================
  // LARGE FILE WARNING
  // ============================================================

  function confirmLargeJob() {

    const totalBytes =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          (
            Number(
              item.file.size
            ) || 0
          ),
        0
      );


    if (
      items.length <
        LARGE_IMAGE_COUNT &&
      totalBytes <
        LARGE_TOTAL_BYTES
    ) {

      return true;

    }


    const message =
      t(
        'pdf.largeWarning',
        {
          count:
            items.length,

          size:
            U.formatBytes(
              totalBytes
            )
        }
      );


    return window.confirm(
      message
    );

  }


  // ============================================================
  // BUILD PDF
  // ============================================================

  buildBtn.addEventListener(
    'click',
    async () => {

      if (
        !items.length ||
        isBuilding
      ) {

        return;

      }


      if (
        !confirmLargeJob()
      ) {

        return;

      }


      isBuilding =
        true;


      buildBtn.disabled =
        true;


      buildBtn.textContent =
        t(
          'pdf.building'
        );


      buildBtn.dataset.processing =
        'true';


      resultStrip.classList.add(
        'hidden'
      );


      resultErrorKey =
        null;

      resultErrorValues =
        null;


      try {

        const pdfDoc =
          await PDFDocument.create();


        const mode =
          pageSizeEl.value;


        for (
          const item of items
        ) {

          if (
            !item.img
          ) {

            throw new Error(
              t(
                'errors.imageLoadFailed'
              )
            );

          }


          const type =
            item.file.type;


          let embedded;


          const bytes =
            new Uint8Array(
              await U.readAsArrayBuffer(
                item.file
              )
            );


          if (
            type ===
              'image/png'
          ) {

            embedded =
              await pdfDoc.embedPng(
                bytes
              );

          } else if (
            type ===
              'image/jpeg' ||
            type ===
              'image/jpg'
          ) {

            embedded =
              await pdfDoc.embedJpg(
                bytes
              );

          } else {

            const pngBytes =
              await imageToPngBytes(
                item.img
              );


            embedded =
              await pdfDoc.embedPng(
                pngBytes
              );

          }


          const iw =
            embedded.width;


          const ih =
            embedded.height;


          let pageW;
          let pageH;
          let drawW;
          let drawH;
          let x;
          let y;


          if (
            mode ===
            'fit'
          ) {

            pageW =
              iw;

            pageH =
              ih;

            drawW =
              iw;

            drawH =
              ih;

            x =
              0;

            y =
              0;

          } else {

            const selectedSize =
              PAGE_SIZES[
                mode
              ] ||
              PAGE_SIZES.a4;


            pageW =
              selectedSize[0];


            pageH =
              selectedSize[1];


            const scale =
              Math.min(
                pageW / iw,
                pageH / ih
              );


            drawW =
              iw *
              scale;


            drawH =
              ih *
              scale;


            x =
              (
                pageW -
                drawW
              ) /
              2;


            y =
              (
                pageH -
                drawH
              ) /
              2;

          }


          const page =
            pdfDoc.addPage(
              [
                pageW,
                pageH
              ]
            );


          page.drawImage(
            embedded,
            {
              x,
              y,
              width:
                drawW,
              height:
                drawH
            }
          );


          await U.yieldToUI();

        }


        const pdfBytes =
          await pdfDoc.save();


        const blob =
          new Blob(
            [
              pdfBytes
            ],
            {
              type:
                'application/pdf'
            }
          );


        showResultSuccess(
          blob
        );


      } catch (
        err
      ) {

        console.error(
          '[Images to PDF]',
          err
        );


        const message =
          err &&
          err.message
            ? err.message
            : t(
                'errors.processingFailed'
              );


        showResultError(
          message
        );


      } finally {

        isBuilding =
          false;


        buildBtn.disabled =
          false;


        buildBtn.dataset.processing =
          'false';


        buildBtn.textContent =
          t(
            'pdf.buildPdf'
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

        if (
          isBuilding
        ) {

          return;

        }


        items.forEach(
          item => {

            try {

              URL.revokeObjectURL(
                item.url
              );

            } catch (_) {}

          }
        );


        items =
          [];


        clearResult();

        render();

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
       * ปุ่ม Build
       */
      if (
        !buildBtn.disabled
      ) {

        buildBtn.textContent =
          t(
            'pdf.buildPdf'
          );

      } else if (
        isBuilding
      ) {

        buildBtn.textContent =
          t(
            'pdf.building'
          );

      }


      /*
       * Result
       */
      if (
        resultErrorKey
      ) {

        resultStatus.textContent =
          t(
            resultErrorKey,
            resultErrorValues
          );

      } else if (
        result.url
      ) {

        /*
         * Blob ไม่เปลี่ยน
         * แต่ข้อความต้องเปลี่ยนภาษา
         */
        /*
         * ไม่สามารถอ่านขนาดจาก URL ได้
         * ดังนั้นเก็บ blob size ไว้ด้านล่าง
         */

        if (
          result.blobSize
        ) {

          resultStatus.textContent =
            t(
              'pdf.createdResult',
              {
                pages:
                  items.length,

                size:
                  U.formatBytes(
                    result.blobSize
                  )
              }
            );

        }

      }


      /*
       * รายการไฟล์
       */
      render();

    }
  );


  // ============================================================
  // WRAP RESULT BLOB SIZE
  // ============================================================

  const originalShowResultSuccess =
    showResultSuccess;


  /*
   * เก็บขนาด PDF ไว้เพื่อให้
   * เปลี่ยนภาษาแล้วสร้างข้อความใหม่ได้
   */
  function showResultSuccessWithSize(
    blob
  ) {

    result.blobSize =
      blob.size;


    originalShowResultSuccess(
      blob
    );

  }


  /*
   * เปลี่ยน function reference ที่ event
   * เรียกใช้
   */
  showResultSuccess =
    showResultSuccessWithSize;


  // ============================================================
  // INITIAL UI
  // ============================================================

  render();

})();
