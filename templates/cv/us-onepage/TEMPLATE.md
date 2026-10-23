# Template: us-onepage

- **Type:** CV
- **Source extension:** .tex
- **Engine/toolchain:** tectonic (XeTeX)
- **Page limit:** 1 page(s)
- **Fonts:** TeX Gyre Termes (shipped in tectonic's bundle - downloaded on first compile, no install needed)
- **Class/packages:** article; geometry, fontspec, titlesec, enumitem, hyperref

## Compile command

    cd cv && rm -f <file>.pdf && mkdir -p build && tectonic -X compile --outdir build <file>.tex && mv build/<file>.pdf ./

## Style rules

- **US resume, US Letter, exactly 1 page.** Never 2. If it spills, cut the weakest bullet (oldest role first), never shrink the font or margins.
- **Sections, in this exact order and with these exact headings:** Professional Experience, Projects, Education, Technical Skills. Nothing else: no summary/profile statement/objective, no core competencies, no languages, no publications, no awards section, no references, no photo, no date of birth or nationality.
- **Header:** name (22pt bold, centered), then one contact line: City, ST • email • phone • linkedin • github. Email and phone stay literal text (ATS reads them).
- **Experience entry:** `\jobentry{Company}{Location}{Title}{Mon YYYY -- Mon YYYY}`, then 3 bullets for each of the two most recent roles and 2-3 for older ones. Reverse chronological.
- **Project entry:** `\projectentry{Name}{Tech stack}` then 2 bullets. Order projects by relevance to the posting.
- **Bullet formula (Google XYZ):** every bullet reads as *Accomplished [X] as measured by [Y], by doing [Z]*. Lead with a strong past-tense verb, name the concrete tech in Z, and **bold** the 1-2 phrases a recruiter should see first (the metric or the named system). One to two lines each; no bullet may wrap to a third line.
  - Only metrics that exist in `01-candidate-profile.md`. If a bullet has no real metric, state the concrete outcome (shipped, adopted, replaced, unblocked) - never invent a number.
- **Technical Skills:** two lines, `Languages:` and `Frameworks & Tools:`. Reorder so the posting's stack appears first; only list skills the profile supports.
- **Education:** school + dates on one line, degree on the next, `Relevant Coursework:` line (trim courses irrelevant to the posting if space is needed).
- Dates use `--` (en dash) and three-letter months.
- Keep the `\hypersetup{pdftitle=..., pdfauthor=...}` line filled with the candidate's name: some ATS show the PDF title instead of the filename.
- The file the user uploads is `cv/submit/<company>_<role>/Tei_Chang_Resume.pdf` (`/apply` Step 5f), never `main_<company>_<role>.pdf`.

## Known pitfalls

- **Run the layout check as `python3 tools/verify_layout.py cv/main_<company>_<role>.pdf --no-footer`.** The template has no page-number footer, so a full page legitimately runs into the bottom 90pt band that the default check reserves for a footer; without the flag every full resume is misreported as a footer collision.
- `%`, `&`, `#`, `$`, `_` must be escaped (`85\%+`, `C\#`, `Probability \& Statistics`) - an unescaped `%` silently comments out the rest of the line.
- First compile downloads the TeX bundle (needs network once); later compiles are offline-cached.
- `\section` headings are uppercased by the template - write them in Title Case in the source.
