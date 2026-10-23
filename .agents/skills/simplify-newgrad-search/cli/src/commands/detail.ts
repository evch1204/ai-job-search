import { LIST_URL, parseList, textFetch, writeError } from "../helpers.js"

export interface DetailOpts {
  ref: string // a Simplify posting id, simplify.jobs/p/<id> URL, or the employer URL
  format: "json" | "plain"
}

/** The list carries no description; detail returns the row so the caller can fetch the employer posting. */
export async function runDetail(opts: DetailOpts): Promise<number> {
  try {
    const ref = opts.ref.trim()
    const all = parseList(await textFetch(LIST_URL))
    const hit = all.find((p) => p.id === ref || p.url === ref || p.simplifyUrl === ref || (p.url && ref.startsWith(p.url.split("?")[0])) || (ref.includes(p.id) && p.id.length > 8))
    if (!hit) {
      writeError(`no posting matching ${JSON.stringify(ref)} in the list`, "NOT_FOUND")
      return 1
    }
    if (opts.format === "plain") {
      process.stdout.write(
        `${hit.title}\n${hit.company} · ${hit.location ?? "-"} · posted ~${hit.date ?? "?"} (${hit.ageDays ?? "?"}d)\n` +
          `sponsorship: ${hit.sponsorship ?? "not flagged"} · closed: ${hit.closed}\nURL: ${hit.url ?? "(none)"}\n` +
          `The list has no job description - fetch the employer posting at the URL above.\n`,
      )
    } else {
      process.stdout.write(JSON.stringify(hit, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
