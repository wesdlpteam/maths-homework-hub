/* Yearly course planner templates (Word .docx), built from the term dates below.
   No dependencies: writes the WordprocessingML and a stored (uncompressed) zip directly.
   Used by the Hub (Year rollover → "Blank planner templates") and by tools/make-planner-templates.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerTemplate = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const YEAR = 2027;
  const COURSES = [
    { code: 'Y7', name: 'Year 7 Mathematics' },
    { code: 'Y8', name: 'Year 8 Mathematics' },
    { code: 'Y9', name: 'Year 9 Mathematics' },
    { code: 'Y10A', name: 'Year 10 Mathematical Applications' },
    { code: 'Y10S', name: 'Year 10 Standard Mathematics' },
    { code: 'Y10E', name: 'Year 10 Extension Mathematics' },
  ];

  // One row per teaching week, from "WESLEY COLLEGE TERM DATES 2027 – FINAL" and the 2027 PL calendar
  // slides ("Calendar sharing.pptx").
  const WEEKS = [
    ['1.1', '1 – 5 Feb', 'Before term: Mon 25 Jan – Principal’s Day; Wed 27 – Thu 28 Jan – Campus days; Fri 29 Jan – New student orientation\nMon 1 Feb – all students begin (Day 1)'],
    ['1.2', '8 – 12 Feb', ''],
    ['1.3', '15 – 19 Feb', ''],
    ['1.4', '22 – 26 Feb', ''],
    ['1.5', '1 – 5 Mar', ''],
    ['1.6', '8 – 12 Mar', 'Mon 8 Mar – Labour Day (public holiday)\nTue 9 Mar – Staff PL Day (student free)'],
    ['1.7', '15 – 19 Mar', 'Tue 16 Mar – SRMs\nThu 18 Mar – SRMs'],
    ['1.8', '22 – 25 Mar', 'Thu 25 Mar – Term 1 ends (Day 9)\nFri 26 Mar – Good Friday'],
    ['2.1', '12 – 16 Apr', 'Mon 12 Apr – Term 2 starts (Day 1)'],
    ['2.2', '19 – 23 Apr', ''],
    ['2.3', '26 – 30 Apr', 'ANZAC Day falls on Sunday 25 Apr (no holiday)'],
    ['2.4', '3 – 7 May', ''],
    ['2.5', '10 – 14 May', ''],
    ['2.6', '17 – 21 May', ''],
    ['2.7', '24 – 28 May', ''],
    ['2.8', '31 May – 4 Jun', ''],
    ['2.9', '7 – 11 Jun', ''],
    ['2.10', '14 – 18 Jun', 'Mon 14 Jun – King’s Birthday (public holiday)\nFri 18 Jun – Term 2 ends (Day 10)'],
    ['3.1', '14 – 16 Jul', 'Mon 12 Jul – Principal’s Day; Tue 13 Jul – Staff PL Day\nWed 14 Jul – Term 3 starts (Day 3)'],
    ['3.2', '19 – 23 Jul', ''],
    ['3.3', '26 – 30 Jul', ''],
    ['3.4', '2 – 6 Aug', ''],
    ['3.5', '9 – 13 Aug', 'Thu 12 Aug – SRMs'],
    ['3.6', '16 – 20 Aug', 'Thu 19 Aug – SRMs'],
    ['3.7', '23 – 27 Aug', ''],
    ['3.8', '30 Aug – 3 Sep', ''],
    ['3.9', '6 – 10 Sep', ''],
    ['3.10', '13 – 17 Sep', 'Fri 17 Sep – Term 3 ends (Day 10)'],
    ['4.1', '4 – 8 Oct', 'Mon 4 Oct – Term 4 starts (Day 1)'],
    ['4.2', '11 – 15 Oct', ''],
    ['4.3', '18 – 22 Oct', ''],
    ['4.4', '25 – 29 Oct', ''],
    ['4.5', '1 – 5 Nov', 'Mon 1 Nov – Mid-term break (College holiday)\nTue 2 Nov – Melbourne Cup (public holiday)'],
    ['4.6', '8 – 12 Nov', ''],
    ['4.7', '15 – 19 Nov', ''],
    ['4.8', '22 – 26 Nov', ''],
    ['4.9', '29 Nov – 3 Dec', ''],
    ['4.10', '6 – 8 Dec', 'Wed 8 Dec – Term 4 ends for students (Day 8)'],
  ];
  const TERM_WEEKS = { 1: 8, 2: 10, 3: 10, 4: 10 };

  // ---------- Content carried over from the 2026 course planners ----------
  // week → [content details, assessment and resources]. 2026 dates/events and staff notes are left out.
  // 2027 Term 1 has 8 weeks (2026: 9), so 2026 week 1.9 is added to week 1.8; Term 3 gains a spare week 3.10.
  const MOVED = 'Note: 2027 Term 1 has 8 weeks (2026 had 9). The 2026 week 1.9 content is added to this week – adjust as needed.';
  const SPARE = 'Note: extra week – 2027 Term 3 has 10 weeks (2026 had 9). Use for catch-up, or move content here.';
  const PREFILL = {
    Y7: {
      '1.1': ['Intro to MYP Task\nConsolidation for Place Value (use worksheet)', 'Times Table practice as a starter activity each lesson: https://www.transum.org/Software/Tablesmaster/\nLiteracy worksheet'],
      '1.2': ['1C Adding and subtracting positive integers\n(1D if time)\n1E Multiplying small positive integers', ''],
      '1.3': ['1F Multiplying large positive integers\n1G Dividing positive integers\n1H Estimating and rounding positive integers', ''],
      '1.4': ['1I Order of operations with positive integers\n2A Factors and multiples\n2B Highest common factor and lowest common multiple', ''],
      '1.5': ['2D and 2F Prime numbers / Prime decomposition\n2E Using indices\n2G Squares and square roots\nRevision', 'Quiz on Chapters 1 & 2'],
      '1.6': ['6A Introduction to negative integers\n6B Adding and subtracting positive integers', ''],
      '1.7': ['6C Adding and subtracting negative integers', ''],
      '1.8': ['6D Multiplying and dividing integers\n6E Order of operations with integers\nFrom 2026 week 1.9:\n6F Substituting integers\n6G The Cartesian plane\nRevision', 'Crit C/D Weather task\n' + MOVED],
      '2.1': ['6F Substituting integers\n6G The Cartesian plane\n3B Equivalent fractions and simplified fractions', ''],
      '2.2': ['3C Mixed numerals and improper fractions\n3E Adding fractions\n3F Subtracting fractions', ''],
      '2.3': ['3G Multiplying fractions\n3H Dividing fractions\n3I Fractions and percentages', ''],
      '2.4': ['3J Finding a percentage of a number\nPreparation for Pattern Task\n3K Introduction to ratios', 'Crit B/C'],
      '2.5': ['3L Solving problems with ratios\n5A & 5B Place value in decimals and Rounding decimals', ''],
      '2.6': ['5C Adding and subtracting decimals\n5D Multiplying and dividing decimals by 10, 100, 1000\n5E Multiplying decimals', ''],
      '2.7': ['5F Dividing decimals\n5G Connecting decimals and fractions\n5H Connecting decimals and percentages', ''],
      '2.8': ['5I Expressing proportions using decimals, fractions and percentages\nRevision', 'Crit A'],
      '2.9': ['10A & 10B Metric units of length and Perimeter\n10C Circles, pi and circumference', ''],
      '2.10': ['10E & 10F Area of rectangles and parallelograms\n10G Area of triangles\n10H Area of composite shapes', ''],
      '3.1': ['10I Volume of rectangular prisms\n10K Capacity', ''],
      '3.2': ['4A Introduction to algebra\n4B Substituting numbers into algebraic expressions', ''],
      '3.3': ['(4C if time) 4D Equivalent algebraic expressions and like terms\n4E Multiplying and dividing expressions\n4F Expanding brackets', ''],
      '3.4': ['4G Applying algebra\n2I Spatial patterns\n2J Tables and rules', ''],
      '3.5': ['Preparation for number patterns\nRevision\n9A Introduction to equations', 'Crit B'],
      '3.6': ['9C Equivalent equations\n9D Solving equations algebraically\nSpend at least 2 lessons on 9D, e.g. 1-step then 2-step. More solving practice!', ''],
      '3.7': ['9E Equations with fractions\n9F Equations with brackets', ''],
      '3.8': ['9G Using formulas\n9H Using equations to solve problems', 'Crit A on Ch 4 (Algebra) and Ch 9 (Solving)'],
      '3.9': ['Project / Transformations', ''],
      '3.10': ['', SPARE],
      '4.1': ['8G Describing probability\n8H Theoretical probability in single-step experiments\n8I Experimental probability in single-step experiments', ''],
      '4.2': ['8A Collecting and classifying data\n8B Summarising data numerically\n8C Column graphs and dot plots', ''],
      '4.3': ['8D Line graphs\n8E Stem-and-leaf plots', ''],
      '4.4': ['8F Sector graphs and divided bar graphs\nRevision', 'Crit C/D'],
      '4.5': ['7A Points, lines, intervals and angles\n7B Adjacent and vertically opposite angles', ''],
      '4.6': ['7C Transversal and parallel lines\n7D Solving geometry problems with parallel lines\n7E Classifying and constructing triangles', ''],
      '4.7': ['7G Angle sum of a triangle\nRevision', 'Crit A – Chapters 7 and 8'],
      '4.8': ['7H Symmetry\n7I Reflection and rotation\n7J Translation', ''],
      '4.9': ['7L Nets of solids\n10L Mass and temperature', ''],
    },
    Y8: {
      '1.1': ['1A & 1F Adding and subtracting integers\n1B & 1G Multiplying and dividing integers', 'Note: the first half of Term 1 is more loaded with content than the second half. Adjust weekly content as needed to fit both assessment items.'],
      '1.2': ['1D Divisibility and prime factorisation\n1H Order of operations and substitution', ''],
      '1.3': ['3A Equivalent fractions\n3B & 3C Operations with fractions and negative fractions\n3D Understanding decimals', ''],
      '1.4': ['3F Terminating and recurring decimals and rounding\n3E Operations with decimals\n3G Converting fractions, decimals and percentages', ''],
      '1.5': ['Revision\nAssessment', 'Crit A – Block 1: Working with numbers\n(No calculator; double-sided A4 reference sheet permitted)'],
      '1.6': ['5J Index laws for multiplication and division', ''],
      '1.7': ['5K The zero index and power of a power\nRevision', ''],
      '1.8': ['‘Lead In’ task for B/C assessment\nAssessment\nFrom 2026 week 1.9:\nPythagoras (finding the long and short sides)\nConsolidation questions from 4L & 4M as required', 'Crit B/C – Block 2: Indices – ‘Lift Task’ (calculator allowed, no reference sheet)\nPythagoras booklet for content delivery\n' + MOVED],
      '2.1': ['5A The language of algebra\n5B Substitution and equivalence', ''],
      '2.2': ['5C & 5E Adding and subtracting terms (including fractions)\n5D & 5F Multiplying and dividing terms (including fractions)', ''],
      '2.3': ['5G Expanding brackets\n5H Factorising', ''],
      '2.4': ['7B Equivalent equations\n7C Equations with fractions\n7D Equations with pronumerals on both sides', ''],
      '2.5': ['7E Equations with brackets\nRevision', 'Crit A – Block 3: Algebra (calculator and double-sided A4 reference sheet allowed)'],
      '2.6': ['3H Finding a percentage and expressing as a percentage\n3I Decreasing and increasing by a percentage', ''],
      '2.7': ['3J Calculating percentage change, profit and loss\n3K Solving percentage problems by the unitary method', ''],
      '2.8': ['Revision', 'Crit C/D – Block 4: Percentages, late this week or start of week 9 (calculator allowed, formula sheet provided)'],
      '2.9': ['9A The Cartesian plane\n9B Using rules, tables and graphs to explore linear relationships\n9C Finding a rule using a table of values', ''],
      '2.10': ['9D Using graphs to solve linear equations\n9F The x- and y-intercepts\n9G Gradient', ''],
      '3.1': ['9H Gradient–intercept form\n9I Applications of straight-line graphs', ''],
      '3.2': ['Revision', 'Crit B/C – Block 5: Linear relationships (calculator allowed, no reference sheet)'],
      '3.3': ['4A Length and perimeter\n4B Circumference', ''],
      '3.4': ['4C & 4D Area and area of special quadrilaterals\n4E Area of circles', ''],
      '3.5': ['4F & 4G Areas of sectors and composite shapes, and surface area of prisms\n4H Volume and capacity\n4I Volume of prisms and cylinders', 'Project – make a 3D shape from a 2D net. Show surface area and volume calculations for your shape. Choose from rectangular prisms, triangular prisms, cylinders, cones, or other by negotiation.'],
      '3.6': ['4J Units of time and time zones\nRevision', 'Crit A – Block 6: Measurement (calculator and double-sided A4 reference sheet allowed)'],
      '3.7': ['6A Simplifying ratios\n6B Solving ratio problems\n6C Scale drawings', ''],
      '3.8': ['6D Introducing rates\n6E Solving rate problems', ''],
      '3.9': ['6F Speed\n6G Ratios and rates and the unitary method', 'Block 7 – Ratios and rates: no formal assessment'],
      '3.10': ['', SPARE],
      '4.1': ['8A Interpreting graphs and tables\n8F Surveying and sampling\nIDU – Warm-up Task 1: How reflective is it?', ''],
      '4.2': ['8B Frequency tables and tallies\n8C Graphs of frequency tables\nIDU – Warm-up Task 2: Comparing materials\nIDU – Activity 1: Draw and interpret a graph', ''],
      '4.3': ['8D & 8E Measures of centre and spread\n8G Probability\nIDU – Activity 2: Frequency table and graph – class survey', ''],
      '4.4': ['8K Experimental probability\n8H Two-step experiments\nIDU – Activity 3: Frequency table and graph – grouped data\nIDU – Activity 4: Statistics analysis – mean, median, mode and range', ''],
      '4.5': ['8J Venn diagrams and two-way tables\n8I Tree diagrams', ''],
      '4.6': ['IDU Presentation Day\nRevision for C/D maths assessment\nAssessment', 'Crit C/D – Block 8: Data-driven decision making (calculator allowed, no reference sheet)'],
      '4.7': ['IDU – Reflection (Criterion C task, 30 minutes in a maths lesson)\n10A Reflection\n10B Translation\n10C Rotation', 'Block 9 – Transformations and congruence: no formal assessment. First part of the topic in week 7, second part in weeks 9 and 10.'],
      '4.8': ['Revision for end of Semester 2 Crit A assessment (Blocks 5–9; Block 9 only 10A to 10C)\nAssessment', 'Crit A on Semester 2 content – must be done by the end of week 8 (calculator and double-sided A4 reference sheet allowed)'],
      '4.9': ['10D Congruent figures\n10E Congruent triangles\n10H Similar figures', 'Block 9 continued: no formal assessment'],
      '4.10': ['10I Similar triangles', ''],
    },
    // From the 2026 Year 10 (General) planner.
    Y10A: {
      '1.1': ['Unit M1: Number and algebra\n1A Review of algebra\n5A Expanding expressions', 'Year 10 book'],
      '1.2': ['5B Factorising expressions\n5C Multiplying and dividing algebraic fractions\n3A Review of index laws', ''],
      '1.3': ['Unit M2: Linear relationships, graphs, models\n1B Solving linear equations\n1C Linear inequalities\n1E Graphing straight lines', ''],
      '1.4': ['1F Finding the equation of a line\n1G Length and midpoint of a line segment\nRevision', 'Year 10 book'],
      '1.5': ['4E Review of length\n4F Pythagoras’ theorem', 'Test'],
      '1.6': ['4G Review of area\n4I Surface area of prisms and cylinders', ''],
      '1.7': ['4K Volume of prisms and cones\n6A Trigonometric ratios\n6B Finding unknown angles', ''],
      '1.8': ['6C Applications in two dimensions\nRevision\nFrom 2026 week 1.9:\n8A Review of probability\n8B Set notation in Venn diagrams and two-way tables\n8C The addition rule', 'Test\n' + MOVED],
      '2.1': ['8D Conditional probability\n8F Using tree diagrams\n9C Two-way tables', 'Year 10 book'],
      '2.2': ['9D Summary statistics\n9E Box plots\n9H Time-series data', ''],
      '2.3': ['9I Bivariate data and scatter plots\n9J Line of best fit by eye', ''],
      '2.4': ['Revision\nTest', 'Crit C/D'],
      '2.5': ['1G Percentage increase and decrease\n1H Profits and discounts\n1I Income', 'Year 10 book'],
      '2.6': ['1J The PAYG income tax system\n1K Simple interest\n1L Compound interest and depreciation', ''],
      '2.7': ['1M Using a formula for compound interest and depreciation\nPurchasing option\nRevision for exam', 'Crit A on Semester 2'],
      '2.8': ['Revision for exam\nExam week', ''],
      '2.9': ['Exam week', ''],
      '2.10': ['2K Introduction to networks\n2L Trails, paths and Eulerian circuits\n2M Shortest path problems', ''],
      '3.1': ['4A The basics of a matrix\n4B Adding and subtracting matrices\n4C Scalar multiplication', 'Year 11 General book, Chapter 4 Matrices'],
      '3.2': ['4D Matrix multiplication\n4F Using matrices to model road and communication networks\nConsolidation', ''],
      '3.3': ['4I Applications of matrices\nRevision', 'Test'],
      '3.4': ['9D Summary statistics – five-figure summary\n9F Standard deviation\n9I Bivariate data and scatter plots', 'Year 10 General book, Chapter 9'],
      '3.5': ['7A Scatterplots\n7B How to interpret a scatterplot', 'Year 11 General book, Chapter 7'],
      '3.6': ['7C Pearson’s correlation coefficient (r)\n7D Fitting a linear model to the data\nBasic correlation', 'Mini test'],
      '3.7': ['7E Interpreting and predicting from a linear model\nRevision', 'Test'],
      '3.8': ['8A What is a graph?\n8B Isomorphic (equivalent), connected graphs and adjacency matrices\n8C Planar graphs and Euler’s formula', 'Year 11 General book, Chapter 8 Graphs and networks'],
      '3.9': ['8D Walks, trails, paths, circuits and cycles\n8E Eulerian trails and circuits\n8F Hamiltonian paths and cycles\n8G Weighted graphs', ''],
      '3.10': ['', SPARE],
      '4.1': ['3A Number patterns\n3B Writing recurrence relations in symbolic form\n3C An introduction to arithmetic sequences', 'Year 11 General book'],
      '4.2': ['3D Arithmetic sequences using recursion\n3E Finance applications using arithmetic sequences and recurrence relations\n3F An introduction to geometric sequences', ''],
      '4.3': ['3G Recursion with geometric sequences\n3H Finance applications using geometric sequences and recurrence relations', 'Mini test'],
      '4.4': ['3I Finding term n in a sequence modelling geometric growth and decay\nTest (last lesson)', 'Crit C/D'],
      '4.5': ['Semester 2 exam revision', ''],
      '4.6': ['Semester 2 exam revision', ''],
      '4.7': ['Exam', ''],
      '4.8': ['Exam', ''],
      '4.9': ['Transition', ''],
    },
    Y10S: {
      '1.1': ['Chapter 3 – Indices, exponentials and logarithms\nReview of index laws Ex 3A\nNegative indices Ex 3B\nScientific notation consolidation Ex 3C\nFractional indices Ex 3D', 'Introduction to TI-Nspire CAS'],
      '1.2': ['Minitask Ch 3\nChapter 1 – Algebra, equations and linear relationships\nReview of algebra Ex 1A\nSolving linear equations and inequalities Ex 1B, 1C\nLinear equations with algebraic fractions Ex 1D', ''],
      '1.3': ['Graphing straight lines Ex 1E, 1F\nParallel and perpendicular lines Ex 1H\nSolving simultaneous equations graphically and by substitution Ex 1I\nMinitask Ch 1', ''],
      '1.4': ['Solving by elimination Ex 1J\nFurther applications of simultaneous equations Ex 1K\nReview for Crit A', 'Crit A – Ch 1 & 3'],
      '1.5': ['Chapter 4 – Measurement and surds\nNumber clarification review Ex 4A\nSurds Ex 4B\nOperations with surds Ex 4C\nRationalising the denominator Ex 4D', ''],
      '1.6': ['Review of length Ex 4E\nPythagoras in 3D Ex 4F\nMinitask Ch 4', ''],
      '1.7': ['Review of area Ex 4G\nSurface area of prisms and cylinders Ex 4I\nSurface area of pyramids and cones Ex 4J', 'Crit B/C (to be confirmed)'],
      '1.8': ['Volume of prisms and cylinders Ex 4K\nReview part 1 of B task and complete part 2\nFrom 2026 week 1.9:\nVolume of pyramids and cones Ex 4L\nSurface area and volume of spheres Ex 4M', 'Crit A – Ch 4 (4A–4J)\nTerm 1 Holiday Assignment\n' + MOVED],
      '2.1': ['Chapter 6 – Trigonometry\nReview of trigonometric ratios Ex 6A\nFinding angles Ex 6B\nApplications of trig in 2D Ex 6C', ''],
      '2.2': ['Directions and bearings Ex 6D\nCatch up and review for Crit C/D – Trig applications\nChapter 5 – Quadratic expressions and equations\nExpanding expressions Ex 5A', 'Crit C/D – Trig applications (Chapter 6)?'],
      '2.3': ['Factorising expressions Ex 5B\nMultiplying and dividing algebraic fractions Ex 5C\nMinitask Ch 5', ''],
      '2.4': ['Factorising monic quadratics Ex 5D\nFactorising non-monic quadratics Ex 5E\nReview (5A–5E)\nTest Ch 5?', ''],
      '2.5': ['Simple interest review (use your own notes)\nChapter 3 – Indices, exponentials and logarithms\nCompound interest Ex 3H\nFinance solver on CAS', ''],
      '2.6': ['Exam revision', 'Assessment Crit C/D on Finance – using Finance Solver'],
      '2.7': ['Exam revision', ''],
      '2.8': ['Exams', ''],
      '2.9': ['Exams', ''],
      '2.10': ['Chapter 2 – Geometry\nReview of geometry Ex 2A\nCongruent triangles Ex 2B\nSimilar figures Ex 2D\nProving and applying similar triangles Ex 2E', 'Term 2 Holiday Assignment'],
      '3.1': ['Chapter 5 – Quadratic expressions and equations\nQuick review: factorising monic and non-monic quadratics Ex 5D & 5E\nFactorising by completing the square Ex 5F', ''],
      '3.2': ['Solving quadratic equations Ex 5G\nApplications of quadratic equations Ex 5H', 'Quadratic algebra test'],
      '3.3': ['Solving quadratic equations by completing the square Ex 5I\nQuadratic formula Ex 5J\nReview of Chapter 5 for Crit A', ''],
      '3.4': ['Chapter 7 – Parabolas and rates of change\nExploring parabolas Ex 7A\nSketching parabolas with transformations Ex 7B', 'Crit A – Chapter 5?'],
      '3.5': ['Sketching parabolas using factorisation Ex 7C\nSketching parabolas using completing the square Ex 7D', ''],
      '3.6': ['Sketching parabolas using the discriminant Ex 7E\nApplications of parabolas Ex 7F\nReview of Chapter 7 for Crit C/D', ''],
      '3.7': ['Chapter 9 – Statistics\nCollecting representative data Ex 9A\nReview of data displays Ex 9B', 'Crit C/D Parabolas'],
      '3.8': ['Two-way tables Ex 9C\nSummary statistics Ex 9D\nBox plots Ex 9E', ''],
      '3.9': ['Standard deviation Ex 9F\nCumulative frequency curves Ex 9G\nBivariate statistics Ex 9I', ''],
      '3.10': ['', 'Term 3 Holiday Assignment\n' + SPARE],
      '4.1': ['Chapter 8 – Probability\nReview of probability Ex 8A\nSet notation in Venn diagrams and two-way tables Ex 8B\nThe addition rule Ex 8C', ''],
      '4.2': ['Conditional probability Ex 8D\nTwo-step experiments using tables Ex 8E\nTree diagrams Ex 8F', ''],
      '4.3': ['Independent events Ex 8G\nApplications Ex 8H\nReview Chapters 8 & 9 for Crit A', ''],
      '4.4': ['Other important concepts – VCE MM / IB AA & AI SL\nChapter 3 – Exponential functions and graphs Ex 3F\nChapter 10 – Function notation Ex 10A\nGraphs of circles Ex 10I', 'Crit A – Chapters 8 & 9 Stats & Prob'],
      '4.5': ['Exam revision', 'Crit B – Prob task?'],
      '4.6': ['Exam revision', ''],
      '4.7': ['Exams', ''],
      '4.8': ['Exams', ''],
      '4.9': ['Exam checking and transition', ''],
    },
    // From the updated (full-year) 2026 Extension planner.
    Y10E: {
      '1.1': ['Review of index laws Ex 3A & Scientific notation consolidation Ex 3C\nNegative indices Ex 3B\nFractional indices Ex 3D\nIndicial equations Ex 3E', 'Introduction to TI-Nspire CAS\nPrior knowledge pre-test Q1–8 Chapter 3\nProgress Quiz Q1–9\nProblems and challenges Q1–6'],
      '1.2': ['Number clarification review Ex 4A\nSurds Ex 4B\nOperations with surds Ex 4C\nRationalising the denominator Ex 4D', 'Handouts\nProgress Quiz Q1–7\nProblems and challenges Q1–8'],
      '1.3': ['Review of algebra Ex 1A\nSolving linear equations and inequalities Ex 1B, 1C\nLinear equations with algebraic fractions Ex 1D', 'Mini task: Indices and surds'],
      '1.4': ['Graphing straight lines Ex 1E, 1F\nMidpoint and distance Ex 1G\nParallel and perpendicular lines Ex 1H', 'Line segment graphs and review of coordinate geometry activity'],
      '1.5': ['Applications and problem solving\nSolving simultaneous equations graphically and by substitution Ex 1I\nSolving by elimination Ex 1J\nFurther applications of simultaneous equations Ex 1K', 'Homework sheet'],
      '1.6': ['Regions on the Cartesian plane (optional) Ex 1L\nInvestigation, modelling\nProblems and challenges', 'Test on linear and coordinate geometry\nProblems and challenges Q1–10'],
      '1.7': ['Pythagoras review Ex 4E\nPythagoras in 3D Ex 4F\nReview of area Ex 4G\nSurface area Ex 4I', ''],
      '1.8': ['Surface area and volume Ex 4J, 4K, 4L, 4M\nFrom 2026 week 1.9:\nReview of trigonometric ratios Ex 6A\nFinding angles Ex 6B', 'Investigation: Density\nProblems and challenges Q1–8\nTest on Applications Chapters 1 & 4\nTerm 1 Holiday Assignment\n' + MOVED],
      '2.1': ['The sine rule Ex 6F\nThe cosine rule Ex 6G\nArea of a triangle Ex 6H', 'Pythagoras & Measurement Mini Task'],
      '2.2': ['Exact values\nThe unit circle Ex 6I', 'Crit B'],
      '2.3': ['Graphs of trigonometric functions Ex 6J\nExact values and solving trig equations Ex 6K', 'Homework sheet'],
      '2.4': ['Review of geometry Ex 2A, 2B, 2C\nSimilar figures and similar triangles Ex 2D, 2E', ''],
      '2.5': ['Circle theorems Ex 2F, 2G, 2H, 2I', 'Trigonometry & Geometry Crit C/D'],
      '2.6': ['Exponential functions and graphs Ex 3F, 3G\nDomain, range, interval notation (handouts)\nCompound interest Ex 3H\nFinance solver on CAS', ''],
      '2.7': ['Exam revision', ''],
      '2.8': ['Exams', ''],
      '2.9': ['Exams', ''],
      '2.10': ['Quadratic algebra: Expanding Ex 5A + exam return\nFactorising Ex 5B\nFactorising quadratics Ex 5D, 5E\nAlgebraic fractions Ex 5C', 'Term 2 Holiday Assignment'],
      '3.1': ['Factorising by completing the square Ex 5F\nSolving quadratic equations Ex 5G\nApplications of quadratic equations Ex 5H', ''],
      '3.2': ['Solving quadratic equations by completing the square Ex 5I\nQuadratic formula Ex 5J\nConsolidation Progress Quiz', 'Crit A – Quadratic Algebra Test (Paper 1, 5 + 50 min)'],
      '3.3': ['Modelling & Investigation\nParabolas and rates of change\nExploring parabolas Ex 7A\nSketching parabolas with transformations Ex 7B', ''],
      '3.4': ['Sketching parabolas continued Ex 7C, 7D\nDiscriminant Ex 7E and handouts', ''],
      '3.5': ['Applications of parabolas Ex 7F\nIntersection of lines and parabolas Ex 7G', 'Crit C/D – Modelling with Quadratics Test (use 2025 as practice)'],
      '3.6': ['Statistics Chapter 9\nUnivariate statistics Ex 9A–9D', 'Mini test on Parabolas (Paper 1)'],
      '3.7': ['Box plots, cumulative frequency curves, standard deviation Ex 9E–9F', 'Crit B'],
      '3.8': ['Bivariate statistics Ex 9I, 9J and handouts', ''],
      '3.9': ['Probability Ex 8A–8D', ''],
      '3.10': ['', 'Term 3 Holiday Assignment\n' + SPARE],
      '4.1': ['Probability continued Ex 8E–8H', ''],
      '4.2': ['Counting techniques continued Ex 8I–8K', ''],
      '4.3': ['Logarithms Ex 3I–3L', 'Crit A – Statistics & Probability Test (Paper 2 only)'],
      '4.4': ['Chapter 10 Polynomials and other graphs\nFunction notation Ex 10A\nGraphs of circles Ex 10I\nGraphing cubic functions Ex 10G', ''],
      '4.5': ['Polynomials Ex 10B–10F', ''],
      '4.6': ['Graphs of polynomials Ex 10H\nTransformations Ex 10K\nExam revision', ''],
      '4.7': ['Exams', ''],
      '4.8': ['Exams', ''],
    },
  };

  // ---------- Minimal WordprocessingML helpers ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const PURPLE = '50275A', GOLD_SOFT = 'F6EDCF', GREY = 'F3F0F7';
  function run(text, o = {}) {
    const props = [o.b && '<w:b/>', o.color && `<w:color w:val="${o.color}"/>`, o.sz && `<w:sz w:val="${o.sz}"/>`].filter(Boolean).join('');
    return String(text).split('\n').map((line, i) => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`).join('');
  }
  const para = (runs, o = {}) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${o.after == null ? 60 : o.after}"/></w:pPr>${runs}</w:p>`;
  function cell(content, w, o = {}) {
    const shade = o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : '';
    const span = o.span ? `<w:gridSpan w:val="${o.span}"/>` : '';
    return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span}${shade}</w:tcPr>${content || para('')}</w:tc>`;
  }
  const row = (cells, header) => `<w:tr><w:trPr><w:cantSplit/>${header ? '<w:tblHeader/>' : ''}</w:trPr>${cells.join('')}</w:tr>`;
  const W = [900, 2900, 6200, 3200, 2200]; // Week | Dates & events | Content | Assessment | Homework sheet
  const sheetCode = (course, term, week) => `${course}-T${term}-W${week}-${String(YEAR).slice(2)}`;

  function documentXml(course) {
    const head = [
      para(run(`Wesley College · ${YEAR} Course Planner`, { b: true, color: PURPLE, sz: 20 }), { after: 0 }),
      para(run(course.name, { b: true, sz: 36 }), { after: 40 }),
      para(run('Course code: ', { b: true }) + run(course.code) + run('    Planner year: ', { b: true }) + run(String(YEAR)) + run('    Textbook: ', { b: true }) + run('Cambridge Essential Mathematics (4th ed.)'), { after: 120 }),
      para(run('How to fill this in (so the Homework Hub can read it)', { b: true, color: PURPLE }), { after: 20 }),
      ...(PREFILL[course.code] ? [para(run(`• Pre-filled from the 2026 planner and moved onto the ${YEAR} dates. Check and edit it; look for the notes in weeks 1.8 and 3.10, where the term lengths changed.`, { b: true }), { after: 0 })] : []),
      para(run('• In “Content details”, put each textbook section on its own line, starting with its code: e.g. “3A Equivalent fractions”. Other notes are fine on their own lines.'), { after: 0 }),
      para(run('• Write “Revision” for revision weeks and “Exams” or “No homework” in weeks that should not have a homework sheet.'), { after: 0 }),
      para(run('• Keep the Week column and the table layout as they are. Homework sheets cover two weeks each, as shown in the last column.'), { after: 0 }),
      para(run('• Save as Word (.docx) and upload it in the Hub’s Year rollover tab.'), { after: 160 }),
    ].join('');
    const rows = [row(['Week', 'Dates and events', 'Content details (textbook sections)', 'Assessment and resources', 'Homework sheet']
      .map((t, i) => cell(para(run(t, { b: true, color: 'FFFFFF' })), W[i], { fill: PURPLE })), true)];
    let lastTerm = 0;
    for (const [wk, dates, events] of WEEKS) {
      const [term, week] = wk.split('.').map(Number);
      if (term !== lastTerm) {
        rows.push(row([cell(para(run(`Term ${term}  ·  ${TERM_WEEKS[term]} weeks`, { b: true })), W.reduce((a, b) => a + b), { span: 5, fill: GOLD_SOFT })]));
        lastTerm = term;
      }
      const first = week % 2 === 1 && !(TERM_WEEKS[term] % 2 === 1 && week === TERM_WEEKS[term]);
      const hw = first ? `${sheetCode(course.code, term, week)}\n(weeks ${term}.${week}–${term}.${week + 1})` : '↑ same sheet';
      const [content, assess] = (PREFILL[course.code] || {})[wk] || ['', ''];
      rows.push(row([
        cell(para(run(wk, { b: true })), W[0]),
        cell(para(run(dates, { b: true }) + (events ? run('\n' + events, { sz: 18, color: '615A6E' }) : '')), W[1]),
        cell(para(run(content)), W[2]),
        cell(para(run(assess, { sz: 18 })), W[3]),
        cell(para(run(hw, { sz: 18, color: first ? PURPLE : '9A93A6' })), W[4], { fill: first ? GREY : null }),
      ]));
    }
    const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BFB6CC"/>`).join('');
    const table = `<w:tbl><w:tblPr><w:tblW w:w="${W.reduce((a, b) => a + b)}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${W.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${head}${table}${para('')}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="700" w:bottom="720" w:left="700" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  }

  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
  const CT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  // ---------- Stored zip writer (works in browsers and Node) ----------
  const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = []; let offset = 0;
    for (const [name, text] of files) {
      const data = enc.encode(text), nm = enc.encode(name), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nm.length, true);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
      parts.push(new Uint8Array(lh.buffer), nm, data); central.push(new Uint8Array(ch.buffer), nm);
      offset += 30 + nm.length + data.length;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
    let at = 0; for (const p of all) { out.set(p, at); at += p.length; }
    return out;
  }

  // ---------- Year 9 modules ----------
  // Year 9 is taught in modules because students spend one term at Clunes. Each module runs in the
  // terms shown (2027 rotation, from "2026/2027 Module Rotation.jpg"). Content is pre-filled from the
  // 2026 module planners in 8 core weeks; weeks 9–10 only exist in 10-week terms.
  const MODULES = [
    { code: 'Y9M1', name: 'Year 9 Module 1', title: 'Measurement, geometry, trigonometry and finance',
      runs: [[1, '9U · 9V · 9W'], [2, '9U · 9V'], [3, '9U · 9V']],
      weeks: [
        ['5C Circle circumference and perimeter of a sector\n5D Area\n5E Perimeter and area of composite shapes', 'Introduce the reference sheet'],
        ['5F Surface area of prisms and pyramids\n5G Surface area of a cylinder\n5H Volume of a prism\n5I Volume of a cylinder', 'Progress quiz (HW)'],
        ['7F Enlargement and similar figures\n7G Similar triangles\n7H Proving and applying similar triangles', 'Crit A – calculator and reference sheet allowed'],
        ['3A Pythagoras’ theorem\n3B Finding the length\n3C Pythagoras in 2D problems\n3D Pythagoras in 3D problems', ''],
        ['3E Trigonometric ratios\n3F Finding unknown side lengths\n3G Solving for the denominator', 'Progress quiz (HW)'],
        ['3H Finding unknown angles\n3I Applying trigonometry\n3J Bearings (extending)', 'Crit C/D “From Ramps to Rescues”'],
        ['1E Ratios, rates and best buys\n1K Simple interest', ''],
        ['1L Compound interest and depreciation\n1M Using a formula for compound interest and depreciation', ''],
      ] },
    { code: 'Y9M2', name: 'Year 9 Module 2', title: 'Algebra, linear relations and indices',
      runs: [[1, '9X · 9Y · 9Z'], [2, '9W · 9X · 9Y · 9Z'], [3, '9W']],
      weeks: [
        ['2A Algebraic expressions\n2B Simplifying algebraic expressions\n2C Expanding algebraic expressions\n2D Solving linear equations with pronumerals on one side', 'Reference sheet (add things as you go)'],
        ['2E Solving linear equations with brackets and pronumerals on both sides\n2F Solving word problems', 'Progress quiz (HW)'],
        ['2H Using formulas\n8A Expanding binomial products', ''],
        ['8B Perfect squares and difference of two squares\n8C Factorising expressions\n8D Factorising quadratic trinomials\n8E Factorising trinomials of the form ax² + bx + c\n8F Factorisation using various strategies', 'Progress quiz (HW)'],
        ['4A Introduction to linear relations\n4B Graphing straight lines using intercepts', 'Crit B “Patterns and Algebra” – calculator allowed'],
        ['4C Lines with one intercept\n4D Gradient\n4E Gradient and direct proportion', ''],
        ['4F Gradient–intercept form\n4G Finding the equation of a line\n4H Midpoint and length of a line segment\n4J Linear modelling', 'Crit A'],
        ['6B Index laws for multiplication and division\n6C Index laws for power of a power and zero index\n6D Index laws for brackets and fractions\n6E Negative indices', 'Progress quiz (HW)'],
      ] },
    { code: 'Y9M3', name: 'Year 9 Module 3', title: 'Quadratics, probability and statistics',
      runs: [[3, '9X · 9Y · 9Z'], [4, '9U · 9V · 9W · 9X · 9Y']],
      weeks: [
        ['10A Null factor law\n10E The parabola\n10F Sketching y = ax² with dilations and reflections', ''],
        ['10G Sketching translations of y = x²\n10H Sketching using intercept form', 'Progress quiz for parabolas'],
        ['9A Review of probability\n9F Using relative frequencies to estimate probabilities\n9B Venn diagrams and two-way tables', ''],
        ['9C Using set notation\n9D Using arrays for two-step experiments\n9E Using tree diagrams', 'Progress quiz for probability'],
        ['9G Data and sampling\n9I Stem-and-leaf plots\n9J Grouping data into classes', ''],
        ['9H Mean, median and mode\n9K Measures of spread: range and interquartile range', ''],
        ['Consolidation and applications', 'Crit D “Bettina’s Bakery” – calculator allowed'],
        ['Revision', 'Check exam timing for this term'],
      ] },
    { code: 'Y9M4', name: 'Year 9 Non-Clunes Module 4', title: 'Number, simultaneous equations, finance and networks',
      runs: [[4, '9Z']],
      weeks: [
        ['6F Scientific notation\n6G Scientific notation using significant figures\n6I Simple operations with surds', ''],
        ['2G Inequalities\n2I Simultaneous equations using substitution\n2J Simultaneous equations using elimination\n2K Applications of simultaneous equations', ''],
        ['4K Graphical solutions to simultaneous equations\n8H Simplifying algebraic fractions: multiplication and division\n8I Simplifying algebraic fractions: addition and subtraction', ''],
        ['1H Profits and discounts\n1G Percentage increase and decrease\n1E Ratios, rates and best buys', ''],
        ['1I Income\n1J The PAYG income tax system', ''],
        ['7D Congruent triangles\n7F Enlargement and similar figures\nApplications and problem-solving (Chapter 7)', ''],
        ['Applications and problem-solving (Chapter 5)\nChapter 11 Algorithmic thinking', ''],
        ['2K Introduction to networks (Year 10 book)', ''],
      ] },
  ];

  function moduleXml(m) {
    const n = Number(m.code.slice(-1));
    const yy = String(YEAR).slice(2);
    const Wm = [800, 4400, 2100, 1700];
    const termW = Math.floor(6400 / m.runs.length);
    const widths = Wm.concat(m.runs.map(() => termW));
    const total = widths.reduce((a, b) => a + b);
    const head = [
      para(run(`Wesley College · ${YEAR} Course Planner · Year 9 module`, { b: true, color: PURPLE, sz: 20 }), { after: 0 }),
      para(run(`${m.name}: ${m.title}`, { b: true, sz: 34 }), { after: 40 }),
      para(run('Course code: ', { b: true }) + run(m.code) + run('    Planner year: ', { b: true }) + run(String(YEAR)) + run('    Textbook: ', { b: true }) + run('Cambridge Essential Mathematics 9 (4th ed.)'), { after: 60 }),
      para(run(`Runs in ${YEAR}: `, { b: true }) + run(m.runs.map(([t, cls]) => `Term ${t} (${cls})`).join(';  ')), { after: 120 }),
      para(run('How to use this planner', { b: true, color: PURPLE }), { after: 20 }),
      para(run('• The content is pre-filled from the 2026 module planners in 8 core weeks. Adjust it as needed: one textbook section per line, starting with its code (e.g. “4D Gradient”).'), { after: 0 }),
      para(run('• Weeks 9–10 only happen in 10-week terms (Terms 2–4). Use them for consolidation and assessment. Term 1 has 8 weeks.'), { after: 0 }),
      para(run('• The date columns show the real 2027 dates and events for each term this module runs. Homework sheets are the same whichever term the module runs.'), { after: 0 }),
      para(run('• Save as Word (.docx) and upload it in the Hub’s Year rollover tab.'), { after: 160 }),
    ].join('');
    const hdr = ['Module week', 'Content details (textbook sections)', 'Assessment and resources', 'Homework sheet'].concat(m.runs.map(([t]) => `Term ${t} dates`));
    const rows = [row(hdr.map((t, i) => cell(para(run(t, { b: true, color: 'FFFFFF', sz: 18 })), widths[i], { fill: PURPLE })), true)];
    for (let k = 1; k <= 10; k++) {
      if (k === 9) rows.push(row([cell(para(run('Flexible weeks · 10-week terms only', { b: true })), total, { span: widths.length, fill: GOLD_SOFT })]));
      const [content, assess] = m.weeks[k - 1] || ['Consolidation and assessment', ''];
      const first = k % 2 === 1;
      const hw = first ? `Y9-M${n}-W${k}-${yy}\n(module weeks ${k}–${k + 1})` : '↑ same sheet';
      const dates = m.runs.map(([t]) => {
        const w = WEEKS.find(x => x[0] === `${t}.${k}`);
        return w ? run(w[1], { b: true, sz: 17 }) + (w[2] ? run('\n' + w[2], { sz: 15, color: '615A6E' }) : '') : run('— (8-week term)', { sz: 16, color: '9A93A6' });
      });
      rows.push(row([
        cell(para(run(`M${n}.${k}`, { b: true })), widths[0]),
        cell(para(run(content)), widths[1]),
        cell(para(run(assess, { sz: 18 })), widths[2]),
        cell(para(run(hw, { sz: 17, color: first ? PURPLE : '9A93A6' })), widths[3], { fill: first ? GREY : null }),
        ...dates.map((d, i) => cell(para(d), widths[4 + i])),
      ]));
    }
    const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BFB6CC"/>`).join('');
    const table = `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${head}${table}${para('')}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="700" w:bottom="720" w:left="700" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  }

  // Templates offered in the Hub, in display order. Year 9 is planned by module.
  const LIST = [
    COURSES[0], COURSES[1],
    ...MODULES.map(m => ({ code: m.code, name: m.name, module: true })),
    COURSES[3], COURSES[4], COURSES[5],
  ];

  function build(code) {
    const m = MODULES.find(x => x.code === code);
    const course = COURSES.find(c => c.code === code);
    if (!m && !course) throw new Error('Unknown course ' + code);
    const doc = m ? moduleXml(m) : documentXml(course);
    return zip([['[Content_Types].xml', CT], ['_rels/.rels', RELS], ['word/_rels/document.xml.rels', DOC_RELS], ['word/document.xml', doc], ['word/styles.xml', STYLES]]);
  }
  const filename = code => {
    const m = MODULES.find(x => x.code === code);
    return m ? `${YEAR} ${m.name} – Module Planner.docx` : `${YEAR} ${COURSES.find(c => c.code === code).name} – Course Planner (template).docx`;
  };

  // The planner's word/document.xml text (used by tests to check the Hub can read its own templates).
  const xml = code => { const m = MODULES.find(x => x.code === code); return m ? moduleXml(m) : documentXml(COURSES.find(c => c.code === code)); };

  return { YEAR, COURSES, MODULES, LIST, WEEKS, build, filename, xml };
});
