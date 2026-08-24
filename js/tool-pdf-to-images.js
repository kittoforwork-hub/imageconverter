(() => {
  'use strict';
  const U = window.Utils;

  const dropzone = document.getElementById('dz-pdf-to-images');
  const fileInput = document.getElementById('input-pdf-to-images');
  const bulkbar = document.getElementById('bulk-pdf-to-images');
  const nameEl = bulkbar.querySelector('.js-pdfname');
  const formatEl = document.getElementById('format-pdf-to-images');
  const scaleEl = document.getElementById('scale-pdf-to-images');
  const renderBtn = document.getElementById('render-pdf-to-images');
  const downloadZipBtn = document.getElementById('downloadZip-pdf-to-images');
  const grid = document.getElementById('grid-pdf-to-images');
  const pageTemplate = document.getElementById('tpl-page-thumb');

  let currentFile = null;
  let currentDoc = null;
  let rendered = []; // { pageNum, blob, url }

  async function loadFile(file) {
    currentFile = file;
    nameEl.textContent = file.name;
    bulkbar.classList.remove('hidden');
    grid.innerHTML = '';
    downloadZipBtn.classList.add('hidden');
    rendered = [];

    const bytes = await U.readAsArrayBuffer(file);
    currentDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
  }

  async function renderAll() {
    if (!currentDoc) return;
    renderBtn.disabled = true;
    renderBtn.textContent = 'กำลังแปลง…';
    grid.innerHTML = '';
    rendered = [];

    const format = formatEl.value;
    const scale = parseFloat(scaleEl.value);
    const ext = format === 'image/png' ? 'png' : 'jpg';

    for (let pageNum = 1; pageNum <= currentDoc.numPages; pageNum++) {
      const page = await currentDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(res => canvas.toBlob(res, format, format === 'image/jpeg' ? 0.92 : undefined));
      const url = URL.createObjectURL(blob);
      const name = `${U.baseName(currentFile.name)}-page${String(pageNum).padStart(2, '0')}.${ext}`;
      rendered.push({ pageNum, blob, url, name });

      const card = pageTemplate.content.firstElementChild.cloneNode(true);
      card.querySelector('img').src = url;
      card.querySelector('.js-pagelabel').textContent = `หน้า ${pageNum}`;
      const dl = card.querySelector('.js-download');
      dl.href = url;
      dl.download = name;
      grid.appendChild(card);
    }

    renderBtn.disabled = false;
    renderBtn.textContent = 'แปลงทุกหน้า';
    downloadZipBtn.classList.toggle('hidden', rendered.length === 0);
  }

  downloadZipBtn.addEventListener('click', async () => {
    if (!rendered.length) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = 'กำลังบีบอัด…';
    const zip = new JSZip();
    rendered.forEach(r => zip.file(r.name, r.blob));
    const content = await zip.generateAsync({ type: 'blob' });
    U.downloadBlob(content, `${U.baseName(currentFile.name)}-pages.zip`);
    downloadZipBtn.disabled = false;
    downloadZipBtn.textContent = 'ดาวน์โหลดทั้งหมด (.zip)';
  });

  renderBtn.addEventListener('click', renderAll);

  U.setupDropzone(dropzone, fileInput, (files) => {
    const file = Array.from(files).find(f => f.type === 'application/pdf');
    if (file) loadFile(file);
  });
})();
