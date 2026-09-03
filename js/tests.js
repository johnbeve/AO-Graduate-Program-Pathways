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
      hasPrior: null, priorCredits: 0, priorElectiveCredits: 0,
      guidanceCompleted: 0, guidanceTarget: p.guidanceMin,
      internshipCompleted: 0, additionalElectiveCompleted: 0,
      adviserAssigned: false, registrationConsulted: false,
      logicStatus: 'not', projectStage: 'not', graduationApplied: false, graduationSurvey: false,
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

  test('M.S. entry above 6 approved prior credits triggers the source-conflict warning', () => {
    const i = base('ms');
    i.priorCredits = 9;
    const a = E.analyze(i);
    truthy(a.warnings.some(w => w.includes('more than 6 M.S.')), 'Expected prior-credit warning');
  });

  test('Ph.D. PLA is capped at 36 credits', () => {
    const i = base('phd');
    i.priorCredits = 45;
    const a = E.analyze(i);
    eq(a.prior, 36);
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
