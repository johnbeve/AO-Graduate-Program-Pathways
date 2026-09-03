'use strict';

(() => {
  const E = window.AO_ENGINE;
  const D = window.AO_DATA;
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, ok: true }); }
    catch (err) { results.push({ name, ok: false, error: err.message }); }
  };
  const eq = (actual, expected, msg = '') => {
    if (actual !== expected) throw new Error(`${msg} expected ${expected}, got ${actual}`.trim());
  };
  const truthy = (value, msg) => { if (!value) throw new Error(msg || 'Expected truthy value'); };

  function base(program) {
    const p = D.programs[program];
    return {
      program,
      startTerm: 'fall-2026', regularLoad: 2, summerLoad: 0, winterLoad: 0, termLoads: {},
      coreStatuses: Object.fromEntries(p.core.map(id => [id, 'not'])),
      electiveStatuses: Object.fromEntries(p.electiveCourses.map(id => [id, 'not'])),
      hasPrior: null, experienceCredits: 0, transferCredits: 0, electiveDetailsOpen: false,
      guidanceCompleted: 0, guidanceTarget: p.guidanceMin,
      internshipCompleted: 0, additionalElectiveCompleted: 0,
      adviserAssigned: false, registrationConsulted: false,
      logicStatus: null, projectStage: 'not', graduationApplied: false, graduationSurvey: false,
      preliminarySatisfied: false, rcrCompleted: false, atcFiled: false, dissertationStage: 'not',
      mFormSubmitted: false, etdSubmitted: false, doctoralSurveys: false
    };
  }

  test('New M.S. student starts at 0/30 completed credits', () => {
    const a = E.analyze(base('ms'));
    eq(a.totalCompleted, 0);
    eq(a.program.totalCredits, 30);
    eq(a.coreSatisfied, 0);
  });

  test('M.S. required course below B+ does not satisfy the core', () => {
    const i = base('ms');
    i.coreStatuses.PHI604 = 'lowgrade';
    const a = E.analyze(i);
    eq(a.coreSatisfied, 0);
    eq(a.coreCompleted, 0);
  });

  test('Ph.D. required course uses the same B+ satisfaction rule', () => {
    const i = base('phd');
    i.coreStatuses.PHI604 = 'lowgrade';
    let a = E.analyze(i);
    eq(a.coreSatisfied, 0);
    i.coreStatuses.PHI604 = 'completed';
    a = E.analyze(i);
    eq(a.coreSatisfied, 1);
  });

  test('A complete modeled M.S. path reaches 30 credits and academic completion', () => {
    const i = base('ms');
    Object.keys(i.coreStatuses).forEach(k => { i.coreStatuses[k] = 'completed'; });
    D.programs.ms.electiveCourses.slice(0, 6).forEach(k => { i.electiveStatuses[k] = 'completed'; });
    i.guidanceCompleted = 3;
    i.logicStatus = 'passed';
    i.projectStage = 'completed';
    const a = E.analyze(i);
    eq(a.totalCompleted, 30);
    truthy(a.academicComplete, 'M.S. academic completion should be true');
  });

  test('M.S. entry above 6 approved experience/transfer credits triggers the source-conflict warning', () => {
    const i = base('ms');
    i.experienceCredits = 6;
    i.transferCredits = 3;
    const a = E.analyze(i);
    truthy(a.warnings.some(w => w.includes('more than 6 M.S.')), 'Expected prior-credit warning');
  });

  test('Ph.D. PLA is capped at 36 credits', () => {
    const i = base('phd');
    i.experienceCredits = 30;
    i.transferCredits = 15;
    const a = E.analyze(i);
    eq(a.prior, 36);
  });

  test('Symbolic Logic Independent Study contributes 3 elective and degree credits', () => {
    const i = base('ms');
    i.logicStatus = 'iscomplete';
    const a = E.analyze(i);
    eq(a.logicElectiveCredits, 3);
    eq(a.electiveCompleted, 3);
    eq(a.totalCompleted, 3);
  });

  test('MindTap can satisfy the M.S. Symbolic Logic checkpoint without adding degree credit', () => {
    const i = base('ms');
    i.logicStatus = 'mindtap';
    const a = E.analyze(i);
    truthy(E.logicSatisfied(i.logicStatus), 'MindTap should satisfy the logic requirement');
    eq(a.logicElectiveCredits, 0);
  });

  test('Experience and transfer credit are counted separately but share the program cap', () => {
    const i = base('ms');
    i.experienceCredits = 6;
    i.transferCredits = 6;
    const a = E.analyze(i);
    eq(a.experienceCredits, 6);
    eq(a.transferCredits, 6);
    eq(a.prior, 12);
    eq(a.electiveCompleted, 0, 'Experience/transfer credit should not automatically count toward electives');
  });

  test('Two unsuccessful logic exam attempts direct the student to enroll in the Independent Study', () => {
    const i = base('ms');
    i.adviserAssigned = true;
    i.registrationConsulted = true;
    i.logicStatus = 'failed2';
    const r = E.createReport(i);
    eq(r.nextSteps[0].title, 'Enroll in Symbolic Logic Independent Study');
  });

  test('Without an advisor assignment the administrative action is the only immediate next move', () => {
    const r = E.createReport(base('ms'));
    eq(r.nextSteps.length, 1);
    eq(r.nextSteps[0].title, 'Contact the AO director to confirm your faculty advisor assignment');
  });

  test('Course-load selection materially changes the M.S. route', () => {
    const one = base('ms');
    one.regularLoad = 1;
    const five = base('ms');
    five.regularLoad = 5;
    const r1 = E.createReport(one);
    const r5 = E.createReport(five);
    truthy(r5.timeline.scheduled.length < r1.timeline.scheduled.length, 'Five courses should produce fewer modeled terms than one course');
    truthy(r5.timeline.finish.id !== r1.timeline.finish.id, 'Finish terms should differ');
  });

  test('Course-load selection materially changes the Ph.D. route', () => {
    const one = base('phd');
    one.regularLoad = 1;
    const five = base('phd');
    five.regularLoad = 5;
    const r1 = E.createReport(one);
    const r5 = E.createReport(five);
    truthy(r5.timeline.scheduled.length < r1.timeline.scheduled.length, 'Five courses should produce fewer modeled terms than one course');
    truthy(r5.timeline.finish.id !== r1.timeline.finish.id, 'Finish terms should differ');
  });


  test('A student can change the number of courses in one regular semester', () => {
    const i = base('ms');
    const baseline = E.createReport(i);
    i.termLoads['fall-2026'] = 1;
    const custom = E.createReport(i);
    const fall = custom.timeline.routeTerms.find(r => r.term.id === 'fall-2026');
    eq(fall.capacity, 1);
    truthy(custom.timeline.customized, 'Expected semester-level customization');
    truthy(custom.timeline.finish.id !== baseline.timeline.finish.id, 'Reducing the first term should move the modeled finish');
  });

  test('A regular semester can be set to zero courses and remains visible as a term off', () => {
    const i = base('ms');
    i.termLoads['spring-2027'] = 0;
    const r = E.createReport(i);
    const spring = r.timeline.routeTerms.find(row => row.term.id === 'spring-2027');
    truthy(spring, 'Expected the zero-load regular term to remain in the route');
    eq(spring.capacity, 0);
    eq(spring.tasks.length, 0);
  });

  test('Pace comparison ignores semester overrides so cards remain clean templates', () => {
    const i = base('ms');
    i.termLoads['fall-2026'] = 0;
    const r = E.createReport(i);
    const two = r.loadComparison.find(x => x.load === 2);
    const clean = base('ms');
    clean.regularLoad = 2;
    const cleanReport = E.createReport(clean);
    eq(two.finish.id, cleanReport.timeline.finish.id);
  });

  const list = document.getElementById('results');
  results.forEach(r => {
    const li = document.createElement('li');
    li.className = r.ok ? 'pass' : 'fail';
    li.textContent = r.ok ? `PASS — ${r.name}` : `FAIL — ${r.name}: ${r.error}`;
    list.appendChild(li);
  });
  const failed = results.filter(r => !r.ok).length;
  const summary = document.getElementById('summary');
  summary.textContent = `${results.length} tests; ${failed} failures`;
  summary.className = failed ? 'fail' : 'pass';
  document.body.dataset.testsFailed = String(failed);
})();
