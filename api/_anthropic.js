// Anthropic Messages API helpers. Key comes from env only; never put it in errors or logs.
export const MODELS = {
  quick: "claude-haiku-5-5",
  default: "claude-sonnet-5-5",
  complex: "claude-opus-5-5",
};

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function buildRequest({ prompt, images = [], tier = "default" }) {
  const model = MODELS[tier];
  if (!model) throw new ApiError(400, "bad_request", "Unknown tier.");
  const content = [
    ...images.map(i => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } })),
    { type: "text", text: prompt },
  ];
  return { model, max_tokens: 16000, messages: [{ role: "user", content }] };
}

// Parse JSON from a model reply: plain, ```json fenced, or wrapped in prose.
export function extractJson(text) {
  const s = String(text ?? "").trim();
  const tries = [s];
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) tries.push(fence[1].trim());
  for (const src of [s, fence && fence[1]]) {
    if (!src) continue;
    for (let i = 0; i < src.length; i++) {
      const open = src[i];
      if (open !== "{" && open !== "[") continue;
      const end = src.lastIndexOf(open === "{" ? "}" : "]");
      if (end > i) tries.push(src.slice(i, end + 1));
    }
  }
  for (const t of tries) {
    try { return JSON.parse(t); } catch { /* next */ }
  }
  throw new ApiError(502, "bad_reply", "The AI reply was not valid JSON.");
}

export async function callAnthropic(body, env, fetchImpl = globalThis.fetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 280_000);
  let r;
  try {
    r = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    throw new ApiError(502, "upstream_error", "Could not reach the AI service.");
  } finally {
    clearTimeout(timer);
  }
  if (r.status === 429 || r.status === 529) throw new ApiError(429, "rate_limited", "The AI service is busy. Try again shortly.");
  if (!r.ok) throw new ApiError(502, "upstream_error", `The AI service returned an error (${r.status}).`);
  let data;
  try { data = await r.json(); } catch { throw new ApiError(502, "bad_reply", "The AI reply was unreadable."); }
  const parts = Array.isArray(data?.content) ? data.content : [];
  return parts.filter(p => p && p.type === "text").map(p => p.text).join("");
}
