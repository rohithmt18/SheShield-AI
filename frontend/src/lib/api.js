/**
 * API client.
 *
 * The session id lives in sessionStorage, not localStorage: closing the tab
 * ends the session on this device. That is a deliberate safety property — a
 * shared or monitored device should not show a history of what was checked.
 */

const KEY = 'sheshield.session';

/**
 * Where the API lives.
 *
 * Empty by default, so calls stay relative ("/api/…") and same-origin — which
 * is what the Vite dev proxy and a Vercel rewrite both rely on, and it avoids
 * CORS entirely. Set VITE_API_URL when the frontend is hosted apart from the
 * backend with no proxy in front; the backend's CORS_ORIGIN must then list the
 * frontend's URL.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const getSessionId = () => {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
};

export const setSessionId = (id) => {
  try { if (id) sessionStorage.setItem(KEY, id); } catch { /* private mode */ }
};

export const clearSessionId = () => {
  try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method,
      signal,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(
      API_BASE
        ? `Cannot reach the server at ${API_BASE}.`
        : 'Cannot reach the server. Is the backend running on port 5050?',
      0,
    );
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { /* non-JSON error body */ }
  }

  if (!response.ok) {
    throw new ApiError(data?.error ?? `Request failed (${response.status}).`, response.status);
  }

  // Any endpoint may mint a session; keep the stored id in step.
  if (data?.sessionId) setSessionId(data.sessionId);
  return data;
}

/**
 * Multipart upload with progress.
 *
 * XMLHttpRequest rather than fetch: fetch still cannot report upload progress
 * in any shipping browser, and an image analysis runs long enough — the upload,
 * then OCR, then the model — that a UI with no feedback reads as broken.
 *
 * @param {string} path
 * @param {FormData} form
 * @param {{onProgress?: (percent: number) => void, signal?: AbortSignal}} [opts]
 */
function upload(path, form, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api${path}`);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener('load', () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* non-JSON error body */ }

      if (xhr.status < 200 || xhr.status >= 300) {
        // A 404 here is almost always version skew, not a wrong URL: the
        // frontend deployed with a feature the API has not shipped yet. The
        // server's generic "Unknown endpoint." tells the user nothing they can
        // act on, so name the actual situation.
        const message = xhr.status === 404
          ? 'Screenshot analysis is not available on the server yet. The API may still be '
            + 'deploying — try again shortly, or paste the messages as text in the meantime.'
          : data?.error ?? `Request failed (${xhr.status}).`;
        reject(new ApiError(message, xhr.status));
        return;
      }
      if (data?.sessionId) setSessionId(data.sessionId);
      resolve(data);
    });

    xhr.addEventListener('error', () => reject(new ApiError(
      API_BASE ? `Cannot reach the server at ${API_BASE}.`
        : 'Cannot reach the server. Is the backend running on port 5050?',
      0,
    )));

    xhr.addEventListener('abort', () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      reject(err);
    });

    if (signal) {
      if (signal.aborted) { xhr.abort(); return; }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

export const api = {
  meta: () => request('/meta'),

  startSession: () => request('/session', { method: 'POST', body: { sessionId: getSessionId() } }),

  getSession: (id = getSessionId()) => (id ? request(`/session/${id}`) : Promise.resolve(null)),

  deleteSession: async (id = getSessionId()) => {
    if (!id) return null;
    const out = await request(`/session/${id}`, { method: 'DELETE' });
    clearSessionId();
    return out;
  },

  analyze: ({ text, messages, sourceLabel, region }, signal) => request('/analyze', {
    method: 'POST',
    signal,
    body: { sessionId: getSessionId(), text, messages, sourceLabel, region },
  }),

  /**
   * Analyse a screenshot. Returns the same `{ sessionId, analysis }` as
   * `analyze`, plus `extractedText` so the UI can show what was actually read.
   */
  analyzeImage: ({ file, sourceLabel, region }, { onProgress, signal } = {}) => {
    const form = new FormData();
    form.append('image', file);
    const sessionId = getSessionId();
    if (sessionId) form.append('sessionId', sessionId);
    if (sourceLabel) form.append('sourceLabel', sourceLabel);
    if (region) form.append('region', region);
    return upload('/analyze/image', form, { onProgress, signal });
  },

  preview: (text, signal) => request('/analyze/preview', {
    method: 'POST', signal, body: { text },
  }),

  chat: (message, signal) => request('/chat', {
    method: 'POST', signal, body: { sessionId: getSessionId(), message },
  }),

  chatHistory: (id = getSessionId()) => (id ? request(`/chat/${id}`) : Promise.resolve({ messages: [] })),

  clearChat: (id = getSessionId()) => (id ? request(`/chat/${id}`, { method: 'DELETE' }) : null),

  buildReport: ({ analysisId, details }) => request('/report', {
    method: 'POST',
    body: { sessionId: getSessionId(), analysisId, details },
  }),

  getReport: (id = getSessionId()) => (id ? request(`/report/${id}`) : Promise.resolve(null)),

  reportPdfUrl: (id = getSessionId()) => `${API_BASE}/api/report/${id}/pdf`,

  resources: ({ categories = [], level = 'medium', region = '' } = {}) => request(
    `/resources?categories=${encodeURIComponent(categories.join(','))}`
    + `&level=${encodeURIComponent(level)}&region=${encodeURIComponent(region)}`,
  ),
};

export { ApiError };
