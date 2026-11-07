importScripts('./workflow-image-core.js');
self.onmessage = async event => {
  const { blob, options } = event.data;
  try {
    const result = await self.KittoTransformImage(blob, options, self);
    self.postMessage({ ok: true, ...result });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || 'Image processing failed' });
  }
};
