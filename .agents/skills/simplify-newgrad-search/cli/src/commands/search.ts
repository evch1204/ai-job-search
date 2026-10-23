import { LIST_URL, filterPostings, parseList, textFetch, writeError, type FilterOpts, type Posting } from "../helpers.js"

export interface SearchOpts extends FilterOpts {
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

const PAGE_SIZE = 25

function row(p: Posting) {
  // The contract fields first (title, company, location, date, url), then extras.
  return {
    id: p.id,
    title: p.title,
    company: p.company,
    location: p.location,
    date: p.date,
    url: p.url,
    ageDays: p.ageDays,
    sponsorship: p.sponsorship,
    closed: p.closed,
    advancedDegree: p.advancedDegree,
    section: p.section,
    simplifyUrl: p.simplifyUrl,
  }
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const all = parseList(await textFetch(LIST_URL))
    const matched = filterPostings(all, opts).sort((a, b) => (a.ageDays ?? 9999) - (b.ageDays ?? 9999))
    const start = (opts.page - 1) * PAGE_SIZE
    const results = matched.slice(start, start + PAGE_SIZE).slice(0, opts.limit)
    if (opts.format === "table") {
      const lines = results.map(
        (p) => `${String(p.ageDays ?? "?").padStart(3)}d  ${p.company.slice(0, 24).padEnd(24)} ${p.title.slice(0, 50).padEnd(50)} ${(p.location ?? "-").slice(0, 30)}`,
      )
      process.stdout.write((lines.length ? lines.join("\n") : "No results.") + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        results.map((p) => `${p.title}\n  ${p.company} · ${p.location ?? "-"} · ${p.ageDays ?? "?"}d ago\n  ${p.url ?? "(no link)"}`).join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: results.length, page: opts.page, matched: matched.length }, results: results.map(row) }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
