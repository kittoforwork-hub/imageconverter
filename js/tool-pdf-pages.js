(() => {
  'use strict';
  const U = window.Utils;
  const { PDFDocument } = window.PDFLib;

  const dropzone = document.getElementById('dz-pdf-pages');
  const fileInput = document.getElementById('input-pdf-pages');
  const bulkbar = document.getElementById('bulk-pdf-pages');
  const nameEl = bulkbar.querySelector('.js-pdfname');
  const countEl = document.getElementById('count-pdf-pages');
  const selectAllEl = document.getElementById('selectAll-pdf-pages');
  const downloadBtn = document.getElementById('download-pdf-pages');
  const downloadSelectedBtn = document.getElementById('downloadSelected-pdf-pages');
  const noteEl = document.getElementById('note-pdf-pages');
  const grid = document.getElementById('grid-pdf-pages');
  const cardTemplate = document.getElementById('tpl-page-manage');

  let currentFile = null;
  let pageItems = []; // { origIndex, thumbUrl, deleted, selected }

  async function loadFile(file) {
    currentFile = file;
    nameEl.textContent = file.name;
    grid.innerHTML = '';
    pageItems = [];
    bulkbar.classList.remove('hidden');
    noteEl.classList.remove('hidden');

    const bytesForView = await U.readAsArrayBuffer(file);
    const pdfjsDoc = await pdfjsLib.getDocument({ data: bytesForView }).promise;

    for (let i = 0; i < pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const url = canvas.toDataURL('image/png');
      pageItems.push({ origIndex: i, thumbUrl: url, deleted: false, selected: false });
    }

    countEl.textContent = String(pageItems.length);
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = '';
    pageItems.forEach((item, idx) => {
      const card = cardTemplate.content.firstElementChild.cloneNode(true);
      card.classList.toggle('is-deleted', item.deleted);
      card.querySelector('img').src = item.thumbUrl;
      card.querySelector('.js-pagelabel').textContent = `หน้า ${idx + 1}`;

      const selectCb = card.querySelector('.js-select');
      selectCb.checked = item.selected;
      selectCb.addEventListener('change', () => { item.selected = selectCb.checked; });

      const upBtn = card.querySelector('.js-move-up');
      const downBtn = card.querySelector('.js-move-down');
      upBtn.disabled = idx === 0;
      downBtn.disabled = idx === pageItems.length - 1;
      upBtn.addEventListener('click', () => { moveItem(idx, -1); });
      downBtn.addEventListener('click', () => { moveItem(idx, 1); });

      const delBtn = card.querySelector('.js-delete');
      delBtn.title = item.deleted ? 'กู้คืนหน้านี้' : 'ลบหน้านี้';
      delBtn.textContent = item.deleted ? '↺' : '✕';
      delBtn.addEventListener('click', () => { item.deleted = !item.deleted; renderGrid(); });

      grid.appendChild(card);
    });
  }

  function moveItem(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= pageItems.length) return;
    [pageItems[idx], pageItems[j]] = [pageItems[j], pageItems[idx]];
    renderGrid();
  }

  selectAllEl.addEventListener('change', () => {
    pageItems.forEach(i => { i.selected = selectAllEl.checked; });
    renderGrid();
  });

  async function buildPdf(indices) {
    const srcBytes = await U.readAsArrayBuffer(currentFile);
    const srcDoc = await PDFDocument.load(srcBytes);
    const outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(srcDoc, indices);
    copied.forEach(p => outDoc.addPage(p));
    const bytes = await outDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  downloadBtn.addEventListener('click', async () => {
    const indices = pageItems.filter(i => !i.deleted).map(i => i.origIndex);
    if (!indices.length) return;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'กำลังสร้าง…';
    try {
      const blob = await buildPdf(indices);
      U.downloadBlob(blob, `${U.baseName(currentFile.name)}-edited.pdf`);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'ดาวน์โหลด PDF (ตามลำดับ/ลบแล้ว)';
    }
  });

  downloadSelectedBtn.addEventListener('click', async () => {
    const indices = pageItems.filter(i => i.selected).map(i => i.origIndex);
    if (!indices.length) return;
    downloadSelectedBtn.disabled = true;
    downloadSelectedBtn.textContent = 'กำลังสร้าง…';
    try {
      const blob = await buildPdf(indices);
      U.downloadBlob(blob, `${U.baseName(currentFile.name)}-selected.pdf`);
    } finally {
      downloadSelectedBtn.disabled = false;
      downloadSelectedBtn.textContent = 'ดาวน์โหลดเฉพาะที่เลือก';
    }
  });

  U.setupDropzone(dropzone, fileInput, (files) => {
    const file = Array.from(files).find(f => f.type === 'application/pdf');
    if (file) loadFile(file);
  });
})();
