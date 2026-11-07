/* KITTO queue: bounded, cancelable in-browser jobs. Independent of the image pipeline. */
(() => {
  'use strict';
  let nextId = 0;
  class KittoQueue {
    constructor(processor, onChange = () => {}, concurrency = 2) {
      this.processor = processor;
      this.onChange = onChange;
      this.concurrency = Math.max(1, Math.min(3, concurrency));
      this.items = [];
      this.running = 0;
    }
    emit() { this.onChange(this.items); }
    add(files, config = {}) {
      const added = [...files].map(file => ({
        id: `kitto-${++nextId}`, file, name: file.name, config: {...config},
        status: 'queued', progress: 0, phase: 'รอคิว', error: '', result: null,
        controller: null, outputName: '', resultUrl: null
      }));
      this.items.push(...added); this.emit(); this.pump(); return added;
    }
    progress(item, value, phase) {
      if (item.status !== 'processing') return;
      item.progress = Math.max(0, Math.min(1, value));
      if (phase) item.phase = phase;
      this.emit();
    }
    pump() {
      while (this.running < this.concurrency) {
        const item = this.items.find(i => i.status === 'queued' && !i.controller);
        if (!item) return;
        item.status = 'processing'; item.controller = new AbortController();
        this.running++; this.emit();
        const signal = item.controller.signal;
        Promise.resolve().then(() => this.processor(item, signal, (p, phase) => this.progress(item, p, phase)))
          .then(result => {
            if (signal.aborted) return;
            item.result = result.blob; item.outputName = result.name;
            item.progress = 1; item.phase = 'เสร็จแล้ว'; item.status = 'done';
          })
          .catch(error => {
            if (signal.aborted) return;
            item.status = 'failed'; item.phase = 'ผิดพลาด';
            item.error = error?.message || 'ประมวลผลไม่สำเร็จ';
          })
          .finally(() => {
            item.controller = null; this.running--;
            this.emit(); this.pump();
          });
      }
    }
    cancel(id) {
      const item = this.items.find(i => i.id === id);
      if (!item || !['queued','processing'].includes(item.status)) return;
      item.controller?.abort(); item.status = 'canceled'; item.phase = 'ยกเลิก';
      this.emit(); this.pump();
    }
    retry(id) {
      const item = this.items.find(i => i.id === id);
      if (!item || !['failed','canceled'].includes(item.status)) return;
      item.result = null; item.error = ''; item.progress = 0;
      item.status = 'queued'; item.phase = 'รอคิว'; this.emit(); this.pump();
    }
    clearSettled() {
      this.items = this.items.filter(item => {
        if (['processing', 'queued'].includes(item.status)) return true;
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        return false;
      });
      this.emit();
    }
    stopAll() {
      for (const item of this.items) {
        if (!['queued', 'processing'].includes(item.status)) continue;
        item.status = 'canceled';
        item.phase = 'ยกเลิก';
        item.controller?.abort();
      }
      this.emit();
    }
  }
  window.KittoQueue = KittoQueue;
})();
