import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/** JSON-file adapter — persists sessions to a single JSON file on disk. */
export function jsonFileAdapter(filePath) {
  let data = {};

  function flush() {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  return {
    name: `json-file (${filePath})`,
    init: async () => {
      const dir = dirname(filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (existsSync(filePath)) {
        try { data = JSON.parse(readFileSync(filePath, 'utf-8')); }
        catch { data = {}; }
      } else {
        flush();
      }
    },
    get: async (id) => data[id] ?? null,
    save: async (session) => {
      session.updatedAt = new Date().toISOString();
      data[session.id] = structuredClone(session);
      flush();
      return session;
    },
    remove: async (id) => { delete data[id]; flush(); },
    all: async () => Object.values(data),
    purgeOlderThan: async (iso) => {
      let count = 0;
      for (const [id, s] of Object.entries(data)) {
        if (s.updatedAt < iso) { delete data[id]; count++; }
      }
      if (count) flush();
      return count;
    },
    close: async () => {},
  };
}
