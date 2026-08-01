import { MongoClient } from 'mongodb';

/** MongoDB Atlas adapter — production-grade persistence with TTL. */
export function mongoAdapter(uri, { dbName = 'sheshieldai', retentionDays = 7 } = {}) {
  let client, col;

  return {
    name: `mongodb (${dbName})`,
    init: async () => {
      client = new MongoClient(uri);
      await client.connect();
      const db = client.db(dbName);
      col = db.collection('sessions');
      await col.createIndex({ updatedAt: 1 }, { expireAfterSeconds: retentionDays * 86400 });
      await col.createIndex({ id: 1 }, { unique: true });
    },
    get: async (id) => {
      const doc = await col.findOne({ id });
      if (doc) delete doc._id;
      return doc;
    },
    save: async (session) => {
      session.updatedAt = new Date().toISOString();
      await col.updateOne({ id: session.id }, { $set: session }, { upsert: true });
      return session;
    },
    remove: async (id) => col.deleteOne({ id }),
    all: async () => {
      const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
      return docs;
    },
    purgeOlderThan: async (iso) => {
      const result = await col.deleteMany({ updatedAt: { $lt: iso } });
      return result.deletedCount;
    },
    close: async () => { if (client) await client.close(); },
  };
}
