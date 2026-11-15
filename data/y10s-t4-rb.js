/* Year 10 Standard · Term 4 · Weeks 4.5–4.6 · Exam Revision B (Geometry, statistics and probability).
   Original questions written for Cambridge EMAC 10 sections 2A–2E, 9A–9I, 8A–8H. */
(function (sheet) {
  if (typeof module === 'object' && module.exports) module.exports = sheet;
  else (window.HUB_SHEETS = window.HUB_SHEETS || []).push(sheet);
})((function () {
  // Two horizontal box plots on a shared scale (40–90).
  function boxplots(rows) {
    const x = v => 70 + (v - 40) * 3.6;
    let s = '<svg viewBox="0 0 260 110" class="diagram" role="img" aria-label="Box plots of test results for Class A and Class B">';
    rows.forEach((r, i) => {
      const y = 22 + i * 38;
      s += `<text x="4" y="${y + 4}" class="lbl">${r.name}</text>`;
      s += `<line x1="${x(r.v[0])}" y1="${y}" x2="${x(r.v[1])}" y2="${y}"/><line x1="${x(r.v[3])}" y1="${y}" x2="${x(r.v[4])}" y2="${y}"/>`;
      s += `<line x1="${x(r.v[0])}" y1="${y - 6}" x2="${x(r.v[0])}" y2="${y + 6}"/><line x1="${x(r.v[4])}" y1="${y - 6}" x2="${x(r.v[4])}" y2="${y + 6}"/>`;
      s += `<rect x="${x(r.v[1])}" y="${y - 10}" width="${x(r.v[3]) - x(r.v[1])}" height="20" fill="none"/>`;
      s += `<line x1="${x(r.v[2])}" y1="${y - 10}" x2="${x(r.v[2])}" y2="${y + 10}"/>`;
    });
    s += `<line x1="${x(40)}" y1="92" x2="${x(90)}" y2="92"/>`;
    for (let v = 40; v <= 90; v += 5) {
      s += `<line x1="${x(v)}" y1="92" x2="${x(v)}" y2="${v % 10 ? 95 : 97}"/>`;
      if (v % 10 === 0) s += `<text x="${x(v)}" y="107" class="tick">${v}</text>`;
    }
    return s + '</svg>';
  }



  return {
    id: 'Y10S-T4-RB', pilot: true, course: 'Y10S', revision: true,
    year: '10', stream: 'Standard', term: 4, weeks: '4.5–4.6',
    title: 'Exam Revision B: Geometry, statistics and probability',
    sections_covered: '9D–9E · 8D · 2E · 8G–8H',
    ac9: ['AC9M10ST02', 'AC9M10ST04', 'AC9M10P01', 'AC9M10M05', 'AC9M10SP01'],
    questions: [
      {
        id: 'Q1', num: 1, section: 'fluency', level: 1, page: 1, half: 'top', span: 1, space: 'M', ac9: ['AC9M10ST02'],
        prompt: 'For the data set $3,\\ 5,\\ 6,\\ 6,\\ 8,\\ 11,\\ 17$ find the:',
        parts: [{ label: 'a', prompt: 'mean' }, { label: 'b', prompt: 'median' }, { label: 'c', prompt: 'range' }],
        key: {
          answer: '(a) 8 (b) 6 (c) 14',
          verify: ["[3, 5, 6, 6, 8, 11, 17].reduce((a, b) => a + b)/7 === 8","17 - 3 === 14"],
          accept: [],
          working: '(a) Sum $= 56$, $56 \\div 7 = 8$. (b) Middle (4th) value $= 6$. (c) $17 - 3 = 14$.',
          look_for: ['Correct sum 56 divided by 7', 'Picks the 4th value as median', 'Max − min'],
          common_errors: ['Dividing by 6', 'Median given as the mode or the middle of the range', 'Range given as "3–17"'],
        },
      },
      {
        id: 'Q2', num: 2, section: 'fluency', level: 2, page: 1, half: 'top', span: 1, space: 'M', ac9: ['AC9M10ST04', 'AC9M10P01'],
        prompt: 'The two-way table shows 50 Year 10 students.<table class="tw"><tr><th></th><th>Left-handed</th><th>Right-handed</th><th>Total</th></tr><tr><th>Glasses</th><td>4</td><td>10</td><td>14</td></tr><tr><th>No glasses</th><td>6</td><td>30</td><td>36</td></tr><tr><th>Total</th><td>10</td><td>40</td><td>50</td></tr></table>',
        parts: [
          { label: 'a', prompt: 'Find $\\Pr(\\text{left-handed})$.' },
          { label: 'b', prompt: 'Find $\\Pr(\\text{glasses} \\mid \\text{left-handed})$.' },
        ],
        key: {
          answer: '(a) $\\frac{10}{50} = \\frac{1}{5}$ (b) $\\frac{4}{10} = \\frac{2}{5}$',
          verify: ["10/50 === 0.2","4/10 === 0.4"],
          accept: ['0.2', '0.4'],
          working: '(a) 10 left-handed out of 50. (b) Given left-handed, restrict to the 10 left-handed students: 4 wear glasses, so $\\frac{4}{10}$.',
          look_for: ['Uses the column total 10 as the denominator in (b)'],
          common_errors: ['(b) answered as 4/50 (joint, not conditional)', '(b) answered as 4/14 (wrong condition)'],
        },
      },
      {
        id: 'Q3', num: 3, section: 'reasoning', level: 2, page: 1, half: 'bottom', span: 2, space: 'S', ac9: ['AC9M10ST02'],
        prompt: 'The box plots show test results for two classes.',
        svg: boxplots([{ name: 'Class A', v: [40, 55, 62, 70, 85] }, { name: 'Class B', v: [50, 66, 70, 74, 82] }]),
        diagram_alt: 'Box plots. Class A: min 40, Q1 55, median 62, Q3 70, max 85. Class B: min 50, Q1 66, median 70, Q3 74, max 82.',
        parts: [
          { label: 'a', prompt: 'Compare the two classes using the median and the IQR.' },
          { label: 'b', prompt: 'Lily says “Everyone in Class B scored higher than everyone in Class A.” Is she right? Explain.' },
        ],
        key: {
          answer: '(a) Class B has the higher median (70 vs 62) and is more consistent (IQR 8 vs 15). (b) No: Class A’s top score (85) is above Class B’s lowest (50) and B’s top (82).',
          verify: ["70 - 55 === 15","74 - 66 === 8"],
          accept: [],
          working: '(a) Medians: A 62, B 70. IQRs: A $70 - 55 = 15$, B $74 - 66 = 8$. B did better on average and its results are less spread. (b) The plots overlap, e.g. A’s maximum 85 is higher than B’s maximum 82.',
          look_for: ['Reads both medians and both IQRs correctly', 'Interprets in context (higher typical score, more consistent)', 'Uses overlap / specific values to reject the claim'],
          common_errors: ['Comparing ranges only', 'Reading the IQR as the box position rather than its width', 'Agreeing with Lily'],
        },
      },

      {
        id: 'Q4', num: 4, section: 'problem', level: 2, page: 2, half: 'top', span: 2, space: 'L', ac9: ['AC9M10M05', 'AC9M10SP01'],
        prompt: 'At the same time of day, a 1.8 m tall student casts a shadow 2.4 m long and a tree casts a shadow 14 m long.',
        parts: [
          { label: 'a', prompt: 'Explain why the two triangles formed are similar.' },
          { label: 'b', prompt: 'Find the height of the tree.' },
        ],
        key: {
          answer: '(a) Both have a right angle and the sun’s rays make the same angle with the ground (AAA). (b) 10.5 m',
          verify: ["Math.abs(14*1.8/2.4 - 10.5) < 1e-9"],
          accept: [],
          working: '(a) Student and tree are both vertical (90°) and the sun’s angle of elevation is the same, so the triangles are equiangular. (b) $\\frac{h}{14} = \\frac{1.8}{2.4}$, $h = 14 \\times 0.75 = 10.5$ m.',
          look_for: ['Two pairs of equal angles named (right angle, sun angle)', 'Correct proportion height : shadow', 'Units'],
          common_errors: ['Ratio inverted: 14 × 2.4/1.8 ≈ 18.7 m', 'Explaining similarity as "they look the same shape"'],
        },
      },
      {
        id: 'Q5', num: 5, section: 'problem', level: 3, page: 2, half: 'bottom', span: 2, space: 'L', ac9: ['AC9M10P01', 'AC9M9P01'],
        prompt: 'A basketballer makes each free throw with probability 0.7, independently of other throws. She takes two free throws.',
        parts: [
          { label: 'a', prompt: 'Find the probability she makes both.' },
          { label: 'b', prompt: 'Find the probability she makes at least one.' },
          { label: 'c', prompt: 'Over a season she takes two free throws on 40 occasions. On how many occasions would you expect her to miss both?' },
        ],
        key: {
          answer: '(a) 0.49 (b) 0.91 (c) about 3.6, so about 4 occasions',
          verify: ["Math.abs(0.7*0.7 - 0.49) < 1e-9","Math.abs(1 - 0.3*0.3 - 0.91) < 1e-9","Math.abs(40*0.09 - 3.6) < 1e-9"],
          accept: ['3.6'],
          working: '(a) $0.7 \\times 0.7 = 0.49$. (b) $1 - \\Pr(\\text{miss both}) = 1 - 0.3 \\times 0.3 = 0.91$. (c) $40 \\times 0.09 = 3.6 \\approx 4$.',
          look_for: ['Multiplies independent probabilities', 'Uses the complement for "at least one"', 'Expected number = n × p'],
          common_errors: ['(b) as 0.7 + 0.7 = 1.4', '(b) as 0.42 (exactly one)', '(c) using 0.3 instead of 0.09'],
        },
      },
    ],
  };
})());
