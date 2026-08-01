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
