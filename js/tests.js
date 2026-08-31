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
      startTerm: 'fall-2026', regularLoad: 2, summerLoad: 0, winterLoad: 0,
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
    truthy(a.warnings.some(w => w.includes('6-credit')), 'Expected prior-credit warning');
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
