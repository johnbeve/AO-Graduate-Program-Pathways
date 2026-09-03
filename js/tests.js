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
      electiveCreditsByCourse: Object.fromEntries(p.electiveCourses.map(id => [id, 3])),
      hasPrior: null, experienceCredits: 0, transferCredits: 0, electiveDetailsOpen: false,
      guidanceCompleted: 0,
      internshipCompleted: 0, additionalElectiveCompleted: 0,
      adviserAssigned: false, registrationConsulted: false,
      logicStatus: null, phdLogicSatisfied: false,
      projectStage: 'not', graduationApplied: false, graduationSurvey: false,
      qualifyingPassed: false, dissertationCommitteeFormed: false, topicalSubmitted: false, topicalDefensePassed: false,
      rcrCompleted: false, atcFiled: false, dissertationStage: 'not'
    };
  }

  test('New M.S. student starts at 0/30 completed credits', () => {
    const a = E.analyze(base('ms'));
    eq(a.totalCompleted, 0);
    eq(a.program.totalCredits, 30);
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
    i.coreStatuses.PHI604 = 'completed';
    const a = E.analyze(i);
    eq(a.coreSatisfied, 1);
  });

  test('Symbolic Logic Independent Study contributes 3 M.S. elective and degree credits', () => {
    const i = base('ms');
    i.logicStatus = 'iscomplete';
    const a = E.analyze(i);
    eq(a.logicElectiveCredits, 3);
    eq(a.electiveCompleted, 3);
    eq(a.totalCompleted, 3);
  });

  test('MindTap satisfies M.S. logic without adding degree credit', () => {
    const i = base('ms');
    i.logicStatus = 'mindtap';
    truthy(E.logicSatisfied(i.logicStatus));
    eq(E.analyze(i).logicElectiveCredits, 0);
  });

  test('M.S. experience and transfer credit share a 6-credit cap', () => {
    const i = base('ms');
    i.experienceCredits = 6;
    i.transferCredits = 6;
    const a = E.analyze(i);
    eq(a.experienceCredits, 6);
    eq(a.transferCredits, 0);
    eq(a.prior, 6);
  });

  test('Ph.D. experience and transfer credit share a 14-credit cap', () => {
    const i = base('phd');
    i.experienceCredits = 10;
    i.transferCredits = 10;
    const a = E.analyze(i);
    eq(a.experienceCredits, 10);
    eq(a.transferCredits, 4);
    eq(a.prior, 14);
  });

  test('M.S. internship credit is capped at 6', () => {
    const i = base('ms');
    i.internshipCompleted = 20;
    eq(E.analyze(i).internshipCompleted, 6);
  });

  test('Ph.D. internship credit is capped at 12 and kept separate from elective minimum', () => {
    const i = base('phd');
    i.internshipCompleted = 20;
    const a = E.analyze(i);
    eq(a.internshipCompleted, 12);
    eq(a.electiveCompleted, 0);
    eq(a.totalCompleted, 12);
  });

  test('Elective courses can carry 1, 2, or 3 credits', () => {
    const i = base('phd');
    const ids = D.programs.phd.electiveCourses.slice(0, 3);
    ids.forEach(id => { i.electiveStatuses[id] = 'completed'; });
    i.electiveCreditsByCourse[ids[0]] = 1;
    i.electiveCreditsByCourse[ids[1]] = 2;
    i.electiveCreditsByCourse[ids[2]] = 3;
    eq(E.analyze(i).namedElectiveCompleted, 6);
  });

  test('Ph.D. electives are capped at 30 credits', () => {
    const i = base('phd');
    D.programs.phd.electiveCourses.slice(0, 10).forEach(id => { i.electiveStatuses[id] = 'completed'; });
    i.additionalElectiveCompleted = 10;
    eq(E.analyze(i).electiveCompleted, 30);
  });

  test('M.S. guidance counts completed credits directly and caps at 9', () => {
    const i = base('ms');
    i.guidanceCompleted = 12;
    eq(E.analyze(i).guidanceCompleted, 9);
  });

  test('Ph.D. guidance counts completed credits directly and caps at 30', () => {
    const i = base('phd');
    i.guidanceCompleted = 45;
    eq(E.analyze(i).guidanceCompleted, 30);
  });

  test('Two unsuccessful logic exam attempts direct M.S. student to Independent Study', () => {
    const i = base('ms');
    i.adviserAssigned = true;
    i.registrationConsulted = true;
    i.logicStatus = 'failed2';
    const r = E.createReport(i);
    eq(r.nextSteps[0].title, 'Enroll in Symbolic Logic Independent Study');
  });

  test('Without an advisor assignment administrative action is the only immediate next move', () => {
    const r = E.createReport(base('phd'));
    eq(r.nextSteps.length, 1);
    eq(r.nextSteps[0].title, 'Contact the AO director to confirm your faculty advisor assignment');
  });

  test('Ph.D. logic competency appears before later doctoral milestones', () => {
    const i = base('phd');
    i.adviserAssigned = true;
    i.registrationConsulted = true;
    const r = E.createReport(i);
    eq(r.nextSteps[0].title, 'Ph.D. logic competency');
  });

  test('Ph.D. qualifying examination is required', () => {
    const i = base('phd');
    i.adviserAssigned = true;
    i.registrationConsulted = true;
    i.phdLogicSatisfied = true;
    const r = E.createReport(i);
    truthy(r.remaining.some(x => x.type === 'Qualifying Examination'));
  });

  test('Ph.D. Topical Defense sequence requires committee, submission, and passing defense', () => {
    const i = base('phd');
    let r = E.createReport(i);
    truthy(r.remaining.some(x => x.item === 'Dissertation committee'));
    i.dissertationCommitteeFormed = true;
    r = E.createReport(i);
    truthy(r.remaining.some(x => x.item === 'Submit topical'));
    i.topicalSubmitted = true;
    r = E.createReport(i);
    truthy(r.remaining.some(x => x.item === 'Topical Defense'));
  });

  test('Course-load selection materially changes the M.S. route', () => {
    const one = base('ms'); one.regularLoad = 1;
    const five = base('ms'); five.regularLoad = 5;
    const r1 = E.createReport(one);
    const r5 = E.createReport(five);
    truthy(r5.timeline.scheduled.length < r1.timeline.scheduled.length);
    truthy(r5.timeline.finish.id !== r1.timeline.finish.id);
  });

  test('A regular semester can be set to zero courses and remains visible as a term off', () => {
    const i = base('ms');
    i.termLoads['spring-2027'] = 0;
    const r = E.createReport(i);
    const spring = r.timeline.routeTerms.find(row => row.term.id === 'spring-2027');
    truthy(spring);
    eq(spring.capacity, 0);
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
