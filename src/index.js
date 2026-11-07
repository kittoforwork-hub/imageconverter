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

const IMAGE_ERRORS = {
  '9422': ['BACKGROUND_FREE_LIMIT_REACHED', 429],
  '9432': ['BACKGROUND_IMAGES_BILLING_NOT_SUPPORTED', 503],
  '9413': ['BACKGROUND_IMAGE_PROCESSING_LIMIT', 413],
  '9522': ['BACKGROUND_IMAGE_PROCESSING_LIMIT', 413],
  '9520': ['BACKGROUND_UNSUPPORTED_FORMAT', 415],
};

function imageFailure(detail) {
  const cfCode = String(detail).match(/\b(?:94|95)\d{2}\b/)?.[0];
  const [code, status] = IMAGE_ERRORS[cfCode] || ['BACKGROUND_PROCESSING_FAILED', 502];
  console.error('[Background Removal]', String(detail).slice(0, 500));
  return jsonResponse({ code, cfCode: cfCode || null }, status);
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
    // Images Binding expects a ReadableStream<Uint8Array>.
    // Passing Uint8Array directly can trigger an internal runtime error
    // in some Cloudflare Workers versions. Blob.stream() supplies the
    // expected input type without changing the image bytes.
    const imageStream = new Blob([imageBytes], {
      type: contentType,
    }).stream();

    // ImagesBinding.output() is asynchronous and resolves to an output handle.
    // Call response() only after awaiting that handle (not on the Promise).
    const imageOutput = await env.IMAGES
      .input(imageStream)
      .transform({ segment: 'foreground' })
      .output({ format: 'image/png' });

    const transformed = await imageOutput.response();
    if (!transformed.ok) {
      const details = await transformed.text().catch(() => '');
      return imageFailure(details || `HTTP ${transformed.status}`);
    }
    if (!transformed.body) return imageFailure('Empty Images response');

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

    return imageFailure([error?.code, error?.message || error].filter(Boolean).join(' '));
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

    if (url.pathname.startsWith('/api/')) return jsonResponse({ code: 'NOT_FOUND' }, 404);
    return env.ASSETS.fetch(request);
  },
};
