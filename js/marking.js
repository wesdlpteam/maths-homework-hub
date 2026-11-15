/* Marking tab: load scans → mark each student with Claude → review/edit → class summary → CSV.
   Nothing is stored: scans and results live only in this page. Depends on HubCore, JSZip, pdf.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.HubCore;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const use = name => (window.claude && window.claude.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
  const IMG_RE = /\.(jpe?g|png|webp)$/i;
  const PDF_RE = /\.pdf$/i;
  const HIDE_FEATURE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'images_unavailable'];

  let SHEETS = [];
  let SET_SHEETS = [];   // saved class sets ("set:<setId>"); each student has their own version
  let uid = 0;
  const state = { students: [], running: false, ctl: null, stopRequested: false, exported: true, selected: null };

  const sheetById = id => SHEETS.find(s => s.id === id) || SET_SHEETS.find(s => s.id === id);
  // The sheet a student actually answered: their own version for a class set.
  const studentSheet = s => s.variantSheet || sheetById(s.sheetId);
  const setVersions = sheet => (sheet && sheet.isSet && window.ClassSets && window.ClassSets.cached(sheet.setId)) || [];
  const batchSheet = () => sheetById($('mk-sheet').value) || SHEETS[0];

  // ---------- Images ----------
  const canvasBlob = (cv, q) => new Promise(r => cv.toBlob(r, 'image/jpeg', q || 0.85));

  async function bitmapOf(blob) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
    catch (e) { return await createImageBitmap(blob); }
  }

  async function makePage(blob, rot) {
    const bmp = await bitmapOf(blob);
    const maxSide = 2400;
    const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const turn = (rot || 0) % 360;
    const cv = document.createElement('canvas');
    cv.width = turn % 180 ? h : w; cv.height = turn % 180 ? w : h;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.translate(cv.width / 2, cv.height / 2); g.rotate(turn * Math.PI / 180);
    g.drawImage(bmp, -w / 2, -h / 2, w, h);
    return finishPage(cv);
  }

  // Turns a rendered page canvas into the page record, cutting the halves while the pixels are at hand:
  // top 0–55 % and bottom 45–100 %; the overlap protects questions near the fold.
  async function finishPage(cv) {
    const cut = (y0, y1) => {
      const c = document.createElement('canvas');
      c.width = cv.width; c.height = Math.round((y1 - y0) * cv.height);
      c.getContext('2d').drawImage(cv, 0, Math.round(y0 * cv.height), cv.width, c.height, 0, 0, cv.width, c.height);
      return canvasBlob(c, 0.88);
    };
    const blob = await canvasBlob(cv);
    const halves = [await cut(0, 0.55), await cut(0.45, 1)];
    return { id: 'p' + (++uid), blob, url: URL.createObjectURL(blob), w: cv.width, h: cv.height, halves };
  }

  async function pdfPages(file) {
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(4, 2200 / Math.max(v1.width, v1.height)) });
      const cv = document.createElement('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      pages.push(await finishPage(cv));
    }
    return pages;
  }

  // ---------- Intake ----------
  async function expandFiles(fileList) {
    const items = [], skipped = [];
    for (const f of fileList) {
      const name = f.webkitRelativePath || f.name;
      if (/\.zip$/i.test(name)) {
        const zip = await window.JSZip.loadAsync(f);
        for (const entry of Object.values(zip.files)) {
          const base = entry.name.split('/').pop();
          if (entry.dir || /(^|\/)__MACOSX\//.test(entry.name) || base.startsWith('.')) continue;
          if (!PDF_RE.test(base) && !IMG_RE.test(base)) { skipped.push(base); continue; }
          const blob = await entry.async('blob');
          items.push({ name: entry.name, file: new File([blob], base, { type: PDF_RE.test(base) ? 'application/pdf' : 'image/' + base.split('.').pop().toLowerCase().replace('jpg', 'jpeg') }) });
        }
      } else if (PDF_RE.test(name) || IMG_RE.test(name)) items.push({ name, file: f });
      else skipped.push(name);
    }
    return { items, skipped };
  }

  async function addFiles(fileList) {
    const status = $('mk-load-status');
    status.textContent = 'Reading files…';
    try {
      const { items, skipped } = await expandFiles(fileList);
      let done = 0;
      for (const it of items) {
        try { it.pages = PDF_RE.test(it.file.name) ? await pdfPages(it.file) : [await makePage(it.file)]; }
        catch (e) { it.pages = []; skipped.push(it.name + ' (could not be read)'); }
        status.textContent = `Reading files… ${++done} of ${items.length}`;
      }
      const groups = C.groupFiles(items.filter(i => i.pages.length), i => i.name);
      for (const g of groups) {
        const pages = g.files.flatMap(f => f.pages);
        const existing = state.students.find(s => s.name.toLowerCase() === g.student.toLowerCase());
        if (existing) { existing.pages.push(...pages); existing.status = existing.status === 'done' ? 'done' : 'ready'; }
        else state.students.push({ id: 's' + (++uid), name: g.student, pages, sheetId: batchSheet().id, status: 'ready', result: null, halfUrls: [] });
      }
      state.students.sort((a, b) => a.name.localeCompare(b.name));
      status.textContent = `${state.students.length} student${state.students.length === 1 ? '' : 's'} loaded.` +
        (skipped.length ? ` Skipped: ${skipped.join(', ')} (use PDF, JPG or PNG; iPhone HEIC photos need converting).` : '');
    } catch (e) {
      status.textContent = 'Those files couldn’t be opened. Check the zip isn’t damaged, then try again.';
    }
    prefetchSet();
    renderAll();
  }

  // ---------- Roster ----------
  function rowWarnings(s) {
    const w = [];
    if (s.pages.length > 2) w.push(`${s.pages.length} pages: only the first 2 are marked. Remove extras or duplicates.`);
    if (s.pages.length === 1) w.push('Only one side: side 2 questions will be flagged for you to check.');
    if (s.pages.some(p => p.w > p.h * 1.1)) w.push('A page looks sideways. Use ⟳ to rotate it.');
    return w;
  }

  const STATUS_TEXT = { ready: 'Ready', marking: 'Marking…', done: 'Marked', failed: 'Failed' };

  function renderRoster() {
    $('mk-roster').innerHTML = state.students.map(s => `
      <div class="roster-row" data-sid="${s.id}">
        <div><input type="text" id="mk-name-${s.id}" value="${esc(s.name)}" aria-label="Student name">
          ${setVersions(sheetById(s.sheetId)).length ? `<label class="note">Sheet code <select id="mk-code-${s.id}" data-act="code">
            <option value="">Read from the scan</option>${setVersions(sheetById(s.sheetId)).map(v => `<option value="${esc(v.id)}"${v.id === s.variantId ? ' selected' : ''}>${esc(v.id.split('-').pop())}</option>`).join('')}</select></label>` : ''}
          ${rowWarnings(s).map(w => `<div class="row-warn">${esc(w)}</div>`).join('')}
          ${s.error ? `<div class="row-warn">${esc(s.error)}</div>` : ''}</div>
        <div class="thumbs">${s.pages.map((p, i) => `
          <div class="thumb${p.w > p.h * 1.1 ? ' sideways' : ''}" title="Side ${i + 1}">
            <img src="${p.url}" alt="Side ${i + 1} of ${esc(s.name)}">
            <div class="tools"><button data-act="rot" data-pid="${p.id}" aria-label="Rotate side ${i + 1}">⟳</button><button data-act="rmpage" data-pid="${p.id}" aria-label="Remove side ${i + 1}">✕</button></div>
          </div>`).join('')}</div>
        <div class="btn-row"><span class="status ${s.status}">${STATUS_TEXT[s.status]}</span>
          <button class="btn small" data-act="rmstu" aria-label="Remove ${esc(s.name)}">Remove</button></div>
      </div>`).join('');
  }

  $('mk-roster').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b || state.running) return;
    const s = state.students.find(x => x.id === b.closest('.roster-row').dataset.sid);
    if (b.dataset.act === 'rmstu') { state.students = state.students.filter(x => x !== s); if (state.selected === s.id) state.selected = null; }
    if (b.dataset.act === 'rmpage') { s.pages = s.pages.filter(p => p.id !== b.dataset.pid); if (!s.pages.length) state.students = state.students.filter(x => x !== s); }
    if (b.dataset.act === 'rot') {
      const i = s.pages.findIndex(p => p.id === b.dataset.pid);
      s.pages[i] = await makePage(s.pages[i].blob, 90);
    }
    renderAll();
  });
  $('mk-roster').addEventListener('change', e => {
    if (e.target.matches('select[data-act="code"]')) {
      if (state.running) return;
      const s = state.students.find(x => x.id === e.target.closest('.roster-row').dataset.sid);
      s.variantId = e.target.value || null; s.variantSheet = null;
      if (s.result) { s.result = null; s.mismatch = null; }
      s.status = 'ready'; s.error = '';
      renderAll(); return;
    }
    if (!e.target.matches('input[type="text"]')) return;
    const s = state.students.find(x => x.id === e.target.closest('.roster-row').dataset.sid);
    const name = e.target.value.trim(); if (!name) { e.target.value = s.name; return; }
    const twin = state.students.find(x => x !== s && x.name.toLowerCase() === name.toLowerCase());
    if (twin) { twin.pages.push(...s.pages); twin.status = 'ready'; state.students = state.students.filter(x => x !== s); }
    else s.name = name;
    renderAll();
  });

  // ---------- Marking ----------
  function showUnavailable(msg) { const b = $('mk-unavailable'); b.textContent = msg; b.hidden = false; }

  async function markStudent(s, sample, maxImages) {
    let sheet = sheetById(s.sheetId);
    if (sheet && sheet.isSet) {
      // Class set: read the student's code from the top of side 1, then mark against their own version.
      const versions = await window.ClassSets.load(sheet.setId);
      if (!s.variantId) {
        const r = await sample.json(C.buildCodeReadPrompt(versions[0].id), { images: [s.pages[0].halves[0]], modelTier: 'quick', signal: state.ctl.signal });
        const hit = C.matchStudentCode(r && r.code, versions);
        if (!hit) throw { code: 'code_unread', seen: r && r.code };
        s.variantId = hit.id;
      }
      sheet = versions.find(v => v.id === s.variantId);
      if (!sheet) { s.variantId = null; throw { code: 'code_unread' }; }
      s.variantSheet = sheet;
    }
    const pages = s.pages.slice(0, 2);
    const chunks = [];
    const allHalves = [];
    for (let i = 0; i < pages.length; i++) {
      const [top, bottom] = pages[i].halves;
      allHalves.push(top, bottom);
      chunks.push({ pages: [i + 1], blobs: [top, bottom], desc: [`side ${i + 1}, top half`, `side ${i + 1}, bottom half`] });
    }
    s.halfUrls.forEach(u => URL.revokeObjectURL(u));
    s.halfUrls = allHalves.map(b => URL.createObjectURL(b));
    const calls = allHalves.length <= maxImages
      ? [{ pages: chunks.flatMap(c => c.pages), blobs: allHalves, desc: chunks.flatMap(c => c.desc) }]
      : chunks;
    const parts = [];
    for (const c of calls) {
      const prompt = C.buildMarkingPrompt(sheet, { pages: c.pages, images: c.desc });
      const raw = await sample.json(prompt, { images: c.blobs, modelTier: 'complex', signal: state.ctl.signal });
      parts.push(C.normaliseResult(raw, sheet, c.pages));
    }
    const r = parts.length > 1 ? C.mergeResults(parts) : parts[0];
    const have = new Set(r.questions.map(q => q.id));
    for (const q of sheet.questions) if (!have.has(q.id)) r.questions.push({ id: q.id, label: null, student_answer: '', feedback: '',
      please_check: true, check_reason: `Side ${q.page} was not uploaded.`, checked: false });
    r.questions.sort((a, b) => sheet.questions.findIndex(q => q.id === a.id) - sheet.questions.findIndex(q => q.id === b.id));
    const seen = (r.sheet_code_seen || '').toUpperCase().replace(/\s+/g, '');
    s.mismatch = seen && seen !== sheet.id ? seen : null;
    s.result = r;
  }

  async function run(onlyFailed) {
    const sample = await use('sample');
    if (!sample) { showUnavailable('Marking needs Claude, which isn’t available in this view. Open the Hub in claude.ai while signed in to your Wesley account.'); return; }
    let maxImages = 4;
    try {
      const lim = await sample.limits();
      if (!lim.images) { showUnavailable('This view can’t send images to Claude, so marking isn’t possible here. Try the Hub in claude.ai in a browser.'); return; }
      maxImages = lim.images.maxCount || 4;
    } catch (e) { /* use the default */ }

    const queue = state.students.filter(s => s.pages.length && (onlyFailed ? s.status === 'failed' : s.status !== 'done'));
    if (!queue.length) return;
    state.running = true; state.stopRequested = false;
    let n = 0;
    renderAll();
    for (const s of queue) {
      if (state.stopRequested) break;
      state.ctl = new AbortController();
      s.status = 'marking'; s.error = '';
      $('mk-run-status').textContent = `Marking ${s.name} (${n + 1} of ${queue.length})…`;
      renderRoster();
      try {
        await markStudent(s, sample, maxImages);
        s.status = 'done'; state.exported = false;
        if (!state.selected) state.selected = s.id;
      } catch (e) {
        const code = e && e.code;
        if (code === 'cancelled') { s.status = 'ready'; break; }
        if (HIDE_FEATURE.includes(code)) { s.status = 'ready'; showUnavailable(code === 'not_granted'
          ? 'Claude wasn’t allowed for this page, so marking is off for now. Reload the page to be asked again.'
          : 'Claude isn’t available for this account or view, so marking is off.'); break; }
        s.status = 'failed';
        s.error = code === 'code_unread' ? `Couldn’t read this student’s sheet code${e.seen ? ` (read “${String(e.seen).slice(0, 20)}”)` : ''}. Choose their code below, then press Retry failed.`
          : code === 'not_found' || code === 'incomplete' ? 'This class set couldn’t be loaded. Check your connection, then press Retry failed.'
          : code === 'rate_limited' ? 'Claude is busy or your usage limit was reached. Wait a few minutes, then press Retry failed.'
          : code === 'image_rejected' ? 'A scan couldn’t be read. Try rotating it or re-scanning.'
          : code === 'invalid_json' || code === 'empty_completion' ? 'Claude’s answer came back incomplete. Press Retry failed.'
          : code === 'refused' ? 'Claude declined to mark this scan. Check it is the right file.'
          : 'Something went wrong while marking. Press Retry failed.';
        if (code === 'rate_limited') break;
      }
      n++;
      $('mk-progress').style.transform = 'scaleX(' + (n / queue.length).toFixed(3) + ')';
      renderAll();
    }
    state.running = false; state.ctl = null;
    const failed = state.students.filter(s => s.status === 'failed').length;
    $('mk-run-status').textContent = state.stopRequested ? 'Stopped.' :
      `Done: ${state.students.filter(s => s.status === 'done').length} marked${failed ? `, ${failed} failed` : ''}.`;
    renderAll();
  }

  $('mk-run').addEventListener('click', () => run(false));
  $('mk-retry').addEventListener('click', () => run(true));
  $('mk-stop').addEventListener('click', () => { state.stopRequested = true; if (state.ctl) state.ctl.abort(); });

  // ---------- Review ----------
  const LABEL_OPTS = sel => `<option value=""${sel ? '' : ' selected'}>Choose a label…</option>` +
    C.LABELS.map(l => `<option value="${l.key}"${l.key === sel ? ' selected' : ''}>${esc(l.name)}</option>`).join('');
  const openFlags = s => s.result ? s.result.questions.filter(q => q.please_check && !q.checked).length : 0;
  // Class sets: answers that match another student's version (every student had different numbers).
  function crossNotes(s) {
    if (!s.variantSheet || !s.result) return [];
    const group = state.students.filter(x => x.sheetId === s.sheetId && x.result && x.variantId);
    const notes = C.crossVersionMatches(group.map(x => ({ name: x.name, code: x.variantId,
      answers: Object.fromEntries(x.result.questions.map(q => [q.id, q.student_answer])) })), setVersions(sheetById(s.sheetId)));
    return notes[s.name] || [];
  }
  const talkSigns = s => ((s.result && s.result.conversation_signs) || []).concat(crossNotes(s));

  function renderReview() {
    const marked = state.students.filter(s => s.result);
    if (!marked.length) { $('mk-review').innerHTML = '<p class="note">Results appear here as each student is marked.</p>'; return; }
    if (!marked.some(s => s.id === state.selected)) state.selected = marked[0].id;
    const s = marked.find(x => x.id === state.selected);
    const sheet = studentSheet(s);
    const r = s.result;
    const other = s.mismatch && (s.variantSheet ? setVersions(sheetById(s.sheetId)).find(v => v.id === s.mismatch) : sheetById(s.mismatch));
    $('mk-review').innerHTML = `<div class="review">
      <nav class="stu-list" aria-label="Students">${marked.map(x => `<button class="stu-btn" data-sid="${x.id}" aria-current="${x.id === s.id}">
        <span>${esc(x.name)}</span>${talkSigns(x).length ? '<span class="talkchip" title="Worth a conversation">Talk</span>' : ''}${openFlags(x) ? `<span class="flagcount">⚑ ${openFlags(x)}</span>` : ''}</button>`).join('')}</nav>
      <div class="detail" data-sid="${s.id}">
        <h3>${esc(s.name)} <span class="code note">${esc(sheet.id)}</span>${r.name_on_sheet ? ` <span class="note">· name written on sheet: ${esc(r.name_on_sheet)}</span>` : ''}</h3>
        ${s.mismatch ? `<div class="banner warn">Claude read the sheet code as <b class="code">${esc(s.mismatch)}</b>, but this was marked as ${esc(sheet.id)}.
          ${other ? `<button class="btn small" data-act="remark" data-sheet="${other.id}">Re-mark with ${other.id}</button>` : ''}</div>` : ''}
        ${talkSigns(s).length ? `<div class="banner talk" role="note"><div><b>Worth a conversation</b> <span class="note">· only you see this; it isn’t exported or shown to the student</span>
          <ul>${talkSigns(s).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <span class="note">${crossNotes(s).length
            ? 'Every student had different numbers, so matching answers are a strong sign the work was shared. Compare both students’ scans before deciding, and ask each to explain their working.'
            : 'These are clues, not proof. Neat or advanced work can be completely genuine. The fairest check is a quick, similar question in class.'}</span></div></div>` : ''}
        <div class="scans">${s.halfUrls.map((u, i) => `<button data-act="zoom" data-src="${u}" aria-label="Enlarge scan ${i + 1}"><img src="${u}" alt="Scan section ${i + 1}"></button>`).join('')}</div>
        <div class="qcards">${r.questions.map(q => {
          const sq = sheet.questions.find(x => x.id === q.id);
          const base = `mk-${s.id}-${q.id}`;
          return `<div class="qcard${q.please_check && !q.checked ? ' flagged' : ''}" data-label="${q.label || ''}" data-qid="${q.id}">
            <div class="qcard-top"><span class="qid">${q.id}</span>
              <select id="${base}-label" data-field="label" aria-label="Label for ${q.id}">${LABEL_OPTS(q.label)}</select>
              <span class="note">${esc(C.SECTION_NAMES[sq.section])} · answer: ${sq.key.answer}</span></div>
            ${q.student_answer ? `<div class="wrote">Wrote: ${esc(q.student_answer)}</div>` : ''}
            <textarea id="${base}-fb" data-field="feedback" aria-label="Feedback for ${q.id}" rows="2">${esc(q.feedback)}</textarea>
            ${q.please_check ? `<div class="checkflag">⚑ ${esc(q.check_reason)}
              <label><input type="checkbox" id="${base}-chk" data-field="checked"${q.checked ? ' checked' : ''}> Checked</label></div>` : ''}
          </div>`;
        }).join('')}</div>
        ${r.reflection ? `<p class="note"><b>Reflection:</b> “${esc(r.reflection)}”</p>` : ''}
        <div class="comment-box">
          <h4>Comment for ${esc(s.name.split(' ')[0])}</h4>
          <textarea id="mk-${s.id}-comment" data-field="student_comment" aria-label="Student comment">${esc(r.student_comment)}</textarea>
          <div class="btn-row"><button class="btn small" data-act="copy">Copy comment</button><span class="note" role="status" id="mk-copy-status"></span></div>
          <label class="note" for="mk-${s.id}-tnote">Note for you (not for the student)</label>
          <textarea id="mk-${s.id}-tnote" data-field="teacher_note" rows="1">${esc(r.teacher_note)}</textarea>
        </div>
      </div></div>`;
    if (window.SheetRender) window.SheetRender.typeset($('mk-review'));
  }

  $('mk-review').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('stu-btn')) { state.selected = b.dataset.sid; renderReview(); return; }
    const s = state.students.find(x => x.id === state.selected);
    if (b.dataset.act === 'zoom') openLightbox(b.dataset.src);
    if (b.dataset.act === 'copy') {
      const ta = $(`mk-${s.id}-comment`);
      try { await navigator.clipboard.writeText(ta.value); $('mk-copy-status').textContent = 'Copied.'; }
      catch (err) { ta.focus(); ta.select(); $('mk-copy-status').textContent = 'Selected: press Ctrl+C (or ⌘C).'; }
    }
    if (b.dataset.act === 'remark' && !state.running) {
      if (s.variantSheet) { s.variantId = b.dataset.sheet; s.variantSheet = null; } else s.sheetId = b.dataset.sheet;
      s.status = 'ready'; s.result = null; s.mismatch = null;
      renderAll(); run(false);
    }
  });

  function onEdit(e) {
    const el = e.target; const field = el.dataset && el.dataset.field; if (!field) return;
    const s = state.students.find(x => x.id === state.selected); if (!s || !s.result) return;
    const card = el.closest('.qcard');
    if (card) {
      const q = s.result.questions.find(x => x.id === card.dataset.qid);
      if (field === 'checked') q.checked = el.checked;
      else if (field === 'label') { q.label = el.value || null; card.dataset.label = el.value; if (!q.please_check || q.checked) card.classList.remove('flagged'); }
      else q[field] = el.value;
      if (field === 'checked') { card.classList.toggle('flagged', !q.checked); renderStuFlags(); }
    } else s.result[field] = el.value;
    state.exported = false;
    if (field === 'label' || field === 'checked') renderCounts();
  }
  $('mk-review').addEventListener('input', onEdit);
  $('mk-review').addEventListener('change', e => { if (e.target.matches('select, input[type="checkbox"]')) onEdit(e); });

  function renderStuFlags() {
    document.querySelectorAll('#mk-review .stu-btn').forEach(b => {
      const s = state.students.find(x => x.id === b.dataset.sid); const n = openFlags(s);
      let f = b.querySelector('.flagcount');
      if (n && !f) { f = document.createElement('span'); f.className = 'flagcount'; b.appendChild(f); }
      if (f) { if (n) f.textContent = '⚑ ' + n; else f.remove(); }
    });
  }

  function openLightbox(src) {
    const d = document.createElement('div'); d.className = 'lightbox'; d.tabIndex = -1;
    d.innerHTML = `<img src="${src}" alt="Enlarged scan">`;
    const close = () => { d.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = ev => { if (ev.key === 'Escape') close(); };
    d.addEventListener('click', close); document.addEventListener('keydown', onKey);
    document.body.appendChild(d); d.focus();
  }

  // ---------- Summary + export ----------
  const COLORS = { fully_correct: 'var(--l-full)', mostly_correct: 'var(--l-most)', partially_correct: 'var(--l-part)', incorrect: 'var(--l-inc)', not_attempted: 'var(--l-none)' };

  function renderCounts() {
    const sheet = batchSheet();
    const marked = state.students.filter(s => s.result && s.sheetId === sheet.id);
    if (!marked.length) { $('mk-counts').innerHTML = '<p class="note">The class overview appears once students are marked.</p>'; return; }
    // A differentiated class set gets one table per group, since each group had a different sheet.
    const groupOf = s => (s.variantSheet && s.variantSheet.groupKey) || 'main';
    const keys = sheet.groups ? (sheet.groups.map(g => g.key)).filter(k => marked.some(s => groupOf(s) === k)) : [];
    const tables = keys.length
      ? keys.map(k => { const group = marked.filter(s => groupOf(s) === k); const gs = group[0].variantSheet || sheet; return countsTable(gs, group, `${C.groupName(k)}${gs.groupSheetId ? ` · ${gs.groupSheetId}` : ''}`); })
      : [countsTable(sheet, marked, sheet.id)];
    $('mk-counts').innerHTML = tables.join('');
  }

  function countsTable(sheet, marked, title) {
    const counts = C.labelCounts(sheet, marked);
    return `<div class="table-wrap"><table class="counts"><caption class="note" style="text-align:left">${esc(title)} · ${marked.length} student${marked.length === 1 ? '' : 's'}</caption>
      <thead><tr><th>Question</th><th>Spread</th>${C.LABELS.map(l => `<th title="${esc(l.name)}">${esc(l.name.split(' (')[0])}</th>`).join('')}<th>No label</th></tr></thead>
      <tbody>${sheet.questions.map(q => {
        const c = counts[q.id]; const tot = marked.length || 1;
        return `<tr><td><b>${q.id}</b></td><td><div class="bar">${C.LABELS.map(l => c[l.key] ? `<span style="width:${c[l.key] / tot * 100}%;background:${COLORS[l.key]}" title="${esc(l.name)}: ${c[l.key]}"></span>` : '').join('')}</div></td>
          ${C.LABELS.map(l => `<td>${c[l.key] || ''}</td>`).join('')}<td>${c.unlabelled || ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  $('mk-summary').addEventListener('click', async () => {
    const sheet = batchSheet();
    const marked = state.students.filter(s => s.result && s.sheetId === sheet.id);
    const out = $('mk-summary-out');
    const sample = await use('sample');
    if (!sample || !marked.length) return;
    $('mk-summary').disabled = true; out.innerHTML = '<p class="note">Claude is reading the class results…</p>';
    try {
      const r = await sample.json(C.buildSummaryPrompt(sheet, marked), { modelTier: 'default' });
      const mistakes = Array.isArray(r.common_mistakes) ? r.common_mistakes : [];
      const prios = Array.isArray(r.reteach_priorities) ? r.reteach_priorities : [];
      const similar = C.similarWork(r, sheet, marked);
      const talk = marked.filter(s => talkSigns(s).length);
      out.innerHTML = `<h3 style="margin:8px 0 0">Class summary</h3><p>${esc(r.overview)}</p>
        ${mistakes.length ? `<h4 style="margin:0">Common mistakes</h4><ol>${mistakes.map(m => `<li><b>${esc(m.question)}</b> · ${esc(m.mistake)}${m.students ? ` <span class="note">(${esc(m.students)} students)</span>` : ''}<br><span class="note">Re-teach: ${esc(m.reteach)}</span></li>`).join('')}</ol>` : ''}
        ${prios.length ? `<h4 style="margin:0">Re-teach first</h4><ol>${prios.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
        ${similar.length || talk.length ? `<div class="banner talk" role="note"><div><b>Worth a conversation</b> <span class="note">· only you see this</span>
          ${similar.length ? `<p style="margin:6px 0 0">Similar working:</p><ul>${similar.map(g => `<li><b>${g.names.map(esc).join(', ')}</b>${g.questions.length ? ` (${g.questions.join(', ')})` : ''}: ${esc(g.what)}</li>`).join('')}</ul>` : ''}
          ${talk.length ? `<p style="margin:6px 0 0">Signs noted while marking: ${talk.map(s => esc(s.name)).join(', ')}. Open each student above for details.</p>` : ''}
          <span class="note">Clues, not proof: students who work together or learn the same way can produce similar work honestly.</span></div></div>` : ''}`;
    } catch (e) {
      out.innerHTML = `<p class="note">${e && e.code === 'rate_limited' ? 'Claude is busy or your usage limit was reached. Try again in a few minutes.' : 'The summary didn’t come through. Press the button to try again.'}</p>`;
    }
    $('mk-summary').disabled = false;
  });

  $('mk-export').addEventListener('click', async () => {
    const st = $('mk-export-status');
    const dl = await use('downloads');
    if (!dl) { st.textContent = 'Downloads aren’t available in this view. Open the Hub in claude.ai.'; return; }
    const date = new Date().toISOString().slice(0, 10);
    const ids = [...new Set(state.students.filter(s => s.result).map(s => s.sheetId))];
    try {
      for (const id of ids) {
        const sheet = sheetById(id);
        const rows = state.students.filter(s => s.result && s.sheetId === id).map(s => ({ student: s.name, sheetId: s.variantId || id, result: s.result,
          group: sheet.groups ? C.groupName(s.variantSheet && s.variantSheet.groupKey) : undefined }));
        await dl.save({ filename: `${sheet.isSet ? sheet.setId + ' class set' : id} homework feedback ${date}.csv`, data: C.toCSV(sheet, rows) });
      }
      state.exported = true; st.textContent = 'Saved. Open it in Excel, or copy comments into WiSE.';
    } catch (e) {
      st.textContent = e && e.code === 'declined' ? 'Download cancelled.' : 'The download didn’t work. Please try again.';
    }
  });

  window.addEventListener('beforeunload', e => { if (!state.exported) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Render all ----------
  function renderAll() {
    renderRoster(); renderReview(); renderCounts();
    const any = state.students.some(s => s.pages.length);
    const marked = state.students.some(s => s.result);
    $('mk-run').disabled = state.running || !any || !state.students.some(s => s.status !== 'done');
    $('mk-run').textContent = marked ? 'Mark remaining' : 'Mark class';
    $('mk-stop').hidden = !state.running;
    $('mk-retry').hidden = state.running || !state.students.some(s => s.status === 'failed');
    $('mk-summary').disabled = state.running || !marked;
    $('mk-export').disabled = !marked;
  }

  // ---------- Init ----------
  // Course dropdown, then the sheets for that course (saved Redo versions listed after their original).
  function renderSheetOptions() {
    const yrs = [...new Set(SHEETS.map(s => String(s.plannerYear || 2026)))].sort();
    const keepYear = yrs.includes($('mk-year').value) ? $('mk-year').value : (yrs.includes(String(new Date().getFullYear())) ? String(new Date().getFullYear()) : yrs.slice(-1)[0]);
    $('mk-year').innerHTML = yrs.map(y => `<option value="${y}">${y}</option>`).join('');
    $('mk-year').value = keepYear;
    const inYear = SHEETS.filter(s => String(s.plannerYear || 2026) === keepYear);
    const courses = C.COURSE_ORDER.filter(c => inYear.some(s => s.course === c));
    const keepCourse = courses.includes($('mk-course').value) ? $('mk-course').value : (courses.includes('Y7') ? 'Y7' : courses[0]);
    const keepSheet = $('mk-sheet').value;
    $('mk-course').innerHTML = courses.map(c => `<option value="${c}">${esc(C.COURSE_NAMES[c])}</option>`).join('');
    $('mk-course').value = keepCourse;
    const key = s => { const m = s.id.match(/-T(\d)-(?:W(\d+)|R([A-Z]))(?:-v(\d+))?/) || []; return (+m[1] || 0) * 1e4 + (m[2] ? +m[2] : 5) * 100 + (m[3] ? m[3].charCodeAt(0) - 64 : 0) * 10 + (+m[4] || 0); };
    const sheets = inYear.filter(s => s.course === keepCourse).sort((a, b) => key(a) - key(b));
    // Each sheet is followed by any class sets made from it.
    const list = sheets.flatMap(s => [s, ...SET_SHEETS.filter(x => x.baseId === s.id).sort((a, b) => a.letter.localeCompare(b.letter))]);
    $('mk-sheet').innerHTML = list.map(s => s.isSet
      ? `<option value="${esc(s.id)}">${esc(s.baseId)} · Class set ${esc(s.letter)}${s.label ? ' (' + esc(s.label) + ')' : ''} · ${s.count} students</option>`
      : `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.title)}${s.base ? ' (saved version)' : ''}</option>`).join('');
    if (list.some(s => s.id === keepSheet)) $('mk-sheet').value = keepSheet;
  }

  function setSheets(sheets) {
    SHEETS = sheets;
    renderSheetOptions();
  }

  function setClassSets(list) {
    SET_SHEETS = list;
    renderSheetOptions();
  }

  // Loads a chosen class set's versions early, so code dropdowns are ready before marking.
  function prefetchSet() {
    const sh = batchSheet();
    if (sh && sh.isSet && window.ClassSets && !window.ClassSets.cached(sh.setId)) window.ClassSets.load(sh.setId).then(renderAll, () => {});
  }

  function init(sheets) {
    SHEETS = sheets;
    renderSheetOptions();
    $('mk-year').addEventListener('change', () => { $('mk-sheet').value = ''; renderSheetOptions(); $('mk-sheet').dispatchEvent(new Event('change')); });
    $('mk-course').addEventListener('change', () => { $('mk-sheet').value = ''; renderSheetOptions(); $('mk-sheet').dispatchEvent(new Event('change')); });
    $('mk-sheet').addEventListener('change', () => {
      for (const s of state.students) if (!s.result) { s.sheetId = batchSheet().id; s.variantId = null; s.variantSheet = null; }
      prefetchSet();
      renderAll();
    });
    $('mk-legend').innerHTML = C.LABELS.map(l => `<span class="chip ${l.key}">${l.short} ${esc(l.name)}</span>`).join('');
    const input = $('mk-files');
    input.addEventListener('change', () => { if (input.files.length) addFiles([...input.files]); input.value = ''; });
    const drop = $('mk-drop');
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]); });
    if (!window.JSZip || !window.pdfjsLib) $('mk-load-status').textContent = 'The file readers didn’t load. Check your connection and reload the page.';
    renderAll();
    // Tell the teacher early if Claude can't run here (no prompt is shown by this check).
    use('sample').then(sm => { if (!sm) showUnavailable('Marking needs Claude, which isn’t available in this view. Open the Hub in claude.ai while signed in. The sheets and guide still work.'); });
  }

  window.Marking = { init, setSheets, setClassSets, _state: state, _addFiles: addFiles, _run: run };
})();
