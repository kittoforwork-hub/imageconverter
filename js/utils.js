/* global window, document, URL, FileReader, Image, requestAnimationFrame */

window.Utils = (() => {
  'use strict';

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
  // BASIC HELPERS
  // ============================================================

  function formatBytes(bytes) {
    const value =
      Number(bytes) || 0;

    if (value < 1024) {
      return value + ' B';
    }

    if (
      value <
      1024 * 1024
    ) {
      return (
        (value / 1024).toFixed(1) +
        ' KB'
      );
    }

    return (
      (
        value /
        (1024 * 1024)
      ).toFixed(2) +
      ' MB'
    );
  }


  function baseName(name) {
    const value =
      String(name || '');

    const i =
      value.lastIndexOf('.');

    return i > 0
      ? value.slice(0, i)
      : value;
  }


  function extOf(name) {
    const value =
      String(name || '');

    const i =
      value.lastIndexOf('.');

    return i > 0
      ? value
          .slice(i + 1)
          .toUpperCase()
      : '—';
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

    // ปล่อย Object URL หลังจาก browser
    // มีเวลาเริ่ม download แล้ว
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
    // Click
    // ----------------------------------------------------------

    zone.addEventListener(
      'click',
      event => {
        // ป้องกัน click ซ้ำกรณี event เกิดจาก input เอง
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
    // Keyboard accessibility
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
    // File input
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

        // เคลียร์ input เพื่อให้เลือกไฟล์เดิมซ้ำได้
        input.value = '';
      }
    );


    // ----------------------------------------------------------
    // Drag enter / over
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
    // Drag leave
    // ----------------------------------------------------------

    zone.addEventListener(
      'dragleave',
      event => {
        event.preventDefault();

        // ถ้ายังลากอยู่ภายใน dropzone
        // อย่าเอา class ออก
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
    // Drop
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
          onFiles(files);
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

  function confirmLargeFile(
    file,
    thresholdMB,
    message
  ) {
    if (!file) {
      return false;
    }

    const thresholdBytes =
      (Number(
        thresholdMB
      ) || 0) *
      1024 *
      1024;

    if (
      file.size <=
      thresholdBytes
    ) {
      return true;
    }

    /*
     * ถ้ามีข้อความ custom จาก Tool
     * ให้ใช้ข้อความนั้น
     * ถ้าไม่มี ให้ใช้ข้อความจากระบบภาษา
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

    // Browser รุ่นใหม่
    if (
      typeof file.arrayBuffer ===
      'function'
    ) {
      return file.arrayBuffer();
    }

    // Fallback สำหรับ browser รุ่นเก่า
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

  function loadImage(url) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const img =
          new Image();

        img.onload =
          () => {
            resolve(img);
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
   * ใช้ Set แทน Array
   * เพื่อไม่ให้ handler ตัวเดิมถูกลงทะเบียนซ้ำ
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

    // คืน function สำหรับ unregister
    return () => {
      resetHandlers.delete(
        fn
      );
    };
  }


  function clearCache() {
    let count = 0;

    // copy ออกมาก่อน เพื่อป้องกัน
    // handler เปลี่ยน registry ระหว่าง cleanup
    const handlers =
      Array.from(
        resetHandlers
      );

    handlers.forEach(
      fn => {
        try {
          fn();

          count++;
        } catch (err) {
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
        'replaceObjectUrl ต้องมี holder และ key'
      );
    }


    // revoke ของเดิมก่อน
    if (holder[key]) {
      try {
        URL.revokeObjectURL(
          holder[key]
        );
      } catch (_) {}
    }


    // ถ้าไม่มี blob ให้เคลียร์ค่าอย่างเดียว
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
    formatBytes,
    baseName,
    extOf,

    downloadBlob,

    setupDropzone,

    readAsArrayBuffer,
    loadImage,

    onClearCache,
    clearCache,

    replaceObjectUrl,

    yieldToUI,
    confirmLargeFile
  };
})();
