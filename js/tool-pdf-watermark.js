(() => {
  'use strict';
  const U = window.Utils;
  const PW = window.PdfWorkerClient;

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
  const result = {}; // holds .url so U.replaceObjectUrl can revoke the previous one

  opacityEl.addEventListener('input', () => {
    opacityVal.textContent = Math.round(parseFloat(opacityEl.value) * 100) + '%';
  });

  function loadFile(file) {
    if (!PW.supported) {
      alert('เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์');
      return;
    }
    if (!U.confirmLargeFile(file, 50,
      'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) การใส่ลายน้ำอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก')) {
      return;
    }
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
      const size = parseFloat(sizeEl.value) || 48;
      const opacity = parseFloat(opacityEl.value);
      const angle = parseFloat(angleEl.value) || 0;

      const { bytes: outBytes } = await PW.applyWatermark(bytes, { text, size, opacity, angle });
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = U.replaceObjectUrl(result, 'url', blob);
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

  U.onClearCache(() => {
    if (result.url) { URL.revokeObjectURL(result.url); result.url = null; }
    currentFile = null;
    formCard.classList.add('hidden');
    downloadBtn.classList.add('hidden');
  });
})();
