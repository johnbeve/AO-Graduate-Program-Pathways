'use strict';

window.AO_DATA = (() => {
  const courses = {
    PHI519: { id: 'PHI519', code: 'PHI 519', title: 'Intro Logic for Advanced Students', former: 'PHI 517' },
    PHI517: { id: 'PHI517', code: 'PHI 517', title: 'Philosophy of Language', former: 'PHI 528' },
    PHI521: { id: 'PHI521', code: 'PHI 521', title: 'Topics in Logic', former: 'PHI 519' },
    PHI602: { id: 'PHI602', code: 'PHI 602', title: 'Logic for Ontologies', former: 'PHI 635 (handbook lists PHI 636)' },
    PHI604: { id: 'PHI604', code: 'PHI 604', title: 'Ontology Engineering', former: 'PHI 530' },
    PHI605: { id: 'PHI605', code: 'PHI 605', title: 'Topics in Applied Ontology', former: 'PHI 531: Problems in Ontology' },
    PHI606: { id: 'PHI606', code: 'PHI 606', title: 'Applied Ontology Seminar', former: 'PHI 598' },
    PHI607: { id: 'PHI607', code: 'PHI 607', title: 'Semantic Data Integration', former: 'PHI 548: Ontology for Data Science' },
    PHI609: { id: 'PHI609', code: 'PHI 609', title: 'Ontology and AI', former: null },
    PHI611: { id: 'PHI611', code: 'PHI 611', title: 'Geospatial Ontology', former: 'PHI 550: Spatial Ontology' },
    PHI614: { id: 'PHI614', code: 'PHI 614', title: 'Ontology of Society', former: 'PHI 650' },
    PHI599: { id: 'PHI599', code: 'PHI 599', title: 'Graduate Tutorial / Independent Study', former: null },
    PHI696: { id: 'PHI696', code: 'PHI 696', title: 'Applied Ontology Internship', former: 'PHI 596' },
    PHI701: { id: 'PHI701', code: 'PHI 701', title: 'MS Project Guidance', former: null },
    PHI703: { id: 'PHI703', code: 'PHI 703', title: 'Dissertation Guidance', former: null },
    BMI501: { id: 'BMI501', code: 'BMI 501', title: 'Survey of Biomedical Informatics', former: null },
    BMI508: { id: 'BMI508', code: 'BMI 508', title: 'Biomedical Ontology', former: null },
    BMI521: { id: 'BMI521', code: 'BMI 521', title: 'Logic Programming for Biomedical Ontologies', former: null },
    BMI708: { id: 'BMI708', code: 'BMI 708', title: 'Advanced Topics in Biomedical Ontology', former: null },
    LIN567: { id: 'LIN567', code: 'LIN 567', title: 'Computational Linguistics', former: null },
    MGS628: { id: 'MGS628', code: 'MGS 628', title: 'Data Visualization', former: null },
    MGS596: { id: 'MGS596', code: 'MGS 596', title: 'NLP in Management Research', former: null },
    MGS660: { id: 'MGS660', code: 'MGS 660', title: 'Big Data Information Management', former: null },
    GEO511: { id: 'GEO511', code: 'GEO 511', title: 'Spatial Data Science', former: null },
    GEO595: { id: 'GEO595', code: 'GEO 595', title: 'Database Design for GIS', former: null },
    CSE542: { id: 'CSE542', code: 'CSE 542', title: 'Software Engineering Concepts', former: null },
    CSE560: { id: 'CSE560', code: 'CSE 560', title: 'Data Models and Query Languages', former: null },
    CSE562: { id: 'CSE562', code: 'CSE 562', title: 'Database Systems', former: null }
  };

  const commonElectives = [
    'PHI602', 'PHI521', 'PHI517', 'PHI611', 'PHI609', 'PHI614', 'PHI599',
    'BMI501', 'BMI508', 'BMI521', 'BMI708', 'LIN567', 'MGS628', 'MGS596',
    'MGS660', 'GEO511', 'GEO595', 'CSE542', 'CSE560', 'CSE562'
  ];

  const programs = {
    ms: {
      id: 'ms',
      name: 'M.S. in Applied Ontology',
      totalCredits: 30,
      coreCredits: 9,
      core: ['PHI604', 'PHI605', 'PHI606'],
      electiveMinimum: 12,
      electiveMax: null,
      guidanceCourse: 'PHI701',
      guidanceMin: 3,
      guidanceMax: 9,
      internshipMax: 6,
      priorLearningMax: 6,
      electiveCourses: commonElectives,
      description: '30-credit fully online Applied Ontology M.S. planning model.'
    },
    phd: {
      id: 'phd',
      name: 'Ph.D. in Applied Ontology',
      totalCredits: 72,
      coreCredits: 18,
      core: ['PHI519', 'PHI604', 'PHI605', 'PHI606', 'PHI607', 'PHI602'],
      electiveMinimum: 12,
      electiveMax: 30,
      guidanceCourse: 'PHI703',
      guidanceMin: 12,
      guidanceMax: 30,
      internshipMax: 12,
      priorLearningMax: 14,
      electiveCourses: ['PHI521', 'PHI517', 'PHI611', 'PHI609', 'PHI614', 'PHI599',
        'BMI501', 'BMI508', 'BMI521', 'BMI708', 'LIN567', 'MGS628', 'GEO511', 'GEO595', 'CSE560', 'CSE562'],
      description: '72-credit Applied Ontology Ph.D. planning model.'
    }
  };

  const officialTerms = [
    { id: 'fall-2026', label: 'Fall 2026', type: 'fall', year: 2026, start: '2026-08-24', end: '2026-12-07', finalsEnd: '2026-12-16', official: true },
    { id: 'winter-2027', label: 'Winter 2027', type: 'winter', year: 2027, start: '2026-12-28', end: '2027-01-15', official: true },
    { id: 'spring-2027', label: 'Spring 2027', type: 'spring', year: 2027, start: '2027-01-20', end: '2027-05-04', finalsEnd: '2027-05-13', official: true },
    { id: 'summer-2027', label: 'Summer 2027', type: 'summer', year: 2027, start: '2027-05-24', end: '2027-08-13', official: true },
    { id: 'fall-2027', label: 'Fall 2027', type: 'fall', year: 2027, start: '2027-08-23', end: '2027-12-06', finalsEnd: '2027-12-15', official: true },
    { id: 'winter-2028', label: 'Winter 2028', type: 'winter', year: 2028, start: '2027-12-27', end: '2028-01-14', official: true },
    { id: 'spring-2028', label: 'Spring 2028', type: 'spring', year: 2028, start: '2028-01-19', end: '2028-05-02', finalsEnd: '2028-05-11', official: true },
    { id: 'summer-2028', label: 'Summer 2028', type: 'summer', year: 2028, start: '2028-05-30', end: '2028-08-18', official: true },
    { id: 'fall-2028', label: 'Fall 2028', type: 'fall', year: 2028, start: '2028-08-28', end: '2028-12-11', finalsEnd: '2028-12-20', official: true },
    { id: 'winter-2029', label: 'Winter 2029', type: 'winter', year: 2029, start: '2028-12-28', end: '2029-01-19', official: true },
    { id: 'spring-2029', label: 'Spring 2029', type: 'spring', year: 2029, start: '2029-01-24', end: '2029-05-08', finalsEnd: '2029-05-17', official: true },
    { id: 'summer-2029', label: 'Summer 2029', type: 'summer', year: 2029, start: '2029-05-29', end: '2029-08-17', official: true },
    { id: 'fall-2029', label: 'Fall 2029', type: 'fall', year: 2029, start: '2029-08-27', end: '2029-12-10', finalsEnd: '2029-12-19', official: true },
    { id: 'winter-2030', label: 'Winter 2030', type: 'winter', year: 2030, start: '2029-12-28', end: '2030-01-18', official: true },
    { id: 'spring-2030', label: 'Spring 2030', type: 'spring', year: 2030, start: '2030-01-23', end: '2030-05-07', finalsEnd: '2030-05-16', official: true }
  ];

  const links = {
    program: 'https://www.buffalo.edu/cas/philosophy/grad-study/ontology.html',
    calendar: 'https://www.buffalo.edu/registrar/calendars.html',
    futureCalendar: 'https://www.buffalo.edu/registrar/calendars/future-academic-calendars.html',
    graduation: 'https://www.buffalo.edu/grad/succeed/graduate/requirements.html',
    applyGraduation: 'https://www.buffalo.edu/grad/succeed/graduate/apply-for-graduation.html',
    phdAtc: 'https://www.buffalo.edu/grad/succeed/graduate/application-to-candidacy.html',
    graduateSchool: 'https://www.buffalo.edu/grad.html',
    phdChecklist: 'https://www.buffalo.edu/grad/succeed/graduate/phd-checklist.html',
    policy: 'https://www.buffalo.edu/grad/succeed/current-students/policy-library.degree-requirements.html'
  };

  const contacts = {
    adviser: {
      role: 'Your assigned faculty advisor',
      when: 'Course selection, registration consultation, research/project planning, elective approval and academic progress.'
    },
    programDirector: {
      role: 'Applied Ontology Program Director',
      name: 'John Beverley',
      email: 'johnbeve@buffalo.edu',
      when: 'Program-rule questions, Symbolic Logic requirements, experience/transfer credit questions, exceptions and unresolved requirement questions.'
    },
    graduateSchool: {
      role: 'UB Graduate School',
      email: 'grad@buffalo.edu',
      when: 'University-level graduation requirements, degree conferral, ATC and final-document questions.'
    },
    registrar: {
      role: 'UB Registrar / HUB',
      when: 'Class-specific registration, drop/add, resign and term deadline verification.'
    }
  };

  return { courses, programs, officialTerms, links, contacts };
})();
