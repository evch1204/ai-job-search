# US Job Search - How to Use This Workspace

Everything runs inside Claude Code, opened in this folder. You type slash commands in the chat.

## One-time checks

- Tools installed (Homebrew): `tectonic` (compiles resumes), `bun` (runs the LinkedIn scraper), `poppler` (layout checks), Python `pypdf` (page checks)
- Google Sheets connector connected in Claude (needed for `/sheets-sync`)
- Profile: `.claude/skills/job-application-assistant/01-candidate-profile.md` is the source of truth for every resume claim. Add new facts there, never only in chat
- **Do not run `/setup` or `/reset`.** They rebuild the profile from the original European template

## The daily loop

| Step | Command | What it does |
|---|---|---|
| 1. Find jobs | `/scrape` (or `/scrape broad`, `/scrape AI engineer`) | Searches LinkedIn (Bay Area + US remote, entry/associate levels) and Indeed, SimplyHired, hiring.cafe and public Handshake pages via web search. Last 14 days, new jobs only. Drops senior titles and obvious "no sponsorship" / non-US postings |
| 2. Triage | `/rank` | Reads every new posting, applies the **Sponsorship Gate**, and scores fit. Shows a shortlist with links. UNKNOWN-sponsorship jobs go to your tracker as **Check sponsorship** |
| 3. Mirror to Sheet | `/sheets-sync` | Pushes new tracker rows to your Google Sheet, with the apply link in **Link / email** and **Sponsorship** in column M |
| 4. Apply | `/apply <job URL>` (or pick a number after `/rank`) | Re-checks sponsorship, evaluates fit, then writes a tailored 1-page resume `cv/main_<company>_<role>.pdf` plus a cover letter (default - forms often ask for one), verifies it, and records it as `drafted` |
| 5. Submit yourself | open the link | You submit the application on the company site |
| 6. Record it | `/outcome <company>` | Moves the row to `applied` (and later interview / offer / rejected) |

## Handshake postings

Handshake's logged-in job pages block AI agents (its robots.txt disallows `Claude-User`), so `/scrape` cannot search them, even with your login. Use it like this instead:

1. Browse Handshake yourself (filters: Full-time, your graduation year, "Accepts OPT/CPT" / sponsorship filters if your school shows them).
2. For a job you like, either:
   - copy the whole posting text and run `/apply` with the text pasted in, or
   - give me the company and role ("/apply Acme Software Engineer I from Handshake") and I find the employer's own public posting, which `/apply` prefers anyway.
3. To triage several at once, paste them into the chat and ask "evaluate these against my profile".

## What gets dropped vs. kept

- **Dropped silently** (never in the tracker or Sheet, only counted in the summary): the posting explicitly refuses sponsorship / US citizens or green card only / clearance; senior titles or a required 3+ years; internships; new-grad programs for a graduation year you don't fit; non-US roles
- **Kept for you to decide**: sponsorship not mentioned (**Check sponsorship**), older postings (flagged in the Reason column, sorted last), a required 2 years or a level II title (flagged)

## Experience filter (0-2 years)

- `/scrape` asks LinkedIn for entry/associate levels only and drops Senior/Staff/Lead/Principal/level III+ titles before reading them
- `/rank` and `/apply` read the requirements: a **required** 3+ years is excluded, a required 2 years or a level II title is flagged (still drafted), new grad / 0-1 years passes

## What to upload

`/apply` saves the file to upload as `cv/submit/<company>_<role>/Tei_Chang_Resume.pdf` and `Tei_Chang_Cover_Letter.pdf`. Upload that copy, not `cv/main_<company>_<role>.pdf`.

## Sponsorship rules (US, F-1 STEM OPT)

- **PASS** - posting says it sponsors H-1B or accepts OPT/CPT -> resume is drafted
- **FAIL** - "no sponsorship", "US citizens / green card only", clearance, ITAR -> dropped: not added to the tracker or Sheet, only counted in the run summary
- **UNKNOWN** - posting says nothing -> **no resume**; tracker + Sheet row with status **Check sponsorship** and the link

For a **Check sponsorship** row: check the company's H-1B history (h1bdata.info, myvisajobs.com) or ask the recruiter. If they sponsor, run `/apply <link>` to draft the resume. If not, `/outcome <company>` -> withdrawn.

## Other useful commands

- `/interview <company>` - prep pack for a scheduled interview
- `/outcome` (no argument) - list open applications; `/outcome followup` - draft follow-up notes
- `/html-report` - dashboard of your pipeline
- `/upskill` - which skills keep showing up as gaps across postings

## Files

- Baseline resume: `cv/baseline_general_swe.tex` (template: `templates/cv/us-onepage/`)
- Tailored resumes: `cv/main_<company>_<role>.tex/.pdf` (git-ignored, local only)
- Tracker: `job_search_tracker.csv` (git-ignored, local only); the Google Sheet mirrors it
