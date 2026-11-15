// POST /api/db { op, path, data? }. Reads are open to Hub origins; writes need the staff passcode.
import { neon } from "@neondatabase/serverless";
import { gate, fail } from "./_gate.js";
import { makeStore, isDocPath, isCollectionPath } from "./_store.js";

const WRITES = new Set(["set", "update", "delete"]);
const READS = new Set(["get", "list"]);
const MAX_BYTES = 1024 * 1024;

export function makeHandler({ store, env = process.env } = {}) {
  let st = store, ready = null;
  return async function handler(req, res) {
    const op = req.body && req.body.op;
    // Unknown ops count as writes so they hit the passcode check first.
    if (!gate(req, res, env, { needPasscode: !READS.has(op) })) return;
    const { path, data } = req.body || {};
    if (!WRITES.has(op) && !READS.has(op)) return fail(res, 400, "bad_request", "Unknown op.");
    if (op === "list" ? !isCollectionPath(path) : !isDocPath(path)) return fail(res, 400, "bad_request", "Bad path.");
    if (op === "set" || op === "update") {
      if (!data || typeof data !== "object" || Array.isArray(data)) return fail(res, 400, "bad_request", "data must be an object.");
      if (Buffer.byteLength(JSON.stringify(data)) > MAX_BYTES) return fail(res, 413, "too_large", "That document is too big to save.");
    }
    try {
      if (!st) {
        if (!env.DATABASE_URL) return fail(res, 500, "server_error", "Storage is not set up.");
        st = makeStore(neon(env.DATABASE_URL));
      }
      if (!ready) ready = st.init ? st.init() : Promise.resolve();
      try { await ready; } catch (e) { ready = null; throw e; }
      if (op === "get") return res.status(200).json({ doc: await st.get(path) });
      if (op === "list") return res.status(200).json({ docs: await st.list(path) });
      if (op === "set") await st.set(path, data);
      else if (op === "update") { if (!(await st.update(path, data))) return fail(res, 404, "not_found", "No such document."); }
      else await st.remove(path);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return fail(res, 500, "server_error", "Storage failed. Try again.");
    }
  };
}

export default makeHandler();
