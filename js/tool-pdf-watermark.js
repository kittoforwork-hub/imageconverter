(() => {
  'use strict';

  const U = window.Utils;
  const PW = window.PdfWorkerClient;

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

  let currentFile = null;
  let watermarkImageFile = null;

  const result = {};

  // ----------------------------------------------------------
  // Opacity UI
  // ----------------------------------------------------------

  opacityEl.addEventListener(
    'input',
    () => {
      opacityVal.textContent =
        Math.round(
          parseFloat(
            opacityEl.value
          ) * 100
        ) + '%';
    }
  );

  // ----------------------------------------------------------
  // PNG watermark selector
  // ----------------------------------------------------------

  if (imageInput) {
    imageInput.addEventListener(
      'change',
      () => {
        const file =
          imageInput.files &&
          imageInput.files[0];

        if (!file) {
          watermarkImageFile = null;

          if (imageNameEl) {
            imageNameEl.textContent =
              'ยังไม่ได้เลือกรูป';
          }

          return;
        }

        if (
          file.type !==
          'image/png'
        ) {
          imageInput.value = '';

          watermarkImageFile = null;

          if (imageNameEl) {
            imageNameEl.textContent =
              'ต้องเป็นไฟล์ PNG เท่านั้น';
          }

          return;
        }

        watermarkImageFile = file;

        if (imageNameEl) {
          imageNameEl.textContent =
            file.name;
        }

        statusEl.textContent =
          'เลือกรูปลายน้ำแล้ว';
        statusEl.classList.remove(
          'is-ready',
          'is-error'
        );
      }
    );
  }

  // ----------------------------------------------------------
  // Load PDF
  // ----------------------------------------------------------

  function loadFile(file) {
    if (!PW.supported) {
      alert(
        'เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์'
      );

      return;
    }

    if (
      !U.confirmLargeFile(
        file,
        50,
        'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) การใส่ลายน้ำอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก'
      )
    ) {
      return;
    }

    currentFile = file;

    nameEl.textContent =
      file.name;

    formCard.classList.remove(
      'hidden'
    );

    downloadBtn.classList.add(
      'hidden'
    );

    statusEl.textContent =
      'พร้อมใส่ลายน้ำ';

    statusEl.classList.remove(
      'is-ready',
      'is-error'
    );
  }

  // ----------------------------------------------------------
  // Apply watermark
  // ----------------------------------------------------------

  applyBtn.addEventListener(
    'click',
    async () => {
      if (!currentFile) {
        return;
      }

      const text =
        textEl.value.trim();

      const hasText =
        !!text;

      const hasImage =
        !!watermarkImageFile;

      if (
        !hasText &&
        !hasImage
      ) {
        statusEl.textContent =
          'กรุณาใส่ข้อความหรือเลือกรูปลายน้ำ PNG';

        statusEl.classList.remove(
          'is-ready'
        );

        statusEl.classList.add(
          'is-error'
        );

        return;
      }

      applyBtn.disabled = true;

      applyBtn.textContent =
        'กำลังใส่ลายน้ำ…';

      statusEl.classList.remove(
        'is-ready',
        'is-error'
      );

      try {
        const bytes =
          await U.readAsArrayBuffer(
            currentFile
          );

        let watermarkImage =
          null;

        if (hasImage) {
          watermarkImage =
            await U.readAsArrayBuffer(
              watermarkImageFile
            );
        }

        const size =
          parseFloat(
            sizeEl.value
          ) || 48;

        const imageSize =
          parseFloat(
            imageSizeEl &&
            imageSizeEl.value
          ) || 180;

        const opacity =
          parseFloat(
            opacityEl.value
          );

        const angle =
          parseFloat(
            angleEl.value
          ) || 0;

        const {
          bytes: outBytes
        } =
          await PW.applyWatermark(
            bytes,
            {
              text,
              size,
              opacity,
              angle,
              watermarkImage,
              imageSize
            }
          );

        const blob =
          new Blob(
            [outBytes],
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

        downloadBtn.href =
          url;

        downloadBtn.download =
          `${U.baseName(
            currentFile.name
          )}-watermark.pdf`;

        downloadBtn.classList.remove(
          'hidden'
        );

        statusEl.textContent =
          `พร้อมดาวน์โหลด · ${U.formatBytes(
            blob.size
          )}`;

        statusEl.classList.add(
          'is-ready'
        );

      } catch (err) {
        statusEl.textContent =
          'ใส่ลายน้ำไม่สำเร็จ: ' +
          (
            err &&
            err.message
              ? err.message
              : String(err)
          );

        statusEl.classList.add(
          'is-error'
        );

      } finally {
        applyBtn.disabled = false;

        applyBtn.textContent =
          'ใส่ลายน้ำ';
      }
    }
  );

  // ----------------------------------------------------------
  // PDF dropzone
  // ----------------------------------------------------------

  U.setupDropzone(
    dropzone,
    fileInput,
    (files) => {
      const file =
        Array.from(files).find(
          f =>
            f.type ===
            'application/pdf'
        );

      if (file) {
        loadFile(file);
      }
    }
  );

  // ----------------------------------------------------------
  // Clear
  // ----------------------------------------------------------

  U.onClearCache(() => {
    if (result.url) {
      URL.revokeObjectURL(
        result.url
      );

      result.url = null;
    }

    currentFile = null;
    watermarkImageFile = null;

    if (imageInput) {
      imageInput.value = '';
    }

    if (imageNameEl) {
      imageNameEl.textContent =
        'ยังไม่ได้เลือกรูป';
    }

    formCard.classList.add(
      'hidden'
    );

    downloadBtn.classList.add(
      'hidden'
    );
  });
})();
