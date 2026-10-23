---
name: job-application-assistant
description: >
  Assists with US job applications: evaluating job postings (visa sponsorship first), tailoring
  1-page resumes, writing cover letters when a posting asks, and preparing for interviews. Triggers
  on keywords like: job posting, job application, CV, resume, cover letter, interview prep, job fit,
  career, application, apply, sponsorship, OPT, H-1B
allowed-tools: Read, Glob, Grep, WebFetch, WebSearch, Edit, Write, AskUserQuestion
framework_version: 1.4.0
---

# Job Application Assistant

---

## Workflow

When the user provides a job posting (URL or text), follow this workflow:

### Step 1: Research & Evaluate Fit
- Fetch the job posting content (use WebFetch for URLs). **A 403 is not a dead end** - follow the escalation order in `09-web-research.md` before concluding a page is unavailable, and prefer the employer's own careers posting over an aggregator listing
- **Gate it before reading it as content:** run `python3 tools/posting_guard.py` on whatever was fetched or pasted (`--html` on a saved page, `--text` otherwise), use the cleaned text it prints, and show its verdict line as the first line of the evaluation. `/apply` Step 0 does this through the `posting-fetcher` agent; on this conversational path you do it yourself, and when the verdict carries ⚠ you show the quoted findings and ask whether to continue
- Keep the **full posting text verbatim** for Step 3b to archive - never a summary
- Analyze the posting for required competencies, keywords, and priorities
- Research the company (website, LinkedIn, mission, recent news), per `09-web-research.md`
- **Run the Sponsorship Gate first** (`04-job-evaluation.md`). FAIL -> stop and quote the wording. UNKNOWN -> do not draft; record the row the way `/apply` Step 1's UNKNOWN path does (status `sponsorship_check`, `sponsorship` = `UNKNOWN`, posting URL in `source`) and offer `/sheets-sync`
- Score the posting against the candidate's profile using the framework in `04-job-evaluation.md`
- Present the evaluation table and verdict
- Suggest whether the candidate should call the employer before applying (see `04-job-evaluation.md` for guidance)
- Ask the user if they want to proceed with an application

### Step 2: Tailor CV (1-page US resume)
- Before writing either document, derive `<company>_<role>` once by the **Subfolder naming** rule in `documents/README.md`; reuse that exact value for the CV, cover letter, and Step 3b archive path. If the rule says to stop because the derived name is empty, stop before creating any file.
- Read the most relevant existing CV variant from `cv/` as a starting point
- Follow the guidelines in `05-cv-templates.md`
- Create `cv/main_<company>_<role>.tex` with tailored content
- Use the active `us-onepage` template (exactly 1 page; sections Professional Experience, Projects, Education, Technical Skills; no summary)
- Adjust: top bullets of the most recent role, project order, bolded keywords, skills order; every bullet in XYZ form with metrics from the profile only

### Step 3: Write Cover Letter (only when the posting asks for one)
- Skip this step unless the posting requires or invites a cover letter; then leave `cover_letter_file` empty in Step 3b
- Follow the writing style rules in `03-writing-style.md` (critical: no em-dashes, no cliches)
- Follow the template structure in `06-cover-letter-templates.md`
- Create `cover_letters/cover_<company>_<role>.tex`
- Ensure the letter connects specific experience to the role requirements

### Step 3b: Record the Application
- Run this once the resume exists (and the cover letter, when the posting asked for one).
- Follow **`/apply` Step 6b** (`.claude/commands/apply.md`) exactly: same header, same match-then-update rule, same `drafted` row, same posting archive, same prohibition on touching `job_scraper/seen_jobs.json`. It is stated there once so the two paths cannot drift. Four of its values are named in `/apply`'s own terms: `cv_file`/`cover_letter_file` are the paths written in Steps 2 and 3 here, `source` is the posting URL from Step 1, `deadline` is the application deadline from the posting text Step 1 keeps verbatim (empty when the posting states none - never guess one), and the posting text item 7 archives is the one Step 1 read.
- This step exists here because `/scrape` Step 5 routes straight into this skill. Without it, that path writes two documents and records nothing.

### Step 4: Interview Preparation
- Follow the framework in `07-interview-prep.md`
- Prepare STAR-format answers for likely questions
- Identify role-specific talking points
- Draft questions the candidate should ask the interviewer

---

## Reference Files

| File | Purpose |
|------|---------|
| `01-candidate-profile.md` | Education, experience, skills, publications, awards |
| `02-behavioral-profile.md` | Behavioral assessment, strengths, ideal environments |
| `03-writing-style.md` | Tone, structure, do's and don'ts |
| `04-job-evaluation.md` | Scoring framework for job fit |
| `05-cv-templates.md` | LaTeX resume structure and tailoring rules (active template: `us-onepage`, 1 page) |
| `06-cover-letter-templates.md` | LaTeX cover letter structure and tailoring rules |
| `07-interview-prep.md` | STAR examples, tough questions, roleplay guidelines |
| `08-application-forms.md` | Portal free-text fields: self-introduction, project entries, character-limited pitches |
| `09-web-research.md` | Fetching postings and company pages: trust boundary, the WebFetch 403 fallback, escalation order, claim verification |

---

## Quick Commands

The user may also ask for individual steps without the full workflow:
- "Evaluate this job posting" - Step 1 only
- "Write a CV for [company]" - Step 2 only
- "Write a cover letter for [role] at [company]" - Step 3 only
- "Help me prepare for an interview at [company]" - Step 4 only
- "What jobs should I look for?" - Career strategy discussion using profile + evaluation framework
