/* Canvas conversion shared by the workspace and its image worker. */
(function (root) {
  'use strict';

  async function encodeImage(source, options, canvas) {
    const { width, height, format, quality, rotation, flipH, flipV } = options;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('CANVAS_CONTEXT_FAILED');

      ctx.imageSmoothingQuality = 'high';
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      }

      const sideways = rotation % 180 !== 0;
      const drawWidth = sideways ? height : width;
      const drawHeight = sideways ? width : height;
      ctx.translate(width / 2, height / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      const blob = canvas.convertToBlob
        ? await canvas.convertToBlob({ type: format, quality })
        : await new Promise(resolve => canvas.toBlob(resolve, format, quality));
      if (!blob || blob.type !== format) throw new Error('CREATE_FAILED');
      return blob;
    } finally {
      canvas.width = canvas.height = 0;
    }
  }

  if (typeof window !== 'undefined') {
    root.KittoEncodeImage = encodeImage;
    return;
  }

  root.onmessage = async ({ data: { blob, options } }) => {
    let bitmap;
    try {
      bitmap = await root.createImageBitmap(blob);
      const canvas = new root.OffscreenCanvas(options.width, options.height);
      const result = await encodeImage(bitmap, options, canvas);
      root.postMessage({ ok: true, blob: result });
    } catch (error) {
      root.postMessage({ ok: false, error: error.message });
    } finally {
      bitmap?.close();
    }
  };
})(typeof window !== 'undefined' ? window : self);
