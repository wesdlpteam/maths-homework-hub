# Maths Homework Hub: run on GitHub + Vercel with our own Anthropic key

Date: 2026-11-16. Status: draft for Nathan's approval.

## Why

The Hub was built as a claude.ai page. Its AI features (Mark with Claude, Redo a question or sheet,
Make a class set, Year rollover "Build library") and its saving (class sets, redone sheets, library)
all borrow `window.claude` from claude.ai. Opened anywhere else they switch off with "Open the Hub in
claude.ai". Nathan wants the Hub in the team GitHub account (`wesdlpteam`) and working there, using a
team Anthropic key held on Vercel, the same way Writing Sidekick and MathWise already work.

Users: Wesley maths teachers (staff only, not students).

## Goals

- The Hub opens from a GitHub Pages address and every feature works there, as in claude.ai.
- AI calls go through a Vercel helper that holds `ANTHROPIC_API_KEY`. The key never reaches the
  page, the repo or chat.
- Saved class sets, redone-sheet versions and the rollover library are shared by all teachers, kept in
  a Vercel (Neon Postgres) database.
- The claude.ai copy keeps working unchanged if someone still opens it there.

## Non-goals

- No changes to the prompts, marking logic, sheet content or look of the Hub.
- No student accounts or per-teacher logins.
- No moving the existing claude.ai data across (there is none on Nathan's account).

## Anti-goals (a failure even if it "works")

- The key ends up in the page, the repo, a log, or chat.
- Anyone on the internet can spend the AI credit or wipe saved class sets.
- The claude.ai path breaks.

## Approaches considered

- **A. Whole Hub on Vercel behind a staff passcode.** Private repo; answer keys hidden. Not picked.
- **B. Like Writing Sidekick: public GitHub Pages site + Vercel helper.** PICKED by Nathan.
  Trade-off he accepted: the repo and site are public, so the answer-key PDFs in `print/` and the
  answers inside `data/*.js` can be read by anyone who finds them.

## Design

**Hosting.** The `wesdlpteam/maths-homework-hub` repo is made public and served by GitHub Pages
(`https://wesdlpteam.github.io/maths-homework-hub/`). A new Vercel project `maths-homework-hub` in
team `dlp-s-projects` deploys the same repo; only its `api/` functions matter (static files may be
ignored via `.vercelignore`, as Sidekick does).

**Gate on every helper call** (copying Sidekick's `api/_cors.js`):
- Origin must be `https://wesdlpteam.github.io` or the Vercel app's own address (+ `ALLOWED_ORIGINS`).
- `APP_PAUSED=1` turns everything off with a friendly message.
- *Our call, beyond Sidekick:* a shared staff passcode (`STAFF_PASSCODE` on Vercel). The origin check
  only stops other websites, not scripts, so the passcode is what actually protects the credit and
  the saved data. The page asks for it the first time an AI or saving feature is used and remembers
  it in that browser. Viewing and downloading sheets needs no passcode.

**Helper endpoints** (Vercel functions, plain Node, no framework):
- `POST /api/sample`: `{ prompt, images?, tier }`, returns the JSON the model produced. Calls the
  Anthropic Messages API with the key. `tier` maps `quick`/`default`/`complex` to Haiku / Sonnet /
  Opus (current model IDs chosen at planning time from the claude-api reference). Long timeout
  (marking with Opus on several scan pages can take over a minute).
- `POST /api/db`: document store matching what the Hub uses today: `get` a document, `list` a
  collection's direct children, `set`, `update` (merge), `delete`. One table:
  `docs(path TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ)`.

**Stand-in for `window.claude`** (`js/claude-shim.js`, loaded before the feature scripts). Only acts
when `window.claude` is missing, so claude.ai behaviour is untouched. It provides what the Hub calls:
- `sample.json(prompt, { images, modelTier, signal })` and `sample.limits()` (images allowed, max 4).
- `db.collection(p).get()` / `.onSnapshot(cb)` (load once, then refresh after our own writes),
  `db.doc(p).set / update / delete`.
- `user.id()`, `user.can()`, `user.canEdit()` (always allowed: every teacher is staff).
- `downloads.save({ filename, data })` as an ordinary browser download.

**Secrets and setup Nathan does himself:** add `ANTHROPIC_API_KEY` and `STAFF_PASSCODE` to the new
Vercel project (dashboard or `vercel env add` in his own terminal). The database is created through
Vercel Storage (Neon), which fills in `DATABASE_URL` automatically.

## Calls made after the builder check (Claude's calls, Nathan can overrule)

- **Shim shape.** Every feature reaches the API through `window.claude.use(name)` (promise). The shim
  defines `window.claude = { use }` returning the objects above for `sample`, `db`, `user`,
  `downloads`; unknown names resolve to `null` so features hide themselves as they do today.
- **Images.** Keep up to 4 images per marking call (`sample.limits()` reports 4). Before sending, the
  shim re-encodes images step by step (quality 0.85 then 0.75, then scale long side down to no less
  than 1600 px) until the whole request is under ~4 MB. 1600 px still reads handwriting well. If it
  still cannot fit, that student fails with a clear "scan too large" message and Retry.
- **Passcode.** Needed for AI calls and for saving/deleting. Reading saved class sets, versions and
  the library needs no passcode (the content is no more sensitive than the public sheets), so the
  Hub loads normally. Stored in that browser's localStorage. Wrong passcode: helper answers 401, the
  page clears it and asks again. Changing it on Vercel just makes everyone re-enter it.
- **Spending.** No counter table. Nathan sets a monthly spend limit on the Anthropic key in the
  Anthropic console as the backstop; `APP_PAUSED` is the off switch.
- **Live updates.** No polling. Teachers see each other's saves on next load; the shim refreshes its
  own snapshots after its own writes (including soft deletes).
- **Function time.** `maxDuration: 300` on `/api/sample` (Vercel Fluid compute on the team's plan).
  A timeout shows the normal per-student "failed, Retry" state.
- **db.** `list` returns direct children only (so `classsets/{id}/questions` works as a nested
  collection). `update` is a shallow top-level merge, which is all the Hub uses.
- **CORS.** Preflight `OPTIONS` allowed for the passcode header, as in Sidekick's `_cors.js`.

## Constraints

- Vercel request bodies max out at 4.5 MB. Scan images (up to 2400 px JPEG) must be shrunk or
  re-compressed in the shim if a call would go over.
- Free GitHub account: Pages only works on a public repo (hence approach B).
- The global `.gitignore` already blocks `.env*`; keep it that way.
- School network may need `ssl-revoke-best-effort` (already in `~/.curlrc`) for CLI calls.

## Left to the builder

- Exact model IDs, max tokens, and how the JSON reply is pulled out of the model's text.
- Whether `db` uses `@neondatabase/serverless` (MathWise/Springboard style) or plain `pg`.
- Passcode prompt wording and look (match the Hub's existing style).
- Tests: unit tests for the gate and db path logic; a real-browser check of marking, redo and
  class sets against the deployed helper before calling it done.
