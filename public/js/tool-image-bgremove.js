/* global window, document, URL, JSZip */
(() => {
  'use strict';

  const U = window.Utils || {};
  const I18n = window.I18n || null;

  // ============================================================
  // I18N
  // ============================================================

  const t = (key, values) => {
    if (
      I18n &&
      typeof I18n.t === 'function'
    ) {
      return I18n.t(
        key,
        values
      );
    }

    return String(key);
  };

  // ============================================================
  // DOM
  // ============================================================

  const el = {
    dropzone:
      document.getElementById(
        'dz-img-bgremove'
      ),

    fileInput:
      document.getElementById(
        'input-img-bgremove'
      ),

    bulkbar:
      document.getElementById(
        'bulk-img-bgremove'
      ),

    count:
      document.getElementById(
        'count-img-bgremove'
      ),

    clearAll:
      document.getElementById(
        'clearAll-img-bgremove'
      ),

    processAll:
      document.getElementById(
        'processAll-img-bgremove'
      ),

    downloadZip:
      document.getElementById(
        'downloadZip-img-bgremove'
      ),

    jobs:
      document.getElementById(
        'jobs-img-bgremove'
      ),

    template:
      document.getElementById(
        'tpl-img-bgremove'
      )
  };

  if (
    Object.values(el).some(
      value => !value
    )
  ) {
    console.warn(
      '[Image Background Removal] Required elements not found.'
    );

    return;
  }

  // ============================================================
  // CONFIG
  // ============================================================

  const OUTPUT_FORMAT =
    'image/png';

  const OUTPUT_EXTENSION =
    'png';

  const BACKGROUND_API_ENDPOINT =
    '/api/remove-background';

  const MAX_UPLOAD_BYTES =
    20 * 1024 * 1024;

  // ============================================================
  // STATE
  // ============================================================

  const jobs = [];

  let jobSeq =
    0;

  // Keep only one AI request active at a time to avoid request bursts.
  let cloudflareQueue =
    Promise.resolve();

  // ============================================================
  // HELPERS
  // ============================================================

  const yieldUI = async () => {

    if (
      typeof U.yieldToUI ===
      'function'
    ) {
      await U.yieldToUI();
      return;
    }

    await new Promise(
      resolve => {

        if (
          typeof requestAnimationFrame ===
          'function'
        ) {
          requestAnimationFrame(
            resolve
          );
        } else {
          setTimeout(
            resolve,
            0
          );
        }

      }
    );

  };

  const baseName = name => {

    if (
      typeof U.baseName ===
      'function'
    ) {
      return U.baseName(
        name
      );
    }

    return String(
      name ||
      'image'
    ).replace(
      /\.[^.]+$/,
      ''
    );

  };

  const formatBytes =
    bytes => {

      if (
        typeof U.formatBytes ===
        'function'
      ) {
        return U.formatBytes(
          bytes
        );
      }

      if (
        !Number.isFinite(
          bytes
        )
      ) {
        return '';
      }

      const units = [
        'B',
        'KB',
        'MB',
        'GB'
      ];

      let n =
        Math.max(
          0,
          bytes
        );

      let i =
        0;

      while (
        n >= 1024 &&
        i <
        units.length - 1
      ) {

        n /=
          1024;

        i++;

      }

      return `${n.toFixed(
        i ? 1 : 0
      )} ${units[i]}`;

    };

  const revoke =
    url => {

      if (!url) {
        return;
      }

      try {
        URL.revokeObjectURL(
          url
        );
      } catch (_) { }

    };

  const downloadBlob =
    (
      blob,
      filename
    ) => {

      if (
        typeof U.downloadBlob ===
        'function'
      ) {

        U.downloadBlob(
          blob,
          filename
        );

        return;

      }

      const url =
        URL.createObjectURL(
          blob
        );

      const a =
        document.createElement(
          'a'
        );

      a.href =
        url;

      a.download =
        filename;

      a.click();

      setTimeout(
        () => {
          revoke(
            url
          );
        },
        1000
      );

    };

  const errorKey =
    () => 'image.backgroundRemovalFailed';

  // ============================================================
  // EXECUTE ONE CLOUDFLARE AI JOB
  // ============================================================

  async function executeCloudflareJob(job) {

    if (!job || job.disposed) {
      throw new Error('BACKGROUND_CANCELLED');
    }

    if (job.file.size > MAX_UPLOAD_BYTES) {
      throw new Error('BACKGROUND_FILE_TOO_LARGE');
    }

    const controller = new AbortController();
    job.abortController = controller;
    job.mode = 'cloudflare';

    const timeout = setTimeout(
      () => controller.abort(),
      120 * 1000
    );

    try {
      job.setProgress(8);
      job.setProgressText('ai', 10);

      const response = await fetch(
        BACKGROUND_API_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': job.file.type || 'application/octet-stream',
            'Accept': 'image/png'
          },
          body: job.file,
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const diagnostic = [payload.cfCode, payload.diagnostic]
          .filter(Boolean)
          .join(' | ');
        throw new Error(
          `${payload.code || `BACKGROUND_API_HTTP_${response.status}`}${diagnostic ? ` [${diagnostic}]` : ''}`
        );
      }

      const outputType = (response.headers.get('Content-Type') || '')
        .split(';', 1)[0]
        .trim()
        .toLowerCase();

      if (outputType !== OUTPUT_FORMAT) {
        throw new Error('BACKGROUND_INVALID_OUTPUT');
      }

      job.setProgress(92);
      job.setProgressText('output', 90);

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('BACKGROUND_EMPTY_RESULT');
      }

      return blob;

    } catch (error) {
      if (controller.signal.aborted || (error && error.name === 'AbortError')) {
        throw new Error(
          job.disposed
            ? 'BACKGROUND_CANCELLED'
            : 'BACKGROUND_TIMEOUT'
        );
      }
      throw error;

    } finally {
      clearTimeout(timeout);
      if (job.abortController === controller) {
        job.abortController = null;
      }
    }

  }

  // ============================================================
  // PROCESS QUEUE
  // ============================================================

  function processInCloudflareQueue(
    job
  ) {

    const task =
      cloudflareQueue.then(
        async () => {

          if (
            job.disposed
          ) {

            throw new Error(
              'BACKGROUND_CANCELLED'
            );

          }

          return await executeCloudflareJob(job);

        }
      );

    /*
     * Do not break the queue if current task rejects.
     */
    cloudflareQueue =
      task.catch(
        () => { }
      );

    return task;

  }

  // ============================================================
  // CANCEL
  // ============================================================

  function cancelJob(job) {
    if (job && job.abortController) {
      job.abortController.abort();
    }
  }

  // ============================================================
  // JOB
  // ============================================================

  class BgJob {

    constructor(
      file
    ) {

      this.id =
        `bg-${++jobSeq}`;

      this.file =
        file;

      this.originalWidth =
        0;

      this.originalHeight =
        0;

      this.resultBlob =
        null;

      this.resultUrl =
        null;

      this.objectUrl =
        URL.createObjectURL(
          file
        );

      this.processing =
        false;

      this.disposed =
        false;

      this.mode =
        null;

      this.abortController =
        null;

      this.displayedProgress =
        0;

      this.el =
        el.template
          .content
          .firstElementChild
          .cloneNode(
            true
          );

      this.build();

    }

    // ----------------------------------------------------------
    // BUILD
    // ----------------------------------------------------------

    build() {

      this.before =
        this.el.querySelector(
          '.js-before img'
        );

      this.afterWrap =
        this.el.querySelector(
          '.js-after'
        );

      this.after =
        this.el.querySelector(
          '.js-after img'
        );

      this.status =
        this.el.querySelector(
          '.js-status'
        );

      this.progress =
        this.el.querySelector(
          '.js-progress'
        );

      this.processBtn =
        this.el.querySelector(
          '.js-remove-bg-btn'
        );

      this.downloadBtn =
        this.el.querySelector(
          '.js-download-btn'
        );

      const name =
        this.el.querySelector(
          '.js-filename'
        );

      const size =
        this.el.querySelector(
          '.js-origsize'
        );

      const dim =
        this.el.querySelector(
          '.js-origdim'
        );

      const removeBtn =
        this.el.querySelector(
          '.js-remove-job-btn'
        );

      if (
        name
      ) {

        name.textContent =
          this.file.name;

      }

      if (
        size
      ) {

        size.textContent =
          formatBytes(
            this.file.size
          );

      }

      if (
        dim
      ) {

        dim.textContent =
          t(
            'image.reading'
          );

      }

      if (
        this.before
      ) {

        this.before.src =
          this.objectUrl;

        this.before.onload =
          () => {

            if (
              this.disposed
            ) {

              return;

            }

            this.originalWidth =
              this.before.naturalWidth ||
              0;

            this.originalHeight =
              this.before.naturalHeight ||
              0;

            if (
              dim
            ) {

              dim.textContent =
                `${this.originalWidth}×${this.originalHeight}`;

            }

          };

        this.before.onerror =
          () => {

            this.setError(
              'image.openFailed'
            );

          };

      }

      if (
        this.processBtn
      ) {

        this.processBtn.addEventListener(
          'click',
          () =>
            this.process()
        );

      }

      if (
        removeBtn
      ) {

        removeBtn.addEventListener(
          'click',
          () => {

            this.dispose();

            this.el.remove();

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

      this.updateLanguageUI();

    }

    // ----------------------------------------------------------
    // PROGRESS
    // ----------------------------------------------------------

    setProgress(
      value
    ) {

      if (
        this.disposed ||
        !this.progress
      ) {

        return;

      }

      const next =
        Math.max(
          0,

          Math.min(
            100,

            Number(
              value
            ) ||
            0
          )
        );

      this.displayedProgress =
        Math.max(
          this.displayedProgress,
          next
        );

      this.progress.style.width =
        `${this.displayedProgress}%`;

    }

    setProgressText(
      key,
      percent
    ) {

      if (
        !this.status ||
        this.disposed
      ) {

        return;

      }

      const raw =
        String(
          key ||
          ''
        ).toLowerCase();

      const loading =
        raw.includes(
          'load'
        ) ||
        raw.includes(
          'download'
        ) ||
        raw.includes(
          'prepare'
        ) ||
        raw.includes(
          'decode'
        );

      this.status.textContent =
        t(

          loading
            ? 'image.loadingModelProgress'
            : 'image.removingBackgroundProgress',

          {
            percent
          }

        );

    }

    // ----------------------------------------------------------
    // ERROR
    // ----------------------------------------------------------

    setError(
      key,
      values
    ) {

      if (
        this.disposed
      ) {

        return;

      }

      this.errorKey =
        key;

      if (
        this.status
      ) {

        this.status.textContent =
          t(
            key,
            values
          );

        this.status.classList.remove(
          'is-ready'
        );

        this.status.classList.add(
          'is-error'
        );

      }

    }

    // ----------------------------------------------------------
    // RESULT
    // ----------------------------------------------------------

    clearResult() {

      if (
        this.resultUrl
      ) {

        revoke(
          this.resultUrl
        );

      }

      this.resultUrl =
        null;

      this.resultBlob =
        null;

      if (
        this.downloadBtn
      ) {

        this.downloadBtn.classList.add(
          'hidden'
        );

        this.downloadBtn.removeAttribute(
          'href'
        );

        this.downloadBtn.removeAttribute(
          'download'
        );

      }

    }

    // ----------------------------------------------------------
    // LANGUAGE
    // ----------------------------------------------------------

    updateLanguageUI() {

      if (
        this.disposed ||
        this.processing ||
        !this.status
      ) {

        return;

      }

      if (
        this.resultBlob
      ) {

        this.status.textContent =
          t(
            'image.readyDownload',

            {
              size:
                formatBytes(
                  this.resultBlob.size
                )
            }
          );

        this.status.classList.remove(
          'is-error'
        );

        this.status.classList.add(
          'is-ready'
        );

        return;

      }

      this.status.textContent =
        t(
          'image.waitingBackground'
        );

      this.status.classList.remove(
        'is-error',
        'is-ready'
      );

    }

    // ----------------------------------------------------------
    // PROCESS
    // ----------------------------------------------------------

    async process() {

      if (
        this.disposed ||
        this.processing ||
        this.resultBlob
      ) {

        return;

      }

      /*
       * Refresh dimensions from preview.
       */
      if (
        this.before &&
        this.before.naturalWidth
      ) {

        this.originalWidth =
          this.before.naturalWidth;

        this.originalHeight =
          this.before.naturalHeight;

      }

      this.processing =
        true;

      this.displayedProgress =
        0;

      this.mode =
        null;

      this.clearResult();

      if (
        this.processBtn
      ) {

        this.processBtn.disabled =
          true;

      }

      this.setProgress(
        0
      );

      if (
        this.status
      ) {

        this.status.classList.remove(
          'is-ready',
          'is-error'
        );

        this.status.textContent =
          t(
            'image.preparingModel'
          );

      }

      try {

        await yieldUI();

        const blob = await processInCloudflareQueue(this);

        if (
          this.disposed
        ) {

          return;

        }

        this.resultBlob =
          blob;

        this.resultUrl =
          URL.createObjectURL(
            blob
          );

        if (
          this.after
        ) {

          this.after.src =
            this.resultUrl;

        }

        if (
          this.afterWrap
        ) {

          this.afterWrap.classList.remove(
            'hidden'
          );

        }

        if (
          this.downloadBtn
        ) {

          this.downloadBtn.href =
            this.resultUrl;

          this.downloadBtn.download =
            `${baseName(
              this.file.name
            )}-nobg.${OUTPUT_EXTENSION}`;

          this.downloadBtn.classList.remove(
            'hidden'
          );

        }

        this.setProgress(
          100
        );

        if (
          this.status
        ) {

          this.status.textContent =
            t(
              'image.readyDownload',

              {
                size:
                  formatBytes(
                    blob.size
                  )
              }
            );

          this.status.classList.remove(
            'is-error'
          );

          this.status.classList.add(
            'is-ready'
          );

        }

      } catch (
      error
      ) {

        console.error(
          '[Image Background Removal] Error:',
          error
        );

        if (
          !this.disposed
        ) {

          const message =
            error &&
              error.message
              ? error.message
              : '';

          /*
           * Normal cancellation:
           * don't show an error.
           */
          if (
            !/BACKGROUND_CANCELLED/.test(
              message
            )
          ) {

            const errorCode = message.split(/[ \[]/, 1)[0];
            const errorDetails = {
              BACKGROUND_FILE_TOO_LARGE: 'ไฟล์มีขนาดเกิน 20 MB',
              BACKGROUND_UNSUPPORTED_FORMAT: 'รองรับไฟล์ JPG, PNG, WebP และ AVIF เท่านั้น',
              BACKGROUND_FREE_LIMIT_REACHED: 'ใช้โควต้าฟรี Cloudflare Images 5,000 รายการต่อเดือนแล้ว',
              BACKGROUND_SERVICE_NOT_CONFIGURED: 'ยังไม่ได้ตั้งค่า Cloudflare Images binding',
              BACKGROUND_IMAGES_BILLING_NOT_SUPPORTED: 'บัญชี Cloudflare ใช้ระบบ Images Billing แบบเก่า ต้องเปลี่ยนเป็น Images plan ก่อน',
              BACKGROUND_IMAGE_PROCESSING_LIMIT: 'รูปมีขนาดหรือความละเอียดเกินขีดจำกัดที่ Cloudflare ประมวลผลได้',
              BACKGROUND_TIMEOUT: 'การประมวลผลใช้เวลานานเกินไป กรุณาลองใหม่',
              BACKGROUND_PROCESSING_FAILED: 'Cloudflare ไม่สามารถประมวลผลรูปนี้ได้'
            };

            this.setError(
              errorKey(error),
              { message: errorDetails[errorCode] || errorCode || 'กรุณาลองใหม่อีกครั้ง' }
            );

            this.setProgress(
              0
            );

            this.clearResult();

          }

        }

      } finally {

        this.processing =
          false;

        this.mode =
          null;

        if (
          !this.disposed &&
          this.processBtn
        ) {

          this.processBtn.disabled =
            false;

        }

        updateBulkUI();

        await yieldUI();

      }

    }

    // ----------------------------------------------------------
    // DISPOSE
    // ----------------------------------------------------------

    dispose() {

      if (
        this.disposed
      ) {

        return;

      }

      this.disposed =
        true;

      if (
        this.processing
      ) {

        cancelJob(
          this
        );

      }

      revoke(
        this.objectUrl
      );

      revoke(
        this.resultUrl
      );

      this.objectUrl =
        null;

      this.resultUrl =
        null;

      this.resultBlob =
        null;

    }

  }

  // ============================================================
  // FILE HANDLING
  // ============================================================

  function hasDuplicate(
    file
  ) {

    const key =
      [
        file.name,
        file.size,
        file.lastModified,
        file.type
      ].join(
        '|'
      );

    return jobs.some(
      job =>
        !job.disposed &&
        [
          job.file.name,
          job.file.size,
          job.file.lastModified,
          job.file.type
        ].join(
          '|'
        ) ===
        key
    );

  }

  function addFiles(
    list
  ) {

    Array.from(
      list ||
      []
    ).forEach(
      file => {

        if (
          !file ||
          !String(
            file.type ||
            ''
          ).startsWith(
            'image/'
          )
        ) {

          return;

        }

        if (
          hasDuplicate(
            file
          )
        ) {

          return;

        }

        const job =
          new BgJob(
            file
          );

        jobs.push(
          job
        );

        el.jobs.appendChild(
          job.el
        );

      }
    );

    updateBulkUI();

  }

  // ============================================================
  // BULK UI
  // ============================================================

  function updateBulkUI() {

    const active =
      jobs.filter(
        job =>
          !job.disposed
      );

    el.count.textContent =
      String(
        active.length
      );

    el.bulkbar.classList.toggle(
      'hidden',
      active.length ===
      0
    );

    const hasReady =
      active.some(
        job =>
          !!job.resultBlob
      );

    el.downloadZip.classList.toggle(
      'hidden',
      !hasReady
    );

    active.forEach(
      job =>
        job.updateLanguageUI()
    );

  }

  // ============================================================
  // DROPZONE
  // ============================================================

  if (
    typeof U.setupDropzone ===
    'function'
  ) {

    U.setupDropzone(
      el.dropzone,
      el.fileInput,
      addFiles
    );

  } else {

    el.dropzone.addEventListener(
      'click',
      () =>
        el.fileInput.click()
    );

    el.fileInput.addEventListener(
      'change',
      event =>
        addFiles(
          event.target.files
        )
    );

    el.dropzone.addEventListener(
      'dragover',
      event => {

        event.preventDefault();

        el.dropzone.classList.add(
          'is-dragover'
        );

      }
    );

    el.dropzone.addEventListener(
      'dragleave',
      () => {

        el.dropzone.classList.remove(
          'is-dragover'
        );

      }
    );

    el.dropzone.addEventListener(
      'drop',
      event => {

        event.preventDefault();

        el.dropzone.classList.remove(
          'is-dragover'
        );

        addFiles(
          event.dataTransfer &&
          event.dataTransfer.files
        );

      }
    );

  }

  // ============================================================
  // CLEAR ALL
  // ============================================================

  el.clearAll.addEventListener(
    'click',
    () => {

      jobs.forEach(
        job =>
          job.dispose()
      );

      jobs.length =
        0;

      el.jobs.innerHTML =
        '';

      /*
       * Reset GPU decision after explicit user reset.
       */

      updateBulkUI();

    }
  );

  // ============================================================
  // PROCESS ALL
  // ============================================================

  el.processAll.addEventListener(
    'click',
    async () => {

      if (
        el.processAll.disabled
      ) {

        return;

      }

      const queue =
        jobs.filter(
          job =>
            !job.disposed &&
            !job.resultBlob
        );

      if (
        !queue.length
      ) {

        return;

      }

      el.processAll.disabled =
        true;

      let done =
        0;

      const total =
        queue.length;

      try {

        for (
          const job of
          queue
        ) {

          if (
            job.disposed ||
            job.resultBlob
          ) {

            done++;

            continue;

          }

          el.processAll.textContent =
            t(
              'image.removeBackgroundAllProcessing',

              {
                current:
                  done + 1,

                total
              }
            );

          await job.process();

          done++;

          await yieldUI();

        }

      } finally {

        el.processAll.disabled =
          false;

        el.processAll.textContent =
          t(
            'image.removeBackgroundAll'
          );

        updateBulkUI();


      }

    }
  );

  // ============================================================
  // ZIP
  // ============================================================

  el.downloadZip.addEventListener(
    'click',
    async () => {

      const ready =
        jobs.filter(
          job =>
            !job.disposed &&
            job.resultBlob
        );

      if (
        !ready.length ||
        typeof JSZip !==
        'function'
      ) {

        return;

      }

      el.downloadZip.disabled =
        true;

      try {

        const zip =
          new JSZip();

        const used =
          new Set();

        for (
          const job of
          ready
        ) {

          let filename =
            `${baseName(
              job.file.name
            )}-nobg.png`;

          let n =
            2;

          while (
            used.has(
              filename
            )
          ) {

            filename =
              `${baseName(
                job.file.name
              )}-nobg-${n++}.png`;

          }

          used.add(
            filename
          );

          zip.file(
            filename,
            job.resultBlob
          );

        }

        /*
         * PNG is already compressed.
         *
         * STORE avoids another CPU/RAM spike.
         */
        const blob =
          await zip.generateAsync(
            {
              type:
                'blob',

              compression:
                'STORE'
            }
          );

        downloadBlob(
          blob,
          'no-background.zip'
        );

      } catch (
      error
      ) {

        console.error(
          '[Image Background Removal] ZIP failed:',
          error
        );

      } finally {

        el.downloadZip.disabled =
          false;

        updateBulkUI();

      }

    }
  );

  // ============================================================
  // CACHE CLEAR HOOK
  // ============================================================

  if (
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

        el.jobs.innerHTML =
          '';

        updateBulkUI();

      }
    );

  }

  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener(
    'languagechange',
    () => {

      if (
        !el.processAll.disabled
      ) {

        el.processAll.textContent =
          t(
            'image.removeBackgroundAll'
          );

      }

      if (
        !el.downloadZip.disabled
      ) {

        el.downloadZip.textContent =
          t(
            'image.downloadZip'
          );

      }

      updateBulkUI();

    }
  );

  // ============================================================
  // INIT
  // ============================================================

  updateBulkUI();

})();
