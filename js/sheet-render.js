/* Renders a sheet object into a printable two-sided A4 sheet, or into a teacher answer key.
   Depends on: HubCore (core.js), KaTeX + auto-render (optional; maths is left as text without it). */
(function () {
  'use strict';
  const C = window.HubCore;
  const DOTS = { 1: '●', 2: '●●', 3: '●●●' };
  const LOGO = 'assets/wesley-logo.png';

  const MONEY = '';   // stands in for a money $ while the maths is typeset

  function textNodes(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!(n.parentElement && n.parentElement.closest('.katex'))) nodes.push(n);
    return nodes;
  }

  function typeset(el) {
    if (typeof window.renderMathInElement !== 'function') return;
    // Money ($8.50, written \$8.50) is hidden from the typesetter so it can't pair with a real
    // maths $ further along and swallow the sentence.
    textNodes(el).forEach(n => {
      if (!n.nodeValue.includes('$')) return;
      n.nodeValue = C.splitMaths(n.nodeValue)
        .map(p => (p.math ? (p.display ? `$$${p.text}$$` : `$${p.text}$`) : p.text.split('\\$').join(MONEY))).join('');
    });
    window.renderMathInElement(el, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
      throwOnError: false,
    });
    textNodes(el).forEach(n => {
      if (n.nodeValue.includes(MONEY) || n.nodeValue.includes('\\$')) n.nodeValue = n.nodeValue.split(MONEY).join('$').split('\\$').join('$');
    });
  }

  // Blank coordinate grid for sketching: x and y from −3 to 5.
  function gridSvg() {
    const min = -3, max = 5, u = 22, pad = 14, n = max - min;
    const size = n * u + pad * 2;
    const X = v => pad + (v - min) * u, Y = v => pad + (max - v) * u;
    let s = `<svg viewBox="0 0 ${size} ${size}" class="diagram grid-svg" role="img" aria-label="Coordinate grid for sketching">`;
    for (let v = min; v <= max; v++) {
      s += `<line class="gridline" x1="${X(v)}" y1="${Y(min)}" x2="${X(v)}" y2="${Y(max)}"/>`;
      s += `<line class="gridline" x1="${X(min)}" y1="${Y(v)}" x2="${X(max)}" y2="${Y(v)}"/>`;
    }
    s += `<line class="axis" x1="${X(min)}" y1="${Y(0)}" x2="${X(max)}" y2="${Y(0)}"/><line class="axis" x1="${X(0)}" y1="${Y(min)}" x2="${X(0)}" y2="${Y(max)}"/>`;
    for (let v = min; v <= max; v++) {
      if (v === 0) continue;
      s += `<text class="tick" x="${X(v)}" y="${Y(0) + 10}">${v}</text>`;
      s += `<text class="tick" x="${X(0) - 7}" y="${Y(v) + 3}">${v}</text>`;
    }
    s += `<text class="lbl" x="${X(max) + 3}" y="${Y(0) + 4}">x</text><text class="lbl" x="${X(0) + 4}" y="${Y(max) - 3}">y</text>`;
    return s + '</svg>';
  }

  function questionHTML(q) {
    const svg = q.svg === 'GRID' ? gridSvg() : (q.svg || '');
    const parts = Array.isArray(q.parts) && q.parts.length
      ? `<ol class="q-parts">${q.parts.map(p => `<li><b>(${p.label})</b>${p.prompt}</li>`).join('')}</ol>` : '';
    const sideSvg = q.span === 2 && svg;
    const text = `<p class="q-prompt">${q.prompt}</p>${parts}`;
    const body = sideSvg
      ? `<div class="q-body side-svg"><div class="q-body">${text}<div class="work"></div></div>${svg}</div>`
      : `<div class="q-body">${text}${svg}<div class="work"></div></div>`;
    const recall = q.section === 'recall'
      ? `<span class="tag-recall">Recall</span>${q.recall_from ? `<span class="recall-from">${q.recall_from}</span>` : ''}` : '';
    return `<article class="q span-${q.span || 1} space-${q.space || 'M'}${q.section === 'recall' ? ' is-recall' : ''}" data-q="${q.id}">
      <div class="q-head"><span class="qnum">${q.num}</span><span class="lvl" title="Level ${q.level}">${DOTS[q.level]}</span>${recall}</div>
      ${body}</article>`;
  }

  // Questions are laid out in rows: two half-width questions, or one full-width question.
  // Rows share the spare height so working spaces grow; section bands stay their natural size.
  // Recall questions carry their own gold tag instead of a band, so they can share a row with any section.
  function gridHTML(qs) {
    const rows = [];
    let row = [];
    qs.forEach(q => {
      if (q.span === 2) { if (row.length) rows.push(row); rows.push([q]); row = []; }
      else { row.push(q); if (row.length === 2) { rows.push(row); row = []; } }
    });
    if (row.length) rows.push(row);
    let html = '', last = null;
    for (const r of rows) {
      const main = (r.find(q => q.section !== 'recall') || {}).section;
      if (main && main !== last) {
        const codes = [...new Set(qs.filter(x => x.section === main).flatMap(x => x.ac9 || []))];
        html += `<div class="sec-band"><span>${C.SECTION_NAMES[main]}</span><span class="ac9">${codes.join(' · ')}</span></div>`;
        last = main;
      }
      html += `<div class="qrow">${r.map(questionHTML).join('')}</div>`;
    }
    return `<div class="qgrid">${html}</div>`;
  }

  function codeBox(sheet, small) {
    return `<div class="sh-code"><b>${sheet.id}</b>${small ? '' : '<small>Sheet code — keep visible when scanning</small>'}</div>`;
  }

  const HANDIN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><circle cx="12" cy="12" r="3.2"/><path d="M10 5h4"/></svg>';

  function sheetHTML(sheet) {
    C.prepareSheet(sheet);
    const inHalf = (p, h) => sheet.questions.filter(q => q.page === p && q.half === h);
    // A differentiated group's sheet comes from another course but shows the class's year and weeks.
    const shown = sheet.show || sheet;
    const header = `<header class="sh-head">
        <img class="sh-crest" src="${LOGO}" alt="Wesley College">
        <div><div class="sh-school">Year ${shown.year}${shown.stream ? " " + shown.stream : ""}${/Mathematic/.test(shown.stream || "") ? "" : " Mathematics"} · Homework</div>
          <h1 class="sh-title">${sheet.title}</h1>
          <div class="sh-meta">Weeks ${shown.weeks}${sheet.show ? '' : ` · Textbook ${sheet.sections_covered}`}${sheet.classLabel ? ` · Class ${sheet.classLabel}` : ''}</div></div>
        ${codeBox(sheet)}
      </header>
      <div class="sh-fields"><span>Name:</span><span>Class:</span><span>Due:</span></div>
      <div class="sh-legend"><span><span class="lvl">●</span>Getting started</span><span><span class="lvl">●●</span>Building</span><span><span class="lvl">●●●</span>Extending</span><span>Show all working — it is checked, not just the answer.</span></div>`;
    const run = `<div class="sh-run"><span>Name: ____________________________</span><span>Side 2</span>${codeBox(sheet, true)}</div>`;
    const reflect = `<div class="reflect"><b>Reflection:</b> Which question was hardest, and why?</div>`;
    const handin = `<div class="handin">${HANDIN_ICON}<div><b>How to hand in:</b> Scan both sides in order (front, then back) as <b>one PDF</b> with a phone scanner app. Upload it to this homework’s task in <b>WiSE</b> by the due date. Full steps are in the Student Guide.</div></div>`;

    return `<div class="sheet" data-sheet="${sheet.id}">
      <section class="sheet-side" data-page="1">
        <div class="half top">${header}${gridHTML(inHalf(1, 'top'))}</div>
        <div class="half bottom">${gridHTML(inHalf(1, 'bottom'))}${handin}</div>
      </section>
      <section class="sheet-side" data-page="2">
        <div class="half top">${run}${gridHTML(inHalf(2, 'top'))}</div>
        <div class="half bottom">${gridHTML(inHalf(2, 'bottom'))}${reflect}</div>
      </section></div>`;
  }

  function renderSheet(sheet, el) {
    el.innerHTML = sheetHTML(sheet);
    typeset(el);
  }

  function li(arr) {
    return Array.isArray(arr) && arr.length ? `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p>—</p>';
  }

  function renderAnswerKey(sheet, el) {
    const qs = sheet.questions.map(q => `<section class="key-q">
      <h3>${q.id} · ${C.SECTION_NAMES[q.section]} ${DOTS[q.level]}</h3>
      <div class="ans">${q.key.answer}</div>
      <div class="lbl">Worked solution</div><div>${q.key.working}</div>
      ${q.key.accept && q.key.accept.length ? `<div class="lbl">Also accept</div>${li(q.key.accept)}` : ''}
      <div class="lbl">Look for</div>${li(q.key.look_for)}
      <div class="lbl">Common errors</div>${li(q.key.common_errors)}
    </section>`).join('');
    el.innerHTML = `<div class="key"><h2>Answer key · ${sheet.id}</h2><p>${sheet.title} · Teacher use only</p>${qs}</div>`;
    typeset(el);
  }

  // One-page grid of every student's final answers in a class set, for quick checking.
  function renderAnswerGrid(sheets, el, title) {
    const qs = (sheets[0] && sheets[0].questions) || [];
    const grouped = sheets.some(s => s.groupKey && s.groupKey !== 'main');
    const group = s => (grouped ? `<td>${C.groupName(s.groupKey)}${s.groupSheetId ? `<br><small>${s.groupSheetId}</small>` : ''}</td>` : '');
    el.innerHTML = `<div class="key"><h2>Answer grid · ${title}</h2><p>Each student has different numbers.${grouped ? ' Students in a differentiated group have a different sheet, named under their group.' : ''} Full worked solutions for every student follow. Teacher use only.</p>
      <table class="tw answer-grid"><thead><tr><th>Student code</th>${grouped ? '<th>Group</th>' : ''}${qs.map(q => `<th>${q.id}</th>`).join('')}</tr></thead>
      <tbody>${sheets.map(s => `<tr><td class="code">${s.id.split('-').pop()}</td>${group(s)}${s.questions.map(q => `<td>${q.key.answer}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    typeset(el);
  }

  // Problems that would spoil a printed sheet: maths that fails to render, or content
  // spilling out of its box or half-page. Call after renderSheet (fonts loaded).
  function layoutProblems(root) {
    const out = [];
    root.querySelectorAll('.katex-error').forEach(e => out.push(`Maths could not be displayed: ${e.textContent.slice(0, 60)}`));
    root.querySelectorAll('.half').forEach(h => {
      if (h.scrollHeight > h.clientHeight + 1) out.push('A half-page is overfull.');
    });
    root.querySelectorAll('.q').forEach(q => {
      if (q.scrollHeight > q.clientHeight + 1) out.push(`${q.dataset.q} does not fit in its box.`);
      const w = q.querySelector('.work');
      if (w && w.getBoundingClientRect().height < 12 * 3.78) out.push(`${q.dataset.q} leaves too little working space.`);
    });
    return [...new Set(out)];
  }

  window.SheetRender = { renderSheet, renderAnswerKey, renderAnswerGrid, gridSvg, typeset, layoutProblems, sheetHTML };
})();
