import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHandler } from "../api/db.js";
import { makeStore, validPath, isDocPath, isCollectionPath } from "../api/_store.js";

const OK = "https://wesdlpteam.github.io";
const ENV = { STAFF_PASSCODE: "maths-2027" };
const PASS = { "x-hub-passcode": "maths-2027" };
const req = (body, headers = {}) => ({ method: "POST", headers: { origin: OK, "content-type": "application/json", ...headers }, body });
function res() {
  const r = { code: 0, body: undefined, headers: {} };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.end = () => r;
  return r;
}

// Fake Neon sql: Map-backed, dispatches on query text so the real makeStore is exercised.
function fakeSql() {
  const m = new Map();
  return async (strings, ...v) => {
    const q = strings.join("?");
    if (q.startsWith("CREATE")) return [];
    if (q.startsWith("SELECT") && q.includes("path = ?")) return m.has(v[0]) ? [{ path: v[0], data: m.get(v[0]) }] : [];
    if (q.startsWith("SELECT")) {
      const p = v[0];
      return [...m].filter(([k]) => k.startsWith(p) && !k.slice(p.length).includes("/")).map(([path, data]) => ({ path, data }));
    }
    if (q.startsWith("INSERT")) { m.set(v[0], JSON.parse(v[1])); return []; }
    if (q.startsWith("UPDATE")) {
      if (!m.has(v[1])) return [];
      m.set(v[1], { ...m.get(v[1]), ...JSON.parse(v[0]) });
      return [{ path: v[1] }];
    }
    if (q.startsWith("DELETE")) { m.delete(v[0]); return []; }
    throw new Error("unexpected query " + q);
  };
}
const mk = () => makeHandler({ store: makeStore(fakeSql()), env: ENV });
const call = async (h, body, headers = PASS) => { const r = res(); await h(req(body, headers), r); return r; };

test("validates paths", async () => {
  for (const p of ["", "a//b", "../x", "a/b/c/d/e/f/g", "a/./b", "a b"]) assert.equal(validPath(p), false, p);
  assert.ok(isDocPath("classsets/Y8-T1-W1-A") && isCollectionPath("classsets"));
  assert.ok(isDocPath("classsets/Y8-T1-W1-A/questions/g1-Q1"));
  const h = mk();
  assert.equal((await call(h, { op: "get", path: "classsets" })).body.error.code, "bad_request");
  assert.equal((await call(h, { op: "list", path: "classsets/A" })).body.error.code, "bad_request");
  assert.equal((await call(h, { op: "nope", path: "a/b" })).code, 400);
});

test("set then get round-trips; get missing is null", async () => {
  const h = mk();
  assert.deepEqual((await call(h, { op: "set", path: "versions/Y8-T1-W1", data: { n: 1 } })).body, { ok: true });
  assert.deepEqual((await call(h, { op: "get", path: "versions/Y8-T1-W1" })).body, { doc: { id: "Y8-T1-W1", data: { n: 1 } } });
  assert.deepEqual((await call(h, { op: "get", path: "versions/none" })).body, { doc: null });
});

test("list returns direct children only", async () => {
  const h = mk();
  await call(h, { op: "set", path: "classsets/A", data: { l: 1 } });
  await call(h, { op: "set", path: "classsets/A/questions/Q1", data: { v: [] } });
  await call(h, { op: "set", path: "classsets/A_B", data: { l: 2 } });
  assert.deepEqual((await call(h, { op: "list", path: "classsets" })).body.docs.map(d => d.id).sort(), ["A", "A_B"]);
  assert.deepEqual((await call(h, { op: "list", path: "classsets/A/questions" })).body.docs.map(d => d.id), ["Q1"]);
});

test("update merges shallowly", async () => {
  const h = mk();
  await call(h, { op: "set", path: "classsets/A", data: { a: 1, b: { x: 1 } } });
  assert.deepEqual((await call(h, { op: "update", path: "classsets/A", data: { b: { y: 2 }, c: 3 } })).body, { ok: true });
  assert.deepEqual((await call(h, { op: "get", path: "classsets/A" })).body.doc.data, { a: 1, b: { y: 2 }, c: 3 });
});

test("update missing is not_found", async () => {
  const r = await call(mk(), { op: "update", path: "classsets/zzz", data: { a: 1 } });
  assert.equal(r.code, 404);
  assert.equal(r.body.error.code, "not_found");
});

test("delete removes", async () => {
  const h = mk();
  await call(h, { op: "set", path: "library/X", data: { a: 1 } });
  assert.deepEqual((await call(h, { op: "delete", path: "library/X" })).body, { ok: true });
  assert.equal((await call(h, { op: "get", path: "library/X" })).body.doc, null);
});

test("writes need passcode, reads do not", async () => {
  const h = mk();
  for (const op of ["set", "update", "delete"]) {
    const r = await call(h, { op, path: "a/b", data: {} }, {});
    assert.equal(r.code, 401, op);
  }
  assert.equal((await call(h, { op: "get", path: "a/b" }, {})).code, 200);
  assert.equal((await call(h, { op: "list", path: "a" }, {})).code, 200);
});

test("oversize doc is too_large", async () => {
  const r = await call(mk(), { op: "set", path: "a/b", data: { s: "x".repeat(1024 * 1024 + 1) } });
  assert.equal(r.code, 413);
  assert.equal(r.body.error.code, "too_large");
});

test("store failure gives generic server_error", async () => {
  const h = makeHandler({ store: { async get() { throw new Error("secret dsn"); } }, env: ENV });
  const r = await call(h, { op: "get", path: "a/b" }, {});
  assert.equal(r.code, 500);
  assert.ok(!JSON.stringify(r.body).includes("secret"));
});
