/* ============================================================
   FILE CONVERTER
   /js/file-converter.js

   Client-side file conversion controller

   IMAGE
   - JPG  -> PNG
   - PNG  -> JPG
   - JPG  -> WebP
   - PNG  -> WebP
   - WebP -> JPG
   - WebP -> PNG
   - SVG  -> PNG
   - BMP  -> PNG
   - GIF  -> PNG
   - Image -> ICO

   PDF
   - JPG / PNG / Image -> PDF
   - PDF -> JPG
   - PDF -> PNG
   - PDF -> TXT
   - PDF -> Images ZIP

   DATA
   - CSV  -> JSON
   - JSON -> CSV
   - JSON -> XML
   - XML  -> JSON
   - YAML -> JSON
   - JSON -> YAML

   TEXT
   - TXT      -> HTML
   - HTML     -> TXT
   - TXT      -> PDF
   - HTML     -> PDF
   - Markdown -> HTML

   SPREADSHEET
   - CSV  -> XLSX
   - XLSX -> CSV
   - JSON -> XLSX
   - XLSX -> PDF

   DOCUMENT
   - DOCX -> PDF
   - PPTX -> PDF

   Everything is processed locally in the browser.
   ============================================================ */

(() => {

  "use strict";


  /* ============================================================
     DOM
     ============================================================ */

  const searchInput =
    document.getElementById(
      "converter-search"
    );


  const clearSearchButton =
    document.getElementById(
      "clear-search"
    );


  const searchResultInfo =
    document.getElementById(
      "search-result-info"
    );


  const filterButtons =
    Array.from(
      document.querySelectorAll(
        ".filter-button"
      )
    );


  const converterCards =
    Array.from(
      document.querySelectorAll(
        ".converter-card"
      )
    );


  const categorySections =
    Array.from(
      document.querySelectorAll(
        ".converter-category"
      )
    );


  const emptyState =
    document.getElementById(
      "empty-state"
    );


  const resetSearchButton =
    document.getElementById(
      "reset-search"
    );


  /* ------------------------------------------------------------
     MODAL
     ------------------------------------------------------------ */

  const modal =
    document.getElementById(
      "converter-modal"
    );


  const modalTitle =
    document.getElementById(
      "modal-title"
    );


  const modalDescription =
    document.getElementById(
      "modal-description"
    );


  const modalCategory =
    document.getElementById(
      "modal-category"
    );


  const modalClose =
    document.getElementById(
      "modal-close"
    );


  const modalCancel =
    document.getElementById(
      "modal-cancel"
    );


  /* ------------------------------------------------------------
     DROP ZONE
     ------------------------------------------------------------ */

  const dropZone =
    document.getElementById(
      "drop-zone"
    );


  const browseFilesButton =
    document.getElementById(
      "browse-files"
    );


  const fileInput =
    document.getElementById(
      "file-input"
    );


  const supportedFormats =
    document.getElementById(
      "supported-formats"
    );


  /* ------------------------------------------------------------
     FILE LIST
     ------------------------------------------------------------ */

  const fileListSection =
    document.getElementById(
      "file-list-section"
    );


  const fileList =
    document.getElementById(
      "file-list"
    );


  const fileCount =
    document.getElementById(
      "file-count"
    );


  const clearFilesButton =
    document.getElementById(
      "clear-files"
    );


  /* ------------------------------------------------------------
     PROGRESS
     ------------------------------------------------------------ */

  const progressSection =
    document.getElementById(
      "progress-section"
    );


  const progressBar =
    document.getElementById(
      "progress-bar"
    );


  const progressPercent =
    document.getElementById(
      "progress-percent"
    );


  const progressStatus =
    document.getElementById(
      "progress-status"
    );


  /* ------------------------------------------------------------
     RESULT
     ------------------------------------------------------------ */

  const resultSection =
    document.getElementById(
      "result-section"
    );


  const resultSummary =
    document.getElementById(
      "result-summary"
    );


  const resultList =
    document.getElementById(
      "result-list"
    );


  /* ------------------------------------------------------------
     ERROR
     ------------------------------------------------------------ */

  const errorMessage =
    document.getElementById(
      "error-message"
    );


  const errorText =
    document.getElementById(
      "error-text"
    );


  /* ------------------------------------------------------------
     CONVERT BUTTON
     ------------------------------------------------------------ */

  const convertButton =
    document.getElementById(
      "convert-button"
    );


  /* ============================================================
     SAFETY CHECK
     ============================================================ */

  const requiredElements = [
    searchInput,
    clearSearchButton,
    searchResultInfo,
    emptyState,
    modal,
    modalTitle,
    modalDescription,
    modalCategory,
    modalClose,
    modalCancel,
    dropZone,
    browseFilesButton,
    fileInput,
    supportedFormats,
    fileListSection,
    fileList,
    fileCount,
    clearFilesButton,
    progressSection,
    progressBar,
    progressPercent,
    progressStatus,
    resultSection,
    resultSummary,
    resultList,
    errorMessage,
    errorText,
    convertButton
  ];


  if (
    requiredElements.some(
      element => !element
    )
  ) {

    console.error(
      "[File Converter] Missing required DOM element."
    );

    return;
  }


  /* ============================================================
     STATE
     ============================================================ */

  let activeConverterId =
    null;


  let activeConverter =
    null;


  let selectedFiles =
    [];


  let convertedResults =
    [];


  let activeFilter =
    "all";


  let isConverting =
    false;


  let previousBodyOverflow =
    "";


  let previousActiveElement =
    null;


  /* ============================================================
     CONFIG
     ============================================================ */

  const MAX_FILES =
    50;


  const MAX_FILE_SIZE =
    100 * 1024 * 1024;


  const JPEG_QUALITY =
    0.92;


  const WEBP_QUALITY =
    0.90;


  const CDN = {

    pdfJs:
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",

    pdfWorker:
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",

    pdfLib:
      "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",

    jsZip:
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",

    xlsx:
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",

    mammoth:
      "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"
  };


  /* ============================================================
     LIBRARY PROMISE CACHE
     ============================================================ */

  let pdfJsPromise =
    null;


  let pdfLibPromise =
    null;


  let jsZipPromise =
    null;


  let xlsxPromise =
    null;


  let mammothPromise =
    null;


  /* ============================================================
     BASIC HELPERS
     ============================================================ */

  function safeString(
    value
  ) {

    return String(
      value ?? ""
    ).trim();

  }


  function normalize(
    value
  ) {

    return safeString(
      value
    ).toLowerCase();

  }


  function escapeHtml(
    value
  ) {

    return safeString(
      value
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  function getExtension(
    fileName
  ) {

    const name =
      safeString(
        fileName
      );


    const index =
      name.lastIndexOf(
        "."
      );


    if (
      index === -1
    ) {

      return "";
    }


    return name
      .slice(
        index + 1
      )
      .toLowerCase();

  }


  function removeExtension(
    fileName
  ) {

    const name =
      safeString(
        fileName
      );


    const index =
      name.lastIndexOf(
        "."
      );


    if (
      index <= 0
    ) {

      return name;
    }


    return name.slice(
      0,
      index
    );

  }


  function formatBytes(
    bytes
  ) {

    const value =
      Number(
        bytes
      ) || 0;


    if (
      value < 1024
    ) {

      return `${value} B`;
    }


    if (
      value < 1024 * 1024
    ) {

      return `${(
        value / 1024
      ).toFixed(1)} KB`;
    }


    if (
      value <
      1024 * 1024 * 1024
    ) {

      return `${(
        value /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }


    return `${(
      value /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;

  }


  function wait(
    ms
  ) {

    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          ms
        )
    );

  }


  function nextFrame() {

    return new Promise(
      resolve =>
        requestAnimationFrame(
          resolve
        )
    );

  }


  function getErrorMessage(
    error
  ) {

    if (
      error instanceof Error
    ) {

      return (
        error.message ||
        "ไม่สามารถแปลงไฟล์ได้"
      );
    }


    return (
      safeString(
        error
      ) ||
      "ไม่สามารถแปลงไฟล์ได้"
    );

  }


  /* ============================================================
     DYNAMIC SCRIPT LOADER
     ============================================================ */

  function loadScript(
    src,
    test
  ) {

    if (
      typeof test === "function" &&
      test()
    ) {

      return Promise.resolve();
    }


    const existing =
      Array.from(
        document.scripts
      ).find(
        script =>
          script.dataset &&
          script.dataset.kitScript ===
            src
      );


    if (
      existing
    ) {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          if (
            typeof test === "function" &&
            test()
          ) {

            resolve();
            return;
          }


          existing.addEventListener(
            "load",
            () => resolve(),
            {
              once: true
            }
          );


          existing.addEventListener(
            "error",
            () =>
              reject(
                new Error(
                  `โหลด library ไม่สำเร็จ: ${src}`
                )
              ),
            {
              once: true
            }
          );

        }
      );
    }


    return new Promise(
      (
        resolve,
        reject
      ) => {

        const script =
          document.createElement(
            "script"
          );


        script.src =
          src;


        script.async =
          true;


        script.dataset.kitScript =
          src;


        script.onload =
          () =>
            resolve();


        script.onerror =
          () =>
            reject(
              new Error(
                `โหลด library ไม่สำเร็จ: ${src}`
              )
            );


        document.head.appendChild(
          script
        );

      }
    );

  }


  /* ============================================================
     ENSURE PDF.JS
     ============================================================ */

  function ensurePdfJs() {

    if (
      window.pdfjsLib
    ) {

      try {

        window.pdfjsLib
          .GlobalWorkerOptions
          .workerSrc =
          CDN.pdfWorker;

      } catch {
        /* ignore */
      }


      return Promise.resolve(
        window.pdfjsLib
      );
    }


    if (
      pdfJsPromise
    ) {

      return pdfJsPromise;
    }


    pdfJsPromise =
      loadScript(
        CDN.pdfJs,
        () =>
          Boolean(
            window.pdfjsLib
          )
      )
      .then(
        () => {

          if (
            !window.pdfjsLib
          ) {

            throw new Error(
              "ไม่พบ PDF.js"
            );
          }


          window.pdfjsLib
            .GlobalWorkerOptions
            .workerSrc =
            CDN.pdfWorker;


          return window.pdfjsLib;

        }
      );


    return pdfJsPromise;

  }


  /* ============================================================
     ENSURE PDF-LIB
     ============================================================ */

  function ensurePdfLib() {

    if (
      window.PDFLib
    ) {

      return Promise.resolve(
        window.PDFLib
      );
    }


    if (
      pdfLibPromise
    ) {

      return pdfLibPromise;
    }


    pdfLibPromise =
      loadScript(
        CDN.pdfLib,
        () =>
          Boolean(
            window.PDFLib
          )
      )
      .then(
        () => {

          if (
            !window.PDFLib
          ) {

            throw new Error(
              "ไม่พบ pdf-lib"
            );
          }


          return window.PDFLib;

        }
      );


    return pdfLibPromise;

  }


  /* ============================================================
     ENSURE JSZIP
     ============================================================ */

  function ensureJsZip() {

    if (
      window.JSZip
    ) {

      return Promise.resolve(
        window.JSZip
      );
    }


    if (
      jsZipPromise
    ) {

      return jsZipPromise;
    }


    jsZipPromise =
      loadScript(
        CDN.jsZip,
        () =>
          Boolean(
            window.JSZip
          )
      )
      .then(
        () => {

          if (
            !window.JSZip
          ) {

            throw new Error(
              "ไม่พบ JSZip"
            );
          }


          return window.JSZip;

        }
      );


    return jsZipPromise;

  }


  /* ============================================================
     ENSURE XLSX
     ============================================================ */

  function ensureXlsx() {

    if (
      window.XLSX
    ) {

      return Promise.resolve(
        window.XLSX
      );
    }


    if (
      xlsxPromise
    ) {

      return xlsxPromise;
    }


    xlsxPromise =
      loadScript(
        CDN.xlsx,
        () =>
          Boolean(
            window.XLSX
          )
      )
      .then(
        () => {

          if (
            !window.XLSX
          ) {

            throw new Error(
              "ไม่พบ SheetJS XLSX"
            );
          }


          return window.XLSX;

        }
      );


    return xlsxPromise;

  }


  /* ============================================================
     ENSURE MAMMOTH
     ============================================================ */

  function ensureMammoth() {

    if (
      window.mammoth
    ) {

      return Promise.resolve(
        window.mammoth
      );
    }


    if (
      mammothPromise
    ) {

      return mammothPromise;
    }


    mammothPromise =
      loadScript(
        CDN.mammoth,
        () =>
          Boolean(
            window.mammoth
          )
      )
      .then(
        () => {

          if (
            !window.mammoth
          ) {

            throw new Error(
              "ไม่พบ Mammoth"
            );
          }


          return window.mammoth;

        }
      );


    return mammothPromise;

  }


  /* ============================================================
     RESULT
     ============================================================ */

  function createResult(
    originalFile,
    blob,
    extension
  ) {

    if (
      !(blob instanceof Blob)
    ) {

      throw new Error(
        "Converter ไม่ได้คืน Blob"
      );
    }


    const cleanExtension =
      safeString(
        extension
      )
      .replace(
        /^\./,
        ""
      );


    const baseName =
      removeExtension(
        originalFile.name
      );


    const outputName =
      `${baseName}.${cleanExtension}`;


    const url =
      URL.createObjectURL(
        blob
      );


    return {

      name:
        outputName,

      blob,

      url,

      extension:
        cleanExtension
    };

  }


  /* ============================================================
     IMAGE
     ============================================================ */

  function loadImage(
    blob
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const url =
          URL.createObjectURL(
            blob
          );


        const image =
          new Image();


        image.onload =
          () => {

            URL.revokeObjectURL(
              url
            );


            resolve(
              image
            );

          };


        image.onerror =
          () => {

            URL.revokeObjectURL(
              url
            );


            reject(
              new Error(
                "ไม่สามารถเปิดรูปภาพได้"
              )
            );

          };


        image.src =
          url;

      }
    );

  }


  function canvasToBlob(
    canvas,
    type,
    quality
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        canvas.toBlob(
          blob => {

            if (
              !blob
            ) {

              reject(
                new Error(
                  "ไม่สามารถสร้างรูปผลลัพธ์ได้"
                )
              );

              return;
            }


            resolve(
              blob
            );

          },
          type,
          quality
        );

      }
    );

  }


  async function convertImage(
    file,
    converter
  ) {

    const image =
      await loadImage(
        file
      );


    const width =
      image.naturalWidth ||
      image.width;


    const height =
      image.naturalHeight ||
      image.height;


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      width;


    canvas.height =
      height;


    const ctx =
      canvas.getContext(
        "2d"
      );


    if (
      !ctx
    ) {

      throw new Error(
        "Canvas ไม่พร้อมใช้งาน"
      );
    }


    if (
      converter.outputMime ===
      "image/jpeg"
    ) {

      ctx.fillStyle =
        "#ffffff";


      ctx.fillRect(
        0,
        0,
        width,
        height
      );

    }


    ctx.drawImage(
      image,
      0,
      0
    );


    const quality =
      converter.outputMime ===
      "image/jpeg"
        ? JPEG_QUALITY
        : converter.outputMime ===
          "image/webp"
          ? WEBP_QUALITY
          : undefined;


    const blob =
      await canvasToBlob(
        canvas,
        converter.outputMime,
        quality
      );


    return createResult(
      file,
      blob,
      converter.outputExtension
    );

  }


  /* ============================================================
     SVG -> PNG
     ============================================================ */

  async function convertSvgToPng(
    file,
    converter
  ) {

    const source =
      await file.text();


    if (
      !source.trim()
    ) {

      throw new Error(
        "SVG ว่างเปล่า"
      );
    }


    const image =
      await loadImage(
        new Blob(
          [source],
          {
            type:
              "image/svg+xml"
          }
        )
      );


    const width =
      image.naturalWidth ||
      image.width ||
      1024;


    const height =
      image.naturalHeight ||
      image.height ||
      1024;


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      Math.ceil(
        width
      );


    canvas.height =
      Math.ceil(
        height
      );


    const ctx =
      canvas.getContext(
        "2d"
      );


    if (
      !ctx
    ) {

      throw new Error(
        "Canvas ไม่พร้อมใช้งาน"
      );
    }


    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );


    const blob =
      await canvasToBlob(
        canvas,
        "image/png"
      );


    return createResult(
      file,
      blob,
      converter.outputExtension
    );

  }


  /* ============================================================
     IMAGE -> ICO
     ============================================================ */

  async function convertImageToIco(
    file,
    converter
  ) {

    const image =
      await loadImage(
        file
      );


    const size =
      256;


    const sourceWidth =
      image.naturalWidth ||
      image.width;


    const sourceHeight =
      image.naturalHeight ||
      image.height;


    const scale =
      Math.min(
        size / sourceWidth,
        size / sourceHeight
      );


    const drawWidth =
      Math.max(
        1,
        Math.round(
          sourceWidth * scale
        )
      );


    const drawHeight =
      Math.max(
        1,
        Math.round(
          sourceHeight * scale
        )
      );


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      size;


    canvas.height =
      size;


    const ctx =
      canvas.getContext(
        "2d"
      );


    if (
      !ctx
    ) {

      throw new Error(
        "Canvas ไม่พร้อมใช้งาน"
      );
    }


    ctx.clearRect(
      0,
      0,
      size,
      size
    );


    ctx.drawImage(
      image,
      Math.round(
        (size - drawWidth) / 2
      ),
      Math.round(
        (size - drawHeight) / 2
      ),
      drawWidth,
      drawHeight
    );


    const pngBlob =
      await canvasToBlob(
        canvas,
        "image/png"
      );


    const pngBytes =
      new Uint8Array(
        await pngBlob.arrayBuffer()
      );


    const offset =
      6 + 16;


    const buffer =
      new ArrayBuffer(
        offset +
        pngBytes.length
      );


    const view =
      new DataView(
        buffer
      );


    /* ICONDIR */

    view.setUint16(
      0,
      0,
      true
    );


    view.setUint16(
      2,
      1,
      true
    );


    view.setUint16(
      4,
      1,
      true
    );


    /* ICONDIRENTRY */

    view.setUint8(
      6,
      0
    );


    view.setUint8(
      7,
      0
    );


    view.setUint8(
      8,
      0
    );


    view.setUint8(
      9,
      0
    );


    view.setUint16(
      10,
      1,
      true
    );


    view.setUint16(
      12,
      32,
      true
    );


    view.setUint32(
      14,
      pngBytes.length,
      true
    );


    view.setUint32(
      18,
      offset,
      true
    );


    new Uint8Array(
      buffer
    ).set(
      pngBytes,
      offset
    );


    const blob =
      new Blob(
        [buffer],
        {
          type:
            converter.outputMime
        }
      );


    return createResult(
      file,
      blob,
      converter.outputExtension
    );

  }


  /* ============================================================
     IMAGE -> PDF
     ============================================================ */

  async function convertImageToPdf(
    file,
    converter
  ) {

    const PDFLib =
      await ensurePdfLib();


    const pdfDoc =
      await PDFLib.PDFDocument.create();


    const extension =
      getExtension(
        file.name
      );


    let image;


    if (
      extension === "png"
    ) {

      image =
        await pdfDoc.embedPng(
          await file.arrayBuffer()
        );

    } else {

      const source =
        await loadImage(
          file
        );


      const width =
        source.naturalWidth ||
        source.width;


      const height =
        source.naturalHeight ||
        source.height;


      const canvas =
        document.createElement(
          "canvas"
        );


      canvas.width =
        width;


      canvas.height =
        height;


      const ctx =
        canvas.getContext(
          "2d"
        );


      if (
        !ctx
      ) {

        throw new Error(
          "Canvas ไม่พร้อมใช้งาน"
        );
      }


      ctx.fillStyle =
        "#ffffff";


      ctx.fillRect(
        0,
        0,
        width,
        height
      );


      ctx.drawImage(
        source,
        0,
        0
      );


      const jpg =
        await canvasToBlob(
          canvas,
          "image/jpeg",
          0.94
        );


      image =
        await pdfDoc.embedJpg(
          await jpg.arrayBuffer()
        );

    }


    const pageWidth =
      595.28;


    const pageHeight =
      841.89;


    const margin =
      28.35;


    const imgWidth =
      image.width;


    const imgHeight =
      image.height;


    const scale =
      Math.min(
        (
          pageWidth -
          margin * 2
        ) / imgWidth,
        (
          pageHeight -
          margin * 2
        ) / imgHeight
      );


    const drawWidth =
      imgWidth *
      scale;


    const drawHeight =
      imgHeight *
      scale;


    const x =
      (
        pageWidth -
        drawWidth
      ) / 2;


    const y =
      (
        pageHeight -
        drawHeight
      ) / 2;


    const page =
      pdfDoc.addPage(
        [
          pageWidth,
          pageHeight
        ]
      );


    page.drawImage(
      image,
      {
        x,
        y,
        width:
          drawWidth,
        height:
          drawHeight
      }
    );


    const bytes =
      await pdfDoc.save();


    return createResult(
      file,
      new Blob(
        [bytes],
        {
          type:
            "application/pdf"
        }
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     PDF RENDER
     ============================================================ */

  async function renderPdfPages(
    file,
    scale = 1.5
  ) {

    const pdfjsLib =
      await ensurePdfJs();


    const buffer =
      await file.arrayBuffer();


    const pdf =
      await pdfjsLib
        .getDocument(
          {
            data:
              buffer
          }
        )
        .promise;


    const pages =
      [];


    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {

      const page =
        await pdf.getPage(
          pageNumber
        );


      const viewport =
        page.getViewport(
          {
            scale
          }
        );


      const canvas =
        document.createElement(
          "canvas"
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
          "2d",
          {
            alpha:
              false
          }
        );


      if (
        !ctx
      ) {

        throw new Error(
          "ไม่สามารถสร้าง Canvas สำหรับ PDF ได้"
        );
      }


      ctx.fillStyle =
        "#ffffff";


      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      await page
        .render(
          {
            canvasContext:
              ctx,
            viewport
          }
        )
        .promise;


      pages.push(
        {
          pageNumber,
          canvas
        }
      );

    }


    return pages;

  }


  /* ============================================================
     PDF -> JPG ZIP
     ============================================================ */

  async function convertPdfToJpgZip(
    file,
    converter
  ) {

    const JSZip =
      await ensureJsZip();


    const pages =
      await renderPdfPages(
        file,
        1.5
      );


    const zip =
      new JSZip();


    for (
      const page of pages
    ) {

      const blob =
        await canvasToBlob(
          page.canvas,
          "image/jpeg",
          0.92
        );


      zip.file(
        `${removeExtension(
          file.name
        )}_page-${String(
          page.pageNumber
        ).padStart(
          3,
          "0"
        )}.jpg`,
        blob
      );

    }


    const zipBlob =
      await zip.generateAsync(
        {
          type:
            "blob",
          compression:
            "DEFLATE",
          compressionOptions:
            {
              level:
                6
            }
        }
      );


    return createResult(
      file,
      zipBlob,
      converter.outputExtension
    );

  }


  /* ============================================================
     PDF -> PNG ZIP
     ============================================================ */

  async function convertPdfToPngZip(
    file,
    converter
  ) {

    const JSZip =
      await ensureJsZip();


    const pages =
      await renderPdfPages(
        file,
        1.5
      );


    const zip =
      new JSZip();


    for (
      const page of pages
    ) {

      const blob =
        await canvasToBlob(
          page.canvas,
          "image/png"
        );


      zip.file(
        `${removeExtension(
          file.name
        )}_page-${String(
          page.pageNumber
        ).padStart(
          3,
          "0"
        )}.png`,
        blob
      );

    }


    const zipBlob =
      await zip.generateAsync(
        {
          type:
            "blob",
          compression:
            "DEFLATE",
          compressionOptions:
            {
              level:
                6
            }
        }
      );


    return createResult(
      file,
      zipBlob,
      converter.outputExtension
    );

  }


  /* ============================================================
     PDF -> TEXT
     ============================================================ */

  async function convertPdfToText(
    file,
    converter
  ) {

    const pdfjsLib =
      await ensurePdfJs();


    const pdf =
      await pdfjsLib
        .getDocument(
          {
            data:
              await file.arrayBuffer()
          }
        )
        .promise;


    const pages =
      [];


    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {

      const page =
        await pdf.getPage(
          pageNumber
        );


      const content =
        await page.getTextContent();


      const items =
        Array.isArray(
          content.items
        )
          ? content.items
          : [];


      const lines =
        [];


      let currentLine =
        "";


      let lastY =
        null;


      for (
        const item of items
      ) {

        const text =
          safeString(
            item?.str
          );


        if (
          !text
        ) {

          continue;
        }


        const y =
          Array.isArray(
            item.transform
          )
            ? Number(
                item.transform[5]
              )
            : null;


        if (
          lastY !== null &&
          y !== null &&
          Math.abs(
            y - lastY
          ) > 4
        ) {

          if (
            currentLine
          ) {

            lines.push(
              currentLine
            );


            currentLine =
              "";

          }

        }


        if (
          currentLine
        ) {

          currentLine +=
            " ";
        }


        currentLine +=
          text;


        lastY =
          y;

      }


      if (
        currentLine
      ) {

        lines.push(
          currentLine
        );

      }


      pages.push(
        `===== PAGE ${pageNumber} =====\n${
          lines.join(
            "\n"
          )
        }`
      );

    }


    const output =
      pages.join(
        "\n\n"
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     CSV
     ============================================================ */

  function parseCsv(
    text
  ) {

    const rows =
      [];


    let row =
      [];


    let cell =
      "";


    let inQuotes =
      false;


    for (
      let i = 0;
      i < text.length;
      i++
    ) {

      const char =
        text[i];


      const next =
        text[i + 1];


      if (
        char === '"'
      ) {

        if (
          inQuotes &&
          next === '"'
        ) {

          cell +=
            '"';


          i++;

        } else {

          inQuotes =
            !inQuotes;

        }


        continue;

      }


      if (
        char === "," &&
        !inQuotes
      ) {

        row.push(
          cell
        );


        cell =
          "";


        continue;

      }


      if (
        (
          char === "\n" ||
          char === "\r"
        ) &&
        !inQuotes
      ) {

        if (
          char === "\r" &&
          next === "\n"
        ) {

          i++;

        }


        row.push(
          cell
        );


        rows.push(
          row
        );


        row =
          [];


        cell =
          "";


        continue;

      }


      cell +=
        char;

    }


    if (
      cell.length > 0 ||
      row.length > 0
    ) {

      row.push(
        cell
      );


      rows.push(
        row
      );

    }


    return rows;

  }


  /* ============================================================
     CSV -> JSON
     ============================================================ */

  async function convertCsvToJson(
    file,
    converter
  ) {

    const rows =
      parseCsv(
        await file.text()
      );


    if (
      rows.length === 0
    ) {

      throw new Error(
        "CSV ไม่มีข้อมูล"
      );
    }


    const headers =
      rows[0].map(
        (
          value,
          index
        ) =>
          safeString(
            value
          ) ||
          `column_${index + 1}`
      );


    const data =
      rows
        .slice(1)
        .filter(
          row =>
            row.some(
              value =>
                safeString(
                  value
                ) !== ""
            )
        )
        .map(
          row => {

            const object =
              {};


            headers.forEach(
              (
                header,
                index
              ) => {

                object[
                  header
                ] =
                  row[index] ??
                  "";

              }
            );


            return object;

          }
        );


    const output =
      JSON.stringify(
        data,
        null,
        2
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     JSON -> CSV
     ============================================================ */

  async function convertJsonToCsv(
    file,
    converter
  ) {

    const data =
      parseJson(
        await file.text()
      );


    const rows =
      Array.isArray(
        data
      )
        ? data
        : [data];


    if (
      !rows.length
    ) {

      throw new Error(
        "JSON ไม่มีข้อมูล"
      );
    }


    const headers =
      Array.from(
        new Set(
          rows.flatMap(
            item =>
              (
                item &&
                typeof item === "object"
              )
                ? Object.keys(
                    item
                  )
                : []
          )
        )
      );


    if (
      !headers.length
    ) {

      throw new Error(
        "JSON ไม่มีข้อมูลแบบ Object"
      );
    }


    function escapeCsv(
      value
    ) {

      let text;


      if (
        value === null ||
        value === undefined
      ) {

        text =
          "";

      } else if (
        typeof value === "object"
      ) {

        text =
          JSON.stringify(
            value
          );

      } else {

        text =
          String(
            value
          );

      }


      if (
        /[",\n\r]/.test(
          text
        )
      ) {

        return `"${text.replaceAll(
          '"',
          '""'
        )}"`;

      }


      return text;

    }


    const lines =
      [];


    lines.push(
      headers
        .map(
          escapeCsv
        )
        .join(
          ","
        )
    );


    rows.forEach(
      row => {

        lines.push(
          headers
            .map(
              header =>
                escapeCsv(
                  row &&
                  typeof row === "object"
                    ? row[header]
                    : ""
                )
            )
            .join(
              ","
            )
        );

      }
    );


    const output =
      "\uFEFF" +
      lines.join(
        "\r\n"
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function parseJson(
    text
  ) {

    try {

      return JSON.parse(
        text
      );

    } catch {

      throw new Error(
        "ไฟล์ JSON ไม่ถูกต้อง"
      );

    }

  }


  /* ============================================================
     JSON -> XML
     ============================================================ */

  async function convertJsonToXml(
    file,
    converter
  ) {

    const data =
      parseJson(
        await file.text()
      );


    const xml =
      jsonValueToXml(
        data,
        "root"
      );


    const output =
      `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function escapeXml(
    value
  ) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&apos;"
      );

  }


  function safeXmlName(
    value
  ) {

    let name =
      safeString(
        value
      )
      .replace(
        /[^A-Za-z0-9_.:-]+/g,
        "_"
      );


    if (
      !name
    ) {

      name =
        "item";
    }


    if (
      /^[0-9]/.test(
        name
      )
    ) {

      name =
        `item_${name}`;

    }


    return name;

  }


  function jsonValueToXml(
    value,
    key
  ) {

    const tag =
      safeXmlName(
        key
      );


    if (
      value === null ||
      value === undefined
    ) {

      return `<${tag}></${tag}>`;

    }


    if (
      Array.isArray(
        value
      )
    ) {

      return value
        .map(
          item =>
            jsonValueToXml(
              item,
              "item"
            )
        )
        .join(
          ""
        );

    }


    if (
      typeof value !== "object"
    ) {

      return `<${tag}>${escapeXml(
        value
      )}</${tag}>`;

    }


    const children =
      Object.entries(
        value
      )
      .map(
        (
          [
            childKey,
            childValue
          ]
        ) =>
          jsonValueToXml(
            childValue,
            childKey
          )
      )
      .join(
        "\n"
      );


    return [
      `<${tag}>`,
      children,
      `</${tag}>`
    ].join(
      "\n"
    );

  }


  /* ============================================================
     XML -> JSON
     ============================================================ */

  async function convertXmlToJson(
    file,
    converter
  ) {

    const source =
      await file.text();


    if (
      !source.trim()
    ) {

      throw new Error(
        "XML ไม่มีข้อมูล"
      );
    }


    const parser =
      new DOMParser();


    const xml =
      parser.parseFromString(
        source,
        "application/xml"
      );


    if (
      xml.querySelector(
        "parsererror"
      )
    ) {

      throw new Error(
        "รูปแบบ XML ไม่ถูกต้อง"
      );
    }


    const root =
      xml.documentElement;


    if (
      !root
    ) {

      throw new Error(
        "ไม่พบ XML root element"
      );
    }


    const value =
      xmlElementToJson(
        root
      );


    const output =
      JSON.stringify(
        {
          [root.nodeName]:
            value
        },
        null,
        2
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function xmlElementToJson(
    element
  ) {

    const children =
      Array.from(
        element.children
      );


    if (
      children.length === 0
    ) {

      return element.textContent ?? "";

    }


    const output =
      {};


    if (
      element.attributes &&
      element.attributes.length
    ) {

      const attributes =
        {};


      Array.from(
        element.attributes
      ).forEach(
        attribute => {

          attributes[
            attribute.name
          ] =
            attribute.value;

        }
      );


      output._attributes =
        attributes;

    }


    children.forEach(
      child => {

        const key =
          child.nodeName;


        const value =
          xmlElementToJson(
            child
          );


        if (
          Object.prototype.hasOwnProperty.call(
            output,
            key
          )
        ) {

          if (
            !Array.isArray(
              output[key]
            )
          ) {

            output[key] =
              [
                output[key]
              ];

          }


          output[key].push(
            value
          );

        } else {

          output[key] =
            value;

        }

      }
    );


    return output;

  }


  /* ============================================================
     YAML -> JSON
     ============================================================ */

  async function convertYamlToJson(
    file,
    converter
  ) {

    const source =
      await file.text();


    const data =
      parseSimpleYaml(
        source
      );


    const output =
      JSON.stringify(
        data,
        null,
        2
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function parseSimpleYaml(
    text
  ) {

    /*
       This is intentionally a lightweight YAML parser
       for common key/value, array, boolean, number and
       inline JSON-like structures.
    */

    const lines =
      text.split(
        /\r?\n/
      );


    const root =
      {};


    const stack =
      [
        {
          indent:
            -1,

          value:
            root
        }
      ];


    for (
      let index = 0;
      index < lines.length;
      index++
    ) {

      const raw =
        lines[index];


      if (
        !raw.trim()
      ) {

        continue;

      }


      if (
        /^\s*#/.test(
          raw
        )
      ) {

        continue;

      }


      const indent =
        raw.match(
          /^\s*/
        )[0].length;


      const line =
        raw.trim();


      while (
        stack.length > 1 &&
        indent <=
          stack[
            stack.length - 1
          ].indent
      ) {

        stack.pop();

      }


      const parent =
        stack[
          stack.length - 1
        ].value;


      if (
        line.startsWith(
          "- "
        )
      ) {

        if (
          Array.isArray(
            parent
          )
        ) {

          parent.push(
            parseYamlScalar(
              line.slice(
                2
              )
            )
          );

        }


        continue;

      }


      const colon =
        findYamlColon(
          line
        );


      if (
        colon < 0
      ) {

        continue;

      }


      const key =
        stripYamlQuotes(
          line.slice(
            0,
            colon
          ).trim()
        );


      const valueText =
        line.slice(
          colon + 1
        ).trim();


      if (
        valueText === ""
      ) {

        let child =
          {};


        const next =
          findNextYamlLine(
            lines,
            index + 1
          );


        if (
          next &&
          next.text.trim().startsWith(
            "- "
          )
        ) {

          child =
            [];

        }


        parent[key] =
          child;


        stack.push(
          {
            indent,
            value:
              child
          }
        );

      } else {

        parent[key] =
          parseYamlScalar(
            valueText
          );

      }

    }


    return root;

  }


  function findYamlColon(
    line
  ) {

    let quote =
      null;


    for (
      let index = 0;
      index < line.length;
      index++
    ) {

      const char =
        line[index];


      if (
        char === '"' ||
        char === "'"
      ) {

        if (
          quote === char
        ) {

          quote =
            null;

        } else if (
          quote === null
        ) {

          quote =
            char;

        }

      }


      if (
        char === ":" &&
        quote === null
      ) {

        return index;

      }

    }


    return -1;

  }


  function findNextYamlLine(
    lines,
    start
  ) {

    for (
      let index = start;
      index < lines.length;
      index++
    ) {

      if (
        lines[index].trim()
      ) {

        return {
          text:
            lines[index]
        };

      }

    }


    return null;

  }


  function stripYamlQuotes(
    value
  ) {

    const text =
      safeString(
        value
      );


    if (
      (
        text.startsWith('"') &&
        text.endsWith('"')
      ) ||
      (
        text.startsWith("'") &&
        text.endsWith("'")
      )
    ) {

      return text.slice(
        1,
        -1
      );

    }


    return text;

  }


  function parseYamlScalar(
    value
  ) {

    const text =
      safeString(
        value
      );


    if (
      text === ""
    ) {

      return "";

    }


    if (
      text === "null" ||
      text === "~"
    ) {

      return null;
    }


    if (
      text === "true"
    ) {

      return true;
    }


    if (
      text === "false"
    ) {

      return false;
    }


    if (
      /^-?\d+(?:\.\d+)?$/.test(
        text
      )
    ) {

      return Number(
        text
      );

    }


    if (
      (
        text.startsWith("[") &&
        text.endsWith("]")
      ) ||
      (
        text.startsWith("{") &&
        text.endsWith("}")
      )
    ) {

      try {

        return JSON.parse(
          text
        );

      } catch {
        /* keep string */
      }

    }


    return stripYamlQuotes(
      text
    );

  }


  /* ============================================================
     JSON -> YAML
     ============================================================ */

  async function convertJsonToYaml(
    file,
    converter
  ) {

    const data =
      parseJson(
        await file.text()
      );


    const output =
      jsonToYaml(
        data,
        0
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function yamlScalar(
    value
  ) {

    if (
      value === null
    ) {

      return "null";
    }


    if (
      typeof value === "boolean"
    ) {

      return value
        ? "true"
        : "false";
    }


    if (
      typeof value === "number"
    ) {

      return String(
        value
      );
    }


    const text =
      String(
        value ?? ""
      );


    if (
      text === ""
    ) {

      return '""';
    }


    if (
      /^[A-Za-z0-9_.\/-]+$/.test(
        text
      )
    ) {

      return text;
    }


    return JSON.stringify(
      text
    );

  }


  function jsonToYaml(
    value,
    depth
  ) {

    const indent =
      "  ".repeat(
        depth
      );


    if (
      value === null ||
      typeof value !== "object"
    ) {

      return yamlScalar(
        value
      );

    }


    if (
      Array.isArray(
        value
      )
    ) {

      if (
        value.length === 0
      ) {

        return "[]";
      }


      return value
        .map(
          item => {

            if (
              item !== null &&
              typeof item === "object"
            ) {

              const nested =
                jsonToYaml(
                  item,
                  depth + 1
                );


              const lines =
                nested.split(
                  "\n"
                );


              return `${indent}- ${
                lines[0]
              }${
                lines.length > 1
                  ? "\n" +
                    lines
                      .slice(1)
                      .map(
                        line =>
                          `${indent}  ${line}`
                      )
                      .join(
                        "\n"
                      )
                  : ""
              }`;

            }


            return `${indent}- ${
              yamlScalar(
                item
              )
            }`;

          }
        )
        .join(
          "\n"
        );

    }


    const entries =
      Object.entries(
        value
      );


    if (
      !entries.length
    ) {

      return "{}";
    }


    return entries
      .map(
        (
          [
            key,
            child
          ]
        ) => {

          const safeKey =
            /^[A-Za-z0-9_-]+$/.test(
              key
            )
              ? key
              : JSON.stringify(
                  key
                );


          if (
            child !== null &&
            typeof child === "object"
          ) {

            return `${indent}${safeKey}:\n${
              jsonToYaml(
                child,
                depth + 1
              )
            }`;

          }


          return `${indent}${safeKey}: ${
            yamlScalar(
              child
            )
          }`;

        }
      )
      .join(
        "\n"
      );

  }


  /* ============================================================
     TEXT
     ============================================================ */

  async function convertTxtToHtml(
    file,
    converter
  ) {

    const source =
      await file.text();


    const title =
      escapeHtml(
        removeExtension(
          file.name
        )
      );


    const body =
      source
        .split(
          /\r?\n\r?\n/
        )
        .map(
          paragraph =>
            `<p>${escapeHtml(
              paragraph
            ).replace(
              /\r?\n/g,
              "<br>"
            )}</p>`
        )
        .join(
          "\n"
        );


    const html =
      `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{
  font-family:Arial,sans-serif;
  line-height:1.7;
  max-width:900px;
  margin:40px auto;
  padding:0 20px;
}
p{
  margin-bottom:16px;
}
</style>
</head>
<body>
${body}
</body>
</html>`;


    return createResult(
      file,
      new Blob(
        [html],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  async function convertHtmlToTxt(
    file,
    converter
  ) {

    const source =
      await file.text();


    const parser =
      new DOMParser();


    const doc =
      parser.parseFromString(
        source,
        "text/html"
      );


    const text =
      doc.body
        ? (
            doc.body.innerText ||
            doc.body.textContent ||
            ""
          )
        : "";


    return createResult(
      file,
      new Blob(
        [
          text.trim()
        ],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  async function convertMarkdownToHtml(
    file,
    converter
  ) {

    const source =
      await file.text();


    const body =
      markdownToHtml(
        source
      );


    const html =
      `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(
  removeExtension(
    file.name
  )
)}</title>
</head>
<body>
${body}
</body>
</html>`;


    return createResult(
      file,
      new Blob(
        [html],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function markdownToHtml(
    source
  ) {

    let html =
      escapeHtml(
        source
      );


    html =
      html.replace(
        /^###### (.+)$/gm,
        "<h6>$1</h6>"
      );


    html =
      html.replace(
        /^##### (.+)$/gm,
        "<h5>$1</h5>"
      );


    html =
      html.replace(
        /^#### (.+)$/gm,
        "<h4>$1</h4>"
      );


    html =
      html.replace(
        /^### (.+)$/gm,
        "<h3>$1</h3>"
      );


    html =
      html.replace(
        /^## (.+)$/gm,
        "<h2>$1</h2>"
      );


    html =
      html.replace(
        /^# (.+)$/gm,
        "<h1>$1</h1>"
      );


    html =
      html.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
      );


    html =
      html.replace(
        /\*(.+?)\*/g,
        "<em>$1</em>"
      );


    html =
      html.replace(
        /`(.+?)`/g,
        "<code>$1</code>"
      );


    const lines =
      html.split(
        "\n"
      );


    const output =
      [];


    let inList =
      false;


    for (
      const line of lines
    ) {

      if (
        /^\- /.test(
          line
        )
      ) {

        if (
          !inList
        ) {

          output.push(
            "<ul>"
          );


          inList =
            true;

        }


        output.push(
          `<li>${line.slice(
            2
          )}</li>`
        );


      } else {

        if (
          inList
        ) {

          output.push(
            "</ul>"
          );


          inList =
            false;

        }


        if (
          line.trim()
        ) {

          output.push(
            line
          );

        }

      }

    }


    if (
      inList
    ) {

      output.push(
        "</ul>"
      );

    }


    return output
      .join(
        "\n"
      )
      .replace(
        /\n{2,}/g,
        "\n"
      );

  }


  /* ============================================================
     TEXT -> PDF
     ============================================================ */

  async function convertTextToPdf(
    file,
    converter
  ) {

    const text =
      await file.text();


    return buildTextPdf(
      file,
      text,
      converter
    );

  }


  /* ============================================================
     HTML -> PDF
     ============================================================ */

  async function convertHtmlToPdf(
    file,
    converter
  ) {

    const source =
      await file.text();


    const parser =
      new DOMParser();


    const doc =
      parser.parseFromString(
        source,
        "text/html"
      );


    const text =
      doc.body
        ? (
            doc.body.innerText ||
            doc.body.textContent ||
            ""
          )
        : "";


    return buildTextPdf(
      file,
      text,
      converter
    );

  }


  /* ============================================================
     TEXT PDF BUILDER
     ============================================================ */

  async function buildTextPdf(
    file,
    text,
    converter
  ) {

    const PDFLib =
      await ensurePdfLib();


    const pdfDoc =
      await PDFLib.PDFDocument.create();


    const font =
      await pdfDoc.embedFont(
        PDFLib.StandardFonts.Helvetica
      );


    const pageWidth =
      595.28;


    const pageHeight =
      841.89;


    const margin =
      36;


    const fontSize =
      10;


    const lineHeight =
      15;


    const lines =
      wrapText(
        text,
        92
      );


    let page =
      pdfDoc.addPage(
        [
          pageWidth,
          pageHeight
        ]
      );


    let y =
      pageHeight -
      margin;


    for (
      const line of lines
    ) {

      if (
        y <
        margin
      ) {

        page =
          pdfDoc.addPage(
            [
              pageWidth,
              pageHeight
            ]
          );


        y =
          pageHeight -
          margin;

      }


      page.drawText(
        normalizePdfText(
          line
        ),
        {
          x:
            margin,

          y,

          size:
            fontSize,

          font
        }
      );


      y -=
        lineHeight;

    }


    const bytes =
      await pdfDoc.save();


    return createResult(
      file,
      new Blob(
        [bytes],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  function normalizePdfText(
    value
  ) {

    /*
       Standard Helvetica only supports basic Latin.
       Unsupported characters are replaced to avoid
       producing a broken PDF.
    */

    return String(
      value ?? ""
    )
      .replace(
        /[^\x09\x0A\x0D\x20-\x7E]/g,
        "?"
      );

  }


  function wrapText(
    text,
    maxChars
  ) {

    const lines =
      [];


    const paragraphs =
      String(
        text ?? ""
      )
      .replace(
        /\r\n/g,
        "\n"
      )
      .replace(
        /\r/g,
        "\n"
      )
      .split(
        "\n"
      );


    paragraphs.forEach(
      paragraph => {

        if (
          paragraph === ""
        ) {

          lines.push(
            ""
          );


          return;
        }


        let remaining =
          paragraph;


        while (
          remaining.length >
          maxChars
        ) {

          let cut =
            remaining.lastIndexOf(
              " ",
              maxChars
            );


          if (
            cut <= 0
          ) {

            cut =
              maxChars;

          }


          lines.push(
            remaining.slice(
              0,
              cut
            )
          );


          remaining =
            remaining
              .slice(
                cut
              )
              .trimStart();

        }


        lines.push(
          remaining
        );

      }
    );


    return lines;

  }


  /* ============================================================
     DOCX -> PDF
     ============================================================ */

  async function convertDocxToPdf(
    file,
    converter
  ) {

    const mammoth =
      await ensureMammoth();


    const result =
      await mammoth.extractRawText(
        {
          arrayBuffer:
            await file.arrayBuffer()
        }
      );


    const text =
      safeString(
        result.value
      );


    if (
      !text
    ) {

      throw new Error(
        "ไม่พบข้อความใน DOCX"
      );
    }


    return buildTextPdf(
      file,
      text,
      converter
    );

  }


  /* ============================================================
     PPTX -> PDF
     ============================================================ */

  async function convertPptxToPdf(
    file,
    converter
  ) {

    const JSZip =
      await ensureJsZip();


    const zip =
      await JSZip.loadAsync(
        await file.arrayBuffer()
      );


    const slideFiles =
      Object.keys(
        zip.files
      )
      .filter(
        name =>
          /^ppt\/slides\/slide\d+\.xml$/i.test(
            name
          )
      )
      .sort(
        naturalSort
      );


    if (
      !slideFiles.length
    ) {

      throw new Error(
        "ไม่พบ slide ใน PPTX"
      );
    }


    const sections =
      [];


    for (
      const fileName of slideFiles
    ) {

      const xml =
        await zip.files[
          fileName
        ].async(
          "text"
        );


      const parser =
        new DOMParser();


      const doc =
        parser.parseFromString(
          xml,
          "application/xml"
        );


      const textNodes =
        Array.from(
          doc.querySelectorAll(
            "t"
          )
        );


      const slideText =
        textNodes
          .map(
            node =>
              safeString(
                node.textContent
              )
          )
          .filter(Boolean)
          .join(
            "\n"
          );


      sections.push(
        `SLIDE ${extractNumber(
          fileName
        )}\n${slideText}`
      );

    }


    return buildTextPdf(
      file,
      sections.join(
        "\n\n"
      ),
      converter
    );

  }


  function naturalSort(
    a,
    b
  ) {

    return a.localeCompare(
      b,
      undefined,
      {
        numeric:
          true,
        sensitivity:
          "base"
      }
    );

  }


  function extractNumber(
    value
  ) {

    const match =
      String(
        value
      ).match(
        /(\d+)/
      );


    return match
      ? match[1]
      : "1";

  }


  /* ============================================================
     CSV -> XLSX
     ============================================================ */

  async function convertCsvToXlsx(
    file,
    converter
  ) {

    const XLSX =
      await ensureXlsx();


    const rows =
      parseCsv(
        await file.text()
      );


    const sheet =
      XLSX.utils.aoa_to_sheet(
        rows
      );


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      "Sheet1"
    );


    const bytes =
      XLSX.write(
        workbook,
        {
          bookType:
            "xlsx",
          type:
            "array"
        }
      );


    return createResult(
      file,
      new Blob(
        [bytes],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     XLSX -> CSV
     ============================================================ */

  async function convertXlsxToCsv(
    file,
    converter
  ) {

    const XLSX =
      await ensureXlsx();


    const workbook =
      XLSX.read(
        await file.arrayBuffer(),
        {
          type:
            "array"
        }
      );


    const chunks =
      [];


    workbook.SheetNames.forEach(
      sheetName => {

        const worksheet =
          workbook.Sheets[
            sheetName
          ];


        const csv =
          XLSX.utils.sheet_to_csv(
            worksheet
          );


        chunks.push(
          `# SHEET: ${sheetName}\n${csv}`
        );

      }
    );


    const output =
      "\uFEFF" +
      chunks.join(
        "\r\n\r\n"
      );


    return createResult(
      file,
      new Blob(
        [output],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     JSON -> XLSX
     ============================================================ */

  async function convertJsonToXlsx(
    file,
    converter
  ) {

    const XLSX =
      await ensureXlsx();


    const data =
      parseJson(
        await file.text()
      );


    const rows =
      Array.isArray(
        data
      )
        ? data
        : [data];


    const sheet =
      XLSX.utils.json_to_sheet(
        rows
      );


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      "Sheet1"
    );


    const bytes =
      XLSX.write(
        workbook,
        {
          bookType:
            "xlsx",
          type:
            "array"
        }
      );


    return createResult(
      file,
      new Blob(
        [bytes],
        {
          type:
            converter.outputMime
        }
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     XLSX -> PDF
     ============================================================ */

  async function convertXlsxToPdf(
    file,
    converter
  ) {

    const XLSX =
      await ensureXlsx();


    const workbook =
      XLSX.read(
        await file.arrayBuffer(),
        {
          type:
            "array",
          cellText:
            true
        }
      );


    const lines =
      [];


    workbook.SheetNames.forEach(
      sheetName => {

        lines.push(
          `SHEET: ${sheetName}`
        );


        const worksheet =
          workbook.Sheets[
            sheetName
          ];


        const rows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              header:
                1,
              raw:
                false,
              defval:
                ""
            }
          );


        rows.forEach(
          row => {

            lines.push(
              row
                .map(
                  value =>
                    String(
                      value
                    )
                )
                .join(
                  "    "
                )
            );

          }
        );


        lines.push(
          ""
        );

      }
    );


    return buildTextPdf(
      file,
      lines.join(
        "\n"
      ),
      converter
    );

  }


  /* ============================================================
     CONVERTER REGISTRY
     ============================================================ */

  const CONVERTERS = {

    /* IMAGE */

    "jpg-png": {
      title:
        "JPG → PNG",
      description:
        "แปลง JPG / JPEG เป็น PNG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "jpg",
          "jpeg"
        ],
      inputMimeTypes:
        [
          "image/jpeg"
        ],
      outputExtension:
        "png",
      outputMime:
        "image/png",
      convert:
        convertImage
    },


    "png-jpg": {
      title:
        "PNG → JPG",
      description:
        "แปลง PNG เป็น JPG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "png"
        ],
      inputMimeTypes:
        [
          "image/png"
        ],
      outputExtension:
        "jpg",
      outputMime:
        "image/jpeg",
      convert:
        convertImage
    },


    "jpg-webp": {
      title:
        "JPG → WebP",
      description:
        "แปลง JPG / JPEG เป็น WebP",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "jpg",
          "jpeg"
        ],
      inputMimeTypes:
        [
          "image/jpeg"
        ],
      outputExtension:
        "webp",
      outputMime:
        "image/webp",
      convert:
        convertImage
    },


    "png-webp": {
      title:
        "PNG → WebP",
      description:
        "แปลง PNG เป็น WebP",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "png"
        ],
      inputMimeTypes:
        [
          "image/png"
        ],
      outputExtension:
        "webp",
      outputMime:
        "image/webp",
      convert:
        convertImage
    },


    "webp-jpg": {
      title:
        "WebP → JPG",
      description:
        "แปลง WebP เป็น JPG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "webp"
        ],
      inputMimeTypes:
        [
          "image/webp"
        ],
      outputExtension:
        "jpg",
      outputMime:
        "image/jpeg",
      convert:
        convertImage
    },


    "webp-png": {
      title:
        "WebP → PNG",
      description:
        "แปลง WebP เป็น PNG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "webp"
        ],
      inputMimeTypes:
        [
          "image/webp"
        ],
      outputExtension:
        "png",
      outputMime:
        "image/png",
      convert:
        convertImage
    },


    "svg-png": {
      title:
        "SVG → PNG",
      description:
        "แปลง SVG เป็น PNG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "svg"
        ],
      inputMimeTypes:
        [
          "image/svg+xml"
        ],
      outputExtension:
        "png",
      outputMime:
        "image/png",
      convert:
        convertSvgToPng
    },


    "bmp-png": {
      title:
        "BMP → PNG",
      description:
        "แปลง BMP เป็น PNG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "bmp"
        ],
      inputMimeTypes:
        [
          "image/bmp",
          "image/x-ms-bmp"
        ],
      outputExtension:
        "png",
      outputMime:
        "image/png",
      convert:
        convertImage
    },


    "gif-png": {
      title:
        "GIF → PNG",
      description:
        "แปลง GIF เป็น PNG",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "gif"
        ],
      inputMimeTypes:
        [
          "image/gif"
        ],
      outputExtension:
        "png",
      outputMime:
        "image/png",
      convert:
        convertImage
    },


    "image-ico": {
      title:
        "Image → ICO",
      description:
        "สร้างไฟล์ ICO / Favicon",
      category:
        "image",
      categoryLabel:
        "IMAGE CONVERTER",
      inputExtensions:
        [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "bmp"
        ],
      inputMimeTypes:
        [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/bmp",
          "image/x-ms-bmp"
        ],
      outputExtension:
        "ico",
      outputMime:
        "image/x-icon",
      convert:
        convertImageToIco
    },


    /* PDF */

    "jpg-pdf": {
      title:
        "JPG → PDF",
      description:
        "แปลง JPG / JPEG เป็น PDF",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "jpg",
          "jpeg"
        ],
      inputMimeTypes:
        [
          "image/jpeg"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertImageToPdf
    },


    "png-pdf": {
      title:
        "PNG → PDF",
      description:
        "แปลง PNG เป็น PDF",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "png"
        ],
      inputMimeTypes:
        [
          "image/png"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertImageToPdf
    },


    "image-pdf": {
      title:
        "Image → PDF",
      description:
        "รวมรูปภาพเป็น PDF",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "bmp"
        ],
      inputMimeTypes:
        [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/bmp",
          "image/x-ms-bmp"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertImageToPdf
    },


    "pdf-jpg": {
      title:
        "PDF → JPG",
      description:
        "แปลง PDF ทุกหน้าเป็น JPG ZIP",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "pdf"
        ],
      inputMimeTypes:
        [
          "application/pdf"
        ],
      outputExtension:
        "zip",
      outputMime:
        "application/zip",
      convert:
        convertPdfToJpgZip
    },


    "pdf-png": {
      title:
        "PDF → PNG",
      description:
        "แปลง PDF ทุกหน้าเป็น PNG ZIP",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "pdf"
        ],
      inputMimeTypes:
        [
          "application/pdf"
        ],
      outputExtension:
        "zip",
      outputMime:
        "application/zip",
      convert:
        convertPdfToPngZip
    },


    "pdf-txt": {
      title:
        "PDF → TXT",
      description:
        "ดึงข้อความจาก PDF",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "pdf"
        ],
      inputMimeTypes:
        [
          "application/pdf"
        ],
      outputExtension:
        "txt",
      outputMime:
        "text/plain;charset=utf-8",
      convert:
        convertPdfToText
    },


    "pdf-text": {
      title:
        "PDF → Text",
      description:
        "Extract ข้อความจาก PDF",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "pdf"
        ],
      inputMimeTypes:
        [
          "application/pdf"
        ],
      outputExtension:
        "txt",
      outputMime:
        "text/plain;charset=utf-8",
      convert:
        convertPdfToText
    },


    "pdf-images": {
      title:
        "PDF → Images",
      description:
        "แยกทุกหน้า PDF เป็น JPG ZIP",
      category:
        "pdf",
      categoryLabel:
        "PDF CONVERTER",
      inputExtensions:
        [
          "pdf"
        ],
      inputMimeTypes:
        [
          "application/pdf"
        ],
      outputExtension:
        "zip",
      outputMime:
        "application/zip",
      convert:
        convertPdfToJpgZip
    },


    /* DATA */

    "csv-json": {
      title:
        "CSV → JSON",
      description:
        "แปลง CSV เป็น JSON",
      category:
        "data",
      categoryLabel:
        "DATA CONVERTER",
      inputExtensions:
        [
          "csv"
        ],
      inputMimeTypes:
        [
          "text/csv",
          "text/plain"
        ],
      outputExtension:
        "json",
      outputMime:
        "application/json",
      convert:
        convertCsvToJson
    },


    "json-csv": {
      title:
        "JSON → CSV",
      description:
        "แปลง JSON เป็น CSV",
      category:
        "data",
      categoryLabel:
        "DATA CONVERTER",
      inputExtensions:
        [
          "json"
        ],
      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],
      outputExtension:
        "csv",
      outputMime:
        "text/csv;charset=utf-8",
      convert:
        convertJsonToCsv
    },


    "json-xml": {
      title:
        "JSON → XML",
      description:
        "แปลง JSON เป็น XML",
      category:
        "data",
      categoryLabel:
        "DATA CONVERTER",
      inputExtensions:
        [
          "json"
        ],
      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],
      outputExtension:
        "xml",
      outputMime:
        "application/xml;charset=utf-8",
      convert:
        convertJsonToXml
    },


    "xml-json": {
      title:
        "XML → JSON",
      description:
        "แปลง XML เป็น JSON",
      category:
        "data",
      categoryLabel:
        "DATA CONVERTER",
      inputExtensions:
        [
          "xml"
        ],
      inputMimeTypes:
        [
          "application/xml",
          "text/xml"
        ],
      outputExtension:
        "json",
      outputMime:
        "application/json",
      convert:
        convertXmlToJson
    },


    "yaml-json": {
      title:
        "YAML → JSON",
      description:
        "แปลง YAML เป็น JSON",
      category:
        "data",
      categoryLabel:
        "DATA CONVERTER",
      inputExtensions:
        [
          "yaml",
          "yml"
        ],
      inputMimeTypes:
        [
          "text/yaml",
          "application/yaml",
          "text/plain"
        ],
      outputExtension:
        "json",
      outputMime:
        "application/json",
      convert:
        convertYamlToJson
    },


    "json-yaml": {
      title:
        "JSON → YAML",
      description:
        "แปลง JSON เป็น YAML",
      category:
        "data",
      categoryLabel:
        "DATA CONVERTER",
      inputExtensions:
        [
          "json"
        ],
      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],
      outputExtension:
        "yaml",
      outputMime:
        "text/yaml;charset=utf-8",
      convert:
        convertJsonToYaml
    },


    /* TEXT */

    "txt-html": {
      title:
        "TXT → HTML",
      description:
        "แปลง Text เป็น HTML",
      category:
        "text",
      categoryLabel:
        "TEXT CONVERTER",
      inputExtensions:
        [
          "txt"
        ],
      inputMimeTypes:
        [
          "text/plain"
        ],
      outputExtension:
        "html",
      outputMime:
        "text/html;charset=utf-8",
      convert:
        convertTxtToHtml
    },


    "html-txt": {
      title:
        "HTML → TXT",
      description:
        "ดึงข้อความจาก HTML",
      category:
        "text",
      categoryLabel:
        "TEXT CONVERTER",
      inputExtensions:
        [
          "html",
          "htm"
        ],
      inputMimeTypes:
        [
          "text/html"
        ],
      outputExtension:
        "txt",
      outputMime:
        "text/plain;charset=utf-8",
      convert:
        convertHtmlToTxt
    },


    "txt-pdf": {
      title:
        "TXT → PDF",
      description:
        "แปลง Text เป็น PDF",
      category:
        "text",
      categoryLabel:
        "TEXT CONVERTER",
      inputExtensions:
        [
          "txt"
        ],
      inputMimeTypes:
        [
          "text/plain"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertTextToPdf
    },


    "html-pdf": {
      title:
        "HTML → PDF",
      description:
        "แปลง HTML เป็น PDF",
      category:
        "document",
      categoryLabel:
        "DOCUMENT CONVERTER",
      inputExtensions:
        [
          "html",
          "htm"
        ],
      inputMimeTypes:
        [
          "text/html"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertHtmlToPdf
    },


    "md-html": {
      title:
        "Markdown → HTML",
      description:
        "แปลง Markdown เป็น HTML",
      category:
        "text",
      categoryLabel:
        "TEXT CONVERTER",
      inputExtensions:
        [
          "md"
        ],
      inputMimeTypes:
        [
          "text/markdown",
          "text/plain"
        ],
      outputExtension:
        "html",
      outputMime:
        "text/html;charset=utf-8",
      convert:
        convertMarkdownToHtml
    },


    /* SPREADSHEET */

    "csv-xlsx": {
      title:
        "CSV → XLSX",
      description:
        "แปลง CSV เป็น Excel",
      category:
        "spreadsheet",
      categoryLabel:
        "SPREADSHEET CONVERTER",
      inputExtensions:
        [
          "csv"
        ],
      inputMimeTypes:
        [
          "text/csv",
          "text/plain"
        ],
      outputExtension:
        "xlsx",
      outputMime:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      convert:
        convertCsvToXlsx
    },


    "xlsx-csv": {
      title:
        "XLSX → CSV",
      description:
        "แปลง Excel เป็น CSV",
      category:
        "spreadsheet",
      categoryLabel:
        "SPREADSHEET CONVERTER",
      inputExtensions:
        [
          "xlsx",
          "xls"
        ],
      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"
        ],
      outputExtension:
        "csv",
      outputMime:
        "text/csv;charset=utf-8",
      convert:
        convertXlsxToCsv
    },


    "json-xlsx": {
      title:
        "JSON → XLSX",
      description:
        "แปลง JSON เป็น Excel",
      category:
        "spreadsheet",
      categoryLabel:
        "SPREADSHEET CONVERTER",
      inputExtensions:
        [
          "json"
        ],
      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],
      outputExtension:
        "xlsx",
      outputMime:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      convert:
        convertJsonToXlsx
    },


    "xlsx-pdf": {
      title:
        "XLSX → PDF",
      description:
        "แปลงข้อมูล Excel เป็น PDF",
      category:
        "document",
      categoryLabel:
        "DOCUMENT CONVERTER",
      inputExtensions:
        [
          "xlsx",
          "xls"
        ],
      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertXlsxToPdf
    },


    /* DOCUMENT */

    "docx-pdf": {
      title:
        "DOCX → PDF",
      description:
        "แปลงข้อความจาก Word เป็น PDF",
      category:
        "document",
      categoryLabel:
        "DOCUMENT CONVERTER",
      inputExtensions:
        [
          "docx"
        ],
      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertDocxToPdf
    },


    "pptx-pdf": {
      title:
        "PPTX → PDF",
      description:
        "ดึงข้อความจาก PowerPoint แล้วสร้าง PDF",
      category:
        "document",
      categoryLabel:
        "DOCUMENT CONVERTER",
      inputExtensions:
        [
          "pptx"
        ],
      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ],
      outputExtension:
        "pdf",
      outputMime:
        "application/pdf",
      convert:
        convertPptxToPdf
    }

  };


  /* ============================================================
     ACCEPT ATTRIBUTE
     ============================================================ */

  function buildAcceptAttribute(
    converter
  ) {

    return [
      ...converter.inputExtensions.map(
        ext =>
          `.${ext}`
      ),
      ...converter.inputMimeTypes
    ]
      .filter(Boolean)
      .join(",");

  }


  /* ============================================================
     MODAL RESET
     ============================================================ */

  function cleanupResults() {

    convertedResults.forEach(
      result => {

        if (
          result &&
          result.url
        ) {

          try {

            URL.revokeObjectURL(
              result.url
            );

          } catch {
            /* ignore */
          }

        }

      }
    );


    convertedResults =
      [];

  }


  function resetConverterState() {

    selectedFiles =
      [];


    cleanupResults();


    fileList.innerHTML =
      "";


    fileListSection.hidden =
      true;


    fileCount.textContent =
      "0 files";


    resultSection.hidden =
      true;


    resultList.innerHTML =
      "";


    errorMessage.hidden =
      true;


    errorText.textContent =
      "";


    resetProgress();


    convertButton.disabled =
      true;


    convertButton.classList.remove(
      "is-loading"
    );


    convertButton.textContent =
      "Convert →";


    browseFilesButton.disabled =
      false;


    clearFilesButton.disabled =
      false;

  }


  /* ============================================================
     OPEN CONVERTER
     ============================================================ */

  function openConverter(
    converterId
  ) {

    const converter =
      CONVERTERS[
        converterId
      ];


    if (
      !converter
    ) {

      showError(
        "ไม่พบ Converter นี้"
      );


      return;
    }


    activeConverterId =
      converterId;


    activeConverter =
      converter;


    previousActiveElement =
      document.activeElement;


    resetConverterState();


    modalTitle.textContent =
      converter.title;


    modalDescription.textContent =
      converter.description;


    modalCategory.textContent =
      converter.categoryLabel;


    supportedFormats.textContent =
      `รองรับ: ${
        converter.inputExtensions
          .map(
            ext =>
              ext.toUpperCase()
          )
          .join(
            ", "
          )
      }`;


    fileInput.accept =
      buildAcceptAttribute(
        converter
      );


    modal.hidden =
      false;


    previousBodyOverflow =
      document.body.style.overflow;


    document.body.style.overflow =
      "hidden";


    setTimeout(
      () => {

        modalClose.focus();

      },
      0
    );

  }


  /* ============================================================
     CLOSE CONVERTER
     ============================================================ */

  function closeConverter() {

    if (
      isConverting
    ) {

      return;
    }


    cleanupResults();


    modal.hidden =
      true;


    document.body.style.overflow =
      previousBodyOverflow;


    activeConverterId =
      null;


    activeConverter =
      null;


    resetConverterState();


    if (
      previousActiveElement &&
      typeof previousActiveElement.focus ===
        "function"
    ) {

      try {

        previousActiveElement.focus();

      } catch {
        /* ignore */
      }

    }


    previousActiveElement =
      null;

  }


  /* ============================================================
     ADD FILES
     ============================================================ */

  function addFiles(
    files
  ) {

    if (
      !activeConverter ||
      isConverting
    ) {

      return;
    }


    if (
      !Array.isArray(files) ||
      !files.length
    ) {

      return;
    }


    hideError();


    const rejected =
      [];


    const valid =
      [];


    for (
      const file of files
    ) {

      if (
        selectedFiles.length +
        valid.length >=
        MAX_FILES
      ) {

        rejected.push(
          `เกินจำนวนสูงสุด ${MAX_FILES} ไฟล์`
        );


        break;

      }


      if (
        file.size >
        MAX_FILE_SIZE
      ) {

        rejected.push(
          `${file.name}: ไฟล์ใหญ่เกิน ${formatBytes(
            MAX_FILE_SIZE
          )}`
        );


        continue;

      }


      if (
        !isFileSupported(
          file,
          activeConverter
        )
      ) {

        rejected.push(
          `${file.name}: รูปแบบไฟล์ไม่รองรับ`
        );


        continue;

      }


      const duplicate =
        selectedFiles.some(
          existing =>
            existing.name ===
              file.name &&
            existing.size ===
              file.size &&
            existing.lastModified ===
              file.lastModified
        );


      if (
        duplicate
      ) {

        continue;
      }


      valid.push(
        file
      );

    }


    selectedFiles.push(
      ...valid
    );


    updateFileList();


    convertButton.disabled =
      selectedFiles.length ===
      0;


    if (
      rejected.length
    ) {

      showError(
        rejected.join(
          "\n"
        )
      );

    }

  }


  function isFileSupported(
    file,
    converter
  ) {

    const extension =
      getExtension(
        file.name
      );


    if (
      converter.inputExtensions.includes(
        extension
      )
    ) {

      return true;
    }


    const mime =
      normalize(
        file.type
      );


    return (
      Boolean(mime) &&
      converter.inputMimeTypes.includes(
        mime
      )
    );

  }


  /* ============================================================
     UPDATE FILE LIST
     ============================================================ */

  function updateFileList() {

    fileList.innerHTML =
      "";


    const count =
      selectedFiles.length;


    fileCount.textContent =
      `${count} file${
        count === 1
          ? ""
          : "s"
      }`;


    fileListSection.hidden =
      count === 0;


    if (
      count === 0
    ) {

      return;
    }


    const fragment =
      document.createDocumentFragment();


    selectedFiles.forEach(
      (
        file,
        index
      ) => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "file-item";


        const extension =
          getExtension(
            file.name
          );


        row.innerHTML =
          `
            <div class="file-item-icon">
              ${escapeHtml(
                extension ||
                "FILE"
              )}
            </div>

            <div class="file-item-info">

              <div class="file-item-name">
                ${escapeHtml(
                  file.name
                )}
              </div>

              <div class="file-item-size">
                ${formatBytes(
                  file.size
                )}
              </div>

            </div>

            <button
              type="button"
              class="file-item-remove"
              data-remove-index="${index}"
              aria-label="ลบไฟล์"
            >
              ×
            </button>
          `;


        fragment.appendChild(
          row
        );

      }
    );


    fileList.appendChild(
      fragment
    );

  }


  /* ============================================================
     REMOVE FILE
     ============================================================ */

  fileList.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-remove-index]"
        );


      if (
        !button ||
        isConverting
      ) {

        return;
      }


      const index =
        Number(
          button.dataset.removeIndex
        );


      if (
        !Number.isInteger(
          index
        ) ||
        index < 0 ||
        index >= selectedFiles.length
      ) {

        return;
      }


      selectedFiles.splice(
        index,
        1
      );


      updateFileList();


      convertButton.disabled =
        selectedFiles.length ===
        0;

    }
  );


  /* ============================================================
     CLEAR FILES
     ============================================================ */

  clearFilesButton.addEventListener(
    "click",
    () => {

      if (
        isConverting
      ) {

        return;
      }


      selectedFiles =
        [];


      updateFileList();


      cleanupResults();


      resultSection.hidden =
        true;


      resultList.innerHTML =
        "";


      convertButton.disabled =
        true;


      hideError();


      resetProgress();

    }
  );


  /* ============================================================
     DROP / INPUT
     ============================================================ */

  browseFilesButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      if (
        !isConverting
      ) {

        fileInput.click();

      }

    }
  );


  dropZone.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "button"
        )
      ) {

        return;
      }


      if (
        isConverting
      ) {

        return;
      }


      fileInput.click();

    }
  );


  dropZone.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();


        if (
          !isConverting
        ) {

          fileInput.click();

        }

      }

    }
  );


  fileInput.addEventListener(
    "change",
    event => {

      addFiles(
        Array.from(
          event.target.files ||
          []
        )
      );


      fileInput.value =
        "";

    }
  );


  [
    "dragenter",
    "dragover"
  ].forEach(
    eventName => {

      dropZone.addEventListener(
        eventName,
        event => {

          event.preventDefault();
          event.stopPropagation();


          if (
            !isConverting
          ) {

            dropZone.classList.add(
              "drag-over"
            );

          }

        }
      );

    }
  );


  [
    "dragleave",
    "drop"
  ].forEach(
    eventName => {

      dropZone.addEventListener(
        eventName,
        event => {

          event.preventDefault();
          event.stopPropagation();


          dropZone.classList.remove(
            "drag-over"
          );

        }
      );

    }
  );


  dropZone.addEventListener(
    "drop",
    event => {

      if (
        isConverting
      ) {

        return;
      }


      addFiles(
        Array.from(
          event.dataTransfer?.files ||
          []
        )
      );

    }
  );


  /* ============================================================
     PROGRESS
     ============================================================ */

  function setProgress(
    percent,
    status
  ) {

    const value =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            percent
          ) || 0
        )
      );


    progressBar.style.width =
      `${value}%`;


    progressPercent.textContent =
      `${value}%`;


    progressStatus.textContent =
      safeString(
        status
      ) ||
      "กำลังดำเนินการ...";

  }


  function resetProgress() {

    progressSection.hidden =
      true;


    progressBar.style.width =
      "0%";


    progressPercent.textContent =
      "0%";


    progressStatus.textContent =
      "กำลังเตรียมไฟล์";

  }


  /* ============================================================
     CONVERSION
     ============================================================ */

  convertButton.addEventListener(
    "click",
    async () => {

      if (
        isConverting ||
        !activeConverter ||
        selectedFiles.length === 0
      ) {

        return;
      }


      await runConversion();

    }
  );


  async function runConversion() {

    isConverting =
      true;


    hideError();


    cleanupResults();


    resultSection.hidden =
      true;


    resultList.innerHTML =
      "";


    progressSection.hidden =
      false;


    convertButton.disabled =
      true;


    convertButton.classList.add(
      "is-loading"
    );


    convertButton.textContent =
      "กำลังแปลง...";


    browseFilesButton.disabled =
      true;


    clearFilesButton.disabled =
      true;


    try {

      const total =
        selectedFiles.length;


      for (
        let index = 0;
        index < total;
        index++
      ) {

        const file =
          selectedFiles[index];


        setProgress(
          Math.round(
            (
              index /
              total
            ) *
            100
          ),
          `กำลังแปลง ${index + 1}/${total}: ${file.name}`
        );


        await nextFrame();


        const result =
          await activeConverter.convert(
            file,
            activeConverter
          );


        convertedResults.push(
          result
        );


        setProgress(
          Math.round(
            (
              (index + 1) /
              total
            ) *
            100
          ),
          `แปลง ${file.name} สำเร็จ`
        );


        await wait(
          30
        );

      }


      renderResults();


      resultSection.hidden =
        false;


      progressStatus.textContent =
        "แปลงไฟล์เสร็จเรียบร้อย";


    } catch (
      error
    ) {

      console.error(
        "[File Converter]",
        error
      );


      showError(
        getErrorMessage(
          error
        )
      );

    } finally {

      isConverting =
        false;


      convertButton.classList.remove(
        "is-loading"
      );


      convertButton.textContent =
        "Convert →";


      browseFilesButton.disabled =
        false;


      clearFilesButton.disabled =
        false;


      convertButton.disabled =
        selectedFiles.length === 0;

    }

  }


  /* ============================================================
     RESULTS
     ============================================================ */

  function renderResults() {

    resultList.innerHTML =
      "";


    resultSummary.textContent =
      `${convertedResults.length} file${
        convertedResults.length === 1
          ? ""
          : "s"
      } converted`;


    const fragment =
      document.createDocumentFragment();


    convertedResults.forEach(
      result => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "result-item";


        row.innerHTML =
          `
            <div class="file-item-icon">
              ${escapeHtml(
                (
                  result.extension ||
                  "file"
                ).toUpperCase()
              )}
            </div>

            <div class="result-item-info">

              <div class="result-item-name">
                ${escapeHtml(
                  result.name
                )}
              </div>

              <div class="result-item-size">
                ${formatBytes(
                  result.blob.size
                )}
              </div>

            </div>

            <a
              class="result-download"
              href="${result.url}"
              download="${escapeHtml(
                result.name
              )}"
            >
              Download
            </a>
          `;


        fragment.appendChild(
          row
        );

      }
    );


    resultList.appendChild(
      fragment
    );

  }


  /* ============================================================
     ERROR
     ============================================================ */

  function showError(
    message
  ) {

    errorText.textContent =
      safeString(
        message
      );


    errorMessage.hidden =
      false;

  }


  function hideError() {

    errorMessage.hidden =
      true;


    errorText.textContent =
      "";

  }


  /* ============================================================
     SEARCH
     ============================================================ */

  function applySearchAndFilter() {

    const query =
      normalize(
        searchInput.value
      );


    let visibleCount =
      0;


    converterCards.forEach(
      card => {

        const category =
          normalize(
            card.dataset.category
          );


        const searchable =
          normalize(
            [
              card.dataset.name,
              card.dataset.converter,
              card.textContent
            ].join(
              " "
            )
          );


        const categoryMatched =
          activeFilter === "all" ||
          category ===
            activeFilter;


        const searchMatched =
          !query ||
          searchable.includes(
            query
          );


        const visible =
          categoryMatched &&
          searchMatched;


        card.hidden =
          !visible;


        if (
          visible
        ) {

          visibleCount++;

        }

      }
    );


    categorySections.forEach(
      section => {

        const sectionName =
          section.dataset.categorySection;


        const cards =
          Array.from(
            section.querySelectorAll(
              ".converter-card"
            )
          );


        let visible =
          cards.some(
            card =>
              !card.hidden
          );


        if (
          query &&
          sectionName ===
            "popular"
        ) {

          visible =
            false;

        }


        section.hidden =
          !visible;

      }
    );


    emptyState.hidden =
      visibleCount > 0;


    clearSearchButton.hidden =
      !query;


    if (
      query ||
      activeFilter !== "all"
    ) {

      searchResultInfo.textContent =
        `${visibleCount} รายการ`;

    } else {

      searchResultInfo.textContent =
        "";

    }

  }


  searchInput.addEventListener(
    "input",
    applySearchAndFilter
  );


  clearSearchButton.addEventListener(
    "click",
    () => {

      searchInput.value =
        "";


      activeFilter =
        "all";


      updateFilterButtons();


      applySearchAndFilter();


      searchInput.focus();

    }
  );


  resetSearchButton.addEventListener(
    "click",
    () => {

      searchInput.value =
        "";


      activeFilter =
        "all";


      updateFilterButtons();


      applySearchAndFilter();

    }
  );


  /* ============================================================
     FILTER
     ============================================================ */

  filterButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          activeFilter =
            safeString(
              button.dataset.filter
            ) ||
            "all";


          updateFilterButtons();


          applySearchAndFilter();

        }
      );

    }
  );


  function updateFilterButtons() {

    filterButtons.forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.filter ===
            activeFilter
        );

      }
    );

  }


  /* ============================================================
     CARD CLICK
     ============================================================ */

  converterCards.forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          const converterId =
            safeString(
              card.dataset.converter
            );


          if (
            converterId
          ) {

            openConverter(
              converterId
            );

          }

        }
      );

    }
  );


  /* ============================================================
     MODAL EVENTS
     ============================================================ */

  modalClose.addEventListener(
    "click",
    closeConverter
  );


  modalCancel.addEventListener(
    "click",
    closeConverter
  );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "[data-modal-close]"
        )
      ) {

        closeConverter();

      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        !modal.hidden
      ) {

        closeConverter();

      }

    }
  );


  /* ============================================================
     CLEANUP
     ============================================================ */

  window.addEventListener(
    "beforeunload",
    () => {

      cleanupResults();

    }
  );


  /* ============================================================
     INITIALIZE
     ============================================================ */

  updateFilterButtons();


  applySearchAndFilter();


  console.log(
    "[File Converter] Initialized successfully."
  );


})();
