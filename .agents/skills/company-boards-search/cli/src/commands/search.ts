import {
  ASHBY_BOARD,
  GREENHOUSE_API,
  LEVER_API,
  filterJobs,
  parseAshby,
  parseGreenhouse,
  parseLever,
  scanSponsorship,
  textFetch,
  writeError,
  type Company,
  type FilterOpts,
  type Job,
} from "../helpers.js"

export interface SearchOpts extends FilterOpts {
  companies: Company[]
  checkSponsorship: boolean
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

async function fetchBoard(c: Company, withContent: boolean): Promise<Job[]> {
  if (c.ats === "greenhouse") return parseGreenhouse(await textFetch(`${GREENHOUSE_API}${c.slug}/jobs${withContent ? "?content=true" : ""}`), c)
  if (c.ats === "lever") return parseLever(await textFetch(`${LEVER_API}${c.slug}?mode=json`), c)
  return parseAshby(await textFetch(`${ASHBY_BOARD}${c.slug}`), c)
}

/** Six boards at a time: polite to each host, and fast enough for ~70 companies. */
async function fetchAll(companies: Company[], withContent: boolean): Promise<{ jobs: Job[]; failed: string[] }> {
  const jobs: Job[] = []
  const failed: string[] = []
  let next = 0
  async function worker() {
    while (next < companies.length) {
      const c = companies[next++]
      try {
        jobs.push(...(await fetchBoard(c, withContent)))
      } catch (e) {
        failed.push(`${c.name} (${c.ats}): ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, companies.length) }, worker))
  return { jobs, failed }
}

function row(j: Job) {
  // The contract fields first, then extras.
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    date: j.date,
    url: j.url,
    ats: j.ats,
    sponsorship: j.sponsorship,
    sponsorshipQuote: j.sponsorshipQuote,
  }
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const { jobs, failed } = await fetchAll(opts.companies, opts.checkSponsorship)
    let matched = filterJobs(jobs, opts)
    let droppedNoSponsor = 0
    if (opts.checkSponsorship) {
      for (const j of matched) {
        const s = scanSponsorship(j.text ?? "")
        j.sponsorship = s.verdict
        j.sponsorshipQuote = s.quote
      }
      // Clear dealbreakers are dropped, never shown (04-job-evaluation.md Keep or Drop).
      droppedNoSponsor = matched.filter((j) => j.sponsorship === "no").length
      matched = matched.filter((j) => j.sponsorship !== "no")
    }
    matched.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    const start = (opts.page - 1) * opts.limit
    const results = matched.slice(start, start + opts.limit)
    if (opts.format === "table") {
      const lines = results.map((j) => `${(j.date ?? "  no date ").padEnd(10)}  ${j.company.slice(0, 18).padEnd(18)} ${j.title.slice(0, 55).padEnd(55)} ${(j.location ?? "-").slice(0, 40)}`)
      process.stdout.write((lines.length ? lines.join("\n") : "No results.") + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(results.map((j) => `${j.title}\n  ${j.company} · ${j.location ?? "-"} · ${j.date ?? "date not on board"}\n  ${j.url}`).join("\n\n") + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: results.length, page: opts.page, matched: matched.length, droppedNoSponsor, boards: opts.companies.length, failed }, results: results.map(row) }, null, 2) + "\n",
      )
    }
    if (failed.length) process.stderr.write(JSON.stringify({ warning: "some boards failed", failed }) + "\n")
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
