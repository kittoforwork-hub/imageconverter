/* global importScripts, PDFLib, self */

'use strict';


// ============================================================
// LOAD LIBRARIES
// ============================================================

importScripts(
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
);


const {
  PDFDocument,
  rgb,
  degrees
} = PDFLib;


// ============================================================
// THAI FONT
// ============================================================

const THAI_FONT_MIRRORS = [
  'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf',
  'https://cdn.jsdelivr.net/gh/googlefonts/sarabun@main/fonts/ttf/Sarabun-Regular.ttf'
];

let thaiFontPromise = null;


function createWorkerError(
  errorKey,
  errorData = {}
) {
  const error =
    new Error(errorKey);

  error.errorKey =
    errorKey;

  error.errorData =
    errorData;

  return error;
}


function loadThaiFontBytes() {

  if (!thaiFontPromise) {

    thaiFontPromise =
      (async () => {

        let lastErr = null;


        for (
          const url of
          THAI_FONT_MIRRORS
        ) {

          try {

            const res =
              await fetch(
                url
              );


            if (!res.ok) {

              throw createWorkerError(
                'pdfWorker.fontHttpFailed',
                {
                  status:
                    res.status
                }
              );

            }


            const bytes =
              await res.arrayBuffer();


            if (
              !bytes ||
              bytes.byteLength < 1000
            ) {

              throw createWorkerError(
                'pdfWorker.fontInvalid'
              );

            }


            return bytes;

          } catch (err) {

            lastErr =
              err;

          }
        }


        throw createWorkerError(
          'pdfWorker.fontLoadFailed',
          {
            message:
              lastErr &&
              lastErr.message
                ? lastErr.message
                : String(
                    lastErr || ''
                  )
          }
        );

      })()
        .catch(
          err => {

            thaiFontPromise =
              null;

            throw err;

          }
        );
  }


  return thaiFontPromise;
}


async function embedThaiFont(
  pdfDoc
) {

  if (
    typeof pdfDoc.registerFontkit !==
    'function'
  ) {

    return null;

  }


  if (
    self.fontkit
  ) {

    pdfDoc.registerFontkit(
      self.fontkit
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


// ------------------------------------------------------------
// Preload font
// ------------------------------------------------------------

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

    return value.buffer;

  }


  throw createWorkerError(
    'pdfWorker.invalidData',
    {
      label:
        label || 'Data'
    }
  );
}


// ============================================================
// IMAGE SIZE
// ============================================================

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
      width * ratio
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
    ) * cos -
    (
      objectHeight /
      2
    ) * sin;


  const rotatedCenterY =
    (
      objectWidth /
      2
    ) * sin +
    (
      objectHeight /
      2
    ) * cos;


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
// HANDLERS
// ============================================================

const handlers = {

  // ----------------------------------------------------------
  // MERGE PDF
  // ----------------------------------------------------------

  async mergePdfs({
    buffers
  }) {

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


      const srcDoc =
        await PDFDocument.load(
          buffer
        );


      const copiedPages =
        await outDoc.copyPages(
          srcDoc,
          srcDoc.getPageIndices()
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

  async buildPagesPdf({
    buffer,
    indices
  }) {

    const sourceBuffer =
      ensureArrayBuffer(
        buffer,
        'PDF file'
      );


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


    const srcDoc =
      await PDFDocument.load(
        sourceBuffer
      );


    const pageCount =
      srcDoc.getPageCount();


    const safeIndices =
      indices
        .map(
          Number
        )
        .filter(
          index =>
            Number.isInteger(
              index
            ) &&
            index >= 0 &&
            index < pageCount
        );


    if (
      !safeIndices.length
    ) {

      throw createWorkerError(
        'pdfWorker.invalidPageNumbers'
      );

    }


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

  async applyWatermark({
    buffer,
    text,
    size,
    opacity,
    angle,
    watermarkImage,
    imageSize
  }) {

    const sourceBuffer =
      ensureArrayBuffer(
        buffer,
        'PDF file'
      );


    const pdfDoc =
      await PDFDocument.load(
        sourceBuffer
      );


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
      typeof text === 'string'
        ? text.trim()
        : '';


    const textSize =
      clamp(
        normalizeNumber(
          size,
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
          opacity,
          0.25
        ),
        0,
        1
      );


    const watermarkAngle =
      normalizeNumber(
        angle,
        0
      );


    const pngSize =
      clamp(
        normalizeNumber(
          imageSize,
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


      if (!font) {

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
      watermarkImage &&
      (
        watermarkImage instanceof
          ArrayBuffer ||
        watermarkImage instanceof
          Uint8Array
      )
    ) {

      try {

        const imageBytes =
          watermarkImage instanceof
            Uint8Array
            ? watermarkImage
            : new Uint8Array(
                watermarkImage
              );


        embeddedImage =
          await pdfDoc.embedPng(
            imageBytes
          );

      } catch (_) {

        throw createWorkerError(
          'pdfWorker.invalidWatermarkPng'
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

  async applyPageNumbers({
    buffer,
    template,
    startAt,
    size,
    position
  }) {

    const sourceBuffer =
      ensureArrayBuffer(
        buffer,
        'PDF file'
      );


    const pdfDoc =
      await PDFDocument.load(
        sourceBuffer
      );


    const font =
      await embedThaiFont(
        pdfDoc
      );


    if (!font) {

      throw createWorkerError(
        'pdfWorker.pageNumberFontUnavailable'
      );

    }


    const pages =
      pdfDoc.getPages();


    const total =
      pages.length;


    const pageSize =
      clamp(
        normalizeNumber(
          size,
          11
        ),
        1,
        200
      );


    const firstPage =
      Math.trunc(
        normalizeNumber(
          startAt,
          1
        )
      );


    const pageTemplate =
      typeof template ===
      'string'
        ? template
        : '{n} / {total}';


    const placement =
      typeof position ===
      'string'
        ? position
        : 'bottom-center';


    const MARGIN =
      34;


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


        const [
          vertical,
          horizontal
        ] =
          placement.split(
            '-'
          );


        let x =
          MARGIN;


        if (
          horizontal ===
          'center'
        ) {

          x =
            (
              width -
              textWidth
            ) / 2;

        } else if (
          horizontal ===
          'right'
        ) {

          x =
            width -
            textWidth -
            MARGIN;
        }


        const y =
          vertical ===
          'top'
            ? height -
              MARGIN
            : MARGIN -
              10;


        page.drawText(
          text,
          {

            x,

            y,

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


    const bytes =
      await pdfDoc.save();


    return {
      bytes
    };
  }

};


// ============================================================
// RPC
// ============================================================

self.onmessage =
  async event => {

    const data =
      event.data || {};


    const {
      reqId,
      type,
      payload
    } =
      data;


    const handler =
      handlers[type];


    // --------------------------------------------------------
    // UNKNOWN COMMAND
    // --------------------------------------------------------

    if (!handler) {

      self.postMessage({
        reqId,

        ok:
          false,

        errorKey:
          'pdfWorker.unknownCommand',

        errorData: {
          type
        }
      });


      return;
    }


    try {

      const result =
        await handler(
          payload || {}
        );


      const transfer =
        result &&
        result.bytes
          ? [
              result.bytes.buffer
            ]
          : [];


      self.postMessage(
        {

          reqId,

          ok:
            true,

          result

        },
        transfer
      );


    } catch (
      err
    ) {

      /*
       * ถ้าเป็น error ที่เราสร้างเอง
       * ให้ส่ง key กลับไป
       */
      if (
        err &&
        err.errorKey
      ) {

        self.postMessage({
          reqId,

          ok:
            false,

          errorKey:
            err.errorKey,

          errorData:
            err.errorData || {}
        });


        return;
      }


      /*
       * Error จาก pdf-lib / browser
       *
       * ไม่ส่งข้อความไทยออกจาก Worker
       * ใช้ generic key แทน
       */
      self.postMessage({
        reqId,

        ok:
          false,

        errorKey:
          'pdfWorker.genericError',

        errorData: {

          message:
            (
              err &&
              err.message
            ) ||
            String(
              err
            )
        }
      });
    }
  };
