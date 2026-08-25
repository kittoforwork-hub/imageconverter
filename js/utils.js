/* global window */
window.Utils = (() => {
  'use strict';

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function baseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }

  function extOf(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toUpperCase() : '—';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /**
   * Wires a dropzone + hidden file input with click/keyboard/drag/paste support.
   * onFiles(FileList) is called whenever files are selected/dropped.
   */
  function setupDropzone(zone, input, onFiles) {
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', () => {
      if (input.files && input.files.length) onFiles(input.files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(evt =>
      zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('drag-over'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === 'dragleave' && e.target !== zone) return;
        zone.classList.remove('drag-over');
      })
    );
    zone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  // Cache the Thai-capable font bytes (Sarabun) so multiple PDF tools share one fetch.
  // NOTE: cdn.jsdelivr.net's /gh/ proxy needs a release tag to resolve a "latest"
  // version, and google/fonts (a huge monorepo) doesn't publish one — so that URL
  // reliably 404s/hangs. raw.githubusercontent.com serves the same file directly
  // and sends Access-Control-Allow-Origin: *, so it works from the browser with no
  // proxy in between. A jsDelivr npm-based mirror is kept as a fallback in case
  // GitHub itself is unreachable.
  const THAI_FONT_MIRRORS = [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/googlefonts/sarabun@main/fonts/ttf/Sarabun-Regular.ttf'
  ];

  let thaiFontPromise = null;
  async function fetchFontWithFallback() {
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
  }

  function loadThaiFontBytes() {
    if (!thaiFontPromise) {
      thaiFontPromise = fetchFontWithFallback().catch(err => {
        // Let a later call retry (e.g. if it failed only because the user was offline).
        thaiFontPromise = null;
        throw err;
      });
    }
    return thaiFontPromise;
  }

  // Kick off the font fetch in the background once the page is idle, so it's
  // already cached in memory by the time someone opens the watermark/page-number
  // tool and clicks apply — removes the wait on first use.
  const scheduleIdle = window.requestIdleCallback || (fn => setTimeout(fn, 800));
  scheduleIdle(() => { loadThaiFontBytes().catch(() => {}); });

  async function embedThaiFont(pdfDoc) {
    if (!pdfDoc.registerFontkit) return null;
    if (window.fontkit) pdfDoc.registerFontkit(window.fontkit);
    const bytes = await loadThaiFontBytes();
    return pdfDoc.embedFont(bytes, { subset: true });
  }

  return {
    formatBytes, baseName, extOf, downloadBlob, setupDropzone,
    readAsArrayBuffer, loadImage, embedThaiFont
  };
})();
