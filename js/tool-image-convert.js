(() => {
  'use strict';
  const U = window.Utils;

  const dropzone = document.getElementById('dz-img-convert');
  const fileInput = document.getElementById('input-img-convert');
  const bulkbar = document.getElementById('bulk-img-convert');
  const countEl = document.getElementById('count-img-convert');
  const bulkFormatEl = document.getElementById('bulkFormat-img-convert');
  const clearAllBtn = document.getElementById('clearAll-img-convert');
  const convertAllBtn = document.getElementById('convertAll-img-convert');
  const downloadZipBtn = document.getElementById('downloadZip-img-convert');
  const jobsEl = document.getElementById('jobs-img-convert');
  const jobTemplate = document.getElementById('tpl-img-convert');

  let jobSeq = 0;
  const jobs = []; // ConvertJob[]

  const EXT_BY_FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

  class ConvertJob {
    constructor(file) {
      this.id = 'conv-' + (++jobSeq);
      this.file = file;
      this.format = 'image/png';
      this.rotation = 0; // 0 | 90 | 180 | 270
      this.flipH = false;
      this.flipV = false;
      this.aspectLocked = true;
      this.naturalW = 0;
      this.naturalH = 0;
      this.resultBlob = null;
      this.resultUrl = null;
      this.el = jobTemplate.content.firstElementChild.cloneNode(true);
      this.buildDom();
    }

    buildDom() {
      const el = this.el;
      const url = URL.createObjectURL(this.file);
      this.objectUrl = url;

      this.thumbImg = el.querySelector('.ticket-thumb img');
      this.widthInput = el.querySelector('.js-width');
      this.heightInput = el.querySelector('.js-height');
      this.lockBtn = el.querySelector('.js-lock');
      this.qualityRow = el.querySelector('.js-quality-row');
      this.qualityInput = el.querySelector('.js-quality');
      this.qualityVal = el.querySelector('.js-quality-val');
      this.statusEl = el.querySelector('.js-status');
      this.convertBtn = el.querySelector('.js-convert-btn');
      this.downloadBtn = el.querySelector('.js-download-btn');
      this.formatGroup = el.querySelector('.js-format-group');
      this.rotateGroup = el.querySelector('.js-rotate-group');

      el.querySelector('.js-filename').textContent = this.file.name;
      el.querySelector('.js-origsize').textContent = U.formatBytes(this.file.size);
      el.querySelector('.js-origext').textContent = U.extOf(this.file.name);
      this.thumbImg.src = url;

      this.thumbImg.onload = () => {
        this.naturalW = this.thumbImg.naturalWidth;
        this.naturalH = this.thumbImg.naturalHeight;
        el.querySelector('.js-origdim').textContent = `${this.naturalW}×${this.naturalH}`;
      };

      this.updateQualityVisibility();

      this.formatGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        this.formatGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.format = btn.dataset.format;
        this.updateQualityVisibility();
        this.markStale();
      });

      this.rotateGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'rotate-left') this.rotation = (this.rotation + 270) % 360;
        else if (action === 'rotate-right') this.rotation = (this.rotation + 90) % 360;
        else if (action === 'flip-h') this.flipH = !this.flipH;
        else if (action === 'flip-v') this.flipV = !this.flipV;
        btn.classList.toggle('is-active', (action === 'flip-h' && this.flipH) || (action === 'flip-v' && this.flipV));
        this.markStale();
      });

      this.lockBtn.addEventListener('click', () => {
        this.aspectLocked = !this.aspectLocked;
        this.lockBtn.classList.toggle('is-locked', this.aspectLocked);
      });

      this.widthInput.addEventListener('input', () => {
        if (this.aspectLocked && this.widthInput.value && this.naturalW) {
          const ratio = this.naturalH / this.naturalW;
          this.heightInput.value = Math.max(1, Math.round(parseFloat(this.widthInput.value) * ratio));
        }
        this.markStale();
      });
      this.heightInput.addEventListener('input', () => {
        if (this.aspectLocked && this.heightInput.value && this.naturalH) {
          const ratio = this.naturalW / this.naturalH;
          this.widthInput.value = Math.max(1, Math.round(parseFloat(this.heightInput.value) * ratio));
        }
        this.markStale();
      });

      this.qualityInput.addEventListener('input', () => {
        this.qualityVal.textContent = Math.round(parseFloat(this.qualityInput.value) * 100) + '%';
        this.markStale();
      });

      this.convertBtn.addEventListener('click', () => this.convert());

      el.querySelector('.js-remove-btn').addEventListener('click', () => {
        this.dispose();
        el.remove();
        const idx = jobs.indexOf(this);
        if (idx >= 0) jobs.splice(idx, 1);
        updateBulkUI();
      });
    }

    updateQualityVisibility() {
      this.qualityRow.classList.toggle('hidden', this.format === 'image/png');
    }

    markStale() {
      if (this.resultBlob) {
        this.resultBlob = null;
        this.downloadBtn.classList.add('hidden');
        this.statusEl.textContent = 'รอแปลง';
        this.statusEl.classList.remove('is-ready', 'is-error');
      }
    }

    async convert() {
      if (!this.naturalW || !this.naturalH) {
        // image metadata hasn't loaded yet
        await new Promise(res => { this.thumbImg.addEventListener('load', res, { once: true }); });
      }

      this.convertBtn.disabled = true;
      this.statusEl.classList.remove('is-ready', 'is-error');
      this.statusEl.textContent = 'กำลังแปลง…';

      try {
        const rotSwaps = this.rotation % 180 !== 0;
        const rotW = rotSwaps ? this.naturalH : this.naturalW;
        const rotH = rotSwaps ? this.naturalW : this.naturalH;

        const outW = Math.max(1, parseInt(this.widthInput.value, 10) || rotW);
        const outH = Math.max(1, parseInt(this.heightInput.value, 10) || rotH);

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');

        if (this.format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, outW, outH);
        }

        const dw = rotSwaps ? outH : outW;
        const dh = rotSwaps ? outW : outH;

        ctx.save();
        ctx.translate(outW / 2, outH / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
        ctx.drawImage(this.thumbImg, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();

        const quality = this.format === 'image/png' ? undefined : parseFloat(this.qualityInput.value);
        const blob = await new Promise(res => canvas.toBlob(res, this.format, quality));
        if (!blob) throw new Error('สร้างไฟล์ไม่สำเร็จ');

        if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
        this.resultBlob = blob;
        this.resultUrl = URL.createObjectURL(blob);
        const ext = EXT_BY_FORMAT[this.format];
        this.downloadBtn.href = this.resultUrl;
        this.downloadBtn.download = `${U.baseName(this.file.name)}.${ext}`;
        this.downloadBtn.classList.remove('hidden');
        this.statusEl.textContent = `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;
        this.statusEl.classList.add('is-ready');
      } catch (err) {
        this.statusEl.textContent = 'แปลงไม่สำเร็จ: ' + err.message;
        this.statusEl.classList.add('is-error');
      } finally {
        this.convertBtn.disabled = false;
      }
    }

    dispose() {
      URL.revokeObjectURL(this.objectUrl);
      if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
    }
  }

  function updateBulkUI() {
    countEl.textContent = String(jobs.length);
    bulkbar.classList.toggle('hidden', jobs.length === 0);
    if (!jobs.some(j => j.resultBlob)) downloadZipBtn.classList.add('hidden');
  }

  function addFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith('image/')).forEach(file => {
      const job = new ConvertJob(file);
      jobs.push(job);
      jobsEl.appendChild(job.el);
    });
    updateBulkUI();
  }

  bulkFormatEl.addEventListener('change', () => {
    const format = bulkFormatEl.value;
    if (!format) return;
    jobs.forEach(job => {
      job.format = format;
      job.formatGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('is-active', b.dataset.format === format));
      job.updateQualityVisibility();
      job.markStale();
    });
  });

  clearAllBtn.addEventListener('click', () => {
    jobs.forEach(job => job.dispose());
    jobs.length = 0;
    jobsEl.innerHTML = '';
    updateBulkUI();
  });

  convertAllBtn.addEventListener('click', async () => {
    if (!jobs.length) return;
    convertAllBtn.disabled = true;
    convertAllBtn.textContent = 'กำลังแปลงทั้งหมด…';
    try {
      // Run conversions with a little concurrency instead of one-by-one, without
      // overwhelming the browser on large batches.
      const CONCURRENCY = 3;
      let i = 0;
      async function worker() {
        while (i < jobs.length) {
          const job = jobs[i++];
          await job.convert();
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
    } finally {
      convertAllBtn.disabled = false;
      convertAllBtn.textContent = 'แปลงทั้งหมด';
      downloadZipBtn.classList.toggle('hidden', !jobs.some(j => j.resultBlob));
    }
  });

  downloadZipBtn.addEventListener('click', async () => {
    const ready = jobs.filter(j => j.resultBlob);
    if (!ready.length) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = 'กำลังบีบอัด…';
    try {
      const zip = new JSZip();
      const usedNames = new Set();
      ready.forEach(job => {
        const ext = EXT_BY_FORMAT[job.format];
        let name = `${U.baseName(job.file.name)}.${ext}`;
        let n = 2;
        while (usedNames.has(name)) name = `${U.baseName(job.file.name)}-${n++}.${ext}`;
        usedNames.add(name);
        zip.file(name, job.resultBlob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      U.downloadBlob(content, 'converted-images.zip');
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = 'ดาวน์โหลดทั้งหมด (.zip)';
    }
  });

  U.setupDropzone(dropzone, fileInput, addFiles);
})();
