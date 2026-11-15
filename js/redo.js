/* Redo: Claude writes a replacement question (or a whole sheet), the page checks it, an independent
   Claude call checks the answer key, and staff save it as a shared version in the artifact database.
   Depends on HubCore, SheetRender, KaTeX and window.Hub (app.js). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.HubCore;
  const use = name => (window.claude && window.claude.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
  const clone = o => JSON.parse(JSON.stringify(o));
  const HIDE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

  let busy = false;
  let shownSheet = null;
  let pending = null;        // { sheet, baseId, newIds, issues }
  let canWrite = null;       // null = unknown, false = read-only

  // ---------- Safety for sheets that come from the shared database ----------
  function sanitizeSheet(raw) {
    const s = C.sanitizeHtml;
    const plain = v => String(v == null ? '' : v).replace(/[<>]/g, '');
    const sheet = {
      id: plain(raw.id), base: plain(raw.base), version: Number(raw.version) || 2, course: plain(raw.course), year: plain(raw.year),
      stream: plain(raw.stream), term: Number(raw.term) || 1, weeks: plain(raw.weeks), title: plain(raw.title),
      sections_covered: plain(raw.sections_covered), ac9: (raw.ac9 || []).map(plain), createdAt: Number(raw.createdAt) || 0,
      questions: (raw.questions || []).slice(0, 5).map((q, i) => {
        const out = {
          id: 'Q' + (i + 1), num: i + 1, section: ['recall', 'fluency', 'reasoning', 'problem'].includes(q.section) ? q.section : 'fluency',
          level: [1, 2, 3].includes(q.level) ? q.level : 2, ac9: (q.ac9 || []).map(plain), prompt: s(q.prompt),
          key: { answer: s(q.key && q.key.answer), accept: ((q.key && q.key.accept) || []).map(s), working: s(q.key && q.key.working),
            look_for: ((q.key && q.key.look_for) || []).map(s), common_errors: ((q.key && q.key.common_errors) || []).map(s), verify: [] },
        };
        if (Array.isArray(q.parts)) out.parts = q.parts.slice(0, 4).map((p, j) => ({ label: 'abcd'[j], prompt: s(p.prompt) }));
        if (q.svg === 'GRID') out.svg = 'GRID';
        if (out.section === 'recall') out.recall_from = plain(q.recall_from);
        return out;
      }),
    };
    return C.prepareSheet(sheet);
  }

  // ---------- Shared versions ----------
  async function subscribeVersions() {
    const db = await use('db');
    if (!db) return;
    try {
      db.collection('versions').onSnapshot(snap => {
        const list = snap.docs.map(d => { try { const v = d.data(); return sanitizeSheet(Object.assign({}, v.sheet, { id: v.code, base: v.base, version: v.version, createdAt: v.createdAt })); } catch (e) { return null; } }).filter(Boolean);
        window.Hub.setVersions(list);
      }, () => { /* read failed: keep showing the built-in library */ });
    } catch (e) { /* db unavailable */ }
    const user = await use('user');
    if (user && user.can) { try { canWrite = await user.can('data.write'); } catch (e) { canWrite = null; } }
  }

  // ---------- Checking a draft ----------
  function mathErrors(q) {
    const texts = [q.prompt, ...(q.parts || []).map(p => p.prompt), q.key.answer, q.key.working, ...q.key.accept];
    const errs = [];
    for (const t of texts) {
      for (const m of C.splitMaths(t).filter(p => p.math)) {
        try { window.katex.renderToString(m.text, { throwOnError: true }); }
        catch (e) { errs.push(`${q.id}: maths “${m.text.slice(0, 30)}” can’t be displayed.`); }
      }
    }
    return errs;
  }

  // If a new question is over its word limit, ask Claude once to cut it down (same numbers and answers).
  async function shortenIfLong(sample, cleaned, slot, signal) {
    const limit = C.wordLimit(slot);
    const q = cleaned.question;
    if (C.wordCount(q) <= limit) return cleaned;
    try {
      const r = await sample.json(C.buildShortenPrompt(q, limit), { modelTier: 'default', signal });
      const parts = r && Array.isArray(r.parts) ? r.parts : [];
      if (!r || parts.length !== (q.parts || []).length) return cleaned;
      const again = C.cleanDraftQuestion({ prompt: r.prompt, parts, svg: q.svg, recall_from: q.recall_from, key: q.key }, slot);
      return C.wordCount(again.question) <= limit ? again : cleaned;
    } catch (e) {
      if (e && e.code === 'cancelled') throw e;
      return cleaned;
    }
  }

  async function layoutErrors(sheet) {
    const box = $('measure');
    SheetRender.renderSheet(sheet, box);
    // Measuring forces layout, so no frame wait is needed; just give web fonts a moment to arrive.
    try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fonts API unavailable */ }
    const problems = SheetRender.layoutProblems(box);
    box.innerHTML = '';
    return problems;
  }

  async function independentCheck(sample, sheet, q, signal) {
    try {
      const r = await sample.json(C.buildCheckPrompt(sheet, q), { modelTier: 'default', signal });
      const notes = [];
      if (r && r.key_correct === false) notes.push(`${q.id}: the checker disagreed with the answer key (it got “${String(r.your_answer || '').slice(0, 80)}”). ${String(r.problems || '').slice(0, 200)}`);
      else if (r && r.question_clear === false) notes.push(`${q.id}: the checker found the wording unclear. ${String(r.problems || '').slice(0, 200)}`);
      return { ok: notes.length === 0, notes };
    } catch (e) {
      return { ok: false, notes: [`${q.id}: the independent check couldn’t run (${e && e.code === 'rate_limited' ? 'Claude is busy' : 'try again later'}). Check the answer key yourself.`] };
    }
  }

  // ---------- Redo ----------
  function setBusy(on, text) {
    busy = on;
    document.querySelectorAll('#redo-buttons button, #redo-all, #draft-save, #draft-discard').forEach(b => { b.disabled = on; });
    $('draft-toast').textContent = '';
    if (text != null) { $('draft-banner').hidden = false; $('draft-text').textContent = text; $('draft-issues').innerHTML = ''; }
  }

  function showIssues(items) {
    $('draft-issues').innerHTML = items.map(i => `<li class="${i.ok ? 'ok' : 'warn'}">${window.Hub.esc(i.text)}</li>`).join('');
  }

  async function redo(num) {
    if (busy || !shownSheet) return;
    const sample = await use('sample');
    if (!sample) { setBusy(false, 'Redo needs Claude, which isn’t available in this view. Open the Hub in claude.ai while signed in.'); $('draft-save').hidden = true; return; }
    const base = pending ? pending.sheet : shownSheet;
    const baseId = pending ? pending.baseId : (window.Hub.current().base || window.Hub.current().id);
    const targets = num == null ? base.questions : base.questions.filter(q => q.num === num);
    setBusy(true, `Claude is writing ${num == null ? 'a whole new sheet' : 'a new Question ' + num}… This usually takes 20–60 seconds.`);
    $('draft-save').hidden = false;
    const ctl = new AbortController();
    try {
      const raw = await sample.json(C.buildRedoPrompt(clone(base), num), { modelTier: 'complex', signal: ctl.signal });
      const drafts = num == null ? (raw && Array.isArray(raw.questions) ? raw.questions : []) : [raw];
      if (drafts.length !== targets.length) throw { code: 'invalid_json' };
      const sheet = clone(base);
      sheet.id = 'DRAFT';
      const issues = [];
      const newIds = [];
      for (const [i, t] of targets.entries()) {
        const slot = { num: t.num, section: t.section, level: t.level, span: t.span, ac9: t.ac9, recall_from: t.recall_from };
        const { question, errors } = await shortenIfLong(sample, C.cleanDraftQuestion(drafts[i], slot), slot, ctl.signal);
        sheet.questions[t.num - 1] = question;
        newIds.push(question.id);
        errors.forEach(e => issues.push({ ok: false, text: `${question.id}: ${e}` }));
        mathErrors(question).forEach(e => issues.push({ ok: false, text: e }));
      }
      C.prepareSheet(sheet);
      (await layoutErrors(sheet)).forEach(e => issues.push({ ok: false, text: e }));
      $('draft-text').textContent = 'Checking the answers independently…';
      for (const id of newIds) {
        const q = sheet.questions.find(x => x.id === id);
        const r = await independentCheck(sample, sheet, q, ctl.signal);
        if (r.ok) issues.push({ ok: true, text: `${id}: independent check agreed with the answer key.` });
        else r.notes.forEach(n => issues.push({ ok: false, text: n }));
      }
      pending = { sheet, baseId, newIds: [...new Set((pending ? pending.newIds : []).concat(newIds))], issues };
      window.Hub.showDraft(sheet, pending.newIds);
      setBusy(false, issues.some(i => !i.ok)
        ? 'Review the notes below and the answer key before saving. New questions are outlined in gold.'
        : 'All checks passed. New questions are outlined in gold; check the answer key, then save.');
      showIssues(issues);
    } catch (e) {
      const code = e && e.code;
      setBusy(false, HIDE.includes(code) ? 'Claude isn’t available for this page, so Redo is off.'
        : code === 'rate_limited' ? 'Claude is busy or your usage limit was reached. Try again in a few minutes.'
        : 'Claude’s reply couldn’t be used. Press Redo to try again.');
      if (!pending) $('draft-save').hidden = true;
    }
  }

  async function saveDraft() {
    if (busy || !pending) return;
    const db = await use('db');
    if (!db) { $('draft-toast').textContent = 'Saving needs the Hub open in claude.ai.'; return; }
    if (canWrite === false) { $('draft-toast').textContent = 'You can view the Hub but not save versions. Ask the owner for Contributor access.'; return; }
    const codes = window.Hub.allSheets().map(s => s.id);
    const code = C.nextVersionCode(pending.baseId, codes);
    const base = window.Hub.byId(pending.baseId) || pending.sheet;
    const sheet = clone(pending.sheet);
    sheet.id = code;
    let createdBy = '';
    try { const user = await use('user'); createdBy = user && user.id ? String(await user.id()) : ''; } catch (e) { /* anonymous */ }
    setBusy(true);
    $('draft-toast').textContent = 'Saving…';
    try {
      await db.doc('versions/' + code).set({
        code, base: pending.baseId, version: Number(code.split('-v').pop()), course: base.course, term: base.term,
        sheet, createdBy, createdAt: Date.now(),
      });
      pending = null;
      setBusy(false);
      $('draft-banner').hidden = true;
      window.Hub.clearDraft();
      window.Hub.selectWhenAvailable(code);
    } catch (e) {
      setBusy(false);
      $('draft-toast').textContent = e && e.code === 'invalid_argument'
        ? 'You don’t have permission to save versions. Ask the owner for Contributor access.'
        : 'Saving didn’t work. Please try again.';
      if (e && e.code === 'invalid_argument') canWrite = false;
    }
  }

  // ---------- Printable download for saved versions ----------
  async function dataUrl(path) {
    const blob = await (await fetch(path)).blob();
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  }

  // `sheet` may be one sheet or a class set (a list of sheets plus `opts.title`): every student's
  // sheet in order, or an answer grid followed by each student's worked answer key.
  async function downloadPrintable(sheet, kind, toastEl, opts) {
    toastEl.textContent = 'Preparing…';
    try {
      const css = await (await fetch('css/sheet.css')).text();
      const logo = await dataUrl('assets/wesley-logo.png');
      const list = Array.isArray(sheet) ? sheet : [sheet];
      const title = (opts && opts.title) || list[0].id;
      const parts = [];
      if (kind === 'key' && list.length > 1) { const g = document.createElement('div'); SheetRender.renderAnswerGrid(list, g, title); parts.push(g.innerHTML); }
      for (const s of list) {
        const box = document.createElement('div');
        if (kind === 'key') SheetRender.renderAnswerKey(s, box); else SheetRender.renderSheet(s, box);
        parts.push(box.innerHTML);
      }
      sheet = { id: title };
      const body = parts.map((p, i) => i ? `<div class="pb">${p}</div>` : p).join('').split('assets/wesley-logo.png').join(logo);
      const pageCss = kind === 'key' ? '@page { size: A4 portrait; margin: 14mm 15mm; }' : '';
      const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><title>${window.Hub.esc(sheet.id)} ${kind === 'key' ? 'answer key' : 'homework sheet'}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:wght@700&family=Source+Code+Pro:wght@600&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>${css}\nbody{margin:0;background:#e9e6ee}.pb{break-before:page}.answer-grid{width:100%;border-collapse:collapse;font-size:13px}.answer-grid th,.answer-grid td{border:1px solid #bfb6cc;padding:4px 6px;text-align:left;vertical-align:top}.how{font:14px/1.4 "Source Sans 3",Arial,sans-serif;background:#50275a;color:#fff;padding:10px 16px}@media print{.how{display:none}body{background:#fff}}${pageCss}</style></head>
<body><div class="how">To print: press <b>Ctrl+P</b> (or ⌘P), choose <b>A4</b>, <b>double-sided</b> and turn <b>Headers and footers</b> off.</div>${body}</body></html>`;
      await window.Hub.saveData(`${sheet.id} ${kind === 'key' ? 'answer key' : list.length > 1 ? 'student sheets' : 'homework'}.html`, html, toastEl);
    } catch (e) {
      toastEl.textContent = 'The printable page couldn’t be made. Please try again.';
    }
  }

  // ---------- Wiring ----------
  function onSelect(sheet, isDraft) {
    shownSheet = sheet;
    if (!isDraft && pending) { pending = null; $('draft-banner').hidden = true; }
    $('redo-bar').hidden = !!(sheet && sheet.setStudent);   // a class-set student is previewed, not redone
    $('redo-buttons').innerHTML = (sheet.questions || []).map(q =>
      `<button class="btn small" data-num="${q.num}"${busy ? ' disabled' : ''} title="Write a new ${C.SECTION_NAMES[q.section]} question">Q${q.num}${q.section === 'recall' ? ' (recall)' : ''}</button>`).join('');
  }

  $('redo-buttons').addEventListener('click', e => { const b = e.target.closest('button[data-num]'); if (b) redo(Number(b.dataset.num)); });
  $('redo-all').addEventListener('click', () => redo(null));
  $('draft-save').addEventListener('click', saveDraft);
  $('draft-discard').addEventListener('click', () => { pending = null; $('draft-banner').hidden = true; window.Hub.clearDraft(); });

  window.Redo = { onSelect, downloadPrintable, sanitizeSheet, mathErrors, layoutErrors, shortenIfLong };
  subscribeVersions();
})();
