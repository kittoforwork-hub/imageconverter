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

  /**
   * Hands control back to the browser's event loop for a tick. Sprinkle this
   * inside long synchronous-looking loops (page-by-page PDF rendering, etc.)
   * so the tab can repaint, respond to clicks, and generally not look frozen
   * while working through a big file.
   */
  function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Client-side PDF work (parsing, rendering, re-saving) scales with file
   * size and page count, and it all happens in the tab's own memory — there's
   * no server to offload to. Past a certain size that's genuinely slow and
   * memory-heavy, and a silent freeze reads as "broken" to the user. Call
   * this before starting expensive work on a large file so they get a heads
   * up and a chance to back out instead of just watching the tab stall.
   * Returns true if the caller should proceed.
   */
  function confirmLargeFile(file, thresholdMB, message) {
    if (file.size <= thresholdMB * 1024 * 1024) return true;
    return window.confirm(
      `${message}\n\nขนาดไฟล์: ${formatBytes(file.size)} — ไฟล์ใหญ่ขนาดนี้อาจใช้เวลานานและกินแรมมาก ต้องการดำเนินการต่อหรือไม่?`
    );
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

  // ---------------------------------------------------------------------
  // App-wide reset/cache registry.
  //
  // Every tool below holds file data as blob URLs (URL.createObjectURL) and,
  // for the PDF tools, as pdf.js document objects. Both live outside the
  // normal JS heap (blob URLs pin data in the browser's blob store; pdf.js
  // documents keep decoded page data on a worker thread) so simply losing
  // the JS reference to them does NOT free that memory — each one has to be
  // revoked/destroyed explicitly, or it just accumulates for the life of the
  // tab. That accumulation is what makes a long session feel slower over
  // time. Each tool module registers a cleanup function here; the "clear
  // cache" button in the header calls them all at once.
  const resetHandlers = [];
  function onClearCache(fn) { resetHandlers.push(fn); }
  function clearCache() {
    let count = 0;
    resetHandlers.forEach(fn => {
      try { fn(); count++; } catch (err) { console.warn('clearCache handler failed', err); }
    });
    return count;
  }

  /**
   * Revokes `holder[key]` if it currently holds a blob URL, then stores the
   * new one. Use this instead of a bare URL.createObjectURL assignment
   * anywhere a result gets rebuilt more than once (re-applying a watermark,
   * rebuilding a merge, etc.) so the previous blob doesn't linger unused.
   */
  function replaceObjectUrl(holder, key, blob) {
    if (holder[key]) URL.revokeObjectURL(holder[key]);
    holder[key] = URL.createObjectURL(blob);
    return holder[key];
  }

  // NOTE: Thai-font embedding for the watermark/page-number tools now lives
  // entirely inside js/pdf-worker.js, alongside the pdf-lib calls that
  // actually use it — see that file for the font-fetch logic.

  return {
    formatBytes, baseName, extOf, downloadBlob, setupDropzone,
    readAsArrayBuffer, loadImage,
    onClearCache, clearCache, replaceObjectUrl,
    yieldToUI, confirmLargeFile
  };
})();
