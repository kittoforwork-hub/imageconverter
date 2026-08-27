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

  // ------------------------------------------------------------
  // Thumbnail settings
  // ------------------------------------------------------------

  // Thumbnail จะมีความกว้างประมาณนี้ ไม่ว่าหน้าต้นฉบับจะใหญ่แค่ไหน
  const THUMB_TARGET_WIDTH = 420;

  // จำกัดขนาดสูงสุดของ canvas เพื่อป้องกันไฟล์สแกนขนาดใหญ่มาก
  const THUMB_MAX_DIMENSION = 2200;

  const LARGE_FILE_WARN_MB = 50;

  // Render ทีละหน้า เพื่อลดการใช้ RAM
  const MAX_RENDER_QUEUE = 1;

  let currentFile = null;
  let currentDoc = null;

  // {
  //   origIndex,
  //   thumbUrl,
  //   rendering,
  //   deleted,
  //   selected
  // }
  let pageItems = [];

  let observer = null;

  const renderQueue = [];
  let queueRunning = false;

  // ------------------------------------------------------------
  // Canvas factory
  // ------------------------------------------------------------

  // ไม่ใช้ pdfjsLib.DOMCanvasFactory เพราะในบาง build/version
  // DOMCanvasFactory ไม่ได้ถูก expose บน pdfjsLib
  //
  // ทำ factory เองและกำหนด willReadFrequently เพื่อให้ canvas
  // ที่ PDF.js ใช้ตอน render thumbnail เหมาะกับงานที่มี getImageData
  // หลายครั้ง เช่น soft mask / transparency group
  const thumbnailCanvasFactory = {
    create(width, height) {
      if (width <= 0 || height <= 0) {
        throw new Error('Invalid canvas size');
      }

      const canvas = document.createElement('canvas');

      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);

      const context = canvas.getContext('2d', {
        willReadFrequently: true
      });

      if (!context) {
        throw new Error('Unable to create 2D canvas context');
      }

      return {
        canvas,
        context
      };
    },

    reset(canvasAndContext, width, height) {
      if (!canvasAndContext || !canvasAndContext.canvas) {
        throw new Error('Canvas is not specified');
      }

      if (width <= 0 || height <= 0) {
        throw new Error('Invalid canvas size');
      }

      canvasAndContext.canvas.width = Math.ceil(width);
      canvasAndContext.canvas.height = Math.ceil(height);
    },

    destroy(canvasAndContext) {
      if (!canvasAndContext || !canvasAndContext.canvas) {
        return;
      }

      canvasAndContext.canvas.width = 1;
      canvasAndContext.canvas.height = 1;

      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    }
  };

  // ------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------

  function revokeThumbs() {
    pageItems.forEach((item) => {
      if (item.thumbUrl) {
        URL.revokeObjectURL(item.thumbUrl);
        item.thumbUrl = null;
      }
    });
  }

  function resetQueue() {
    renderQueue.length = 0;
    queueRunning = false;

    pageItems.forEach((item) => {
      item.rendering = false;
    });
  }

  // ------------------------------------------------------------
  // Load PDF
  // ------------------------------------------------------------

  async function loadFile(file) {
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
      // ยกเลิกงานเก่าก่อน
      resetQueue();

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      revokeThumbs();

      if (currentDoc) {
        await currentDoc.destroy();
        currentDoc = null;
      }

      currentFile = file;

      nameEl.textContent = file.name;
      grid.innerHTML = '';

      pageItems = [];

      bulkbar.classList.remove('hidden');
      noteEl.classList.remove('hidden');
      countEl.textContent = '…';

      const bytesForView = await U.readAsArrayBuffer(file);

      currentDoc = await pdfjsLib.getDocument({
        data: bytesForView
      }).promise;

      for (let i = 0; i < currentDoc.numPages; i++) {
        pageItems.push({
          origIndex: i,
          thumbUrl: null,
          rendering: false,
          deleted: false,
          selected: false
        });
      }

      countEl.textContent = String(pageItems.length);

      renderGrid();

    } catch (error) {
      console.error('PDF load error:', error);

      if (currentDoc) {
        try {
          await currentDoc.destroy();
        } catch (_) {
          // ignore
        }
        currentDoc = null;
      }

      currentFile = null;

      alert(
        'ไม่สามารถเปิดไฟล์ PDF ได้\n\n' +
        (error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      );
    }
  }

  // ------------------------------------------------------------
  // Thumbnail rendering
  // ------------------------------------------------------------

  async function renderThumbnail(origIndex) {
    if (!currentDoc) {
      return;
    }

    const item = pageItems.find(
      (entry) => entry.origIndex === origIndex
    );

    if (!item || item.deleted || item.thumbUrl) {
      return;
    }

    if (item.rendering) {
      return;
    }

    item.rendering = true;

    let page = null;
    let canvasAndContext = null;

    try {
      page = await currentDoc.getPage(origIndex + 1);

      // อ่านขนาดหน้าแบบ 1x ก่อน
      const baseViewport = page.getViewport({
        scale: 1
      });

      if (!baseViewport.width || !baseViewport.height) {
        throw new Error('Invalid PDF page dimensions');
      }

      // คำนวณ scale จากความกว้างเป้าหมาย
      let scale = THUMB_TARGET_WIDTH / baseViewport.width;

      // จำกัด scale ไม่ให้ canvas ใหญ่เกินไป
      const estimatedWidth = baseViewport.width * scale;
      const estimatedHeight = baseViewport.height * scale;

      const maxDimension = Math.max(
        estimatedWidth,
        estimatedHeight
      );

      if (maxDimension > THUMB_MAX_DIMENSION) {
        scale *= THUMB_MAX_DIMENSION / maxDimension;
      }

      const viewport = page.getViewport({
        scale
      });

      canvasAndContext = thumbnailCanvasFactory.create(
        viewport.width,
        viewport.height
      );

      const { canvas, context } = canvasAndContext;

      // พื้นหลังขาวสำหรับ thumbnail
      context.save();
      context.fillStyle = '#FFFFFF';
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
      context.restore();

      // สำคัญ:
      // canvasFactory ถูกส่งเข้า render() เพื่อให้ PDF.js
      // สามารถใช้ factory เดียวกันกับ canvas ภายในของ render path
      const renderTask = page.render({
        canvasContext: context,
        viewport,
        canvasFactory: thumbnailCanvasFactory,
        intent: 'display'
      });

      await renderTask.promise;

      // JPEG เหมาะกว่า PNG สำหรับ thumbnail จำนวนมาก
      // เพราะใช้ RAM และ storage น้อยกว่า
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error('Failed to create thumbnail blob')
              );
            }
          },
          'image/jpeg',
          0.78
        );
      });

      // อาจมีไฟล์ใหม่เข้ามาระหว่าง render
      if (!currentDoc || item.deleted) {
        return;
      }

      item.thumbUrl = URL.createObjectURL(blob);

      // อัปเดตเฉพาะ card ที่เกี่ยวข้อง
      const card = grid.querySelector(
        `.page-card-manage[data-idx="${origIndex}"]`
      );

      if (card) {
        card.classList.remove('is-pending');

        const img = card.querySelector('img');

        if (img) {
          img.src = item.thumbUrl;
        }
      }

    } catch (error) {
      console.error(
        `Thumbnail render failed for page ${origIndex + 1}:`,
        error
      );

    } finally {
      item.rendering = false;

      if (page) {
        try {
          page.cleanup();
        } catch (_) {
          // ignore
        }
      }

      if (canvasAndContext) {
        thumbnailCanvasFactory.destroy(
          canvasAndContext
        );
        canvasAndContext = null;
      }
    }
  }

  // ------------------------------------------------------------
  // Render queue
  // ------------------------------------------------------------

  function queueRender(origIndex) {
    if (!currentDoc) {
      return;
    }

    const item = pageItems.find(
      (entry) => entry.origIndex === origIndex
    );

    if (!item) {
      return;
    }

    if (item.deleted || item.thumbUrl || item.rendering) {
      return;
    }

    if (renderQueue.includes(origIndex)) {
      return;
    }

    // ป้องกัน queue โตผิดปกติ
    if (renderQueue.length >= 5000) {
      return;
    }

    renderQueue.push(origIndex);

    processQueue();
  }

  async function processQueue() {
    if (queueRunning) {
      return;
    }

    queueRunning = true;

    try {
      let activeWorkers = 0;

      while (
        renderQueue.length > 0 &&
        activeWorkers < MAX_RENDER_QUEUE
      ) {
        const origIndex = renderQueue.shift();

        if (origIndex == null) {
          continue;
        }

        const item = pageItems.find(
          (entry) => entry.origIndex === origIndex
        );

        if (!item || item.deleted || item.thumbUrl) {
          continue;
        }

        activeWorkers++;

        try {
          await renderThumbnail(origIndex);
        } catch (error) {
          console.error(
            `Queue render error on page ${origIndex + 1}:`,
            error
          );
        } finally {
          activeWorkers--;
        }

        // ให้ browser repaint UI ก่อน render หน้าถัดไป
        await U.yieldToUI();
      }

    } finally {
      queueRunning = false;

      maybeCloseDoc();

      // ถ้ามีงานเข้ามาระหว่างที่ queue กำลังหยุด
      if (renderQueue.length > 0) {
        processQueue();
      }
    }
  }

  // ------------------------------------------------------------
  // Destroy PDF document when no more thumbnails are needed
  // ------------------------------------------------------------

  function maybeCloseDoc() {
    if (!currentDoc) {
      return;
    }

    // ยังมีงานใน queue
    if (renderQueue.length > 0) {
      return;
    }

    // ยังมีหน้าที่กำลัง render
    if (pageItems.some((item) => item.rendering)) {
      return;
    }

    // ตรวจเฉพาะหน้าที่ยัง active
    const needsMoreRendering = pageItems.some(
      (item) =>
        !item.deleted &&
        !item.thumbUrl
    );

    if (needsMoreRendering) {
      return;
    }

    const doc = currentDoc;
    currentDoc = null;

    // ปล่อย resource ของ PDF.js
    doc.destroy().catch(() => {});
  }

  // ------------------------------------------------------------
  // IntersectionObserver
  // ------------------------------------------------------------

  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const idx = Number(
            entry.target.dataset.idx
          );

          queueRender(idx);
        });

        processQueue();
      },
      {
        root: null,

        // โหลดก่อนที่จะเข้าหน้าจอจริง
        rootMargin: '600px 0px',

        threshold: 0.01
      }
    );

    grid
      .querySelectorAll('.page-card-manage')
      .forEach((card) => {
        const idx = Number(card.dataset.idx);

        const item = pageItems.find(
          (entry) => entry.origIndex === idx
        );

        if (
          item &&
          !item.thumbUrl &&
          !item.deleted
        ) {
          observer.observe(card);
        }
      });
  }

  // ------------------------------------------------------------
  // Grid
  // ------------------------------------------------------------

  function renderGrid() {
    if (observer) {
      observer.disconnect();
    }

    grid.innerHTML = '';

    pageItems.forEach((item, idx) => {
      const card =
        cardTemplate.content.firstElementChild.cloneNode(true);

      card.dataset.idx = String(item.origIndex);

      card.classList.toggle(
        'is-deleted',
        item.deleted
      );

      card.classList.toggle(
        'is-pending',
        !item.thumbUrl
      );

      // thumbnail
      if (item.thumbUrl) {
        const img = card.querySelector('img');

        if (img) {
          img.src = item.thumbUrl;
          img.alt = `หน้า ${idx + 1}`;
        }
      }

      // label
      const label =
        card.querySelector('.js-pagelabel');

      if (label) {
        label.textContent = `หน้า ${idx + 1}`;
      }

      // select
      const selectCb =
        card.querySelector('.js-select');

      if (selectCb) {
        selectCb.checked = item.selected;

        selectCb.addEventListener('change', () => {
          item.selected = selectCb.checked;
        });
      }

      // move up
      const upBtn =
        card.querySelector('.js-move-up');

      if (upBtn) {
        upBtn.disabled = idx === 0;

        upBtn.addEventListener('click', () => {
          moveItem(idx, -1);
        });
      }

      // move down
      const downBtn =
        card.querySelector('.js-move-down');

      if (downBtn) {
        downBtn.disabled =
          idx === pageItems.length - 1;

        downBtn.addEventListener('click', () => {
          moveItem(idx, 1);
        });
      }

      // delete / restore
      const delBtn =
        card.querySelector('.js-delete');

      if (delBtn) {
        delBtn.title = item.deleted
          ? 'กู้คืนหน้านี้'
          : 'ลบหน้านี้';

        delBtn.textContent = item.deleted
          ? '↺'
          : '✕';

        delBtn.addEventListener('click', () => {
          item.deleted = !item.deleted;

          // ถ้ากู้คืน ให้เอากลับเข้า queue
          if (!item.deleted && !item.thumbUrl) {
            queueRender(item.origIndex);
          }

          renderGrid();
        });
      }

      grid.appendChild(card);
    });

    setupObserver();

    // เริ่ม render หน้าแรก ๆ ทันที
    // ไม่ต้องรอ IntersectionObserver อย่างเดียว
    const preloadCount = Math.min(
      4,
      pageItems.length
    );

    for (let i = 0; i < preloadCount; i++) {
      if (
        !pageItems[i].deleted &&
        !pageItems[i].thumbUrl
      ) {
        queueRender(
          pageItems[i].origIndex
        );
      }
    }
  }

  // ------------------------------------------------------------
  // Reorder
  // ------------------------------------------------------------

  function moveItem(idx, dir) {
    const j = idx + dir;

    if (
      j < 0 ||
      j >= pageItems.length
    ) {
      return;
    }

    [pageItems[idx], pageItems[j]] =
      [pageItems[j], pageItems[idx]];

    renderGrid();
  }

  // ------------------------------------------------------------
  // Select all
  // ------------------------------------------------------------

  selectAllEl.addEventListener(
    'change',
    () => {
      pageItems.forEach((item) => {
        item.selected =
          selectAllEl.checked;
      });

      renderGrid();
    }
  );

  // ------------------------------------------------------------
  // PDF building
  // ------------------------------------------------------------

  async function buildPdf(indices) {
    if (!currentFile) {
      throw new Error('No PDF file selected');
    }

    const srcBytes =
      await U.readAsArrayBuffer(currentFile);

    const { bytes } =
      await PW.buildPagesPdf(
        srcBytes,
        indices
      );

    return new Blob(
      [bytes],
      {
        type: 'application/pdf'
      }
    );
  }

  // ------------------------------------------------------------
  // Download edited PDF
  // ------------------------------------------------------------

  downloadBtn.addEventListener(
    'click',
    async () => {
      const indices = pageItems
        .filter((item) => !item.deleted)
        .map((item) => item.origIndex);

      if (!indices.length || !currentFile) {
        return;
      }

      downloadBtn.disabled = true;
      downloadBtn.textContent = 'กำลังสร้าง…';

      try {
        const blob =
          await buildPdf(indices);

        U.downloadBlob(
          blob,
          `${U.baseName(currentFile.name)}-edited.pdf`
        );

      } catch (error) {
        console.error(
          'Build edited PDF error:',
          error
        );

        alert(
          'ไม่สามารถสร้าง PDF ได้\n\n' +
          (error?.message ||
            'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
        );

      } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent =
          'ดาวน์โหลด PDF (ตามลำดับ/ลบแล้ว)';
      }
    }
  );

  // ------------------------------------------------------------
  // Download selected PDF
  // ------------------------------------------------------------

  downloadSelectedBtn.addEventListener(
    'click',
    async () => {
      const indices = pageItems
        .filter((item) => item.selected)
        .map((item) => item.origIndex);

      if (!indices.length || !currentFile) {
        return;
      }

      downloadSelectedBtn.disabled = true;
      downloadSelectedBtn.textContent =
        'กำลังสร้าง…';

      try {
        const blob =
          await buildPdf(indices);

        U.downloadBlob(
          blob,
          `${U.baseName(currentFile.name)}-selected.pdf`
        );

      } catch (error) {
        console.error(
          'Build selected PDF error:',
          error
        );

        alert(
          'ไม่สามารถสร้าง PDF ได้\n\n' +
          (error?.message ||
            'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
        );

      } finally {
        downloadSelectedBtn.disabled = false;
        downloadSelectedBtn.textContent =
          'ดาวน์โหลดเฉพาะที่เลือก';
      }
    }
  );

  // ------------------------------------------------------------
  // Dropzone
  // ------------------------------------------------------------

  U.setupDropzone(
    dropzone,
    fileInput,
    (files) => {
      const file =
        Array.from(files).find(
          (f) =>
            f.type === 'application/pdf'
        );

      if (file) {
        loadFile(file);
      }
    }
  );

  // ------------------------------------------------------------
  // Clear cache
  // ------------------------------------------------------------

  U.onClearCache(
    async () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      resetQueue();

      revokeThumbs();

      pageItems = [];

      if (currentDoc) {
        const doc = currentDoc;
        currentDoc = null;

        try {
          await doc.destroy();
        } catch (_) {
          // ignore
        }
      }

      currentFile = null;

      grid.innerHTML = '';

      bulkbar.classList.add('hidden');
      noteEl.classList.add('hidden');

      countEl.textContent = '0';

      if (selectAllEl) {
        selectAllEl.checked = false;
      }
    }
  );
})();
