# UB Applied Ontology Degree Progress Planner

A static, privacy-preserving GitHub Pages application for University at Buffalo Applied Ontology M.S. and Ph.D. students.

## Student experience

The planner uses a progressive pathway rather than a long form. Students choose a degree, complete checkpoints, and see their credit position, next action, and possible course-load routes update immediately.

The **Administrative** checkpoint is a gate. Students must indicate that they have:

1. an assigned faculty advisor, and
2. discussed registration with that advisor.

Until both are confirmed, later checkpoints and route planning remain locked.

### M.S. pathway

1. **Administrative**
2. **Logic**
3. **Core**
4. **Electives**
5. **Experience/Transfer**
6. **Master’s Guidance**
7. **Master’s Application**

The M.S. has one culminating experience in this planner: the **Master’s Project**.

The same Symbolic Logic checkpoint is used for both the M.S. and Ph.D. It includes competency-exam, Independent Study, MindTap, and unsuccessful-attempt states. Completing the Symbolic Logic Independent Study with a B+ or better automatically contributes 3 elective credits.

### Ph.D. pathway

1. **Administrative**
2. **Core**
3. **Electives**
4. **Experience/Transfer**
5. **Research**
6. **Dissertation**
7. **Topical Defense**
8. **Dissertation**

## Course status choices

Named courses use the same choices across both degrees:

- Not yet
- Satisfied — B+ or better
- Completed below B+

Only courses marked **Satisfied — B+ or better** count as completed requirements in the planner.

## Experience and transfer credit

The planner treats these as separate inputs:

- **Prior experience credit** — students are instructed that competence must be demonstrated by passing an oral or written exam.
- **Transfer credit** — students are instructed to provide evidence of course content, such as a syllabus or course website, together with a passing grade.

The planner counts approved experience and transfer credit separately toward total degree credits. The combined cap is 6 credits for the M.S. and 14 credits for the Ph.D. These credits are not automatically assigned to the elective minimum.

## Course-load simulator

After the Administrative checkpoint is complete, the **How fast do you want to move?** section compares 1–5 courses per regular Fall/Spring semester.

Students can then customize each generated semester individually:

- Fall/Spring: 0–5 courses
- Summer/Winter: 0–1 course when enabled

Setting a term to 0 moves remaining coursework later and recalculates the finish term. The route is a planning model, not a guarantee that a particular course will be offered in a particular term.

## Privacy architecture

There is no server-side application and no database. The site uses:

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
- `js/engine.js` — credit calculations, next-step rules and timeline simulation.
- `js/app.js` — progressive pathway interface and report output.
- `css/styles.css` — presentation.
- `SOURCE_NOTES.md` — rule and maintenance notes.
- `tests.html` + `js/tests.js` — browser calculation tests.

## Tests

Open `tests.html` in a browser. A passing build should report `0 failures`.


### Current Ph.D. milestone sequence

The Ph.D. pathway includes Administrative, Logic, Core, Electives, Experience/Transfer, Qualifying Examination, Topical Defense, and Dissertation checkpoints. Its Logic checkpoint uses the same Symbolic Logic options and rules as the M.S. The Topical Defense sequence asks whether the dissertation committee has been formed, whether the topical has been submitted to that committee, and whether the defense has been passed; passing marks the student as ABD in the planner.
