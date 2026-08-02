import 'dotenv/config';

const trim = (v) => (v ?? '').trim();
const list = (v) => trim(v).split(',').map((s) => s.trim()).filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * The origins this repo's own dev servers run on, both spellings, because
 * localhost and 127.0.0.1 are distinct origins to a browser.
 *
 * Kept in one place so adding a client (a future X or YouTube front end) is a
 * line here rather than a mystery 403 to debug. Ports are pinned in the Vite
 * configs and preflighted by scripts/check-ports.mjs, so these stay accurate.
 */
const DEV_ORIGINS = [5273, 5274].flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

const envOrigins = list(process.env.CORS_ORIGIN);

/**
 * In development CORS_ORIGIN *adds* to the local dev servers, so setting it for
 * a one-off never knocks the everyday ones out of the allowlist.
 *
 * In production it replaces them: a deployed API has no business trusting
 * localhost, and quietly carrying dev origins into production is how an
 * allowlist stops meaning anything. With nothing set, the dev origins remain as
 * the fallback purely so the startup warning has something concrete to report.
 */
const corsOrigins = isProduction && envOrigins.length
  ? envOrigins
  : [...new Set([...DEV_ORIGINS, ...envOrigins])];

export const config = {
  port: Number(process.env.PORT) || 5050,
  isProduction,
  corsOrigins,

  gemini: {
    apiKey: trim(process.env.GEMINI_API_KEY) || trim(process.env.GOOGLE_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  },

  groq: {
    apiKey: trim(process.env.GROQ_API_KEY),
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },

  /**
   * Which backend answers. AI_PROVIDER forces a choice; otherwise whichever
   * key is present wins, Groq first. Empty means the offline engine — which is
   * a supported mode, not a failure.
   */
  get aiProvider() {
    const forced = trim(process.env.AI_PROVIDER).toLowerCase();
    if (forced) return forced;
    if (this.groq.apiKey) return 'groq';
    if (this.gemini.apiKey) return 'gemini';
    return '';
  },

  storage: {
    mongoUri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB || 'sheshieldai',
    dataFile: process.env.DATA_FILE === undefined ? './.data/sessions.json' : process.env.DATA_FILE,
    retentionDays: Number(process.env.RETENTION_DAYS) || 7,
  },

  limits: {
    maxChars: 40_000,
    maxMessages: 150,
    maxChatTurns: 40,
  },
};
