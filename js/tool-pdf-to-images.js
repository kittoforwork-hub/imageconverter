(() => {
  'use strict';
  const U = window.Utils;
  const PW = window.PdfWorkerClient;

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
  const progressWrap = document.getElementById('progress-pdf-to-images');
  const progressFill = progressWrap.querySelector('.js-progress');
  const progressLabel = progressWrap.querySelector('.js-progress-label');

  const LARGE_FILE_WARN_MB = 50;
  // High page count × high resolution is what actually blows up memory (each
  // rendered page stays alive as a blob until the zip step), not file size on
  // its own — a 300-page doc at 3× easily produces gigabytes of raw pixels.
  const HEAVY_WORK_PAGE_THRESHOLD = 80;

  let currentFile = null;
  let docId = null;
  let numPages = 0;
  let rendered = []; // { pageNum, blob, url }
  let cancelRequested = false;

  async function loadFile(file) {
    if (!PW.supported) {
      alert('เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์');
      return;
    }
    if (!U.confirmLargeFile(file, LARGE_FILE_WARN_MB,
      'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) จึงอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก')) {
      return;
    }

    currentFile = file;
    nameEl.textContent = file.name;
    bulkbar.classList.remove('hidden');
    grid.innerHTML = '';
    progressWrap.classList.add('hidden');
    downloadZipBtn.classList.add('hidden');
    rendered.forEach(r => URL.revokeObjectURL(r.url));
    rendered = [];
    if (docId) { PW.closeDoc(docId).catch(() => {}); docId = null; }

    // Reading the file into an ArrayBuffer still happens here (fast, native
    // browser I/O) — only the actual parsing/rendering moves to the worker.
    const bytes = await U.readAsArrayBuffer(file);
    const opened = await PW.openDoc(bytes);
    docId = opened.docId;
    numPages = opened.numPages;
  }

  function setProgress(done, total) {
    progressFill.style.width = total ? Math.round((done / total) * 100) + '%' : '0%';
    progressLabel.textContent = `หน้า ${done}/${total}`;
  }

  async function renderAll() {
    if (!docId) return;

    const scale = parseFloat(scaleEl.value);
    const total = numPages;
    if (total * scale >= HEAVY_WORK_PAGE_THRESHOLD) {
      const proceed = window.confirm(
        `ไฟล์นี้มี ${total} หน้า ที่ความละเอียด ${scale}× — การแปลงทุกหน้าพร้อมกันจะใช้แรมมาก และเบราว์เซอร์อาจค้างชั่วขณะระหว่างทำงาน\n\nต้องการดำเนินการต่อหรือไม่? (ลดความละเอียดเป็น 1× จะเบากว่ามาก)`
      );
      if (!proceed) return;
    }

    cancelRequested = false;
    // Deliberately left enabled (just re-styled) rather than disabled — the
    // button doubles as a cancel control while a big document is mid-render.
    renderBtn.classList.add('is-working');
    renderBtn.textContent = 'ยกเลิก';
    grid.innerHTML = '';
    progressWrap.classList.remove('hidden');
    setProgress(0, total);
    rendered.forEach(r => URL.revokeObjectURL(r.url));
    rendered = [];

    const format = formatEl.value;
    const ext = format === 'image/png' ? 'png' : 'jpg';

    for (let pageNum = 1; pageNum <= total; pageNum++) {
      if (cancelRequested) break;

      // The actual rasterization happens on the worker thread — this await
      // is the tab doing nothing but waiting, so the UI stays fully
      // responsive (scrolling, clicking cancel, switching tools) the whole
      // time a page is being rendered.
      const { blob } = await PW.renderPage(docId, {
        pageNum,
        scale,
        mimeType: format,
        quality: format === 'image/jpeg' ? 0.92 : undefined
      });
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

      setProgress(pageNum, total);
    }

    renderBtn.classList.remove('is-working');
    renderBtn.textContent = 'แปลงทุกหน้า';
    progressWrap.classList.toggle('hidden', !cancelRequested && rendered.length === total);
    if (cancelRequested) {
      progressLabel.textContent = `ยกเลิกแล้ว · แปลงไปแล้ว ${rendered.length}/${total} หน้า`;
    }
    downloadZipBtn.classList.toggle('hidden', rendered.length === 0);
  }

  renderBtn.addEventListener('click', () => {
    if (renderBtn.classList.contains('is-working')) {
      cancelRequested = true;
      renderBtn.textContent = 'กำลังยกเลิก…';
      return;
    }
    renderAll();
  });

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

  U.setupDropzone(dropzone, fileInput, (files) => {
    const file = Array.from(files).find(f => f.type === 'application/pdf');
    if (file) loadFile(file);
  });

  U.onClearCache(() => {
    cancelRequested = true;
    rendered.forEach(r => URL.revokeObjectURL(r.url));
    rendered = [];
    if (docId) { PW.closeDoc(docId).catch(() => {}); docId = null; }
    currentFile = null;
    grid.innerHTML = '';
    bulkbar.classList.add('hidden');
    progressWrap.classList.add('hidden');
    downloadZipBtn.classList.add('hidden');
  });
})();
