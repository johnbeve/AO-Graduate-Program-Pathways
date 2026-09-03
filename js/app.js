'use strict';

(() => {
  const D = window.AO_DATA;
  const E = window.AO_ENGINE;
  const $ = s => document.querySelector(s);

  const els = {
    gate: $('#program-gate'), app: $('#planner-app'), programTitle: $('#program-title'), map: $('#journey-map'),
    checkpointKicker: $('#checkpoint-kicker'), checkpointTitle: $('#checkpoint-title'), checkpointIntro: $('#checkpoint-intro'),
    checkpointState: $('#checkpoint-state'), checkpointBody: $('#checkpoint-body'), previousStage: $('#previous-stage'), nextStage: $('#next-stage'),
    progressRing: $('#progress-ring'), progressPercent: $('#progress-percent'), currentStageLabel: $('#current-stage-label'), creditSummary: $('#credit-summary'),
    nextMoveTitle: $('#next-move-title'), nextMoveDetail: $('#next-move-detail'), goNext: $('#go-next'), branchSummary: $('#branch-summary'),
    loadBranches: $('#load-branches'), startTerm: $('#start-term'), includeSummer: $('#include-summer'), includeWinter: $('#include-winter'),
    routeFinish: $('#route-finish'), routeNote: $('#route-note'), timeline: $('#timeline'), summary: $('#summary-content'), changeProgram: $('#change-program'),
    paceSection: $('.pace-section'), summarySection: $('.summary-section'),
    printBtn: $('#print-report'), copyBtn: $('#copy-report'), downloadBtn: $('#download-report')
  };

  const stageDefs = {
    ms: [
      { id: 'start', label: 'Administrative', title: 'Complete administrative setup', intro: 'Confirm your faculty advisor assignment and discuss registration with your advisor.' },
      { id: 'logic', label: 'Logic', title: 'Satisfy Symbolic Logic', intro: 'Select the option that reflects your current Symbolic Logic status.' },
      { id: 'core', label: 'Core', title: 'Complete the core classes', intro: 'Mark each required course after completing it with a B+ or better.' },
      { id: 'electives', label: 'Electives', title: 'Complete electives and internships', intro: 'Enter completed elective and internship credits.' },
      { id: 'prior', label: 'Experience/Transfer', title: 'Review experience and transfer credit', intro: 'Enter only formally approved experience or transfer credit.' },
      { id: 'guidance', label: 'Master’s Guidance', title: 'Complete Master’s Project guidance', intro: 'Complete PHI 701 and the Master’s Project.' },
      { id: 'application', label: 'Master’s Application', title: 'Complete the Master’s graduation application', intro: 'Submit the Master’s Graduation Application and complete the graduation survey.' }
    ],
    phd: [
      { id: 'start', label: 'Administrative', title: 'Complete administrative setup', intro: 'Confirm your faculty advisor assignment and discuss registration with your advisor.' },
      { id: 'logic', label: 'Logic', title: 'Complete the logic competency checkpoint', intro: 'Indicate whether you have passed the Ph.D. logic competency requirement.' },
      { id: 'core', label: 'Core', title: 'Complete the doctoral core', intro: 'Mark each required course after completing it with a B+ or better.' },
      { id: 'electives', label: 'Electives', title: 'Complete electives and internships', intro: 'Enter completed elective and internship credits.' },
      { id: 'prior', label: 'Experience/Transfer', title: 'Review experience and transfer credit', intro: 'Enter only formally approved experience or transfer credit.' },
      { id: 'qualifying', label: 'Qualifying Examination', title: 'Complete the Qualifying Examination', intro: 'Indicate whether you have passed the faculty-panel Qualifying Examination.' },
      { id: 'topical', label: 'Topical Defense', title: 'Complete the Topical Defense', intro: 'Form your dissertation committee, submit the topical, and complete the Topical Defense.' },
      { id: 'capstone', label: 'Dissertation', title: 'Complete dissertation guidance and defense', intro: 'Track PHI 703 guidance, candidacy, and the dissertation defense.' }
    ]
  };

  let state = null;
  let selectedStage = 'start';
  let report = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function optionRange(max, selected = 0, step = 3) {
    let html = '';
    for (let x = 0; x <= max; x += step) html += `<option value="${x}"${x === Number(selected) ? ' selected' : ''}>${x}</option>`;
    return html;
  }

  function defaultState(program) {
    const p = D.programs[program];
    const coreStatuses = Object.fromEntries(p.core.map(id => [id, 'not']));
    const electiveStatuses = Object.fromEntries(p.electiveCourses.map(id => [id, 'not']));
    return {
      program,
      startTerm: E.inferStartTerm(), regularLoad: 2, summerLoad: 0, winterLoad: 0, termLoads: {},
      coreStatuses, electiveStatuses,
      electiveCreditsByCourse: Object.fromEntries(p.electiveCourses.map(id => [id, 3])),
      hasPrior: null, experienceCredits: 0, transferCredits: 0, electiveDetailsOpen: false,
      guidanceCompleted: 0,
      internshipCompleted: 0, additionalElectiveCompleted: 0,
      adviserAssigned: false, registrationConsulted: false,
      logicStatus: null, phdLogicSatisfied: false,
      projectStage: program === 'ms' ? 'not' : null,
      graduationApplied: false, graduationSurvey: false,
      qualifyingPassed: false, dissertationCommitteeFormed: false, topicalSubmitted: false, topicalDefensePassed: false,
      rcrCompleted: false, atcFiled: false,
      dissertationStage: program === 'phd' ? 'not' : null
    };
  }

  function startProgram(program) {
    state = defaultState(program);
    selectedStage = 'start';
    els.gate.hidden = true;
    els.app.hidden = false;
    els.programTitle.textContent = D.programs[program].name;
    renderStartTerms();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderStartTerms() {
    const terms = E.generateFutureTerms(2034).filter(t => ['fall', 'spring', 'summer', 'winter'].includes(t.type)).slice(0, 34);
    els.startTerm.innerHTML = terms.map(t => `<option value="${t.id}">${esc(t.label)}${t.official ? '' : ' (projected)'}</option>`).join('');
    els.startTerm.value = state.startTerm;
  }

  function makeReport() {
    report = E.createReport(state);
    return report;
  }

  function stageStatuses() {
    const a = report.analysis;
    const p = a.program;
    const statuses = {};
    statuses.start = state.adviserAssigned && state.registrationConsulted;
    if (state.program === 'ms') {
      statuses.logic = E.logicSatisfied(state.logicStatus);
      statuses.core = a.coreSatisfied === p.core.length;
      statuses.electives = a.electiveCompleted >= p.electiveMinimum;
      statuses.prior = state.hasPrior === false || (state.hasPrior === true && a.prior > 0);
      statuses.guidance = a.guidanceCompleted >= p.guidanceMin && state.projectStage === 'completed';
      statuses.application = a.academicComplete && state.graduationApplied && state.graduationSurvey;
    } else {
      statuses.logic = state.phdLogicSatisfied;
      statuses.core = a.coreSatisfied === p.core.length;
      statuses.electives = a.electiveCompleted >= p.electiveMinimum && (p.electiveMax == null || a.electiveCompleted <= p.electiveMax);
      statuses.prior = state.hasPrior === false || (state.hasPrior === true && a.prior > 0);
      statuses.qualifying = state.qualifyingPassed;
      statuses.topical = state.dissertationCommitteeFormed && state.topicalSubmitted && state.topicalDefensePassed;
      statuses.capstone = a.guidanceCompleted >= p.guidanceMin && state.rcrCompleted && state.atcFiled && state.dissertationStage === 'defended';
    }
    return statuses;
  }

  function currentStageId(statuses) {
    const stages = stageDefs[state.program];
    const first = stages.find(s => !statuses[s.id]);
    return first ? first.id : stages[stages.length - 1].id;
  }

  function renderAll() {
    if (!state) return;
    makeReport();
    const statuses = stageStatuses();
    const administrativeComplete = Boolean(statuses.start);
    if (!administrativeComplete && selectedStage !== 'start') selectedStage = 'start';
    const currentId = currentStageId(statuses);
    renderJourney(statuses, currentId);
    renderCheckpoint(statuses, currentId);
    renderPosition(currentId);
    els.paceSection.hidden = !administrativeComplete;
    els.summarySection.hidden = !administrativeComplete;
    if (administrativeComplete) {
      renderPace();
      renderSummary();
    }
  }

  function renderJourney(statuses, currentId) {
    const stages = stageDefs[state.program];
    const administrativeComplete = Boolean(statuses.start);
    els.map.style.gridTemplateColumns = `repeat(${stages.length}, minmax(88px, 1fr))`;
    els.map.innerHTML = stages.map((s, index) => {
      const locked = !administrativeComplete && s.id !== 'start';
      const statusClass = statuses[s.id] ? 'done' : s.id === currentId ? 'current' : 'future';
      const selected = s.id === selectedStage ? ' selected' : '';
      const icon = statuses[s.id] ? '✓' : locked ? '🔒' : index + 1;
      return `<button type="button" class="journey-node ${statusClass}${selected}${locked ? ' locked' : ''}" data-stage="${s.id}" aria-current="${s.id === currentId ? 'step' : 'false'}"${locked ? ' disabled aria-disabled="true" title="Complete the Administrative checkpoint first"' : ''}>
        <span class="dot">${icon}</span><span class="node-label">${esc(s.label)}</span>
      </button>`;
    }).join('');
  }

  function renderCheckpoint(statuses, currentId) {
    const stages = stageDefs[state.program];
    const index = Math.max(0, stages.findIndex(s => s.id === selectedStage));
    const stage = stages[index];
    const done = Boolean(statuses[stage.id]);
    const isCurrent = stage.id === currentId;
    els.checkpointKicker.textContent = `Checkpoint ${index + 1} of ${stages.length}`;
    els.checkpointTitle.textContent = stage.title;
    els.checkpointIntro.textContent = stage.intro;
    els.checkpointState.textContent = done ? 'Complete' : isCurrent ? 'You are here' : 'Open checkpoint';
    els.checkpointState.className = `state-badge ${done ? 'done' : isCurrent ? 'current' : ''}`;
    els.checkpointBody.innerHTML = renderStageBody(stage.id);
    const administrativeComplete = Boolean(statuses.start);
    els.previousStage.disabled = index === 0;
    els.nextStage.disabled = index === stages.length - 1 || (stage.id === 'start' && !administrativeComplete);
    els.nextStage.textContent = index === stages.length - 1 ? 'End of pathway' : stage.id === 'start' && !administrativeComplete ? 'Complete Administrative first' : 'Next checkpoint →';
  }

  function choiceButtons(name, options, current) {
    return `<div class="choice-row" role="group" aria-label="${esc(name)}">${options.map(o => `<button type="button" class="choice-button${String(current) === String(o.value) ? ' selected' : ''}" data-set="${esc(name)}" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>`;
  }

  function courseStatusSelect(id, required = true) {
    const c = D.courses[id];
    const current = required ? state.coreStatuses[id] : state.electiveStatuses[id];
    const options = [
      ['not', 'Not yet'],
      ['completed', 'Satisfied — B+ or better'],
      ['lowgrade', 'Completed below B+']
    ];
    const creditControl = !required && current === 'completed'
      ? `<label class="mini-credit">Credits <select data-elective-credits="${esc(id)}" aria-label="Credits for ${esc(c.code)}">${[1,2,3].map(x => `<option value="${x}"${Number(state.electiveCreditsByCourse[id] || 3) === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>`
      : '';
    return `<div class="course-item"><div><strong>${esc(c.code)} · ${esc(c.title)}</strong>${c.former ? `<small>formerly ${esc(c.former)}</small>` : ''}</div>
      <div class="course-controls"><select data-course="${esc(id)}" data-kind="${required ? 'core' : 'elective'}" aria-label="Status for ${esc(c.code)}">${options.map(([v, l]) => `<option value="${v}"${current === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${creditControl}</div></div>`;
  }

  function yesNo(name, current, yesLabel = 'Yes', noLabel = 'Not yet') {
    return choiceButtons(name, [{ value: 'yes', label: yesLabel }, { value: 'no', label: noLabel }], current ? 'yes' : 'no');
  }

  function priorCreditBody() {
    const p = D.programs[state.program];
    const current = state.hasPrior === null ? 'unknown' : state.hasPrior ? 'yes' : 'no';
    const total = report.analysis.prior;
    const experienceMax = Math.max(0, p.priorLearningMax - Number(state.transferCredits || 0));
    const transferMax = Math.max(0, p.priorLearningMax - Number(state.experienceCredits || 0));
    return `<div class="control-group"><h4>Do you have formally approved prior experience or transfer credit?</h4>
      ${choiceButtons('hasPrior', [{ value: 'no', label: 'No approved credit' }, { value: 'yes', label: 'Yes' }], current)}
      ${state.hasPrior === true ? `<div class="credit-path-grid">
        <div class="credit-path-card"><h4>Prior experience credit</h4><p>To obtain this credit, demonstrate competence by passing an oral or written exam.</p>
          <label class="field">Approved prior experience credits<select data-field="experienceCredits">${optionRange(experienceMax, state.experienceCredits, 1)}</select></label></div>
        <div class="credit-path-card"><h4>Transfer credit</h4><p>To obtain this credit, provide evidence of the course content (for example, a syllabus or course website) and a passing grade.</p>
          <label class="field">Approved transfer credits<select data-field="transferCredits">${optionRange(transferMax, state.transferCredits, 1)}</select></label></div>
      </div><div class="credit-total"><span>Combined approved credit</span><strong>${total} / ${p.priorLearningMax} credits</strong></div>` : ''}
    </div>`;
  }


  function renderStageBody(stage) {
    const p = D.programs[state.program];

    if (stage === 'start') {
      return `<div class="control-group"><h4>Do you have an assigned faculty advisor?</h4>${yesNo('adviserAssigned', state.adviserAssigned, 'Yes', 'No / not sure')}</div>
        ${state.adviserAssigned ? `<div class="branch-line"><div class="control-group"><h4>Have you discussed registration for the current or next term with your advisor?</h4>${yesNo('registrationConsulted', state.registrationConsulted, 'Yes', 'Not yet')}</div></div>` : `<div class="note-box">Contact the AO director to confirm your faculty advisor assignment.</div>`}`;
    }

    if (stage === 'logic' && state.program === 'ms') {
      const logicOptions = [
        ['passed', 'Competency exam passed'],
        ['iscomplete', 'B+ or better in <strong>Symbolic Logic Independent Study</strong>'],
        ['mindtap', 'Completed MindTap course'],
        ['failed1', 'One unsuccessful exam attempt'],
        ['failed2', 'Two unsuccessful exam attempts'],
        ['not', 'Not satisfied']
      ];
      return `<div class="control-group logic-control"><div><h4>How is the Symbolic Logic requirement satisfied?</h4><p>Select the option that matches your current status.</p>${state.logicStatus === 'iscomplete' ? '<div class="note-box">3 credits from Symbolic Logic Independent Study are automatically counted toward electives.</div>' : ''}</div>
        <div class="choice-row logic-choices" role="group" aria-label="Symbolic Logic status">${logicOptions.map(([value, label]) => `<button type="button" class="choice-button${state.logicStatus === value ? ' selected' : ''}" data-set="logicStatus" data-value="${value}">${label}</button>`).join('')}</div></div>`;
    }

    if (stage === 'logic' && state.program === 'phd') {
      return `<div class="control-group"><h4>Have you passed the Ph.D. logic competency requirement?</h4>${yesNo('phdLogicSatisfied', state.phdLogicSatisfied, 'Passed', 'Not yet')}</div>`;
    }

    if (stage === 'core') {
      return `<div class="control-group"><h4>Required coursework</h4><p>Mark a course satisfied only after completing it with a B+ or better.</p><div class="course-stack">${p.core.map(id => courseStatusSelect(id, true)).join('')}</div></div>`;
    }

    if (stage === 'electives') {
      const logicNote = state.program === 'ms' && state.logicStatus === 'iscomplete' ? '<div class="note-box">3 elective credits from Symbolic Logic Independent Study are already included below.</div>' : '';
      const electiveLimitText = state.program === 'phd' ? `${report.analysis.electiveCompleted} / 12–30` : `${report.analysis.electiveCompleted} / ${p.electiveMinimum}`;
      const namedCredits = report.analysis.namedElectiveCompleted;
      const otherMax = state.program === 'phd' ? Math.max(0, p.electiveMax - namedCredits) : Math.max(0, p.totalCredits);
      return `<div class="elective-total"><span>Elective credits counted</span><strong>${electiveLimitText}</strong></div>${logicNote}
        <div class="control-group"><h4>Other completed elective credits</h4><p>Enter approved elective credits not represented by a named course${state.program === 'ms' ? ', internship, or the Symbolic Logic Independent Study' : ''}. Do not double-count the same credits.</p>
        <label class="field">Other completed elective credits<select data-field="additionalElectiveCompleted">${optionRange(otherMax, state.additionalElectiveCompleted, 1)}</select></label></div>
        <div class="control-group"><h4>Completed internship credits</h4><p>${state.program === 'phd' ? 'Directed internship coursework is tracked separately from the 12–30 elective-credit requirement.' : 'Up to 6 credits of directed internship coursework may be entered.'}</p>
          <label class="field">Completed internship credits<select data-field="internshipCompleted">${optionRange(p.internshipMax, state.internshipCompleted, 1)}</select></label></div>
        <details class="advanced"${state.electiveDetailsOpen ? ' open' : ''}><summary>Optional: identify specific elective courses</summary><div class="course-stack">${p.electiveCourses.map(id => courseStatusSelect(id, false)).join('')}</div></details>`;
    }

    if (stage === 'prior') return priorCreditBody();

    if (stage === 'qualifying' && state.program === 'phd') {
      return `<div class="control-group"><h4>Have you passed the Qualifying Examination?</h4><p>A panel of faculty members evaluates the student on the designated topic.</p>${yesNo('qualifyingPassed', state.qualifyingPassed, 'Passed', 'Not yet')}</div>`;
    }

    if (stage === 'topical' && state.program === 'phd') {
      return `<div class="control-group"><h4>Have you formed your dissertation committee?</h4>${yesNo('dissertationCommitteeFormed', state.dissertationCommitteeFormed, 'Committee formed', 'Not yet')}</div>
        ${state.dissertationCommitteeFormed ? `<div class="branch-line"><div class="control-group"><h4>Have you submitted your topical to the dissertation committee?</h4>${yesNo('topicalSubmitted', state.topicalSubmitted, 'Submitted', 'Not yet')}</div></div>` : ''}
        ${state.dissertationCommitteeFormed && state.topicalSubmitted ? `<div class="branch-line"><div class="control-group"><h4>Have you passed the Topical Defense?</h4>${yesNo('topicalDefensePassed', state.topicalDefensePassed, 'Passed — ABD', 'Not yet')}</div></div>` : ''}
        ${state.topicalDefensePassed ? '<div class="success-box">Topical Defense complete. You are now at the ABD stage.</div>' : ''}`;
    }

    if (stage === 'guidance' && state.program === 'ms') {
      return `<div class="control-group"><h4>Master’s Project</h4><label class="field">Project status<select data-field="projectStage">
          ${[['not', 'Not started'], ['topic', 'Topic and supervision agreed'], ['underway', 'Project underway'], ['completed', 'Completed and approved']].map(([v, l]) => `<option value="${v}"${state.projectStage === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label></div>
        <div class="control-group"><h4>PHI 701 · MS Project Guidance</h4>
          <label class="field">Completed credits<select data-field="guidanceCompleted">${optionRange(p.guidanceMax, state.guidanceCompleted, 1)}</select></label>
        </div>`;
    }

    if (stage === 'application' && state.program === 'ms') {
      return `<div class="control-group"><h4>Master’s Graduation Application in HUB</h4>${yesNo('graduationApplied', state.graduationApplied, 'Application submitted', 'Not yet')}</div>
        ${state.graduationApplied ? `<div class="branch-line"><div class="control-group"><h4>Master’s Graduation Survey completed?</h4>${yesNo('graduationSurvey', state.graduationSurvey, 'Complete', 'Not yet')}</div></div>` : `<div class="note-box">After the graduation application is submitted, the final survey step appears here.</div>`}`;
    }

    if (stage === 'capstone' && state.program === 'phd') {
      return `<div class="control-group"><h4>PHI 703 · Dissertation Guidance</h4><p>Count completed dissertation-guidance credits. The Ph.D. requires between 12 and 30 credits of dissertation guidance.</p>
          <label class="field">Completed credits<select data-field="guidanceCompleted">${optionRange(p.guidanceMax, state.guidanceCompleted, 1)}</select></label>
        </div>
        <div class="control-group"><h4>Responsible Conduct of Research training</h4>${yesNo('rcrCompleted', state.rcrCompleted, 'Complete', 'Not yet / not sure')}</div>
        <div class="control-group"><h4>Ph.D. Application to Candidacy filed?</h4>${yesNo('atcFiled', state.atcFiled, 'Filed', 'Not yet')}</div>
        <div class="control-group"><h4>Dissertation defense</h4>${choiceButtons('dissertationStage', [
          { value: 'not', label: 'Not yet' }, { value: 'scheduled', label: 'Defense scheduled' }, { value: 'defended', label: 'Defended + accepted' }
        ], state.dissertationStage)}</div>`;
    }

    return '<p class="muted">No additional selections are needed at this checkpoint.</p>';
  }

  function renderPosition(currentId) {
    const a = report.analysis;
    const p = a.program;
    const pct = Math.min(100, Math.round((a.totalCompleted / p.totalCredits) * 100));
    els.progressRing.style.setProperty('--pct', `${pct * 3.6}deg`);
    els.progressRing.setAttribute('aria-label', `${pct}% of degree credits modeled as completed`);
    els.progressPercent.textContent = `${pct}%`;
    const current = stageDefs[state.program].find(s => s.id === currentId);
    els.currentStageLabel.textContent = current ? current.label : 'Degree pathway';
    els.creditSummary.textContent = `${a.totalCompleted} of ${p.totalCredits} credits modeled complete · ${a.coreSatisfied}/${p.core.length} core courses satisfied`;
    const next = report.nextSteps[0];
    els.nextMoveTitle.textContent = next ? next.title : 'Verify final degree clearance';
    els.nextMoveDetail.textContent = next ? next.detail : 'Your selections satisfy the modeled requirements. Confirm your official record with UB.';
    els.goNext.dataset.targetStage = stageForNextMove(next, currentId);

    const chips = [];
    if (a.experienceCredits > 0) chips.push(['Experience credit', `${a.experienceCredits} cr`]);
    if (a.transferCredits > 0) chips.push(['Transfer credit', `${a.transferCredits} cr`]);
    if (a.electiveCompleted > 0) chips.push(['Elective progress', `${a.electiveCompleted}/${p.electiveMinimum} cr`]);
    if (a.guidanceCompleted > 0) chips.push([state.program === 'ms' ? 'PHI 701 complete' : 'PHI 703 complete', `${a.guidanceCompleted} cr`]);
    if (state.program === 'ms' && E.logicSatisfied(state.logicStatus)) chips.push(['Symbolic Logic', 'Satisfied']);
    if (state.program === 'phd' && state.phdLogicSatisfied) chips.push(['Logic competency', 'Passed']);
    if (state.program === 'phd' && state.qualifyingPassed) chips.push(['Qualifying exam', 'Passed']);
    if (state.program === 'phd' && state.topicalDefensePassed) chips.push(['Topical Defense', 'ABD']);
    els.branchSummary.innerHTML = chips.map(([k, v]) => `<div class="branch-chip"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
  }

  function stageForNextMove(next, fallback) {
    if (!next) return fallback;
    const text = `${next.title} ${next.detail}`.toLowerCase();
    if (text.includes('advisor') || text.includes('adviser') || text.includes('registration')) return 'start';
    if (state.program === 'ms' && text.includes('symbolic')) return 'logic';
    if (state.program === 'phd' && text.includes('logic competency')) return 'logic';
    if (text.includes('phi 60') || text.includes('phi 51') || text.includes('required course')) return 'core';
    if (text.includes('elective') || text.includes('internship')) return 'electives';
    if (text.includes('prior') || text.includes('transfer')) return 'prior';
    if (state.program === 'ms' && (text.includes('master’s project') || text.includes('phi 701') || text.includes('guidance'))) return 'guidance';
    if (state.program === 'ms' && (text.includes('graduation application') || text.includes('graduation survey'))) return 'application';
    if (state.program === 'phd' && text.includes('qualifying examination')) return 'qualifying';
    if (state.program === 'phd' && (text.includes('topical') || text.includes('committee'))) return 'topical';
    if (state.program === 'phd' && (text.includes('dissertation') || text.includes('candidacy') || text.includes('guidance') || text.includes('conduct of research'))) return 'capstone';
    return fallback;
  }

  function loadOptionMarkup(term, selected) {
    const max = term.type === 'fall' || term.type === 'spring' ? 5 : 1;
    let html = '';
    for (let x = 0; x <= max; x += 1) {
      const label = x === 0 ? '0 — take term off' : `${x} course${x === 1 ? '' : 's'}`;
      html += `<option value="${x}"${Number(selected) === x ? ' selected' : ''}>${label}</option>`;
    }
    return html;
  }

  function paceLabel(load) {
    if (load === 1) return 'Light pace';
    if (load === 2) return 'Moderate pace';
    if (load === 3) return 'Faster pace';
    if (load === 4) return 'Heavy pace';
    return 'Maximum modeled pace';
  }

  function renderPace() {
    els.startTerm.value = state.startTerm;
    els.includeSummer.checked = Number(state.summerLoad) > 0;
    els.includeWinter.checked = Number(state.winterLoad) > 0;
    els.loadBranches.innerHTML = report.loadComparison.map(x => {
      const selected = Number(state.regularLoad) === x.load;
      const finishText = x.finish?.label ? `Credit plan: ${x.finish.label}` : 'No added credit terms';
      return `<button type="button" class="load-card${selected ? ' selected' : ''}" data-load="${x.load}" aria-pressed="${selected}">
        <span class="load-count">${x.load}</span>
        <span class="load-unit">course${x.load === 1 ? '' : 's'} / Fall &amp; Spring</span>
        <span class="load-finish">${esc(finishText)}</span>
        <small>${esc(selected ? 'Selected starting pace' : paceLabel(x.load))}</small>
      </button>`;
    }).join('');

    els.loadBranches.querySelectorAll('[data-load]').forEach(button => {
      button.addEventListener('click', () => {
        state.regularLoad = Number(button.dataset.load);
        state.termLoads = {};
        renderAll();
      });
    });

    const finish = report.timeline.finish;
    const customText = report.timeline.customized ? ' · customized by semester' : '';
    els.routeFinish.textContent = finish ? `Projected credit completion: ${finish.label}` : 'No additional credit-bearing terms modeled';
    els.routeNote.textContent = `Starting pace: ${state.regularLoad} course${state.regularLoad === 1 ? '' : 's'} per Fall/Spring term${customText}. Change any semester below; later coursework shifts automatically.`;

    if (!report.timeline.routeTerms.length) {
      els.timeline.innerHTML = '<div class="success-box">No additional credit-bearing terms are needed based on the selections entered.</div>';
      return;
    }

    const cards = report.timeline.routeTerms.map((row, index) => {
      const isOff = row.capacity === 0;
      const tasks = row.tasks.length
        ? row.tasks.map(t => `<li>${esc(shortTask(t.label))}<small>${t.credits} credits</small></li>`).join('')
        : '<li class="empty-term">Term off. Remaining coursework moves to a later term.</li>';
      return `<article class="term-card${isOff ? ' term-off' : ''}">
        <div class="term-card-head">
          <div class="term-title-block"><span class="term-sequence">Term ${index + 1}</span><h4>${esc(row.term.label)}</h4><span>${row.term.official ? 'UB term dates loaded' : 'Projected planning term'}</span></div>
          <label class="term-load-label">Courses this term
            <select data-term-load="${esc(row.term.id)}" data-term-type="${esc(row.term.type)}" aria-label="Courses in ${esc(row.term.label)}">${loadOptionMarkup(row.term, row.capacity)}</select>
          </label>
        </div>
        <ul>${tasks}</ul>
      </article>`;
    }).join('');

    const caveat = state.program === 'phd'
      ? 'Credit timeline only. Dissertation completion time varies. Verify course offerings in HUB.'
      : 'Verify course offerings in HUB.';
    els.timeline.innerHTML = `${cards}<p class="route-disclaimer">${esc(caveat)}</p>`;
  }

  function shortTask(label) {
    return label.replace(/ \(formerly[^)]*\)/g, '').replace('Approved elective / other degree coursework', 'Approved elective coursework');
  }

  function renderSummary() {
    const a = report.analysis;
    const nextHtml = report.nextSteps.length ? `<ol>${report.nextSteps.map(s => `<li><strong>${esc(s.title)}</strong><br>${esc(s.detail)}</li>`).join('')}</ol>` : '<div class="success-box">The modeled requirements are satisfied. Verify the official record and final Graduate School processing.</div>';
    const remainingHtml = report.remaining.length ? report.remaining.map(r => `<div class="requirement-row"><span class="req-pill">${esc(r.type)}</span><div><strong>${esc(r.item)}</strong><p>${esc(r.action)}</p></div></div>`).join('') : '<div class="success-box">No modeled academic requirements remain.</div>';
    const warningHtml = a.warnings.length ? `<div class="summary-panel"><h3>Confirm before relying on the estimate</h3>${a.warnings.map(w => `<div class="warning-box">${esc(w)}</div>`).join('')}</div>` : '';
    els.summary.innerHTML = `<div class="summary-panel"><h3>What to do next</h3>${nextHtml}</div>
      <div class="summary-panel"><h3>Still showing as incomplete</h3>${remainingHtml}</div>
      ${warningHtml}
      <div class="summary-panel"><h3>Who to contact</h3>${report.contactsUsed.length ? `<ul>${report.contactsUsed.map(c => `<li><strong>${esc(c.role)}</strong>${c.name ? ` — ${esc(c.name)}` : ''}${c.email ? ` · <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}<br>${esc(c.when)}</li>`).join('')}</ul>` : '<p>Your advisor remains the first contact for course and progress questions.</p>'}</div>`;
  }

  function setBoolean(field, value) {
    state[field] = value === 'yes';
  }

  function handleChoice(field, value) {
    if (field === 'hasPrior') {
      state.hasPrior = value === 'yes';
      if (!state.hasPrior) { state.experienceCredits = 0; state.transferCredits = 0; }
    } else if (['adviserAssigned', 'registrationConsulted', 'phdLogicSatisfied', 'qualifyingPassed', 'dissertationCommitteeFormed', 'topicalSubmitted', 'topicalDefensePassed', 'rcrCompleted', 'atcFiled', 'graduationApplied', 'graduationSurvey'].includes(field)) {
      setBoolean(field, value);
      if (field === 'adviserAssigned' && !state.adviserAssigned) state.registrationConsulted = false;
      if (field === 'dissertationCommitteeFormed' && !state.dissertationCommitteeFormed) { state.topicalSubmitted = false; state.topicalDefensePassed = false; }
      if (field === 'topicalSubmitted' && !state.topicalSubmitted) state.topicalDefensePassed = false;
    } else {
      state[field] = value;
    }
    normalizeState();
    renderAll();
  }

  function normalizeState() {
    const p = D.programs[state.program];
    if (!state.termLoads || typeof state.termLoads !== 'object') state.termLoads = {};
    state.experienceCredits = Math.max(0, Math.min(p.priorLearningMax, Number(state.experienceCredits || 0)));
    state.transferCredits = Math.max(0, Math.min(p.priorLearningMax - state.experienceCredits, Number(state.transferCredits || 0)));
    state.guidanceCompleted = Math.max(0, Math.min(p.guidanceMax, Number(state.guidanceCompleted || 0)));
    state.internshipCompleted = Math.max(0, Math.min(p.internshipMax, Number(state.internshipCompleted || 0)));
    if (!state.electiveCreditsByCourse || typeof state.electiveCreditsByCourse !== 'object') state.electiveCreditsByCourse = {};
    p.electiveCourses.forEach(id => { state.electiveCreditsByCourse[id] = Math.max(1, Math.min(3, Number(state.electiveCreditsByCourse[id] || 3))); });
    const namedElectiveCredits = p.electiveCourses.reduce((sum, id) => sum + (state.electiveStatuses[id] === 'completed' ? state.electiveCreditsByCourse[id] : 0), 0);
    const maxOther = p.electiveMax == null ? p.totalCredits : Math.max(0, p.electiveMax - namedElectiveCredits);
    state.additionalElectiveCompleted = Math.max(0, Math.min(maxOther, Number(state.additionalElectiveCompleted || 0)));
  }

  function handleField(el) {
    const field = el.dataset.field;
    if (!field) return;
    const numeric = ['experienceCredits', 'transferCredits', 'guidanceCompleted', 'internshipCompleted', 'additionalElectiveCompleted'];
    state[field] = numeric.includes(field) ? Number(el.value) : el.value;
    if (field === 'startTerm') {
      els.startTerm.value = el.value;
      state.termLoads = {};
    }
    normalizeState();
    renderAll();
  }

  function selectStage(id, scroll = false) {
    if (!stageDefs[state.program].some(s => s.id === id)) return;
    const administrativeComplete = state.adviserAssigned && state.registrationConsulted;
    if (!administrativeComplete && id !== 'start') id = 'start';
    selectedStage = id;
    renderAll();
    if (scroll) $('#checkpoint').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reportToText() {
    const a = report.analysis;
    const lines = [
      'UB Applied Ontology Degree Progress Planner', a.program.name, '',
      `Completed credits modeled: ${a.totalCompleted}/${a.program.totalCredits}`,
      `Required courses satisfied: ${a.coreSatisfied}/${a.program.core.length}`, '', 'WHAT TO DO NEXT'
    ];
    report.nextSteps.forEach((s, i) => lines.push(`${i + 1}. ${s.title} — ${s.detail}`));
    lines.push('', 'REMAINING REQUIREMENTS');
    report.remaining.forEach(r => lines.push(`- ${r.item}: ${r.action}`));
    lines.push('', `SELECTED ROUTE — starting pace ${state.regularLoad} course${state.regularLoad === 1 ? '' : 's'} per Fall/Spring semester${report.timeline.customized ? ' (customized by semester)' : ''}`);
    report.timeline.routeTerms.forEach(row => {
      lines.push(`${row.term.label} — ${row.capacity} course${row.capacity === 1 ? '' : 's'}`);
      row.tasks.forEach(t => lines.push(`  - ${t.label} (${t.credits} cr)`));
    });
    if (a.warnings.length) {
      lines.push('', 'ITEMS TO CONFIRM');
      a.warnings.forEach(w => lines.push(`- ${w}`));
    }
    lines.push('', 'Nothing entered into this page is stored by the application.');
    return lines.join('\n');
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportToText());
      const old = els.copyBtn.textContent;
      els.copyBtn.textContent = 'Copied';
      setTimeout(() => { els.copyBtn.textContent = old; }, 1300);
    } catch {
      alert('Your browser blocked clipboard access. Use Download text or Print / Save PDF instead.');
    }
  }

  function downloadReport() {
    const blob = new Blob([reportToText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ao-${state.program}-degree-path.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('click', event => {
    const programButton = event.target.closest('[data-program]');
    if (programButton) { startProgram(programButton.dataset.program); return; }
    const stageButton = event.target.closest('[data-stage]');
    if (stageButton && state) { selectStage(stageButton.dataset.stage, true); return; }
    const choice = event.target.closest('[data-set]');
    if (choice && state) { handleChoice(choice.dataset.set, choice.dataset.value); }
  });

  document.addEventListener('change', event => {
    if (!state) return;
    if (event.target.matches('[data-field]')) { handleField(event.target); return; }
    if (event.target.matches('[data-term-load]')) {
      const id = event.target.dataset.termLoad;
      const termType = event.target.dataset.termType;
      const value = Number(event.target.value);
      const baseline = termType === 'fall' || termType === 'spring'
        ? Number(state.regularLoad)
        : termType === 'summer' ? Number(state.summerLoad) : Number(state.winterLoad);
      if (value === baseline) delete state.termLoads[id];
      else state.termLoads[id] = value;
      renderAll();
      return;
    }
    if (event.target.matches('[data-elective-credits]')) {
      const id = event.target.dataset.electiveCredits;
      state.electiveCreditsByCourse[id] = Number(event.target.value);
      state.electiveDetailsOpen = true;
      normalizeState();
      renderAll();
      return;
    }
    if (event.target.matches('[data-course]')) {
      const kind = event.target.dataset.kind;
      const id = event.target.dataset.course;
      if (kind === 'core') state.coreStatuses[id] = event.target.value;
      else {
        const previous = state.electiveStatuses[id];
        state.electiveStatuses[id] = event.target.value;
        state.electiveDetailsOpen = true;
        if (state.program === 'phd' && event.target.value === 'completed') {
          const p = D.programs.phd;
          const named = p.electiveCourses.reduce((sum, courseId) => sum + (state.electiveStatuses[courseId] === 'completed' ? Number(state.electiveCreditsByCourse[courseId] || 3) : 0), 0);
          if (named + Number(state.additionalElectiveCompleted || 0) > p.electiveMax) {
            state.electiveStatuses[id] = previous;
            alert('Ph.D. elective credits cannot exceed 30 credits. Reduce other elective credits before adding this course.');
          }
        }
      }
      normalizeState();
      renderAll();
    }
  });

  document.addEventListener('toggle', event => {
    if (state && event.target.matches('details.advanced')) state.electiveDetailsOpen = event.target.open;
  }, true);

  els.previousStage.addEventListener('click', () => {
    const stages = stageDefs[state.program];
    const i = stages.findIndex(s => s.id === selectedStage);
    if (i > 0) selectStage(stages[i - 1].id, true);
  });

  els.nextStage.addEventListener('click', () => {
    const stages = stageDefs[state.program];
    const i = stages.findIndex(s => s.id === selectedStage);
    if (i >= 0 && i < stages.length - 1) selectStage(stages[i + 1].id, true);
  });

  els.goNext.addEventListener('click', () => selectStage(els.goNext.dataset.targetStage || currentStageId(stageStatuses()), true));
  els.startTerm.addEventListener('change', () => {
    state.startTerm = els.startTerm.value;
    state.termLoads = {};
    renderAll();
  });
  els.includeSummer.addEventListener('change', () => {
    state.summerLoad = els.includeSummer.checked ? 1 : 0;
    Object.keys(state.termLoads).filter(id => id.startsWith('summer-')).forEach(id => delete state.termLoads[id]);
    renderAll();
  });
  els.includeWinter.addEventListener('change', () => {
    state.winterLoad = els.includeWinter.checked ? 1 : 0;
    Object.keys(state.termLoads).filter(id => id.startsWith('winter-')).forEach(id => delete state.termLoads[id]);
    renderAll();
  });

  els.changeProgram.addEventListener('click', () => {
    state = null; report = null; els.app.hidden = true; els.gate.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  els.printBtn.addEventListener('click', () => window.print());
  els.copyBtn.addEventListener('click', copyReport);
  els.downloadBtn.addEventListener('click', downloadReport);
})();
