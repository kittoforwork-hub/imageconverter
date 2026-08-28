/* global window */
window.Utils = (() => {
  'use strict';

  // ------------------------------------------------------------
  // BASIC HELPERS
  // ------------------------------------------------------------

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
        value / 1024
      ).toFixed(1) + ' KB';
    }

    return (
      value /
      (1024 * 1024)
    ).toFixed(2) + ' MB';
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


  // ------------------------------------------------------------
  // DOWNLOAD
  // ------------------------------------------------------------

  function downloadBlob(
    blob,
    filename
  ) {
    if (!blob) {
      throw new Error(
        'ไม่พบข้อมูลสำหรับดาวน์โหลด'
      );
    }

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;
    a.download =
      filename || 'download';

    document.body.appendChild(a);

    try {
      a.click();
    } finally {
      a.remove();
    }

    setTimeout(() => {
      try {
        URL.revokeObjectURL(
          url
        );
      } catch (_) {}
    }, 4000);
  }


  // ------------------------------------------------------------
  // DROPZONE
  // ------------------------------------------------------------

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


    zone.addEventListener(
      'click',
      event => {
        // ถ้าคลิกบน input โดยตรง
        // อย่า trigger ซ้ำ
        if (
          event.target === input
        ) {
          return;
        }

        input.click();
      }
    );


    zone.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          input.click();
        }
      }
    );


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

        // ทำให้เลือกไฟล์เดิมซ้ำได้
        input.value = '';
      }
    );


    const dragStart =
      event => {
        event.preventDefault();

        zone.classList.add(
          'drag-over'
        );
      };


    const dragEnd =
      event => {
        event.preventDefault();

        zone.classList.remove(
          'drag-over'
        );
      };


    ['dragenter', 'dragover']
      .forEach(eventName => {
        zone.addEventListener(
          eventName,
          dragStart
        );
      });


    zone.addEventListener(
      'dragleave',
      event => {
        event.preventDefault();

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


  // ------------------------------------------------------------
  // YIELD TO UI
  // ------------------------------------------------------------

  function yieldToUI() {
    return new Promise(resolve => {
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
    });
  }


  // ------------------------------------------------------------
  // LARGE FILE WARNING
  // ------------------------------------------------------------

  function confirmLargeFile(
    file,
    thresholdMB,
    message
  ) {
    if (!file) {
      return false;
    }

    const thresholdBytes =
      Number(thresholdMB) *
      1024 *
      1024;

    if (
      file.size <=
      thresholdBytes
    ) {
      return true;
    }

    return window.confirm(
      `${message}\n\n` +
      `ขนาดไฟล์: ${formatBytes(
        file.size
      )} — ` +
      `ไฟล์ใหญ่ขนาดนี้อาจใช้เวลานานและกินแรมมาก ` +
      `ต้องการดำเนินการต่อหรือไม่?`
    );
  }


  // ------------------------------------------------------------
  // ARRAY BUFFER
  // ------------------------------------------------------------

  async function readAsArrayBuffer(
    file
  ) {
    if (!file) {
      throw new Error(
        'ไม่พบไฟล์'
      );
    }


    // File / Blob รุ่นใหม่
    if (
      typeof file.arrayBuffer ===
      'function'
    ) {
      return file.arrayBuffer();
    }


    // Fallback สำหรับ browser เก่า
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(
            reader.result
          );
        };

        reader.onerror = () => {
          reject(
            reader.error ||
            new Error(
              'อ่านไฟล์ไม่สำเร็จ'
            )
          );
        };

        reader.onabort = () => {
          reject(
            new Error(
              'การอ่านไฟล์ถูกยกเลิก'
            )
          );
        };

        reader.readAsArrayBuffer(
          file
        );
      }
    );
  }


  // ------------------------------------------------------------
  // IMAGE LOADER
  // ------------------------------------------------------------

  function loadImage(url) {
    return new Promise(
      (resolve, reject) => {
        const img =
          new Image();

        img.onload = () =>
          resolve(img);

        img.onerror = () =>
          reject(
            new Error(
              'โหลดรูปภาพไม่สำเร็จ'
            )
          );

        img.src = url;
      }
    );
  }


  // ------------------------------------------------------------
  // CACHE / CLEANUP REGISTRY
  // ------------------------------------------------------------

  const resetHandlers =
    new Set();


  function onClearCache(fn) {
    if (
      typeof fn !==
      'function'
    ) {
      return () => {};
    }

    resetHandlers.add(fn);

    // คืนตัวปลดทะเบียน เผื่อ module
    // ต้องการ unregister ในอนาคต
    return () => {
      resetHandlers.delete(fn);
    };
  }


  function clearCache() {
    let count = 0;

    const handlers =
      Array.from(
        resetHandlers
      );

    handlers.forEach(fn => {
      try {
        fn();
        count++;
      } catch (err) {
        console.warn(
          'clearCache handler failed',
          err
        );
      }
    });

    return count;
  }


  // ------------------------------------------------------------
  // OBJECT URL MANAGEMENT
  // ------------------------------------------------------------

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


    if (holder[key]) {
      try {
        URL.revokeObjectURL(
          holder[key]
        );
      } catch (_) {}
    }


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


  // ------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------

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
