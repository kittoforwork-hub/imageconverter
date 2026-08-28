(() => {
  'use strict';
  const U = window.Utils;
  const { PDFDocument } = window.PDFLib;

  const dropzone = document.getElementById('dz-pdf-from-images');
  const fileInput = document.getElementById('input-pdf-from-images');
  const listEl = document.getElementById('list-pdf-from-images');
  const rowTemplate = document.getElementById('tpl-file-row');
  const bulkbar = document.getElementById('bulk-pdf-from-images');
  const countEl = document.getElementById('count-pdf-from-images');
  const pageSizeEl = document.getElementById('pagesize-pdf-from-images');
  const clearAllBtn = document.getElementById('clearAll-pdf-from-images');
  const buildBtn = document.getElementById('build-pdf-from-images');
  const resultStrip = document.getElementById('result-pdf-from-images');
  const resultStatus = document.getElementById('resultStatus-pdf-from-images');
  const resultDownload = document.getElementById('resultDownload-pdf-from-images');

  const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

  let items = []; // { id, file, url, img }
  let seq = 0;
  const result = {};

  function render() {
    listEl.innerHTML = '';
    items.forEach((item, idx) => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector('img').src = item.url;
      row.querySelector('.js-name').textContent = `${idx + 1}. ${item.file.name}`;
      row.querySelector('.js-meta').textContent = item.img ? `${item.img.naturalWidth}×${item.img.naturalHeight}` : '';
      row.querySelector('.js-move-up').disabled = idx === 0;
      row.querySelector('.js-move-down').disabled = idx === items.length - 1;
      row.querySelector('.js-move-up').addEventListener('click', () => { moveItem(idx, -1); });
      row.querySelector('.js-move-down').addEventListener('click', () => { moveItem(idx, 1); });
      row.querySelector('.js-remove').addEventListener('click', () => { removeItem(item.id); });
      listEl.appendChild(row);
    });
    countEl.textContent = String(items.length);
    bulkbar.classList.toggle('hidden', items.length === 0);
    resultStrip.classList.add('hidden');
  }

  function moveItem(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    render();
  }

  function removeItem(id) {
    const item = items.find(i => i.id === id);
    if (item) URL.revokeObjectURL(item.url);
    items = items.filter(i => i.id !== id);
    render();
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const img = await U.loadImage(url).catch(() => null);
      items.push({ id: 'img-' + (++seq), file, url, img });
    }
    render();
  }

  clearAllBtn.addEventListener('click', () => {
    items.forEach(i => URL.revokeObjectURL(i.url));
    items = [];
    render();
  });

  async function imageToPngBytes(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }

  buildBtn.addEventListener('click', async () => {
    if (!items.length) return;
    const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    if (items.length >= 30 || totalBytes >= 80 * 1024 * 1024) {
      const ok = window.confirm(
        `งานนี้มี ${items.length} รูป รวมประมาณ ${U.formatBytes(totalBytes)}\n\n` +
        'การสร้าง PDF จะใช้หน่วยความจำค่อนข้างมาก ต้องการดำเนินการต่อหรือไม่?'
      );
      if (!ok) return;
    }

    buildBtn.disabled = true;
    buildBtn.textContent = 'กำลังสร้าง…';
    resultStrip.classList.add('hidden');

    try {
      const pdfDoc = await PDFDocument.create();
      const mode = pageSizeEl.value;

      for (const item of items) {
        const type = item.file.type;
        let embedded;
        const bytes = new Uint8Array(await item.file.arrayBuffer());

        if (type === 'image/png') {
          embedded = await pdfDoc.embedPng(bytes);
        } else if (type === 'image/jpeg' || type === 'image/jpg') {
          embedded = await pdfDoc.embedJpg(bytes);
        } else {
          const pngBytes = await imageToPngBytes(item.img);
          embedded = await pdfDoc.embedPng(pngBytes);
        }

        const iw = embedded.width;
        const ih = embedded.height;
        let pageW, pageH, drawW, drawH, x, y;

        if (mode === 'fit') {
          pageW = iw; pageH = ih;
          drawW = iw; drawH = ih; x = 0; y = 0;
        } else {
          [pageW, pageH] = PAGE_SIZES[mode];
          const scale = Math.min(pageW / iw, pageH / ih);
          drawW = iw * scale; drawH = ih * scale;
          x = (pageW - drawW) / 2; y = (pageH - drawH) / 2;
        }

        const page = pdfDoc.addPage([pageW, pageH]);
        page.drawImage(embedded, { x, y, width: drawW, height: drawH });
        await U.yieldToUI();
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = U.replaceObjectUrl(result, 'url', blob);
      resultDownload.href = url;
      resultDownload.download = 'images.pdf';
      resultStatus.textContent = `สร้าง PDF สำเร็จ · ${items.length} หน้า · ${U.formatBytes(blob.size)}`;
      resultStrip.classList.remove('hidden');
    } catch (err) {
      resultStatus.textContent = 'สร้าง PDF ไม่สำเร็จ: ' + err.message;
      resultStrip.classList.remove('hidden');
    } finally {
      buildBtn.disabled = false;
      buildBtn.textContent = 'สร้าง PDF';
    }
  });

  U.setupDropzone(dropzone, fileInput, addFiles);

  U.onClearCache(() => {
    items.forEach(i => URL.revokeObjectURL(i.url));
    if (result.url) { URL.revokeObjectURL(result.url); result.url = null; }
    items = [];
    render();
  });
})();
