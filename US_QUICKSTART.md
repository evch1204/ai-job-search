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
| 1. Find jobs | `/scrape` (or `/scrape broad`, `/scrape AI engineer`) | Searches LinkedIn (Bay Area + US remote) and Indeed, SimplyHired, hiring.cafe, Handshake via web search. Last 14 days, new jobs only. Drops obvious "no sponsorship" / non-US postings |
| 2. Triage | `/rank` | Reads every new posting, applies the **Sponsorship Gate**, and scores fit. Shows a shortlist with links. UNKNOWN-sponsorship jobs go to your tracker as **Check sponsorship** |
| 3. Mirror to Sheet | `/sheets-sync` | Pushes new tracker rows to your Google Sheet, with the apply link in **Link / email** and **Sponsorship** in column M |
| 4. Apply | `/apply <job URL>` (or pick a number after `/rank`) | Re-checks sponsorship, evaluates fit, then writes a tailored 1-page resume `cv/main_<company>_<role>.pdf` (cover letter only if the posting asks), verifies it, and records it as `drafted` |
| 5. Submit yourself | open the link | You submit the application on the company site |
| 6. Record it | `/outcome <company>` | Moves the row to `applied` (and later interview / offer / rejected) |

## Sponsorship rules (US, F-1 STEM OPT)

- **PASS** - posting says it sponsors H-1B or accepts OPT/CPT -> resume is drafted
- **FAIL** - "no sponsorship", "US citizens / green card only", clearance, ITAR -> excluded, wording quoted to you
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
