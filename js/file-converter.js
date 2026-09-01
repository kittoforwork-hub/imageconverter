/* ============================================================
   FILE CONVERTER
   /js/file-converter.js

   Main controller for:
   - Search
   - Category filter
   - Converter modal
   - Drag & Drop
   - Multi-file selection
   - File list
   - Progress
   - Download results

   Current working converters:
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
   - JPG  -> PDF
   - PNG  -> PDF
   - Image -> PDF
   - CSV  -> JSON
   - JSON -> CSV
   - JSON -> XML
   - XML  -> JSON
   - TXT  -> HTML
   - HTML -> TXT

   Planned / engine-dependent:
   - PDF -> JPG
   - PDF -> PNG
   - PDF -> TXT
   - DOCX -> PDF
   - XLSX -> PDF
   - PPTX -> PDF
   - CSV  -> XLSX
   - XLSX -> CSV
   - JSON -> XLSX
   - YAML -> JSON
   - JSON -> YAML
   - TXT  -> PDF
   - Markdown -> HTML
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

  /* Drop zone */

  const dropZone =
    document.getElementById("drop-zone");

  const browseFilesButton =
    document.getElementById("browse-files");

  const fileInput =
    document.getElementById("file-input");

  const supportedFormats =
    document.getElementById("supported-formats");

  /* File list */

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

  /* Result */

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


  const missingElement =
    requiredElements.some(
      element => !element
    );


  if (missingElement) {

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


  /* ============================================================
     HELPER
     ============================================================ */

  function safeString(value) {

    return String(
      value ?? ""
    )
      .trim();

  }


  function normalize(value) {

    return safeString(value)
      .toLowerCase();

  }


  function escapeHtml(value) {

    return safeString(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function getExtension(fileName) {

    const name =
      safeString(fileName);

    const index =
      name.lastIndexOf(".");

    if (
      index === -1
    ) {

      return "";

    }

    return name
      .slice(index + 1)
      .toLowerCase();

  }


  function removeExtension(fileName) {

    const name =
      safeString(fileName);

    const index =
      name.lastIndexOf(".");

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


  function formatBytes(bytes) {

    const value =
      Number(bytes) || 0;


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
      value < 1024 * 1024 * 1024
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


  function wait(ms) {

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


  /* ============================================================
     CONVERTER REGISTRY
     ============================================================ */

  const CONVERTERS = {

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
        [
          "image/jpeg"
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
        [
          "image/png"
        ],

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
        [
          "image/jpeg"
        ],

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
        [
          "image/png"
        ],

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
        [
          "image/webp"
        ],

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
        [
          "image/webp"
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
        [
          "image/svg+xml"
        ],

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
          "image/bmp"
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
        [
          "image/gif"
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


    "image-ico": {

      id:
        "image-ico",

      title:
        "Image → ICO",

      description:
        "สร้างไฟล์ ICO / Favicon จากรูปภาพ",

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
          "image/bmp"
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


    "jpg-pdf": {

      id:
        "jpg-pdf",

      title:
        "JPG → PDF",

      description:
        "แปลงรูป JPG / JPEG เป็น PDF",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["jpg", "jpeg"],

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
        "แปลงรูป PNG เป็น PDF",

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
        "รวมรูปภาพหลายรูปเป็น PDF",

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
          "image/bmp"
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


    "csv-json": {

      id:
        "csv-json",

      title:
        "CSV → JSON",

      description:
        "แปลงข้อมูล CSV เป็น JSON",

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
        "แปลงข้อมูล JSON เป็น CSV",

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
        "text/csv",

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
        "แปลงข้อมูล JSON เป็น XML",

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
        "application/xml",

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


    "txt-html": {

      id:
        "txt-html",

      title:
        "TXT → HTML",

      description:
        "แปลงไฟล์ Text เป็น HTML",

      category:
        "text",

      categoryLabel:
        "TEXT CONVERTER",

      inputExtensions:
        ["txt"],

      inputMimeTypes:
        [
          "text/plain"
        ],

      outputExtension:
        "html",

      outputMime:
        "text/html",

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
        "ดึงข้อความออกจาก HTML",

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
        "text/plain",

      supported:
        true,

      convert:
        convertHtmlToTxt
    },


    "pdf-jpg": {

      id:
        "pdf-jpg",

      title:
        "PDF → JPG",

      description:
        "แปลงหน้า PDF เป็น JPG",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        [
          "application/pdf"
        ],

      outputExtension:
        "jpg",

      outputMime:
        "image/jpeg",

      supported:
        false,

      convert:
        null
    },


    "pdf-png": {

      id:
        "pdf-png",

      title:
        "PDF → PNG",

      description:
        "แปลงหน้า PDF เป็น PNG",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        [
          "application/pdf"
        ],

      outputExtension:
        "png",

      outputMime:
        "image/png",

      supported:
        false,

      convert:
        null
    },


    "pdf-txt": {

      id:
        "pdf-txt",

      title:
        "PDF → TXT",

      description:
        "ดึงข้อความออกจาก PDF",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        [
          "application/pdf"
        ],

      outputExtension:
        "txt",

      outputMime:
        "text/plain",

      supported:
        false,

      convert:
        null
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
        [
          "application/pdf"
        ],

      outputExtension:
        "txt",

      outputMime:
        "text/plain",

      supported:
        false,

      convert:
        null
    },


    "pdf-images": {

      id:
        "pdf-images",

      title:
        "PDF → Images",

      description:
        "แยกทุกหน้า PDF เป็นรูปภาพ",

      category:
        "pdf",

      categoryLabel:
        "PDF CONVERTER",

      inputExtensions:
        ["pdf"],

      inputMimeTypes:
        [
          "application/pdf"
        ],

      outputExtension:
        "zip",

      outputMime:
        "application/zip",

      supported:
        false,

      convert:
        null
    },


    "docx-pdf": {

      id:
        "docx-pdf",

      title:
        "DOCX → PDF",

      description:
        "แปลง Word เป็น PDF",

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
        false,

      convert:
        null
    },


    "xlsx-pdf": {

      id:
        "xlsx-pdf",

      title:
        "XLSX → PDF",

      description:
        "แปลง Excel เป็น PDF",

      category:
        "document",

      categoryLabel:
        "DOCUMENT CONVERTER",

      inputExtensions:
        ["xlsx"],

      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        false,

      convert:
        null
    },


    "pptx-pdf": {

      id:
        "pptx-pdf",

      title:
        "PPTX → PDF",

      description:
        "แปลง PowerPoint เป็น PDF",

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
        false,

      convert:
        null
    },


    "txt-pdf": {

      id:
        "txt-pdf",

      title:
        "TXT → PDF",

      description:
        "แปลงไฟล์ Text เป็น PDF",

      category:
        "text",

      categoryLabel:
        "TEXT CONVERTER",

      inputExtensions:
        ["txt"],

      inputMimeTypes:
        [
          "text/plain"
        ],

      outputExtension:
        "pdf",

      outputMime:
        "application/pdf",

      supported:
        false,

      convert:
        null
    },


    "html-pdf": {

      id:
        "html-pdf",

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

      supported:
        false,

      convert:
        null
    },


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
        false,

      convert:
        null
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
        ["xlsx"],

      inputMimeTypes:
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ],

      outputExtension:
        "csv",

      outputMime:
        "text/csv",

      supported:
        false,

      convert:
        null
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
        false,

      convert:
        null
    },


    "yaml-json": {

      id:
        "yaml-json",

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
          "application/yaml"
        ],

      outputExtension:
        "json",

      outputMime:
        "application/json",

      supported:
        false,

      convert:
        null
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
        "text/yaml",

      supported:
        false,

      convert:
        null
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
        "text/html",

      supported:
        false,

      convert:
        null
    }

  };


  /* ============================================================
     CREATE ACCEPT ATTRIBUTE
     ============================================================ */

  function buildAcceptAttribute(
    converter
  ) {

    if (
      !converter
    ) {

      return "";
    }


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


    resetConverterState(
      false
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


    if (
      converter.supported === false
    ) {

      showUnsupportedNotice();

    }


    modal.hidden =
      false;


    previousBodyOverflow =
      document.body.style.overflow;


    document.body.style.overflow =
      "hidden";


    window.setTimeout(
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


    modal.hidden =
      true;


    document.body.style.overflow =
      previousBodyOverflow;


    activeConverterId =
      null;


    activeConverter =
      null;


    resetConverterState(
      false
    );

  }


  /* ============================================================
     RESET
     ============================================================ */

  function resetConverterState(
    clearSelectedFiles = true
  ) {

    isConverting =
      false;


    resetProgress();


    hideError();


    resultSection.hidden =
      true;


    resultList.innerHTML =
      "";


    convertedResults =
      [];


    if (
      clearSelectedFiles
    ) {

      selectedFiles =
        [];

    }


    updateFileList();


    convertButton.disabled =
      true;


    convertButton
      .classList
      .remove(
        "is-loading"
      );


    convertButton.innerHTML =
      `
        <span>Convert</span>
        <span>→</span>
      `;


    browseFilesButton.disabled =
      false;


    clearFilesButton.disabled =
      false;

  }


  /* ============================================================
     UNSUPPORTED NOTICE
     ============================================================ */

  function showUnsupportedNotice() {

    clearSelectedFilesOnly();


    supportedFormats.textContent =
      `${supportedFormats.textContent} • Engine นี้จะเพิ่มในขั้นถัดไป`;


    convertButton.disabled =
      true;

  }


  /* ============================================================
     FILE INPUT
     ============================================================ */

  browseFilesButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      fileInput.click();

    }
  );


  dropZone.addEventListener(
    "click",
    event => {

      if (
        event.target === browseFilesButton
      ) {

        return;
      }


      if (
        browseFilesButton.disabled
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

        fileInput.click();

      }

    }
  );


  fileInput.addEventListener(
    "change",
    event => {

      const files =
        Array.from(
          event.target.files ||
          []
        );


      addFiles(
        files
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
            activeConverter &&
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
      !activeConverter
    ) {

      return;
    }


    if (
      activeConverter.supported === false
    ) {

      showError(
        "Converter นี้กำลังอยู่ในขั้นเตรียม Engine"
      );

      return;
    }


    if (
      !Array.isArray(files) ||
      !files.length
    ) {

      return;
    }


    hideError();


    const validFiles =
      [];


    const rejected =
      [];


    for (
      const file of files
    ) {

      if (
        selectedFiles.length +
        validFiles.length >=
        MAX_FILES
      ) {

        rejected.push(
          `${file.name}: จำนวนไฟล์เกิน ${MAX_FILES} ไฟล์`
        );

        break;
      }


      if (
        file.size >
        MAX_FILE_SIZE
      ) {

        rejected.push(
          `${file.name}: ไฟล์ใหญ่เกิน ${formatBytes(MAX_FILE_SIZE)}`
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


      validFiles.push(
        file
      );

    }


    selectedFiles.push(
      ...validFiles
    );


    if (
      rejected.length
    ) {

      showError(
        rejected.join("\n")
      );

    }


    updateFileList();


    if (
      selectedFiles.length > 0
    ) {

      convertButton.disabled =
        false;

    }

  }


  /* ============================================================
     FILE VALIDATION
     ============================================================ */

  function isFileSupported(
    file,
    converter
  ) {

    if (
      !file ||
      !converter
    ) {

      return false;
    }


    const extension =
      getExtension(
        file.name
      );


    const extensionMatched =
      converter.inputExtensions
        .includes(
          extension
        );


    if (
      extensionMatched
    ) {

      return true;
    }


    const mime =
      normalize(
        file.type
      );


    if (
      mime &&
      converter.inputMimeTypes
        .includes(
          mime
        )
    ) {

      return true;
    }


    return false;

  }


  /* ============================================================
     UPDATE FILE LIST
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
                extension || "FILE"
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
              aria-label="ลบ ${escapeHtml(
                file.name
              )}"
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
        !Number.isInteger(index) ||
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
        selectedFiles.length === 0;

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


      clearSelectedFilesOnly();

    }
  );


  function clearSelectedFilesOnly() {

    selectedFiles =
      [];


    updateFileList();


    convertButton.disabled =
      true;


    hideError();


    resetProgress();


    resultSection.hidden =
      true;


    resultList.innerHTML =
      "";

  }


  /* ============================================================
     CONVERT
     ============================================================ */

  convertButton.addEventListener(
    "click",
    async () => {

      if (
        isConverting
      ) {

        return;
      }


      if (
        !activeConverter
      ) {

        return;
      }


      if (
        activeConverter.supported === false
      ) {

        showError(
          "Converter นี้ยังไม่มี Engine สำหรับการประมวลผล"
        );

        return;
      }


      if (
        selectedFiles.length === 0
      ) {

        showError(
          "กรุณาเลือกไฟล์ก่อน"
        );

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


    resultSection.hidden =
      true;


    resultList.innerHTML =
      "";


    convertedResults =
      [];


    progressSection.hidden =
      false;


    convertButton.disabled =
      true;


    convertButton.classList.add(
      "is-loading"
    );


    convertButton.innerHTML =
      `
        <span>กำลังแปลง...</span>
      `;


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
            (index / total) * 100
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
            ((index + 1) / total) *
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


      convertButton.innerHTML =
        `
          <span>
            Convert
          </span>

          <span>
            →
          </span>
        `;


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
                result.extension ||
                activeConverter.outputExtension ||
                "FILE"
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

      return error.message ||
        "ไม่สามารถแปลงไฟล์ได้";
    }


    return safeString(
      error
    ) ||
      "ไม่สามารถแปลงไฟล์ได้";

  }


  /* ============================================================
     GENERIC RESULT
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
        "Converter ไม่ได้ส่ง Blob กลับมา"
      );

    }


    const baseName =
      removeExtension(
        originalFile.name
      );


    const safeExtension =
      safeString(
        extension
      ).replace(
        /^\./,
        ""
      );


    const outputName =
      `${baseName}.${safeExtension}`;


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
        safeExtension

    };

  }


  /* ============================================================
     IMAGE LOAD
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


  /* ============================================================
     CANVAS TO BLOB
     ============================================================ */

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
                  "เบราว์เซอร์ไม่สามารถสร้างไฟล์ผลลัพธ์ได้"
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


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      image.naturalWidth ||
      image.width;


    canvas.height =
      image.naturalHeight ||
      image.height;


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
        "เบราว์เซอร์ไม่รองรับ Canvas"
      );

    }


    const outputIsJpeg =
      converter.outputMime ===
      "image/jpeg";


    if (
      outputIsJpeg
    ) {

      context.fillStyle =
        "#ffffff";


      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

    }


    context.drawImage(
      image,
      0,
      0
    );


    const blob =
      await canvasToBlob(
        canvas,
        converter.outputMime,
        outputIsJpeg
          ? DEFAULT_JPEG_QUALITY
          : converter.outputMime === "image/webp"
            ? DEFAULT_WEBP_QUALITY
            : undefined
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


    const blob =
      new Blob(
        [source],
        {
          type:
            "image/svg+xml"
        }
      );


    const image =
      await loadImage(
        blob
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
        "เบราว์เซอร์ไม่รองรับ Canvas"
      );

    }


    context.clearRect(
      0,
      0,
      width,
      height
    );


    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );


    const outputBlob =
      await canvasToBlob(
        canvas,
        converter.outputMime
      );


    return createResult(
      file,
      outputBlob,
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


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      size;


    canvas.height =
      size;


    const context =
      canvas.getContext(
        "2d"
      );


    if (
      !context
    ) {

      throw new Error(
        "เบราว์เซอร์ไม่รองรับ Canvas"
      );

    }


    context.clearRect(
      0,
      0,
      size,
      size
    );


    const scale =
      Math.min(
        size / (
          image.naturalWidth ||
          image.width
        ),
        size / (
          image.naturalHeight ||
          image.height
        )
      );


    const drawWidth =
      (
        image.naturalWidth ||
        image.width
      ) * scale;


    const drawHeight =
      (
        image.naturalHeight ||
        image.height
      ) * scale;


    const x =
      (
        size -
        drawWidth
      ) / 2;


    const y =
      (
        size -
        drawHeight
      ) / 2;


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


    const pngBuffer =
      await pngBlob.arrayBuffer();


    const pngBytes =
      new Uint8Array(
        pngBuffer
      );


    if (
      pngBytes.length >
      0xffffffff
    ) {

      throw new Error(
        "ไฟล์ PNG ใหญ่เกินไปสำหรับ ICO"
      );

    }


    const headerSize =
      6;


    const directorySize =
      16;


    const imageOffset =
      headerSize +
      directorySize;


    const icoBuffer =
      new ArrayBuffer(
        imageOffset +
        pngBytes.length
      );


    const view =
      new DataView(
        icoBuffer
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
      size === 256
        ? 0
        : size
    );


    view.setUint8(
      7,
      size === 256
        ? 0
        : size
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
      icoBuffer
    )
      .set(
        pngBytes,
        imageOffset
      );


    const icoBlob =
      new Blob(
        [icoBuffer],
        {
          type:
            "image/x-icon"
        }
      );


    return createResult(
      file,
      icoBlob,
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


    const page =
      fitImageToPdfPage(
        width,
        height
      );


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      Math.ceil(
        page.pixelWidth
      );


    canvas.height =
      Math.ceil(
        page.pixelHeight
      );


    const context =
      canvas.getContext(
        "2d"
      );


    if (
      !context
    ) {

      throw new Error(
        "เบราว์เซอร์ไม่รองรับ Canvas"
      );

    }


    context.fillStyle =
      "#ffffff";


    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    const scale =
      Math.min(
        canvas.width / width,
        canvas.height / height
      );


    const drawWidth =
      width * scale;


    const drawHeight =
      height * scale;


    const x =
      (
        canvas.width -
        drawWidth
      ) / 2;


    const y =
      (
        canvas.height -
        drawHeight
      ) / 2;


    context.drawImage(
      image,
      x,
      y,
      drawWidth,
      drawHeight
    );


    const jpegBlob =
      await canvasToBlob(
        canvas,
        "image/jpeg",
        0.92
      );


    const jpegBuffer =
      await jpegBlob.arrayBuffer();


    const jpegBytes =
      new Uint8Array(
        jpegBuffer
      );


    const pdf =
      buildSingleImagePdf(
        jpegBytes,
        canvas.width,
        canvas.height
      );


    return createResult(
      file,
      pdf,
      converter.outputExtension
    );

  }


  /* ============================================================
     PDF PAGE SIZE
     ============================================================ */

  function fitImageToPdfPage(
    width,
    height
  ) {

    const pageWidth =
      595.28;

    const pageHeight =
      841.89;


    const margin =
      28.35;


    const maxWidth =
      pageWidth -
      margin * 2;


    const maxHeight =
      pageHeight -
      margin * 2;


    const scale =
      Math.min(
        maxWidth / width,
        maxHeight / height
      );


    return {

      width:
        width * scale,

      height:
        height * scale,

      pixelWidth:
        1240,

      pixelHeight:
        1754

    };

  }


  /* ============================================================
     PDF GENERATOR
     Basic single-image PDF
     ============================================================ */

  function buildSingleImagePdf(
    jpegBytes,
    imageWidth,
    imageHeight
  ) {

    const pageWidth =
      595.28;


    const pageHeight =
      841.89;


    const margin =
      28.35;


    const maxWidth =
      pageWidth -
      margin * 2;


    const maxHeight =
      pageHeight -
      margin * 2;


    const ratio =
      Math.min(
        maxWidth / imageWidth,
        maxHeight / imageHeight
      );


    const drawWidth =
      imageWidth *
      ratio;


    const drawHeight =
      imageHeight *
      ratio;


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


    const content =
      [
        "q",
        "0 0 0 rg",
        `${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`,
        "/Im0 Do",
        "Q"
      ].join(
        "\n"
      );


    const objects =
      [];


    objects.push(
      `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`
    );


    objects.push(
      `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`
    );


    objects.push(
      `3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}]
/Resources <<
  /ProcSet [/PDF /ImageC]
  /XObject << /Im0 4 0 R >>
>>
/Contents 5 0 R
>>
endobj`
    );


    objects.push(
      `4 0 obj
<<
/Type /XObject
/Subtype /Image
/Width ${imageWidth}
/Height ${imageHeight}
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter /DCTDecode
/Length ${jpegBytes.length}
>>
stream
`,
      jpegBytes,
      `
endstream
endobj`
    );


    const contentBytes =
      new TextEncoder()
        .encode(
          content
        );


    objects.push(
      `5 0 obj
<< /Length ${contentBytes.length} >>
stream
${content}
endstream
endobj`
    );


    const header =
      "%PDF-1.4\n%ÿÿÿÿ\n";


    const chunks =
      [
        new TextEncoder().encode(
          header
        )
      ];


    const offsets =
      [
        0
      ];


    let currentOffset =
      chunks[0].length;


    for (
      let index = 0;
      index < objects.length;
      index++
    ) {

      offsets.push(
        currentOffset
      );


      const object =
        objects[index];


      if (
        Array.isArray(
          object
        )
      {

        const firstPart =
          new TextEncoder().encode(
            object[0]
          );


        chunks.push(
          firstPart
        );


        currentOffset +=
          firstPart.length;


        chunks.push(
          object[1]
        );


        currentOffset +=
          object[1].length;


        const thirdPart =
          new TextEncoder().encode(
            object[2]
          );


        chunks.push(
          thirdPart
        );


        currentOffset +=
          thirdPart.length;

      } else {

        const bytes =
          new TextEncoder().encode(
            object
          );


        chunks.push(
          bytes
        );


        currentOffset +=
          bytes.length;
      }

    }


    const xrefOffset =
      currentOffset;


    const xrefLines =
      [];


    xrefLines.push(
      `xref`
    );


    xrefLines.push(
      `0 ${objects.length + 1}`
    );


    xrefLines.push(
      `0000000000 65535 f `
    );


    for (
      let index = 1;
      index < offsets.length;
      index++
    ) {

      xrefLines.push(
        `${String(
          offsets[index]
        ).padStart(
          10,
          "0"
        )} 00000 n `
      );

    }


    const trailer =
      [
        xrefLines.join("\n"),
        "",
        `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>`,
        "startxref",
        String(
          xrefOffset
        ),
        "%%EOF"
      ].join(
        "\n"
      );


    chunks.push(
      new TextEncoder().encode(
        trailer
      )
    );


    return new Blob(
      chunks,
      {
        type:
          "application/pdf"
      }
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
      let index = 0;
      index < text.length;
      index++
    ) {

      const char =
        text[index];


      const next =
        text[index + 1];


      if (
        char === '"'
      ) {

        if (
          inQuotes &&
          next === '"'
        ) {

          cell +=
            '"';

          index++;

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

          index++;

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

    const text =
      await file.text();


    const rows =
      parseCsv(
        text
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
          value ||
          `column_${index + 1}`
      );


    const data =
      rows
        .slice(1)
        .filter(
          row =>
            row.some(
              cell =>
                cell !== ""
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


    const blob =
      new Blob(
        [output],
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
     JSON -> CSV
     ============================================================ */

  async function convertJsonToCsv(
    file,
    converter
  ) {

    const text =
      await file.text();


    let data;


    try {

      data =
        JSON.parse(
          text
        );

    } catch {

      throw new Error(
        "ไฟล์ JSON ไม่ถูกต้อง"
      );

    }


    if (
      !Array.isArray(
        data
      )
    ) {

      data =
        [data];

    }


    if (
      data.length === 0
    ) {

      throw new Error(
        "JSON ไม่มีข้อมูล"
      );

    }


    const headers =
      Array.from(
        new Set(
          data.flatMap(
            item =>
              Object.keys(
                item &&
                typeof item === "object"
                  ? item
                  : {}
              )
          )
        )
      );


    if (
      headers.length === 0
    ) {

      throw new Error(
        "ไม่พบข้อมูลแบบ Object ใน JSON"
      );

    }


    const escapeCsv =
      value => {

        let output;


        if (
          value === null ||
          value === undefined
        ) {

          output =
            "";

        } else if (
          typeof value === "object"
        ) {

          output =
            JSON.stringify(
              value
            );

        } else {

          output =
            String(
              value
            );

        }


        if (
          /[",\n\r]/.test(
            output
          )
        ) {

          output =
            `"${output.replaceAll(
              '"',
              '""'
            )}"`;

        }


        return output;

      };


    const lines =
      [];


    lines.push(
      headers
        .map(escapeCsv)
        .join(",")
    );


    data.forEach(
      item => {

        const row =
          headers.map(
            header =>
              escapeCsv(
                item &&
                typeof item === "object"
                  ? item[header]
                  : ""
              )
          );


        lines.push(
          row.join(",")
        );

      }
    );


    const output =
      lines.join(
        "\r\n"
      );


    const blob =
      new Blob(
        [output],
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
     JSON -> XML
     ============================================================ */

  async function convertJsonToXml(
    file,
    converter
  ) {

    const text =
      await file.text();


    let data;


    try {

      data =
        JSON.parse(
          text
        );

    } catch {

      throw new Error(
        "ไฟล์ JSON ไม่ถูกต้อง"
      );

    }


    const xml =
      jsonToXml(
        data,
        "root"
      );


    const output =
      `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;


    const blob =
      new Blob(
        [output],
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


  function escapeXml(
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
        /[^a-zA-Z0-9_.-]+/g,
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


  function jsonToXml(
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
            jsonToXml(
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
          jsonToXml(
            childValue,
            childKey
          )
      )
      .join(
        ""
      );


    return `
<${tag}>
${children}
</${tag}>`.trim();

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


    if (
      !text.trim()
    ) {

      throw new Error(
        "XML ไม่มีข้อมูล"
      );

    }


    const parser =
      new DOMParser();


    const xml =
      parser.parseFromString(
        text,
        "application/xml"
      );


    const parserError =
      xml.querySelector(
        "parsererror"
      );


    if (
      parserError
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


    const data =
      xmlElementToJson(
        root
      );


    const output =
      JSON.stringify(
        data,
        null,
        2
      );


    const blob =
      new Blob(
        [output],
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


    if (
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


      output[
        "_attributes"
      ] =
        attributes;

    }


    return output;

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


    const escaped =
      escapeHtml(
        text
      );


    const paragraphs =
      escaped
        .split(
          /\r?\n\r?\n/
        )
        .map(
          paragraph =>
            `<p>${paragraph.replace(
              /\r?\n/g,
              "<br>"
            )}</p>`
        )
        .join(
          "\n"
        );


    const html =
      `<!DOCTYPE html>
<html lang="en">
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
${paragraphs}
</body>
</html>`;


    const blob =
      new Blob(
        [html],
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
     HTML -> TXT
     ============================================================ */

  async function convertHtmlToTxt(
    file,
    converter
  ) {

    const text =
      await file.text();


    const parser =
      new DOMParser();


    const documentObject =
      parser.parseFromString(
        text,
        "text/html"
      );


    const output =
      documentObject.body
        ? documentObject.body.innerText
        : documentObject.documentElement
          ? documentObject.documentElement.innerText
          : "";


    const blob =
      new Blob(
        [output],
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

        const cardCategory =
          normalize(
            card.dataset.category
          );


        const cardSearch =
          normalize(
            [
              card.dataset.name,
              card.textContent,
              card.dataset.converter
            ].join(" ")
          );


        const categoryMatched =
          activeFilter ===
          "all" ||
          cardCategory ===
          activeFilter;


        const searchMatched =
          !query ||
          cardSearch.includes(
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

        const cards =
          Array.from(
            section.querySelectorAll(
              ".converter-card"
            )
          );


        const visibleCards =
          cards.filter(
            card =>
              !card.hidden
          );


        const categoryName =
          section.dataset.categorySection;


        const sectionIsPopular =
          categoryName ===
          "popular";


        const hasVisible =
          visibleCards.length >
          0;


        let showSection =
          hasVisible;


        if (
          query
        ) {

          /*
             Popular section disappears during search
             to avoid duplicate results.
          */

          if (
            sectionIsPopular
          ) {

            showSection =
              false;

          }

        }


        section.hidden =
          !showSection;

      }
    );


    /*
       During filtering, the page may have duplicate
       cards in Popular + main category.
       visibleCount counts them all.
    */

    emptyState.hidden =
      visibleCount >
      0;


    clearSearchButton.hidden =
      !query;


    if (
      query ||
      activeFilter !==
        "all"
    ) {

      const filterText =
        activeFilter === "all"
          ? "ทุกหมวด"
          : activeFilter;


      searchResultInfo.textContent =
        `${visibleCount} รายการ • ${filterText}`;

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

        const active =
          button.dataset.filter ===
          activeFilter;


        button.classList.toggle(
          "active",
          active
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
        event.target.matches(
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
     RELEASE OBJECT URLS
     ============================================================ */

  window.addEventListener(
    "beforeunload",
    () => {

      convertedResults.forEach(
        result => {

          if (
            result?.url
          ) {

            URL.revokeObjectURL(
              result.url
            );

          }

        }
      );

    }
  );


  /* ============================================================
     INITIALIZE
     ============================================================ */

  updateFilterButtons();


  applySearchAndFilter();


  console.log(
    "[File Converter] Initialized."
  );


})();
