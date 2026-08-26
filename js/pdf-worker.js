/* global importScripts, pdfjsLib, PDFLib, fontkit, OffscreenCanvas, self */
'use strict';

// All the CPU/render-heavy PDF work (pdf.js page rasterization, pdf-lib
// parsing/saving) happens in here, off the main thread. The main thread
// only ever sends bytes in and gets bytes/blobs back — it never blocks on
// any of this, so the tab stays responsive no matter how big the file is.
//
// pdf.js normally hands its own binary parsing off to a dedicated worker
// (see GlobalWorkerOptions.workerSrc on the main thread, historically). We
// are already inside a worker here with no further thread to delegate to,
// so pdf.js detects that and parses inline on this same worker thread —
// still off the main/UI thread, which is exactly what we want.
importScripts(
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
);

const { PDFDocument, rgb, degrees } = PDFLib;

const docs = new Map(); // docId -> pdf.js document
let seq = 0;

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
  async openDoc({ buffer }) {
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    const docId = 'doc-' + (++seq);
    docs.set(docId, doc);
    return { docId, numPages: doc.numPages };
  },

  async closeDoc({ docId }) {
    const doc = docs.get(docId);
    if (doc) { doc.destroy(); docs.delete(docId); }
    return {};
  },

  // Renders one page to a blob. Pass either `scale` directly, or
  // `targetWidth` to have the scale computed so every thumbnail comes out
  // the same pixel width regardless of the source page's own size.
  async renderPage({ docId, pageNum, scale, targetWidth, mimeType, quality }) {
    const doc = docs.get(docId);
    if (!doc) throw new Error('เอกสารนี้ถูกปิดไปแล้ว หรือหมดอายุ');
    const page = await doc.getPage(pageNum);
    let useScale = scale || 1;
    if (targetWidth) {
      const base = page.getViewport({ scale: 1 });
      useScale = Math.min(targetWidth / base.width, 2);
    }
    const viewport = page.getViewport({ scale: useScale });
    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    const type = mimeType || 'image/png';
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvas.convertToBlob(
      type === 'image/jpeg' ? { type, quality: quality || 0.92 } : { type }
    );
    return { blob };
  },

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
