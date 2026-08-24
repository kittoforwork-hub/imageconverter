(() => {
  'use strict';
  const U = window.Utils;

  const dropzone = document.getElementById('dz-img-crop');
  const fileInput = document.getElementById('input-img-crop');
  const jobsEl = document.getElementById('jobs-img-crop');
  const jobTemplate = document.getElementById('tpl-img-crop');

  const MIN_BOX = 24;
  let jobSeq = 0;

  const RATIOS = { 'free': null, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };

  class CropJob {
    constructor(file) {
      this.id = 'crop-' + (++jobSeq);
      this.file = file;
      this.ratio = null;
      this.format = 'image/png';
      this.box = { left: 0, top: 0, width: 0, height: 0 };
      this.el = jobTemplate.content.firstElementChild.cloneNode(true);
      this.buildDom();
    }

    buildDom() {
      const el = this.el;
      const url = URL.createObjectURL(this.file);
      this.objectUrl = url;

      this.stage = el.querySelector('.js-crop-stage');
      this.imgEl = el.querySelector('.js-crop-img');
      this.boxEl = el.querySelector('.js-crop-box');
      this.cropdimEl = el.querySelector('.js-cropdim');
      this.statusEl = el.querySelector('.js-status');
      this.downloadBtn = el.querySelector('.js-download-btn');

      el.querySelector('.js-filename').textContent = this.file.name;
      this.imgEl.src = url;

      this.imgEl.onload = () => {
        el.querySelector('.js-origdim').textContent = `${this.imgEl.naturalWidth}×${this.imgEl.naturalHeight}`;
        requestAnimationFrame(() => this.initBox());
      };

      el.querySelector('.js-ratio-group').addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        el.querySelector('.js-ratio-group').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.ratio = RATIOS[btn.dataset.ratio];
        this.applyRatioToBox();
      });

      el.querySelector('.js-format-group').addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        el.querySelector('.js-format-group').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.format = btn.dataset.format;
      });

      el.querySelector('.js-crop-btn').addEventListener('click', () => this.crop());

      el.querySelector('.js-remove-btn').addEventListener('click', () => {
        URL.revokeObjectURL(this.objectUrl);
        if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
        el.remove();
      });

      this.wireDrag();
    }

    getDisplayRect() {
      const stageRect = this.stage.getBoundingClientRect();
      const imgRect = this.imgEl.getBoundingClientRect();
      return {
        left: imgRect.left - stageRect.left,
        top: imgRect.top - stageRect.top,
        width: imgRect.width,
        height: imgRect.height
      };
    }

    initBox() {
      const d = this.getDisplayRect();
      const w = d.width * 0.7;
      const h = this.ratio ? w / this.ratio : d.height * 0.7;
      this.box = {
        left: d.left + (d.width - w) / 2,
        top: d.top + (d.height - h) / 2,
        width: w,
        height: h
      };
      this.render();
    }

    applyRatioToBox() {
      if (!this.box.width) return;
      const d = this.getDisplayRect();
      if (this.ratio) {
        let h = this.box.width / this.ratio;
        if (h > d.height) { h = d.height; this.box.width = h * this.ratio; }
        this.box.height = h;
        if (this.box.left + this.box.width > d.left + d.width) this.box.left = d.left + d.width - this.box.width;
        if (this.box.top + this.box.height > d.top + d.height) this.box.top = d.top + d.height - this.box.height;
      }
      this.render();
    }

    render() {
      this.boxEl.style.left = this.box.left + 'px';
      this.boxEl.style.top = this.box.top + 'px';
      this.boxEl.style.width = this.box.width + 'px';
      this.boxEl.style.height = this.box.height + 'px';

      const d = this.getDisplayRect();
      if (d.width && this.imgEl.naturalWidth) {
        const scaleX = this.imgEl.naturalWidth / d.width;
        const scaleY = this.imgEl.naturalHeight / d.height;
        const outW = Math.round(this.box.width * scaleX);
        const outH = Math.round(this.box.height * scaleY);
        this.cropdimEl.textContent = `${outW}×${outH} px`;
      }
    }

    wireDrag() {
      const stage = this.stage;
      const boxEl = this.boxEl;
      let mode = null; // 'move' | 'nw' | 'ne' | 'sw' | 'se'
      let startPtr = { x: 0, y: 0 };
      let startBox = null;
      let anchor = null;

      const toStageCoords = (e) => {
        const r = stage.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };

      const onDown = (e, m) => {
        mode = m;
        const p = toStageCoords(e);
        startPtr = p;
        startBox = { ...this.box };
        if (m !== 'move') {
          const opp = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' }[m];
          anchor = {
            x: opp.includes('e') ? startBox.left + startBox.width : startBox.left,
            y: opp.includes('s') ? startBox.top + startBox.height : startBox.top
          };
        }
        e.preventDefault();
        e.stopPropagation();
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const onMove = (e) => {
        if (!mode) return;
        const d = this.getDisplayRect();
        const p = toStageCoords(e);
        const curX = Math.min(Math.max(p.x, d.left), d.left + d.width);
        const curY = Math.min(Math.max(p.y, d.top), d.top + d.height);

        if (mode === 'move') {
          const dx = p.x - startPtr.x;
          const dy = p.y - startPtr.y;
          let left = startBox.left + dx;
          let top = startBox.top + dy;
          left = Math.min(Math.max(left, d.left), d.left + d.width - startBox.width);
          top = Math.min(Math.max(top, d.top), d.top + d.height - startBox.height);
          this.box = { left, top, width: startBox.width, height: startBox.height };
        } else {
          let width = Math.abs(curX - anchor.x);
          let height = Math.abs(curY - anchor.y);
          if (this.ratio) height = width / this.ratio;
          width = Math.max(width, MIN_BOX);
          height = Math.max(height, MIN_BOX);
          let left = curX < anchor.x ? anchor.x - width : anchor.x;
          let top = curY < anchor.y ? anchor.y - height : anchor.y;

          if (left < d.left) { width -= (d.left - left); left = d.left; if (this.ratio) height = width / this.ratio; }
          if (top < d.top) { height -= (d.top - top); top = d.top; if (this.ratio) width = height * this.ratio; }
          if (left + width > d.left + d.width) width = d.left + d.width - left;
          if (top + height > d.top + d.height) height = d.top + d.height - top;

          this.box = { left, top, width: Math.max(width, MIN_BOX), height: Math.max(height, MIN_BOX) };
        }
        this.render();
      };

      const onUp = () => {
        mode = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      boxEl.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest('.crop-handle');
        onDown(e, handle ? handle.dataset.dir : 'move');
      });
    }

    crop() {
      const d = this.getDisplayRect();
      const scaleX = this.imgEl.naturalWidth / d.width;
      const scaleY = this.imgEl.naturalHeight / d.height;
      const sx = (this.box.left - d.left) * scaleX;
      const sy = (this.box.top - d.top) * scaleY;
      const sw = this.box.width * scaleX;
      const sh = this.box.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext('2d');
      if (this.format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(this.imgEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          this.statusEl.textContent = 'ตัดไม่สำเร็จ';
          this.statusEl.classList.add('is-error');
          return;
        }
        if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
        this.resultUrl = URL.createObjectURL(blob);
        const ext = this.format === 'image/png' ? 'png' : 'jpg';
        this.downloadBtn.href = this.resultUrl;
        this.downloadBtn.download = `${U.baseName(this.file.name)}-cropped.${ext}`;
        this.downloadBtn.classList.remove('hidden');
        this.statusEl.textContent = `พร้อมดาวน์โหลด · ${U.formatBytes(blob.size)}`;
        this.statusEl.classList.remove('is-error');
        this.statusEl.classList.add('is-ready');
      }, this.format, this.format === 'image/jpeg' ? 0.92 : undefined);
    }
  }

  function addFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith('image/')).forEach(file => {
      const job = new CropJob(file);
      jobsEl.appendChild(job.el);
    });
  }

  U.setupDropzone(dropzone, fileInput, addFiles);
})();
