/* global importScripts, PDFLib, self, fetch, AbortController */

'use strict';



// ============================================================
// LOAD LIBRARIES
// ============================================================

importScripts(
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
);



// ============================================================
// PDF-LIB
// ============================================================

const {
  PDFDocument,
  rgb,
  degrees
} = PDFLib;



// ============================================================
// CONFIG
// ============================================================

/*
 * Timeout สำหรับโหลด Font
 *
 * ป้องกันกรณี CDN / GitHub ค้าง
 * จน Worker ต้องรอไม่รู้จบ
 */
const FONT_FETCH_TIMEOUT =
  30000;


/*
 * จำกัดขนาด Template / Text
 *
 * ป้องกัน payload ใหญ่ผิดปกติ
 */
const MAX_TEXT_LENGTH =
  10000;


/*
 * จำกัดจำนวนหน้า
 *
 * เป็น safety guard ฝั่ง worker
 */
const MAX_PAGE_INDEX =
  1000000;



// ============================================================
// THAI FONT
// ============================================================

const THAI_FONT_MIRRORS = [

  'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf',

  'https://cdn.jsdelivr.net/gh/googlefonts/sarabun@main/fonts/ttf/Sarabun-Regular.ttf'

];


let thaiFontPromise =
  null;



// ============================================================
// WORKER ERROR
// ============================================================

function createWorkerError(
  errorKey,
  errorData = {}
) {

  const error =
    new Error(
      errorKey
    );


  error.errorKey =
    errorKey;


  error.errorData =
    (
      errorData &&
      typeof errorData === 'object'
    )
      ? errorData
      : {};


  return error;

}



// ============================================================
// ERROR HELPERS
// ============================================================

function getErrorMessage(
  error
) {

  if (
    error &&
    typeof error.message === 'string' &&
    error.message
  ) {

    return error.message;

  }


  return String(
    error || ''
  );

}



// ============================================================
// FONT FETCH WITH TIMEOUT
// ============================================================

async function fetchWithTimeout(
  url,
  timeout
) {

  const controller =
    typeof AbortController !==
      'undefined'
      ? new AbortController()
      : null;


  let timer =
    null;


  try {

    if (
      controller
    ) {

      timer =
        setTimeout(
          () => {

            try {

              controller.abort();

            } catch (
              _
            ) {}

          },
          timeout
        );

    }


    const response =
      await fetch(
        url,
        controller
          ? {
              signal:
                controller.signal
            }
          : undefined
      );


    return response;

  } finally {

    if (
      timer !== null
    ) {

      clearTimeout(
        timer
      );

    }

  }

}



// ============================================================
// THAI FONT LOADER
// ============================================================

function loadThaiFontBytes() {

  /*
   * ใช้ Promise เดียว
   *
   * request หลายตัวพร้อมกัน
   * จะไม่ fetch font ซ้ำ
   */
  if (
    thaiFontPromise
  ) {

    return thaiFontPromise;

  }


  thaiFontPromise =
    (async () => {

      let lastErr =
        null;


      for (
        const url of
        THAI_FONT_MIRRORS
      ) {

        try {

          const response =
            await fetchWithTimeout(
              url,
              FONT_FETCH_TIMEOUT
            );


          if (
            !response.ok
          ) {

            throw createWorkerError(
              'pdfWorker.fontHttpFailed',
              {
                status:
                  response.status
              }
            );

          }


          const bytes =
            await response.arrayBuffer();


          /*
           * Basic validation
           */
          if (
            !bytes ||
            !(bytes instanceof ArrayBuffer) ||
            bytes.byteLength < 1000
          ) {

            throw createWorkerError(
              'pdfWorker.fontInvalid'
            );

          }


          /*
           * ตรวจ TrueType signature เบื้องต้น
           *
           * TTF ส่วนใหญ่จะขึ้นต้นด้วย:
           *
           * 00 01 00 00
           *
           * หรือ
           *
           * 'true'
           *
           * หรือบางกรณีเป็น OpenType
           */
          try {

            const view =
              new Uint8Array(
                bytes,
                0,
                Math.min(
                  bytes.byteLength,
                  4
                )
              );


            const signature =
              String.fromCharCode(
                ...view
              );


            const isKnownSignature =
              signature ===
                '\x00\x01\x00\x00' ||
              signature ===
                'true' ||
              signature ===
                'OTTO';


            if (
              !isKnownSignature
            ) {

              throw createWorkerError(
                'pdfWorker.fontInvalid'
              );

            }

          } catch (
            error
          ) {

            throw error;

          }


          return bytes;

        } catch (
          error
        ) {

          lastErr =
            error;

        }

      }


      throw createWorkerError(
        'pdfWorker.fontLoadFailed',
        {
          message:
            getErrorMessage(
              lastErr
            )
        }
      );

    })()
      .catch(
        error => {

          /*
           * ให้ request ครั้งถัดไป
           * retry ใหม่ได้
           */
          thaiFontPromise =
            null;


          throw error;

        }
      );


  return thaiFontPromise;

}



// ============================================================
// EMBED THAI FONT
// ============================================================

async function embedThaiFont(
  pdfDoc
) {

  if (
    !pdfDoc ||
    typeof pdfDoc.registerFontkit !==
      'function'
  ) {

    return null;

  }


  /*
   * fontkit จาก UMD
   */
  if (
    self.fontkit
  ) {

    pdfDoc.registerFontkit(
      self.fontkit
    );

  } else {

    throw createWorkerError(
      'pdfWorker.fontkitUnavailable'
    );

  }


  const bytes =
    await loadThaiFontBytes();


  return pdfDoc.embedFont(
    bytes,
    {
      subset:
        true
    }
  );

}



// ============================================================
// PRELOAD FONT
// ============================================================

loadThaiFontBytes()
  .catch(
    () => {}
  );



// ============================================================
// GENERAL HELPERS
// ============================================================

function normalizeNumber(
  value,
  fallback
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;

}



function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );

}



function ensureArrayBuffer(
  value,
  label
) {

  if (
    value instanceof ArrayBuffer
  ) {

    return value;

  }


  if (
    value instanceof Uint8Array
  ) {

    /*
     * ห้ามคืน .buffer ตรง ๆ
     * ถ้า byteOffset ไม่ใช่ 0
     */
    if (
      value.byteOffset === 0 &&
      value.byteLength ===
        value.buffer.byteLength
    ) {

      return value.buffer;

    }


    return value.buffer.slice(
      value.byteOffset,
      value.byteOffset +
        value.byteLength
    );

  }


  throw createWorkerError(
    'pdfWorker.invalidData',
    {
      label:
        label || 'Data'
    }
  );

}



function ensurePayloadObject(
  payload
) {

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {

    throw createWorkerError(
      'pdfWorker.invalidPayload'
    );

  }


  return payload;

}



function normalizeText(
  value,
  fallback = ''
) {

  if (
    typeof value !== 'string'
  ) {

    return fallback;

  }


  const text =
    value.trim();


  if (
    text.length >
    MAX_TEXT_LENGTH
  ) {

    throw createWorkerError(
      'pdfWorker.textTooLong'
    );

  }


  return text;

}



function getImageSize(
  image,
  targetWidth
) {

  const sourceWidth =
    Number(
      image.width
    ) || 1;


  const sourceHeight =
    Number(
      image.height
    ) || 1;


  const width =
    Math.max(
      1,
      targetWidth
    );


  const ratio =
    sourceHeight /
    sourceWidth;


  return {

    width,

    height:
      width *
      ratio

  };

}



// ============================================================
// CENTER ROTATED OBJECT
// ============================================================

function getCenteredRotatedPosition({
  pageWidth,
  pageHeight,
  objectWidth,
  objectHeight,
  angle
}) {

  const radians =
    angle *
    Math.PI /
    180;


  const cos =
    Math.cos(
      radians
    );


  const sin =
    Math.sin(
      radians
    );


  const centerX =
    pageWidth /
    2;


  const centerY =
    pageHeight /
    2;


  const rotatedCenterX =
    (
      objectWidth /
      2
    ) *
      cos -
    (
      objectHeight /
      2
    ) *
      sin;


  const rotatedCenterY =
    (
      objectWidth /
      2
    ) *
      sin +
    (
      objectHeight /
      2
    ) *
      cos;


  return {

    x:
      centerX -
      rotatedCenterX,

    y:
      centerY -
      rotatedCenterY

  };

}



// ============================================================
// SAFE PAGE NUMBER POSITION
// ============================================================

function getPageNumberPosition(
  placement,
  pageWidth,
  pageHeight,
  textWidth,
  textHeight,
  margin
) {

  const parts =
    typeof placement === 'string'
      ? placement.split('-')
      : [];


  const vertical =
    parts[0] ||
    'bottom';


  const horizontal =
    parts[1] ||
    'center';


  let x =
    margin;


  let y =
    margin;


  if (
    horizontal === 'center'
  ) {

    x =
      (
        pageWidth -
        textWidth
      ) /
      2;

  } else if (
    horizontal === 'right'
  ) {

    x =
      pageWidth -
      textWidth -
      margin;

  }


  if (
    vertical === 'top'
  ) {

    y =
      pageHeight -
      margin -
      textHeight;

  } else if (
    vertical === 'center'
  ) {

    y =
      (
        pageHeight -
        textHeight
      ) /
      2;

  }


  /*
   * กันไม่ให้ออกนอกหน้าโดยไม่ตั้งใจ
   */
  x =
    Math.max(
      0,
      x
    );


  y =
    Math.max(
      0,
      y
    );


  return {

    x,

    y

  };

}



// ============================================================
// VALIDATE PAGE INDICES
// ============================================================

function validatePageIndices(
  indices,
  pageCount
) {

  if (
    !Array.isArray(
      indices
    ) ||
    !indices.length
  ) {

    throw createWorkerError(
      'pdfWorker.selectAtLeastOnePage'
    );

  }


  const safeIndices =
    [];


  for (
    const value of
    indices
  ) {

    const index =
      Number(
        value
      );


    if (
      !Number.isInteger(
        index
      ) ||
      index < 0 ||
      index >= pageCount ||
      index > MAX_PAGE_INDEX
    ) {

      continue;

    }


    safeIndices.push(
      index
    );

  }


  if (
    !safeIndices.length
  ) {

    throw createWorkerError(
      'pdfWorker.invalidPageNumbers'
    );

  }


  return safeIndices;

}



// ============================================================
// HANDLERS
// ============================================================

const handlers = {

  // ----------------------------------------------------------
  // MERGE PDF
  // ----------------------------------------------------------

  async mergePdfs(
    rawPayload
  ) {

    const payload =
      ensurePayloadObject(
        rawPayload
      );


    const buffers =
      payload.buffers;


    if (
      !Array.isArray(
        buffers
      ) ||
      !buffers.length
    ) {

      throw createWorkerError(
        'pdfWorker.noPdfFiles'
      );

    }


    const outDoc =
      await PDFDocument.create();


    for (
      let i = 0;
      i < buffers.length;
      i++
    ) {

      const buffer =
        ensureArrayBuffer(
          buffers[i],
          'PDF file'
        );


      let sourceDoc;


      try {

        sourceDoc =
          await PDFDocument.load(
            buffer
          );

      } catch (
        error
      ) {

        throw createWorkerError(
          'pdfWorker.invalidPdf',
          {
            index:
              i + 1,

            message:
              getErrorMessage(
                error
              )
          }
        );

      }


      const copiedPages =
        await outDoc.copyPages(
          sourceDoc,
          sourceDoc.getPageIndices()
        );


      copiedPages.forEach(
        page => {

          outDoc.addPage(
            page
          );

        }
      );

    }


    const bytes =
      await outDoc.save();


    return {

      bytes,

      pageCount:
        outDoc.getPageCount()

    };

  },


  // ----------------------------------------------------------
  // BUILD PDF FROM SELECTED PAGES
  // ----------------------------------------------------------

  async buildPagesPdf(
    rawPayload
  ) {

    const payload =
      ensurePayloadObject(
        rawPayload
      );


    const sourceBuffer =
      ensureArrayBuffer(
        payload.buffer,
        'PDF file'
      );


    const indices =
      payload.indices;


    if (
      !Array.isArray(
        indices
      ) ||
      !indices.length
    ) {

      throw createWorkerError(
        'pdfWorker.selectAtLeastOnePage'
      );

    }


    let srcDoc;


    try {

      srcDoc =
        await PDFDocument.load(
          sourceBuffer
        );

    } catch (
      error
    ) {

      throw createWorkerError(
        'pdfWorker.invalidPdf',
        {
          message:
            getErrorMessage(
              error
            )
        }
      );

    }


    const pageCount =
      srcDoc.getPageCount();


    const safeIndices =
      validatePageIndices(
        indices,
        pageCount
      );


    const outDoc =
      await PDFDocument.create();


    const copiedPages =
      await outDoc.copyPages(
        srcDoc,
        safeIndices
      );


    copiedPages.forEach(
      page => {

        outDoc.addPage(
          page
        );

      }
    );


    const bytes =
      await outDoc.save();


    return {

      bytes

    };

  },


  // ----------------------------------------------------------
  // WATERMARK
  // ----------------------------------------------------------

  async applyWatermark(
    rawPayload
  ) {

    const payload =
      ensurePayloadObject(
        rawPayload
      );


    const sourceBuffer =
      ensureArrayBuffer(
        payload.buffer,
        'PDF file'
      );


    let pdfDoc;


    try {

      pdfDoc =
        await PDFDocument.load(
          sourceBuffer
        );

    } catch (
      error
    ) {

      throw createWorkerError(
        'pdfWorker.invalidPdf',
        {
          message:
            getErrorMessage(
              error
            )
        }
      );

    }


    const pages =
      pdfDoc.getPages();


    if (
      !pages.length
    ) {

      throw createWorkerError(
        'pdfWorker.noPagesForWatermark'
      );

    }


    // --------------------------------------------------------
    // TEXT
    // --------------------------------------------------------

    const cleanText =
      normalizeText(
        payload.text,
        ''
      );


    const textSize =
      clamp(
        normalizeNumber(
          payload.size,
          48
        ),
        1,
        1000
      );


    // --------------------------------------------------------
    // COMMON
    // --------------------------------------------------------

    const watermarkOpacity =
      clamp(
        normalizeNumber(
          payload.opacity,
          0.25
        ),
        0,
        1
      );


    const watermarkAngle =
      normalizeNumber(
        payload.angle,
        0
      );


    const pngSize =
      clamp(
        normalizeNumber(
          payload.imageSize,
          180
        ),
        1,
        5000
      );


    // --------------------------------------------------------
    // PREPARE TEXT
    // --------------------------------------------------------

    let font =
      null;


    let textWidth =
      0;


    let textHeight =
      textSize;


    if (
      cleanText
    ) {

      font =
        await embedThaiFont(
          pdfDoc
        );


      if (
        !font
      ) {

        throw createWorkerError(
          'pdfWorker.watermarkFontUnavailable'
        );

      }


      textWidth =
        font.widthOfTextAtSize(
          cleanText,
          textSize
        );


      if (
        typeof font.heightAtSize ===
          'function'
      ) {

        textHeight =
          font.heightAtSize(
            textSize
          );

      }

    }


    // --------------------------------------------------------
    // PREPARE PNG
    // --------------------------------------------------------

    let embeddedImage =
      null;


    if (
      payload.watermarkImage !==
        undefined &&
      payload.watermarkImage !==
        null
    ) {

      let imageBytes;


      if (
        payload.watermarkImage instanceof
          ArrayBuffer
      ) {

        imageBytes =
          new Uint8Array(
            payload.watermarkImage
          );

      } else if (
        payload.watermarkImage instanceof
          Uint8Array
      ) {

        imageBytes =
          payload.watermarkImage;

      } else {

        throw createWorkerError(
          'pdfWorker.invalidWatermarkPng'
        );

      }


      if (
        !imageBytes.byteLength
      ) {

        throw createWorkerError(
          'pdfWorker.invalidWatermarkPng'
        );

      }


      try {

        embeddedImage =
          await pdfDoc.embedPng(
            imageBytes
          );

      } catch (
        error
      ) {

        throw createWorkerError(
          'pdfWorker.invalidWatermarkPng',
          {
            message:
              getErrorMessage(
                error
              )
          }
        );

      }

    }


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !cleanText &&
      !embeddedImage
    ) {

      throw createWorkerError(
        'pdfWorker.watermarkMissing'
      );

    }


    // --------------------------------------------------------
    // DRAW
    // --------------------------------------------------------

    pages.forEach(
      page => {

        const {
          width,
          height
        } =
          page.getSize();


        // ====================================================
        // TEXT
        // ====================================================

        if (
          cleanText &&
          font
        ) {

          const position =
            getCenteredRotatedPosition(
              {

                pageWidth:
                  width,

                pageHeight:
                  height,

                objectWidth:
                  textWidth,

                objectHeight:
                  textHeight,

                angle:
                  watermarkAngle

              }
            );


          page.drawText(
            cleanText,
            {

              x:
                position.x,

              y:
                position.y,

              size:
                textSize,

              font,

              color:
                rgb(
                  0.45,
                  0.45,
                  0.45
                ),

              opacity:
                watermarkOpacity,

              rotate:
                degrees(
                  watermarkAngle
                )

            }
          );

        }


        // ====================================================
        // PNG
        // ====================================================

        if (
          embeddedImage
        ) {

          const dimensions =
            getImageSize(
              embeddedImage,
              pngSize
            );


          const drawWidth =
            dimensions.width;


          const drawHeight =
            dimensions.height;


          const position =
            getCenteredRotatedPosition(
              {

                pageWidth:
                  width,

                pageHeight:
                  height,

                objectWidth:
                  drawWidth,

                objectHeight:
                  drawHeight,

                angle:
                  watermarkAngle

              }
            );


          page.drawImage(
            embeddedImage,
            {

              x:
                position.x,

              y:
                position.y,

              width:
                drawWidth,

              height:
                drawHeight,

              opacity:
                watermarkOpacity,

              rotate:
                degrees(
                  watermarkAngle
                )

            }
          );

        }

      }
    );


    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const bytes =
      await pdfDoc.save();


    return {

      bytes

    };

  },


  // ----------------------------------------------------------
  // PAGE NUMBERS
  // ----------------------------------------------------------

  async applyPageNumbers(
    rawPayload
  ) {

    const payload =
      ensurePayloadObject(
        rawPayload
      );


    const sourceBuffer =
      ensureArrayBuffer(
        payload.buffer,
        'PDF file'
      );


    let pdfDoc;


    try {

      pdfDoc =
        await PDFDocument.load(
          sourceBuffer
        );

    } catch (
      error
    ) {

      throw createWorkerError(
        'pdfWorker.invalidPdf',
        {
          message:
            getErrorMessage(
              error
            )
        }
      );

    }


    const pages =
      pdfDoc.getPages();


    const total =
      pages.length;


    if (
      !total
    ) {

      throw createWorkerError(
        'pdfWorker.noPagesForPageNumbers'
      );

    }


    const font =
      await embedThaiFont(
        pdfDoc
      );


    if (
      !font
    ) {

      throw createWorkerError(
        'pdfWorker.pageNumberFontUnavailable'
      );

    }


    // --------------------------------------------------------
    // OPTIONS
    // --------------------------------------------------------

    const pageSize =
      clamp(
        normalizeNumber(
          payload.size,
          11
        ),
        1,
        200
      );


    const firstPage =
      Math.trunc(
        normalizeNumber(
          payload.startAt,
          1
        )
      );


    const pageTemplate =
      normalizeText(
        payload.template,
        '{n} / {total}'
      );


    const placement =
      typeof payload.position ===
        'string' &&
      payload.position
        ? payload.position
        : 'bottom-center';


    const MARGIN =
      34;


    // --------------------------------------------------------
    // DRAW PAGE NUMBERS
    // --------------------------------------------------------

    pages.forEach(
      (
        page,
        index
      ) => {

        const pageNumber =
          firstPage +
          index;


        const text =
          pageTemplate
            .replace(
              /\{n\}/g,
              String(
                pageNumber
              )
            )
            .replace(
              /\{total\}/g,
              String(
                total
              )
            );


        const {
          width,
          height
        } =
          page.getSize();


        const textWidth =
          font.widthOfTextAtSize(
            text,
            pageSize
          );


        const textHeight =
          typeof font.heightAtSize ===
            'function'
            ? font.heightAtSize(
                pageSize
              )
            : pageSize;


        const position =
          getPageNumberPosition(
            placement,
            width,
            height,
            textWidth,
            textHeight,
            MARGIN
          );


        page.drawText(
          text,
          {

            x:
              position.x,

            y:
              position.y,

            size:
              pageSize,

            font,

            color:
              rgb(
                0.2,
                0.2,
                0.2
              )

          }
        );

      }
    );


    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const bytes =
      await pdfDoc.save();


    return {

      bytes

    };

  }

};



// ============================================================
// RPC RESPONSE HELPERS
// ============================================================

function normalizeTransferableBytes(
  bytes
) {

  if (
    !(bytes instanceof Uint8Array)
  ) {

    return null;

  }


  /*
   * ถ้า Uint8Array ครอบทั้ง ArrayBuffer
   * สามารถ transfer buffer เดิมได้
   */
  if (
    bytes.byteOffset === 0 &&
    bytes.byteLength ===
      bytes.buffer.byteLength
  ) {

    return {

      bytes,

      buffer:
        bytes.buffer

    };

  }


  /*
   * ถ้าเป็น subarray
   * ต้อง copy ก่อน
   *
   * ไม่เช่นนั้นอาจ transfer data ส่วนเกิน
   */
  const copy =
    new Uint8Array(
      bytes.byteLength
    );


  copy.set(
    bytes
  );


  return {

    bytes:
      copy,

    buffer:
      copy.buffer

  };

}



function postSuccess(
  reqId,
  result
) {

  try {

    const safeResult =
      result &&
      typeof result === 'object'
        ? {
            ...result
          }
        : result;


    const normalized =
      safeResult &&
      safeResult.bytes instanceof
        Uint8Array
        ? normalizeTransferableBytes(
            safeResult.bytes
          )
        : null;


    const transfer =
      normalized
        ? [
            normalized.buffer
          ]
        : [];


    if (
      normalized &&
      safeResult &&
      typeof safeResult === 'object'
    ) {

      safeResult.bytes =
        normalized.bytes;

    }


    self.postMessage(
      {

        reqId,

        ok:
          true,

        result:
          safeResult

      },
      transfer
    );

  } catch (
    error
  ) {

    /*
     * ไม่ควรปล่อย postMessage error
     * ออกไปเป็น unhandled worker exception
     */
    try {

      postWorkerError(
        reqId,
        createWorkerError(
          'pdfWorker.responseFailed',
          {
            message:
              getErrorMessage(
                error
              )
          }
        )
      );

    } catch (
      _
    ) {}

  }

}



function postWorkerError(
  reqId,
  error
) {

  const errorKey =
    error &&
    typeof error.errorKey ===
      'string' &&
    error.errorKey
      ? error.errorKey
      : 'pdfWorker.genericError';


  const errorData =
    error &&
    error.errorData &&
    typeof error.errorData ===
      'object'
      ? error.errorData
      : {};


  const errorMessage =
    error &&
    typeof error.message ===
      'string'
      ? error.message
      : String(
          error || ''
        );


  try {

    self.postMessage(
      {

        reqId,

        ok:
          false,

        errorKey,

        errorData,

        /*
         * fallback / debugging
         */
        error:
          errorMessage

      }
    );

  } catch (
    _
  ) {}

}



// ============================================================
// RPC VALIDATION
// ============================================================

function validateRequestId(
  reqId
) {

  return (
    typeof reqId === 'string' &&
    reqId.length > 0 &&
    reqId.length <= 200
  );

}



// ============================================================
// RPC
// ============================================================

self.onmessage =
  async event => {

    const data =
      event &&
      event.data &&
      typeof event.data ===
        'object'
        ? event.data
        : {};


    const reqId =
      data.reqId;


    const type =
      data.type;


    const payload =
      data.payload;


    // --------------------------------------------------------
    // INVALID REQUEST ID
    // --------------------------------------------------------

    if (
      !validateRequestId(
        reqId
      )
    ) {

      /*
       * ไม่มี reqId ที่ client ใช้จับคู่ได้
       * จึงไม่พยายามส่ง response กลับ
       */
      return;

    }


    // --------------------------------------------------------
    // INVALID COMMAND
    // --------------------------------------------------------

    if (
      typeof type !== 'string' ||
      !type
    ) {

      postWorkerError(
        reqId,
        createWorkerError(
          'pdfWorker.invalidRequest'
        )
      );


      return;

    }


    const handler =
      handlers[type];


    // --------------------------------------------------------
    // UNKNOWN COMMAND
    // --------------------------------------------------------

    if (
      typeof handler !== 'function'
    ) {

      postWorkerError(
        reqId,
        createWorkerError(
          'pdfWorker.unknownCommand',
          {
            type
          }
        )
      );


      return;

    }


    // --------------------------------------------------------
    // EXECUTE
    // --------------------------------------------------------

    try {

      const result =
        await handler(
          payload || {}
        );


      postSuccess(
        reqId,
        result
      );


    } catch (
      error
    ) {

      /*
       * ------------------------------------------------------
       * PRESERVE STRUCTURED WORKER ERROR
       * ------------------------------------------------------
       */
      if (
        error &&
        typeof error.errorKey ===
          'string'
      ) {

        postWorkerError(
          reqId,
          error
        );


        return;

      }


      /*
       * ------------------------------------------------------
       * NORMALIZE UNKNOWN ERROR
       * ------------------------------------------------------
       */
      postWorkerError(
        reqId,
        createWorkerError(
          'pdfWorker.genericError',
          {

            /*
             * ใช้สำหรับ debugging
             * Client เลือกได้ว่าจะนำมาแสดงหรือไม่
             */
            message:
              getErrorMessage(
                error
              )

          }
        )
      );

    }

  };
