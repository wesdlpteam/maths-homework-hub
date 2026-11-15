/* Student Guide: how to scan and upload homework. Rendered in the Hub and printed to a one-page PDF.
   guideText() gives the same steps as plain text for pasting into WiSE. */
(function () {
  'use strict';

  const STEPS = [
    { title: 'Finish both sides', text: 'Use dark pen or pencil. Keep your working inside each question’s box.' },
    { title: 'Set up', text: 'Put the sheet on a flat, plain surface in good light. Avoid shadows from your phone or hand.' },
    { title: 'Open a scanner app', text: 'OneDrive app → <b>Scan</b> (the camera button), or iPhone <b>Notes</b> → paperclip/camera → <b>Scan Documents</b>, or Android <b>Google Drive</b> → <b>+</b> → <b>Scan</b>.' },
    { title: 'Scan front, then back', text: 'Scan side 1, then add side 2, so you have <b>one file with 2 pages</b>. The whole page must be in frame, including the sheet code in the top corner.' },
    { title: 'Check it', text: 'Zoom in. Can you read every number? If it is blurry, dark or cut off, scan it again.' },
    { title: 'Save as a PDF', text: 'Name it <b>Surname Firstname – sheet code</b>, for example <i>Nguyen Linh – Y10S-T4-RA</i>.' },
    { title: 'Upload to WiSE', text: 'Open your maths class, find this homework’s <b>assessment task</b>, upload the PDF and press Submit before the due date.' },
  ];

  const plain = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

  function guideText() {
    return 'How to scan and upload your maths homework\n\n' +
      STEPS.map((s, i) => `${i + 1}. ${s.title}: ${plain(s.text)}`).join('\n') +
      '\n\nTip: your teacher’s feedback depends on being able to read your working, so a clear scan matters.';
  }

  // Three small phone-screen sketches: one good scan, two common problems.
  function exampleSvg() {
    const page = (x, extra) => `<g transform="translate(${x},0)">
      <rect x="0" y="0" width="92" height="150" rx="12" class="g-phone"/>
      <g clip-path="url(#scr${x})"><rect x="6" y="14" width="80" height="122" class="g-screen"/>${extra}</g>
      <clipPath id="scr${x}"><rect x="6" y="14" width="80" height="122"/></clipPath></g>`;
    const lines = (dx, dy, rot) => `<g transform="translate(${dx},${dy}) rotate(${rot || 0} 46 75)">
      <rect x="14" y="22" width="64" height="104" class="g-paper"/>
      <rect x="58" y="26" width="17" height="6" class="g-code"/>
      ${[40, 52, 64, 76, 88, 100, 112].map(y => `<line x1="20" y1="${y}" x2="${y % 24 ? 70 : 58}" y2="${y}" class="g-ink"/>`).join('')}</g>`;
    return `<svg viewBox="0 0 330 186" class="guide-art" role="img" aria-label="Examples: a good scan, a scan with the page cut off, and a tilted scan with a shadow">
      ${page(0, lines(0, 0))}
      ${page(118, lines(16, -18))}
      ${page(236, lines(-4, 2, 9) + '<path d="M6 14 L60 14 L36 136 L6 136 Z" class="g-shadow"/>')}
      <text x="46" y="170" class="g-ok">✓ Good</text><text x="46" y="183" class="g-cap">flat, whole page, bright</text>
      <text x="164" y="170" class="g-bad">✗ Cut off</text><text x="164" y="183" class="g-cap">sheet code missing</text>
      <text x="282" y="170" class="g-bad">✗ Tilted, shadow</text><text x="282" y="183" class="g-cap">hard to read</text>
    </svg>`;
  }

  function renderGuide(el) {
    el.innerHTML = `<article class="guide">
      <header class="guide-head">
        <img src="assets/wesley-logo.png" alt="Wesley College" class="guide-crest">
        <div><div class="guide-eyebrow">Mathematics · Homework</div>
        <h2 class="guide-title">How to scan and upload your homework</h2>
        <p class="guide-lede">Your teacher checks your working, not just your answers, so a clear scan matters. It takes about two minutes.</p></div>
      </header>
      <ol class="guide-steps">${STEPS.map(s => `<li><h3>${s.title}</h3><p>${s.text}</p></li>`).join('')}</ol>
      <figure class="guide-fig">${exampleSvg()}</figure>
      <p class="guide-foot">Stuck? Talk to your maths teacher before the due date. A photo of each side is accepted if scanning is not possible, but one PDF is best.</p>
    </article>`;
  }

  window.Guide = { renderGuide, guideText, STEPS };
})();
