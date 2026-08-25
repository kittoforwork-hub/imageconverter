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
  const jobs = []; // BgJob[]

  // ---------------------------------------------------------------------
  // The library itself is a small JS wrapper; the ~40MB AI model it needs
  // is fetched lazily (by the library, from IMG.LY's CDN) the first time
  // removeBackground() actually runs — not on page load — so visitors who
  // never open this tool never pay that cost. The browser's HTTP cache
  // keeps it around after the first run.
  const LIB_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';
  let removeBackgroundFn = null;
  let libPromise = null;
  function loadLibrary() {
    if (!libPromise) {
      libPromise = import(/* webpackIgnore: true */ LIB_URL)
        .then(mod => { removeBackgroundFn = mod.removeBackground; })
        .catch(err => {
          libPromise = null;
          throw new Error('โหลดไลบรารีลบพื้นหลังไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต): ' + err.message);
        });
    }
    return libPromise;
  }

  class BgJob {
    constructor(file) {
      this.id = 'bg-' + (++jobSeq);
      this.file = file;
      this.resultBlob = null;
      this.resultUrl = null;
      this.el = jobTemplate.content.firstElementChild.cloneNode(true);
      this.buildDom();
    }

    buildDom() {
      const el = this.el;
      const url = URL.createObjectURL(this.file);
      this.objectUrl = url;

      this.beforeImg = el.querySelector('.js-before img');
      this.afterWrap = el.querySelector('.js-after');
      this.afterImg = el.querySelector('.js-after img');
      this.statusEl = el.querySelector('.js-status');
      this.progressFill = el.querySelector('.js-progress');
      this.processBtn = el.querySelector('.js-remove-bg-btn');
      this.downloadBtn = el.querySelector('.js-download-btn');

      el.querySelector('.js-filename').textContent = this.file.name;
      el.querySelector('.js-origsize').textContent = U.formatBytes(this.file.size);
      this.beforeImg.src = url;

      this.processBtn.addEventListener('click', () => this.process());

      el.querySelector('.js-remove-job-btn').addEventListener('click', () => {
        this.dispose();
        el.remove();
        const idx = jobs.indexOf(this);
        if (idx >= 0) jobs.splice(idx, 1);
        updateBulkUI();
      });
    }

    setProgress(pct) {
      if (this.progressFill) this.progressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    async process() {
      if (this.resultBlob) return; // already done
      this.processBtn.disabled = true;
      this.statusEl.classList.remove('is-ready', 'is-error');
      this.statusEl.textContent = 'กำลังเตรียมโมเดล…';
      this.setProgress(0);

      try {
        await loadLibrary();
        const blob = await removeBackgroundFn(this.file, {
          output: { format: 'image/png' },
          progress: (key, current, total) => {
            if (!total) return;
            const pct = Math.round((current / total) * 100);
            this.setProgress(pct);
            const downloading = typeof key === 'string' && key.toLowerCase().includes('fetch');
            this.statusEl.textContent = (downloading ? 'กำลังโหลดโมเดล… ' : 'กำลังประมวลผล… ') + pct + '%';
          }
        });

        if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
        this.resultBlob = blob;
        this.resultUrl = URL.createObjectURL(blob);
        this.afterImg.src = this.resultUrl;
        this.afterWrap.classList.remove('hidden');
        this.downloadBtn.href = this.resultUrl;
        this.downloadBtn.download = `${U.baseName(this.file.name)}-nobg.png`;
        this.downloadBtn.classList.remove('hidden');
        this.setProgress(100);
        this.statusEl.textContent = `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;
        this.statusEl.classList.add('is-ready');
      } catch (err) {
        this.statusEl.textContent = 'ลบพื้นหลังไม่สำเร็จ: ' + err.message;
        this.statusEl.classList.add('is-error');
        this.setProgress(0);
      } finally {
        this.processBtn.disabled = false;
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
      const job = new BgJob(file);
      jobs.push(job);
      jobsEl.appendChild(job.el);
    });
    updateBulkUI();
  }

  clearAllBtn.addEventListener('click', () => {
    jobs.forEach(job => job.dispose());
    jobs.length = 0;
    jobsEl.innerHTML = '';
    updateBulkUI();
  });

  processAllBtn.addEventListener('click', async () => {
    if (!jobs.length) return;
    processAllBtn.disabled = true;
    processAllBtn.textContent = 'กำลังลบพื้นหลังทั้งหมด…';
    try {
      // Sequential on purpose: this is a heavy in-browser AI model, not a
      // cheap canvas op — running several at once would fight over
      // CPU/memory and could stall or crash the tab, especially on
      // lower-end machines.
      for (const job of jobs) {
        if (!job.resultBlob) {
          // eslint-disable-next-line no-await-in-loop
          await job.process();
        }
      }
    } finally {
      processAllBtn.disabled = false;
      processAllBtn.textContent = 'ลบพื้นหลังทั้งหมด';
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
        let name = `${U.baseName(job.file.name)}-nobg.png`;
        let n = 2;
        while (usedNames.has(name)) name = `${U.baseName(job.file.name)}-nobg-${n++}.png`;
        usedNames.add(name);
        zip.file(name, job.resultBlob);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      U.downloadBlob(content, 'no-background.zip');
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = 'ดาวน์โหลดทั้งหมด (.zip)';
    }
  });

  U.setupDropzone(dropzone, fileInput, addFiles);

  U.onClearCache(() => {
    jobs.forEach(job => job.dispose());
    jobs.length = 0;
    jobsEl.innerHTML = '';
    updateBulkUI();
  });
})();
