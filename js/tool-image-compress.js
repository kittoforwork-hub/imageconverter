/* ============================================================
   IMAGE COMPRESS
   tool-image-compress.js
   ============================================================ */

(() => {
  'use strict';

  const U =
    window.Utils;


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

  let jobSeq =
    0;

  const jobs =
    [];


  /* ==========================================================
     CONSTANTS
  ========================================================== */

  const EXT_BY_FORMAT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp'
  };


  const ALLOWED_FORMATS = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


  const MAX_DIMENSION_LIMIT =
    20000;


  /*
   * จำนวนงานที่ประมวลผลพร้อมกัน
   */

  const CONCURRENCY =
    3;


  /*
   * จำกัดพื้นที่ canvas เพื่อป้องกัน
   * browser memory พุ่งเกินไป
   */

  const MAX_CANVAS_PIXELS =
    100000000;


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
      !Number.isFinite(
        value
      )
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
      !Number.isFinite(
        value
      ) ||
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

    const value =
      formatEl
        ? formatEl.value
        : 'image/jpeg';


    if (
      !ALLOWED_FORMATS.includes(
        value
      )
    ) {

      return 'image/jpeg';
    }


    return value;
  }


  function getOutputDimensions(
    naturalW,
    naturalH,
    maxSize
  ) {

    if (
      !naturalW ||
      !naturalH
    ) {

      return {
        width: 1,
        height: 1
      };
    }


    /*
     * ถ้าไม่จำกัดด้านยาว
     */

    if (
      !maxSize ||
      Math.max(
        naturalW,
        naturalH
      ) <= maxSize
    ) {

      return {
        width:
          Math.max(
            1,
            Math.round(
              naturalW
            )
          ),

        height:
          Math.max(
            1,
            Math.round(
              naturalH
            )
          )
      };
    }


    const scale =
      maxSize /
      Math.max(
        naturalW,
        naturalH
      );


    const width =
      Math.max(
        1,
        Math.round(
          naturalW *
          scale
        )
      );


    const height =
      Math.max(
        1,
        Math.round(
          naturalH *
          scale
        )
      );


    return {
      width,
      height
    };
  }


  function fitCanvasDimensions(
    width,
    height
  ) {

    let outW =
      width;

    let outH =
      height;


    const pixels =
      outW *
      outH;


    if (
      pixels <=
      MAX_CANVAS_PIXELS
    ) {

      return {
        width:
          outW,
        height:
          outH
      };
    }


    const scale =
      Math.sqrt(
        MAX_CANVAS_PIXELS /
        pixels
      );


    outW =
      Math.max(
        1,
        Math.floor(
          outW *
          scale
        )
      );


    outH =
      Math.max(
        1,
        Math.floor(
          outH *
          scale
        )
      );


    return {
      width:
        outW,
      height:
        outH
    };
  }


  function calculateSaving(
    originalSize,
    newSize
  ) {

    if (
      !Number.isFinite(
        originalSize
      ) ||
      originalSize <= 0 ||
      !Number.isFinite(
        newSize
      ) ||
      newSize < 0
    ) {

      return {
        percent:
          0,

        bytes:
          0,

        isSmaller:
          false
      };
    }


    const bytes =
      originalSize -
      newSize;


    const percent =
      (
        bytes /
        originalSize
      ) *
      100;


    return {
      percent:
        percent,

      bytes:
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

    if (
      !Number.isFinite(
        originalSize
      ) ||
      originalSize <= 0
    ) {

      return '—';
    }


    const result =
      calculateSaving(
        originalSize,
        newSize
      );


    /*
     * เล็กลง
     */

    if (
      result.isSmaller
    ) {

      return (
        `-${result.percent.toFixed(1)}% · ` +
        `ประหยัด ${U.formatBytes(
          result.bytes
        )}`
      );
    }


    /*
     * ใหญ่ขึ้น
     */

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
        ) *
        100;


      return (
        `+${increase.toFixed(1)}% · ` +
        'ไฟล์ใหญ่ขึ้น'
      );
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

    } catch (_) {

      /* ignore */

    }
  }


  function setProgress(
    job,
    value
  ) {

    if (!job.progressEl) {
      return;
    }


    const percent =
      Math.min(
        100,
        Math.max(
          0,
          Number(
            value
          ) || 0
        )
      );


    job.progressEl.style.width =
      `${percent}%`;
  }


  /* ==========================================================
     COMPRESS JOB
  ========================================================== */

  class CompressJob {

    constructor(
      file
    ) {

      this.id =
        'compress-' +
        (++jobSeq);


      this.file =
        file;


      /*
       * เก็บค่าตั้งต้นของงาน
       */

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


      this.isProcessing =
        false;


      this.el =
        jobTemplate
          .content
          .firstElementChild
          .cloneNode(
            true
          );


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


      if (this.newDimEl) {

        this.newDimEl.textContent =
          '—';
      }


      if (this.newSizeEl) {

        this.newSizeEl.textContent =
          '—';
      }


      if (this.savingEl) {

        this.savingEl.textContent =
          '—';
      }


      setProgress(
        this,
        0
      );


      this.previewImg.src =
        this.sourceUrl;


      this.previewImg.onload =
        () => {

          this.naturalW =
            this.previewImg
              .naturalWidth;


          this.naturalH =
            this.previewImg
              .naturalHeight;


          if (origDimEl) {

            origDimEl.textContent =
              `${this.naturalW}×${this.naturalH}`;
          }


          this.updatePreviewInfo();

        };


      this.previewImg.onerror =
        () => {

          if (origDimEl) {

            origDimEl.textContent =
              'อ่านรูปไม่สำเร็จ';
          }


          if (this.statusEl) {

            this.statusEl.textContent =
              'เปิดรูปไม่สำเร็จ';


            this.statusEl.classList.add(
              'is-error'
            );
          }


          if (this.compressBtn) {

            this.compressBtn.disabled =
              true;
          }

        };


      if (this.compressBtn) {

        this.compressBtn.addEventListener(
          'click',
          () => {

            this.compress();

          }
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


            const index =
              jobs.indexOf(
                this
              );


            if (
              index >=
              0
            ) {

              jobs.splice(
                index,
                1
              );

            }


            updateBulkUI();

          }
        );
      }

    }


    /* ========================================================
       PREVIEW INFO
    ======================================================== */

    updatePreviewInfo() {

      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        return;
      }


      const dimensions =
        getOutputDimensions(
          this.naturalW,
          this.naturalH,
          this.maxSize
        );


      const safeDimensions =
        fitCanvasDimensions(
          dimensions.width,
          dimensions.height
        );


      if (this.newDimEl) {

        this.newDimEl.textContent =
          `${safeDimensions.width}×${safeDimensions.height}`;

      }

    }


    /* ========================================================
       UPDATE OPTIONS
    ======================================================== */

    updateOptionsFromGlobal(
      invalidate = true
    ) {

      const nextFormat =
        getFormat();


      const nextQuality =
        getQuality();


      const nextMaxSize =
        getMaxSize();


      const changed =
        nextFormat !==
          this.format ||
        nextQuality !==
          this.quality ||
        nextMaxSize !==
          this.maxSize;


      this.format =
        nextFormat;


      this.quality =
        nextQuality;


      this.maxSize =
        nextMaxSize;


      if (
        this.naturalW &&
        this.naturalH
      ) {

        this.updatePreviewInfo();

      }


      if (
        invalidate &&
        changed
      ) {

        this.markStale();

      }

    }


    /* ========================================================
       MARK STALE
    ======================================================== */

    markStale() {

      if (this.isProcessing) {
        return;
      }


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


      setProgress(
        this,
        0
      );


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
        this.isProcessing
      ) {

        return;
      }


      /*
       * ถ้ารูปยังโหลดไม่เสร็จ
       */

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


            const onLoad =
              () => {

                resolve();

              };


            this.previewImg.addEventListener(
              'load',
              onLoad,
              {
                once:
                  true
              }
            );

          }
        );

      }


      if (
        !this.naturalW ||
        !this.naturalH
      ) {

        if (this.statusEl) {

          this.statusEl.textContent =
            'อ่านข้อมูลรูปไม่สำเร็จ';


          this.statusEl.classList.add(
            'is-error'
          );
        }


        return;
      }


      /*
       * อ่านค่าปัจจุบัน
       *
       * invalidate = false
       * เพราะตอนนี้กำลังจะสร้างผลลัพธ์ใหม่
       * ไม่จำเป็นต้อง markStale ซ้ำ
       */

      this.updateOptionsFromGlobal(
        false
      );


      this.isProcessing =
        true;


      this.compressBtn.disabled =
        true;


      this.el.dataset.processing =
        'true';


      this.statusEl.classList.remove(
        'is-ready',
        'is-error'
      );


      this.statusEl.textContent =
        'กำลังลดขนาด…';


      setProgress(
        this,
        8
      );


      /*
       * ช่วยให้ UI มีโอกาสวาดสถานะกำลังทำงาน
       */

      await new Promise(
        resolve =>
          requestAnimationFrame(
            resolve
          )
      );


      let canvas =
        null;


      try {

        /*
         * คำนวณขนาด
         */

        let dimensions =
          getOutputDimensions(
            this.naturalW,
            this.naturalH,
            this.maxSize
          );


        /*
         * ป้องกัน canvas ใหญ่เกิน
         */

        dimensions =
          fitCanvasDimensions(
            dimensions.width,
            dimensions.height
          );


        if (
          dimensions.width <= 0 ||
          dimensions.height <= 0
        ) {

          throw new Error(
            'ขนาดภาพปลายทางไม่ถูกต้อง'
          );
        }


        if (this.newDimEl) {

          this.newDimEl.textContent =
            `${dimensions.width}×${dimensions.height}`;
        }


        setProgress(
          this,
          25
        );


        canvas =
          document.createElement(
            'canvas'
          );


        canvas.width =
          dimensions.width;


        canvas.height =
          dimensions.height;


        const ctx =
          canvas.getContext(
            '2d',
            {
              alpha:
                true
            }
          );


        if (!ctx) {

          throw new Error(
            'ไม่สามารถสร้าง Canvas ได้'
          );
        }


        /*
         * JPG ไม่มี transparency
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


        /*
         * ให้ browser ใช้
         * image smoothing คุณภาพสูง
         */

        ctx.imageSmoothingEnabled =
          true;


        ctx.imageSmoothingQuality =
          'high';


        setProgress(
          this,
          42
        );


        ctx.drawImage(
          this.previewImg,
          0,
          0,
          dimensions.width,
          dimensions.height
        );


        setProgress(
          this,
          68
        );


        const quality =
          this.format ===
            'image/png'
            ? undefined
            : this.quality;


        const blob =
          await new Promise(
            (
              resolve,
              reject
            ) => {

              canvas.toBlob(
                result => {

                  if (
                    result
                  ) {

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


        setProgress(
          this,
          82
        );


        /*
         * ลบผลลัพธ์เก่า
         */

        if (
          this.resultUrl
        ) {

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


        /*
         * ขนาดใหม่
         */

        if (this.newSizeEl) {

          this.newSizeEl.textContent =
            U.formatBytes(
              blob.size
            );

        }


        /*
         * เปอร์เซ็นต์การลด
         */

        if (this.savingEl) {

          this.savingEl.textContent =
            formatSaving(
              this.file.size,
              blob.size
            );

        }


        setProgress(
          this,
          100
        );


        const saving =
          calculateSaving(
            this.file.size,
            blob.size
          );


        /*
         * Status
         */

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
            `พร้อมดาวน์โหลด · ${U.formatBytes(
              blob.size
            )}`;

        }


        this.statusEl.classList.add(
          'is-ready'
        );


        /*
         * ทำเครื่องหมายว่างานเสร็จ
         */

        this.el.dataset.processing =
          'false';

      } catch (error) {

        console.error(
          '[Image Compress]',
          error
        );


        setProgress(
          this,
          0
        );


        if (this.downloadBtn) {

          this.downloadBtn.classList.add(
            'hidden'
          );

        }


        this.statusEl.textContent =
          'ลดขนาดไม่สำเร็จ: ' +
          (
            error &&
            error.message
              ? error.message
              : 'เกิดข้อผิดพลาด'
          );


        this.statusEl.classList.add(
          'is-error'
        );


        this.el.dataset.processing =
          'false';

      } finally {

        /*
         * คืน canvas
         */

        if (canvas) {

          canvas.width =
            1;


          canvas.height =
            1;


          canvas =
            null;
        }


        this.isProcessing =
          false;


        this.compressBtn.disabled =
          false;


        this.el.dataset.processing =
          'false';

      }

    }


    /* ========================================================
       DISPOSE
    ======================================================== */

    dispose() {

      if (this.sourceUrl) {

        revokeUrl(
          this.sourceUrl
        );

      }


      if (this.resultUrl) {

        revokeUrl(
          this.resultUrl
        );

      }


      this.sourceUrl =
        null;


      this.resultUrl =
        null;


      this.resultBlob =
        null;


      this.isProcessing =
        false;


      this.el.dataset.processing =
        'false';

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
        fileList || []
      );


    files
      .filter(
        file =>
          file &&
          ALLOWED_FORMATS.includes(
            file.type
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

        job.updateOptionsFromGlobal(
          true
        );

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


        /*
         * อ่าน settings ล่าสุด
         */

        refreshAllJobs();


        compressAllBtn.disabled =
          true;


        compressAllBtn.textContent =
          'กำลังลดขนาดทั้งหมด…';


        /*
         * ป้องกันการกดซ้ำ
         */

        jobs.forEach(
          job => {

            if (
              job.isProcessing
            ) {
              job.isQueued = true;
            }

          }
        );


        try {

          let index =
            0;


          async function worker() {

            while (
              index <
              jobs.length
            ) {

              const job =
                jobs[index++];


              if (
                !job ||
                job.isProcessing
              ) {

                continue;
              }


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

  if (
    U &&
    typeof U.setupDropzone ===
      'function'
  ) {

    U.setupDropzone(
      dropzone,
      fileInput,
      addFiles
    );

  }


  /* ==========================================================
     CLEAR CACHE
  ========================================================== */

  if (
    U &&
    typeof U.onClearCache ===
      'function'
  ) {

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

  }

})();
