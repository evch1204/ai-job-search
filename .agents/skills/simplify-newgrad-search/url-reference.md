# SimplifyJobs New-Grad list - data reference

- Source: `https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md` (no robots.txt published; GitHub's own robots.txt allows the repo page).
- Structure: one `## <emoji> <Section> New Grad Roles` heading per section, each with an HTML `<table>`; rows are `<tr>` with five `<td>` cells: Company, Role, Location, Application, Age.
- Company `↳` means "same company as the row above".
- Markers (in the Role or Company cell): 🛂 does NOT offer sponsorship, 🇺🇸 requires US citizenship, 🔥 FAANG+, 🎓 advanced degree required. 🔒 in the Application cell means closed.
- Multi-location cells: `<details><summary><strong>N locations</strong></summary>A</br>B</details>`.
- Application cell: first non-simplify.jobs `href` = employer posting; `https://simplify.jobs/p/<uuid>` = Simplify page (its uuid is the CLI's `id`).
- Age: `Nd` days, `Nmo` months (parsed as 30 days).
- Parsing anchors: `helpers.ts` `parseList` / `SECTIONS`. If the table markup changes, the fixture in `cli/tests/fixtures/list.md` shows the expected shape.
