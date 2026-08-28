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
  const progressWrap = document.getElementById('progress-pdf-to-images');
  const progressFill = progressWrap.querySelector('.js-progress');
  const progressLabel = progressWrap.querySelector('.js-progress-label');

  const LARGE_FILE_WARN_MB = 50;
  const HEAVY_WORK_PAGE_THRESHOLD = 80;

  let currentFile = null;
  let currentDoc = null;
  let rendered = [];
  let cancelRequested = false;
  let loadSeq = 0;

  async function loadFile(file) {
    const requestId = ++loadSeq;
    if (
      !U.confirmLargeFile(
        file,
        LARGE_FILE_WARN_MB,
        'ไฟล์ PDF นี้มีขนาดใหญ่ ทุกอย่างประมวลผลอยู่ในเบราว์เซอร์ (ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์) จึงอาจใช้เวลาสักครู่และใช้แรมมากกว่าไฟล์เล็ก'
      )
    ) {
      return;
    }

    try {
      currentFile = file;
      nameEl.textContent = file.name;
      bulkbar.classList.remove('hidden');
      grid.innerHTML = '';
      progressWrap.classList.add('hidden');
      downloadZipBtn.classList.add('hidden');

      rendered.forEach((r) => URL.revokeObjectURL(r.url));
      rendered = [];

      if (currentDoc) {
        await currentDoc.destroy();
        currentDoc = null;
      }

      const bytes = await U.readAsArrayBuffer(file);
      if (requestId !== loadSeq) return;

      currentDoc = await pdfjsLib.getDocument({
        data: bytes
      }).promise;
      if (requestId !== loadSeq) {
        await currentDoc.destroy();
        currentDoc = null;
        return;
      }
    } catch (error) {
      if (requestId !== loadSeq) return;
      console.error('PDF loading error:', error);

      currentDoc = null;
      currentFile = null;
      bulkbar.classList.add('hidden');

      alert(
        'ไม่สามารถเปิดไฟล์ PDF นี้ได้\n\n' +
        (error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      );
    }
  }

  function setProgress(done, total) {
    progressFill.style.width =
      total ? Math.round((done / total) * 100) + '%' : '0%';

    progressLabel.textContent = `หน้า ${done}/${total}`;
  }

  async function renderAll() {
    if (!currentDoc || !currentFile) {
      alert('กรุณาเลือกไฟล์ PDF ก่อน');
      return;
    }

    const scale = Number(scaleEl.value) || 1;
    const total = currentDoc.numPages;

    if (total * scale >= HEAVY_WORK_PAGE_THRESHOLD) {
      const proceed = window.confirm(
        `ไฟล์นี้มี ${total} หน้า ที่ความละเอียด ${scale}× — ` +
        `การแปลงทุกหน้าจะใช้แรมมาก และเบราว์เซอร์อาจค้างชั่วขณะระหว่างทำงาน\n\n` +
        `ต้องการดำเนินการต่อหรือไม่?\n` +
        `(ลดความละเอียดเป็น 1× จะเบากว่ามาก)`
      );

      if (!proceed) {
        return;
      }
    }

    cancelRequested = false;

    renderBtn.classList.add('is-working');
    renderBtn.textContent = 'ยกเลิก';

    grid.innerHTML = '';
    progressWrap.classList.remove('hidden');
    setProgress(0, total);

    rendered.forEach((r) => URL.revokeObjectURL(r.url));
    rendered = [];

    const format =
      formatEl.value === 'image/png'
        ? 'image/png'
        : 'image/jpeg';

    const ext = format === 'image/png' ? 'png' : 'jpg';

    try {
      for (let pageNum = 1; pageNum <= total; pageNum++) {
        if (cancelRequested) {
          break;
        }

        const page = await currentDoc.getPage(pageNum);

        const viewport = page.getViewport({
          scale
        });

        const canvas = document.createElement('canvas');

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const ctx = canvas.getContext('2d', {
          willReadFrequently: true
        });

        if (!ctx) {
          throw new Error('ไม่สามารถสร้าง Canvas 2D Context ได้');
        }

        // JPEG ต้องมีพื้นหลังสีขาว เพราะ JPEG ไม่มี transparency
        if (format === 'image/jpeg') {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        await page.render({
          canvasContext: ctx,
          viewport
        }).promise;

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(new Error('ไม่สามารถสร้างรูปภาพจาก PDF ได้'));
              }
            },
            format,
            format === 'image/jpeg' ? 0.92 : undefined
          );
        });

        const url = URL.createObjectURL(blob);

        const name =
          `${U.baseName(currentFile.name)}-page` +
          `${String(pageNum).padStart(2, '0')}.${ext}`;

        rendered.push({
          pageNum,
          blob,
          url,
          name
        });

        // ช่วยให้ pdf.js คืนทรัพยากรของหน้าที่ render แล้ว
        page.cleanup();

        const card =
          pageTemplate.content.firstElementChild.cloneNode(true);

        const img = card.querySelector('img');
        if (img) {
          img.src = url;
          img.alt = `หน้า ${pageNum}`;
        }

        const pageLabel = card.querySelector('.js-pagelabel');
        if (pageLabel) {
          pageLabel.textContent = `หน้า ${pageNum}`;
        }

        const dl = card.querySelector('.js-download');
        if (dl) {
          dl.href = url;
          dl.download = name;
        }

        grid.appendChild(card);

        setProgress(pageNum, total);

        // คืนเวลาให้ browser update UI และรับ click "ยกเลิก"
        await U.yieldToUI();

        // ช่วยปล่อย reference ของ canvas
        canvas.width = 1;
        canvas.height = 1;
      }
    } catch (error) {
      console.error('PDF render error:', error);

      progressLabel.textContent =
        `เกิดข้อผิดพลาด: ${error?.message || 'ไม่ทราบสาเหตุ'}`;

      alert(
        'เกิดข้อผิดพลาดระหว่างแปลง PDF\n\n' +
        (error?.message || 'ไม่ทราบสาเหตุ')
      );
    } finally {
      renderBtn.classList.remove('is-working');
      renderBtn.textContent = 'แปลงทุกหน้า';

      const completed =
        !cancelRequested &&
        rendered.length === total;

      progressWrap.classList.toggle(
        'hidden',
        completed
      );

      if (cancelRequested) {
        progressLabel.textContent =
          `ยกเลิกแล้ว · แปลงไปแล้ว ${rendered.length}/${total} หน้า`;
      }

      downloadZipBtn.classList.toggle(
        'hidden',
        rendered.length === 0
      );
    }
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
    if (!rendered.length || !currentFile) {
      return;
    }

    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = 'กำลังบีบอัด…';

    try {
      const zip = new JSZip();

      rendered.forEach((r) => {
        zip.file(r.name, r.blob);
      });

      const content = await zip.generateAsync({
        type: 'blob'
      });

      U.downloadBlob(
        content,
        `${U.baseName(currentFile.name)}-pages.zip`
      );
    } catch (error) {
      console.error('ZIP error:', error);

      alert(
        'ไม่สามารถสร้างไฟล์ ZIP ได้\n\n' +
        (error?.message || 'ไม่ทราบสาเหตุ')
      );
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = 'ดาวน์โหลดทั้งหมด (.zip)';
    }
  });

  U.setupDropzone(
    dropzone,
    fileInput,
    (files) => {
      const file = Array.from(files).find(
        (f) => f.type === 'application/pdf'
      );

      if (file) {
        loadFile(file);
      }
    }
  );

  U.onClearCache(() => {
    ++loadSeq;
    cancelRequested = true;

    rendered.forEach((r) => {
      URL.revokeObjectURL(r.url);
    });

    rendered = [];

    if (currentDoc) {
      currentDoc.destroy();
      currentDoc = null;
    }

    currentFile = null;

    grid.innerHTML = '';
    bulkbar.classList.add('hidden');
    progressWrap.classList.add('hidden');
    downloadZipBtn.classList.add('hidden');

    renderBtn.classList.remove('is-working');
    renderBtn.textContent = 'แปลงทุกหน้า';
  });
})();
