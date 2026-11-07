/* Worker + fallback-safe image transform. No server is involved in this step. */
(function (root) {
  'use strict';
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Number(n) || lo)); }
  async function transformImage(blob, options, env = self) {
    const bitmap = await env.createImageBitmap(blob);
    try {
      const mode = options.mode || 'fit';
      const limit = clamp(options.maxDimension, 128, 4096);
      let width = bitmap.width; let height = bitmap.height;
      if (!width || !height || width * height > 100000000) throw new Error('รูปภาพมีขนาดพิกเซลใหญ่เกินกำหนด');
      const factor = Math.min(1, limit / Math.max(width, height));
      const scaledW = Math.max(1, Math.round(width * factor));
      const scaledH = Math.max(1, Math.round(height * factor));
      width = mode === 'square' ? Math.max(scaledW, scaledH) : scaledW;
      height = mode === 'square' ? Math.max(scaledW, scaledH) : scaledH;
      const mime = options.format === 'png' ? 'image/png' : options.format === 'webp' ? 'image/webp' : 'image/jpeg';
      const canvas = env.OffscreenCanvas ? new env.OffscreenCanvas(width, height) : env.document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: mime !== 'image/jpeg' });
      if (!ctx) throw new Error('ไม่สามารถสร้าง Canvas ได้');
      if (mime === 'image/jpeg' || (options.background && options.background !== 'transparent')) {
        ctx.fillStyle = options.background === 'pink' ? '#fff0f7' : '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, Math.floor((width - scaledW) / 2), Math.floor((height - scaledH) / 2), scaledW, scaledH);
      const encode = async quality => canvas.convertToBlob
        ? canvas.convertToBlob({ type: mime, quality })
        : new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('เข้ารหัสรูปภาพไม่สำเร็จ')), mime, quality));
      let quality = clamp(options.quality, .3, 1);
      let output = await encode(quality);
      const target = Math.max(0, Number(options.targetKB) || 0) * 1024;
      // Lossless PNG does not have an adjustable quality setting. Do not claim a byte target was reached.
      if (target && mime !== 'image/png' && output.size > target) {
        let lo = .28, hi = quality;
        for (let pass = 0; pass < 6; pass++) {
          quality = (lo + hi) / 2;
          const candidate = await encode(quality);
          if (candidate.size < output.size) output = candidate;
          if (candidate.size > target) hi = quality;
          else lo = quality;
        }
        // A target is best-effort; reduction of dimensions is explicit in the UI.
      }
      return { blob: output, width, height };
    } finally { bitmap.close?.(); }
  }
  root.KittoTransformImage = transformImage;
})(typeof self !== 'undefined' ? self : window);
