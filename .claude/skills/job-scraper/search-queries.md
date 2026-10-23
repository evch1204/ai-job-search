# Search Queries for Job Scraper

<!-- Tailored for Tei (Evan) Chang: US-only, new-grad/early-career SWE, F-1 STEM OPT (needs H-1B sponsorship) -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. For this US-only setup only `linkedin-search` is enabled; `freehire-search` and the Danish demos are installed but disabled (`enabled: false`), and any skill you add with `/add-portal` is included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites (US only)

**Robots rule first:** never fetch a page whose robots.txt disallows Claude's agent (`Claude-User`) - check with `python3 tools/robots_check.py <url>`. As checked on 2026-10-23 that rules out LinkedIn job pages (search, detail and `/jobs/view/`), `app.joinhandshake.com`, `hiring.cafe/viewjob/...` and `indeed.com/viewjob`. Postings from those sites reach the workflow only when the user brings them in, and then `/apply` reads the **employer's own copy** instead.

Sources, searched in this order (the user can name any subset - see "Naming sites" below):
0. **SimplifyJobs New-Grad list** - `simplify-newgrad-search` CLI (primary). Run it with `-l "CA,NYC,New York,Seattle,WA,Los Angeles,Remote in USA"` and the date tiers (`--jobage 1`, then `7`, then `30`), once per query category keyword (`-q "software engineer"`, `-q "full stack"`, `-q "engineer"` with `--section ml`). It already drops rows marked no-sponsorship / US-citizens-only and closed ones. Its `url` is the employer's own posting.
1. **Employer job boards** - Ashby (`jobs.ashbyhq.com/<company>`), Lever (`jobs.lever.co/<company>`), Greenhouse (`boards-api.greenhouse.io/v1/boards/<company>/jobs`), and company careers pages: allowed, and they carry the original posting date and the full text, including sponsorship wording. Found through WebSearch with company names; `site:` filters on these hosts are unreliable.
2. **SimplyHired** (`simplyhired.com/search`, `simplyhired.com/job/...`) - allowed; WebSearch fallback until a CLI exists.
3. **Indeed / hiring.cafe** - search results only (their job pages are disallowed): use a hit only to identify company + role, then find the employer's own posting.
4. **LinkedIn / Handshake** - never fetched; the user browses and pastes links or text.

Enabled portal CLIs: `simplify-newgrad-search`. Disabled: `linkedin-search` (robots.txt disallows Claude-User), `freehire-search` and the Danish portals (`enabled: false` in their SKILL.md).

### Naming sites

The user can restrict a run to named sources - "/scrape simplyhired", "search only Ashby and Lever", "/scrape company boards for Stripe, Figma, Notion". Run only those sources (still under the robots rule) and say which ones were skipped. With no site named, use the order above.

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

Role-title variants (also usable as company-board keyword filters): `-q "software engineer new grad"`, `-q "full stack engineer"`, `-q "frontend engineer react"`, `-q "backend engineer"`, `-q "software engineer I"`.

### Priority 2: AI / LLM application engineering

```
site:indeed.com/viewjob ("AI engineer" OR "LLM engineer" OR "machine learning engineer") ("entry level" OR "new grad") ("Bay Area" OR remote) -senior -staff -principal -lead
site:simplyhired.com/job "AI engineer" ("entry level" OR junior) California -senior -staff -principal -lead
site:hiring.cafe/viewjob ("AI engineer" OR "applied AI" OR "LLM") ("junior" OR "new grad") -senior -staff -principal -lead
site:linkedin.com/jobs/view "AI engineer" "entry level" "United States" -senior -staff -principal -lead
```

Role-title variants (also usable as company-board keyword filters): `-q "AI engineer"`, `-q "applied AI engineer"`, `-q "machine learning engineer new grad"`.

### Priority 3: Developer tools / platform / infrastructure (adjacent)

```
site:indeed.com/viewjob ("developer tools" OR "developer experience" OR "platform engineer") ("entry level" OR "new grad") -senior -staff -principal -lead
site:hiring.cafe/viewjob ("developer tools" OR "platform engineer" OR "SDK") junior -senior -staff -principal -lead
```

Role-title variants (also usable as company-board keyword filters): `-q "developer tools engineer"`, `-q "platform engineer entry level"`.

### Priority 4: Sponsorship-first sweep

Postings that state sponsorship up front pass the Sponsorship Gate without manual checking.

```
site:indeed.com/viewjob "software engineer" ("visa sponsorship" OR "H-1B" OR "OPT") -"no sponsorship" -"unable to sponsor" -senior -staff -principal -lead
site:simplyhired.com/job "software engineer" ("visa sponsorship available" OR "will sponsor") -senior -staff -principal -lead
site:hiring.cafe/viewjob "software engineer" ("visa sponsorship" OR "H-1B") -senior -staff -principal -lead
```

## Location Filter

US roles only. A role located outside the United States is a location FAIL (dropped), never a sponsorship question.
- **PASS:** within ~50 miles of Santa Clara - San Jose, Santa Clara, Sunnyvale, Mountain View, Palo Alto, Cupertino, Milpitas, Fremont, Menlo Park, Redwood City, San Mateo, South San Francisco, San Francisco, Oakland, Berkeley, Hayward, Pleasanton, Santa Cruz; **New York City**, **Seattle** (incl. Bellevue, Redmond, Kirkland), **Los Angeles** (incl. Santa Monica, Irvine area only if remote/hybrid-friendly - FLAG otherwise); fully remote within the US
- **FLAG:** on-site elsewhere in the US (the user decides)
- **FAIL:** outside the United States, or "remote" restricted to another country

Location search terms for queries: "Bay Area" / "San Jose" / "San Francisco", "New York", "Seattle", "Los Angeles", and `remote "United States"`.

## Sponsorship Filter

Every result goes through `04-job-evaluation.md`'s Sponsorship Gate (single source of truth). `/scrape` only notes obvious FAIL wording it can already see in a search snippet ("no sponsorship", "US citizens only", "clearance required") and marks it `skipped`; everything else is decided by `/rank` from the full posting.

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

Tiers, in order: **posted today** (LinkedIn `--jobage 1`), then **past week** (`--jobage 7`), then **past month** (`--jobage 30`). Search no further back than 30 days, but a job whose employer page later shows an older original date is still kept (age is a flag, not a skip). If a posting date cannot be determined, include it in the past-month tier flagged "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
