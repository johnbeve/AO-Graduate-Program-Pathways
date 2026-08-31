# UB Applied Ontology Degree Progress Planner

## Visual pathway interface

This is a static, privacy-preserving GitHub Pages application for University at Buffalo Applied Ontology M.S. and Ph.D. students.

The interface is intentionally linear and progressive: students choose a degree, move through visible checkpoints, and see the route change as requirements are satisfied. The first unresolved checkpoint is marked **You are here**. Only the controls relevant to the selected checkpoint are shown.

### M.S. pathway

1. Start / adviser setup
2. Symbolic Logic
3. Core courses
4. Electives and internships
5. Approved prior-learning / transfer credit
6. PHI 701 and the Master’s Project
7. Master’s Graduation Application

The M.S. has one culminating experience in this planner: the **Master’s Project**.

### Ph.D. pathway

1. Start / adviser setup
2. Core courses
3. Electives and internships
4. Approved prior-learning credit
5. Preliminary/qualifying requirement + RCR
6. PHI 703, candidacy and dissertation
7. Final doctoral processing

## Credit-status choices

Named course controls are deliberately simple and consistent across both degrees:

- Not yet
- Satisfied — B+ or better
- Completed below B+

Only completed credit is counted toward completed degree requirements.

## Course-load simulator

The **How fast do you want to move?** section compares 1–5 courses per regular Fall/Spring semester. Selecting a load immediately:

- highlights that route,
- updates the selected-route heading,
- reallocates remaining modeled courses across terms, and
- changes the modeled finish term.

Optional Summer and Winter study can also be toggled on. This is a capacity model rather than a course-offering guarantee.

## Privacy architecture

There is no server-side application and no database. The site intentionally uses:

- no login
- no form submission
- no cookies
- no analytics
- no `localStorage`
- no `sessionStorage`
- no API calls
- no third-party scripts or CDNs

Selections exist only in JavaScript memory and disappear when the tab is refreshed or closed.

## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

VS Code's Live Server extension also works.

## Publish with GitHub Pages

1. Copy the contents of this folder into the repository root.
2. Commit and push to GitHub.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**.
5. Select the publishing branch (normally `main`) and `/ (root)`.
6. Save.

The included `.nojekyll` file tells GitHub Pages to serve the static files directly.

## Project structure

- `js/data.js` — requirements, course-number mappings, terms, contacts and links.
- `js/engine.js` — credit calculations and timeline simulation.
- `js/app.js` — progressive pathway interface and report output.
- `css/styles.css` — presentation.
- `SOURCE_NOTES.md` — rule and maintenance notes.
- `tests.html` + `js/tests.js` — browser smoke tests.

## Important limitations

- This is not HUB and not an official degree audit.
- Course availability is not inferred. Students must verify offerings and class-specific deadlines in HUB.
- The M.S. source materials use different limits for some forms of prior credit; the planner flags entries above the handbook's 6-credit figure for confirmation rather than resolving that policy question itself.
- The Ph.D. proposal permits up to 36 PLA credits but does not specify exactly which categories those credits replace; named core requirements therefore remain explicit.
- The supplied Ph.D. proposal does not define the AO program's exact internal preliminary/qualifying mechanism, so the planner tracks the generic requirement without inventing a program-specific sequence.

## Tests

Open `tests.html` in a browser. A passing build should report `0 failures`.
