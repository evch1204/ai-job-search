import { ASHBY_BOARD, GREENHOUSE_API, LEVER_API, ashbyAppData, scanSponsorship, stripHtml, textFetch, writeError } from "../helpers.js"

export interface DetailOpts {
  ref: string // a job URL on boards.greenhouse.io / job-boards.greenhouse.io, jobs.lever.co, or jobs.ashbyhq.com
  format: "json" | "plain"
}

interface Detail {
  title: string
  company: string
  location: string | null
  date: string | null
  url: string
  description: string
  sponsorship: "no" | "yes" | null
  sponsorshipQuote: string | null
}

async function resolve(ref: string): Promise<Detail | null> {
  const u = new URL(ref)
  const parts = u.pathname.split("/").filter(Boolean)
  if (u.hostname.endsWith("greenhouse.io")) {
    const board = parts[0] === "embed" ? u.searchParams.get("for") ?? "" : parts[0]
    const id = u.searchParams.get("gh_jid") ?? parts[parts.indexOf("jobs") + 1]
    const raw = await textFetch(`${GREENHOUSE_API}${board}/jobs/${id}`)
    if (!raw) return null
    const j = JSON.parse(raw)
    const description = stripHtml(j.content ?? "")
    return { title: j.title, company: j.company_name ?? board, location: j.location?.name ?? null, date: (j.first_published ?? j.updated_at ?? "").slice(0, 10) || null, url: j.absolute_url, description, ...pick(description) }
  }
  if (u.hostname === "jobs.lever.co") {
    const raw = await textFetch(`${LEVER_API}${parts[0]}/${parts[1]}`)
    if (!raw) return null
    const j = JSON.parse(raw)
    const lists = (j.lists ?? []).map((l: { text?: string; content?: string }) => `${l.text ?? ""}: ${stripHtml(l.content ?? "")}`).join("\n")
    const description = [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join("\n")
    return { title: j.text, company: parts[0], location: j.categories?.location ?? null, date: j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : null, url: j.hostedUrl, description, ...pick(description) }
  }
  if (u.hostname === "jobs.ashbyhq.com") {
    const html = await textFetch(`${ASHBY_BOARD}${parts[0]}/${parts[1]}`)
    const posting = (ashbyAppData(html)?.posting ?? null) as Record<string, unknown> | null
    if (!posting) return null
    const description = stripHtml(String(posting.descriptionHtml ?? posting.descriptionPlainText ?? ""))
    const date = String(posting.publishedDate ?? posting.updatedAt ?? "").slice(0, 10) || null
    return { title: String(posting.title ?? ""), company: parts[0], location: (posting.locationName as string) ?? null, date, url: `${ASHBY_BOARD}${parts[0]}/${parts[1]}`, description, ...pick(description) }
  }
  throw new Error(`unsupported host ${u.hostname} - expected a Greenhouse, Lever or Ashby job URL`)
}

function pick(text: string) {
  const s = scanSponsorship(text)
  return { sponsorship: s.verdict, sponsorshipQuote: s.quote }
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  try {
    const d = await resolve(opts.ref)
    if (!d) {
      writeError(`job not found: ${opts.ref}`, "NOT_FOUND")
      return 1
    }
    if (opts.format === "plain") {
      process.stdout.write(`${d.title}\n${d.company} · ${d.location ?? "-"} · posted ${d.date ?? "?"}\nURL: ${d.url}\nsponsorship: ${d.sponsorship ?? "not stated"}${d.sponsorshipQuote ? ` ("${d.sponsorshipQuote}")` : ""}\n\n${d.description}\n`)
    } else {
      process.stdout.write(JSON.stringify(d, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
