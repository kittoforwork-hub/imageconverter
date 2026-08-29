/* global window, document, URL, FileReader, Image, requestAnimationFrame */

window.Utils = (() => {
  'use strict';


  // ============================================================
  // I18N
  // ============================================================

  /*
   * อย่าเก็บ window.I18n ไว้ใน const
   * เพราะ i18n อาจถูกสร้าง/เปลี่ยนหลัง utils โหลด
   *
   * ดึงทุกครั้งที่ใช้งาน เพื่อให้ภาษาปัจจุบันถูกต้องเสมอ
   */

  function getI18n() {
    return window.I18n || null;
  }


  function t(
    key,
    values
  ) {

    const I18n =
      getI18n();


    if (
      I18n &&
      typeof I18n.t ===
        'function'
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


  /*
   * alias สำหรับ tool ที่อยากเรียก
   * Utils.getText(...)
   */
  function getText(
    key,
    values
  ) {
    return t(
      key,
      values
    );
  }


  // ============================================================
  // BASIC HELPERS
  // ============================================================

  function formatBytes(
    bytes
  ) {

    const value =
      Number(bytes) || 0;


    if (
      value <
      1024
    ) {

      return (
        value +
        ' B'
      );

    }


    if (
      value <
      1024 * 1024
    ) {

      return (
        (
          value /
          1024
        ).toFixed(1) +
        ' KB'
      );

    }


    return (
      (
        value /
        (
          1024 *
          1024
        )
      ).toFixed(2) +
      ' MB'
    );
  }


  function baseName(
    name
  ) {

    const value =
      String(
        name || ''
      );


    const i =
      value.lastIndexOf(
        '.'
      );


    return (
      i > 0
        ? value.slice(
            0,
            i
          )
        : value
    );
  }


  function extOf(
    name
  ) {

    const value =
      String(
        name || ''
      );


    const i =
      value.lastIndexOf(
        '.'
      );


    return (
      i > 0
        ? value
            .slice(
              i + 1
            )
            .toUpperCase()
        : '—'
    );
  }


  // ============================================================
  // DOWNLOAD
  // ============================================================

  function downloadBlob(
    blob,
    filename
  ) {

    if (!blob) {

      throw new Error(
        t(
          'errors.downloadDataNotFound'
        )
      );
    }


    const url =
      URL.createObjectURL(
        blob
      );


    const a =
      document.createElement(
        'a'
      );


    a.href =
      url;


    a.download =
      filename ||
      'download';


    document.body.appendChild(
      a
    );


    try {

      a.click();

    } finally {

      a.remove();

    }


    /*
     * รอให้ browser เริ่ม download
     * ก่อน revoke Object URL
     */

    setTimeout(
      () => {

        try {

          URL.revokeObjectURL(
            url
          );

        } catch (_) {}

      },
      4000
    );
  }


  // ============================================================
  // DROPZONE
  // ============================================================

  function setupDropzone(
    zone,
    input,
    onFiles
  ) {

    if (
      !zone ||
      !input ||
      typeof onFiles !==
        'function'
    ) {

      return;
    }


    // ----------------------------------------------------------
    // CLICK
    // ----------------------------------------------------------

    zone.addEventListener(
      'click',
      event => {

        /*
         * ไม่ให้ input.click()
         * ถูกเรียกซ้ำจาก event ของ input
         */

        if (
          event.target ===
          input
        ) {

          return;
        }


        input.click();

      }
    );


    // ----------------------------------------------------------
    // KEYBOARD
    // ----------------------------------------------------------

    zone.addEventListener(
      'keydown',
      event => {

        if (
          event.key ===
            'Enter' ||
          event.key ===
            ' '
        ) {

          event.preventDefault();

          input.click();

        }
      }
    );


    // ----------------------------------------------------------
    // FILE INPUT
    // ----------------------------------------------------------

    input.addEventListener(
      'change',
      () => {

        if (
          input.files &&
          input.files.length
        ) {

          onFiles(
            input.files
          );

        }


        /*
         * ให้เลือกไฟล์เดิมซ้ำได้
         */

        input.value =
          '';

      }
    );


    // ----------------------------------------------------------
    // DRAG ENTER / OVER
    // ----------------------------------------------------------

    const dragStart =
      event => {

        event.preventDefault();

        zone.classList.add(
          'drag-over'
        );

      };


    [
      'dragenter',
      'dragover'
    ].forEach(
      eventName => {

        zone.addEventListener(
          eventName,
          dragStart
        );

      }
    );


    // ----------------------------------------------------------
    // DRAG LEAVE
    // ----------------------------------------------------------

    zone.addEventListener(
      'dragleave',
      event => {

        event.preventDefault();


        /*
         * ถ้ายังอยู่ภายใน dropzone
         * อย่าเพิ่งเอา state ออก
         */

        if (
          event.relatedTarget &&
          zone.contains(
            event.relatedTarget
          )
        ) {

          return;

        }


        zone.classList.remove(
          'drag-over'
        );

      }
    );


    // ----------------------------------------------------------
    // DROP
    // ----------------------------------------------------------

    zone.addEventListener(
      'drop',
      event => {

        event.preventDefault();


        zone.classList.remove(
          'drag-over'
        );


        const files =
          event.dataTransfer &&
          event.dataTransfer.files;


        if (
          files &&
          files.length
        ) {

          onFiles(
            files
          );

        }

      }
    );
  }


  // ============================================================
  // YIELD TO UI
  // ============================================================

  function yieldToUI() {

    return new Promise(
      resolve => {

        if (
          typeof requestAnimationFrame ===
          'function'
        ) {

          requestAnimationFrame(
            () => resolve()
          );

        } else {

          setTimeout(
            resolve,
            0
          );

        }

      }
    );
  }


  // ============================================================
  // LARGE FILE WARNING
  // ============================================================

  /*
   * รองรับ 2 รูปแบบ
   *
   * แบบเดิม:
   * confirmLargeFile(file, 50, 'ข้อความ...')
   *
   * แบบใหม่:
   * confirmLargeFile(file, 50)
   *
   * แบบใหม่จะใช้ข้อความจาก i18n โดยอัตโนมัติ
   */

  function confirmLargeFile(
    file,
    thresholdMB,
    message
  ) {

    if (!file) {
      return false;
    }


    const thresholdBytes =
      (
        Number(
          thresholdMB
        ) || 0
      ) *
      1024 *
      1024;


    if (
      file.size <=
      thresholdBytes
    ) {

      return true;

    }


    /*
     * ถ้า tool ส่งข้อความ custom มา
     * ให้ใช้ข้อความนั้นก่อน
     *
     * ถ้าไม่ส่งมา
     * จะใช้ข้อความตามภาษาปัจจุบัน
     */

    const finalMessage =
      message ||
      (
        t(
          'file.size',
          {
            size:
              formatBytes(
                file.size
              )
          }
        ) +
        '\n\n' +
        t(
          'file.largeWarning'
        ) +
        '\n\n' +
        t(
          'file.continueQuestion'
        )
      );


    return window.confirm(
      finalMessage
    );
  }


  // ============================================================
  // READ FILE AS ARRAYBUFFER
  // ============================================================

  async function readAsArrayBuffer(
    file
  ) {

    if (!file) {

      throw new Error(
        t(
          'errors.fileNotFound'
        )
      );

    }


    /*
     * Browser รุ่นใหม่
     */

    if (
      typeof file.arrayBuffer ===
      'function'
    ) {

      return file.arrayBuffer();

    }


    /*
     * Fallback
     */

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const reader =
          new FileReader();


        reader.onload =
          () => {

            resolve(
              reader.result
            );

          };


        reader.onerror =
          () => {

            reject(
              reader.error ||
              new Error(
                t(
                  'errors.fileReadFailed'
                )
              )
            );

          };


        reader.onabort =
          () => {

            reject(
              new Error(
                t(
                  'errors.fileReadAborted'
                )
              )
            );

          };


        reader.readAsArrayBuffer(
          file
        );

      }
    );
  }


  // ============================================================
  // LOAD IMAGE
  // ============================================================

  function loadImage(
    url
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const img =
          new Image();


        img.onload =
          () => {

            resolve(
              img
            );

          };


        img.onerror =
          () => {

            reject(
              new Error(
                t(
                  'errors.imageLoadFailed'
                )
              )
            );

          };


        img.src =
          url;

      }
    );
  }


  // ============================================================
  // CACHE / CLEANUP REGISTRY
  // ============================================================

  /*
   * Set ป้องกัน handler ซ้ำ
   */

  const resetHandlers =
    new Set();


  function onClearCache(
    fn
  ) {

    if (
      typeof fn !==
      'function'
    ) {

      return () => {};

    }


    resetHandlers.add(
      fn
    );


    /*
     * unregister
     */

    return () => {

      resetHandlers.delete(
        fn
      );

    };
  }


  function clearCache() {

    let count =
      0;


    /*
     * copy ก่อน
     * เพื่อป้องกัน registry เปลี่ยน
     * ระหว่าง cleanup
     */

    const handlers =
      Array.from(
        resetHandlers
      );


    handlers.forEach(
      fn => {

        try {

          fn();

          count++;

        } catch (
          err
        ) {

          console.warn(
            t(
              'utils.cacheHandlerFailed'
            ),
            err
          );

        }

      }
    );


    return count;
  }


  // ============================================================
  // OBJECT URL MANAGEMENT
  // ============================================================

  function replaceObjectUrl(
    holder,
    key,
    blob
  ) {

    if (
      !holder ||
      !key
    ) {

      throw new Error(
        t(
          'utils.invalidObjectUrlHolder'
        )
      );

    }


    /*
     * revoke ของเดิมก่อน
     */

    if (
      holder[key]
    ) {

      try {

        URL.revokeObjectURL(
          holder[key]
        );

      } catch (_) {}

    }


    /*
     * ไม่มี blob
     * = ล้างค่า
     */

    if (!blob) {

      holder[key] =
        null;


      return null;

    }


    holder[key] =
      URL.createObjectURL(
        blob
      );


    return holder[key];
  }


  // ============================================================
  // PUBLIC API
  // ============================================================

  return {

    /*
     * Translation
     */

    t,
    getText,


    /*
     * Basic
     */

    formatBytes,
    baseName,
    extOf,


    /*
     * Download
     */

    downloadBlob,


    /*
     * Dropzone
     */

    setupDropzone,


    /*
     * File
     */

    readAsArrayBuffer,
    loadImage,


    /*
     * Cache
     */

    onClearCache,
    clearCache,


    /*
     * Object URL
     */

    replaceObjectUrl,


    /*
     * UI
     */

    yieldToUI,
    confirmLargeFile

  };

})();
