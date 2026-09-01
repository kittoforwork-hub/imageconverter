/* ============================================================
   FILE CONVERTER
   /js/file-converter.js

   Browser-side file converter engine

   Features:
   - Search
   - Category filter
   - Converter modal
   - Drag & Drop
   - Multi-file selection
   - Progress
   - Download results
   - Dynamic CDN library loading

   Supported:
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
   - CSV  -> XLSX

   DOCUMENT
   - DOCX -> PDF
   - PPTX -> PDF
   - XLSX -> PDF
   - HTML -> PDF

   Notes:
   - Everything runs client-side.
   - Files are not uploaded to a server by this controller.
   - DOCX/PPTX/XLSX -> PDF uses extracted content,
     not Microsoft Office pixel-perfect rendering.
   ============================================================ */

(() => {

  "use strict";


  /* ============================================================
     DOM
     ============================================================ */

  const searchInput =
    document.getElementById("converter-search");

  const clearSearchButton =
    document.getElementById("clear-search");

  const searchResultInfo =
    document.getElementById("search-result-info");

  const filterButtons =
    Array.from(
      document.querySelectorAll(".filter-button")
    );

  const converterCards =
    Array.from(
      document.querySelectorAll(".converter-card")
    );

  const categorySections =
    Array.from(
      document.querySelectorAll(".converter-category")
    );

  const emptyState =
    document.getElementById("empty-state");

  const resetSearchButton =
    document.getElementById("reset-search");


  /* Modal */

  const modal =
    document.getElementById("converter-modal");

  const modalTitle =
    document.getElementById("modal-title");

  const modalDescription =
    document.getElementById("modal-description");

  const modalCategory =
    document.getElementById("modal-category");

  const modalClose =
    document.getElementById("modal-close");

  const modalCancel =
    document.getElementById("modal-cancel");


  /* Drop */

  const dropZone =
    document.getElementById("drop-zone");

  const browseFilesButton =
    document.getElementById("browse-files");

  const fileInput =
    document.getElementById("file-input");

  const supportedFormats =
    document.getElementById("supported-formats");


  /* Files */

  const fileListSection =
    document.getElementById("file-list-section");

  const fileList =
    document.getElementById("file-list");

  const fileCount =
    document.getElementById("file-count");

  const clearFilesButton =
    document.getElementById("clear-files");


  /* Progress */

  const progressSection =
    document.getElementById("progress-section");

  const progressBar =
    document.getElementById("progress-bar");

  const progressPercent =
    document.getElementById("progress-percent");

  const progressStatus =
    document.getElementById("progress-status");


  /* Results */

  const resultSection =
    document.getElementById("result-section");

  const resultSummary =
    document.getElementById("result-summary");

  const resultList =
    document.getElementById("result-list");


  /* Error */

  const errorMessage =
    document.getElementById("error-message");

  const errorText =
    document.getElementById("error-text");


  /* Convert */

  const convertButton =
    document.getElementById("convert-button");


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


  const DEFAULT_JPEG_QUALITY =
    0.92;


  const DEFAULT_WEBP_QUALITY =
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
     LIBRARY PROMISES
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

  function safeString(value) {

    return String(
      value ?? ""
    ).trim();

  }


  function normalize(value) {

    return safeString(
      value
    ).toLowerCase();

  }


  function escapeHtml(value) {

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


  function sleep(
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


  function readAsArrayBuffer(
    file
  ) {

    return file.arrayBuffer();

  }


  function readAsText(
    file
  ) {

    return file.text();

  }


  function blobFrom(
    data,
    type
  ) {

    return new Blob(
      [data],
      {
        type
      }
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


    return new Promise(
      (
        resolve,
        reject
      ) => {

        const existing =
          document.querySelector(
            `script[data-kit-script="${CSS.escape(src)}"]`
          );


        if (
          existing
        ) {

          existing.addEventListener(
            "load",
            () => resolve(),
            {
              once: true
            }
          );


          existing.addEventListener(
            "error",
            () => reject(
              new Error(
                `โหลด library ไม่สำเร็จ: ${src}`
              )
            ),
            {
              once: true
            }
          );


          return;

        }


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
          () => resolve();


        script.onerror =
          () => reject(
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
     LOAD PDF.JS
     ============================================================ */

  function ensurePdfJs() {

    if (
      window.pdfjsLib
    ) {

      try {

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
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
              "PDF.js โหลดแล้วแต่ไม่พบ pdfjsLib"
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
     LOAD PDF-LIB
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
              "pdf-lib โหลดแล้วแต่ไม่พบ PDFLib"
            );

          }


          return window.PDFLib;

        }
      );


    return pdfLibPromise;

  }


  /* ============================================================
     LOAD JSZIP
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
              "JSZip โหลดแล้วแต่ไม่พบ JSZip"
            );

          }


          return window.JSZip;

        }
      );


    return jsZipPromise;

  }


  /* ============================================================
     LOAD XLSX
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
              "SheetJS โหลดแล้วแต่ไม่พบ XLSX"
            );

          }


          return window.XLSX;

        }
      );


    return xlsxPromise;

  }


  /* ============================================================
     LOAD MAMMOTH
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
              "Mammoth โหลดแล้วแต่ไม่พบ mammoth"
            );

          }


          return window.mammoth;

        }
      );


    return mammothPromise;

  }


  /* ============================================================
     CONVERTER REGISTRY
     ============================================================ */

  const CONVERTERS = {

    /* ----------------------------------------------------------
       IMAGE
       ---------------------------------------------------------- */

    "jpg-png": {

      id:
        "jpg-png",

      title:
        "JPG → PNG",

      description:
        "แปลงไฟล์ JPG / JPEG เป็น PNG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["jpg", "jpeg"],

      inputMimeTypes:
        ["image/jpeg"],

      outputExtension:
        "png",

      outputMime:
        "image/png",

      supported:
        true,

      convert:
        convertImage

    },


    "png-jpg": {

      id:
        "png-jpg",

      title:
        "PNG → JPG",

      description:
        "แปลงไฟล์ PNG เป็น JPG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["png"],

      inputMimeTypes:
        ["image/png"],

      outputExtension:
        "jpg",

      outputMime:
        "image/jpeg",

      supported:
        true,

      convert:
        convertImage

    },


    "jpg-webp": {

      id:
        "jpg-webp",

      title:
        "JPG → WebP",

      description:
        "แปลงไฟล์ JPG / JPEG เป็น WebP",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["jpg", "jpeg"],

      inputMimeTypes:
        ["image/jpeg"],

      outputExtension:
        "webp",

      outputMime:
        "image/webp",

      supported:
        true,

      convert:
        convertImage

    },


    "png-webp": {

      id:
        "png-webp",

      title:
        "PNG → WebP",

      description:
        "แปลงไฟล์ PNG เป็น WebP",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["png"],

      inputMimeTypes:
        ["image/png"],

      outputExtension:
        "webp",

      outputMime:
        "image/webp",

      supported:
        true,

      convert:
        convertImage

    },


    "webp-jpg": {

      id:
        "webp-jpg",

      title:
        "WebP → JPG",

      description:
        "แปลงไฟล์ WebP เป็น JPG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["webp"],

      inputMimeTypes:
        ["image/webp"],

      outputExtension:
        "jpg",

      outputMime:
        "image/jpeg",

      supported:
        true,

      convert:
        convertImage

    },


    "webp-png": {

      id:
        "webp-png",

      title:
        "WebP → PNG",

      description:
        "แปลงไฟล์ WebP เป็น PNG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["webp"],

      inputMimeTypes:
        ["image/webp"],

      outputExtension:
        "png",

      outputMime:
        "image/png",

      supported:
        true,

      convert:
        convertImage

    },


    "svg-png": {

      id:
        "svg-png",

      title:
        "SVG → PNG",

      description:
        "แปลง SVG เป็น PNG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["svg"],

      inputMimeTypes:
        ["image/svg+xml"],

      outputExtension:
        "png",

      outputMime:
        "image/png",

      supported:
        true,

      convert:
        convertSvgToPng

    },


    "bmp-png": {

      id:
        "bmp-png",

      title:
        "BMP → PNG",

      description:
        "แปลง BMP เป็น PNG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["bmp"],

      inputMimeTypes:
        [
          "image/bmp",
          "image/x-ms-bmp"
        ],

      outputExtension:
        "png",

      outputMime:
        "image/png",

      supported:
        true,

      convert:
        convertImage

    },


    "gif-png": {

      id:
        "gif-png",

      title:
        "GIF → PNG",

      description:
        "แปลง GIF เป็น PNG",

      category:
        "image",

      categoryLabel:
        "IMAGE CONVERTER",

      inputExtensions:
        ["gif"],

      inputMimeTypes:
        ["image/gif"],

      outputExtension:
        "png",

      outputMime:
        "image/png",

      supported:
        true,

      convert:
        convertImage

    },


    "image-ico": {

      id:
        "image-ico",

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

      supported:
        true,

      convert:
        convertImageToIco

    },


    /* ----------------------------------------------------------
       PDF
       ---------------------------------------------------------- */

    "jpg-pdf": {

      id:
        "jpg-pdf",

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
        ["image/jpeg"],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        true,

      convert:
        convertImageToPdf

    },


    "png-pdf": {

      id:
        "png-pdf",

      title:
        "PNG → PDF",

      description:
        "แปลง PNG เป็น PDF",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["png"],

      inputMimeTypes:
        ["image/png"],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        true,

      convert:
        convertImageToPdf

    },


    "image-pdf": {

      id:
        "image-pdf",

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

      supported:
        true,

      convert:
        convertImageToPdf

    },


    "pdf-jpg": {

      id:
        "pdf-jpg",

      title:
        "PDF → JPG",

      description:
        "แปลงทุกหน้าของ PDF เป็น JPG แล้วรวมเป็น ZIP",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        ["application/pdf"],

      outputExtension:
        "zip",

      outputMime:
        "application/zip",

      supported:
        true,

      convert:
        convertPdfToJpgZip

    },


    "pdf-png": {

      id:
        "pdf-png",

      title:
        "PDF → PNG",

      description:
        "แปลงทุกหน้าของ PDF เป็น PNG แล้วรวมเป็น ZIP",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        ["application/pdf"],

      outputExtension:
        "zip",

      outputMime:
        "application/zip",

      supported:
        true,

      convert:
        convertPdfToPngZip

    },


    "pdf-txt": {

      id:
        "pdf-txt",

      title:
        "PDF → TXT",

      description:
        "ดึงข้อความจาก PDF",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        ["application/pdf"],

      outputExtension:
        "txt",

      outputMime:
        "text/plain",

      supported:
        true,

      convert:
        convertPdfToText

    },


    "pdf-text": {

      id:
        "pdf-text",

      title:
        "PDF → Text",

      description:
        "Extract ข้อความจาก PDF",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        ["application/pdf"],

      outputExtension:
        "txt",

      outputMime:
        "text/plain",

      supported:
        true,

      convert:
        convertPdfToText

    },


    "pdf-images": {

      id:
        "pdf-images",

      title:
        "PDF → Images",

      description:
        "แยกทุกหน้า PDF เป็น JPG แล้วรวมเป็น ZIP",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        ["application/pdf"],

      outputExtension:
        "zip",

      outputMime:
        "application/zip",

      supported:
        true,

      convert:
        convertPdfToJpgZip

    },


    /* ----------------------------------------------------------
       DATA
       ---------------------------------------------------------- */

    "csv-json": {

      id:
        "csv-json",

      title:
        "CSV → JSON",

      description:
        "แปลง CSV เป็น JSON",

      category:
        "data",

      categoryLabel:
        "DATA CONVERTER",

      inputExtensions:
        ["csv"],

      inputMimeTypes:
        [
          "text/csv",
          "text/plain"
        ],

      outputExtension:
        "json",

      outputMime:
        "application/json",

      supported:
        true,

      convert:
        convertCsvToJson

    },


    "json-csv": {

      id:
        "json-csv",

      title:
        "JSON → CSV",

      description:
        "แปลง JSON เป็น CSV",

      category:
        "data",

      categoryLabel:
        "DATA CONVERTER",

      inputExtensions:
        ["json"],

      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],

      outputExtension:
        "csv",

      outputMime:
        "text/csv;charset=utf-8",

      supported:
        true,

      convert:
        convertJsonToCsv

    },


    "json-xml": {

      id:
        "json-xml",

      title:
        "JSON → XML",

      description:
        "แปลง JSON เป็น XML",

      category:
        "data",

      categoryLabel:
        "DATA CONVERTER",

      inputExtensions:
        ["json"],

      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],

      outputExtension:
        "xml",

      outputMime:
        "application/xml;charset=utf-8",

      supported:
        true,

      convert:
        convertJsonToXml

    },


    "xml-json": {

      id:
        "xml-json",

      title:
        "XML → JSON",

      description:
        "แปลง XML เป็น JSON",

      category:
        "data",

      categoryLabel:
        "DATA CONVERTER",

      inputExtensions:
        ["xml"],

      inputMimeTypes:
        [
          "application/xml",
          "text/xml"
        ],

      outputExtension:
        "json",

      outputMime:
        "application/json",

      supported:
        true,

      convert:
        convertXmlToJson

    },


    "yaml-json": {

      id:
        "yaml-json",

      title:
        "YAML → JSON",

      description:
        "แปลง YAML เป็น JSON สำหรับโครงสร้างพื้นฐานทั่วไป",

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

      supported:
        true,

      convert:
        convertYamlToJson

    },


    "json-yaml": {

      id:
        "json-yaml",

      title:
        "JSON → YAML",

      description:
        "แปลง JSON เป็น YAML",

      category:
        "data",

      categoryLabel:
        "DATA CONVERTER",

      inputExtensions:
        ["json"],

      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],

      outputExtension:
        "yaml",

      outputMime:
        "text/yaml;charset=utf-8",

      supported:
        true,

      convert:
        convertJsonToYaml

    },


    /* ----------------------------------------------------------
       TEXT
       ---------------------------------------------------------- */

    "txt-html": {

      id:
        "txt-html",

      title:
        "TXT → HTML",

      description:
        "แปลง Text เป็น HTML",

      category:
        "text",

      categoryLabel:
        "TEXT CONVERTER",

      inputExtensions:
        ["txt"],

      inputMimeTypes:
        ["text/plain"],

      outputExtension:
        "html",

      outputMime:
        "text/html;charset=utf-8",

      supported:
        true,

      convert:
        convertTxtToHtml

    },


    "html-txt": {

      id:
        "html-txt",

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
        ["text/html"],

      outputExtension:
        "txt",

      outputMime:
        "text/plain;charset=utf-8",

      supported:
        true,

      convert:
        convertHtmlToTxt

    },


    "txt-pdf": {

      id:
        "txt-pdf",

      title:
        "TXT → PDF",

      description:
        "แปลง Text เป็น PDF",

      category:
        "text",

      categoryLabel:
        "TEXT CONVERTER",

      inputExtensions:
        ["txt"],

      inputMimeTypes:
        ["text/plain"],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        true,

      convert:
        convertTextToPdf

    },


    "html-pdf": {

      id:
        "html-pdf",

      title:
        "HTML → PDF",

      description:
        "ดึงข้อความจาก HTML แล้วสร้าง PDF",

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
        ["text/html"],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        true,

      convert:
        convertHtmlToPdf

    },


    "md-html": {

      id:
        "md-html",

      title:
        "Markdown → HTML",

      description:
        "แปลง Markdown เป็น HTML",

      category:
        "text",

      categoryLabel:
        "TEXT CONVERTER",

      inputExtensions:
        ["md"],

      inputMimeTypes:
        [
          "text/markdown",
          "text/plain"
        ],

      outputExtension:
        "html",

      outputMime:
        "text/html;charset=utf-8",

      supported:
        true,

      convert:
        convertMarkdownToHtml

    },


    /* ----------------------------------------------------------
       SPREADSHEET
       ---------------------------------------------------------- */

    "csv-xlsx": {

      id:
        "csv-xlsx",

      title:
        "CSV → XLSX",

      description:
        "แปลง CSV เป็น Excel",

      category:
        "spreadsheet",

      categoryLabel:
        "SPREADSHEET CONVERTER",

      inputExtensions:
        ["csv"],

      inputMimeTypes:
        [
          "text/csv",
          "text/plain"
        ],

      outputExtension:
        "xlsx",

      outputMime:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      supported:
        true,

      convert:
        convertCsvToXlsx

    },


    "xlsx-csv": {

      id:
        "xlsx-csv",

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

      supported:
        true,

      convert:
        convertXlsxToCsv

    },


    "json-xlsx": {

      id:
        "json-xlsx",

      title:
        "JSON → XLSX",

      description:
        "แปลง JSON เป็น Excel",

      category:
        "spreadsheet",

      categoryLabel:
        "SPREADSHEET CONVERTER",

      inputExtensions:
        ["json"],

      inputMimeTypes:
        [
          "application/json",
          "text/json"
        ],

      outputExtension:
        "xlsx",

      outputMime:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      supported:
        true,

      convert:
        convertJsonToXlsx

    },


    "xlsx-pdf": {

      id:
        "xlsx-pdf",

      title:
        "XLSX → PDF",

      description:
        "อ่านตาราง Excel แล้วสร้าง PDF ใหม่",

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

      supported:
        true,

      convert:
        convertXlsxToPdf

    },


    /* ----------------------------------------------------------
       DOCUMENT
       ---------------------------------------------------------- */

    "docx-pdf": {

      id:
        "docx-pdf",

      title:
        "DOCX → PDF",

      description:
        "ดึงข้อความจาก Word แล้วสร้าง PDF",

      category:
        "document",

      categoryLabel:
        "DOCUMENT CONVERTER",

      inputExtensions:
        ["docx"],

      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        true,

      convert:
        convertDocxToPdf

    },


    "pptx-pdf": {

      id:
        "pptx-pdf",

      title:
        "PPTX → PDF",

      description:
        "ดึงข้อความจาก PowerPoint แล้วสร้าง PDF",

      category:
        "document",

      categoryLabel:
        "DOCUMENT CONVERTER",

      inputExtensions:
        ["pptx"],

      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        true,

      convert:
        convertPptxToPdf

    }

  };


  /* ============================================================
     ACCEPT
     ============================================================ */

  function buildAcceptAttribute(
    converter
  ) {

    const extensions =
      converter.inputExtensions
        .map(
          ext =>
            `.${ext}`
        );


    const mimes =
      Array.isArray(
        converter.inputMimeTypes
      )
        ? converter.inputMimeTypes
        : [];


    return [
      ...extensions,
      ...mimes
    ]
      .filter(Boolean)
      .join(",");

  }


  /* ============================================================
     OPEN MODAL
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
        "ไม่พบ Converter ที่เลือก"
      );

      return;

    }


    activeConverterId =
      converterId;


    activeConverter =
      converter;


    previousActiveElement =
      document.activeElement;


    resetConverterState(
      true
    );


    modalTitle.textContent =
      converter.title;


    modalDescription.textContent =
      converter.description;


    modalCategory.textContent =
      converter.categoryLabel;


    supportedFormats.textContent =
      `รองรับ: ${converter.inputExtensions
        .map(
          ext =>
            ext.toUpperCase()
        )
        .join(", ")}`;


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
     CLOSE MODAL
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


    resetConverterState(
      true
    );


    if (
      previousActiveElement &&
      typeof previousActiveElement.focus === "function"
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
     RESET STATE
     ============================================================ */

  function resetConverterState(
    clearSelected
  ) {

    isConverting =
      false;


    hideError();


    resetProgress();


    cleanupResults();


    if (
      clearSelected
    ) {

      selectedFiles =
        [];

    }


    updateFileList();


    resultSection.hidden =
      true;


    resultList.innerHTML =
      "";


    convertButton.disabled =
      selectedFiles.length === 0;


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
     CLEANUP RESULTS
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


  /* ============================================================
     FILE INPUT
     ============================================================ */

  browseFilesButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      if (
        isConverting
      ) {

        return;

      }


      fileInput.click();

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


  /* ============================================================
     DRAG & DROP
     ============================================================ */

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


      const files =
        Array.from(
          event.dataTransfer?.files ||
          []
        );


      addFiles(
        files
      );

    }
  );


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


    const valid =
      [];


    const rejected =
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
          `${file.name}: ใหญ่เกิน ${formatBytes(MAX_FILE_SIZE)}`
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
      selectedFiles.length === 0;


    if (
      rejected.length
    ) {

      showError(
        rejected.join("\n")
      );

    }

  }


  /* ============================================================
     FILE VALIDATION
     ============================================================ */

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


    if (
      mime &&
      converter.inputMimeTypes.includes(
        mime
      )
    ) {

      return true;

    }


    return false;

  }


  /* ============================================================
     FILE LIST
     ============================================================ */

  function updateFileList() {

    fileList.innerHTML =
      "";


    fileCount.textContent =
      `${selectedFiles.length} file${
        selectedFiles.length === 1
          ? ""
          : "s"
      }`;


    fileListSection.hidden =
      selectedFiles.length === 0;


    if (
      selectedFiles.length === 0
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
        !Number.isInteger(index)
      ) {

        return;

      }


      selectedFiles.splice(
        index,
        1
      );


      updateFileList();


      convertButton.disabled =
        selectedFiles.length === 0;

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


      convertButton.disabled =
        true;


      cleanupResults();


      resultSection.hidden =
        true;


      resultList.innerHTML =
        "";


      hideError();


      resetProgress();

    }
  );


  /* ============================================================
     CONVERT BUTTON
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


  /* ============================================================
     RUN CONVERSION
     ============================================================ */

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


    browseFilesButton.disabled =
      true;


    clearFilesButton.disabled =
      true;


    convertButton.disabled =
      true;


    convertButton.classList.add(
      "is-loading"
    );


    convertButton.textContent =
      "กำลังแปลง...";


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
            ) * 100
          ),
          `กำลังแปลง ${index + 1}/${total}: ${file.name}`
        );


        await nextFrame();


        let result;


        try {

          result =
            await activeConverter.convert(
              file,
              activeConverter
            );

        } catch (
          error
        ) {

          throw new Error(
            `${file.name}: ${getErrorMessage(
              error
            )}`
          );

        }


        convertedResults.push(
          result
        );


        setProgress(
          Math.round(
            (
              (index + 1) /
              total
            ) * 100
          ),
          `แปลง ${file.name} สำเร็จ`
        );


        await sleep(
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
     PROGRESS
     ============================================================ */

  function setProgress(
    percent,
    status
  ) {

    const safePercent =
      Math.max(
        0,
        Math.min(
          100,
          Number(percent) || 0
        )
      );


    progressBar.style.width =
      `${safePercent}%`;


    progressPercent.textContent =
      `${safePercent}%`;


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
                  activeConverter.outputExtension ||
                  "FILE"
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
     RESULT FACTORY
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


    const baseName =
      removeExtension(
        originalFile.name
      );


    const cleanExtension =
      safeString(
        extension
      ).replace(
        /^\./,
        ""
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
     IMAGE HELPERS
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
                  "ไม่สามารถสร้างไฟล์รูปผลลัพธ์ได้"
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


  /* ============================================================
     IMAGE CONVERTER
     ============================================================ */

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


    const context =
      canvas.getContext(
        "2d",
        {
          alpha:
            true
        }
      );


    if (
      !context
    ) {

      throw new Error(
        "Canvas ไม่พร้อมใช้งาน"
      );

    }


    if (
      converter.outputMime ===
      "image/jpeg"
    ) {

      context.fillStyle =
        "#ffffff";


      context.fillRect(
        0,
        0,
        width,
        height
      );

    }


    context.drawImage(
      image,
      0,
      0
    );


    const quality =
      converter.outputMime ===
        "image/jpeg"
        ? DEFAULT_JPEG_QUALITY
        : converter.outputMime ===
          "image/webp"
          ? DEFAULT_WEBP_QUALITY
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
        "ไฟล์ SVG ว่างเปล่า"
      );

    }


    const svgBlob =
      new Blob(
        [source],
        {
          type:
            "image/svg+xml"
        }
      );


    const image =
      await loadImage(
        svgBlob
      );


    let width =
      image.naturalWidth ||
      image.width;


    let height =
      image.naturalHeight ||
      image.height;


    if (
      !width ||
      !height
    ) {

      width =
        1024;


      height =
        1024;

    }


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


    const context =
      canvas.getContext(
        "2d"
      );


    if (
      !context
    ) {

      throw new Error(
        "Canvas ไม่พร้อมใช้งาน"
      );

    }


    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    context.drawImage(
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


    const targetSize =
      256;


    const sourceWidth =
      image.naturalWidth ||
      image.width;


    const sourceHeight =
      image.naturalHeight ||
      image.height;


    const scale =
      Math.min(
        targetSize / sourceWidth,
        targetSize / sourceHeight
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
      targetSize;


    canvas.height =
      targetSize;


    const context =
      canvas.getContext(
        "2d"
      );


    if (
      !context
    ) {

      throw new Error(
        "Canvas ไม่พร้อมใช้งาน"
      );

    }


    context.clearRect(
      0,
      0,
      targetSize,
      targetSize
    );


    const x =
      Math.floor(
        (targetSize - drawWidth) / 2
      );


    const y =
      Math.floor(
        (targetSize - drawHeight) / 2
      );


    context.drawImage(
      image,
      x,
      y,
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


    const imageOffset =
      6 + 16;


    const buffer =
      new ArrayBuffer(
        imageOffset +
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
      imageOffset,
      true
    );


    new Uint8Array(
      buffer
    ).set(
      pngBytes,
      imageOffset
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


    const pdfDoc =
      await PDFLib.PDFDocument.create();


    let embedded;


    if (
      file.type === "image/png" ||
      getExtension(file.name) === "png"
    ) {

      embedded =
        await pdfDoc.embedPng(
          await file.arrayBuffer()
        );

    } else {

      const canvas =
        document.createElement(
          "canvas"
        );


      canvas.width =
        width;


      canvas.height =
        height;


      const context =
        canvas.getContext(
          "2d"
        );


      if (
        !context
      ) {

        throw new Error(
          "Canvas ไม่พร้อมใช้งาน"
        );

      }


      context.fillStyle =
        "#ffffff";


      context.fillRect(
        0,
        0,
        width,
        height
      );


      context.drawImage(
        image,
        0,
        0
      );


      const jpeg =
        await canvasToBlob(
          canvas,
          "image/jpeg",
          0.94
        );


      embedded =
        await pdfDoc.embedJpg(
          await jpeg.arrayBuffer()
        );

    }


    const maxPageWidth =
      595.28;


    const maxPageHeight =
      841.89;


    const margin =
      28.35;


    const scale =
      Math.min(
        (
          maxPageWidth -
          margin * 2
        ) / width,
        (
          maxPageHeight -
          margin * 2
        ) / height
      );


    const pageWidth =
      Math.max(
        72,
        width * scale
      );


    const pageHeight =
      Math.max(
        72,
        height * scale
      );


    const page =
      pdfDoc.addPage(
        [
          maxPageWidth,
          maxPageHeight
        ]
      );


    const drawWidth =
      width * Math.min(
        (
          maxPageWidth -
          margin * 2
        ) / width,
        (
          maxPageHeight -
          margin * 2
        ) / height
      );


    const drawHeight =
      height * Math.min(
        (
          maxPageWidth -
          margin * 2
        ) / width,
        (
          maxPageHeight -
          margin * 2
        ) / height
      );


    const x =
      (
        maxPageWidth -
        drawWidth
      ) / 2;


    const y =
      (
        maxPageHeight -
        drawHeight
      ) / 2;


    page.drawImage(
      embedded,
      {
        x,
        y,
        width: drawWidth,
        height: drawHeight
      }
    );


    void pageWidth;
    void pageHeight;


    const bytes =
      await pdfDoc.save();


    const blob =
      new Blob(
        [bytes],
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
     PDF -> RENDER PAGES
     ============================================================ */

  async function renderPdfPages(
    file,
    options = {}
  ) {

    const pdfjsLib =
      await ensurePdfJs();


    const buffer =
      await file.arrayBuffer();


    const loadingTask =
      pdfjsLib.getDocument(
        {
          data:
            buffer
        }
      );


    const pdf =
      await loadingTask.promise;


    const total =
      pdf.numPages;


    const pages =
      [];


    const scale =
      Number(
        options.scale
      ) || 1.5;


    for (
      let pageNumber = 1;
      pageNumber <= total;
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


      const context =
        canvas.getContext(
          "2d",
          {
            alpha:
              false
          }
        );


      if (
        !context
      ) {

        throw new Error(
          "ไม่สามารถสร้าง Canvas สำหรับ PDF ได้"
        );

      }


      await page.render(
        {
          canvasContext:
            context,

          viewport
        }
      ).promise;


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
        {
          scale:
            1.5
        }
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
        {
          scale:
            1.5
        }
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


    const pageTexts =
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


      const lines =
        [];


      let current =
        "";


      let lastY =
        null;


      for (
        const item of content.items
      ) {

        const text =
          safeString(
            item.str
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
            ? item.transform[5]
            : null;


        if (
          lastY !== null &&
          y !== null &&
          Math.abs(
            y - lastY
          ) > 4
        ) {

          if (
            current
          ) {

            lines.push(
              current
            );

            current =
              "";

          }

        }


        current +=
          (
            current
              ? " "
              : ""
          ) +
          text;


        lastY =
          y;

      }


      if (
        current
      ) {

        lines.push(
          current
        );

      }


      pageTexts.push(
        `===== PAGE ${pageNumber} =====\n${
          lines.join("\n")
        }`
      );

    }


    const output =
      pageTexts.join(
        "\n\n"
      );


    const blob =
      blobFrom(
        output,
        converter.outputMime
      );


    return createResult(
      file,
      blob,
      converter.outputExtension
    );

  }


  /* ============================================================
     CSV PARSER
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
      cell.length ||
      row.length
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

    const text =
      await readAsText(
        file
      );


    const rows =
      parseCsv(
        text
      );


    if (
      !rows.length
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
        .slice(
          1
        )
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

                object[header] =
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
      blobFrom(
        output,
        converter.outputMime
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
              item &&
              typeof item === "object"
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


    const escapeCsv =
      value => {

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

          text =
            `"${text.replaceAll(
              '"',
              '""'
            )}"`;

        }


        return text;

      };


    const lines =
      [
        headers
          .map(
            escapeCsv
          )
          .join(",")
      ];


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
            .join(",")
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
      blobFrom(
        output,
        converter.outputMime
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     JSON PARSE
     ============================================================ */

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
     XML ESCAPE
     ============================================================ */

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


    const xmlBody =
      jsonValueToXml(
        data,
        "root"
      );


    const output =
      `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;


    return createResult(
      file,
      blobFrom(
        output,
        converter.outputMime
      ),
      converter.outputExtension
    );

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

    const text =
      await file.text();


    const parser =
      new DOMParser();


    const xml =
      parser.parseFromString(
        text,
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
        "ไม่พบ root ของ XML"
      );

    }


    const data =
      xmlElementToJson(
        root
      );


    const output =
      JSON.stringify(
        {
          [root.nodeName]:
            data
        },
        null,
        2
      );


    return createResult(
      file,
      blobFrom(
        output,
        converter.outputMime
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


    const directText =
      Array.from(
        element.childNodes
      )
      .filter(
        node =>
          node.nodeType ===
          Node.TEXT_NODE
      )
      .map(
        node =>
          safeString(
            node.nodeValue
          )
      )
      .filter(Boolean)
      .join(" ");


    if (
      directText
    ) {

      output._text =
        directText;

    }


    return output;

  }


  /* ============================================================
     YAML
     Simple safe subset parser
     ============================================================ */

  function parseSimpleYaml(
    text
  ) {

    const lines =
      text
        .replace(
          /\t/g,
          "  "
        )
        .split(
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
      const rawLine of lines
    ) {

      if (
        !rawLine.trim()
      ) {

        continue;

      }


      if (
        /^\s*#/.test(
          rawLine
        )
      ) {

        continue;

      }


      const indent =
        rawLine.match(
          /^\s*/
        )[0].length;


      const line =
        rawLine.trim();


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
        line.startsWith("- ")
      ) {

        if (
          !Array.isArray(
            parent
          )
        ) {

          continue;

        }


        parent.push(
          parseYamlScalar(
            line.slice(2)
          )
        );


        continue;

      }


      const colon =
        findYamlColon(
          line
        );


      if (
        colon === -1
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


      const rawValue =
        line.slice(
          colon + 1
        ).trim();


      if (
        rawValue === ""
      ) {

        const nextNonEmpty =
          findNextYamlContent(
            lines,
            lines.indexOf(
              rawLine
            ) + 1
          );


        const nextIsArray =
          nextNonEmpty &&
          nextNonEmpty.text
            .trim()
            .startsWith(
              "- "
            );


        const child =
          nextIsArray
            ? []
            : {};


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
            rawValue
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
      let i = 0;
      i < line.length;
      i++
    ) {

      const char =
        line[i];


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
          !quote
        ) {

          quote =
            char;

        }

      }


      if (
        char === ":" &&
        !quote
      ) {

        return i;

      }

    }


    return -1;

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
        /* ignore */
      }

    }


    return stripYamlQuotes(
      text
    );

  }


  function findNextYamlContent(
    lines,
    startIndex
  ) {

    for (
      let i = startIndex;
      i < lines.length;
      i++
    ) {

      if (
        lines[i].trim()
      ) {

        return {
          text:
            lines[i]
        };

      }

    }


    return null;

  }


  /* ============================================================
     YAML -> JSON
     ============================================================ */

  async function convertYamlToJson(
    file,
    converter
  ) {

    const data =
      parseSimpleYaml(
        await file.text()
      );


    const output =
      JSON.stringify(
        data,
        null,
        2
      );


    return createResult(
      file,
      blobFrom(
        output,
        converter.outputMime
      ),
      converter.outputExtension
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
      blobFrom(
        output,
        converter.outputMime
      ),
      converter.outputExtension
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
      value === null
    ) {

      return "null";

    }


    if (
      typeof value === "string"
    ) {

      if (
        /[:#,\[\]{}&*!|>'"%@`\n]/.test(
          value
        )
      ) {

        return JSON.stringify(
          value
        );

      }


      return value;

    }


    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {

      return String(
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
                lines.shift()
              }\n${
                lines
                  .map(
                    line =>
                      `${indent}  ${line}`
                  )
                  .join(
                    "\n"
                  )
              }`;

            }


            return `${indent}- ${
              jsonToYaml(
                item,
                depth + 1
              )
            }`;

          }
        )
        .join(
          "\n"
        );

    }


    if (
      typeof value === "object"
    ) {

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
              jsonToYaml(
                child,
                depth + 1
              )
            }`;

          }
        )
        .join(
          "\n"
        );

    }


    return "";

  }


  /* ============================================================
     TXT -> HTML
     ============================================================ */

  async function convertTxtToHtml(
    file,
    converter
  ) {

    const text =
      await file.text();


    const title =
      escapeHtml(
        removeExtension(
          file.name
        )
      );


    const body =
      text
        .split(
          /\r?\n\r?\n/
        )
        .map(
          paragraph => {

            const html =
              escapeHtml(
                paragraph
              )
              .replace(
                /\r?\n/g,
                "<br>"
              );


            return `<p>${html}</p>`;

          }
        )
        .join(
          "\n"
        );


    const output =
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
  margin:0 0 16px;
}
</style>
</head>
<body>
${body}
</body>
</html>`;


    return createResult(
      file,
      blobFrom(
        output,
        converter.outputMime
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     HTML -> TXT
     ============================================================ */

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


    const output =
      doc.body
        ? (
            doc.body.innerText ||
            doc.body.textContent ||
            ""
          )
        : (
            doc.documentElement.innerText ||
            doc.documentElement.textContent ||
            ""
          );


    return createResult(
      file,
      blobFrom(
        output.trim(),
        converter.outputMime
      ),
      converter.outputExtension
    );

  }


  /* ============================================================
     MARKDOWN -> HTML
     ============================================================ */

  async function convertMarkdownToHtml(
    file,
    converter
  ) {

    const source =
      await file.text();


    const output =
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
${output}
</body>
</html>`;


    return createResult(
      file,
      blobFrom(
        html,
        converter.outputMime
      ),
      converter.outputExtension
    );

  }


  function markdownToHtml(
    markdown
  ) {

    let html =
      escapeHtml(
        markdown
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
        /^\- (.+)$/gm,
        "<li>$1</li>"
      );


    html =
      html.replace(
        /(<li>.*<\/li>)/gs,
        "<ul>$1</ul>"
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


    html =
      html
        .split(
          /\n{2,}/
        )
        .map(
          block => {

            const trimmed =
              block.trim();


            if (
              !trimmed ||
              /^<h[1-6]>/.test(
                trimmed
              ) ||
              /^<ul>/.test(
                trimmed
              )
            ) {

              return trimmed;

            }


            return `<p>${trimmed.replace(
              /\n/g,
              "<br>"
            )}</p>`;

          }
        )
        .join(
          "\n"
        );


    return html;

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


    const PDFLib =
      await ensurePdfLib();


    const pdfDoc =
      await PDFLib.PDFDocument.create();


    const pageWidth =
      595.28;


    const pageHeight =
      841.89;


    const margin =
      36;


    const font =
      await pdfDoc.embedFont(
        PDFLib.StandardFonts.Helvetica
      );


    const fontSize =
      11;


    const lineHeight =
      16;


    const maxChars =
      92;


    const lines =
      wrapTextSimple(
        text,
        maxChars
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
      blobFrom(
        bytes,
        converter.outputMime
      ),
      converter.outputExtension
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
      converter.outputExtension,
      converter.outputMime
    );

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


    const arrayBuffer =
      await file.arrayBuffer();


    const result =
      await mammoth.extractRawText(
        {
          arrayBuffer
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
      converter.outputExtension,
      converter.outputMime
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


    const slideNames =
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
      !slideNames.length
    ) {

      throw new Error(
        "ไม่พบ slide ใน PPTX"
      );

    }


    const sections =
      [];


    for (
      const slideName of slideNames
    ) {

      const xml =
        await zip
          .files[
            slideName
          ]
          .async(
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
            "a\\:t, t"
          )
        );


      const text =
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
          slideName
        )}\n${text}`
      );

    }


    const output =
      sections.join(
        "\n\n"
      );


    return buildTextPdf(
      file,
      output,
      converter.outputExtension,
      converter.outputMime
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


    const parts =
      [];


    workbook.SheetNames.forEach(
      sheetName => {

        const sheet =
          workbook.Sheets[
            sheetName
          ];


        const csv =
          XLSX.utils.sheet_to_csv(
            sheet
          );


        parts.push(
          `# SHEET: ${sheetName}\n${csv}`
        );

      }
    );


    const output =
      "\uFEFF" +
      parts.join(
        "\r\n\r\n"
      );


    return createResult(
      file,
      blobFrom(
        output,
        converter.outputMime
      ),
      converter.outputExtension
    );

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


    const worksheet =
      XLSX.utils.aoa_to_sheet(
        rows
      );


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
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
      blobFrom(
        bytes,
        converter.outputMime
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


    const parsed =
      parseJson(
        await file.text()
      );


    const rows =
      Array.isArray(
        parsed
      )
        ? parsed
        : [parsed];


    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      );


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
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
      blobFrom(
        bytes,
        converter.outputMime
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
            "array"
        }
      );


    const lines =
      [];


    workbook.SheetNames.forEach(
      sheetName => {

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


        lines.push(
          `SHEET: ${sheetName}`
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
      converter.outputExtension,
      converter.outputMime
    );

  }


  /* ============================================================
     GENERIC TEXT PDF
     ============================================================ */

  async function buildTextPdf(
    file,
    text,
    extension,
    mime
  ) {

    const PDFLib =
      await ensurePdfLib();


    const pdfDoc =
      await PDFLib.PDFDocument.create();


    const pageWidth =
      595.28;


    const pageHeight =
      841.89;


    const margin =
      36;


    const font =
      await pdfDoc.embedFont(
        PDFLib.StandardFonts.Helvetica
      );


    const fontSize =
      10;


    const lineHeight =
      15;


    const lines =
      wrapTextSimple(
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
      const originalLine of lines
    ) {

      if (
        y <=
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


      const line =
        normalizePdfText(
          originalLine
        );


      page.drawText(
        line,
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
      blobFrom(
        bytes,
        mime
      ),
      extension
    );

  }


  /* ============================================================
     PDF TEXT NORMALIZATION
     ============================================================ */

  function normalizePdfText(
    value
  ) {

    /*
       pdf-lib Standard Helvetica does not support
       arbitrary Unicode such as Thai.

       Keep printable Latin/basic text and replace
       unsupported characters so conversion still works.
    */

    return String(
      value ?? ""
    )
      .replace(
        /[^\x09\x0A\x0D\x20-\x7E]/g,
        "?"
      );

  }


  /* ============================================================
     TEXT WRAP
     ============================================================ */

  function wrapTextSimple(
    text,
    maxChars
  ) {

    const normalized =
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
      );


    const paragraphs =
      normalized.split(
        "\n"
      );


    const output =
      [];


    paragraphs.forEach(
      paragraph => {

        if (
          paragraph === ""
        ) {

          output.push(
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


          output.push(
            remaining.slice(
              0,
              cut
            )
          );


          remaining =
            remaining.slice(
              cut
            ).trimStart();

        }


        output.push(
          remaining
        );

      }
    );


    return output;

  }


  /* ============================================================
     NATURAL SORT
     ============================================================ */

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
          activeFilter ===
            "all" ||
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


        const hasVisible =
          cards.some(
            card =>
              !card.hidden
          );


        let visible =
          hasVisible;


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
      visibleCount !==
      0;


    clearSearchButton.hidden =
      !query;


    if (
      query ||
      activeFilter !==
      "all"
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
            card.dataset.converter;


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
     MODAL
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
     BEFORE UNLOAD
     ============================================================ */

  window.addEventListener(
    "beforeunload",
    cleanupResults
  );


  /* ============================================================
     INITIALIZE
     ============================================================ */

  updateFilterButtons();


  applySearchAndFilter();


  console.log(
    "[File Converter] Ready."
  );


})();
