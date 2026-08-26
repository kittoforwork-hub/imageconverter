(() => {
  'use strict';
  const U = window.Utils;
  const PW = window.PdfWorkerClient;

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

  // Thumbnails target a fixed pixel width regardless of the source page's
  // actual size — a 4000px-wide scanned page and a normal A4 page end up
  // the same small render cost. Without this, a handful of huge scanned
  // pages was enough to blow past what the tab could hold.
  const THUMB_TARGET_WIDTH = 420;
  const LARGE_FILE_WARN_MB = 50;

  let currentFile = null;
  let currentDoc = null; // pdf.js document — thumbnails render on the main
                          // thread (see js/pdf-worker.js for why); only the
                          // final PDF assembly (buildPdf below) uses pdf-lib
                          // in the worker.
  let pageItems = []; // { origIndex, thumbUrl, rendering, deleted, selected }
  let observer = null;
  const renderQueue = [];
  let queueRunning = false;

  function revokeThumbs() {
    pageItems.forEach(i => { if (i.thumbUrl) URL.revokeObjectURL(i.thumbUrl); });
  }

  async function loadFile(file) {
    if (!U.confirmLargeFile(file, LARGE_FILE_WARN_MB,
      'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) จึงอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก')) {
      return;
    }

    currentFile = file;
    nameEl.textContent = file.name;
    grid.innerHTML = '';
    revokeThumbs();
    pageItems = [];
    bulkbar.classList.remove('hidden');
    noteEl.classList.remove('hidden');
    countEl.textContent = '…';

    if (currentDoc) { currentDoc.destroy(); currentDoc = null; }

    // Opening the document and reading its page count is cheap — pdf.js
    // doesn't decode/render page content until getPage()/render() is
    // called, so this step stays fast even for a very large file.
    const bytesForView = await U.readAsArrayBuffer(file);
    currentDoc = await pdfjsLib.getDocument({ data: bytesForView }).promise;

    for (let i = 0; i < currentDoc.numPages; i++) {
      pageItems.push({ origIndex: i, thumbUrl: null, rendering: false, deleted: false, selected: false });
    }

    countEl.textContent = String(pageItems.length);
    renderGrid();
  }

  function maybeCloseDoc() {
    if (!currentDoc) return;
    if (pageItems.length && pageItems.every(i => i.thumbUrl)) {
      currentDoc.destroy();
      currentDoc = null;
    }
  }

  async function renderThumbnail(item) {
    const doc = currentDoc;
    if (!doc || item.thumbUrl || item.rendering) return;
    item.rendering = true;
    try {
      const page = await doc.getPage(item.origIndex + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(THUMB_TARGET_WIDTH / base.width, 2);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      // A blob URL keeps the pixel data off the JS heap (unlike toDataURL's
      // base64 string), which matters a lot once a document has hundreds of
      // these thumbnails alive at once.
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      item.thumbUrl = URL.createObjectURL(blob);
      const img = grid.querySelector(`[data-idx="${item.origIndex}"] img`);
      if (img) img.src = item.thumbUrl;
      const card = grid.querySelector(`[data-idx="${item.origIndex}"]`);
      if (card) card.classList.remove('is-pending');
    } catch (err) {
      console.warn('render thumbnail failed', err);
    } finally {
      item.rendering = false;
      maybeCloseDoc();
      processQueue();
    }
  }

  function processQueue() {
    if (queueRunning) return;
    const idx = renderQueue.shift();
    if (idx === undefined) return;
    queueRunning = true;
    const item = pageItems.find(i => i.origIndex === idx);
    (item ? renderThumbnail(item) : Promise.resolve()).finally(() => {
      queueRunning = false;
      if (renderQueue.length) processQueue();
    });
  }

  function queueRender(origIndex) {
    const item = pageItems.find(i => i.origIndex === origIndex);
    if (!item || item.thumbUrl || item.rendering) return;
    if (!renderQueue.includes(origIndex)) renderQueue.push(origIndex);
    processQueue();
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    // rootMargin loads thumbnails a bit before they scroll into view, so
    // scrolling through a long document doesn't show a flash of blank cards.
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const idx = Number(entry.target.dataset.idx);
        queueRender(idx);
      });
    }, { root: null, rootMargin: '600px 0px', threshold: 0.01 });

    grid.querySelectorAll('.page-card-manage').forEach(card => {
      const idx = Number(card.dataset.idx);
      const item = pageItems.find(i => i.origIndex === idx);
      if (item && !item.thumbUrl) observer.observe(card);
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    pageItems.forEach((item, idx) => {
      const card = cardTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.idx = String(item.origIndex);
      card.classList.toggle('is-deleted', item.deleted);
      card.classList.toggle('is-pending', !item.thumbUrl);
      if (item.thumbUrl) card.querySelector('img').src = item.thumbUrl;
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
    setupObserver();
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
    // This part (extracting/reordering pages into a new PDF) is pure
    // pdf-lib byte work with no DOM dependency, so it runs in the worker —
    // unlike the thumbnails above, it doesn't hit pdf.js's worker limitation.
    const srcBytes = await U.readAsArrayBuffer(currentFile);
    const { bytes } = await PW.buildPagesPdf(srcBytes, indices);
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

  U.onClearCache(() => {
    if (observer) { observer.disconnect(); observer = null; }
    renderQueue.length = 0;
    queueRunning = false;
    if (currentDoc) { currentDoc.destroy(); currentDoc = null; }
    revokeThumbs();
    pageItems = [];
    currentFile = null;
    grid.innerHTML = '';
    bulkbar.classList.add('hidden');
    noteEl.classList.add('hidden');
  });
})();
