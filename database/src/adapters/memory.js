/** In-memory adapter — fastest, wiped on restart. */
export function memoryAdapter() {
  const store = new Map();
  return {
    name: 'memory',
    init: async () => {},
    get: async (id) => store.get(id) ?? null,
    save: async (session) => {
      session.updatedAt = new Date().toISOString();
      store.set(session.id, structuredClone(session));
      return session;
    },
    remove: async (id) => store.delete(id),
    all: async () => [...store.values()],
    purgeOlderThan: async (iso) => {
      let count = 0;
      for (const [id, s] of store) {
        if (s.updatedAt < iso) { store.delete(id); count++; }
      }
      return count;
    },
    close: async () => store.clear(),
  };
}
