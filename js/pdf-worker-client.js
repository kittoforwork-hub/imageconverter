/* global importScripts, PDFLib, fontkit, self */
'use strict';

// This worker handles the pdf-lib side of things only: merging, extracting
// pages, watermarking, page numbers. pdf-lib is pure JS (no DOM/canvas
// dependency), so it runs here reliably.
//
// Page-to-image rendering (pdf.js) deliberately does NOT live here. pdf.js's
// own worker-fallback path references `document` unconditionally, so if its
// attempt to spin up a nested worker fails (blocked in some browsers for
// cross-origin nested workers), its fallback crashes with "document is not
// defined" instead of recovering — a real limitation in the library, not
// something fixable from our side. Rendering stays on the main thread,
// where it's still kept from freezing the tab via lazy loading, chunked
// rendering with progress feedback, and a cancel button.
importScripts(
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
);

const { PDFDocument, rgb, degrees } = PDFLib;

// ---- Thai font (for watermark / page numbers), fetched once and cached ----
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
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const buf = await res.arrayBuffer();
          if (!buf || buf.byteLength < 1000) throw new Error('ไฟล์ฟอนต์ไม่สมบูรณ์');
          return buf;
        } catch (err) {
          lastErr = err;
        }
      }
      throw new Error('โหลดฟอนต์ภาษาไทยไม่สำเร็จ: ' + (lastErr && lastErr.message));
    })().catch(err => { thaiFontPromise = null; throw err; });
  }
  return thaiFontPromise;
}
async function embedThaiFont(pdfDoc) {
  if (!pdfDoc.registerFontkit) return null;
  if (self.fontkit) pdfDoc.registerFontkit(self.fontkit);
  const bytes = await loadThaiFontBytes();
  return pdfDoc.embedFont(bytes, { subset: true });
}
// Kick this off immediately so it's already cached by the time a
// watermark/page-number request actually needs it.
loadThaiFontBytes().catch(() => {});

// ---------------------------------------------------------------------
// Request handlers. Each returns a plain object that becomes the "result"
// of the RPC response; any Uint8Array field named "bytes" gets its backing
// buffer transferred (zero-copy) back to the main thread automatically.
// ---------------------------------------------------------------------
const handlers = {
  async mergePdfs({ buffers }) {
    const outDoc = await PDFDocument.create();
    for (const buffer of buffers) {
      const srcDoc = await PDFDocument.load(buffer);
      const copied = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copied.forEach(p => outDoc.addPage(p));
    }
    const bytes = await outDoc.save();
    return { bytes, pageCount: outDoc.getPageCount() };
  },

  async buildPagesPdf({ buffer, indices }) {
    const srcDoc = await PDFDocument.load(buffer);
    const outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(srcDoc, indices);
    copied.forEach(p => outDoc.addPage(p));
    const bytes = await outDoc.save();
    return { bytes };
  },

  async applyWatermark({ buffer, text, size, opacity, angle }) {
    const pdfDoc = await PDFDocument.load(buffer);
    const font = await embedThaiFont(pdfDoc);
    const textWidth = font.widthOfTextAtSize(text, size);
    pdfDoc.getPages().forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size,
        font,
        color: rgb(0.45, 0.45, 0.45),
        opacity,
        rotate: degrees(angle)
      });
    });
    const bytes = await pdfDoc.save();
    return { bytes };
  },

  async applyPageNumbers({ buffer, template, startAt, size, position }) {
    const MARGIN = 34;
    const pdfDoc = await PDFDocument.load(buffer);
    const font = await embedThaiFont(pdfDoc);
    const pages = pdfDoc.getPages();
    const total = pages.length;
    pages.forEach((page, idx) => {
      const n = startAt + idx;
      const text = template.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, size);
      const [vSide, hSide] = position.split('-');
      const x = hSide === 'center' ? (width - textWidth) / 2
        : hSide === 'right' ? width - textWidth - MARGIN
          : MARGIN;
      const y = vSide === 'top' ? height - MARGIN : MARGIN - 10;
      page.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
    });
    const bytes = await pdfDoc.save();
    return { bytes };
  }
};

self.onmessage = async (e) => {
  const { reqId, type, payload } = e.data;
  const handler = handlers[type];
  if (!handler) {
    self.postMessage({ reqId, ok: false, error: 'ไม่รู้จักคำสั่ง: ' + type });
    return;
  }
  try {
    const result = await handler(payload || {});
    const transfer = result && result.bytes ? [result.bytes.buffer] : [];
    self.postMessage({ reqId, ok: true, result }, transfer);
  } catch (err) {
    self.postMessage({ reqId, ok: false, error: (err && err.message) || String(err) });
  }
};
