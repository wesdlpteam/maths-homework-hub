/* Hub shell: tabs, course/term library, previews, downloads, Student Guide.
   Exposes window.Hub so redo.js (versions and drafts) and marking.js can share the sheet list. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.HubCore;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASE = (window.HUB_SHEETS || []).map(C.prepareSheet);
  BASE.forEach(s => { s.plannerYear = s.plannerYear || 2026; });
  let LIBRARY = [];               // new-year sheets built in the Year rollover tab (shared database)
  let VERSIONS = [];
  let selectWhenReady = null;   // a just-saved version to open once it arrives from the shared store
  const PDF = {
    sheet: id => `print/${id}.pdf`,
    key: id => `print/${id}-answer-key.pdf`,
    guide: 'print/Student-Guide-scan-and-upload.pdf',
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  // Week position for sorting: Y8-T2-W5 -> 205; pilot revision sheets sit at week 5.
  const order = s => { const m = s.id.match(/-T(\d)-(?:W(\d+)|R([A-Z]))/) || []; return (+m[1] || 0) * 100 + (m[2] ? +m[2] : 5) + (m[3] ? (m[3].charCodeAt(0) - 64) / 10 : 0); };
  const allSheets = () => BASE.concat(LIBRARY, VERSIONS);
  const years = () => [...new Set(BASE.concat(LIBRARY).map(s => String(s.plannerYear)))].sort();
  const yearSheets = () => BASE.concat(LIBRARY).filter(s => String(s.plannerYear) === String(year));
  const coursesFor = () => C.COURSE_ORDER.filter(c => yearSheets().some(s => s.course === c));
  const printable = s => !!(s && (s.base || s.generated));
  const byId = id => allSheets().find(s => s.id === id);
  const versionsOf = id => VERSIONS.filter(v => v.base === id).sort((a, b) => a.version - b.version);

  // ---------- Tabs ----------
  const tabs = ['sheets', 'guide', 'marking', 'rollover'];
  function showTab(name) {
    for (const t of tabs) {
      $('tab-' + t).setAttribute('aria-selected', String(t === name));
      $('panel-' + t).hidden = t !== name;
    }
    store.set('hub-tab', name);
    if (name === 'sheets') fitPreview();
  }
  tabs.forEach(t => $('tab-' + t).addEventListener('click', () => showTab(t)));
  document.querySelector('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex(t => $('tab-' + t).getAttribute('aria-selected') === 'true');
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    showTab(next); $('tab-' + next).focus();
  });

  // ---------- Downloads ----------
  let downloadsP = null;
  const downloads = () => (downloadsP = downloadsP || (window.claude && window.claude.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null)));
  async function saveData(filename, data, toastEl) {
    try {
      const dl = await downloads();
      if (!dl) { toastEl.textContent = 'Downloads aren’t available in this view. Open the Hub in claude.ai, or use the PDFs in the shared “hub/print” folder.'; return; }
      await dl.save({ filename, data });
      toastEl.textContent = `Saved ${filename}.`;
    } catch (e) {
      toastEl.textContent = e && e.code === 'declined' ? 'Download cancelled.' : 'That download didn’t work. Please try again.';
    }
  }
  async function saveFile(path, filename, toastEl) {
    toastEl.textContent = 'Preparing…';
    try { await saveData(filename, await (await fetch(path)).blob(), toastEl); }
    catch (e) { toastEl.textContent = 'That file couldn’t be loaded. Please try again.'; }
  }

  // ---------- Library ----------
  let year = years().includes(String(new Date().getFullYear())) ? String(new Date().getFullYear()) : years().slice(-1)[0];
  let course = 'Y7';   // always opens on Year 7
  let term = 'all';
  let current = null;
  let draft = null;
  let view = 'sheet';

  function renderSelectors() {
    $('year').innerHTML = years().map(y => `<option value="${y}">${y}</option>`).join('');
    $('year').value = year;
    const cs = coursesFor();
    if (!cs.includes(course)) course = cs.includes('Y7') ? 'Y7' : cs[0];
    $('course').innerHTML = cs.map(c => `<option value="${c}">${esc(C.COURSE_NAMES[c])}</option>`).join('');
    $('course').value = course;
  }
  renderSelectors();
  $('year').addEventListener('change', () => {
    year = $('year').value; term = 'all'; draft = null; $('draft-banner').hidden = true;
    renderSelectors(); renderFilters(); renderList(true);
  });
  $('course').addEventListener('change', () => {
    course = $('course').value; term = 'all';
    draft = null; $('draft-banner').hidden = true;
    renderFilters(); renderList(true);
  });

  function renderFilters() {
    const terms = [...new Set(yearSheets().filter(s => s.course === course).map(s => s.term))].sort();
    $('term-chips').innerHTML = ['all', ...terms].map(t =>
      `<button data-term="${t}" aria-pressed="${String(t) === String(term)}">${t === 'all' ? 'All' : (/^Y9M/.test(course) ? 'Module ' : 'Term ') + t}</button>`).join('');
  }
  $('term-chips').addEventListener('click', e => {
    const b = e.target.closest('button[data-term]'); if (!b) return;
    term = b.dataset.term; draft = null; $('draft-banner').hidden = true;
    renderFilters(); renderList(true);
  });

  function listed() {
    return yearSheets().filter(s => s.course === course && (term === 'all' || String(s.term) === String(term))).sort((a, b) => order(a) - order(b));
  }

  function renderList(selectFirst) {
    const items = listed();
    if (selectFirst || !current || !items.some(s => s.id === (current.base || current.id))) current = items[0] || null;
    const curBase = current && (current.base || current.id);
    $('sheet-list').innerHTML = items.length ? items.map(s => {
      const vs = versionsOf(s.id);
      return `<div class="sheet-card" role="button" tabindex="0" data-id="${s.id}" aria-pressed="${s.id === curBase && !current.base}">
        <span class="code">${esc(s.id)}</span><span class="t">${esc(s.title)}</span>
        <span class="m">Term ${s.term} · weeks ${esc(s.weeks)} · ${esc(s.sections_covered)}</span>
        ${vs.length ? `<span class="versions">${vs.map(v => `<button class="vchip" data-id="${esc(v.id)}" aria-pressed="${current.id === v.id}" title="Saved version">v${v.version}</button>`).join('')}</span>` : ''}
      </div>`;
    }).join('') : '<p class="note">No sheets for this course and term yet.</p>';
    renderPreview();
  }

  $('sheet-list').addEventListener('click', e => {
    const chip = e.target.closest('.vchip');
    const card = e.target.closest('.sheet-card');
    if (!chip && !card) return;
    draft = null; $('draft-banner').hidden = true;  // switching sheets discards an unsaved draft
    current = byId(chip ? chip.dataset.id : card.dataset.id);
    renderList(false);
  });
  $('sheet-list').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sheet-card')) { e.preventDefault(); e.target.click(); }
  });

  function fitPreview() {
    const sheetEl = $('preview').querySelector('.sheet');
    if (!sheetEl) return;
    const z = Math.min(1, ($('desk').clientWidth - 32) / 794);
    sheetEl.style.setProperty('--z', z > 0 ? z.toFixed(3) : 1);
  }

  function renderPreview() {
    const shown = draft ? draft.sheet : current;
    if (!shown) { $('preview').innerHTML = ''; $('preview-title').textContent = 'No sheet'; return; }
    $('preview-title').textContent = shown.title;
    $('preview-meta').textContent = draft ? draft.meta || 'Draft based on ' + current.id :
      current.base ? `Saved version ${current.version} of ${current.base}` + (current.createdAt ? ` · ${new Date(current.createdAt).toLocaleDateString('en-AU')}` : '')
      : current.generated ? `${C.COURSE_NAMES[current.course]} · ${current.plannerYear} · Term ${current.term}` + (current.source ? ` · based on ${current.source}` : ' · written by Claude')
      : `${C.COURSE_NAMES[current.course]} · Term ${current.term}`;
    $('view-sheet').setAttribute('aria-pressed', String(view === 'sheet'));
    $('view-key').setAttribute('aria-pressed', String(view === 'key'));
    if (view === 'sheet') {
      SheetRender.renderSheet(shown, $('preview'));
      if (draft) draft.newIds.forEach(id => { const el = $('preview').querySelector(`.q[data-q="${id}"]`); if (el) el.classList.add('is-new'); });
      fitPreview();
    } else {
      $('preview').innerHTML = '<div class="key-paper"></div>';
      SheetRender.renderAnswerKey(shown, $('preview').firstChild);
    }
    $('dl-sheet').disabled = $('dl-key').disabled = !!draft;
    $('dl-sheet').textContent = printable(current) ? 'Download sheet (printable page)' : 'Download sheet PDF';
    $('dl-key').textContent = printable(current) ? 'Download answer key (printable page)' : 'Download answer key PDF';
    if (window.Redo) window.Redo.onSelect(shown, !!draft);
    if (window.ClassSets) window.ClassSets.onSelect(current);
  }

  $('view-sheet').addEventListener('click', () => { view = 'sheet'; renderPreview(); });
  $('view-key').addEventListener('click', () => { view = 'key'; renderPreview(); });
  $('dl-sheet').addEventListener('click', () => {
    if (printable(current)) window.Redo.downloadPrintable(current, 'sheet', $('dl-toast'));
    else saveFile(PDF.sheet(current.id), `${current.id} ${current.title.split(':')[0]}.pdf`, $('dl-toast'));
  });
  $('dl-key').addEventListener('click', () => {
    if (printable(current)) window.Redo.downloadPrintable(current, 'key', $('dl-toast'));
    else saveFile(PDF.key(current.id), `${current.id} answer key.pdf`, $('dl-toast'));
  });
  window.addEventListener('resize', fitPreview);

  // ---------- Guide ----------
  Guide.renderGuide($('guide-preview'));
  $('guide-text').value = Guide.guideText();
  $('dl-guide').addEventListener('click', () => saveFile(PDF.guide, 'How to scan and upload your homework.pdf', $('guide-toast')));
  $('copy-guide').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(Guide.guideText());
      $('guide-toast').textContent = 'Copied. Paste it into your WiSE post.';
    } catch (e) {
      $('guide-text').focus(); $('guide-text').select();
      $('guide-toast').textContent = 'Copy is blocked here. The text is selected: press Ctrl+C (or ⌘C).';
    }
  });

  // ---------- Shared API for redo.js and marking.js ----------
  window.Hub = {
    allSheets, byId, saveData, esc,
    current: () => current,
    draft: () => draft,
    setLibrary(list) {
      LIBRARY = list.map(C.prepareSheet);
      if (current && current.generated && !byId(current.id)) current = null;
      renderSelectors(); renderFilters(); renderList(!current);
      if (window.Marking) window.Marking.setSheets(allSheets());
      if (window.ClassSets) window.ClassSets.pushToMarking();
    },
    setVersions(list) {
      VERSIONS = list.map(C.prepareSheet);
      VERSIONS.forEach(v => { const b = BASE.concat(LIBRARY).find(s => s.id === v.base); v.plannerYear = b ? b.plannerYear : 2026; });
      if (current && current.base && !byId(current.id)) current = byId(current.base);
      if (selectWhenReady && byId(selectWhenReady)) { const id = selectWhenReady; selectWhenReady = null; window.Hub.select(id); }
      else renderList(false);
      if (window.Marking) window.Marking.setSheets(allSheets());
      if (window.ClassSets) window.ClassSets.pushToMarking();
    },
    showDraft(sheet, newIds, meta) { draft = { sheet: C.prepareSheet(sheet), newIds, meta }; if (!meta) view = 'sheet'; renderPreview(); },
    clearDraft() { draft = null; $('draft-banner').hidden = true; renderPreview(); },
    selectWhenAvailable(id) { if (byId(id)) window.Hub.select(id); else selectWhenReady = id; },
    select(id) {
      const s = byId(id); if (!s) return;
      year = String(s.plannerYear || year); course = s.course; term = 'all'; current = s;
      renderSelectors(); renderFilters(); renderList(false);
    },
  };

  // ---------- Start ----------
  renderFilters();
  renderList(true);
  let start = store.get('hub-tab') || 'sheets';
  if (['#marking', '#guide', '#sheets'].includes(location.hash)) start = location.hash.slice(1);
  showTab(tabs.includes(start) ? start : 'sheets');
  if (window.Marking) window.Marking.init(allSheets());
})();
