'use strict';

window.AO_ENGINE = (() => {
  const D = window.AO_DATA;

  const STATUS = {
    not: 'Not yet',
    completed: 'Completed with B+ or better',
    lowgrade: 'Completed below B+ (not counted in this planner)'
  };

  const n = v => Number(v || 0);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const course = id => D.courses[id];
  const courseLabel = id => {
    const c = course(id);
    return `${c.code}: ${c.title}${c.former ? ` (formerly ${c.former})` : ''}`;
  };

  function statusCredits(status) {
    return status === 'completed' ? 3 : 0;
  }

  function inferStartTerm(date = new Date()) {
    const t = date.getTime();
    const terms = D.officialTerms;
    for (let i = 0; i < terms.length; i += 1) {
      const start = new Date(`${terms[i].start}T00:00:00`).getTime();
      const end = new Date(`${terms[i].end}T23:59:59`).getTime();
      if (t >= start && t <= end) return terms[i].id;
      if (t < start) return terms[i].id;
    }
    return terms[terms.length - 1].id;
  }

  function generateFutureTerms(throughYear = 2038) {
    const terms = [...D.officialTerms];
    const lastYear = Math.max(...terms.map(t => t.year));
    for (let y = lastYear; y <= throughYear; y += 1) {
      const candidates = [
        { id: `summer-${y}`, label: `Summer ${y}`, type: 'summer', year: y },
        { id: `fall-${y}`, label: `Fall ${y}`, type: 'fall', year: y },
        { id: `winter-${y + 1}`, label: `Winter ${y + 1}`, type: 'winter', year: y + 1 },
        { id: `spring-${y + 1}`, label: `Spring ${y + 1}`, type: 'spring', year: y + 1 }
      ];
      candidates.forEach(c => {
        if (!terms.some(t => t.id === c.id)) terms.push({ ...c, start: null, end: null, official: false });
      });
    }
    const order = { winter: 0, spring: 1, summer: 2, fall: 3 };
    return terms.sort((a, b) => {
      const ay = a.type === 'winter' ? a.year - 0.75 : a.type === 'spring' ? a.year - 0.5 : a.type === 'summer' ? a.year - 0.25 : a.year;
      const by = b.type === 'winter' ? b.year - 0.75 : b.type === 'spring' ? b.year - 0.5 : b.type === 'summer' ? b.year - 0.25 : b.year;
      if (ay !== by) return ay - by;
      return order[a.type] - order[b.type];
    });
  }

  function defaultCapacityForTerm(term, input) {
    if (term.type === 'fall' || term.type === 'spring') return clamp(n(input.regularLoad), 0, 5);
    if (term.type === 'summer') return clamp(n(input.summerLoad), 0, 1);
    return clamp(n(input.winterLoad), 0, 1);
  }

  function capacityForTerm(term, input) {
    const overrides = input.termLoads || {};
    if (Object.prototype.hasOwnProperty.call(overrides, term.id)) {
      const max = term.type === 'fall' || term.type === 'spring' ? 5 : 1;
      return clamp(n(overrides[term.id]), 0, max);
    }
    return defaultCapacityForTerm(term, input);
  }

  function splitIntoTasks(label, credits, kind = 'generic', priority = 50) {
    const tasks = [];
    let remaining = Math.max(0, n(credits));
    while (remaining > 0) {
      const chunk = Math.min(3, remaining);
      tasks.push({ label, credits: chunk, kind, priority });
      remaining -= chunk;
    }
    return tasks;
  }

  function getNamedCourseCounts(input, program) {
    const core = program.core.map(id => ({ id, status: input.coreStatuses[id] || 'not' }));
    const electives = program.electiveCourses.map(id => ({ id, status: input.electiveStatuses[id] || 'not' }));
    return { core, electives };
  }

  function analyze(input) {
    const program = D.programs[input.program];
    const named = getNamedCourseCounts(input, program);
    const prior = clamp(n(input.priorCredits), 0, program.priorLearningMax);
    const priorElective = clamp(n(input.priorElectiveCredits), 0, prior);
    const guidanceTarget = clamp(n(input.guidanceTarget), program.guidanceMin, program.guidanceMax);
    const guidanceCompleted = clamp(n(input.guidanceCompleted), 0, guidanceTarget);
    const internshipCompleted = clamp(n(input.internshipCompleted), 0, program.internshipMax);
    const additionalElectiveCompleted = Math.max(0, n(input.additionalElectiveCompleted));

    const coreCompleted = named.core.reduce((s, x) => s + statusCredits(x.status), 0);
    const namedElectiveCompleted = named.electives.reduce((s, x) => s + statusCredits(x.status), 0);
    const electiveCompleted = namedElectiveCompleted + internshipCompleted + additionalElectiveCompleted + priorElective;

    const totalCompletedRaw = coreCompleted + namedElectiveCompleted + internshipCompleted + additionalElectiveCompleted + guidanceCompleted + prior;
    const totalCompleted = Math.min(program.totalCredits, totalCompletedRaw);
    const coreSatisfied = named.core.filter(x => x.status === 'completed').length;
    const coreRemaining = named.core.filter(x => x.status !== 'completed');

    const warnings = [];
    if (program.id === 'ms' && prior > 9) {
      warnings.push('If approved M.S. prior credit would leave fewer than 21 UB graduate credits, confirm the credit application with the Graduate School before relying on the estimate.');
    }
    if (program.id === 'ms' && prior > 6) {
      warnings.push('If more than 6 M.S. prior-learning or transfer credits are being applied, confirm the approved total with the Program Director and Graduate School.');
    }
    if (program.id === 'phd' && prior > 0) {
      warnings.push('Confirm with your adviser how approved Ph.D. prior-learning credit is allocated across the 72-credit degree requirements.');
    }

    const academicComplete = program.id === 'ms'
      ? coreSatisfied === program.core.length && guidanceCompleted >= program.guidanceMin && electiveCompleted >= program.electiveMinimum && totalCompleted >= program.totalCredits && ['passed', 'iscomplete'].includes(input.logicStatus) && input.projectStage === 'completed'
      : coreSatisfied === program.core.length && guidanceCompleted >= program.guidanceMin && electiveCompleted >= program.electiveMinimum && totalCompleted >= program.totalCredits && input.preliminarySatisfied && input.rcrCompleted && input.dissertationStage === 'defended';

    return {
      program,
      named,
      prior,
      priorElective,
      guidanceTarget,
      guidanceCompleted,
      internshipCompleted,
      additionalElectiveCompleted,
      coreCompleted,
      coreSatisfied,
      coreRemaining,
      namedElectiveCompleted,
      electiveCompleted,
      totalCompleted,
      academicComplete,
      warnings
    };
  }

  function buildRemainingRequirements(input, a) {
    const p = a.program;
    const rows = [];

    a.coreRemaining.forEach(x => {
      const action = x.status === 'lowgrade'
        ? 'Complete this requirement with a B+ or better.'
        : 'Complete this required course with a B+ or better.';
      rows.push({ type: 'Required course', item: courseLabel(x.id), action, contact: 'adviser' });
    });

    if (input.program === 'ms' && !['passed', 'iscomplete'].includes(input.logicStatus)) {
      let action = 'Take and pass the Symbolic Logic Competency Exam.';
      if (input.logicStatus === 'failed1') action = 'Retake the Symbolic Logic Competency Exam at its next offering.';
      if (input.logicStatus === 'failed2') action = 'Complete the Symbolic Logic Independent Study with B+ or better before graduation.';
      rows.push({ type: 'Milestone', item: 'Symbolic Logic Requirement', action, contact: 'programDirector' });
    }

    const electiveNeed = Math.max(0, p.electiveMinimum - a.electiveCompleted);
    if (electiveNeed > 0) {
      rows.push({ type: 'Credits', item: `${electiveNeed} more elective-category credit${electiveNeed === 1 ? '' : 's'} needed`, action: 'Complete approved electives or internship credit. Formally approved prior credit may count only as officially allocated.', contact: 'adviser' });
    }

    if (a.guidanceCompleted < p.guidanceMin) {
      rows.push({ type: 'Guidance', item: `${p.guidanceMin - a.guidanceCompleted} required guidance credit${p.guidanceMin - a.guidanceCompleted === 1 ? '' : 's'} remain`, action: `Complete ${courseLabel(p.guidanceCourse)} as appropriate.`, contact: 'adviser' });
    }

    const creditNeed = Math.max(0, p.totalCredits - a.totalCompleted);
    if (creditNeed > 0) {
      rows.push({ type: 'Credits', item: `${creditNeed} degree credit${creditNeed === 1 ? '' : 's'} remain`, action: 'Complete approved coursework and guidance consistent with the degree categories.', contact: 'adviser' });
    }

    if (input.program === 'ms') {
      if (input.projectStage !== 'completed') {
        rows.push({ type: 'Master’s Project', item: 'Master’s Project', action: input.projectStage === 'not' ? 'Agree on a project topic and supervision plan.' : 'Complete the Master’s Project and obtain faculty approval.', contact: 'adviser' });
      }
      if (!input.graduationApplied) rows.push({ type: 'Graduate School', item: 'Master’s Graduation Application in HUB', action: 'Apply for graduation by the current Graduate School deadline for your intended graduation term.', contact: 'graduateSchool' });
      if (!input.graduationSurvey) rows.push({ type: 'Graduate School', item: 'Master’s Graduation Survey', action: 'Complete the university-wide graduation survey before degree conferral.', contact: 'graduateSchool' });
    } else {
      if (!input.preliminarySatisfied) rows.push({ type: 'Graduate School', item: 'Preliminary / qualifying requirement', action: 'Confirm and complete the AO program’s approved form of the Graduate School preliminary/qualifying requirement.', contact: 'adviser' });
      if (!input.rcrCompleted) rows.push({ type: 'Graduate School', item: 'Responsible Conduct of Research (RCR) training', action: 'Complete a Graduate School-approved RCR training route.', contact: 'graduateSchool' });
      if (!input.atcFiled) rows.push({ type: 'Graduate School', item: 'Ph.D. Application to Candidacy (ATC)', action: 'File the ATC for the intended conferral date.', contact: 'graduateSchool' });
      if (input.dissertationStage !== 'defended') rows.push({ type: 'Dissertation', item: 'Dissertation and defense', action: dissertationNext(input.dissertationStage), contact: 'adviser' });
      if (!input.mFormSubmitted) rows.push({ type: 'Graduate School', item: 'M-Form', action: 'Submit/confirm the M-Form showing departmental requirements and dissertation acceptance.', contact: 'graduateSchool' });
      if (!input.etdSubmitted) rows.push({ type: 'Graduate School', item: 'Electronic dissertation submission', action: 'Submit the final dissertation electronically under Graduate School requirements.', contact: 'graduateSchool' });
      if (!input.doctoralSurveys) rows.push({ type: 'Graduate School', item: 'Doctoral surveys', action: 'Complete required doctoral graduation surveys before conferral.', contact: 'graduateSchool' });
    }

    return rows;
  }

  function dissertationNext(stage) {
    switch (stage) {
      case 'research': return 'Continue dissertation research and work with your adviser/committee toward a defensible manuscript.';
      case 'writing': return 'Complete the dissertation manuscript and prepare for committee review and defense scheduling.';
      case 'scheduled': return 'Complete the defense and final revisions; then obtain acceptance and submit final materials.';
      default: return 'Begin dissertation planning with your adviser after the appropriate coursework and guidance.';
    }
  }

  function buildNextSteps(input, a, remaining) {
    const steps = [];
    if (!input.adviserAssigned) steps.push({ priority: 1, title: 'Get your faculty adviser assignment confirmed', detail: 'Confirm your adviser assignment with the Program Director.', contact: 'programDirector' });
    if (!input.registrationConsulted) steps.push({ priority: 2, title: 'Consult your adviser before registration', detail: 'Review your course selection and progress with your adviser before registration.', contact: 'adviser' });
    remaining.slice(0, 6).forEach((r, idx) => steps.push({ priority: 10 + idx, title: r.item, detail: r.action, contact: r.contact }));
    if (a.warnings.length) steps.push({ priority: 90, title: 'Confirm how approved prior credit is being applied', detail: a.warnings[0], contact: 'programDirector' });
    return steps.sort((x, y) => x.priority - y.priority).slice(0, 7);
  }

  function createTimelineTasks(input, a) {
    const p = a.program;
    const tasks = [];

    a.named.core.filter(x => x.status !== 'completed').forEach(x => {
      tasks.push({ label: courseLabel(x.id), credits: 3, kind: 'core', priority: 1 });
    });

    const guidanceFuture = Math.max(0, a.guidanceTarget - a.guidanceCompleted);
    splitIntoTasks(courseLabel(p.guidanceCourse), guidanceFuture, 'guidance', input.program === 'phd' ? 30 : 25).forEach(t => tasks.push(t));

    const explicitFutureCredits = tasks.reduce((s, t) => s + t.credits, 0);
    let genericNeed = Math.max(0, p.totalCredits - a.totalCompleted - explicitFutureCredits);
    const electiveNeed = Math.max(0, p.electiveMinimum - a.electiveCompleted);
    genericNeed = Math.max(genericNeed, electiveNeed);
    splitIntoTasks('Approved elective / other degree coursework', genericNeed, 'elective', 20).forEach(t => tasks.push(t));

    return tasks.sort((x, y) => x.priority - y.priority);
  }

  function buildTimeline(input, a) {
    const allTerms = generateFutureTerms();
    let startIndex = allTerms.findIndex(t => t.id === input.startTerm);
    if (startIndex < 0) startIndex = 0;
    const tasks = createTimelineTasks(input, a);
    const scheduled = [];
    const routeTerms = [];
    const overrides = input.termLoads || {};
    let taskIndex = 0;

    for (let i = startIndex; i < allTerms.length && taskIndex < tasks.length; i += 1) {
      const term = allTerms[i];
      const cap = capacityForTerm(term, input);
      const baseCap = defaultCapacityForTerm(term, input);
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, term.id);
      const termTasks = [];
      let slots = cap;
      while (slots > 0 && taskIndex < tasks.length) {
        termTasks.push(tasks[taskIndex]);
        taskIndex += 1;
        slots -= 1;
      }

      const regularTerm = term.type === 'fall' || term.type === 'spring';
      const showTerm = regularTerm || cap > 0 || hasOverride;
      if (showTerm) {
        routeTerms.push({ term, tasks: termTasks, capacity: cap, baseCapacity: baseCap, hasOverride });
      }
      if (termTasks.length) scheduled.push({ term, tasks: termTasks, capacity: cap, baseCapacity: baseCap, hasOverride });
    }

    const finish = scheduled.length ? scheduled[scheduled.length - 1].term : allTerms[startIndex] || null;
    return {
      scheduled,
      routeTerms,
      finish,
      unscheduled: tasks.slice(taskIndex),
      customized: Object.keys(overrides).length > 0,
      assumption: 'Verify actual course offerings and class-specific deadlines in HUB.'
    };
  }

  function msConferralForTerm(term) {
    if (!term) return null;
    if (term.type === 'fall' || term.type === 'winter') return { graduationTerm: 'Fall', applyBy: 'Oct. 15', conferral: `Feb. 1, ${term.type === 'fall' ? term.year + 1 : term.year}` };
    if (term.type === 'spring') return { graduationTerm: 'Spring', applyBy: 'Feb. 22', conferral: `June 1, ${term.year}` };
    if (term.type === 'summer') return { graduationTerm: 'Summer', applyBy: 'July 15', conferral: `Aug. 31, ${term.year}` };
    return null;
  }

  function phDAtcDeadlineForFinish(term) {
    if (!term) return null;
    const y = term.year;
    if (term.type === 'spring') return { targetConferral: `June 1, ${y}`, atcDue: `March 1, ${y}` };
    if (term.type === 'summer') return { targetConferral: `Aug. 31, ${y}`, atcDue: `July 1, ${y}` };
    return { targetConferral: `Feb. 1, ${term.type === 'fall' ? y + 1 : y}`, atcDue: `Oct. 1, ${term.type === 'fall' ? y : y - 1}` };
  }

  function contactFor(key) {
    return D.contacts[key] || D.contacts.adviser;
  }

  function createReport(input) {
    const a = analyze(input);
    const remaining = buildRemainingRequirements(input, a);
    const nextSteps = buildNextSteps(input, a, remaining);
    const timeline = buildTimeline(input, a);
    const msConferral = input.program === 'ms' ? msConferralForTerm(timeline.finish) : null;
    const phdDeadline = input.program === 'phd' ? phDAtcDeadlineForFinish(timeline.finish) : null;
    const loadComparison = [1, 2, 3, 4, 5].map(load => {
      const t = buildTimeline({ ...input, regularLoad: load, termLoads: {} }, a);
      return { load, finish: t.finish, termsUsed: t.scheduled.length };
    });
    const contactsUsed = [...new Set(nextSteps.map(s => s.contact).concat(remaining.map(r => r.contact)))].map(key => ({ key, ...contactFor(key) }));
    return { input, analysis: a, remaining, nextSteps, timeline, msConferral, phdDeadline, loadComparison, contactsUsed };
  }

  return { STATUS, inferStartTerm, generateFutureTerms, courseLabel, createReport, analyze, buildTimeline, capacityForTerm };
})();
