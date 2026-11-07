/* Reuse idle workers while enforcing the selected concurrency limit. */
(function(root) {
  'use strict';

  class KittoWorkerPool {
    constructor(url, maxWorkers = 2) {
      this.url = url;
      this.idle = [];
      this.pending = [];
      this.active = new Set();
      this.disposed = false;
      this.setMax(maxWorkers);
    }

    transform(blob, options, signal) {
      return new Promise((resolve, reject) => {
        if (this.disposed) return reject(new Error('Worker pool is closed'));
        const job = { blob, options, resolve, reject, signal, worker: null };
        job.abort = () => this.finish(job, new DOMException('Canceled', 'AbortError'));
        this.pending.push(job);
        if (signal?.aborted) return job.abort();
        signal?.addEventListener('abort', job.abort, { once: true });
        this.pump();
      });
    }

    pump() {
      while (!this.disposed && this.pending.length && this.active.size < this.maxWorkers) {
        const job = this.pending.shift();
        this.active.add(job);
        try {
          const worker = this.idle.pop() || new Worker(this.url);
          job.worker = worker;
          worker.onmessage = ({data}) => data?.ok
            ? this.finish(job, null, data, true)
            : this.finish(job, new Error(data?.error || 'Image conversion failed'), null, true);
          worker.onerror = event => this.finish(job, new Error(event.message || 'Image worker error'));
          worker.onmessageerror = () => this.finish(job, new Error('Image worker response failed'));
          worker.postMessage({ blob: job.blob, options: job.options });
        } catch (error) {
          this.finish(job, error);
        }
      }
    }

    finish(job, error, result, reuse = false) {
      if (!this.active.delete(job)) {
        const index = this.pending.indexOf(job);
        if (index < 0) return;
        this.pending.splice(index, 1);
      }
      job.signal?.removeEventListener('abort', job.abort);
      const worker = job.worker;
      if (worker) {
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        if (reuse && !this.disposed && this.active.size + this.idle.length < this.maxWorkers) {
          this.idle.push(worker);
        } else {
          worker.terminate();
        }
      }
      if (error) job.reject(error);
      else job.resolve(result);
      this.pump();
    }

    setMax(value) {
      this.maxWorkers = Math.max(1, Math.min(3, Math.trunc(Number(value)) || 1));
      while (this.idle.length && this.active.size + this.idle.length > this.maxWorkers) {
        this.idle.pop().terminate();
      }
      this.pump();
    }

    dispose() {
      this.disposed = true;
      for (const job of [...this.pending, ...this.active]) job.abort();
      for (const worker of this.idle) worker.terminate();
      this.idle.length = 0;
    }
  }

  root.KittoWorkerPool = KittoWorkerPool;
})(typeof window !== 'undefined' ? window : globalThis);
