---
name: simplify-newgrad-search
version: 1.0.0
description: >
  Use this skill to search the SimplifyJobs New-Grad-Positions list - a
  community-maintained list of new-grad and early-career roles (software, data/ML,
  PM, quant, hardware) with location, posting age, the employer's own application
  link, and markers for "does NOT offer sponsorship", "requires US citizenship"
  and closed postings. Trigger phrases: new grad jobs, entry level software jobs,
  early career roles, Simplify list, jobs that sponsor.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/simplify-newgrad-search/cli/src/cli.ts *)
---

# SimplifyJobs New-Grad Search Skill

Searches the [SimplifyJobs New-Grad-Positions](https://github.com/SimplifyJobs/New-Grad-Positions)
README on GitHub (raw.githubusercontent.com publishes no robots.txt, so reading it is
allowed). Zero runtime dependencies - it runs with just `bun`.

## Why it fits this workspace

- New-grad / early-career only, which matches the 0-2 years Experience Gate.
- Each row links to the **employer's own posting** (Greenhouse, Lever, Ashby, Workday,
  careers sites), which `/rank` and `/apply` fetch for the full text and real date.
- Rows the list marks 🛂 (does NOT sponsor) or 🇺🇸 (US citizens only) are **dropped by
  default**, so clear sponsorship dealbreakers never reach the tracker. Closed (🔒)
  postings are dropped too, and so are titles naming this year's or a later
  graduating class ("2027 New Grad", "Class of 2026"): those programs are for students.
- The list has **no job description**: `detail` returns the row; fetch the employer URL
  for the posting text.

## Commands

```bash
# Recent SWE/ML new-grad roles in the candidate's locations
bun run .agents/skills/simplify-newgrad-search/cli/src/cli.ts search \
  -q "engineer" -l "CA,NYC,New York,Seattle,WA,Los Angeles,Remote in USA" --jobage 7 --format json

# Posted today, ML section only
bun run .agents/skills/simplify-newgrad-search/cli/src/cli.ts search --section ml --jobage 1 --format table

# One row by Simplify id or URL
bun run .agents/skills/simplify-newgrad-search/cli/src/cli.ts detail <id-or-url> --format plain
```

## Flags (search)

- `--query/-q` - all words must appear in role or company
- `--location/-l` - comma list; short all-caps codes (`CA`, `WA`, `NYC`) match whole words only (so `CA` never matches "Canada"); use `Remote in USA` for US-remote
- `--jobage <days>` - posted within N days (from the list's Age column; `date` in the output is today minus that age, so it is approximate)
- `--section` - `swe,ml,pm,quant,hw` (default `swe,ml`)
- `--include-no-sponsor`, `--include-closed` - keep rows dropped by default
- `--page`, `--limit/-n`, `--format json|table|plain`

Output: `{meta:{count,page,matched}, results:[{id,title,company,location,date,url,ageDays,sponsorship,closed,advancedDegree,section,simplifyUrl}]}`. `sponsorship` is `"no"`, `"citizenship"` or `null` (not flagged - **not** the same as "sponsors").
