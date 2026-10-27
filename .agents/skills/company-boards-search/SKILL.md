---
name: company-boards-search
version: 1.0.0
description: >
  Use this skill to search employers' own job boards - Greenhouse, Lever and Ashby
  public endpoints - for a configurable list of companies (companies.json), with
  title/location/age filters, senior/intern titles and future grad-class titles
  ("2027 New Grad") dropped, non-US places
  excluded, and an optional sponsorship scan of the description that drops
  postings refusing visa sponsorship. Trigger phrases: company job boards,
  search Greenhouse, search Lever, search Ashby, jobs at <company>, check
  <company> careers.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/company-boards-search/cli/src/cli.ts *)
---

# Company Boards Search Skill

Searches the **employers' own job boards** for every company in `companies.json`
({name, ats, slug}) - about 70 tech employers in the Bay Area, NYC, Seattle and LA at
setup. All three hosts allow these paths in robots.txt. Zero runtime dependencies.

Why it matters: employer boards carry the **original posting date** (Greenhouse
`first_published`, Lever `createdAt`) and the **full description**, so the sponsorship
check runs on the real text instead of an aggregator snippet. Ashby boards show no
date; `/rank` reads it from each posting page.

## Commands

```bash
# Recent entry-level roles in the candidate's locations, sponsorship refusals dropped
bun run .agents/skills/company-boards-search/cli/src/cli.ts search -q "software engineer" \
  -l "CA,San Francisco,New York,NY,Seattle,WA,Los Angeles,Remote" --jobage 7 --check-sponsorship --format json

# Only some companies, or only one platform
bun run .agents/skills/company-boards-search/cli/src/cli.ts search -c "stripe,figma,notion" -q engineer --format table
bun run .agents/skills/company-boards-search/cli/src/cli.ts search --ats ashby -q "machine learning" --format table

# Full posting text (+ sponsorship wording) for one job
bun run .agents/skills/company-boards-search/cli/src/cli.ts detail <greenhouse|lever|ashby job URL> --format plain

# The configured company list
bun run .agents/skills/company-boards-search/cli/src/cli.ts companies
```

Flags: `--query/-q` (all words in the title), `--location/-l` (comma list; short all-caps codes match whole words; places naming another country never match), `--jobage <days>` (dated boards only - undated Ashby jobs are kept), `--companies/-c`, `--ats greenhouse,lever,ashby`, `--all-levels` (keep senior/staff/lead/manager/intern titles and titles naming this year's or a later graduating class, all dropped by default), `--check-sponsorship` (Greenhouse and Lever descriptions; refusals dropped and counted in `meta.droppedNoSponsor`), `--page`, `--limit/-n`, `--format json|table|plain`.

Output: `{meta:{count,page,matched,droppedNoSponsor,boards,failed}, results:[{id,title,company,location,date,url,ats,sponsorship,sponsorshipQuote}]}`. `sponsorship` is `"yes"` (explicit offer), `null` (not stated or not checked) - refusals never appear.

## Adding a company

Find the board URL on the company's careers page:
- `job-boards.greenhouse.io/<slug>` or `boards.greenhouse.io/<slug>` -> `{"ats": "greenhouse", "slug": "<slug>"}`
- `jobs.lever.co/<slug>` -> `lever`
- `jobs.ashbyhq.com/<slug>` -> `ashby`

Add `{"name": "...", "ats": "...", "slug": "..."}` to `companies.json`. A board that 404s is reported under `meta.failed`, never silently skipped. The list is not a sponsorship guarantee; the sponsorship scan and `/rank` decide that per posting.
