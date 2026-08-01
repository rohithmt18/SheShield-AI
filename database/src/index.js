import { memoryAdapter } from './adapters/memory.js';
import { jsonFileAdapter } from './adapters/jsonFile.js';
import { mongoAdapter } from './adapters/mongo.js';
import { createSession, newSessionId } from './schema.js';

export * from './schema.js';
export * from './taxonomy.js';

/**
 * Picks a storage backend from the environment:
 *   MONGODB_URI set  → MongoDB Atlas (free M0)
 *   DATA_FILE  set   → JSON file on disk
 *   neither          → in memory, wiped on restart
 */
export async function connect({
  mongoUri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB || 'sheshieldai',
  dataFile = process.env.DATA_FILE,
  retentionDays = Number(process.env.RETENTION_DAYS) || 7,
} = {}) {
  let adapter;

  if (mongoUri) {
    adapter = mongoAdapter(mongoUri, { dbName, retentionDays });
    try {
      await adapter.init();
    } catch (err) {
      console.error(`[database] MongoDB unavailable (${err.message}) — falling back.`);
      adapter = null;
    }
  }

  if (!adapter) {
    adapter = dataFile ? jsonFileAdapter(dataFile) : memoryAdapter();
    await adapter.init();
  }

  const cutoff = () => new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  const purged = await adapter.purgeOlderThan(cutoff());
  if (purged) console.log(`[database] purged ${purged} expired session(s)`);

  return {
    backend: adapter.name,
    retentionDays,

    async resolve(id) {
      if (id) {
        const found = await adapter.get(id);
        if (found) return found;
      }
      return adapter.save(createSession(id || newSessionId()));
    },

    get: (id) => adapter.get(id),
    save: (session) => adapter.save(session),
    remove: (id) => adapter.remove(id),

    async stats() {
      const all = await adapter.all();
      const analyses = all.flatMap((s) => s.analyses ?? []);
      const byCategory = {};
      for (const a of analyses) {
        for (const c of a.categories ?? []) byCategory[c] = (byCategory[c] ?? 0) + 1;
      }
      return { sessions: all.length, analyses: analyses.length, reports: all.filter((s) => s.report).length, byCategory };
    },

    close: () => adapter.close(),
  };
}
