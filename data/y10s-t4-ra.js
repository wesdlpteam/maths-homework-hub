/* Year 10 Standard · Term 4 · Weeks 4.5–4.6 · Exam Revision A (Algebra and graphs).
   Original questions written for Cambridge EMAC 10 sections 5F–5J, 7A–7F, 3F, 10A, 10I. */
(function (sheet) {
  if (typeof module === 'object' && module.exports) module.exports = sheet;
  else (window.HUB_SHEETS = window.HUB_SHEETS || []).push(sheet);
})({
  id: 'Y10S-T4-RA', pilot: true, course: 'Y10S', revision: true,
  year: '10', stream: 'Standard', term: 4, weeks: '4.5–4.6',
  title: 'Exam Revision A: Algebra and graphs',
  sections_covered: '5G–5J · 7C · 5H · 7F',
  ac9: ['AC9M10A01', 'AC9M9A04', 'AC9M10A04'],
  questions: [
    {
      id: 'Q1', num: 1, section: 'fluency', level: 1, page: 1, half: 'top', span: 1, space: 'M', ac9: ['AC9M10A01'],
      prompt: 'Solve by factorising.',
      parts: [{ label: 'a', prompt: '$x^2 - 5x - 14 = 0$' }, { label: 'b', prompt: '$3x^2 - 12x = 0$' }],
      key: {
        answer: '(a) $x = 7$ or $x = -2$ (b) $x = 0$ or $x = 4$',
        verify: ["[7, -2].every(x => x*x - 5*x - 14 === 0)","[0, 4].every(x => 3*x*x - 12*x === 0)"],
        accept: ['x = -2, 7', 'x ∈ {0, 4}'],
        working: '(a) $(x-7)(x+2)=0$ so $x=7$ or $x=-2$. (b) $3x(x-4)=0$ so $x=0$ or $x=4$.',
        look_for: ['Correct factorisation', 'Null Factor Law applied to each factor', 'Both solutions given for each part'],
        common_errors: ['Sign errors in factors, giving x = −7, 2', 'Dividing by x in (b) and losing x = 0', 'Only one solution given'],
      },
    },
    {
      id: 'Q2', num: 2, section: 'fluency', level: 2, page: 1, half: 'top', span: 1, space: 'M', ac9: ['AC9M10A01'],
      prompt: 'Solve $x^2 + 4x - 3 = 0$ using the quadratic formula. Give exact answers.',
      key: {
        answer: '$x = -2 \\pm \\sqrt{7}$',
        verify: ["[-2 + Math.sqrt(7), -2 - Math.sqrt(7)].every(x => Math.abs(x*x + 4*x - 3) < 1e-9)"],
        accept: ['$x = \\frac{-4 \\pm \\sqrt{28}}{2}$', 'x ≈ 0.65 or x ≈ −4.65 (mostly correct: exact form asked)'],
        working: '$a=1, b=4, c=-3$. $\\Delta = 16 + 12 = 28$. $x = \\frac{-4 \\pm \\sqrt{28}}{2} = \\frac{-4 \\pm 2\\sqrt{7}}{2} = -2 \\pm \\sqrt{7}$.',
        look_for: ['Correct a, b, c with c = −3', 'Discriminant 28', 'Simplifies the surd √28 = 2√7'],
        common_errors: ['Using c = 3, giving Δ = 4', 'Dividing only the surd by 2', 'Giving decimals only when exact answers were asked'],
      },
    },
    {
      id: 'Q3', num: 3, section: 'reasoning', level: 2, page: 1, half: 'bottom', span: 2, space: 'S', ac9: ['AC9M9A04'],
      prompt: 'Sketch $y = -(x + 1)(x - 3)$ on the grid. Label the $x$-intercepts, the $y$-intercept and the turning point.',
      diagram_alt: 'Blank coordinate grid, x from −3 to 5, y from −3 to 5, for the student to sketch on.',
      svg: 'GRID',
      key: {
        answer: 'Concave-down parabola; $x$-intercepts $(-1, 0)$, $(3, 0)$; $y$-intercept $(0, 3)$; turning point $(1, 4)$',
        verify: ["(x => -(x + 1)*(x - 3))(0) === 3","(x => -(x + 1)*(x - 3))(1) === 4","(x => -(x + 1)*(x - 3))(-1) === 0"],
        accept: [],
        working: '$x$-intercepts from the factors: $x = -1, 3$. $y$-intercept: $-(1)(-3) = 3$. Turning point at $x = \\frac{-1 + 3}{2} = 1$, $y = -(2)(-2) = 4$. Negative leading coefficient so concave down.',
        look_for: ['Concave down (upside-down) shape', 'Correct x-intercepts −1 and 3', 'y-intercept 3', 'Turning point (1, 4) found from the midpoint of intercepts'],
        common_errors: ['x-intercepts 1 and −3 (sign errors)', 'Drawn concave up', 'Turning point not labelled or at (1, −4)'],
      },
    },
    {
      id: 'Q4', num: 4, section: 'problem', level: 2, page: 2, half: 'top', span: 2, space: 'L', ac9: ['AC9M10A04'],
      prompt: 'A rectangular vegetable garden is 3 m longer than it is wide. Its area is 40 m².',
      parts: [
        { label: 'a', prompt: 'Let the width be $w$ m. Write an equation for the area.' },
        { label: 'b', prompt: 'Solve your equation to find the length and width of the garden.' },
      ],
      key: {
        answer: '(a) $w(w + 3) = 40$ (b) width 5 m, length 8 m',
        verify: ["5*(5 + 3) === 40"],
        accept: ['w² + 3w − 40 = 0'],
        working: '$w^2 + 3w - 40 = 0$, $(w + 8)(w - 5) = 0$, $w = 5$ (reject $w = -8$ since a width cannot be negative). Length $= 5 + 3 = 8$ m.',
        look_for: ['Correct equation', 'Rearranges to = 0 and factorises', 'Rejects the negative solution with a reason', 'States both dimensions with units'],
        common_errors: ['Keeps w = −8 as an answer', 'Gives width only', 'Equation w + 3w = 40'],
      },
    },
    {
      id: 'Q5', num: 5, section: 'problem', level: 3, page: 2, half: 'bottom', span: 2, space: 'L', ac9: ['AC9M10A04'],
      prompt: 'A ball is thrown so that its height after $t$ seconds is $h = -5t^2 + 20t + 1.5$ metres.',
      parts: [
        { label: 'a', prompt: 'Find the maximum height and when it occurs.' },
        { label: 'b', prompt: 'When does the ball hit the ground? Answer to 2 decimal places.' },
      ],
      key: {
        answer: '(a) 21.5 m at $t = 2$ s (b) $t \\approx 4.07$ s',
        verify: ["(t => -5*t*t + 20*t + 1.5)(2) === 21.5","((20 + Math.sqrt(430))/10).toFixed(2) === \"4.07\""],
        accept: ['t = (20 + √430)/10'],
        working: '(a) $t = -\\frac{b}{2a} = \\frac{-20}{-10} = 2$; $h = -20 + 40 + 1.5 = 21.5$ m. (b) $-5t^2 + 20t + 1.5 = 0$; $t = \\frac{-20 \\pm \\sqrt{400 + 30}}{-10}$; $\\sqrt{430} \\approx 20.736$, so $t \\approx 4.07$ s (reject the negative time $t \\approx -0.07$).',
        look_for: ['Uses t = −b/2a or completes the square', 'Substitutes back for the height', 'Sets h = 0 and uses the quadratic formula', 'Rejects negative time'],
        common_errors: ['Max height 20 m (forgets +1.5)', 'Gives t = 4 by rounding the wrong way or ignoring 1.5', 'Keeps the negative solution'],
      },
    },
  ],
});
