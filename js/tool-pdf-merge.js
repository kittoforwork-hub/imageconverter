(() => {
  'use strict';
  const U = window.Utils;
  const PW = window.PdfWorkerClient;

  const dropzone = document.getElementById('dz-pdf-merge');
  const fileInput = document.getElementById('input-pdf-merge');
  const listEl = document.getElementById('list-pdf-merge');
  const rowTemplate = document.getElementById('tpl-file-row');
  const bulkbar = document.getElementById('bulk-pdf-merge');
  const countEl = document.getElementById('count-pdf-merge');
  const clearAllBtn = document.getElementById('clearAll-pdf-merge');
  const buildBtn = document.getElementById('build-pdf-merge');
  const resultStrip = document.getElementById('result-pdf-merge');
  const resultDownload = document.getElementById('resultDownload-pdf-merge');

  let items = []; // { id, file, thumbUrl, pageCount }
  let seq = 0;
  const result = {};

  function render() {
    listEl.innerHTML = '';
    items.forEach((item, idx) => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector('img').src = item.thumbUrl || '';
      row.querySelector('.js-name').textContent = `${idx + 1}. ${item.file.name}`;
      row.querySelector('.js-meta').textContent = `${item.pageCount || '?'} หน้า · ${U.formatBytes(item.file.size)}`;
      row.querySelector('.js-move-up').disabled = idx === 0;
      row.querySelector('.js-move-down').disabled = idx === items.length - 1;
      row.querySelector('.js-move-up').addEventListener('click', () => moveItem(idx, -1));
      row.querySelector('.js-move-down').addEventListener('click', () => moveItem(idx, 1));
      row.querySelector('.js-remove').addEventListener('click', () => removeItem(item.id));
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
    if (item && item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    items = items.filter(i => i.id !== id);
    render();
  }

  async function addFiles(fileList) {
    if (!PW.supported) {
      alert('เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์');
      return;
    }
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf');
    for (const file of files) {
      if (!U.confirmLargeFile(file, 50,
        `"${file.name}" มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) การรวมไฟล์อาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก`)) {
        continue;
      }
      const entry = { id: 'pdf-' + (++seq), file, thumbUrl: null, pageCount: null };
      items.push(entry);
      render();
      try {
        const bytes = await U.readAsArrayBuffer(file);
        const opened = await PW.openDoc(bytes);
        entry.pageCount = opened.numPages;
        const { blob } = await PW.renderPage(opened.docId, { pageNum: 1, targetWidth: 160, mimeType: 'image/png' });
        entry.thumbUrl = URL.createObjectURL(blob);
        PW.closeDoc(opened.docId).catch(() => {}); // only needed the thumbnail — free the doc right away
      } catch (e) {
        entry.pageCount = '?';
      }
      render();
    }
  }

  clearAllBtn.addEventListener('click', () => {
    items.forEach(i => { if (i.thumbUrl) URL.revokeObjectURL(i.thumbUrl); });
    items = [];
    render();
  });

  buildBtn.addEventListener('click', async () => {
    if (items.length < 2) {
      resultStrip.classList.remove('hidden');
      resultStrip.querySelector('.status').textContent = 'ต้องมีอย่างน้อย 2 ไฟล์ถึงจะรวมได้';
      resultStrip.querySelector('.status').classList.add('is-error');
      return;
    }
    buildBtn.disabled = true;
    buildBtn.textContent = 'กำลังรวม…';
    try {
      // Fresh reads — the thumbnail step above already consumed (and
      // transferred away) its own copies of these buffers.
      const buffers = await Promise.all(items.map(item => U.readAsArrayBuffer(item.file)));
      const { bytes: outBytes, pageCount } = await PW.mergePdfs(buffers);
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = U.replaceObjectUrl(result, 'url', blob);
      resultDownload.href = url;
      resultDownload.download = 'merged.pdf';
      resultStrip.querySelector('.status').textContent = `รวมไฟล์สำเร็จ · ${pageCount} หน้า · ${U.formatBytes(blob.size)}`;
      resultStrip.querySelector('.status').classList.remove('is-error');
      resultStrip.querySelector('.status').classList.add('is-ready');
      resultStrip.classList.remove('hidden');
    } catch (err) {
      resultStrip.querySelector('.status').textContent = 'รวมไฟล์ไม่สำเร็จ: ' + err.message;
      resultStrip.querySelector('.status').classList.add('is-error');
      resultStrip.classList.remove('hidden');
    } finally {
      buildBtn.disabled = false;
      buildBtn.textContent = 'รวมไฟล์';
    }
  });

  U.setupDropzone(dropzone, fileInput, addFiles);

  U.onClearCache(() => {
    if (result.url) { URL.revokeObjectURL(result.url); result.url = null; }
    items.forEach(i => { if (i.thumbUrl) URL.revokeObjectURL(i.thumbUrl); });
    items = [];
    render();
  });
})();
