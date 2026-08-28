(() => {
  'use strict';

  const U = window.Utils;
  const PW = window.PdfWorkerClient;

  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone =
    document.getElementById('dz-pdf-watermark');

  const fileInput =
    document.getElementById('input-pdf-watermark');

  const formCard =
    document.getElementById('form-pdf-watermark');


  // ถ้า HTML ยังไม่มีส่วนนี้ ให้หยุดอย่างปลอดภัย
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


  const nameEl =
    formCard.querySelector('.js-pdfname');

  const textEl =
    document.getElementById('text-pdf-watermark');

  const imageInput =
    document.getElementById('image-pdf-watermark');

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
    formCard.querySelector('.js-status');


  // ============================================================
  // STATE
  // ============================================================

  let currentFile = null;
  let watermarkImageFile = null;
  let isProcessing = false;

  /*
   * เก็บ Object URL ของ PDF ผลลัพธ์
   * เพื่อ revoke ของเก่าก่อนสร้างใหม่
   */
  const result = {};


  // ============================================================
  // HELPERS
  // ============================================================

  function setStatus(text, state) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = text;

    statusEl.classList.remove(
      'is-ready',
      'is-error'
    );

    if (state) {
      statusEl.classList.add(state);
    }
  }


  function resetResult() {
    if (result.url) {
      try {
        URL.revokeObjectURL(result.url);
      } catch (_) {}

      result.url = null;
    }

    if (downloadBtn) {
      downloadBtn.classList.add('hidden');
      downloadBtn.removeAttribute('href');
    }
  }


  function setProcessing(on) {
    isProcessing = !!on;

    if (applyBtn) {
      applyBtn.disabled = isProcessing;

      applyBtn.textContent = isProcessing
        ? 'กำลังใส่ลายน้ำ…'
        : 'ใส่ลายน้ำ';
    }

    /*
     * app.js สามารถใช้ state นี้ได้
     * โดยไม่ต้องเดาจากข้อความใน card
     */
    formCard.dataset.processing =
      isProcessing
        ? 'true'
        : 'false';
  }


  // ============================================================
  // OPACITY
  // ============================================================

  if (opacityEl) {
    const updateOpacityLabel = () => {
      let value = Number(
        opacityEl.value
      );

      if (!Number.isFinite(value)) {
        value = 0.25;
      }

      value = Math.max(
        0,
        Math.min(1, value)
      );

      if (opacityVal) {
        opacityVal.textContent =
          Math.round(value * 100) + '%';
      }
    };


    opacityEl.addEventListener(
      'input',
      updateOpacityLabel
    );

    updateOpacityLabel();
  }


  // ============================================================
  // IMAGE SIZE
  // ============================================================

  if (
    imageSizeEl &&
    imageSizeVal
  ) {
    const updateImageSizeLabel = () => {
      let value = Number(
        imageSizeEl.value
      );

      if (!Number.isFinite(value)) {
        value = 180;
      }

      imageSizeVal.textContent =
        String(Math.round(value));
    };


    imageSizeEl.addEventListener(
      'input',
      updateImageSizeLabel
    );

    updateImageSizeLabel();
  }


  // ============================================================
  // PNG WATERMARK SELECTOR
  // ============================================================

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

          resetResult();

          setStatus(
            currentFile
              ? 'พร้อมใส่ลายน้ำ'
              : 'ยังไม่ได้เลือก PDF',
            null
          );

          return;
        }


        // ------------------------------------------------------
        // ตรวจ MIME
        // ------------------------------------------------------

        if (
          file.type !== 'image/png'
        ) {
          imageInput.value = '';
          watermarkImageFile = null;

          if (imageNameEl) {
            imageNameEl.textContent =
              'ต้องเป็นไฟล์ PNG เท่านั้น';
          }

          setStatus(
            'กรุณาเลือกไฟล์ PNG เท่านั้น',
            'is-error'
          );

          return;
        }


        // ------------------------------------------------------
        // Basic size guard
        // ------------------------------------------------------

        if (file.size <= 0) {
          imageInput.value = '';
          watermarkImageFile = null;

          if (imageNameEl) {
            imageNameEl.textContent =
              'ไฟล์ PNG ว่างเปล่า';
          }

          setStatus(
            'ไฟล์ PNG ไม่ถูกต้อง',
            'is-error'
          );

          return;
        }


        watermarkImageFile =
          file;


        if (imageNameEl) {
          imageNameEl.textContent =
            `${file.name} · ${U.formatBytes(
              file.size
            )}`;
        }


        resetResult();

        setStatus(
          'เลือกรูปลายน้ำแล้ว',
          null
        );
      }
    );
  }


  // ============================================================
  // LOAD PDF
  // ============================================================

  function loadFile(file) {
    if (!file) {
      return;
    }


    if (!PW.supported) {
      alert(
        'เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์'
      );

      return;
    }


    // ----------------------------------------------------------
    // Validate PDF
    // ----------------------------------------------------------

    const isPdf =
      file.type === 'application/pdf' ||
      /\.pdf$/i.test(file.name);


    if (!isPdf) {
      setStatus(
        'กรุณาเลือกไฟล์ PDF เท่านั้น',
        'is-error'
      );

      return;
    }


    // ----------------------------------------------------------
    // Large file warning
    // ----------------------------------------------------------

    if (
      !U.confirmLargeFile(
        file,
        50,
        'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) การใส่ลายน้ำอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก'
      )
    ) {
      return;
    }


    // ----------------------------------------------------------
    // Set current file
    // ----------------------------------------------------------

    currentFile =
      file;


    nameEl.textContent =
      `${file.name} · ${U.formatBytes(
        file.size
      )}`;


    formCard.classList.remove(
      'hidden'
    );


    resetResult();


    setStatus(
      'พร้อมใส่ลายน้ำ',
      null
    );


    formCard.dataset.processing =
      'false';
  }


  // ============================================================
  // APPLY WATERMARK
  // ============================================================

  applyBtn.addEventListener(
    'click',
    async () => {

      if (
        isProcessing ||
        !currentFile
      ) {
        return;
      }


      // --------------------------------------------------------
      // Read text
      // --------------------------------------------------------

      const text =
        (
          textEl &&
          textEl.value
            ? textEl.value
            : ''
        ).trim();


      const hasText =
        text.length > 0;


      const hasImage =
        !!watermarkImageFile;


      // --------------------------------------------------------
      // Require at least one watermark
      // --------------------------------------------------------

      if (
        !hasText &&
        !hasImage
      ) {
        setStatus(
          'กรุณาใส่ข้อความหรือเลือกรูปลายน้ำ PNG',
          'is-error'
        );

        return;
      }


      // --------------------------------------------------------
      // Normalize settings
      // --------------------------------------------------------

      let size =
        Number(
          sizeEl &&
          sizeEl.value
        );


      if (!Number.isFinite(size)) {
        size = 48;
      }


      size =
        Math.max(
          8,
          Math.min(
            200,
            size
          )
        );


      let imageSize =
        Number(
          imageSizeEl &&
          imageSizeEl.value
        );


      if (!Number.isFinite(imageSize)) {
        imageSize = 180;
      }


      imageSize =
        Math.max(
          40,
          Math.min(
            1200,
            imageSize
          )
        );


      let opacity =
        Number(
          opacityEl &&
          opacityEl.value
        );


      if (!Number.isFinite(opacity)) {
        opacity = 0.25;
      }


      opacity =
        Math.max(
          0.05,
          Math.min(
            1,
            opacity
          )
        );


      let angle =
        Number(
          angleEl &&
          angleEl.value
        );


      if (!Number.isFinite(angle)) {
        angle = 45;
      }


      angle =
        Math.max(
          -360,
          Math.min(
            360,
            angle
          )
        );


      // --------------------------------------------------------
      // Start
      // --------------------------------------------------------

      setProcessing(true);

      resetResult();


      if (
        hasText &&
        hasImage
      ) {
        setStatus(
          'กำลังใส่ข้อความ + PNG…',
          null
        );

      } else if (hasImage) {
        setStatus(
          'กำลังใส่ PNG…',
          null
        );

      } else {
        setStatus(
          'กำลังใส่ข้อความ…',
          null
        );
      }


      try {

        // ======================================================
        // READ PDF
        // ======================================================

        const pdfBytes =
          await U.readAsArrayBuffer(
            currentFile
          );


        // ======================================================
        // READ PNG
        // ======================================================

        let watermarkImage =
          null;


        if (hasImage) {
          watermarkImage =
            await U.readAsArrayBuffer(
              watermarkImageFile
            );
        }


        // ======================================================
        // SEND TO WORKER
        // ======================================================

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


        // ======================================================
        // VALIDATE RESULT
        // ======================================================

        if (
          !response ||
          !response.bytes
        ) {
          throw new Error(
            'Worker ไม่ได้ส่งไฟล์ PDF กลับมา'
          );
        }


        // ======================================================
        // CREATE RESULT BLOB
        // ======================================================

        const blob =
          new Blob(
            [response.bytes],
            {
              type:
                'application/pdf'
            }
          );


        if (blob.size <= 0) {
          throw new Error(
            'ไฟล์ PDF ผลลัพธ์ว่างเปล่า'
          );
        }


        // ======================================================
        // CREATE DOWNLOAD URL
        // ======================================================

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


        // ======================================================
        // DONE
        // ======================================================

        setStatus(
          `พร้อมดาวน์โหลด · ${U.formatBytes(
            blob.size
          )}`,
          'is-ready'
        );


      } catch (err) {

        console.error(
          'PDF watermark failed:',
          err
        );


        const message =
          (
            err &&
            err.message
          ) ||
          String(err);


        setStatus(
          'ใส่ลายน้ำไม่สำเร็จ: ' +
            message,
          'is-error'
        );


      } finally {

        setProcessing(false);

      }
    }
  );


  // ============================================================
  // PDF DROPZONE
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


      if (file) {
        loadFile(file);
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

      setProcessing(false);


      resetResult();


      // --------------------------------------------------------
      // Reset PNG input
      // --------------------------------------------------------

      if (imageInput) {
        imageInput.value = '';
      }


      if (imageNameEl) {
        imageNameEl.textContent =
          'ยังไม่ได้เลือกรูป';
      }


      // --------------------------------------------------------
      // Hide form
      // --------------------------------------------------------

      formCard.classList.add(
        'hidden'
      );


      // --------------------------------------------------------
      // Reset status
      // --------------------------------------------------------

      setStatus(
        'พร้อมใส่ลายน้ำ',
        null
      );

    }
  );

})();
