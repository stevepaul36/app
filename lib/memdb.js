'use strict';
// A tiny in-memory stand-in for the few MongoDB calls the server makes. Used only by tests
// (MONGODB_URI=memory://test) so the account and cloud-save flow can be checked without a database.
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
function matches(doc, filter) {
  return Object.entries(filter).every(([k, v]) => (v && typeof v === 'object' && '$exists' in v ? (k in doc) === v.$exists : doc[k] === v));
}
function project(doc, projection) {
  if (!doc || !projection) return clone(doc);
  const out = clone(doc), keys = Object.entries(projection);
  if (keys.some(([, v]) => v === 1)) { const keep = { _id: out._id }; for (const [k, v] of keys) if (v === 1) keep[k] = out[k]; return keep; }
  for (const [k, v] of keys) if (v === 0) delete out[k];
  return out;
}
class Collection {
  constructor() { this.docs = new Map(); this.unique = []; }
  async createIndex(spec, opts = {}) { if (opts.unique) this.unique.push(Object.keys(spec)[0]); }
  dup(doc, except) { for (const k of this.unique) for (const d of this.docs.values()) if (d !== except && d[k] === doc[k]) return true; return false; }
  async insertOne(doc) { if (this.docs.has(doc._id) || this.dup(doc)) throw Object.assign(new Error('duplicate key'), { code: 11000 }); this.docs.set(doc._id, clone(doc)); return { insertedId: doc._id }; }
  async findOne(filter, opts = {}) { for (const d of this.docs.values()) if (matches(d, filter)) return project(d, opts.projection); return null; }
  async findOneAndUpdate(filter, update, opts = {}) {
    for (const d of this.docs.values()) if (matches(d, filter)) {
      Object.assign(d, clone(update.$set || {}));
      for (const [k, v] of Object.entries(update.$inc || {})) d[k] = (d[k] || 0) + v;
      return project(d, opts.projection);
    }
    return null;
  }
  async deleteOne(filter) { for (const [k, d] of this.docs) if (matches(d, filter)) { this.docs.delete(k); return { deletedCount: 1 }; } return { deletedCount: 0 }; }
}
class MemoryClient {
  constructor() { this.cols = new Map(); }
  async connect() { return this; }
  async close() {}
  db() { const self = this; return { collection: n => { if (!self.cols.has(n)) self.cols.set(n, new Collection()); return self.cols.get(n); }, command: async () => ({ ok: 1 }) }; }
}
module.exports = { MemoryClient };
