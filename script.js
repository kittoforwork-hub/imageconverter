(() => {
  'use strict';

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const jobsEl = document.getElementById('jobs');
  const jobTemplate = document.getElementById('jobTemplate');
  const bulkbar = document.getElementById('bulkbar');
  const jobCountEl = document.getElementById('jobCount');
  const bulkFormatEl = document.getElementById('bulkFormat');
  const convertAllBtn = document.getElementById('convertAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const downloadZipBtn = document.getElementById('downloadZipBtn');

  const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

  /** @type {Map<string, Job>} */
  const jobs = new Map();
  let jobSeq = 0;

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function baseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }

  function extOf(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toUpperCase() : '—';
  }

  class Job {
    constructor(file) {
      this.id = 'job-' + (++jobSeq);
      this.file = file;
      this.format = 'image/png';
      this.quality = 0.9;
      this.aspectLocked = true;
      this.origWidth = 0;
      this.origHeight = 0;
      this.resultBlob = null;
      this.resultUrl = null;
      this.el = jobTemplate.content.firstElementChild.cloneNode(true);
      this.buildDom();
    }

    buildDom() {
      const el = this.el;
      const url = URL.createObjectURL(this.file);
      this.objectUrl = url;
      const img = el.querySelector('.ticket-thumb img');
      img.src = url;

      el.querySelector('.js-filename').textContent = this.file.name;
      el.querySelector('.js-origext').textContent = extOf(this.file.name);
      el.querySelector('.js-origsize').textContent = formatBytes(this.file.size);

      const widthInput = el.querySelector('.js-width');
      const heightInput = el.querySelector('.js-height');
      const lockBtn = el.querySelector('.js-lock');
      const qualityRow = el.querySelector('.js-quality-row');
      const qualityInput = el.querySelector('.js-quality');
      const qualityVal = el.querySelector('.js-quality-val');
      const formatGroup = el.querySelector('.js-format-group');
      const statusEl = el.querySelector('.js-status');
      const convertBtn = el.querySelector('.js-convert-btn');
      const downloadBtn = el.querySelector('.js-download-btn');
      const removeBtn = el.querySelector('.js-remove-btn');

      img.onload = () => {
        this.origWidth = img.naturalWidth;
        this.origHeight = img.naturalHeight;
        el.querySelector('.js-origdim').textContent = `${this.origWidth}×${this.origHeight}`;
        widthInput.value = this.origWidth;
        heightInput.value = this.origHeight;
      };

      widthInput.addEventListener('input', () => {
        const w = parseInt(widthInput.value, 10);
        if (this.aspectLocked && this.origWidth && w > 0) {
          heightInput.value = Math.round((w / this.origWidth) * this.origHeight);
        }
        this.markDirty(statusEl, downloadBtn);
      });
      heightInput.addEventListener('input', () => {
        const h = parseInt(heightInput.value, 10);
        if (this.aspectLocked && this.origHeight && h > 0) {
          widthInput.value = Math.round((h / this.origHeight) * this.origWidth);
        }
        this.markDirty(statusEl, downloadBtn);
      });

      lockBtn.addEventListener('click', () => {
        this.aspectLocked = !this.aspectLocked;
        lockBtn.classList.toggle('is-locked', this.aspectLocked);
      });

      formatGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        formatGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.format = btn.dataset.format;
        qualityRow.style.visibility = this.format === 'image/png' ? 'hidden' : 'visible';
        this.markDirty(statusEl, downloadBtn);
      });
      qualityRow.style.visibility = this.format === 'image/png' ? 'hidden' : 'visible';

      qualityInput.addEventListener('input', () => {
        this.quality = parseFloat(qualityInput.value);
        qualityVal.textContent = Math.round(this.quality * 100) + '%';
        this.markDirty(statusEl, downloadBtn);
      });

      convertBtn.addEventListener('click', () => this.convert(el));

      removeBtn.addEventListener('click', () => {
        URL.revokeObjectURL(this.objectUrl);
        if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
        jobs.delete(this.id);
        el.remove();
        refreshBulkbar();
      });

      this.widthInput = widthInput;
      this.heightInput = heightInput;
      this.img = img;
      this.statusEl = statusEl;
      this.downloadBtn = downloadBtn;
    }

    markDirty(statusEl, downloadBtn) {
      statusEl.textContent = 'รอแปลง';
      statusEl.classList.remove('is-ready', 'is-error');
      downloadBtn.classList.add('hidden');
      this.resultBlob = null;
    }

    convert() {
      return new Promise((resolve) => {
        const targetW = parseInt(this.widthInput.value, 10) || this.origWidth;
        const targetH = parseInt(this.heightInput.value, 10) || this.origHeight;

        if (!targetW || !targetH) {
          this.statusEl.textContent = 'ขนาดไม่ถูกต้อง';
          this.statusEl.classList.add('is-error');
          resolve(false);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (this.format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.img, 0, 0, targetW, targetH);

        const quality = this.format === 'image/png' ? undefined : this.quality;

        canvas.toBlob((blob) => {
          if (!blob) {
            this.statusEl.textContent = 'แปลงไม่สำเร็จ';
            this.statusEl.classList.add('is-error');
            resolve(false);
            return;
          }
          this.resultBlob = blob;
          if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
          this.resultUrl = URL.createObjectURL(blob);

          const ext = EXT_BY_MIME[this.format];
          this.resultName = `${baseName(this.file.name)}.${ext}`;

          this.downloadBtn.href = this.resultUrl;
          this.downloadBtn.download = this.resultName;
          this.downloadBtn.classList.remove('hidden');

          this.statusEl.textContent = `พร้อมดาวน์โหลด · ${formatBytes(blob.size)}`;
          this.statusEl.classList.remove('is-error');
          this.statusEl.classList.add('is-ready');
          resolve(true);
        }, this.format, quality);
      });
    }
  }

  function addFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
      const job = new Job(file);
      jobs.set(job.id, job);
      jobsEl.appendChild(job.el);
    });
    refreshBulkbar();
  }

  function refreshBulkbar() {
    const count = jobs.size;
    jobCountEl.textContent = String(count);
    bulkbar.classList.toggle('hidden', count === 0);
    downloadZipBtn.classList.add('hidden');
  }

  // --- dropzone interactions ---
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      if (evt === 'dragleave' && e.target !== dropzone) return;
      dropzone.classList.remove('drag-over');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  // paste from clipboard
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.files;
    if (items?.length) addFiles(items);
  });

  // --- bulk actions ---
  bulkFormatEl.addEventListener('change', () => {
    const val = bulkFormatEl.value;
    if (!val) return;
    jobs.forEach(job => {
      const group = job.el.querySelector('.js-format-group');
      group.querySelectorAll('.seg-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.format === val);
      });
      job.format = val;
      const qualityRow = job.el.querySelector('.js-quality-row');
      qualityRow.style.visibility = val === 'image/png' ? 'hidden' : 'visible';
      job.markDirty(job.statusEl, job.downloadBtn);
    });
  });

  clearAllBtn.addEventListener('click', () => {
    jobs.forEach(job => {
      URL.revokeObjectURL(job.objectUrl);
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    });
    jobs.clear();
    jobsEl.innerHTML = '';
    refreshBulkbar();
  });

  convertAllBtn.addEventListener('click', async () => {
    convertAllBtn.disabled = true;
    convertAllBtn.textContent = 'กำลังแปลง…';
    const list = Array.from(jobs.values());
    for (const job of list) {
      await job.convert();
    }
    convertAllBtn.disabled = false;
    convertAllBtn.textContent = 'แปลงทั้งหมด';
    const anyReady = list.some(j => j.resultBlob);
    downloadZipBtn.classList.toggle('hidden', !anyReady);
  });

  downloadZipBtn.addEventListener('click', async () => {
    const ready = Array.from(jobs.values()).filter(j => j.resultBlob);
    if (!ready.length) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = 'กำลังบีบอัด…';

    const zip = new JSZip();
    const usedNames = new Set();
    ready.forEach(job => {
      let name = job.resultName;
      let n = 1;
      while (usedNames.has(name)) {
        name = `${baseName(job.resultName)}-${n}.${EXT_BY_MIME[job.format]}`;
        n++;
      }
      usedNames.add(name);
      zip.file(name, job.resultBlob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-images.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    downloadZipBtn.disabled = false;
    downloadZipBtn.textContent = 'ดาวน์โหลดทั้งหมด (.zip)';
  });
})();
