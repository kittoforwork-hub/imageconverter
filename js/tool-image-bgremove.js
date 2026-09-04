/* global window, document, URL, JSZip */

(() => {
  'use strict';

  // ============================================================
  // GLOBALS
  // ============================================================

  const U = window.Utils;
  const I18n = window.I18n || null;

  function t(key, values) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, values);
    }
    return String(key);
  }

  // ============================================================
  // ELEMENTS
  // ============================================================

  const dropzone = document.getElementById('dz-img-bgremove');
  const fileInput = document.getElementById('input-img-bgremove');
  const bulkbar = document.getElementById('bulk-img-bgremove');
  const countEl = document.getElementById('count-img-bgremove');
  const clearAllBtn = document.getElementById('clearAll-img-bgremove');
  const processAllBtn = document.getElementById('processAll-img-bgremove');
  const downloadZipBtn = document.getElementById('downloadZip-img-bgremove');
  const jobsEl = document.getElementById('jobs-img-bgremove');
  const jobTemplate = document.getElementById('tpl-img-bgremove');

  if (
    !dropzone || !fileInput || !bulkbar || !countEl || !clearAllBtn ||
    !processAllBtn || !downloadZipBtn || !jobsEl || !jobTemplate
  ) {
    console.warn('[Image Background Removal] Required elements not found.');
    return;
  }

  // ============================================================
  // CONSTANTS
  // ============================================================

  /*
   * Model / library.
   *
   * Switched from @imgly/background-removal (IS-Net) to briaai/RMBG-1.4
   * served through Hugging Face's Transformers.js. In side-by-side
   * testing RMBG-1.4 keeps noticeably cleaner edges around hair, fur
   * and fine detail than IS-Net, which is the main complaint with the
   * old pipeline. It is also the model most browser background-removal
   * tools (Hugging Face's own demo, several open-source extensions)
   * settled on for that reason.
   *
   * To keep it from being heavy on the user's device we run the 8-bit
   * quantized weights (~45 MB, cached after first use) instead of the
   * full fp32 checkpoint (~176 MB). Quality loss from the quantization
   * is minor for this model; if you ever want maximum possible quality
   * and don't mind the extra download/memory, change MODEL_DTYPE below
   * to 'fp32'.
   */
  const LIB_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm';

  const MODEL_ID = 'briaai/RMBG-1.4';

  /*
   * 'q8'   -> ~45MB, low RAM/VRAM footprint, small quality trade-off (default here)
   * 'fp16' -> ~90MB, good middle ground on GPU
   * 'fp32' -> ~176MB, maximum quality, heaviest
   */
  const MODEL_DTYPE = 'q8';

  const OUTPUT_EXTENSION = 'png';

  /*
   * WebGPU is attempted first (faster, offloads work from the CPU),
   * with an automatic fallback to WASM/CPU if the browser/device
   * doesn't support it or the GPU backend throws.
   */
  const PREFER_GPU = true;

  const ALLOWED_IMAGE_PREFIX = 'image/';

  /*
   * Large source images (phone/camera photos, 4000px+ on the long
   * edge) are downscaled before being handed to the model. The model
   * itself resizes internally to a fixed square anyway, so this mainly
   * saves decode/canvas time and memory for oversized inputs; images
   * already at or under this size are left untouched.
   */
  const MAX_INPUT_DIMENSION = 1800;

  const RESIZE_OUTPUT_QUALITY = 0.92;

  // ============================================================
  // STATE
  // ============================================================

  let jobSeq = 0;
  const jobs = [];

  // One cached pipeline promise per device, so the (large) model is
  // only downloaded/initialized once per device per page session.
  const segmenterPromises = {
    gpu: null,
    cpu: null
  };

  let gpuKnownBad = false;

  // ============================================================
  // FILE KEY / DEDUPE
  // ============================================================

  function getFileKey(file) {
    if (!file) return '';
    return [file.name, file.size, file.lastModified, file.type].join('|');
  }

  function hasDuplicateFile(file) {
    const key = getFileKey(file);
    return jobs.some(job => job && !job.disposed && getFileKey(job.file) === key);
  }

  // ============================================================
  // SAFE YIELD
  // ============================================================

  async function yieldToUI() {
    if (U && typeof U.yieldToUI === 'function') {
      await U.yieldToUI();
      return;
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  // ============================================================
  // URL HELPERS
  // ============================================================

  function revokeUrl(url) {
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  }

  // ============================================================
  // IMAGE DOWNSCALE
  // ============================================================

  async function downscaleIfNeeded(file) {
    if (!file || typeof file.type !== 'string' || !file.type.startsWith(ALLOWED_IMAGE_PREFIX)) {
      return file;
    }

    let objectUrl = null;

    try {
      objectUrl = URL.createObjectURL(file);

      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl;
      });

      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const longSide = Math.max(width, height);

      if (!width || !height || longSide <= MAX_INPUT_DIMENSION) {
        return file;
      }

      const scale = MAX_INPUT_DIMENSION / longSide;
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, outType, RESIZE_OUTPUT_QUALITY)
      );

      if (!blob) return file;

      return new File([blob], file.name, {
        type: outType,
        lastModified: file.lastModified
      });

    } catch (error) {
      console.warn('[Image Background Removal] Downscale skipped, using original file:', error);
      return file;
    } finally {
      revokeUrl(objectUrl);
    }
  }

  // ============================================================
  // DEVICE CAPABILITY
  // ============================================================

  function canTryWebGPU() {
    if (!PREFER_GPU || gpuKnownBad) return false;
    if (typeof navigator === 'undefined') return false;
    if (!navigator.gpu || typeof navigator.gpu.requestAdapter !== 'function') return false;
    return true;
  }

  async function probeWebGPU() {
    if (!canTryWebGPU()) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch (error) {
      console.warn('[Image Background Removal] WebGPU probe failed:', error);
      return false;
    }
  }

  // ============================================================
  // ERROR CLASSIFICATION
  // ============================================================

  function isLikelyWebGPUError(error) {
    if (!error) return false;
    const text = String(error.message || error).toLowerCase();
    return (
      text.includes('webgpu') ||
      text.includes('requestadapter') ||
      text.includes('no available backend') ||
      text.includes('failed to create session')
    );
  }

  function getErrorKey(error) {
    const code = error && typeof error.message === 'string' ? error.message : '';

    if (code === 'BACKGROUND_LIBRARY_LOAD_FAILED') {
      return 'errors.backgroundLibraryLoadFailed';
    }
    if (code === 'BACKGROUND_EMPTY_RESULT') {
      return 'image.backgroundRemovalFailed';
    }
    return 'image.backgroundRemovalFailed';
  }

  // ============================================================
  // GET / CREATE SEGMENTER (one per device, cached & shared)
  // ============================================================

  function getSegmenter(useGpu, progressCallback) {
    const key = useGpu ? 'gpu' : 'cpu';
    const device = useGpu ? 'webgpu' : 'wasm';

    if (!segmenterPromises[key]) {
      segmenterPromises[key] = import(/* webpackIgnore: true */ LIB_URL)
        .then(({ pipeline }) =>
          pipeline('background-removal', MODEL_ID, {
            device,
            dtype: MODEL_DTYPE,
            progress_callback: progressCallback
          })
        )
        .catch(error => {
          console.error('[Image Background Removal] Model load failed:', error);
          segmenterPromises[key] = null;
          throw new Error('BACKGROUND_LIBRARY_LOAD_FAILED');
        });
    }

    return segmenterPromises[key];
  }

  // ============================================================
  // JOB
  // ============================================================

  class BgJob {

    constructor(file) {
      this.id = 'bg-' + (++jobSeq);
      this.file = file;
      this.resultBlob = null;
      this.resultUrl = null;
      this.objectUrl = null;
      this.isProcessing = false;
      this.disposed = false;
      this.hasError = false;
      this.errorKey = null;
      this.errorParams = null;
      this.processingMode = null;
      this._fakeProgressTimer = null;

      this.el = jobTemplate.content.firstElementChild.cloneNode(true);
      this.buildDom();
    }

    buildDom() {
      const el = this.el;

      this.objectUrl = URL.createObjectURL(this.file);

      this.beforeImg = el.querySelector('.js-before img');
      this.afterWrap = el.querySelector('.js-after');
      this.afterImg = el.querySelector('.js-after img');
      this.statusEl = el.querySelector('.js-status');
      this.progressFill = el.querySelector('.js-progress');
      this.processBtn = el.querySelector('.js-remove-bg-btn');
      this.downloadBtn = el.querySelector('.js-download-btn');

      const filenameEl = el.querySelector('.js-filename');
      const sizeEl = el.querySelector('.js-origsize');
      const dimEl = el.querySelector('.js-origdim');

      if (!this.beforeImg || !this.processBtn) {
        this.disposed = true;
        this.revokeObjectUrl();
        return;
      }

      if (filenameEl) filenameEl.textContent = this.file.name;

      if (sizeEl && U && typeof U.formatBytes === 'function') {
        sizeEl.textContent = U.formatBytes(this.file.size);
      }

      if (dimEl) dimEl.textContent = t('image.reading');

      this.el.dataset.processing = 'false';

      this.beforeImg.src = this.objectUrl;

      this.beforeImg.onload = () => {
        if (this.disposed) return;
        if (dimEl) {
          dimEl.textContent = `${this.beforeImg.naturalWidth}×${this.beforeImg.naturalHeight}`;
        }
      };

      this.beforeImg.onerror = () => {
        if (this.disposed) return;
        this.setError('image.openFailed');
        if (dimEl) dimEl.textContent = t('image.readFailed');
      };

      this.processBtn.addEventListener('click', () => this.process());

      const removeJobBtn = el.querySelector('.js-remove-job-btn');
      if (removeJobBtn) {
        removeJobBtn.addEventListener('click', () => {
          this.dispose();
          el.remove();
          const idx = jobs.indexOf(this);
          if (idx >= 0) jobs.splice(idx, 1);
          updateBulkUI();
        });
      }

      this.updateLanguageUI();
    }

    updateLanguageUI() {
      if (this.disposed || !this.statusEl) return;
      if (this.isProcessing) return;

      if (this.resultBlob) {
        this.statusEl.textContent = t('image.readyDownload', {
          size: U.formatBytes(this.resultBlob.size)
        });
        this.statusEl.classList.remove('is-error');
        this.statusEl.classList.add('is-ready');
        return;
      }

      if (this.hasError) {
        if (this.errorKey) {
          this.statusEl.textContent = t(this.errorKey, this.errorParams || undefined);
        }
        this.statusEl.classList.remove('is-ready');
        this.statusEl.classList.add('is-error');
        return;
      }

      this.statusEl.textContent = t('image.waitingBackground');
      this.statusEl.classList.remove('is-ready', 'is-error');
    }

    setError(key, params = null) {
      if (this.disposed) return;

      this.hasError = true;
      this.errorKey = key;
      this.errorParams = params;

      if (this.statusEl) {
        this.statusEl.textContent = t(key, params || undefined);
        this.statusEl.classList.remove('is-ready');
        this.statusEl.classList.add('is-error');
      }
    }

    setProgress(pct) {
      if (this.disposed || !this.progressFill) return;
      const value = Math.max(0, Math.min(100, Number(pct) || 0));
      this.progressFill.style.width = `${value}%`;
    }

    // Progress while the (large, first-time-only) model is downloading.
    setModelLoadProgress(evt) {
      if (this.disposed || !this.statusEl || !this.isProcessing) return;
      if (!evt) return;

      if (evt.status === 'progress' && Number.isFinite(evt.progress)) {
        const pct = Math.max(0, Math.min(100, Math.round(evt.progress)));
        this.setProgress(pct * 0.5); // model download = first half of the bar
        this.statusEl.textContent = t('image.loadingModelProgress', { percent: pct });
      } else if (evt.status === 'done') {
        this.statusEl.textContent = t('image.preparingModel');
      }
    }

    // Transformers.js doesn't expose step-by-step progress for a single
    // forward pass, so once the model is loaded we animate a light
    // "still working" fill up to 90% while inference runs, then jump to
    // 100% on completion. It's an approximation, not a real percentage.
    startFakeInferenceProgress() {
      this.stopFakeInferenceProgress();
      let pct = 50;
      this.setProgress(pct);
      if (this.statusEl) {
        this.statusEl.textContent = t('image.removingBackgroundProgress', { percent: Math.round(pct) });
      }
      this._fakeProgressTimer = setInterval(() => {
        if (this.disposed || !this.isProcessing) {
          this.stopFakeInferenceProgress();
          return;
        }
        pct = Math.min(90, pct + 4);
        this.setProgress(pct);
        if (this.statusEl) {
          this.statusEl.textContent = t('image.removingBackgroundProgress', { percent: Math.round(pct) });
        }
      }, 350);
    }

    stopFakeInferenceProgress() {
      if (this._fakeProgressTimer) {
        clearInterval(this._fakeProgressTimer);
        this._fakeProgressTimer = null;
      }
    }

    clearResult() {
      if (this.resultUrl) {
        revokeUrl(this.resultUrl);
        this.resultUrl = null;
      }
      this.resultBlob = null;

      if (this.downloadBtn) {
        this.downloadBtn.removeAttribute('href');
        this.downloadBtn.removeAttribute('download');
        this.downloadBtn.classList.add('hidden');
      }
    }

    async runOnDevice(mode, inputUrl) {
      const useGpu = mode === 'gpu';

      if (this.statusEl) {
        this.statusEl.textContent = t('image.preparingModel');
      }

      const segmenter = await getSegmenter(useGpu, evt => this.setModelLoadProgress(evt));

      if (this.disposed) return null;

      this.startFakeInferenceProgress();

      try {
        const output = await segmenter(inputUrl);
        return output && output[0] ? output[0] : null;
      } finally {
        this.stopFakeInferenceProgress();
      }
    }

    async process() {
      if (this.disposed || this.resultBlob || this.isProcessing) return;
      if (!this.file) return;

      this.hasError = false;
      this.errorKey = null;
      this.errorParams = null;
      this.isProcessing = true;
      this.el.dataset.processing = 'true';

      if (this.processBtn) this.processBtn.disabled = true;

      this.setProgress(0);
      this.clearResult();

      if (this.statusEl) {
        this.statusEl.classList.remove('is-ready', 'is-error');
        this.statusEl.textContent = t('image.preparingModel');
      }

      let inputUrl = null;

      try {
        const inputFile = await downscaleIfNeeded(this.file);
        if (this.disposed) return;

        inputUrl = URL.createObjectURL(inputFile);

        await yieldToUI();

        let rawImage = null;

        if (await probeWebGPU()) {
          this.processingMode = 'gpu';
          try {
            rawImage = await this.runOnDevice('gpu', inputUrl);
          } catch (gpuError) {
            console.warn('[Image Background Removal] WebGPU failed. Falling back to CPU/WASM.', gpuError);
            if (isLikelyWebGPUError(gpuError)) gpuKnownBad = true;
            rawImage = null;
            this.setProgress(0);
          }
        }

        if (!rawImage) {
          if (this.disposed) return;
          this.processingMode = 'cpu';
          await yieldToUI();
          rawImage = await this.runOnDevice('cpu', inputUrl);
        }

        if (this.disposed) return;

        if (!rawImage) {
          throw new Error('BACKGROUND_EMPTY_RESULT');
        }

        const blob = await rawImage.toBlob();

        if (!blob || (typeof blob.size === 'number' && blob.size <= 0)) {
          throw new Error('BACKGROUND_EMPTY_RESULT');
        }

        this.clearResult();
        this.resultBlob = blob;
        this.resultUrl = URL.createObjectURL(blob);

        if (this.afterImg) this.afterImg.src = this.resultUrl;
        if (this.afterWrap) this.afterWrap.classList.remove('hidden');

        if (this.downloadBtn) {
          this.downloadBtn.href = this.resultUrl;
          this.downloadBtn.download = `${U.baseName(this.file.name)}-nobg.${OUTPUT_EXTENSION}`;
          this.downloadBtn.classList.remove('hidden');
        }

        this.setProgress(100);

        if (this.statusEl) {
          this.statusEl.textContent = t('image.readyDownload', { size: U.formatBytes(blob.size) });
          this.statusEl.classList.remove('is-error');
          this.statusEl.classList.add('is-ready');
        }

      } catch (error) {
        console.error('[Image Background Removal] Error:', error);
        if (this.disposed) return;

        this.setError(getErrorKey(error));
        this.setProgress(0);
        this.clearResult();

      } finally {
        this.stopFakeInferenceProgress();
        revokeUrl(inputUrl);

        this.isProcessing = false;
        this.processingMode = null;
        this.el.dataset.processing = 'false';

        if (!this.disposed && this.processBtn) {
          this.processBtn.disabled = false;
        }

        await yieldToUI();
      }
    }

    revokeObjectUrl() {
      if (this.objectUrl) {
        revokeUrl(this.objectUrl);
        this.objectUrl = null;
      }
    }

    dispose() {
      if (this.disposed) return;

      this.disposed = true;
      this.isProcessing = false;
      this.el.dataset.processing = 'false';

      this.stopFakeInferenceProgress();
      this.revokeObjectUrl();

      if (this.resultUrl) {
        revokeUrl(this.resultUrl);
        this.resultUrl = null;
      }

      this.resultBlob = null;
      this.errorKey = null;
      this.errorParams = null;
    }
  }

  // ============================================================
  // BULK UI
  // ============================================================

  function updateBulkUI() {
    const activeJobs = jobs.filter(job => job && !job.disposed);

    countEl.textContent = String(activeJobs.length);
    bulkbar.classList.toggle('hidden', activeJobs.length === 0);

    const hasReady = activeJobs.some(job => !!job.resultBlob);
    downloadZipBtn.classList.toggle('hidden', !hasReady);

    activeJobs.forEach(job => {
      if (!job.isProcessing) job.updateLanguageUI();
    });
  }

  // ============================================================
  // ADD FILES
  // ============================================================

  function addFiles(fileList) {
    Array.from(fileList || [])
      .filter(file => file && typeof file.type === 'string' && file.type.startsWith(ALLOWED_IMAGE_PREFIX))
      .forEach(file => {
        if (hasDuplicateFile(file)) return;

        const job = new BgJob(file);
        if (job.disposed) return;

        jobs.push(job);
        jobsEl.appendChild(job.el);
      });

    updateBulkUI();
  }

  // ============================================================
  // CLEAR ALL
  // ============================================================

  clearAllBtn.addEventListener('click', () => {
    jobs.forEach(job => job && job.dispose());
    jobs.length = 0;
    jobsEl.innerHTML = '';
    updateBulkUI();
  });

  // ============================================================
  // PROCESS ALL
  // ============================================================

  processAllBtn.addEventListener('click', async () => {
    if (processAllBtn.disabled) return;

    const queue = jobs.filter(job => job && !job.disposed && !job.resultBlob);
    if (!queue.length) return;

    processAllBtn.disabled = true;

    const total = queue.length;
    let done = 0;

    const renderBatchLabel = () =>
      t('image.removeBackgroundAllProcessing', {
        current: Math.min(done + 1, total),
        total
      });

    processAllBtn.textContent = renderBatchLabel();

    try {
      // Sequential on purpose: the model + inference can use a fair
      // amount of memory, so jobs are processed one at a time.
      for (const job of queue) {
        if (!job || job.disposed || job.resultBlob) {
          done++;
          continue;
        }

        processAllBtn.textContent = renderBatchLabel();
        await job.process();
        done++;
        await yieldToUI();
      }
    } finally {
      processAllBtn.disabled = false;
      processAllBtn.textContent = t('image.removeBackgroundAll');
      updateBulkUI();
    }
  });

  // ============================================================
  // DOWNLOAD ZIP
  // ============================================================

  downloadZipBtn.addEventListener('click', async () => {
    if (downloadZipBtn.disabled) return;

    const ready = jobs.filter(job => job && !job.disposed && !!job.resultBlob);
    if (!ready.length) return;

    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = t('image.compressingZip');

    try {
      if (typeof JSZip !== 'function') {
        throw new Error('JSZIP_NOT_AVAILABLE');
      }

      const zip = new JSZip();
      const usedNames = new Set();

      ready.forEach(job => {
        if (job.disposed || !job.resultBlob) return;

        const base = U.baseName(job.file.name);
        let filename = `${base}-nobg.png`;
        let counter = 2;

        while (usedNames.has(filename)) {
          filename = `${base}-nobg-${counter++}.png`;
        }

        usedNames.add(filename);
        zip.file(filename, job.resultBlob);
      });

      const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      U.downloadBlob(content, 'no-background.zip');

    } catch (error) {
      console.error('[Image Background Removal] ZIP failed:', error);
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = t('image.downloadZip');
      updateBulkUI();
    }
  });

  // ============================================================
  // DROPZONE
  // ============================================================

  if (U && typeof U.setupDropzone === 'function') {
    U.setupDropzone(dropzone, fileInput, addFiles);
  }

  // ============================================================
  // CLEAR CACHE
  // ============================================================

  if (U && typeof U.onClearCache === 'function') {
    U.onClearCache(() => {
      jobs.forEach(job => job && job.dispose());
      jobs.length = 0;
      jobsEl.innerHTML = '';
      updateBulkUI();
    });
  }

  // ============================================================
  // LANGUAGE CHANGE
  // ============================================================

  document.addEventListener('languagechange', () => {
    if (!processAllBtn.disabled) {
      processAllBtn.textContent = t('image.removeBackgroundAll');
    }
    if (!downloadZipBtn.disabled) {
      downloadZipBtn.textContent = t('image.downloadZip');
    }
    jobs.forEach(job => {
      if (job && !job.disposed) job.updateLanguageUI();
    });
  });

  // ============================================================
  // INITIAL UI
  // ============================================================

  updateBulkUI();

})();
