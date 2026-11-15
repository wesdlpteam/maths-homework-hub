// Gate for every helper call. Order: CORS headers, preflight, method + JSON check, origin,
// pause switch, staff passcode. Origin stops other websites; passcode stops scripts.
// Returns true = carry on. False = response already sent.
import { timingSafeEqual, createHash } from "node:crypto";

const DEFAULT_ORIGINS = ["https://wesdlpteam.github.io", "https://maths-homework-hub.vercel.app"];

export function allowedOrigins(env = {}) {
  const extra = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

export function isPaused(env = {}) {
  return ["1", "true", "yes"].includes(String(env.APP_PAUSED || "").toLowerCase());
}

export function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
  return false;
}

// Hash both sides first so lengths always match for timingSafeEqual.
function samePasscode(given, expected) {
  if (!expected || !given) return false;
  const h = s => createHash("sha256").update(String(s)).digest();
  return timingSafeEqual(h(given), h(expected));
}

export function gate(req, res, env = process.env, { needPasscode = true } = {}) {
  const origin = req.headers?.origin;
  const allowed = !!origin && allowedOrigins(env).has(origin);
  res.setHeader("Cache-Control", "no-store");
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-hub-passcode");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") { res.status(allowed ? 204 : 403).end(); return false; }
  if (!allowed) return fail(res, 403, "forbidden_origin", "The Maths Homework Hub helper only answers the Hub's own pages.");
  if (req.method !== "POST") return fail(res, 400, "bad_request", "Use POST.");
  const type = String(req.headers?.["content-type"] || "").toLowerCase();
  if (!type.includes("application/json")) return fail(res, 400, "bad_request", "Send JSON.");
  if (isPaused(env)) return fail(res, 503, "paused", "The Hub's AI and saving are paused right now. Sheets still work.");
  if (needPasscode && !samePasscode(req.headers?.["x-hub-passcode"], env.STAFF_PASSCODE)) {
    return fail(res, 401, "unauthorised", "Staff passcode missing or wrong.");
  }
  return true;
}
