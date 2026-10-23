# Search Queries for Job Scraper

<!-- Tailored for Tei (Evan) Chang: US-only, new-grad/early-career SWE, F-1 STEM OPT (needs H-1B sponsorship) -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. For this US-only setup only `linkedin-search` is enabled; `freehire-search` and the Danish demos are installed but disabled (`enabled: false`), and any skill you add with `/add-portal` is included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites (US only)

Only these five boards are in scope. Every result must be a role located in the United States (or US-remote).

Primary (CLI):
- **linkedin.com/jobs** - `linkedin-search` CLI. Run it twice per query: `-l "San Francisco Bay Area"` and `-l "United States" --remote remote`, both with `--jobage 14 --experience entry,associate` (LinkedIn's 0-2-year levels; it mislabels some senior roles, so the title check in `/scrape` Step 3 still applies).

WebSearch fallback (no CLI - `/scrape` Step 1c runs these `site:` queries):
- **indeed.com** - posting URLs look like `indeed.com/viewjob?jk=...`; skip `indeed.com/q-...` listing pages
- **simplyhired.com** - posting URLs look like `simplyhired.com/job/...`
- **hiring.cafe** - posting URLs look like `hiring.cafe/viewjob/...`
- **joinhandshake.com** - public pages only. The logged-in app (`app.joinhandshake.com`) disallows Claude's agent in its robots.txt, so it is never fetched or browsed automatically, even with the user's login. The user browses Handshake and brings postings in by hand (see "Handshake postings" in `US_QUICKSTART.md`)

Disabled: `freehire-search` and the Danish portals (`enabled: false` in their SKILL.md).

## Query Categories

Organize by function, not job title: list several plausible titles per category. **Experience: 0-2 years only.** Every `site:` query below carries `-senior -staff -principal -lead`; titles that still slip through are dropped by `/scrape` Step 3 and `04-job-evaluation.md`'s Experience Gate. Combine each with a US location term: `"Bay Area"`, `"San Jose"`, `"San Francisco"`, `"Santa Clara"`, or `remote "United States"`.

### Priority 1: New-grad / early-career Software Engineer (full-stack, frontend, backend)

```
site:indeed.com/viewjob "software engineer" ("new grad" OR "entry level" OR "early career") "Bay Area" -senior -staff -principal -lead
site:indeed.com/viewjob "full stack engineer" (React OR TypeScript) ("San Jose" OR "San Francisco" OR remote) -senior -staff -principal -lead
site:simplyhired.com/job "software engineer" ("new grad" OR "entry level") California -senior -staff -principal -lead
site:hiring.cafe/viewjob "software engineer" ("new grad" OR "junior" OR "early career") -senior -staff -principal -lead
site:joinhandshake.com "software engineer" "new grad" -senior -staff -principal -lead
site:linkedin.com/jobs/view "software engineer" "new grad" "United States" -senior -staff -principal -lead
```

LinkedIn CLI queries: `-q "software engineer new grad"`, `-q "full stack engineer"`, `-q "frontend engineer react"`, `-q "backend engineer"`, `-q "software engineer I"`.

### Priority 2: AI / LLM application engineering

```
site:indeed.com/viewjob ("AI engineer" OR "LLM engineer" OR "machine learning engineer") ("entry level" OR "new grad") ("Bay Area" OR remote) -senior -staff -principal -lead
site:simplyhired.com/job "AI engineer" ("entry level" OR junior) California -senior -staff -principal -lead
site:hiring.cafe/viewjob ("AI engineer" OR "applied AI" OR "LLM") ("junior" OR "new grad") -senior -staff -principal -lead
site:linkedin.com/jobs/view "AI engineer" "entry level" "United States" -senior -staff -principal -lead
```

LinkedIn CLI queries: `-q "AI engineer"`, `-q "applied AI engineer"`, `-q "machine learning engineer new grad"`.

### Priority 3: Developer tools / platform / infrastructure (adjacent)

```
site:indeed.com/viewjob ("developer tools" OR "developer experience" OR "platform engineer") ("entry level" OR "new grad") -senior -staff -principal -lead
site:hiring.cafe/viewjob ("developer tools" OR "platform engineer" OR "SDK") junior -senior -staff -principal -lead
```

LinkedIn CLI queries: `-q "developer tools engineer"`, `-q "platform engineer entry level"`.

### Priority 4: Sponsorship-first sweep

Postings that state sponsorship up front pass the Sponsorship Gate without manual checking.

```
site:indeed.com/viewjob "software engineer" ("visa sponsorship" OR "H-1B" OR "OPT") -"no sponsorship" -"unable to sponsor" -senior -staff -principal -lead
site:simplyhired.com/job "software engineer" ("visa sponsorship available" OR "will sponsor") -senior -staff -principal -lead
site:hiring.cafe/viewjob "software engineer" ("visa sponsorship" OR "H-1B") -senior -staff -principal -lead
```

## Location Filter

US roles only. A role located outside the United States is a location FAIL (excluded), never a sponsorship question.
- **PASS:** San Jose, Santa Clara, Sunnyvale, Mountain View, Palo Alto, Cupertino, Milpitas, Fremont, Menlo Park, Redwood City, San Mateo, San Francisco, Oakland (Bay Area on-site or hybrid); remote within the US
- **FLAG:** on-site elsewhere in the US (relocation - the user decides)
- **FAIL:** outside the United States, or "remote" restricted to another country

## Sponsorship Filter

Every result goes through `04-job-evaluation.md`'s Sponsorship Gate (single source of truth). `/scrape` only notes obvious FAIL wording it can already see in a search snippet ("no sponsorship", "US citizens only", "clearance required") and marks it `skipped`; everything else is decided by `/rank` from the full posting.

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

Only include jobs posted within the last 14 days (LinkedIn CLI: `--jobage 14`), or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
