// POST /api/sample: gate, validate, call Anthropic, return parsed JSON. No body logging.
import { gate, fail } from "./_gate.js";
import { MODELS, ApiError, buildRequest, extractJson, callAnthropic } from "./_anthropic.js";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function makeHandler({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  return async function handler(req, res) {
    if (!gate(req, res, env, { needPasscode: true })) return;
    const b = req.body;
    if (!b || typeof b !== "object") return fail(res, 400, "bad_request", "Send a JSON body.");
    const { prompt, images = [], tier = "default" } = b;
    if (typeof prompt !== "string" || !prompt.trim()) return fail(res, 400, "bad_request", "Missing prompt.");
    if (!Object.hasOwn(MODELS, tier)) return fail(res, 400, "bad_request", "Unknown tier.");
    if (!Array.isArray(images) || images.length > 4) return fail(res, 400, "bad_request", "At most 4 images.");
    for (const i of images) {
      if (!i || !TYPES.has(i.media_type) || typeof i.data !== "string" || !i.data) {
        return fail(res, 400, "bad_request", "Bad image.");
      }
    }
    try {
      const text = await callAnthropic(buildRequest({ prompt, images, tier }), env, fetchImpl);
      return res.status(200).json({ result: extractJson(text) });
    } catch (e) {
      if (e instanceof ApiError) return fail(res, e.status, e.code, e.message);
      return fail(res, 502, "upstream_error", "Unexpected helper error.");
    }
  };
}

export default makeHandler();
