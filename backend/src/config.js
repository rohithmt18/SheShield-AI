import 'dotenv/config';

const trim = (v) => (v ?? '').trim();

export const config = {
  port: Number(process.env.PORT) || 5050,
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5273')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

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
