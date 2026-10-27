# /hunt - Find the Best N Jobs and Apply to Them

One command for the whole loop: search every allowed source, rank, and write a fully tailored resume and cover letter for the best N jobs, in parallel, checked by the QA agent before anything reaches the user. `$ARGUMENTS` is the number of jobs; it is the user's approval to draft all of them (no per-job "proceed?").

---

## Step 0: Parse Input

`$ARGUMENTS` may contain:

- Nothing → **N = 10**
- A whole number, e.g. `/hunt 25` → N = that number (1-50; above 50, ask once before continuing)
- A number plus a focus, e.g. `/hunt 10 ai engineer` or `/hunt 5 seattle` → N, and pass the focus words to the search (role keywords, or a location to search first)

Say in one line what will happen: "Finding the best N jobs, then drafting N tailored applications in batches of 10."

---

## Step 1: Search (parallel)

Run `/scrape`'s flow with **both** enabled portal CLIs in one message - `simplify-newgrad-search` and `company-boards-search` - across the query keywords and date tiers in `.claude/skills/job-scraper/search-queries.md` (today, then this week, then this month; age is a flag, never a drop). Dedupe and store through `tools/scrape_state.py` as `/scrape` Steps 2-4 describe. Collect at least **3×N** candidates when the sources have them, so ranking has room to choose.

---

## Step 2: Rank (parallel)

Run `/rank` on the new candidates with `posting-scorer` agents dispatched in one message (about 5 jobs each). Apply its gates exactly - experience, location, language, sponsorship, posting age - and record `needs_check` rows with `rank_state.py track-unknown` - after applying the company cap (at most 2 open roles per company in the tracker; see `/apply` B1). Clear dealbreakers are dropped silently and only counted.

---

## Step 3: Apply to the best N (parallel)

Pick the top N by score per `/apply` **Batch apply** step B1 (sponsorship PASS, or UNKNOWN with recent H-1B filings noted as "likely sponsor"; never more than 2 open roles per company in the tracker). Then run Batch apply steps B2-B5 from `.claude/commands/apply.md` in batches of **10**:

- B2: fetch postings in parallel (`posting-fetcher`, ~3 jobs each)
- B3: **3-4 writer agents** in one message, ~3 jobs each, using the Writer brief - full tailoring, never template letters
- B4: `application-qa` checks every job; apply fixes, recompile, re-check once
- B5: record, then one `/sheets-sync` at the end of the whole run

If fewer than N jobs pass the gates, draft the ones that do and say how many were short and why (e.g. "only 7 passed - 12 had no sponsorship history, 4 required more than 1 year").

---

## Step 4: Report

```
## Hunt - YYYY-MM-DD: N applications ready

| # | Company | Role | Posted | Score | Sponsorship | QA | Upload folder |
|---|---------|------|--------|-------|-------------|----|---------------|

Dropped: <count> (no sponsorship <a>, senior/3+ yrs <b>, non-US <c>, ...)
Check sponsorship (in the Sheet, not drafted): <count>

### Questions for you
- <job>: <missing fact or stretch to confirm>
```

End with: "Open each link in the Sheet's **JOB APPLICATION AI** tab and upload `Tei_Chang_Resume.pdf` + `Tei_Chang_Cover_Letter.pdf` from its folder. Tell me \"I applied to <company>\" (or run `/gmail-sync` later) to mark it applied."

---

## Important Rules

1. **Full tailoring only.** Every drafted job gets a custom resume and cover letter grounded in `01-candidate-profile.md`; never template letters.
2. **Parallel, not one by one.** Searches, scoring agents, fetchers, writers and QA agents are each dispatched in a single message.
3. **Never guess a fact.** Missing information goes under "Questions for you"; answers are saved to the profile and only the affected jobs are redrafted.
4. **Robots rule.** Never fetch a site whose robots.txt disallows Claude's agent (LinkedIn, Handshake app, Indeed/hiring.cafe job pages, ZipRecruiter, Dice).
5. **Nothing is submitted.** The user uploads and submits every application themselves.
