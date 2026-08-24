(() => {
  'use strict';
  const U = window.Utils;
  const { PDFDocument, rgb, degrees } = window.PDFLib;

  const dropzone = document.getElementById('dz-pdf-watermark');
  const fileInput = document.getElementById('input-pdf-watermark');
  const formCard = document.getElementById('form-pdf-watermark');
  const nameEl = formCard.querySelector('.js-pdfname');
  const textEl = document.getElementById('text-pdf-watermark');
  const sizeEl = document.getElementById('size-pdf-watermark');
  const opacityEl = document.getElementById('opacity-pdf-watermark');
  const opacityVal = formCard.querySelector('.js-opacity-val');
  const angleEl = document.getElementById('angle-pdf-watermark');
  const applyBtn = document.getElementById('apply-pdf-watermark');
  const downloadBtn = document.getElementById('download-pdf-watermark');
  const statusEl = formCard.querySelector('.js-status');

  let currentFile = null;

  opacityEl.addEventListener('input', () => {
    opacityVal.textContent = Math.round(parseFloat(opacityEl.value) * 100) + '%';
  });

  function loadFile(file) {
    currentFile = file;
    nameEl.textContent = file.name;
    formCard.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    statusEl.textContent = 'พร้อมใส่ลายน้ำ';
    statusEl.classList.remove('is-ready', 'is-error');
  }

  applyBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const text = textEl.value.trim();
    if (!text) return;

    applyBtn.disabled = true;
    applyBtn.textContent = 'กำลังใส่ลายน้ำ…';
    statusEl.classList.remove('is-ready', 'is-error');

    try {
      const bytes = await U.readAsArrayBuffer(currentFile);
      const pdfDoc = await PDFDocument.load(bytes);
      const font = await U.embedThaiFont(pdfDoc);

      const size = parseFloat(sizeEl.value) || 48;
      const opacity = parseFloat(opacityEl.value);
      const angle = parseFloat(angleEl.value) || 0;
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

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      downloadBtn.href = url;
      downloadBtn.download = `${U.baseName(currentFile.name)}-watermark.pdf`;
      downloadBtn.classList.remove('hidden');
      statusEl.textContent = `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;
      statusEl.classList.add('is-ready');
    } catch (err) {
      statusEl.textContent = 'ใส่ลายน้ำไม่สำเร็จ: ' + err.message;
      statusEl.classList.add('is-error');
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = 'ใส่ลายน้ำ';
    }
  });

  U.setupDropzone(dropzone, fileInput, (files) => {
    const file = Array.from(files).find(f => f.type === 'application/pdf');
    if (file) loadFile(file);
  });
})();
