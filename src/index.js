const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function readLimitedBody(stream, maxBytes) {
  if (!stream) throw new Error('BACKGROUND_EMPTY_FILE');

  const reader = stream.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('BACKGROUND_FILE_TOO_LARGE');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (!total) throw new Error('BACKGROUND_EMPTY_FILE');

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

async function removeBackground(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const requestOrigin = request.headers.get('Origin');
  const ownOrigin = new URL(request.url).origin;
  if (requestOrigin && requestOrigin !== ownOrigin) {
    return jsonResponse({ code: 'ORIGIN_NOT_ALLOWED' }, 403);
  }

  if (!env.IMAGES) {
    return jsonResponse({ code: 'BACKGROUND_SERVICE_NOT_CONFIGURED' }, 503);
  }

  const contentType = (request.headers.get('Content-Type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return jsonResponse({ code: 'BACKGROUND_UNSUPPORTED_FORMAT' }, 415);
  }

  const declaredSize = Number(request.headers.get('Content-Length') || 0);
  if (declaredSize > MAX_IMAGE_BYTES) {
    return jsonResponse({ code: 'BACKGROUND_FILE_TOO_LARGE' }, 413);
  }

  try {
    const imageBytes = await readLimitedBody(request.body, MAX_IMAGE_BYTES);

    // Cloudflare Images uses its BiRefNet segmentation model for this transform.
    const transformed = await env.IMAGES
      .input(imageBytes)
      .transform({ segment: 'foreground' })
      .output({ format: 'image/png' })
      .response();

    if (!transformed.ok) {
      const details = await transformed.text().catch(() => '');
      const status = transformed.status || 502;

      if (details.includes('9422')) {
        return jsonResponse({ code: 'BACKGROUND_FREE_LIMIT_REACHED' }, 429);
      }

      console.error('[Background Removal] Images transformation failed:', status, details.slice(0, 500));
      return jsonResponse({ code: 'BACKGROUND_PROCESSING_FAILED' }, 502);
    }

    return new Response(transformed.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="background-removed.png"',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const code = error && error.message ? error.message : '';

    if (code === 'BACKGROUND_FILE_TOO_LARGE') {
      return jsonResponse({ code }, 413);
    }
    if (code === 'BACKGROUND_EMPTY_FILE') {
      return jsonResponse({ code }, 400);
    }

    // Cloudflare may surface the Images Free quota error as an exception.
    if (code.includes('9422')) {
      return jsonResponse({ code: 'BACKGROUND_FREE_LIMIT_REACHED' }, 429);
    }

    console.error('[Background Removal] Processing error:', error);
    return jsonResponse({ code: 'BACKGROUND_PROCESSING_FAILED' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return jsonResponse({
        ok: true,
        backgroundRemoval: Boolean(env.IMAGES),
      });
    }

    if (url.pathname === '/api/remove-background') {
      return removeBackground(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
