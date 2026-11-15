# Own-Key Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hub runs from GitHub Pages with every AI and saving feature working through a Vercel helper that holds `ANTHROPIC_API_KEY`.

**Architecture:** A browser stand-in for `window.claude` (`js/claude-shim.js`) forwards `sample` and `db` calls to two Vercel functions (`/api/sample`, `/api/db`). Both pass a shared gate (origin, pause switch, staff passcode). `db` is a path-keyed JSON document table in Neon Postgres.

**Tech Stack:** Plain browser JS (no build), Vercel Node functions (ESM, Node 24), `@neondatabase/serverless`, Anthropic Messages API over `fetch`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-16-own-key-hosting-design.md`

## Global Constraints

- Key only in Vercel env `ANTHROPIC_API_KEY`. Never in page, repo, logs, or chat.
- Env vars: `ANTHROPIC_API_KEY`, `STAFF_PASSCODE`, `DATABASE_URL`, optional `ALLOWED_ORIGINS` (comma list), `APP_PAUSED` (`1` = off).
- Default origins: `https://wesdlpteam.github.io`, `https://maths-homework-hub.vercel.app`.
- Passcode header: `x-hub-passcode`. Needed for `/api/sample` and db writes. Db reads (`get`, `list`) need none.
- Tier to model: `quick` → `claude-haiku-5-5`, `default` → `claude-sonnet-5-5`, `complex` → `claude-opus-5-5`. API `anthropic-version: 2023-06-01`.
- Request body under 4 MB after base64 (Vercel cap 4.5 MB). Image re-encode ladder: q0.85, q0.75, then long side 2000, 1600 px at q0.75. Floor 1600 px.
- `sample.limits()` → `{ images: { maxCount: 4 } }`.
- Shim acts only when `window.claude` is absent. claude.ai path untouched.
- Error codes the Hub already understands: `cancelled` (abort), `rate_limited` (HTTP 429/529), plus new `unauthorised` (401), `paused` (503), `too_large`.
- `/api/sample` `maxDuration: 300`.
- No changes to prompts, marking logic, sheets, or look beyond the passcode prompt.

## Review Focus

1. Wrong or missing passcode mid-run: helper 401 → shim clears stored passcode, asks once, retries the call once; second 401 throws `unauthorised`. (Task 4 test `retries once after 401`.)
2. Model reply wraps JSON in prose or ```json fences: still parsed. (Task 2 test `extracts fenced and prose-wrapped JSON`.)
3. Four large phone scans over 4 MB: shrunk down the ladder; if still over at 1600 px, throws `too_large`, no request sent. (Task 4 test `throws too_large at floor`.)
4. Teacher presses Stop: `AbortSignal` reaches `fetch`, shim throws `{code:'cancelled'}`. (Task 4 test `maps abort to cancelled`.)
5. Db `list('classsets')` must not return nested `classsets/X/questions/Y` docs. (Task 3 test `list returns direct children only`.)

---

### Task 1: Gate (origin, pause, passcode) and project scaffolding

**Files:**
- Create: `package.json` (`"type":"module"`, `"private":true`, dep `@neondatabase/serverless`, script `"test":"node --test tests/"`)
- Create: `vercel.json` (`functions["api/sample.js"].maxDuration = 300`)
- Create: `.vercelignore` (`.env*`, `docs`, `tests`, `print`, `data`, `vendor`, `assets`, `css`, `js`, `index.html`)
- Create: `api/_gate.js`
- Test: `tests/gate.test.mjs`

**Interfaces:**
- Produces: `allowedOrigins(env) -> Set<string>`; `gate(req, res, env, { needPasscode: boolean }) -> boolean` (true = carry on; false = response already sent). Sets CORS headers `Access-Control-Allow-Origin: <origin>`, `Allow-Methods: POST, OPTIONS`, `Allow-Headers: content-type, x-hub-passcode`, `Vary: Origin`. Answers `OPTIONS` with 204.
- Response JSON on refusal: `{ error: { code, message } }`. Codes: `forbidden_origin` 403, `paused` 503, `unauthorised` 401, `bad_request` 400 (non-POST or non-JSON).

- [ ] **Step 1: Write failing tests** in `tests/gate.test.mjs` with a fake `req {method, headers}` and `res` recorder:
  - `refuses unknown origin` → 403 `forbidden_origin`.
  - `allows default and ALLOWED_ORIGINS origins` → true.
  - `answers preflight` → OPTIONS from allowed origin gives 204, returns false, `Allow-Headers` includes `x-hub-passcode`.
  - `paused blocks everything` → `APP_PAUSED=1` gives 503 `paused`.
  - `passcode required when asked` → missing or wrong gives 401; correct gives true; `needPasscode:false` ignores it.
  - `no STAFF_PASSCODE set refuses passcode routes` → 401 (fail closed).
  - Passcode compare uses `crypto.timingSafeEqual` on equal-length buffers.
- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3:** Implement `api/_gate.js`; write the scaffold files above. `npm install`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: helper gate and vercel scaffolding`.

### Task 2: `/api/sample` (Anthropic call)

**Files:**
- Create: `api/_anthropic.js`, `api/sample.js`
- Test: `tests/sample.test.mjs`

**Interfaces:**
- Consumes: `gate` (Task 1), `needPasscode: true`.
- Produces: `POST /api/sample` body `{ prompt: string, images?: [{ media_type: 'image/jpeg'|'image/png'|'image/webp', data: base64 }], tier: 'quick'|'default'|'complex' }` → 200 `{ result: <parsed JSON> }` or error JSON as Task 1 with codes `rate_limited` (429), `bad_reply` (502), `upstream_error` (502), `bad_request` (400).
- Internal: `MODELS` map (Global Constraints); `buildRequest({prompt, images, tier}) -> body` (images first, then text; `max_tokens` 16000); `extractJson(text) -> any` (throws `bad_reply`); `callAnthropic(body, env, fetchImpl) -> text`.

- [ ] **Step 1: Failing tests:**
  - `maps tiers to models` and unknown tier → `bad_request`.
  - `buildRequest puts images before text` with `{type:'image', source:{type:'base64', media_type, data}}`.
  - `extracts fenced and prose-wrapped JSON`: `'```json\n{"a":1}\n```'`, `'Here: {"a":[1,2]} done'`, plain `'[1]'` all parse; `'no json'` throws `bad_reply`.
  - `maps upstream 429 and 529 to rate_limited`, other non-2xx to `upstream_error` (injected fetch).
  - `sends key in x-api-key and never echoes it` in any response body.
  - `rejects more than 4 images` → `bad_request`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Text = all `content[].text` joined. Upstream fetch timeout 280 s.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: sample endpoint calls Anthropic with server key`.

### Task 3: `/api/db` (document store)

**Files:**
- Create: `db/docs.sql`, `api/_store.js`, `api/db.js`
- Test: `tests/db.test.mjs`

**Interfaces:**
- Table: `CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`
- Produces: `POST /api/db` body `{ op: 'get'|'list'|'set'|'update'|'delete', path: string, data?: object }`.
  - `get` → `{ doc: { id, data } | null }`; `list` → `{ docs: [{ id, data }] }` (id = last path segment); `set`/`update`/`delete` → `{ ok: true }`.
  - `update` on a missing doc → 404 `not_found`.
- Internal: `validPath(p)` (segments `[A-Za-z0-9_.:-]{1,120}`, 1 to 6 segments, no empties); `isDocPath` = even segment count, `isCollectionPath` = odd; `makeStore(sql)` with `get/list/set/update/remove`. `list(c)` matches `path LIKE c || '/%'` AND no further `/` after the prefix. Shallow merge `data || $new` for `update`. Body cap 1 MB per doc → 413 `too_large`.
- Gate: `needPasscode` true for `set`, `update`, `delete`; false for `get`, `list`.

- [ ] **Step 1: Failing tests** using an in-memory fake `sql` (or test `makeStore` against a Map-backed adapter with the same query helpers):
  - `validates paths` (rejects `''`, `'a//b'`, `'../x'`, 7 segments; get on odd path and list on even path → `bad_request`).
  - `list returns direct children only`: docs `classsets/A`, `classsets/A/questions/Q1` → `list('classsets')` gives only `A`; `list('classsets/A/questions')` gives `Q1`.
  - `update merges shallowly` and `update missing → not_found`.
  - `writes need passcode, reads do not` (handler + gate).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `neon(env.DATABASE_URL)` tagged queries; handler creates the table on first call (`CREATE TABLE IF NOT EXISTS`, memoised).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: db endpoint document store on Neon`.

### Task 4: Browser stand-in `js/claude-shim.js` + passcode prompt

**Files:**
- Create: `js/claude-shim.js`
- Modify: `index.html` (add `<script src="js/claude-shim.js"></script>` right after `js/core.js`, before data and feature scripts); `css/hub.css` (passcode dialog styles only)
- Test: `tests/shim.test.mjs`

**Interfaces:**
- Consumes: endpoints from Tasks 2 and 3.
- Produces (only if `!window.claude`): `window.claude = { use(name) -> Promise<obj|null> }`.
  - `sample`: `json(prompt, { images?: Blob[], modelTier?, signal? }) -> Promise<any>`; `limits() -> { images: { maxCount: 4 } }`.
  - `db`: `collection(p).get() -> {docs:[{id, data()}]}`, `collection(p).onSnapshot(cb) -> unsubscribe` (fetch once, re-run after this shim's own writes under that collection); `doc(p).set(data) / update(data) / delete()`.
  - `user`: `id() -> 'staff'`, `can() -> true`, `canEdit() -> true`.
  - `downloads`: `save({ filename, data: Blob|string })` → anchor download with object URL.
  - Anything else → `null`.
- Helper base: `HELPER = location.hostname.endsWith('vercel.app') ? '' : 'https://maths-homework-hub.vercel.app'`.
- Passcode: localStorage key `hub.passcode` (try/catch). Prompt is a small `<dialog>` in the Hub's style: heading "Staff passcode", one password input, "Continue" and "Cancel". Cancel throws `{code:'cancelled'}`.
- Exported for tests through `if (typeof module === 'object') module.exports = { fitImages, call, makeDb }` (same pattern as `data/*.js`), with injectable `fetch`, `encode(blob, {quality, maxSide}) -> Blob`, `askPasscode`, `storage`.
- Errors thrown as `{ code, message }` using the server's code; network `AbortError` → `cancelled`.

- [ ] **Step 1: Failing tests:**
  - `throws too_large at floor`: fake encoder never shrinks below 1.2 MB each × 4 → throws `too_large`, fetch never called.
  - `walks the ladder`: encoder sizes shrink per rung; stops at first rung under 4 MB total base64.
  - `retries once after 401`: first fetch 401, `askPasscode` returns new code, second fetch 200 → result; two 401s → throws `unauthorised`; stored passcode cleared after first 401.
  - `maps abort to cancelled`.
  - `onSnapshot re-fires after own write in that collection` and not for other collections.
  - `does nothing when window.claude exists`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Invoke `impeccable:impeccable` before styling the dialog; match existing Hub tokens in `css/hub.css`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: window.claude stand-in for hosting outside claude.ai`.

### Task 5: Deploy, setup, live verification

**Files:** none new (README line optional).

- [ ] **Step 1:** `vercel link` new project `maths-homework-hub` in scope `dlp-s-projects`; connect Git repo `wesdlpteam/maths-homework-hub`.
- [ ] **Step 2:** Create Neon database via Vercel Storage on that project (Nathan clicks if CLI cannot); confirm `DATABASE_URL` in `vercel env ls`.
- [ ] **Step 3:** Nathan adds `ANTHROPIC_API_KEY` and `STAFF_PASSCODE` himself (dashboard or `vercel env add` in his terminal). Confirm names only via `vercel env ls`.
- [ ] **Step 4:** Ask Nathan to confirm, then `gh repo edit wesdlpteam/maths-homework-hub --visibility public --accept-visibility-change-consequences` and enable Pages from `main` root.
- [ ] **Step 5:** `vercel --prod`. Check: `curl -X OPTIONS` from allowed origin → 204; POST without passcode → 401; POST from `Origin: https://evil.example` → 403.
- [ ] **Step 6:** Real browser at `https://wesdlpteam.github.io/maths-homework-hub/`: passcode prompt appears on first AI use; Redo one question; make and save a 2-student class set, reload, set still listed; delete it; mark one test scan (blank sheet photo is fine); download CSV. Screenshots of each.
- [ ] **Step 7:** `APP_PAUSED=1` → AI button shows paused message; unset.
- [ ] **Step 8:** Commit any fixes; push.
