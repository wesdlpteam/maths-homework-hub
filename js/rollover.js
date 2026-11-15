/* Year rollover: read next year's course planners (Word templates), plan each fortnight
   (reuse a matching sheet, have Claude write one, or no sheet), then build the new-year library
   in the shared database. Depends on HubCore, JSZip, Redo (checks, sanitising) and Hub. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.HubCore;
  const use = name => (window.claude && window.claude.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const plans = [];        // [{ course, year, name, rows: [{ fn, choice, status, flags }] }]
  let built = new Map();   // code -> library doc already in the database
  let running = false, ctl = null, stop = false;

  // ---------- Library in the shared database ----------
  async function subscribe() {
    const db = await use('db');
    if (!db) return;
    try {
      db.collection('library').onSnapshot(snap => {
        built = new Map();
        const list = [];
        for (const d of snap.docs) {
          try {
            const v = d.data();
            const s = window.Redo.sanitizeSheet(Object.assign({}, v.sheet, { id: v.code }));
            Object.assign(s, { generated: true, plannerYear: Number(v.year) || 2027, source: String(v.source || '').replace(/[<>]/g, ''), base: '' });
            delete s.version;
            list.push(s);
            built.set(v.code, v);
          } catch (e) { /* skip a damaged document */ }
        }
        window.Hub.setLibrary(list);
        renderPlan();
      }, () => {});
    } catch (e) { /* db unavailable */ }
    const user = await use('user');
    if (user && user.canEdit) { try { if (!(await user.canEdit())) $('ro-readonly').hidden = false; } catch (e) { /* unknown */ } }
  }

  // ---------- Reading planners ----------
  async function addPlanners(files) {
    const status = $('ro-load-status');
    status.textContent = 'Reading planners…';
    const notes = [];
    for (const f of files) {
      try {
        const zip = await window.JSZip.loadAsync(f);
        const doc = zip.file('word/document.xml');
        if (!doc) throw new Error('not a Word file');
        const p = C.parsePlanner(await doc.async('string'));
        if (!p.course || !p.year || !C.COURSE_NAMES[p.course]) { notes.push(`${f.name}: not a Hub planner template (no course code found).`); continue; }
        const library = window.Hub.allSheets().filter(s => String(s.plannerYear) !== String(p.year));
        const rows = C.fortnights(p).map(fn => ({ fn, choice: C.suggestSheet(fn, library, p.course), status: '', flags: [] }));
        const i = plans.findIndex(x => x.course === p.course && x.year === p.year);
        const entry = { course: p.course, year: p.year, name: p.name || C.COURSE_NAMES[p.course], rows };
        if (i >= 0) plans[i] = entry; else plans.push(entry);
        notes.push(`${C.COURSE_NAMES[p.course]} ${p.year}: ${rows.length} fortnights, ${rows.filter(r => r.choice.action !== 'skip').length} with homework.`);
      } catch (e) {
        notes.push(`${f.name}: couldn’t be read (${e.message || 'unknown error'}).`);
      }
    }
    status.textContent = notes.join(' ');
    renderPlan();
  }

  // ---------- Plan table ----------
  function optionsFor(plan, row) {
    const from = C.REUSE_FROM[plan.course] || plan.course;
    const lib = window.Hub.allSheets().filter(s => s.course === from && !s.base && String(s.plannerYear) !== String(plan.year));
    const cur = row.choice.action === 'reuse' ? row.choice.from : row.choice.action;
    return `<option value="new"${cur === 'new' ? ' selected' : ''}>Claude writes a new sheet</option>
      <option value="skip"${cur === 'skip' ? ' selected' : ''}>No sheet</option>
      <optgroup label="Reuse an existing sheet">${lib.map(s => `<option value="${esc(s.id)}"${cur === s.id ? ' selected' : ''}>${esc(s.id)} · ${esc(s.title)}</option>`).join('')}</optgroup>`;
  }

  function renderPlan() {
    if (!plans.length) return;
    $('ro-plan').innerHTML = plans.map((p, pi) => `<div class="ro-course">
      <h3>${esc(C.COURSE_NAMES[p.course])} · ${p.year}</h3>
      <div class="table-wrap"><table class="counts ro-table"><thead><tr><th>Sheet</th><th>Weeks</th><th>From the planner</th><th>Plan</th><th>Status</th></tr></thead><tbody>
      ${p.rows.map((r, ri) => {
        const done = built.get(r.fn.code);
        const st = r.status || (done ? 'Built' : '');
        return `<tr><td class="code">${esc(r.fn.code)}</td><td>${esc(r.fn.weeks)}</td>
          <td class="sec">${esc(r.fn.sections.join(', ') || (r.fn.content ? r.fn.content.slice(0, 120) : '(empty)'))}</td>
          <td><select data-p="${pi}" data-r="${ri}" aria-label="Plan for ${esc(r.fn.code)}"${running ? ' disabled' : ''}>${optionsFor(p, r)}</select>
            ${r.choice.action === 'reuse' && r.choice.score != null ? `<div class="note">Matched ${Math.round(r.choice.score * 100)}% of sections</div>` : ''}
            ${(r.flags.length ? r.flags : (done && done.flags) || []).length ? `<ul class="ro-flags">${(r.flags.length ? r.flags : done.flags).map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</td>
          <td class="st ${/fail/i.test(st) ? 'failed' : st === 'Built' ? 'done' : ''}">${esc(st)}</td></tr>`;
      }).join('')}</tbody></table></div></div>`).join('');
    $('ro-build').disabled = running || !plans.some(p => p.rows.some(r => r.choice.action !== 'skip'));
  }

  $('ro-plan').addEventListener('change', e => {
    const s = e.target.closest('select[data-p]'); if (!s) return;
    const row = plans[+s.dataset.p].rows[+s.dataset.r];
    row.choice = s.value === 'new' || s.value === 'skip' ? { action: s.value } : { action: 'reuse', from: s.value };
    row.status = ''; row.flags = [];
    renderPlan();
  });

  // ---------- Building ----------
  async function writeNew(sample, plan, fn) {
    const sk = C.rolloverSkeleton(fn, plan.course, C.COURSE_NAMES[plan.course], plan.year);
    const raw = await sample.json(C.buildRedoPrompt(JSON.parse(JSON.stringify(sk)), null), { modelTier: 'complex', signal: ctl.signal });
    const qs = raw && Array.isArray(raw.questions) ? raw.questions : [];
    if (qs.length !== 5) throw { code: 'invalid_json' };
    const flags = [];
    for (const [i, slot] of sk.questions.entries()) {
      const { question, errors } = await window.Redo.shortenIfLong(sample, C.cleanDraftQuestion(qs[i], slot), slot, ctl.signal);
      errors.forEach(e => flags.push(`${question.id}: ${e}`));
      window.Redo.mathErrors(question).forEach(e => flags.push(e));
      sk.questions[i] = question;
    }
    C.prepareSheet(sk);
    (await window.Redo.layoutErrors(sk)).forEach(e => flags.push(e));
    try {
      const chk = await sample.json(C.buildSheetCheckPrompt(sk), { modelTier: 'default', signal: ctl.signal });
      for (const r of (chk && chk.questions) || []) {
        if (r.key_correct === false) flags.push(`${r.id}: the checker disagreed with the answer key (got “${String(r.your_answer || '').slice(0, 60)}”).`);
        else if (r.question_clear === false) flags.push(`${r.id}: the checker found the wording unclear${r.problems ? ` (${String(r.problems).slice(0, 140)})` : ''}.`);
      }
    } catch (e) { if (e && e.code === 'cancelled') throw e; flags.push('The independent check couldn’t run; check the answer key yourself.'); }
    return { sheet: sk, flags };
  }

  async function build() {
    if (running) return;
    const db = await use('db');
    if (!db) { $('ro-status').textContent = 'Building needs the Hub open in claude.ai.'; return; }
    const todo = plans.flatMap(p => p.rows.filter(r => r.choice.action !== 'skip').map(r => ({ p, r })));
    const needsClaude = todo.some(t => t.r.choice.action === 'new');
    const sample = needsClaude ? await use('sample') : null;
    if (needsClaude && !sample) { $('ro-status').textContent = 'Writing new sheets needs Claude, which isn’t available in this view.'; return; }
    running = true; stop = false; $('ro-stop').hidden = false;
    let n = 0, failed = 0;
    renderPlan();
    for (const { p, r } of todo) {
      if (stop) break;
      ctl = new AbortController();
      r.status = r.choice.action === 'new' ? 'Writing…' : 'Copying…'; r.flags = [];
      $('ro-status').textContent = `${r.fn.code} (${n + 1} of ${todo.length})…`;
      renderPlan();
      try {
        let res;
        if (r.choice.action === 'reuse') {
          const src = window.Hub.byId(r.choice.from);
          if (!src) throw { message: 'source sheet not found' };
          res = C.rolloverCopy(src, r.fn, p.course, C.COURSE_NAMES[p.course]);
          res.sheet.plannerYear = p.year;
        } else {
          res = await writeNew(sample, p, r.fn);
        }
        await db.doc('library/' + r.fn.code).set({
          code: r.fn.code, year: p.year, course: p.course, sheet: res.sheet,
          source: r.choice.action === 'reuse' ? r.choice.from : '', flags: res.flags, createdAt: Date.now(),
        });
        r.status = 'Built'; r.flags = res.flags;
      } catch (e) {
        const code = e && e.code;
        if (code === 'cancelled') { r.status = ''; break; }
        failed++;
        r.status = code === 'invalid_argument' ? 'Failed: editors only' : code === 'rate_limited' ? 'Failed: Claude busy' : 'Failed: try again';
        if (code === 'rate_limited' || code === 'invalid_argument') break;
      }
      n++;
      $('ro-progress').style.transform = `scaleX(${(n / todo.length).toFixed(3)})`;
      renderPlan();
    }
    running = false; ctl = null; $('ro-stop').hidden = true;
    $('ro-status').textContent = stop ? 'Stopped. Press Build library to continue.' : `Done: ${n - failed} built${failed ? `, ${failed} failed (press Build library to retry)` : ''}. Review flagged sheets in the Homework sheets tab under the new year.`;
    renderPlan();
  }

  $('ro-build').addEventListener('click', build);
  $('ro-stop').addEventListener('click', () => { stop = true; if (ctl) ctl.abort(); });
  const input = $('ro-files');
  input.addEventListener('change', () => { if (input.files.length) addPlanners([...input.files]); input.value = ''; });
  const drop = $('ro-drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) addPlanners([...e.dataTransfer.files]); });

  // ---------- Blank templates ----------
  // Built in the browser by js/planner-template.js (the same code that made the OneDrive copies).
  const T = window.PlannerTemplate;
  $('ro-templates').innerHTML = T ? T.LIST.map(c => `<button class="btn small" data-tpl="${c.code}">${esc(c.name)}</button>`).join('') : '';
  $('ro-templates').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-tpl]'); if (!btn) return;
    const toast = $('ro-tpl-toast');
    try { await window.Hub.saveData(T.filename(btn.dataset.tpl), new Blob([T.build(btn.dataset.tpl)]), toast); }
    catch (err) { toast.textContent = 'That template couldn’t be made. Please try again.'; }
  });

  window.Rollover = { _addPlanners: addPlanners, _build: build, _plans: plans };
  subscribe();
})();
