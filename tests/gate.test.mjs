import { test } from "node:test";
import assert from "node:assert/strict";
import { gate, allowedOrigins } from "../api/_gate.js";

const OK = "https://wesdlpteam.github.io";
const req = (over = {}) => ({ method: "POST", headers: { origin: OK, "content-type": "application/json", ...(over.headers || {}) }, ...over, headers: { origin: OK, "content-type": "application/json", ...(over.headers || {}) } });
function res() {
  const r = { code: 0, body: undefined, headers: {}, ended: false };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; r.ended = true; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}
const ENV = { STAFF_PASSCODE: "maths-2027" };

test("refuses unknown origin", () => {
  const r = res();
  assert.equal(gate(req({ headers: { origin: "https://evil.example" } }), r, ENV, { needPasscode: false }), false);
  assert.equal(r.code, 403);
  assert.equal(r.body.error.code, "forbidden_origin");
});

test("allows default and ALLOWED_ORIGINS origins", () => {
  assert.equal(gate(req(), res(), ENV, { needPasscode: false }), true);
  assert.equal(gate(req({ headers: { origin: "https://maths-homework-hub.vercel.app" } }), res(), ENV, { needPasscode: false }), true);
  const env = { ...ENV, ALLOWED_ORIGINS: "http://localhost:8080, https://x.test" };
  assert.ok(allowedOrigins(env).has("http://localhost:8080"));
  assert.equal(gate(req({ headers: { origin: "https://x.test" } }), res(), env, { needPasscode: false }), true);
});

test("answers preflight", () => {
  const r = res();
  assert.equal(gate(req({ method: "OPTIONS" }), r, ENV, { needPasscode: true }), false);
  assert.equal(r.code, 204);
  assert.match(r.headers["access-control-allow-headers"], /x-hub-passcode/);
  assert.equal(r.headers["access-control-allow-origin"], OK);
});

test("paused blocks everything", () => {
  const r = res();
  assert.equal(gate(req(), r, { ...ENV, APP_PAUSED: "1" }, { needPasscode: false }), false);
  assert.equal(r.code, 503);
  assert.equal(r.body.error.code, "paused");
});

test("non-POST and non-JSON are bad_request", () => {
  const a = res(); gate(req({ method: "GET" }), a, ENV, { needPasscode: false });
  assert.equal(a.code, 400);
  const b = res(); gate(req({ headers: { "content-type": "text/plain" } }), b, ENV, { needPasscode: false });
  assert.equal(b.code, 400);
});

test("passcode required when asked", () => {
  const miss = res();
  assert.equal(gate(req(), miss, ENV, { needPasscode: true }), false);
  assert.equal(miss.code, 401);
  assert.equal(miss.body.error.code, "unauthorised");
  const wrong = res();
  assert.equal(gate(req({ headers: { "x-hub-passcode": "nope" } }), wrong, ENV, { needPasscode: true }), false);
  assert.equal(wrong.code, 401);
  assert.equal(gate(req({ headers: { "x-hub-passcode": "maths-2027" } }), res(), ENV, { needPasscode: true }), true);
  assert.equal(gate(req({ headers: { "x-hub-passcode": "nope" } }), res(), ENV, { needPasscode: false }), true);
});

test("no STAFF_PASSCODE set means open access", () => {
  assert.equal(gate(req(), res(), {}, { needPasscode: true }), true);
});
