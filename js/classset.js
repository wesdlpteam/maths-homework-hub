/* Class sets: one numbers-only version of a sheet for every student in a class, each with its own code
   (Y8-T2-W1-A07) and answer key. Claude writes the versions question by question, a second Claude call
   checks every answer key, and the set is saved in the shared database so anyone can print or mark it.
   A set can be differentiated: the teacher adds any number of groups, each with its own sheet (any sheet in
   the Hub). Students still get their own numbers, and group codes run on after the main sheet's codes.
   No student names are stored. Depends on HubCore, SheetRender, Redo (checks, printing) and Hub. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.HubCore;
  const use = name => (window.claude && window.claude.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const HIDE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  const BATCH = 15;          // versions per Claude call
  const MAX_STUDENTS = 35;
  const MAX_GROUPS = 6;

  let SETS = [];             // saved set summaries from the database (not deleted)
  let USED = [];             // every set id ever saved, deleted ones too, so a letter is never reused
  const cache = new Map();   // setId -> [student sheets]
  let base = null;           // sheet shown in the Homework sheets tab
  let gen = null;            // set being made: { base, baseId, letter, label, groups, count, variants, sheets, issues, ctl, running }
  let open = null;           // saved set being viewed: setId
  let canWrite = null;

  const plain = v => String(v == null ? '' : v).replace(/[<>]/g, '');
  const cleanLabel = v => String(v || '').replace(/[^A-Za-z0-9 \-]/g, '').trim().slice(0, 12);
  const setsFor = id => SETS.filter(m => m.base === id).sort((a, b) => a.letter.localeCompare(b.letter));
  // Question documents: the main sheet's versions keep the plain question id (Q1), so older sets still
  // load; a group's are prefixed with its key (g1-Q1).
  const docId = (key, qid) => (key === 'main' ? qid : `${key}-${qid}`);
  // A saved set's groups, in code order. Sets made without groups are just the main sheet.
  const groupsOf = m => m.groups || [{ key: 'main', sheet: m.base, count: m.count }];
  const shortCode = s => s.id.split('-').pop();
  const groupNote = s => (s.groupKey && s.groupKey !== 'main' ? ` · ${C.groupName(s.groupKey)} (${s.groupSheetId})` : '');

  // ---------- Building student sheets ----------
  // A stored version holds only the text and answer key; layout, diagrams and labels come from the sheet it was made from.
  function cleanVersion(v) {
    const s = C.sanitizeHtml;
    const k = (v && v.key) || {};
    const out = { prompt: s(v && v.prompt), key: { answer: s(k.answer), accept: (k.accept || []).slice(0, 6).map(s), working: s(k.working),
      look_for: (k.look_for || []).slice(0, 6).map(s), common_errors: (k.common_errors || []).slice(0, 6).map(s), verify: [] } };
    if (Array.isArray(v && v.parts) && v.parts.length) out.parts = v.parts.slice(0, 4).map((p, j) => ({ label: 'abcd'[j], prompt: s(p && p.prompt) }));
    return out;
  }
  const storeVersion = q => ({ prompt: q.prompt, parts: (q.parts || []).map(p => ({ prompt: p.prompt })),
    key: { answer: q.key.answer, accept: q.key.accept, working: q.key.working, look_for: q.key.look_for, common_errors: q.key.common_errors } });

  // b: the sheet this student's questions come from. cls: the class's own sheet (the set's base).
  // key: the student's group in a differentiated set ('main', 'g1', …), or null for an ordinary set.
  function studentSheet(b, cls, letter, label, k, versionFor, key) {
    const s = clone(b);
    delete s.base; delete s.version; delete s.createdAt;
    Object.assign(s, { id: C.studentCode(cls.id, letter, k), setId: `${cls.id}-${letter}`, setStudent: true, classLabel: cleanLabel(label) });
    if (key) s.groupKey = key;
    if (key && key !== 'main') Object.assign(s, { groupSheetId: b.id, show: { year: cls.year, stream: cls.stream, weeks: cls.weeks } });
    s.questions = b.questions.map((bq, i) => {
      const v = cleanVersion(versionFor(i));
      const q = Object.assign(clone(bq), { prompt: v.prompt, key: v.key });
      if (v.parts) q.parts = v.parts; else delete q.parts;
      return q;
    });
    return C.prepareSheet(s);
  }

  // Every student's sheet, in code order. groups: [{ key, sheet, count }], versionsFor(gi, i, j).
  function sheetsFrom(groups, cls, letter, label, versionsFor) {
    const grouped = groups.some(g => g.key !== 'main');
    const out = [];
    groups.forEach((g, gi) => {
      for (let j = 0; j < g.count; j++) out.push(studentSheet(g.sheet, cls, letter, label, out.length + 1, i => versionsFor(gi, i, j), grouped ? g.key : null));
    });
    return out;
  }

  // ---------- Saved sets ----------
  function cleanGroups(raw) {
    if (!Array.isArray(raw)) return null;
    const gs = raw.map(g => ({ key: /^(main|g\d{1,2})$/.test(g && g.key) ? g.key : null, sheet: plain(g && g.sheet),
      count: Math.max(0, Math.min(MAX_STUDENTS, Number(g && g.count) || 0)) })).filter(g => g.key && g.sheet && g.count);
    return gs.some(g => g.key !== 'main') ? gs : null;
  }

  async function subscribe() {
    const db = await use('db');
    if (!db) return;
    try {
      db.collection('classsets').onSnapshot(snap => {
        const all = snap.docs.map(d => { try { const m = d.data(); return { setId: plain(m.setId), base: plain(m.base), letter: plain(m.letter).slice(0, 1),
          label: cleanLabel(m.label), count: Math.min(MAX_STUDENTS, Number(m.count) || 0), groups: cleanGroups(m.groups), createdAt: Number(m.createdAt) || 0, deleted: !!m.deleted }; } catch (e) { return null; } })
          .filter(m => m && m.setId && m.letter);
        USED = all.map(m => m.setId);
        SETS = all.filter(m => !m.deleted && m.count);
        if (open && !SETS.some(m => m.setId === open)) closeSet();
        render();
        pushToMarking();
      }, () => {});
    } catch (e) { /* db unavailable */ }
    const user = await use('user');
    if (user && user.can) { try { canWrite = await user.can('data.write'); } catch (e) { canWrite = null; } }
  }

  async function load(setId) {
    if (cache.has(setId)) return cache.get(setId);
    const m = SETS.find(x => x.setId === setId);
    const b = m && window.Hub.byId(m.base);
    const db = await use('db');
    if (!m || !b || !db) throw { code: 'not_found' };
    const groups = groupsOf(m).map(g => ({ key: g.key, count: g.count, sheet: g.key === 'main' ? b : window.Hub.byId(g.sheet) }));
    if (groups.some(g => !g.sheet)) throw { code: 'not_found' };
    const snap = await db.collection(`classsets/${setId}/questions`).get();
    const byQ = new Map(snap.docs.map(d => [d.id, d.data()]));
    const versions = groups.map(g => g.sheet.questions.map(q => ((byQ.get(docId(g.key, q.id)) || {}).versions) || []));
    if (groups.some((g, gi) => versions[gi].some(v => v.length < g.count))) throw { code: 'incomplete' };
    const sheets = sheetsFrom(groups, b, m.letter, m.label, (gi, i, j) => versions[gi][i][j]);
    cache.set(setId, sheets);
    return sheets;
  }

  // Class sets offered in the marking tab, shaped like the sheet they were made from.
  function pushToMarking() {
    if (!window.Marking || !window.Marking.setClassSets) return;
    window.Marking.setClassSets(SETS.map(m => {
      const b = window.Hub.byId(m.base);
      return b && Object.assign({}, b, { id: 'set:' + m.setId, isSet: true, setId: m.setId, baseId: m.base, letter: m.letter, label: m.label, count: m.count, groups: m.groups });
    }).filter(Boolean));
  }

  // ---------- Making a set ----------
  const slotOf = q => ({ num: q.num, section: q.section, level: q.level, span: q.span, ac9: q.ac9, recall_from: q.recall_from, svg: q.svg });
  const shortText = q => C.stripHtml(q.prompt + ' ' + (q.parts || []).map(p => p.prompt).join(' ')).slice(0, 200);

  async function writeVersions(sample, sheet, q, need, have, seen) {
    const raw = await sample.json(C.buildVariantPrompt(clone(sheet), q, need, have.map(shortText)), { modelTier: 'complex', signal: gen.ctl.signal });
    const diagram = q.svg && q.svg !== 'GRID';
    const out = [];
    for (const r of (raw && Array.isArray(raw.versions) ? raw.versions : [])) {
      if (out.length >= need) break;
      const { question, errors } = C.cleanDraftQuestion(r, slotOf(q));
      if (!question.prompt || !question.key.answer || !question.key.working) continue;
      if (q.svg) question.svg = q.svg;
      const sig = C.variantSignature(question);
      if (seen.has(sig) && !diagram) continue;
      seen.add(sig);
      question.notes = errors.concat(window.Redo.mathErrors(question).map(e => e.replace(/^Q\d+: /, '')));
      out.push(question);
    }
    return out;
  }

  async function checkVersions(sample, sheet, list, idxs) {
    const bad = new Map();
    for (let i = 0; i < idxs.length; i += BATCH) {
      const items = idxs.slice(i, i + BATCH).map(n => ({ n: n + 1, q: list[n] }));
      try {
        const r = await sample.json(C.buildVariantCheckPrompt(sheet, items), { modelTier: 'default', signal: gen.ctl.signal });
        const got = new Map(((r && r.results) || []).map(x => [Number(x.version), x]));
        for (const { n } of items) {
          const x = got.get(n);
          if (!x) bad.set(n - 1, 'the independent check skipped this version');
          else if (x.key_correct === false) bad.set(n - 1, `the checker got “${String(x.your_answer || '').slice(0, 60)}”, not the key’s answer`);
          else if (x.question_clear === false) bad.set(n - 1, `the checker found the wording unclear${x.problems ? ` (${String(x.problems).slice(0, 140)})` : ''}`);
        }
      } catch (e) {
        if (e && (e.code === 'cancelled' || HIDE.includes(e.code))) throw e;
        items.forEach(({ n }) => bad.set(n - 1, 'the independent check couldn’t run'));
      }
    }
    return bad;
  }

  // Writes and checks every version of question i for group gi.
  async function makeQuestion(sample, gi, q, i) {
    const g = gen.groups[gi];
    const seen = new Set([C.variantSignature(q)]);
    let list = [];
    for (let tries = 0; list.length < g.count && tries < 4; tries++) {
      list = list.concat(await writeVersions(sample, g.sheet, q, Math.min(BATCH, g.count - list.length), list, seen));
    }
    if (list.length < g.count) throw { code: 'short', q: q.id, key: g.key };
    step();
    let bad = await checkVersions(sample, g.sheet, list, list.map((_, n) => n));
    if (bad.size) {   // one more go at any version the checker disagreed with
      const idxs = [...bad.keys()];
      const fresh = await writeVersions(sample, g.sheet, q, idxs.length, list, seen);
      idxs.forEach((n, j) => { if (fresh[j]) list[n] = fresh[j]; });
      const again = await checkVersions(sample, g.sheet, list, idxs.filter((n, j) => fresh[j]));
      bad = new Map(idxs.filter((n, j) => !fresh[j] || again.has(n)).map(n => [n, again.get(n) || bad.get(n)]));
    }
    list.forEach((v, n) => {
      const code = gen.letter + String(g.start + n).padStart(2, '0');
      v.notes.forEach(t => gen.issues.push(`${code} ${q.id}: ${t}`));
      if (bad.has(n)) gen.issues.push(`${code} ${q.id}: ${bad.get(n)}. Check this answer key.`);
      delete v.notes;
    });
    gen.variants[gi][i] = list;
    step();
  }

  let steps = 0, totalSteps = 1;
  function step() { steps++; $('cs-progress').style.transform = `scaleX(${Math.min(1, steps / totalSteps).toFixed(3)})`; }

  async function pool(tasks, size) {
    let next = 0;
    const worker = async () => { while (next < tasks.length) await tasks[next++](); };
    await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker));
  }

  const count = id => { const v = Number($(id).value); return Number.isFinite(v) ? Math.round(v) : 0; };

  // The groups chosen in the form, in code order: the main sheet first, then Group 1, 2, … as listed.
  function chosenGroups(b) {
    const rows = [{ key: 'main', n: count('cs-count'), sheetId: b.id }].concat([...document.querySelectorAll('#cs-groups .cs-group')].map((row, i) => ({
      key: 'g' + (i + 1), n: (v => (Number.isFinite(v) ? Math.round(v) : 0))(Number(row.querySelector('.cs-g-count').value)), sheetId: row.querySelector('.cs-g-sheet').value })));
    const out = [];
    for (const r of rows) {
      if (r.n < 0) return { error: 'Student numbers can’t be negative.' };
      if (!r.n) continue;
      const sheet = window.Hub.byId(r.sheetId);
      if (!sheet) return { error: `Choose a sheet for ${C.groupName(r.key)}.` };
      out.push({ key: r.key, sheet: C.prepareSheet(clone(sheet)), sheetId: sheet.id, count: r.n });
    }
    let start = 1;
    out.forEach(g => { g.start = start; start += g.count; });
    return { groups: out, total: start - 1 };
  }

  async function make() {
    if (gen && gen.running) return;
    const b = base;
    if (!b) return;
    const { groups, total, error } = chosenGroups(b);
    if (error) { status(error); return; }
    if (!(total >= 2 && total <= MAX_STUDENTS)) { status(`Choose between 2 and ${MAX_STUDENTS} students altogether.`); return; }
    const sample = await use('sample');
    if (!sample) { status('Making a class set needs Claude, which isn’t available in this view. Open the Hub in claude.ai while signed in.'); return; }
    const letter = C.nextSetLetter(b.id, USED.concat(SETS.map(m => m.setId)));
    if (!letter) { status('This sheet already has the most class sets it can hold.'); return; }
    gen = { base: C.prepareSheet(clone(b)), baseId: b.id, letter, label: cleanLabel($('cs-label').value), groups, count: total,
      variants: groups.map(() => []), sheets: [], issues: [], ctl: new AbortController(), running: true };
    const tasks = groups.flatMap((g, gi) => g.sheet.questions.map((q, i) => () => makeQuestion(sample, gi, q, i)));
    steps = 0; totalSteps = tasks.length * 2 + 1;
    $('cs-progress').style.transform = 'scaleX(0)';
    $('cs-issues').innerHTML = ''; $('cs-review').hidden = true; $('cs-form').hidden = true; $('cs-stop').hidden = false;
    status(`Claude is writing ${total} versions of each question${groups.length > 1 ? ` across ${groups.length} groups` : ''} and checking every answer. This takes a few minutes; you can keep using the Hub.`);
    try {
      await pool(tasks, 2);
      gen.sheets = sheetsFrom(groups, gen.base, letter, gen.label, (gi, i, j) => storeVersion(gen.variants[gi][i][j]));
      const sigs = new Set(gen.sheets.map(s => s.questions.map(C.variantSignature).join('|')));
      if (sigs.size < gen.sheets.length) gen.issues.push('Some students have identical sheets. Make the set again, or change a question first.');
      for (const s of gen.sheets) (await window.Redo.layoutErrors(s)).forEach(e => gen.issues.push(`${shortCode(s)}: ${e}`));
      step();
      gen.running = false;
      showReview();
    } catch (e) {
      const code = e && e.code;
      gen = null;
      $('cs-form').hidden = false; $('cs-stop').hidden = true;
      status(code === 'cancelled' ? 'Stopped. Nothing was saved.'
        : HIDE.includes(code) ? 'Claude isn’t available for this page, so class sets are off.'
        : code === 'rate_limited' ? 'Claude is busy or your usage limit was reached. Try again in a few minutes.'
        : code === 'short' ? `Claude couldn’t make enough different versions of ${e.q}${e.key && e.key !== 'main' ? ` on ${C.groupName(e.key)}’s sheet` : ''}. Try fewer students, or redo that question first.`
        : 'Claude’s reply couldn’t be used. Press Make sheets to try again.');
    }
  }

  const groupSummary = groups => groups.map(g => `${g.key === 'main' ? 'main sheet' : C.groupName(g.key) + ' (' + (g.sheetId || g.sheet.id || g.sheet) + ')'}: ${g.count}`).join(', ');

  function showReview() {
    $('cs-stop').hidden = true;
    const n = gen.issues.length;
    const which = gen.groups.length > 1 ? ` (${groupSummary(gen.groups)})` : '';
    status(n ? `${gen.count} student sheets are ready${which}, but ${n} thing${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} checking (below). Preview any student, then save.`
      : `${gen.count} student sheets are ready${which}. Every answer key was checked independently and no two sheets are the same. Preview any student, then save.`);
    $('cs-issues').innerHTML = gen.issues.slice(0, 40).map(t => `<li class="warn">${esc(t)}</li>`).join('') + (n > 40 ? `<li class="warn">…and ${n - 40} more.</li>` : '');
    $('cs-preview').innerHTML = gen.sheets.map((s, k) => `<option value="${k}">${esc(s.id + groupNote(s))}</option>`).join('');
    $('cs-review').hidden = false;
    preview(gen.sheets[0], 'not saved yet');
  }

  function preview(sheet, note) {
    window.Hub.showDraft(sheet, [], `Class set student ${shortCode(sheet)}${groupNote(sheet)}${sheet.classLabel ? ' · ' + sheet.classLabel : ''} · ${note}`);
  }

  async function save() {
    if (!gen || gen.running) return;
    const db = await use('db');
    if (!db) { $('cs-toast').textContent = 'Saving needs the Hub open in claude.ai.'; return; }
    if (canWrite === false) { $('cs-toast').textContent = 'You can view the Hub but not save. Ask the owner for Contributor access.'; return; }
    // Another teacher may have saved a set for this sheet meanwhile: take the next free letter.
    const letter = C.nextSetLetter(gen.baseId, USED.concat(SETS.map(m => m.setId)));
    if (!letter) { $('cs-toast').textContent = 'This sheet already has the most class sets it can hold.'; return; }
    const g = gen;
    const setId = `${g.baseId}-${letter}`;
    const b = window.Hub.byId(g.baseId) || g.base;
    const groups = g.groups.some(x => x.key !== 'main') ? g.groups.map(x => ({ key: x.key, sheet: x.sheetId, count: x.count })) : null;
    let createdBy = '';
    try { const user = await use('user'); createdBy = user && user.id ? String(await user.id()) : ''; } catch (e) { /* anonymous */ }
    $('cs-save').disabled = true; $('cs-toast').textContent = 'Saving…';
    try {
      for (const [gi, grp] of g.groups.entries()) {
        for (const [i, q] of grp.sheet.questions.entries()) {
          await db.doc(`classsets/${setId}/questions/${docId(grp.key, q.id)}`).set({ versions: g.variants[gi][i].map(storeVersion) });
        }
      }
      // The summary is written last, so a set never appears before its questions are saved.
      const meta = { setId, base: g.baseId, letter, label: g.label, count: g.count,
        course: b.course, term: b.term, plannerYear: Number(b.plannerYear) || null, createdBy, createdAt: Date.now() };
      if (groups) meta.groups = groups;
      await db.doc(`classsets/${setId}`).set(meta);
      cache.set(setId, sheetsFrom(g.groups, g.base, letter, g.label, (gi, i, j) => storeVersion(g.variants[gi][i][j])));
      if (!SETS.some(m => m.setId === setId)) SETS.push({ setId, base: g.baseId, letter, label: g.label, count: g.count, groups, createdAt: meta.createdAt });
      if (!USED.includes(setId)) USED.push(setId);
      gen = null;
      $('cs-panel').hidden = true; $('cs-save').disabled = false; $('cs-toast').textContent = '';
      pushToMarking();
      await openSet(setId);
    } catch (e) {
      $('cs-save').disabled = false;
      $('cs-toast').textContent = e && e.code === 'invalid_argument' ? 'You don’t have permission to save. Ask the owner for Contributor access.'
        : e && e.code === 'quota_exceeded' ? 'The Hub’s shared storage is full. Ask the owner to clear old class sets.'
        : 'Saving didn’t work. Please try again.';
    }
  }

  function discard() {
    if (gen && gen.running) { gen.ctl.abort(); return; }
    gen = null; $('cs-panel').hidden = true; $('cs-form').hidden = false; $('cs-review').hidden = true;
    window.Hub.clearDraft();
  }

  // ---------- Viewing a saved set ----------
  async function openSet(setId) {
    open = setId;
    render();
    $('cs-open').hidden = false; $('cs-del-confirm').hidden = true;
    $('cs-open-title').textContent = 'Loading class set…';
    try {
      const sheets = await load(setId);
      if (open !== setId) return;
      const m = SETS.find(x => x.setId === setId);
      $('cs-open-title').textContent = `Class set ${m.letter}${m.label ? ' · ' + m.label : ''} · ${sheets.length} students (codes ${shortCode(sheets[0])}–${shortCode(sheets[sheets.length - 1])})${m.groups ? ' · ' + groupSummary(m.groups) : ''}`;
      $('cs-open-preview').innerHTML = sheets.map((s, k) => `<option value="${k}">${esc(s.id + groupNote(s))}</option>`).join('');
      preview(sheets[0], 'saved');
    } catch (e) {
      $('cs-open-title').textContent = 'This class set couldn’t be loaded. Try again in a moment.';
    }
  }

  function closeSet() {
    open = null;
    $('cs-open').hidden = true; $('cs-del-confirm').hidden = true;
    if (window.Hub.draft() && window.Hub.draft().sheet.setStudent) window.Hub.clearDraft();
    render();
  }

  // Deleting removes every student's questions and answers. A small "deleted" record of the set's code
  // stays, so its letter is never reused and old printed sheets can't be confused with a new set.
  async function deleteSet() {
    const setId = open; if (!setId) return;
    const db = await use('db');
    const toast = $('cs-open-toast');
    if (!db) { toast.textContent = 'Deleting needs the Hub open in claude.ai.'; return; }
    if (canWrite === false) { toast.textContent = 'You can view the Hub but not delete. Ask the owner for Contributor access.'; return; }
    $('cs-del-yes').disabled = true; toast.textContent = 'Deleting…';
    try {
      const m = SETS.find(x => x.setId === setId);
      // Hide it first, so nobody starts marking against a half-deleted set.
      await db.doc(`classsets/${setId}`).update({ deleted: true, count: 0, label: '', groups: [], deletedAt: Date.now() });
      for (const g of (m ? groupsOf(m) : [{ key: 'main' }])) {
        const sh = window.Hub.byId(g.key === 'main' ? (m && m.base) : g.sheet);
        for (const q of (sh ? sh.questions : [1, 2, 3, 4, 5].map(n => ({ id: 'Q' + n })))) {
          try { await db.doc(`classsets/${setId}/questions/${docId(g.key, q.id)}`).delete(); } catch (e) { /* already gone */ }
        }
      }
      SETS = SETS.filter(x => x.setId !== setId);
      cache.delete(setId);
      toast.textContent = '';
      closeSet();
      pushToMarking();
      status(`Class set ${setId.split('-').pop()} was deleted.`);
      $('cs-form').hidden = true;
    } catch (e) {
      toast.textContent = e && e.code === 'invalid_argument' ? 'You don’t have permission to delete. Ask the owner for Contributor access.' : 'Deleting didn’t work. Please try again.';
    }
    $('cs-del-yes').disabled = false;
  }

  async function download(kind) {
    const sheets = cache.get(open); if (!sheets) return;
    const m = SETS.find(x => x.setId === open) || {};
    await window.Redo.downloadPrintable(sheets, kind, $('cs-open-toast'), { title: `${open}${m.label ? ' ' + m.label : ''}` });
  }

  // ---------- Wiring ----------
  function status(t) { $('cs-panel').hidden = false; $('cs-status').textContent = t; }

  function render() {
    if (!base) return;
    const sets = setsFor(base.id);
    $('cs-sets').innerHTML = sets.map(m => `<button class="vchip" data-set="${esc(m.setId)}" aria-pressed="${open === m.setId}" title="Saved class set${m.groups ? ' with differentiated groups' : ''}">${esc(m.letter)}${m.label ? ' · ' + esc(m.label) : ''} · ${m.count}${m.groups ? ' · groups' : ''}</button>`).join('');
  }

  // Differentiated groups: each row is a number of students and the sheet they get. The sheet list puts
  // the closest topic matches first (from this course or a neighbouring one), then every other sheet.
  function addGroup() {
    const box = $('cs-groups');
    if (box.children.length >= MAX_GROUPS) return;
    const all = C.groupCandidates(base, window.Hub.allSheets());
    const opt = s => `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.title)}</option>`;
    const row = document.createElement('div');
    row.className = 'cs-group';
    row.innerHTML = `<b class="cs-g-name"></b>
      <div class="field"><label>Students</label><input type="number" class="cs-g-count" min="0" max="${MAX_STUDENTS}" value="3"></div>
      <div class="field"><label>Sheet for this group</label><select class="cs-g-sheet"><optgroup label="Closest matches">${all.slice(0, 8).map(opt).join('')}</optgroup>
        <optgroup label="All other sheets">${all.slice(8).map(opt).join('')}</optgroup></select></div>
      <button class="btn small cs-g-remove" type="button">Remove</button>`;
    box.appendChild(row);
    renumberGroups();
    row.querySelector('.cs-g-count').focus();
  }

  function renumberGroups() {
    const rows = [...$('cs-groups').children];
    rows.forEach((row, i) => {
      const name = C.groupName('g' + (i + 1));
      row.querySelector('.cs-g-name').textContent = name;
      row.querySelector('.cs-g-count').setAttribute('aria-label', `${name}: number of students`);
      row.querySelector('.cs-g-sheet').setAttribute('aria-label', `${name}: sheet`);
      row.querySelector('.cs-g-remove').setAttribute('aria-label', `Remove ${name}`);
    });
    $('cs-add-group').hidden = rows.length >= MAX_GROUPS;
  }

  // Called by the Hub whenever the selected sheet changes (not for drafts or previews).
  function onSelect(sheet) {
    if (sheet === base) return;
    base = sheet;
    open = null;
    $('cs-open').hidden = true;
    if (!gen || !gen.running) { gen = null; $('cs-panel').hidden = true; $('cs-form').hidden = false; $('cs-review').hidden = true; }
    $('cs-bar').hidden = !sheet;
    render();
  }

  $('cs-new').addEventListener('click', () => {
    if (gen && gen.running) { $('cs-panel').hidden = false; return; }
    open = null; $('cs-open').hidden = true; render();
    gen = null; $('cs-form').hidden = false; $('cs-review').hidden = true; $('cs-issues').innerHTML = '';
    $('cs-groups').innerHTML = ''; renumberGroups();
    status(`Each student gets the same questions with different numbers. To differentiate, add groups: each group gets the sheet you choose, still with their own numbers. Up to ${MAX_STUDENTS} students altogether; no names are stored.`);
    $('cs-count').focus();
  });
  $('cs-add-group').addEventListener('click', addGroup);
  $('cs-groups').addEventListener('click', e => { const b = e.target.closest('.cs-g-remove'); if (b) { b.closest('.cs-group').remove(); renumberGroups(); } });
  $('cs-make').addEventListener('click', make);
  $('cs-cancel').addEventListener('click', () => { $('cs-panel').hidden = true; });
  $('cs-stop').addEventListener('click', discard);
  $('cs-save').addEventListener('click', save);
  $('cs-discard').addEventListener('click', discard);
  $('cs-preview').addEventListener('change', () => { if (gen && gen.sheets[+$('cs-preview').value]) preview(gen.sheets[+$('cs-preview').value], 'not saved yet'); });
  $('cs-sets').addEventListener('click', e => { const b = e.target.closest('button[data-set]'); if (b) openSet(b.dataset.set); });
  $('cs-open-preview').addEventListener('change', () => { const s = (cache.get(open) || [])[+$('cs-open-preview').value]; if (s) preview(s, 'saved'); });
  $('cs-delete').addEventListener('click', () => {
    const m = SETS.find(x => x.setId === open); if (!m) return;
    $('cs-del-text').textContent = `Delete class set ${m.letter}${m.label ? ' (' + m.label + ')' : ''} for ${m.base}? Its ${m.count} student sheets and answer keys will be removed for everyone, and it can’t be marked any more. This can’t be undone. Files you already downloaded aren’t affected.`;
    $('cs-del-confirm').hidden = false; $('cs-del-no').focus();
  });
  $('cs-del-no').addEventListener('click', () => { $('cs-del-confirm').hidden = true; });
  $('cs-del-yes').addEventListener('click', deleteSet);
  $('cs-dl-sheets').addEventListener('click', () => download('sheet'));
  $('cs-dl-key').addEventListener('click', () => download('key'));

  window.ClassSets = { onSelect, load, cached: id => cache.get(id) || null, pushToMarking, _make: make, _save: save, _sets: () => SETS, _used: () => USED };
  subscribe();
})();
