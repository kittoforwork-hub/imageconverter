/* global window, document, URL, Blob, pdfjsLib, JSZip */

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
      'dz-pdf-merge'
    );

  const fileInput =
    document.getElementById(
      'input-pdf-merge'
    );

  const listEl =
    document.getElementById(
      'list-pdf-merge'
    );

  const rowTemplate =
    document.getElementById(
      'tpl-file-row'
    );

  const bulkbar =
    document.getElementById(
      'bulk-pdf-merge'
    );

  const countEl =
    document.getElementById(
      'count-pdf-merge'
    );

  const clearAllBtn =
    document.getElementById(
      'clearAll-pdf-merge'
    );

  const buildBtn =
    document.getElementById(
      'build-pdf-merge'
    );

  const resultStrip =
    document.getElementById(
      'result-pdf-merge'
    );

  const resultStatus =
    resultStrip
      ? resultStrip.querySelector(
          '.status'
        )
      : null;

  const resultDownload =
    document.getElementById(
      'resultDownload-pdf-merge'
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
    !clearAllBtn ||
    !buildBtn ||
    !resultStrip ||
    !resultStatus ||
    !resultDownload ||
    !PW ||
    typeof PW.mergePdfs !== 'function'
  ) {

    return;

  }


  // ============================================================
  // STATE
  // ============================================================

  let items =
    [];

  let seq =
    0;


  const result =
    {};


  /*
   * mergeState:
   *
   * idle
   * building
   * success
   * error
   */
  let mergeState =
    'idle';


  let mergeError =
    '';


  let mergedPageCount =
    0;


  let mergedBlobSize =
    0;


  // ============================================================
  // RESULT
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


    mergeState =
      'idle';


    mergeError =
      '';


    mergedPageCount =
      0;


    mergedBlobSize =
      0;


    resultStatus.textContent =
      '';


    resultStatus.classList.remove(
      'is-ready',
      'is-error'
    );


    resultDownload.removeAttribute(
      'href'
    );


    resultDownload.removeAttribute(
      'download'
    );


    resultStrip.classList.add(
      'hidden'
    );

  }


  function renderResult() {

    /*
     * --------------------------------------------------------
     * BUILDING
     * --------------------------------------------------------
     */
    if (
      mergeState ===
      'building'
    ) {

      resultStrip.classList.add(
        'hidden'
      );

      return;

    }


    /*
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */
    if (
      mergeState ===
      'success'
    ) {

      resultStatus.textContent =
        t(
          'pdf.mergedResult',
          {
            pages:
              mergedPageCount,

            size:
              U.formatBytes(
                mergedBlobSize
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

      return;

    }


    /*
     * --------------------------------------------------------
     * ERROR
     * --------------------------------------------------------
     */
    if (
      mergeState ===
      'error'
    ) {

      /*
       * กรณี error จาก validation
       * mergeError จะเป็นข้อความที่แปลแล้ว
       */
      resultStatus.textContent =
        mergeError ||
        t(
          'errors.somethingWentWrong'
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

      return;

    }


    /*
     * --------------------------------------------------------
     * IDLE
     * --------------------------------------------------------
     */
    resultStrip.classList.add(
      'hidden'
    );

  }


  // ============================================================
  // RENDER FILE LIST
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
            item.thumbUrl ||
            '';

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

          const pageText =
            item.pageCount !== null &&
            item.pageCount !== undefined
              ? String(
                  item.pageCount
                )
              : '?';


          metaEl.textContent =
            `${pageText} ${t(
              'common.pages'
            )} · ${U.formatBytes(
              item.file.size
            )}`;

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


    renderResult();

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


    /*
     * ลำดับไฟล์เปลี่ยน
     * ผลลัพธ์เดิมไม่ตรงกับรายการแล้ว
     */
    if (
      !isBuilding()
    ) {

      clearResult();

    }


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
      item &&
      item.thumbUrl
    ) {

      try {

        URL.revokeObjectURL(
          item.thumbUrl
        );

      } catch (_) {}

    }


    items =
      items.filter(
        current =>
          current.id !== id
      );


    if (
      !isBuilding()
    ) {

      clearResult();

    }


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
          file.type ===
            'application/pdf'
      );


    for (
      const file of files
    ) {

      if (
        !U.confirmLargeFile(
          file,
          50
        )
      ) {

        continue;

      }


      const entry = {

        id:
          'pdf-' +
          (++seq),

        file,

        thumbUrl:
          null,

        pageCount:
          null

      };


      items.push(
        entry
      );


      /*
       * แสดงรายการก่อน
       * แล้วค่อยสร้าง thumbnail
       */
      render();


      try {

        /*
         * pdf.js ทำเฉพาะ thumbnail
         * ส่วน merge จริงทำใน worker
         */
        const bytes =
          await U.readAsArrayBuffer(
            file
          );


        const doc =
          await pdfjsLib
            .getDocument(
              {
                data:
                  bytes
              }
            )
            .promise;


        entry.pageCount =
          doc.numPages;


        const page =
          await doc.getPage(
            1
          );


        const viewport =
          page.getViewport(
            {
              scale:
                0.25
            }
          );


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


        const context =
          canvas.getContext(
            '2d'
          );


        if (!context) {

          throw new Error(
            t(
              'errors.canvasContext'
            )
          );

        }


        await page.render(
          {
            canvasContext:
              context,

            viewport
          }
        ).promise;


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


        entry.thumbUrl =
          URL.createObjectURL(
            blob
          );


        await doc.destroy();


      } catch (
        error
      ) {

        console.warn(
          '[PDF Merge] Thumbnail failed:',
          error
        );


        entry.pageCount =
          null;

      }


      render();

    }

  }


  // ============================================================
  // IS BUILDING
  // ============================================================

  function isBuilding() {

    return (
      mergeState ===
      'building'
    );

  }


  // ============================================================
  // CLEAR ALL
  // ============================================================

  clearAllBtn.addEventListener(
    'click',
    () => {

      if (
        isBuilding()
      ) {

        return;

      }


      items.forEach(
        item => {

          if (
            item.thumbUrl
          ) {

            try {

              URL.revokeObjectURL(
                item.thumbUrl
              );

            } catch (_) {}

          }

        }
      );


      items =
        [];


      clearResult();


      render();

    }
  );


  // ============================================================
  // BUILD / MERGE
  // ============================================================

  buildBtn.addEventListener(
    'click',
    async () => {

      if (
        items.length <
        2
      ) {

        mergeState =
          'error';


        mergeError =
          t(
            'pdf.mergeNeedTwo'
          );


        renderResult();


        return;

      }


      if (
        isBuilding()
      ) {

        return;

      }


      mergeState =
        'building';


      mergeError =
        '';


      buildBtn.disabled =
        true;


      buildBtn.dataset.processing =
        'true';


      buildBtn.textContent =
        t(
          'pdf.merging'
        );


      resultStrip.classList.add(
        'hidden'
      );


      try {

        /*
         * อ่านไฟล์ใหม่ทุกครั้ง
         */
        const buffers =
          await Promise.all(
            items.map(
              item =>
                U.readAsArrayBuffer(
                  item.file
                )
            )
          );


        /*
         * ส่งไป worker
         */
        const response =
          await PW.mergePdfs(
            buffers
          );


        const outBytes =
          response.bytes;


        const pageCount =
          response.pageCount;


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


        resultDownload.href =
          url;


        resultDownload.download =
          'merged.pdf';


        mergedPageCount =
          Number(
            pageCount
          ) ||
          0;


        mergedBlobSize =
          blob.size;


        mergeState =
          'success';


        renderResult();


      } catch (
        err
      ) {

        console.error(
          '[PDF Merge]',
          err
        );


        mergeError =
          err &&
          err.message
            ? err.message
            : t(
                'errors.processingFailed'
              );


        mergeState =
          'error';


        renderResult();

      } finally {

        buildBtn.disabled =
          false;


        buildBtn.dataset.processing =
          'false';


        buildBtn.textContent =
          t(
            'pdf.mergeFiles'
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
          isBuilding()
        ) {

          return;

        }


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


        items.forEach(
          item => {

            if (
              item.thumbUrl
            ) {

              try {

                URL.revokeObjectURL(
                  item.thumbUrl
                );

              } catch (_) {}

            }

          }
        );


        items =
          [];


        mergeState =
          'idle';


        mergeError =
          '';


        mergedPageCount =
          0;


        mergedBlobSize =
          0;


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
       * ปุ่มหลัก
       */
      if (
        isBuilding()
      ) {

        buildBtn.textContent =
          t(
            'pdf.merging'
          );

      } else {

        buildBtn.textContent =
          t(
            'pdf.mergeFiles'
          );

      }


      /*
       * Result
       */
      renderResult();


      /*
       * File list
       *
       * สำคัญ:
       * page count / files metadata ต้อง
       * render ใหม่เพื่อเปลี่ยน "หน้า"
       */
      render();

    }
  );


  // ============================================================
  // INITIAL UI
  // ============================================================

  render();

})();
