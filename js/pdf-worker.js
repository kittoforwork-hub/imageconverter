/* global importScripts, PDFLib, fontkit, self */
'use strict';

// This worker handles the pdf-lib side of things only:
// - merge PDFs
// - extract/build pages
// - watermark text
// - watermark PNG
// - page numbers
//
// Page rendering (pdf.js) remains on the main thread.

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

function loadThaiFontBytes() {
  if (!thaiFontPromise) {
    thaiFontPromise = (async () => {
      let lastErr;

      for (const url of THAI_FONT_MIRRORS) {
        try {
          const res = await fetch(url);

          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }

          const buf = await res.arrayBuffer();

          if (!buf || buf.byteLength < 1000) {
            throw new Error(
              'ไฟล์ฟอนต์ไม่สมบูรณ์'
            );
          }

          return buf;

        } catch (err) {
          lastErr = err;
        }
      }

      throw new Error(
        'โหลดฟอนต์ภาษาไทยไม่สำเร็จ: ' +
        (
          lastErr &&
          lastErr.message
            ? lastErr.message
            : String(lastErr)
        )
      );
    })().catch(err => {
      thaiFontPromise = null;
      throw err;
    });
  }

  return thaiFontPromise;
}

async function embedThaiFont(pdfDoc) {
  if (!pdfDoc.registerFontkit) {
    return null;
  }

  if (self.fontkit) {
    pdfDoc.registerFontkit(self.fontkit);
  }

  const bytes =
    await loadThaiFontBytes();

  return pdfDoc.embedFont(
    bytes,
    {
      subset: true
    }
  );
}

// Preload Thai font
loadThaiFontBytes().catch(() => {});


// ============================================================
// GENERIC HELPERS
// ============================================================

function normalizeNumber(
  value,
  fallback
) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}


// ============================================================
// WATERMARK IMAGE SIZE
// ============================================================

function getImageSize(
  image,
  maxWidth
) {
  const originalWidth =
    image.width;

  const originalHeight =
    image.height;

  if (
    !originalWidth ||
    !originalHeight
  ) {
    return {
      width: maxWidth,
      height: maxWidth
    };
  }

  const ratio =
    originalHeight /
    originalWidth;

  return {
    width: maxWidth,
    height: maxWidth * ratio
  };
}


// ============================================================
// CALCULATE ROTATED IMAGE POSITION
//
// pdf-lib rotates around the image's x/y origin.
// This function moves that origin so the visual center
// of the rotated image lands exactly at the page center.
// ============================================================

function getCenteredRotatedImagePosition({
  pageWidth,
  pageHeight,
  imageWidth,
  imageHeight,
  angle
}) {
  const radians =
    angle * Math.PI / 180;

  const cos =
    Math.cos(radians);

  const sin =
    Math.sin(radians);

  const centerX =
    pageWidth / 2;

  const centerY =
    pageHeight / 2;

  /*
   * Center of the image relative to its
   * bottom-left origin after rotation.
   */
  const rotatedCenterX =
    (imageWidth / 2) * cos -
    (imageHeight / 2) * sin;

  const rotatedCenterY =
    (imageWidth / 2) * sin +
    (imageHeight / 2) * cos;

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
// REQUEST HANDLERS
// ============================================================

const handlers = {

  // ----------------------------------------------------------
  // MERGE PDF
  // ----------------------------------------------------------

  async mergePdfs({
    buffers
  }) {
    const outDoc =
      await PDFDocument.create();

    for (const buffer of buffers) {
      const srcDoc =
        await PDFDocument.load(
          buffer
        );

      const copied =
        await outDoc.copyPages(
          srcDoc,
          srcDoc.getPageIndices()
        );

      copied.forEach(page => {
        outDoc.addPage(page);
      });
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
    const srcDoc =
      await PDFDocument.load(
        buffer
      );

    const outDoc =
      await PDFDocument.create();

    const copied =
      await outDoc.copyPages(
        srcDoc,
        indices
      );

    copied.forEach(page => {
      outDoc.addPage(page);
    });

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
    const pdfDoc =
      await PDFDocument.load(
        buffer
      );

    const pages =
      pdfDoc.getPages();


    // --------------------------------------------------------
    // SETTINGS
    // --------------------------------------------------------

    const cleanText =
      typeof text === 'string'
        ? text.trim()
        : '';

    const textSize =
      normalizeNumber(
        size,
        48
      );

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
      normalizeNumber(
        imageSize,
        180
      );


    // --------------------------------------------------------
    // TEXT WATERMARK
    // --------------------------------------------------------

    let font = null;
    let textWidth = 0;

    if (cleanText) {
      font =
        await embedThaiFont(
          pdfDoc
        );

      if (!font) {
        throw new Error(
          'ไม่สามารถโหลดฟอนต์สำหรับลายน้ำข้อความได้'
        );
      }

      textWidth =
        font.widthOfTextAtSize(
          cleanText,
          textSize
        );
    }


    // --------------------------------------------------------
    // PNG WATERMARK
    // --------------------------------------------------------

    let embeddedImage = null;

    if (
      watermarkImage &&
      watermarkImage.byteLength
    ) {
      try {
        embeddedImage =
          await pdfDoc.embedPng(
            new Uint8Array(
              watermarkImage
            )
          );
      } catch (err) {
        throw new Error(
          'ไฟล์ลายน้ำไม่ใช่ PNG ที่ถูกต้อง'
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
      throw new Error(
        'กรุณาใส่ข้อความหรือเลือกรูปลายน้ำ PNG'
      );
    }


    // --------------------------------------------------------
    // DRAW WATERMARK ON EVERY PAGE
    // --------------------------------------------------------

    pages.forEach(page => {

      const {
        width,
        height
      } = page.getSize();


      // ======================================================
      // TEXT WATERMARK
      // ======================================================

      if (
        cleanText &&
        font
      ) {
        page.drawText(
          cleanText,
          {
            x:
              width / 2 -
              textWidth / 2,

            y:
              height / 2,

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


      // ======================================================
      // PNG WATERMARK
      // ======================================================

      if (embeddedImage) {

        const dimensions =
          getImageSize(
            embeddedImage,
            pngSize
          );

        const drawWidth =
          dimensions.width;

        const drawHeight =
          dimensions.height;


        // ----------------------------------------------------
        // IMPORTANT:
        // Correct for pdf-lib rotation origin so that
        // the visual center remains at page center.
        // ----------------------------------------------------

        const position =
          getCenteredRotatedImagePosition(
            {
              pageWidth:
                width,

              pageHeight:
                height,

              imageWidth:
                drawWidth,

              imageHeight:
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

    });


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
    const MARGIN = 34;

    const pdfDoc =
      await PDFDocument.load(
        buffer
      );

    const font =
      await embedThaiFont(
        pdfDoc
      );

    const pages =
      pdfDoc.getPages();

    const total =
      pages.length;

    pages.forEach(
      (page, idx) => {

        const n =
          startAt + idx;

        const text =
          template
            .replace(
              /\{n\}/g,
              String(n)
            )
            .replace(
              /\{total\}/g,
              String(total)
            );

        const {
          width,
          height
        } = page.getSize();

        const textWidth =
          font.widthOfTextAtSize(
            text,
            size
          );

        const [
          vSide,
          hSide
        ] =
          position.split('-');

        const x =
          hSide === 'center'
            ? (
                width -
                textWidth
              ) / 2

            : hSide === 'right'
              ? (
                  width -
                  textWidth -
                  MARGIN
                )

              : MARGIN;

        const y =
          vSide === 'top'
            ? height -
              MARGIN

            : MARGIN -
              10;

        page.drawText(
          text,
          {
            x,
            y,
            size,
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
// WORKER RPC
// ============================================================

self.onmessage = async (e) => {

  const {
    reqId,
    type,
    payload
  } = e.data;

  const handler =
    handlers[type];


  // ----------------------------------------------------------
  // UNKNOWN COMMAND
  // ----------------------------------------------------------

  if (!handler) {
    self.postMessage({
      reqId,
      ok: false,
      error:
        'ไม่รู้จักคำสั่ง: ' +
        type
    });

    return;
  }


  // ----------------------------------------------------------
  // EXECUTE
  // ----------------------------------------------------------

  try {

    const result =
      await handler(
        payload || {}
      );


    // --------------------------------------------------------
    // Transfer generated PDF back to main thread
    // --------------------------------------------------------

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
        ok: true,
        result
      },
      transfer
    );


  } catch (err) {

    self.postMessage({
      reqId,
      ok: false,
      error:
        (
          err &&
          err.message
        ) ||
        String(err)
    });

  }

};
