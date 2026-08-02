/**
 * The entire integration surface with SheShield AI.
 *
 * Nothing else in this app is allowed to call the API directly. Keeping the
 * boundary to one file is what makes the claim "the social client is separate
 * from the AI backend" checkable rather than aspirational — and it is why a
 * future X or YouTube client can reuse this module untouched.
 *
 * The backend is treated as read-only, published API. No endpoint here is
 * specific to this app; every call is one the SheShield frontend already makes.
 */

const SESSION_KEY = 'vibe.shield.session';
const API_BASE = (import.meta.env.VITE_SHIELD_API_URL ?? '').replace(/\/+$/, '');

export const getSessionId = () => {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
};

const setSessionId = (id) => {
  try { if (id) sessionStorage.setItem(SESSION_KEY, id); } catch { /* private mode */ }
};

export const clearSessionId = () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
};

export class ShieldError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.name = 'ShieldError';
    this.status = status;
    /** Seconds to wait, when the backend rate limiter says so. */
    this.retryAfter = retryAfter;
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
    throw new ShieldError('Cannot reach SheShield AI.', 0);
  }

  const text = await response.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { /* non-JSON error body */ } }

  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after')) || undefined;
    throw new ShieldError(data?.error ?? `SheShield returned ${response.status}.`, response.status, retryAfter);
  }

  if (data?.sessionId) setSessionId(data.sessionId);
  return data;
}

export const shield = {
  /** Capabilities and the shared taxonomy — categories, levels, helplines. */
  meta: () => request('/meta'),

  /** Anonymous session. The social app never sends a user identity. */
  startSession: () => request('/session', { method: 'POST', body: { sessionId: getSessionId() } }),

  session: (id = getSessionId()) => (id ? request(`/session/${id}`) : Promise.resolve(null)),

  /**
   * Screen one piece of content.
   *
   * Sent as a structured single-message conversation rather than raw text, so
   * SheShield's transcript parser never has to guess at a caption that happens
   * to contain a colon.
   */
  analyze: ({ author, text, platform, region = '', signal }) => request('/analyze', {
    method: 'POST',
    signal,
    body: {
      sessionId: getSessionId(),
      sourceLabel: platform,
      region,
      messages: [{ sender: author, text, timestamp: new Date().toISOString() }],
    },
  }),

  /** Screen a whole thread at once — used for DM conversations. */
  analyzeThread: ({ messages, platform, region = '', signal }) => request('/analyze', {
    method: 'POST',
    signal,
    body: {
      sessionId: getSessionId(),
      sourceLabel: platform,
      region,
      messages: messages.map((m) => ({
        sender: m.author,
        text: m.text,
        timestamp: m.createdAt ?? null,
      })),
    },
  }),

  /** Full incident report for a stored analysis. */
  buildReport: ({ analysisId, details = {} }) => request('/report', {
    method: 'POST',
    body: { sessionId: getSessionId(), analysisId, details },
  }),

  reportPdfUrl: (id = getSessionId()) => `${API_BASE}/api/report/${id}/pdf`,

  resources: ({ categories = [], level = 'medium', region = '' } = {}) => request(
    `/resources?categories=${encodeURIComponent(categories.join(','))}`
    + `&level=${encodeURIComponent(level)}&region=${encodeURIComponent(region)}`,
  ),
};
