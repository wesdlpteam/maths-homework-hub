import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// package is type:module, so load the classic script by hand with a CommonJS-style module object
const src = readFileSync(new URL('../js/claude-shim.js', import.meta.url), 'utf8');
const load = win => { const module = { exports: {} }; new Function('module', 'window', 'location', src)(module, win, undefined); return module.exports; };
const { fitImages, call, makeDb } = load(undefined);

const blobOf = n => new Blob([new Uint8Array(n)]);
const mem = () => { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; }, m }; };
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('throws too_large at floor', async () => {
  const encode = async () => blobOf(1.2 * 1024 * 1024);
  const imgs = [1, 2, 3, 4].map(() => blobOf(10));
  await assert.rejects(fitImages(imgs, { encode }), e => e.code === 'too_large');
});

test('walks the ladder', async () => {
  const seen = [];
  const encode = async (b, o) => {
    seen.push(o);
    const size = o.maxSide === 2000 ? 0.5 : o.quality === 0.85 ? 3 : 1.5;
    return blobOf(size * 1024 * 1024 * 0.74);
  };
  const imgs = [1, 2].map(() => blobOf(10));
  const out = await fitImages(imgs, { encode });
  assert.equal(out.length, 2);
  assert.equal(out[0].media_type, 'image/jpeg');
  assert.ok(typeof out[0].data === 'string');
  const rungs = [...new Set(seen.map(o => `${o.quality}/${o.maxSide || 0}`))];
  assert.deepEqual(rungs, ['0.85/0', '0.75/0']);
});

test('retries once after 401', async () => {
  const storage = mem(); storage.setItem('hub.passcode', 'old');
  const sent = [];
  const fetch = async (u, o) => { sent.push(o.headers['x-hub-passcode']); return sent.length === 1 ? reply(401, { error: { code: 'unauthorised', message: 'no' } }) : reply(200, { result: { ok: 1 } }); };
  let asked = 0;
  const askPasscode = async () => { asked++; assert.equal(storage.getItem('hub.passcode'), null); return 'new'; };
  const r = await call('/api/sample', { prompt: 'x' }, { needPasscode: true }, { fetch, askPasscode, storage });
  assert.deepEqual(r, { result: { ok: 1 } });
  assert.deepEqual(sent, ['old', 'new']);
  assert.equal(asked, 1);

  const f2 = async () => reply(401, { error: { code: 'unauthorised', message: 'no' } });
  await assert.rejects(call('/api/sample', {}, { needPasscode: true }, { fetch: f2, askPasscode: async () => 'z', storage }), e => e.code === 'unauthorised');
});

test('maps abort to cancelled', async () => {
  const fetch = async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; };
  await assert.rejects(call('/api/db', { op: 'get', path: 'a/b' }, {}, { fetch, storage: mem() }), e => e.code === 'cancelled');
});

test('cancel in passcode prompt throws cancelled', async () => {
  const askPasscode = async () => null;
  await assert.rejects(call('/api/sample', {}, { needPasscode: true }, { fetch: async () => reply(401, { error: { code: 'unauthorised' } }), askPasscode, storage: mem() }), e => e.code === 'cancelled');
});

test('open access: no prompt when helper accepts without passcode', async () => {
  let asked = 0;
  const r = await call('/api/sample', {}, { needPasscode: true }, { fetch: async () => reply(200, { result: 1 }), askPasscode: async () => { asked++; return 'x'; }, storage: mem() });
  assert.equal(r.result, 1);
  assert.equal(asked, 0);
});

test('onSnapshot re-fires after own write in that collection', async () => {
  const store = {};
  const fake = async (path, body) => {
    const { op, path: p, data } = body;
    if (op === 'list') return { docs: Object.keys(store).filter(k => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map(k => ({ id: k.split('/').pop(), data: store[k] })) };
    if (op === 'set') { store[p] = data; return { ok: true }; }
    if (op === 'delete') { delete store[p]; return { ok: true }; }
    return { ok: true };
  };
  const db = makeDb(fake);
  const a = [], b = [];
  db.collection('classsets').onSnapshot(s => a.push(s.docs.map(d => d.id)));
  db.collection('other').onSnapshot(s => b.push(s.docs.map(d => d.id)));
  await new Promise(r => setTimeout(r, 10));
  assert.equal(a.length, 1); assert.equal(b.length, 1);
  await db.doc('classsets/X').set({ n: 1 });
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(a.at(-1), ['X']);
  assert.equal(b.length, 1);
  const snap = await db.collection('classsets').get();
  assert.deepEqual(snap.docs[0].data(), { n: 1 });
  // nested write refreshes parent listener too
  await db.doc('classsets/X/questions/Q1').set({ q: 1 });
  await new Promise(r => setTimeout(r, 10));
  assert.ok(a.length >= 3);
});

test('unsubscribe stops refresh', async () => {
  const fake = async () => ({ docs: [], ok: true });
  const db = makeDb(fake);
  let n = 0;
  const un = db.collection('c').onSnapshot(() => n++);
  await new Promise(r => setTimeout(r, 10));
  un();
  await db.doc('c/x').set({});
  await new Promise(r => setTimeout(r, 10));
  assert.equal(n, 1);
});

test('does nothing when window.claude exists', () => {
  const keep = { use: () => 1 };
  const win = { claude: keep };
  load(win);
  assert.equal(win.claude, keep);
});
