(() => {
  'use strict';

  const U = window.Utils;

  const dropzone = document.getElementById('dz-img-bgremove');
  const fileInput = document.getElementById('input-img-bgremove');
  const bulkbar = document.getElementById('bulk-img-bgremove');
  const countEl = document.getElementById('count-img-bgremove');
  const clearAllBtn = document.getElementById('clearAll-img-bgremove');
  const processAllBtn = document.getElementById('processAll-img-bgremove');
  const downloadZipBtn = document.getElementById('downloadZip-img-bgremove');
  const jobsEl = document.getElementById('jobs-img-bgremove');
  const jobTemplate = document.getElementById('tpl-img-bgremove');

  let jobSeq = 0;
  const jobs = [];

  // ------------------------------------------------------------
  // AI library
  // ------------------------------------------------------------

  const LIB_URL =
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

  let removeBackgroundFn = null;
  let libPromise = null;

  /*
   * โหลด library ตอนเริ่มใช้งานเท่านั้น
   */
  async function loadLibrary() {
    if (!libPromise) {
      libPromise = import(
        /* webpackIgnore: true */
        LIB_URL
      )
        .then((mod) => {
          if (
            !mod ||
            typeof mod.removeBackground !== 'function'
          ) {
            throw new Error(
              'ไม่พบฟังก์ชัน removeBackground ในไลบรารี'
            );
          }

          removeBackgroundFn =
            mod.removeBackground;

          return removeBackgroundFn;
        })
        .catch((err) => {
          removeBackgroundFn = null;
          libPromise = null;

          throw new Error(
            'โหลดไลบรารีลบพื้นหลังไม่สำเร็จ: ' +
            (err?.message || err)
          );
        });
    }

    return libPromise;
  }

  /*
   * ปล่อย reference ที่เราถืออยู่
   *
   * หมายเหตุ:
   * browser จะ cache ES module ไว้เอง
   * จึงไม่ได้หมายความว่า module cache จะถูกลบทิ้งทันที
   * แต่ช่วยไม่ให้ application ของเราถือ reference เพิ่ม
   */
  function releaseLibraryReference() {
    removeBackgroundFn = null;
    libPromise = null;
  }

  // ------------------------------------------------------------
  // Job
  // ------------------------------------------------------------

  class BgJob {
    constructor(file) {
      this.id =
        'bg-' + (++jobSeq);

      this.file = file;

      this.resultBlob = null;
      this.resultUrl = null;

      this.el =
        jobTemplate.content.firstElementChild.cloneNode(true);

      this.buildDom();
    }

    buildDom() {
      const el = this.el;

      this.objectUrl =
        URL.createObjectURL(this.file);

      this.beforeImg =
        el.querySelector('.js-before img');

      this.afterWrap =
        el.querySelector('.js-after');

      this.afterImg =
        el.querySelector('.js-after img');

      this.statusEl =
        el.querySelector('.js-status');

      this.progressFill =
        el.querySelector('.js-progress');

      this.processBtn =
        el.querySelector('.js-remove-bg-btn');

      this.downloadBtn =
        el.querySelector('.js-download-btn');

      el.querySelector(
        '.js-filename'
      ).textContent =
        this.file.name;

      el.querySelector(
        '.js-origsize'
      ).textContent =
        U.formatBytes(this.file.size);

      this.beforeImg.src =
        this.objectUrl;

      this.processBtn.addEventListener(
        'click',
        () => this.process()
      );

      el.querySelector(
        '.js-remove-job-btn'
      ).addEventListener(
        'click',
        () => {
          this.dispose();

          el.remove();

          const idx =
            jobs.indexOf(this);

          if (idx >= 0) {
            jobs.splice(idx, 1);
          }

          updateBulkUI();
        }
      );
    }

    setProgress(pct) {
      if (!this.progressFill) {
        return;
      }

      this.progressFill.style.width =
        Math.max(
          0,
          Math.min(100, pct)
        ) + '%';
    }

    async process() {
      if (this.resultBlob) {
        return;
      }

      if (!this.file) {
        return;
      }

      this.processBtn.disabled = true;

      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );

      this.statusEl.textContent =
        'กำลังเตรียมโมเดล…';

      this.setProgress(0);

      try {
        const removeBackground =
          await loadLibrary();

        /*
         * ทุกครั้งที่เรียกใช้
         * ให้เปิด proxyToWorker ไว้
         * เพื่อย้ายงานหนักออกจาก main thread
         */
        const blob =
          await removeBackground(
            this.file,
            {
              proxyToWorker: true,

              output: {
                format: 'image/png'
              },

              progress: (
                key,
                current,
                total
              ) => {
                if (!total) {
                  return;
                }

                const pct =
                  Math.round(
                    (current / total) * 100
                  );

                this.setProgress(pct);

                const keyText =
                  typeof key === 'string'
                    ? key.toLowerCase()
                    : '';

                const downloading =
                  keyText.includes('fetch') ||
                  keyText.includes('load');

                this.statusEl.textContent =
                  (
                    downloading
                      ? 'กำลังโหลดโมเดล… '
                      : 'กำลังประมวลผล… '
                  ) +
                  pct +
                  '%';
              }
            }
          );

        if (this.resultUrl) {
          URL.revokeObjectURL(
            this.resultUrl
          );

          this.resultUrl = null;
        }

        this.resultBlob = blob;

        this.resultUrl =
          URL.createObjectURL(blob);

        this.afterImg.src =
          this.resultUrl;

        this.afterWrap.classList.remove(
          'hidden'
        );

        this.downloadBtn.href =
          this.resultUrl;

        this.downloadBtn.download =
          `${U.baseName(this.file.name)}-nobg.png`;

        this.downloadBtn.classList.remove(
          'hidden'
        );

        this.setProgress(100);

        this.statusEl.textContent =
          `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;

        this.statusEl.classList.add(
          'is-ready'
        );

      } catch (err) {

        console.error(
          'Background removal error:',
          err
        );

        this.statusEl.textContent =
          'ลบพื้นหลังไม่สำเร็จ: ' +
          (err?.message || err);

        this.statusEl.classList.add(
          'is-error'
        );

        this.setProgress(0);

      } finally {

        this.processBtn.disabled = false;

        /*
         * สำคัญ:
         * หลังจบการประมวลผล เราไม่ต้องถือ
         * function/library ไว้ใน JS app แล้ว
         */
        releaseLibraryReference();

        /*
         * เปิดโอกาสให้ browser จัดการ
         * memory หลังงานหนักจบ
         */
        await U.yieldToUI();
      }
    }

    dispose() {
      if (this.objectUrl) {
        URL.revokeObjectURL(
          this.objectUrl
        );

        this.objectUrl = null;
      }

      if (this.resultUrl) {
        URL.revokeObjectURL(
          this.resultUrl
        );

        this.resultUrl = null;
      }

      this.resultBlob = null;
    }
  }

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  function updateBulkUI() {
    countEl.textContent =
      String(jobs.length);

    bulkbar.classList.toggle(
      'hidden',
      jobs.length === 0
    );

    downloadZipBtn.classList.toggle(
      'hidden',
      !jobs.some(
        (job) => job.resultBlob
      )
    );
  }

  function addFiles(fileList) {
    Array.from(fileList)
      .filter(
        (file) =>
          file.type.startsWith('image/')
      )
      .forEach(
        (file) => {
          const job =
            new BgJob(file);

          jobs.push(job);

          jobsEl.appendChild(
            job.el
          );
        }
      );

    updateBulkUI();
  }

  clearAllBtn.addEventListener(
    'click',
    () => {
      jobs.forEach(
        (job) => job.dispose()
      );

      jobs.length = 0;

      jobsEl.innerHTML = '';

      /*
       * ปล่อย reference library ทันที
       */
      releaseLibraryReference();

      updateBulkUI();
    }
  );

  // ------------------------------------------------------------
  // Process all
  // ------------------------------------------------------------

  processAllBtn.addEventListener(
    'click',
    async () => {
      if (!jobs.length) {
        return;
      }

      processAllBtn.disabled = true;

      processAllBtn.textContent =
        'กำลังลบพื้นหลังทั้งหมด…';

      try {

        /*
         * ประมวลผลทีละรูป
         *
         * library/model จะถูกใช้ในรอบนั้น
         * แล้ว reference ถูกปล่อยหลัง process()
         */
        for (const job of jobs) {

          if (job.resultBlob) {
            continue;
          }

          await job.process();

          /*
           * คืนเวลาให้ browser
           * จัดการ garbage collection/resource
           */
          await U.yieldToUI();
        }

      } finally {

        /*
         * สำรอง: ปล่อย reference
         * หลังจบ batch เสมอ
         */
        releaseLibraryReference();

        await U.yieldToUI();

        processAllBtn.disabled = false;

        processAllBtn.textContent =
          'ลบพื้นหลังทั้งหมด';

        downloadZipBtn.classList.toggle(
          'hidden',
          !jobs.some(
            (job) => job.resultBlob
          )
        );
      }
    }
  );

  // ------------------------------------------------------------
  // ZIP
  // ------------------------------------------------------------

  downloadZipBtn.addEventListener(
    'click',
    async () => {

      const ready =
        jobs.filter(
          (job) => job.resultBlob
        );

      if (!ready.length) {
        return;
      }

      downloadZipBtn.disabled =
        true;

      downloadZipBtn.textContent =
        'กำลังบีบอัด…';

      try {

        const zip =
          new JSZip();

        const usedNames =
          new Set();

        ready.forEach(
          (job) => {

            let name =
              `${U.baseName(job.file.name)}-nobg.png`;

            let n = 2;

            while (
              usedNames.has(name)
            ) {
              name =
                `${U.baseName(job.file.name)}-nobg-${n++}.png`;
            }

            usedNames.add(name);

            zip.file(
              name,
              job.resultBlob
            );
          }
        );

        const content =
          await zip.generateAsync({
            type: 'blob'
          });

        U.downloadBlob(
          content,
          'no-background.zip'
        );

      } finally {

        downloadZipBtn.disabled =
          false;

        downloadZipBtn.textContent =
          'ดาวน์โหลดทั้งหมด (.zip)';
      }
    }
  );

  // ------------------------------------------------------------
  // Dropzone
  // ------------------------------------------------------------

  U.setupDropzone(
    dropzone,
    fileInput,
    addFiles
  );

  // ------------------------------------------------------------
  // Automatic cache clear
  // ------------------------------------------------------------

  U.onClearCache(
    () => {

      jobs.forEach(
        (job) => job.dispose()
      );

      jobs.length = 0;

      jobsEl.innerHTML = '';

      /*
       * ปล่อย reference library ด้วย
       */
      releaseLibraryReference();

      updateBulkUI();
    }
  );

})();
