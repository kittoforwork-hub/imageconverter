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
  let thaiFontPromise = null;
  function loadThaiFontBytes() {
    if (!thaiFontPromise) {
      thaiFontPromise = fetch('https://cdn.jsdelivr.net/gh/google/fonts/ofl/sarabun/Sarabun-Regular.ttf')
        .then(res => {
          if (!res.ok) throw new Error('โหลดฟอนต์ไม่สำเร็จ');
          return res.arrayBuffer();
        });
    }
    return thaiFontPromise;
  }

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
