import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELS, buildRequest, extractJson, callAnthropic } from "../api/_anthropic.js";
import { makeHandler } from "../api/sample.js";

const OK = "https://wesdlpteam.github.io";
const KEY = "sk-ant-SECRET-KEY-123";
const ENV = { STAFF_PASSCODE: "pw", ANTHROPIC_API_KEY: KEY };
const req = body => ({ method: "POST", headers: { origin: OK, "content-type": "application/json", "x-hub-passcode": "pw" }, body });
function res() {
  const r = { code: 0, body: undefined, headers: {}, ended: false };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; r.ended = true; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}
const upstream = (status, json) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => json, text: async () => JSON.stringify(json) });
const good = upstream(200, { content: [{ type: "text", text: '{"a":1}' }] });
const img = { media_type: "image/jpeg", data: "AAAA" };

test("maps tiers to models and unknown tier is bad_request", async () => {
  assert.equal(MODELS.quick, "claude-haiku-5-5");
  assert.equal(MODELS.default, "claude-sonnet-5-5");
  assert.equal(MODELS.complex, "claude-opus-5-5");
  let seen;
  const h = makeHandler({ env: ENV, fetchImpl: async (u, o) => { seen = JSON.parse(o.body); return good(); } });
  const r = res();
  await h(req({ prompt: "hi", tier: "complex" }), r);
  assert.equal(seen.model, "claude-opus-5-5");
  assert.equal(r.code, 200);
  assert.deepEqual(r.body, { result: { a: 1 } });
  const bad = res();
  await h(req({ prompt: "hi", tier: "huge" }), bad);
  assert.equal(bad.code, 400);
  assert.equal(bad.body.error.code, "bad_request");
});

test("buildRequest puts images before text", () => {
  const b = buildRequest({ prompt: "P", images: [img, img], tier: "quick" });
  assert.equal(b.model, "claude-haiku-5-5");
  assert.equal(b.max_tokens, 16000);
  const c = b.messages[0].content;
  assert.equal(b.messages[0].role, "user");
  assert.deepEqual(c[0], { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } });
  assert.equal(c[1].type, "image");
  assert.deepEqual(c[2], { type: "text", text: "P" });
});

test("extracts fenced and prose-wrapped JSON", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here: {"a":[1,2]} done'), { a: [1, 2] });
  assert.deepEqual(extractJson("[1]"), [1]);
  assert.throws(() => extractJson("no json"), e => e.code === "bad_reply");
});

test("maps upstream 429 and 529 to rate_limited, others to upstream_error", async () => {
  for (const s of [429, 529]) {
    const r = res();
    await makeHandler({ env: ENV, fetchImpl: upstream(s, { error: {} }) })(req({ prompt: "x", tier: "default" }), r);
    assert.equal(r.code, 429);
    assert.equal(r.body.error.code, "rate_limited");
  }
  const r = res();
  await makeHandler({ env: ENV, fetchImpl: upstream(500, { error: {} }) })(req({ prompt: "x", tier: "default" }), r);
  assert.equal(r.code, 502);
  assert.equal(r.body.error.code, "upstream_error");
  const bad = res();
  await makeHandler({ env: ENV, fetchImpl: upstream(200, { content: [{ type: "text", text: "nope" }] }) })(req({ prompt: "x", tier: "default" }), bad);
  assert.equal(bad.code, 502);
  assert.equal(bad.body.error.code, "bad_reply");
});

test("sends key in x-api-key and never echoes it", async () => {
  let hdr, url;
  const h = makeHandler({ env: ENV, fetchImpl: async (u, o) => { url = u; hdr = o.headers; return good(); } });
  const ok = res();
  await h(req({ prompt: "x", tier: "default" }), ok);
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(hdr["x-api-key"], KEY);
  assert.equal(hdr["anthropic-version"], "2023-06-01");
  assert.ok(!JSON.stringify(ok.body).includes(KEY));
  // upstream error text that contains the key must not leak
  const leak = res();
  await makeHandler({ env: ENV, fetchImpl: upstream(401, { error: { message: `bad key ${KEY}` } }) })(req({ prompt: "x", tier: "default" }), leak);
  assert.ok(!JSON.stringify(leak.body).includes(KEY));
  // fetch throwing with key in message
  const thr = res();
  await makeHandler({ env: ENV, fetchImpl: async () => { throw new Error(`boom ${KEY}`); } })(req({ prompt: "x", tier: "default" }), thr);
  assert.equal(thr.code, 502);
  assert.ok(!JSON.stringify(thr.body).includes(KEY));
});

test("rejects more than 4 images and bad input", async () => {
  const h = makeHandler({ env: ENV, fetchImpl: good });
  const r = res();
  await h(req({ prompt: "x", tier: "default", images: [img, img, img, img, img] }), r);
  assert.equal(r.code, 400);
  assert.equal(r.body.error.code, "bad_request");
  const t = res();
  await h(req({ prompt: "x", tier: "default", images: [{ media_type: "image/gif", data: "A" }] }), t);
  assert.equal(t.code, 400);
  const p = res();
  await h(req({ tier: "default" }), p);
  assert.equal(p.code, 400);
});

test("gate runs first: missing passcode is 401, no upstream call", async () => {
  let called = false;
  const h = makeHandler({ env: ENV, fetchImpl: async () => { called = true; return good(); } });
  const r = res();
  const q = req({ prompt: "x", tier: "default" });
  delete q.headers["x-hub-passcode"];
  await h(q, r);
  assert.equal(r.code, 401);
  assert.equal(called, false);
});

test("callAnthropic joins text parts", async () => {
  const f = upstream(200, { content: [{ type: "text", text: "a" }, { type: "tool_use" }, { type: "text", text: "b" }] });
  assert.equal(await callAnthropic({}, ENV, f), "ab");
});
