(() => {
  'use strict';
  const U = window.Utils;
  const { PDFDocument, rgb } = window.PDFLib;

  const dropzone = document.getElementById('dz-pdf-pagenumbers');
  const fileInput = document.getElementById('input-pdf-pagenumbers');
  const formCard = document.getElementById('form-pdf-pagenumbers');
  const nameEl = formCard.querySelector('.js-pdfname');
  const templateEl = document.getElementById('template-pdf-pagenumbers');
  const startEl = document.getElementById('start-pdf-pagenumbers');
  const positionEl = document.getElementById('position-pdf-pagenumbers');
  const sizeEl = document.getElementById('size-pdf-pagenumbers');
  const applyBtn = document.getElementById('apply-pdf-pagenumbers');
  const downloadBtn = document.getElementById('download-pdf-pagenumbers');
  const statusEl = formCard.querySelector('.js-status');

  const MARGIN = 34;
  let currentFile = null;
  const result = {};

  function loadFile(file) {
    currentFile = file;
    nameEl.textContent = file.name;
    formCard.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    statusEl.textContent = 'พร้อมใส่เลขหน้า';
    statusEl.classList.remove('is-ready', 'is-error');
  }

  function computePosition(position, width, height, textWidth) {
    const [vSide, hSide] = position.split('-'); // e.g. 'bottom','center'
    const x = hSide === 'center' ? (width - textWidth) / 2
      : hSide === 'right' ? width - textWidth - MARGIN
        : MARGIN;
    const y = vSide === 'top' ? height - MARGIN : MARGIN - 10;
    return { x, y };
  }

  applyBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const template = templateEl.value.trim() || '{n} / {total}';
    const startAt = parseInt(startEl.value, 10) || 1;
    const size = parseFloat(sizeEl.value) || 11;
    const position = positionEl.value;

    applyBtn.disabled = true;
    applyBtn.textContent = 'กำลังใส่เลขหน้า…';
    statusEl.classList.remove('is-ready', 'is-error');

    try {
      const bytes = await U.readAsArrayBuffer(currentFile);
      const pdfDoc = await PDFDocument.load(bytes);
      const font = await U.embedThaiFont(pdfDoc);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      pages.forEach((page, idx) => {
        const n = startAt + idx;
        const text = template.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, size);
        const { x, y } = computePosition(position, width, height, textWidth);
        page.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
      });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = U.replaceObjectUrl(result, 'url', blob);
      downloadBtn.href = url;
      downloadBtn.download = `${U.baseName(currentFile.name)}-numbered.pdf`;
      downloadBtn.classList.remove('hidden');
      statusEl.textContent = `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;
      statusEl.classList.add('is-ready');
    } catch (err) {
      statusEl.textContent = 'ใส่เลขหน้าไม่สำเร็จ: ' + err.message;
      statusEl.classList.add('is-error');
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = 'ใส่เลขหน้า';
    }
  });

  U.setupDropzone(dropzone, fileInput, (files) => {
    const file = Array.from(files).find(f => f.type === 'application/pdf');
    if (file) loadFile(file);
  });

  U.onClearCache(() => {
    if (result.url) { URL.revokeObjectURL(result.url); result.url = null; }
    currentFile = null;
    formCard.classList.add('hidden');
    downloadBtn.classList.add('hidden');
  });
})();
