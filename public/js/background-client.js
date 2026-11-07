/* Shared by the single-tool queue and Workflow Studio. */
(() => {
  const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
  function mime(file) {
    const type = file.type || types[file.name.split('.').pop().toLowerCase()];
    return Object.values(types).includes(type) ? type : '';
  }

  async function remove(file, signal) {
    if (!file.size) throw new Error('BACKGROUND_EMPTY_FILE');
    if (file.size > 20 * 1024 * 1024) throw new Error('BACKGROUND_FILE_TOO_LARGE');
    const type = mime(file);
    if (!type) throw new Error('BACKGROUND_UNSUPPORTED_FORMAT');

    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, 120000);
    try {
      const response = await fetch('/api/remove-background', {
        method: 'POST', headers: { 'Content-Type': type, Accept: 'image/png' },
        body: file, signal: controller.signal, cache: 'no-store'
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.code || `BACKGROUND_API_HTTP_${response.status}`);
      }
      if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'image/png') {
        throw new Error('BACKGROUND_INVALID_OUTPUT');
      }
      const result = await response.blob();
      if (!result.size) throw new Error('BACKGROUND_EMPTY_RESULT');
      return result;
    } catch (error) {
      if (controller.signal.aborted) throw new Error(signal?.aborted ? 'BACKGROUND_CANCELLED' : 'BACKGROUND_TIMEOUT');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }

  const messages = {
    BACKGROUND_FILE_TOO_LARGE: ['ไฟล์มีขนาดเกิน 20 MB', 'The file exceeds 20 MB.'],
    BACKGROUND_UNSUPPORTED_FORMAT: ['รองรับเฉพาะ JPG, PNG, WebP และ AVIF', 'Choose a JPG, PNG, WebP or AVIF image.'],
    BACKGROUND_FREE_LIMIT_REACHED: ['ใช้โควต้า Cloudflare Images ครบแล้ว', 'The Cloudflare Images quota has been reached.'],
    BACKGROUND_SERVICE_NOT_CONFIGURED: ['ยังไม่ได้ตั้งค่า Cloudflare Images binding', 'Cloudflare Images is not configured.'],
    BACKGROUND_IMAGES_BILLING_NOT_SUPPORTED: ['แผน Cloudflare Images ของบัญชีนี้ไม่รองรับการประมวลผล', 'The Cloudflare Images billing plan does not support this operation.'],
    BACKGROUND_IMAGE_PROCESSING_LIMIT: ['ความละเอียดของภาพเกินขีดจำกัดของ Cloudflare', 'Image dimensions exceed the processing limit.'],
    BACKGROUND_EMPTY_FILE: ['ไฟล์ที่เลือกว่างเปล่า', 'The selected file is empty.'],
    BACKGROUND_INVALID_OUTPUT: ['เซิร์ฟเวอร์ไม่ได้ส่งภาพ PNG กลับมา', 'The server did not return a PNG image.'],
    BACKGROUND_EMPTY_RESULT: ['เซิร์ฟเวอร์ส่งไฟล์ภาพว่างกลับมา', 'The server returned an empty image.'],
    BACKGROUND_TIMEOUT: ['ประมวลผลนานเกินไป กรุณาลองใหม่', 'Processing timed out. Please retry.'],
    BACKGROUND_PROCESSING_FAILED: ['Cloudflare ประมวลผลรูปนี้ไม่สำเร็จ', 'Cloudflare could not process this image.']
  };
  function message(code) {
    const labels = Object.hasOwn(messages, code) && messages[code];
    return labels ? labels[window.I18n?.getLanguage?.() === 'th' ? 0 : 1] : code;
  }
  window.KittoBackground = { remove, message };
})();
