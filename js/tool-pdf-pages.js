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

  const THUMB_TARGET_WIDTH = 420;
  const THUMB_MAX_DIMENSION = 1800;
  const LARGE_FILE_WARN_MB = 50;

  /*
   * สำคัญ:
   * render thumbnail ทีละหน้า
   * เพื่อไม่ให้ PDF ใหญ่ยิง canvas หลายตัวพร้อมกัน
   */
  const MAX_RENDER_QUEUE = 1;

  let currentFile = null;
  let currentDoc = null;

  let pageItems = [];

  let observer = null;
  let renderQueue = [];
  let queueRunning = false;

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

  async function destroyCurrentDoc() {
    if (!currentDoc) return;

    const doc = currentDoc;
    currentDoc = null;

    try {
      await doc.destroy();
    } catch (err) {
      console.warn('PDF destroy warning:', err);
    }
  }

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
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      resetQueue();
      revokeThumbs();
      pageItems = [];

      await destroyCurrentDoc();

      currentFile = file;

      nameEl.textContent = file.name;
      grid.innerHTML = '';

      bulkbar.classList.remove('hidden');
      noteEl.classList.remove('hidden');
      countEl.textContent = '…';

      const bytes = await U.readAsArrayBuffer(file);

      currentDoc = await pdfjsLib.getDocument({
        data: bytes,
        canvasFactory: window.KittoCanvasFactory
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

      await destroyCurrentDoc();

      currentFile = null;

      alert(
        'ไม่สามารถเปิดไฟล์ PDF ได้\n\n' +
        (error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      );
    }
  }

  /*
   * สร้าง thumbnail
   */
  async function renderThumbnail(origIndex) {
    if (!currentDoc) return;

    const item = pageItems.find(
      (entry) => entry.origIndex === origIndex
    );

    if (!item) return;
    if (item.deleted) return;
    if (item.thumbUrl) return;
    if (item.rendering) return;

    item.rendering = true;

    let page = null;
    let canvas = null;
    let context = null;
    let renderTask = null;

    try {
      page = await currentDoc.getPage(origIndex + 1);

      const baseViewport = page.getViewport({
        scale: 1
      });

      if (!baseViewport.width || !baseViewport.height) {
        throw new Error('Invalid PDF page dimensions');
      }

      /*
       * ทำ thumbnail ให้กว้างประมาณ 420px
       */
      let scale =
        THUMB_TARGET_WIDTH / baseViewport.width;

      let width =
        baseViewport.width * scale;

      let height =
        baseViewport.height * scale;

      /*
       * จำกัดขนาดสูงสุด
       */
      const maxDimension =
        Math.max(width, height);

      if (maxDimension > THUMB_MAX_DIMENSION) {
        scale *=
          THUMB_MAX_DIMENSION / maxDimension;
      }

      const viewport = page.getViewport({
        scale
      });

      /*
       * ใช้ Canvas Factory ตัวเดียวกับ PDF.js
       */
      const canvasInfo =
        window.KittoCanvasFactory.create(
          viewport.width,
          viewport.height
        );

      canvas = canvasInfo.canvas;
      context = canvasInfo.context;

      /*
       * พื้นหลังขาว
       */
      context.save();
      context.fillStyle = '#FFFFFF';
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
      context.restore();

      /*
       * สำคัญมาก:
       * canvasFactory ถูกส่งเข้า page.render()
       *
       * ทำให้ canvas ภายในที่ PDF.js สร้างระหว่าง
       * soft-mask / transparency compositing
       * สามารถใช้ factory ของเราได้
       */
      renderTask = page.render({
        canvasContext: context,
        viewport,
        canvasFactory: window.KittoCanvasFactory,
        intent: 'display'
      });

      await renderTask.promise;

      /*
       * เปลี่ยน thumbnail เป็น JPEG
       * เพื่อใช้ memory น้อยกว่า PNG
       */
      const blob = await new Promise(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new Error(
                    'ไม่สามารถสร้าง thumbnail ได้'
                  )
                );
              }
            },
            'image/jpeg',
            0.78
          );
        }
      );

      /*
       * เช็กอีกครั้ง เผื่อผู้ใช้เปลี่ยนไฟล์
       * ระหว่าง render
       */
      if (!currentDoc || item.deleted) {
        return;
      }

      item.thumbUrl =
        URL.createObjectURL(blob);

      const card =
        grid.querySelector(
          `.page-card-manage[data-idx="${origIndex}"]`
        );

      if (card) {
        card.classList.remove('is-pending');

        const img =
          card.querySelector('img');

        if (img) {
          img.src = item.thumbUrl;
          img.alt = `หน้า ${origIndex + 1}`;
        }
      }

    } catch (error) {
      console.error(
        `Thumbnail render failed: page ${origIndex + 1}`,
        error
      );

    } finally {
      item.rendering = false;

      /*
       * ปล่อย resource ของ pdf.js
       */
      if (page) {
        try {
          page.cleanup();
        } catch (_) {}
      }

      /*
       * ทำลาย canvas
       */
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }

      canvas = null;
      context = null;
      renderTask = null;
    }
  }

  /*
   * เพิ่มหน้าเข้า queue
   */
  function queueRender(origIndex) {
    if (!currentDoc) return;

    const item = pageItems.find(
      (entry) => entry.origIndex === origIndex
    );

    if (!item) return;
    if (item.deleted) return;
    if (item.thumbUrl) return;
    if (item.rendering) return;

    /*
     * กัน duplicate queue
     */
    if (renderQueue.includes(origIndex)) {
      return;
    }

    /*
     * ถ้า queue เยอะเกินไป
     * ไม่ต้องยัดเพิ่ม
     */
    if (renderQueue.length > 100) {
      return;
    }

    renderQueue.push(origIndex);

    processQueue();
  }

  /*
   * ทำงานทีละหน้า
   */
  async function processQueue() {
    if (queueRunning) {
      return;
    }

    queueRunning = true;

    try {
      while (renderQueue.length > 0) {
        const origIndex =
          renderQueue.shift();

        if (origIndex == null) {
          continue;
        }

        const item = pageItems.find(
          (entry) =>
            entry.origIndex === origIndex
        );

        if (!item) {
          continue;
        }

        if (item.deleted) {
          continue;
        }

        if (item.thumbUrl) {
          continue;
        }

        await renderThumbnail(origIndex);

        /*
         * เปิดโอกาสให้ browser repaint UI
         */
        await U.yieldToUI();
      }

    } finally {
      queueRunning = false;

      /*
       * เผื่อมีงานเข้ามาระหว่าง process
       */
      if (renderQueue.length > 0) {
        processQueue();
      }
    }
  }

  /*
   * Intersection Observer
   */
  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const idx =
              Number(
                entry.target.dataset.idx
              );

            queueRender(idx);
          });

          processQueue();
        },
        {
          root: null,

          /*
           * โหลดก่อนถึง viewport
           */
          rootMargin: '300px 0px',

          threshold: 0.01
        }
      );

    grid
      .querySelectorAll(
        '.page-card-manage'
      )
      .forEach((card) => {
        const idx =
          Number(card.dataset.idx);

        const item =
          pageItems.find(
            (entry) =>
              entry.origIndex === idx
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

  /*
   * สร้าง Grid
   */
  function renderGrid() {
    if (observer) {
      observer.disconnect();
    }

    grid.innerHTML = '';

    pageItems.forEach(
      (item, idx) => {
        const card =
          cardTemplate.content
            .firstElementChild
            .cloneNode(true);

        card.dataset.idx =
          String(item.origIndex);

        card.classList.toggle(
          'is-deleted',
          item.deleted
        );

        card.classList.toggle(
          'is-pending',
          !item.thumbUrl
        );

        const img =
          card.querySelector('img');

        if (img && item.thumbUrl) {
          img.src = item.thumbUrl;
          img.alt =
            `หน้า ${idx + 1}`;
        }

        const label =
          card.querySelector(
            '.js-pagelabel'
          );

        if (label) {
          label.textContent =
            `หน้า ${idx + 1}`;
        }

        const selectCb =
          card.querySelector(
            '.js-select'
          );

        if (selectCb) {
          selectCb.checked =
            item.selected;

          selectCb.addEventListener(
            'change',
            () => {
              item.selected =
                selectCb.checked;
            }
          );
        }

        const upBtn =
          card.querySelector(
            '.js-move-up'
          );

        if (upBtn) {
          upBtn.disabled =
            idx === 0;

          upBtn.addEventListener(
            'click',
            () => {
              moveItem(
                idx,
                -1
              );
            }
          );
        }

        const downBtn =
          card.querySelector(
            '.js-move-down'
          );

        if (downBtn) {
          downBtn.disabled =
            idx ===
            pageItems.length - 1;

          downBtn.addEventListener(
            'click',
            () => {
              moveItem(
                idx,
                1
              );
            }
          );
        }

        const delBtn =
          card.querySelector(
            '.js-delete'
          );

        if (delBtn) {
          delBtn.title =
            item.deleted
              ? 'กู้คืนหน้านี้'
              : 'ลบหน้านี้';

          delBtn.textContent =
            item.deleted
              ? '↺'
              : '✕';

          delBtn.addEventListener(
            'click',
            () => {
              item.deleted =
                !item.deleted;

              if (
                !item.deleted &&
                !item.thumbUrl
              ) {
                queueRender(
                  item.origIndex
                );
              }

              renderGrid();
            }
          );
        }

        grid.appendChild(card);
      }
    );

    setupObserver();

    /*
     * Preload แค่ 2 หน้าแรก
     * จากเดิมที่ preload มากกว่านี้
     */
    for (
      let i = 0;
      i < Math.min(2, pageItems.length);
      i++
    ) {
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

  /*
   * เรียงหน้า
   */
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

  /*
   * Select all
   */
  selectAllEl.addEventListener(
    'change',
    () => {
      pageItems.forEach(
        (item) => {
          item.selected =
            selectAllEl.checked;
        }
      );

      renderGrid();
    }
  );

  /*
   * สร้าง PDF
   */
  async function buildPdf(indices) {
    if (!currentFile) {
      throw new Error(
        'ยังไม่ได้เลือกไฟล์ PDF'
      );
    }

    const srcBytes =
      await U.readAsArrayBuffer(
        currentFile
      );

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

  /*
   * Download edited PDF
   */
  downloadBtn.addEventListener(
    'click',
    async () => {
      const indices =
        pageItems
          .filter(
            (item) =>
              !item.deleted
          )
          .map(
            (item) =>
              item.origIndex
          );

      if (
        !indices.length ||
        !currentFile
      ) {
        return;
      }

      downloadBtn.disabled = true;
      downloadBtn.textContent =
        'กำลังสร้าง…';

      try {
        const blob =
          await buildPdf(indices);

        U.downloadBlob(
          blob,
          `${U.baseName(currentFile.name)}-edited.pdf`
        );

      } catch (error) {
        console.error(
          'Build PDF error:',
          error
        );

        alert(
          'ไม่สามารถสร้าง PDF ได้\n\n' +
          (error?.message ||
            'เกิดข้อผิดพลาด')
        );

      } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent =
          'ดาวน์โหลด PDF (ตามลำดับ/ลบแล้ว)';
      }
    }
  );

  /*
   * Download selected
   */
  downloadSelectedBtn.addEventListener(
    'click',
    async () => {
      const indices =
        pageItems
          .filter(
            (item) =>
              item.selected
          )
          .map(
            (item) =>
              item.origIndex
          );

      if (
        !indices.length ||
        !currentFile
      ) {
        return;
      }

      downloadSelectedBtn.disabled =
        true;

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
            'เกิดข้อผิดพลาด')
        );

      } finally {
        downloadSelectedBtn.disabled =
          false;

        downloadSelectedBtn.textContent =
          'ดาวน์โหลดเฉพาะที่เลือก';
      }
    }
  );

  /*
   * Dropzone
   */
  U.setupDropzone(
    dropzone,
    fileInput,
    (files) => {
      const file =
        Array.from(files).find(
          (f) =>
            f.type ===
            'application/pdf'
        );

      if (file) {
        loadFile(file);
      }
    }
  );

  /*
   * Clear cache
   */
  U.onClearCache(
    async () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      resetQueue();
      revokeThumbs();

      pageItems = [];

      await destroyCurrentDoc();

      currentFile = null;

      grid.innerHTML = '';

      bulkbar.classList.add(
        'hidden'
      );

      noteEl.classList.add(
        'hidden'
      );

      countEl.textContent = '0';

      if (selectAllEl) {
        selectAllEl.checked = false;
      }
    }
  );
})();
