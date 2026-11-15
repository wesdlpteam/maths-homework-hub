/* Year 10 Extension · fortnightly homework from the 2026 Year 10 Extended Mathematics Term 1 planner.
   Only a Term 1 planner exists, so only Term 1 sheets are provided. Early Term 1 recall uses AC9 Year 9. */
(function (sheets) {
  if (typeof module === 'object' && module.exports) module.exports = sheets;
  else (window.HUB_SHEETS = window.HUB_SHEETS || []).push(...sheets);
})((function () {
  const sheet = (id, term, weeks, title, sections, ac9, questions) =>
    ({ id, course: 'Y10E', year: '10', stream: 'Extension', term, weeks, title, sections_covered: sections, ac9, questions });
  const q = (num, section, level, ac9, prompt, key, extra) =>
    Object.assign({ id: 'Q' + num, num, section, level, ac9: [].concat(ac9 || []), prompt, key }, extra || {});
  const k = (answer, working, look_for, common_errors, verify, accept) =>
    ({ answer, working, look_for, common_errors, verify: verify || [], accept: accept || [] });
  const P = (...ps) => ({ parts: ps.map((p, i) => ({ label: 'abcdef'[i], prompt: p })) });
  const R = (from, extra) => Object.assign({ recall_from: from }, extra || {});

  return [
    sheet('Y10E-T1-W1', 1, '1.1–1.2', 'Indices, indicial equations and surds', '3A–3E · 4A–4D', ['AC9M10A01', 'AC9M10N01'], [
      q(1, 'fluency', 1, 'AC9M10A01', 'Simplify or evaluate (assume pronumerals are positive).',
        k('(a) $2x^2$ (b) $\\frac{1}{27}$ (c) $a^2b^3$', '(a) $8^{\\frac13}x^{6 \\times \\frac13}$. (b) $\\frac{1}{(\\sqrt9)^3}$.', ['Fractional and negative indices'], ['(b) $-27$'],
          ['(x => Math.abs((8*x**6)**(1/3) - 2*x*x) < 1e-9)(3)', 'Math.abs(9**-1.5 - 1/27) < 1e-12', '((a, b) => Math.abs(Math.sqrt(a**4*b**6) - a*a*b**3) < 1e-9)(2, 3)']), P('$(8x^6)^{\\frac13}$', '$9^{-\\frac32}$', '$\\sqrt{a^4b^6}$')),
      q(2, 'recall', 1, 'AC9M9A02', 'Factorise $x^2 + 2x - 15$.',
        k('$(x + 5)(x - 3)$', '$5 \\times (-3) = -15$, $5 - 3 = 2$.', ['Factor pair'], ['$(x - 5)(x + 3)$'],
          ['(x => (x + 5)*(x - 3) === x*x + 2*x - 15)(4)']), R('Year 9')),
      q(3, 'fluency', 2, 'AC9M10A01', 'Solve.',
        k('(a) $x = 6$ (b) $x = 2$ (c) $x = \\frac32$', '(b) $2x - 1 = 3$. (c) $2^{2x} = 2^3$.', ['Same base on both sides'], ['(c) $x = 2$'],
          ['2**6 === 64', '3**(2*2 - 1) === 27', 'Math.abs(4**1.5 - 8) < 1e-12']), P('$2^x = 64$', '$3^{2x - 1} = 27$', '$4^x = 8$')),
      q(4, 'problem', 2, 'AC9M10N01', 'Answer each part.',
        k('(a) $10 + 5\\sqrt3$ (b) $4\\sqrt3$', '(a) Multiply by $\\frac{2 + \\sqrt3}{2 + \\sqrt3}$; denominator $4 - 3 = 1$. (b) $5\\sqrt3 - 4\\sqrt3 + 3\\sqrt3$.', ['Conjugate', 'Simplifies each surd first'], ['(a) $\\frac{5(2 + \\sqrt3)}{7}$'],
          ['Math.abs(5/(2 - Math.sqrt(3)) - (10 + 5*Math.sqrt(3))) < 1e-9', 'Math.abs(Math.sqrt(75) - 2*Math.sqrt(12) + Math.sqrt(27) - 4*Math.sqrt(3)) < 1e-12']), P('Rationalise the denominator of $\\frac{5}{2 - \\sqrt3}$.', 'Simplify $\\sqrt{75} - 2\\sqrt{12} + \\sqrt{27}$.')),
      q(5, 'problem', 3, ['AC9M10A01', 'AC9M10N01'], 'Answer each part.',
        k('(a) side $5\\sqrt2$ cm, diagonal 10 cm, perimeter $20\\sqrt2$ cm (b) $x = 3$', '(a) $\\sqrt{50}$; diagonal $5\\sqrt2 \\times \\sqrt2$. (b) $3^{2x} = 3^{3x - 3}$, so $2x = 3x - 3$.', ['Exact values', 'Rewrite with base 3'], ['(b) $x = -3$'],
          ['Math.abs(Math.sqrt(50) - 5*Math.SQRT2) < 1e-12', 'Math.abs(Math.sqrt(50)*Math.SQRT2 - 10) < 1e-12', '9**3 === 27**2']), P('A square has area 50 cm². Find the exact side length, diagonal and perimeter.', 'Solve $9^x = 27^{x - 1}$.')),
    ]),

    sheet('Y10E-T1-W3', 1, '1.3–1.4', 'Linear algebra and coordinate geometry', '1A–1H', ['AC9M10A02', 'AC9M9A03'], [
      q(1, 'fluency', 1, 'AC9M10A02', 'Solve $\\frac{2x - 1}{3} - \\frac{x + 2}{5} = 1$.',
        k('$x = \\frac{26}{7}$', 'Multiply by 15: $5(2x - 1) - 3(x + 2) = 15$, $7x - 11 = 15$.', ['LCD 15', 'Expands with negatives'], ['$7x - 1 = 15$'],
          ['Math.abs((2*26/7 - 1)/3 - (26/7 + 2)/5 - 1) < 1e-12'])),
      q(2, 'recall', 1, 'AC9M9M03', 'Find $12\\cos 30°$ to 2 decimal places.',
        k('10.39', 'Degree mode.', ['Calculator mode'], ['1.85 (radians)'],
          ['(12*Math.cos(Math.PI/6)).toFixed(2) === "10.39"']), R('Year 9')),
      q(3, 'fluency', 2, ['AC9M10A02', 'AC9M9A03'], 'Answer each part.',
        k('(a) $x < 5$ (b) $y = -\\frac32x + 2$', '(a) $3 - x > 2x - 12$. (b) $2x - 3y = 6$ has gradient $\\frac23$; perpendicular $-\\frac32$; $-1 = -3 + c$.', ['Multiplies through by 2', 'Negative reciprocal'], ['(b) gradient $\\frac32$'],
          ['(3 - 4)/2 > 4 - 6 && !((3 - 5)/2 > 5 - 6)', '-1.5*2 + 2 === -1']), P('Solve $\\frac{3 - x}{2} > x - 6$.', 'Find the equation of the line through $(2, -1)$ perpendicular to $2x - 3y = 6$.')),
      q(4, 'problem', 2, 'AC9M9A03', 'Triangle $ABC$ has vertices $A(-1, 2)$, $B(3, 5)$ and $C(6, 1)$.',
        k('(a) $AB = BC = 5$, $AC = 5\\sqrt2$; right isosceles (b) 12.5 units²', '(a) $m_{AB} = \\frac34$, $m_{BC} = -\\frac43$, product $-1$, so $\\angle B = 90°$. (b) $\\frac12 \\times 5 \\times 5$.', ['Lengths and gradients', 'Classifies fully'], ['Only “isosceles”'],
          ['Math.hypot(4, 3) === 5 && Math.hypot(3, 4) === 5', 'Math.abs(3/4*(-4/3) + 1) < 1e-12', '0.5*5*5 === 12.5']), P('Show that the triangle is right-angled and isosceles.', 'Find its area.')),
      q(5, 'problem', 3, 'AC9M10A01', 'Simplify $\\dfrac{x^2 - x - 6}{x^2 - 4} \\times \\dfrac{x^2 - 2x}{x^2 - 9}$.',
        k('$\\frac{x}{x + 3}$', '$\\frac{(x - 3)(x + 2)}{(x - 2)(x + 2)} \\times \\frac{x(x - 2)}{(x - 3)(x + 3)}$.', ['Factorises all four parts', 'Cancels common factors'], ['$\\frac{x}{x - 3}$'],
          ['(x => Math.abs((x*x - x - 6)/(x*x - 4)*(x*x - 2*x)/(x*x - 9) - x/(x + 3)) < 1e-9)(7)'])),
    ]),

    sheet('Y10E-T1-W5', 1, '1.5–1.6', 'Simultaneous equations, regions and applications', '1I–1L', ['AC9M10A02'], [
      q(1, 'fluency', 1, 'AC9M10A02', 'Solve simultaneously: $4x + 3y = 18$ and $2x - y = 4$.',
        k('$x = 3$, $y = 2$', 'From the second, $y = 2x - 4$; $4x + 6x - 12 = 18$.', ['Substitution or elimination', 'Checks'], ['$y = -2$'],
          ['4*3 + 3*2 === 18 && 2*3 - 2 === 4'])),
      q(2, 'recall', 1, 'AC9M10A01', 'Evaluate $27^{\\frac23}$.',
        k('9', '$(\\sqrt[3]{27})^2$.', ['Root then power'], ['18'],
          ['Math.round(27**(2/3)) === 9']), R('Term 1 · indices')),
      q(3, 'fluency', 2, 'AC9M10A02', 'Shade the region where $y \\le 2x + 1$ and $y > -x + 4$ on the grid. Use dashed and solid boundary lines correctly.',
        k('Region above the dashed line $y = -x + 4$ and on or below the solid line $y = 2x + 1$; $(2, 3)$ is inside', 'Test $(2, 3)$: $3 \\le 5$ ✓ and $3 > 2$ ✓.', ['Solid for $\\le$, dashed for $>$', 'Test point'], ['Shading the wrong side'],
          ['3 <= 2*2 + 1 && 3 > -2 + 4']), Object.assign({ svg: 'GRID' }, P('Shade the region.', 'Is the point $(2, 3)$ in the region? Show the test.'))),
      q(4, 'problem', 2, 'AC9M10A02', 'A business has costs $C = 1200 + 8n$ and revenue $R = 20n$ for $n$ items.',
        k('(a) 100 items (b) \\$1200 profit', '(a) $20n = 1200 + 8n$. (b) $R - C = 12(200) - 1200$.', ['Break-even when $R = C$'], ['(a) 60'],
          ['20*100 === 1200 + 8*100', '20*200 - (1200 + 8*200) === 1200']), P('Find the break-even point.', 'Find the profit when 200 items are sold.')),
      q(5, 'problem', 3, 'AC9M10A02', 'A boat travels 36 km downstream in 2 hours and returns upstream in 3 hours. Find the speed of the boat in still water and the speed of the current.',
        k('Boat 15 km/h, current 3 km/h', '$b + c = 18$, $b - c = 12$.', ['Speeds from distance ÷ time', 'Two equations'], ['Swapping boat and current'],
          ['15 + 3 === 36/2 && 15 - 3 === 36/3'])),
    ]),

    sheet('Y10E-T1-W7', 1, '1.7–1.9', 'Measurement and trigonometry in 2D and 3D', '4E–4M · 6A–6E', ['AC9M10M01', 'AC9M10M03'], [
      q(1, 'fluency', 1, 'AC9M10M01', 'A sphere has radius 6 cm. Find, to 1 decimal place:',
        k('(a) 904.8 cm³ (b) 452.4 cm²', '(a) $\\frac43\\pi(216)$. (b) $4\\pi(36)$.', ['Correct formulas'], ['Swapping the formulas'],
          ['(288*Math.PI).toFixed(1) === "904.8"', '(144*Math.PI).toFixed(1) === "452.4"']), P('its volume', 'its surface area')),
      q(2, 'recall', 1, 'AC9M10N01', 'Rationalise $\\frac{4}{\\sqrt2}$.',
        k('$2\\sqrt2$', '$\\frac{4\\sqrt2}{2}$.', ['Multiply by $\\frac{\\sqrt2}{\\sqrt2}$'], ['$4\\sqrt2$'],
          ['Math.abs(4/Math.SQRT2 - 2*Math.SQRT2) < 1e-12']), R('Term 1 · surds')),
      q(3, 'fluency', 2, 'AC9M10M03', 'A cube has side length 10 cm.',
        k('(a) $10\\sqrt3 \\approx 17.32$ cm (b) 35.3°', '(a) Base diagonal $10\\sqrt2$; then $\\sqrt{200 + 100}$. (b) $\\tan^{-1}\\frac{10}{10\\sqrt2}$.', ['Identifies the right-angled triangle in 3D'], ['(b) 45°'],
          ['(10*Math.sqrt(3)).toFixed(2) === "17.32"', '(Math.atan(1/Math.SQRT2)*180/Math.PI).toFixed(1) === "35.3"']), P('Find the length of a space diagonal (exact and to 2 decimal places).', 'Find the angle the space diagonal makes with the base, to 1 decimal place.')),
      q(4, 'problem', 2, 'AC9M10M03', 'Town B is 12 km from town A on a bearing of 140°. How far south and how far east of A is B, to 2 decimal places?',
        k('9.19 km south, 7.71 km east', 'Angle from south $= 180 - 140 = 40°$. South $12\\cos 40°$, east $12\\sin 40°$.', ['Correct angle in the triangle'], ['Swapping sin and cos'],
          ['(12*Math.cos(40*Math.PI/180)).toFixed(2) === "9.19"', '(12*Math.sin(40*Math.PI/180)).toFixed(2) === "7.71"'])),
      q(5, 'problem', 3, 'AC9M10M03', 'From point A the angle of elevation to the top of a tower is 32°. From point B, 20 m closer to the tower, it is 45°. Find the height of the tower, to 1 decimal place.',
        k('33.3 m', '$\\frac{h}{\\tan 32°} - \\frac{h}{\\tan 45°} = 20$, so $h(1.6003 - 1) = 20$, $h \\approx 33.3$.', ['Two right triangles sharing the height', 'Sets up one equation'], ['Treating 20 m as the distance from A'],
          ['(20/(1/Math.tan(32*Math.PI/180) - 1)).toFixed(1) === "33.3"'])),
    ]),
  ];
})());
