/* global importScripts, PDFLib, fontkit, self */
'use strict';

importScripts(
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
);

const {
  PDFDocument,
  rgb,
  degrees
} = PDFLib;

// ------------------------------------------------------------
// Thai font
// ------------------------------------------------------------

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
        (lastErr && lastErr.message)
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

  const bytes = await loadThaiFontBytes();

  return pdfDoc.embedFont(bytes, {
    subset: true
  });
}

// preload font
loadThaiFontBytes().catch(() => {});

// ------------------------------------------------------------
// Watermark helpers
// ------------------------------------------------------------

function normalizeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

/**
 * คำนวณขนาด PNG ให้รักษา aspect ratio
 *
 * imageSize = ความกว้างสูงสุดของรูปในหน่วย PDF points
 */
function getImageSize(image, imageSize) {
  const originalWidth = image.width;
  const originalHeight = image.height;

  if (
    !originalWidth ||
    !originalHeight
  ) {
    return {
      width: imageSize,
      height: imageSize
    };
  }

  const ratio =
    originalHeight / originalWidth;

  return {
    width: imageSize,
    height: imageSize * ratio
  };
}

// ------------------------------------------------------------
// Request handlers
// ------------------------------------------------------------

const handlers = {

  async mergePdfs({ buffers }) {
    const outDoc =
      await PDFDocument.create();

    for (const buffer of buffers) {
      const srcDoc =
        await PDFDocument.load(buffer);

      const copied =
        await outDoc.copyPages(
          srcDoc,
          srcDoc.getPageIndices()
        );

      copied.forEach(page =>
        outDoc.addPage(page)
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

  async buildPagesPdf({
    buffer,
    indices
  }) {
    const srcDoc =
      await PDFDocument.load(buffer);

    const outDoc =
      await PDFDocument.create();

    const copied =
      await outDoc.copyPages(
        srcDoc,
        indices
      );

    copied.forEach(page =>
      outDoc.addPage(page)
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
    const pdfDoc =
      await PDFDocument.load(buffer);

    const pages =
      pdfDoc.getPages();

    const cleanText =
      typeof text === 'string'
        ? text.trim()
        : '';

    const textSize =
      normalizeNumber(size, 48);

    const imageWidth =
      normalizeNumber(
        imageSize,
        180
      );

    const watermarkOpacity =
      clamp(
        normalizeNumber(
          opacity,
          0.5
        ),
        0,
        1
      );

    const watermarkAngle =
      normalizeNumber(
        angle,
        0
      );

    // --------------------------------------------------------
    // Prepare text watermark
    // --------------------------------------------------------

    let font = null;
    let textWidth = 0;

    if (cleanText) {
      font =
        await embedThaiFont(pdfDoc);

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
    // Prepare image watermark
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

    // ต้องมีอย่างน้อย 1 อย่าง
    if (
      !cleanText &&
      !embeddedImage
    ) {
      throw new Error(
        'กรุณาใส่ข้อความหรือเลือกรูปลายน้ำ PNG'
      );
    }

    // --------------------------------------------------------
    // Draw on every page
    // --------------------------------------------------------

    pages.forEach(page => {
      const {
        width,
        height
      } = page.getSize();

      // ----------------------------
      // Text watermark
      // ----------------------------

      if (cleanText && font) {
        page.drawText(cleanText, {
          x:
            width / 2 -
            textWidth / 2,

          y:
            height / 2,

          size: textSize,

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
        });
      }

      // ----------------------------
      // PNG watermark
      // ----------------------------

      if (embeddedImage) {
        const imageDimensions =
          getImageSize(
            embeddedImage,
            imageWidth
          );

        const drawWidth =
          imageDimensions.width;

        const drawHeight =
          imageDimensions.height;

        page.drawImage(
          embeddedImage,
          {
            x:
              width / 2 -
              drawWidth / 2,

            y:
              height / 2 -
              drawHeight / 2,

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
      await PDFDocument.load(buffer);

    const font =
      await embedThaiFont(pdfDoc);

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
            ? (width - textWidth) / 2
            : hSide === 'right'
              ? width -
                textWidth -
                MARGIN
              : MARGIN;

        const y =
          vSide === 'top'
            ? height - MARGIN
            : MARGIN - 10;

        page.drawText(text, {
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
        });
      }
    );

    const bytes =
      await pdfDoc.save();

    return {
      bytes
    };
  }
};

// ------------------------------------------------------------
// Worker RPC
// ------------------------------------------------------------

self.onmessage = async (e) => {
  const {
    reqId,
    type,
    payload
  } = e.data;

  const handler =
    handlers[type];

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

  try {
    const result =
      await handler(
        payload || {}
      );

    const transfer =
      result &&
      result.bytes
        ? [result.bytes.buffer]
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
        (err &&
          err.message) ||
        String(err)
    });
  }
};
