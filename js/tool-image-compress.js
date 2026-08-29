/* ============================================================
   IMAGE COMPRESS
   tool-image-compress.js
   ============================================================ */

(() => {
  'use strict';

  const U = window.Utils;


  /* ==========================================================
     ELEMENTS
  ========================================================== */

  const dropzone =
    document.getElementById(
      'dz-img-compress'
    );

  const fileInput =
    document.getElementById(
      'input-img-compress'
    );

  const bulkbar =
    document.getElementById(
      'bulk-img-compress'
    );

  const countEl =
    document.getElementById(
      'count-img-compress'
    );

  const qualityEl =
    document.getElementById(
      'quality-img-compress'
    );

  const maxSizeEl =
    document.getElementById(
      'maxsize-img-compress'
    );

  const formatEl =
    document.getElementById(
      'format-img-compress'
    );

  const clearAllBtn =
    document.getElementById(
      'clearAll-img-compress'
    );

  const compressAllBtn =
    document.getElementById(
      'compressAll-img-compress'
    );

  const downloadZipBtn =
    document.getElementById(
      'downloadZip-img-compress'
    );

  const jobsEl =
    document.getElementById(
      'jobs-img-compress'
    );

  const jobTemplate =
    document.getElementById(
      'tpl-img-compress'
    );


  /* ==========================================================
     VALIDATION
  ========================================================== */

  if (
    !dropzone ||
    !fileInput ||
    !jobsEl ||
    !jobTemplate
  ) {

    console.warn(
      '[Image Compress] Required elements not found.'
    );

    return;
  }


  /* ==========================================================
     STATE
  ========================================================== */

  let jobSeq = 0;

  const jobs = [];


  const EXT_BY_FORMAT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp'
  };


  const MAX_DIMENSION_LIMIT = 20000;

  const CONCURRENCY = 3;


  /* ==========================================================
     HELPERS
  ========================================================== */

  function getQuality() {

    if (!qualityEl) {
      return 0.85;
    }

    const value =
      parseFloat(
        qualityEl.value
      );


    if (
      !Number.isFinite(value)
    ) {

      return 0.85;
    }


    return Math.min(
      1,
      Math.max(
        0.05,
        value
      )
    );
  }


  function getMaxSize() {

    if (!maxSizeEl) {
      return 0;
    }

    const value =
      parseInt(
        maxSizeEl.value,
        10
      );


    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {

      return 0;
    }


    return Math.min(
      MAX_DIMENSION_LIMIT,
      value
    );
  }


  function getFormat() {

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];


    const value =
      formatEl
        ? formatEl.value
        : 'image/jpeg';


    return allowed.includes(
      value
    )
      ? value
      : 'image/jpeg';
  }


  function getOutputDimensions(
    naturalW,
    naturalH,
    maxSize
  ) {

    let outW =
      naturalW;

    let outH =
      naturalH;


    if (
      !maxSize ||
      Math.max(
        naturalW,
        naturalH
      ) <= maxSize
    ) {

      return {
        width: outW,
        height: outH
      };
    }


    const scale =
      maxSize /
      Math.max(
        naturalW,
        naturalH
      );


    outW =
      Math.max(
        1,
        Math.round(
          naturalW * scale
        )
      );


    outH =
      Math.max(
        1,
        Math.round(
          naturalH * scale
        )
      );


    return {
      width: outW,
      height: outH
    };
  }


  function calculateSaving(
    originalSize,
    newSize
  ) {

    if (
      !originalSize ||
      !Number.isFinite(originalSize) ||
      !Number.isFinite(newSize)
    ) {

      return {
        percent: 0,
        bytes: 0,
        isSmaller: false
      };
    }


    const bytes =
      originalSize -
      newSize;


    const percent =
      (
        bytes /
        originalSize
      ) * 100;


    return {
      percent: Math.max(
        0,
        percent
      ),
      bytes,
      isSmaller:
        newSize <
        originalSize
    };
  }


  function formatSaving(
    originalSize,
    newSize
  ) {

    const result =
      calculateSaving(
        originalSize,
        newSize
      );


    if (
      result.isSmaller
    ) {

      return `-${result.percent.toFixed(1)}% · ประหยัด ${U.formatBytes(result.bytes)}`;
    }


    if (
      newSize >
      originalSize
    ) {

      const increase =
        (
          (
            newSize -
            originalSize
          ) /
          originalSize
        ) * 100;


      return `+${increase.toFixed(1)}% · ไฟล์ใหญ่ขึ้น`;
    }


    return '0% · ขนาดเท่าเดิม';
  }


  function revokeUrl(
    url
  ) {

    if (!url) {
      return;
    }


    try {

      URL.revokeObjectURL(
        url
      );

    } catch (error) {

      /* Ignore */

    }
  }


  /* ==========================================================
     COMPRESS JOB
  ========================================================== */

  class CompressJob {

    constructor(file) {

      this.id =
        'compress-' +
        (++jobSeq);


      this.file =
        file;


      this.format =
        getFormat();


      this.quality =
        getQuality();


      this.maxSize =
        getMaxSize();


      this.naturalW =
        0;


      this.naturalH =
        0;


      this.resultBlob =
        null;


      this.resultUrl =
        null;


      this.sourceUrl =
        null;


      this.el =
        jobTemplate.content
          .firstElementChild
          .cloneNode(true);


      this.buildDom();
    }


    /* ========================================================
       DOM
    ======================================================== */

    buildDom() {

      const el =
        this.el;


      this.sourceUrl =
        URL.createObjectURL(
          this.file
        );


      this.previewImg =
        el.querySelector(
          '.js-preview'
        );


      this.statusEl =
        el.querySelector(
          '.js-status'
        );


      this.compressBtn =
        el.querySelector(
          '.js-compress-btn'
        );


      this.downloadBtn =
        el.querySelector(
          '.js-download-btn'
        );


      this.progressEl =
        el.querySelector(
          '.js-progress'
        );


      this.newDimEl =
        el.querySelector(
          '.js-newdim'
        );


      this.newSizeEl =
        el.querySelector(
          '.js-newsize'
        );


      this.savingEl =
        el.querySelector(
          '.js-saving'
        );


      const filenameEl =
        el.querySelector(
          '.js-filename'
        );


      const origDimEl =
        el.querySelector(
          '.js-origdim'
        );


      const origSizeEl =
        el.querySelector(
          '.js-origsize'
        );


      if (filenameEl) {

        filenameEl.textContent =
          this.file.name;
      }


      if (origSizeEl) {

        origSizeEl.textContent =
          U.formatBytes(
            this.file.size
          );
      }


      if (origDimEl) {

        origDimEl.textContent =
          'กำลังอ่าน...';
      }


      this.previewImg.src =
        this.sourceUrl;


      this.previewImg.onload =
        () => {

          this.naturalW =
            this.previewImg.naturalWidth;


          this.naturalH =
            this.previewImg.naturalHeight;


          if (origDimEl) {

            origDimEl.textContent =
              `${this.naturalW}×${this.naturalH}`;
          }


          /*
           * ถ้ายังไม่ได้ตั้ง max size
           * แสดงผลขนาดปลายทางเบื้องต้น
           */

          this.updatePreviewInfo();
        };


      this.previewImg.onerror =
        () => {

          if (origDimEl) {

            origDimEl.textContent =
              'อ่านรูปไม่สำเร็จ';
          }


          this.statusEl.textContent =
            'เปิดรูปไม่สำเร็จ';


          this.statusEl.classList.add(
            'is-error'
          );


          if (this.compressBtn) {

            this.compressBtn.disabled =
              true;
          }
        };


      if (this.compressBtn) {

        this.compressBtn.addEventListener(
          'click',
          () => this.compress()
        );
      }


      const removeBtn =
        el.querySelector(
          '.js-remove-btn'
        );


      if (removeBtn) {

        removeBtn.addEventListener(
          'click',
          () => {

            this.dispose();


            el.remove();


            const idx =
              jobs.indexOf(
                this
              );


            if (idx >= 0) {

              jobs.splice(
                idx,
                1
              );
            }


            updateBulkUI();
          }
        );
      }
    }


    /* ========================================================
       UPDATE PREVIEW INFO
    ======================================================== */

    updatePreviewInfo() {

      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        return;
      }


      const maxSize =
        this.maxSize;


      const dimensions =
        getOutputDimensions(
          this.naturalW,
          this.naturalH,
          maxSize
        );


      if (this.newDimEl) {

        this.newDimEl.textContent =
          `${dimensions.width}×${dimensions.height}`;
      }
    }


    /* ========================================================
       UPDATE OPTIONS
    ======================================================== */

    updateOptionsFromGlobal() {

      this.format =
        getFormat();


      this.quality =
        getQuality();


      this.maxSize =
        getMaxSize();


      this.updatePreviewInfo();

      this.markStale();
    }


    /* ========================================================
       MARK STALE
    ======================================================== */

    markStale() {

      if (this.resultUrl) {

        revokeUrl(
          this.resultUrl
        );


        this.resultUrl =
          null;
      }


      this.resultBlob =
        null;


      if (this.downloadBtn) {

        this.downloadBtn.removeAttribute(
          'href'
        );


        this.downloadBtn.removeAttribute(
          'download'
        );


        this.downloadBtn.classList.add(
          'hidden'
        );
      }


      if (this.progressEl) {

        this.progressEl.style.width =
          '0%';
      }


      if (this.newSizeEl) {

        this.newSizeEl.textContent =
          '—';
      }


      if (this.savingEl) {

        this.savingEl.textContent =
          '—';
      }


      if (this.statusEl) {

        this.statusEl.textContent =
          'รอลดขนาด';


        this.statusEl.classList.remove(
          'is-ready',
          'is-error'
        );
      }
    }


    /* ========================================================
       COMPRESS
    ======================================================== */

    async compress() {

      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        await new Promise(
          resolve => {

            if (
              this.naturalW &&
              this.naturalH
            ) {

              resolve();

              return;
            }


            this.previewImg.addEventListener(
              'load',
              resolve,
              {
                once: true
              }
            );
          }
        );
      }


      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        this.statusEl.textContent =
          'อ่านข้อมูลรูปไม่สำเร็จ';


        this.statusEl.classList.add(
          'is-error'
        );


        return;
      }


      this.compressBtn.disabled =
        true;


      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );


      this.statusEl.textContent =
        'กำลังลดขนาด…';


      if (this.progressEl) {

        this.progressEl.style.width =
          '15%';
      }


      try {

        /*
         * อ่านค่าปัจจุบันจาก toolbar
         * เพื่อให้เปลี่ยนค่าก่อนกดได้เสมอ
         */

        this.updateOptionsFromGlobal();


        const dimensions =
          getOutputDimensions(
            this.naturalW,
            this.naturalH,
            this.maxSize
          );


        const canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          dimensions.width;


        canvas.height =
          dimensions.height;


        const ctx =
          canvas.getContext(
            '2d'
          );


        if (!ctx) {

          throw new Error(
            'ไม่สามารถสร้าง Canvas ได้'
          );
        }


        /*
         * JPG ไม่มี transparency
         * จึงเติมพื้นหลังสีขาว
         */

        if (
          this.format ===
          'image/jpeg'
        ) {

          ctx.fillStyle =
            '#FFFFFF';


          ctx.fillRect(
            0,
            0,
            dimensions.width,
            dimensions.height
          );
        }


        if (this.progressEl) {

          this.progressEl.style.width =
            '35%';
        }


        ctx.imageSmoothingEnabled =
          true;


        ctx.imageSmoothingQuality =
          'high';


        ctx.drawImage(
          this.previewImg,
          0,
          0,
          dimensions.width,
          dimensions.height
        );


        if (this.progressEl) {

          this.progressEl.style.width =
            '65%';
        }


        const quality =
          this.format === 'image/png'
            ? undefined
            : this.quality;


        const blob =
          await new Promise(
            (resolve, reject) => {

              canvas.toBlob(
                result => {

                  if (result) {

                    resolve(
                      result
                    );

                  } else {

                    reject(
                      new Error(
                        'สร้างไฟล์ผลลัพธ์ไม่สำเร็จ'
                      )
                    );
                  }

                },
                this.format,
                quality
              );

            }
          );


        if (!blob) {

          throw new Error(
            'สร้างไฟล์ผลลัพธ์ไม่สำเร็จ'
          );
        }


        if (this.resultUrl) {

          revokeUrl(
            this.resultUrl
          );
        }


        this.resultBlob =
          blob;


        this.resultUrl =
          URL.createObjectURL(
            blob
          );


        const ext =
          EXT_BY_FORMAT[
            this.format
          ] || 'jpg';


        const outputName =
          `${U.baseName(
            this.file.name
          )}.${ext}`;


        if (this.downloadBtn) {

          this.downloadBtn.href =
            this.resultUrl;


          this.downloadBtn.download =
            outputName;


          this.downloadBtn.classList.remove(
            'hidden'
          );
        }


        if (this.newDimEl) {

          this.newDimEl.textContent =
            `${dimensions.width}×${dimensions.height}`;
        }


        if (this.newSizeEl) {

          this.newSizeEl.textContent =
            U.formatBytes(
              blob.size
            );
        }


        if (this.savingEl) {

          this.savingEl.textContent =
            formatSaving(
              this.file.size,
              blob.size
            );
        }


        if (this.progressEl) {

          this.progressEl.style.width =
            '100%';
        }


        const saving =
          calculateSaving(
            this.file.size,
            blob.size
          );


        if (
          saving.isSmaller
        ) {

          this.statusEl.textContent =
            `พร้อมดาวน์โหลด · ลด ${saving.percent.toFixed(1)}%`;

        } else if (
          blob.size >
          this.file.size
        ) {

          this.statusEl.textContent =
            'พร้อมดาวน์โหลด · ไฟล์ใหญ่ขึ้น';

        } else {

          this.statusEl.textContent =
            `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;
        }


        this.statusEl.classList.add(
          'is-ready'
        );

      } catch (err) {

        console.error(
          '[Image Compress]',
          err
        );


        if (this.progressEl) {

          this.progressEl.style.width =
            '0%';
        }


        this.statusEl.textContent =
          'ลดขนาดไม่สำเร็จ: ' +
          (err &&
           err.message
            ? err.message
            : 'เกิดข้อผิดพลาด');


        this.statusEl.classList.add(
          'is-error'
        );

      } finally {

        this.compressBtn.disabled =
          false;
      }
    }


    /* ========================================================
       DISPOSE
    ======================================================== */

    dispose() {

      revokeUrl(
        this.sourceUrl
      );


      revokeUrl(
        this.resultUrl
      );


      this.sourceUrl =
        null;


      this.resultUrl =
        null;


      this.resultBlob =
        null;
    }
  }


  /* ==========================================================
     BULK UI
  ========================================================== */

  function updateBulkUI() {

    if (countEl) {

      countEl.textContent =
        String(
          jobs.length
        );
    }


    if (bulkbar) {

      bulkbar.classList.toggle(
        'hidden',
        jobs.length === 0
      );
    }


    const hasReady =
      jobs.some(
        job =>
          !!job.resultBlob
      );


    if (downloadZipBtn) {

      downloadZipBtn.classList.toggle(
        'hidden',
        !hasReady
      );
    }
  }


  /* ==========================================================
     ADD FILES
  ========================================================== */

  function addFiles(
    fileList
  ) {

    const files =
      Array.from(
        fileList
      );


    files
      .filter(
        file =>
          file &&
          (
            file.type ===
              'image/jpeg' ||
            file.type ===
              'image/png' ||
            file.type ===
              'image/webp'
          )
      )
      .forEach(
        file => {

          const job =
            new CompressJob(
              file
            );


          jobs.push(
            job
          );


          jobsEl.appendChild(
            job.el
          );

        }
      );


    updateBulkUI();
  }


  /* ==========================================================
     APPLY GLOBAL SETTINGS
  ========================================================== */

  function refreshAllJobs() {

    jobs.forEach(
      job => {

        job.updateOptionsFromGlobal();

      }
    );


    updateBulkUI();
  }


  if (qualityEl) {

    qualityEl.addEventListener(
      'change',
      refreshAllJobs
    );
  }


  if (maxSizeEl) {

    maxSizeEl.addEventListener(
      'change',
      refreshAllJobs
    );
  }


  if (formatEl) {

    formatEl.addEventListener(
      'change',
      refreshAllJobs
    );
  }


  /* ==========================================================
     CLEAR ALL
  ========================================================== */

  if (clearAllBtn) {

    clearAllBtn.addEventListener(
      'click',
      () => {

        jobs.forEach(
          job =>
            job.dispose()
        );


        jobs.length =
          0;


        jobsEl.innerHTML =
          '';


        updateBulkUI();

      }
    );
  }


  /* ==========================================================
     COMPRESS ALL
  ========================================================== */

  if (compressAllBtn) {

    compressAllBtn.addEventListener(
      'click',
      async () => {

        if (!jobs.length) {
          return;
        }


        refreshAllJobs();


        compressAllBtn.disabled =
          true;


        compressAllBtn.textContent =
          'กำลังลดขนาดทั้งหมด…';


        try {

          /*
           * จำกัด concurrency
           * เพื่อไม่ให้ browser ใช้ RAM/CPU หนักเกินไป
           */

          let index =
            0;


          async function worker() {

            while (
              index <
              jobs.length
            ) {

              const job =
                jobs[index++];


              await job.compress();
            }

          }


          const workerCount =
            Math.min(
              CONCURRENCY,
              jobs.length
            );


          await Promise.all(
            Array.from(
              {
                length:
                  workerCount
              },
              () =>
                worker()
            )
          );

        } finally {

          compressAllBtn.disabled =
            false;


          compressAllBtn.textContent =
            'ลดขนาดทั้งหมด';


          updateBulkUI();

        }
      }
    );
  }


  /* ==========================================================
     DOWNLOAD ZIP
  ========================================================== */

  if (downloadZipBtn) {

    downloadZipBtn.addEventListener(
      'click',
      async () => {

        const ready =
          jobs.filter(
            job =>
              !!job.resultBlob
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
            job => {

              const ext =
                EXT_BY_FORMAT[
                  job.format
                ] || 'jpg';


              const base =
                U.baseName(
                  job.file.name
                );


              let name =
                `${base}.${ext}`;


              let n =
                2;


              while (
                usedNames.has(
                  name
                )
              ) {

                name =
                  `${base}-${n++}.${ext}`;
              }


              usedNames.add(
                name
              );


              zip.file(
                name,
                job.resultBlob
              );

            }
          );


          const content =
            await zip.generateAsync(
              {
                type:
                  'blob'
              }
            );


          U.downloadBlob(
            content,
            'compressed-images.zip'
          );

        } catch (error) {

          console.error(
            '[Image Compress] ZIP failed:',
            error
          );

        } finally {

          downloadZipBtn.disabled =
            false;


          downloadZipBtn.textContent =
            'ดาวน์โหลดทั้งหมด (.zip)';

        }
      }
    );
  }


  /* ==========================================================
     DROPZONE
  ========================================================== */

  U.setupDropzone(
    dropzone,
    fileInput,
    addFiles
  );


  /* ==========================================================
     CLEAR CACHE
  ========================================================== */

  U.onClearCache(
    () => {

      jobs.forEach(
        job =>
          job.dispose()
      );


      jobs.length =
        0;


      jobsEl.innerHTML =
        '';


      updateBulkUI();

    }
  );

})();
