// Data sources: employers' own public job boards. All three hosts allow the
// paths used here in robots.txt (checked 2026-10-23):
//   Greenhouse  https://boards-api.greenhouse.io/v1/boards/<slug>/jobs   (JSON; first_published = original date)
//   Lever       https://api.lever.co/v0/postings/<slug>?mode=json         (JSON; createdAt = original date)
//   Ashby       https://jobs.ashbyhq.com/<slug>                           (HTML with window.__appData JSON; no date on the board)

import { readFileSync } from "node:fs"
import { join } from "node:path"

export const GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards/"
export const LEVER_API = "https://api.lever.co/v0/postings/"
export const ASHBY_BOARD = "https://jobs.ashbyhq.com/"

export type Ats = "greenhouse" | "lever" | "ashby"
export interface Company {
  name: string
  ats: Ats
  slug: string
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export function loadCompanies(path = join(import.meta.dir, "../../companies.json")): Company[] {
  return JSON.parse(readFileSync(path, "utf-8")) as Company[]
}

const UA = "Mozilla/5.0 (compatible; company-boards-cli/1.0)"

/** Fetch text with backoff on 429/5xx; "" on 404 (a renamed or removed board). */
export async function textFetch(url: string): Promise<string> {
  let delay = 500
  for (let attempt = 0; attempt <= 4; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 4) throw new Error(`Request failed: ${response.status} ${url}`)
      await new Promise((r) => setTimeout(r, delay + Math.floor(Math.random() * 300)))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`)
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface Job {
  id: string
  title: string
  company: string
  location: string | null
  date: string | null // original posting date where the board publishes one (Greenhouse, Lever); null for Ashby
  url: string
  ats: Ats
  sponsorship: "no" | "yes" | null // from the description when --check-sponsorship ran; null = not stated / not checked
  sponsorshipQuote: string | null
  text?: string // plain description, only kept internally for the sponsorship scan
}

export function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

const NO_SPONSOR = [
  /(unable|not able|will not|won['’]t|do(?:es)? not|cannot|can['’]t)\s+(?:to\s+)?(?:offer\s+|provide\s+)?(?:visa\s+|immigration\s+|employment[- ]based\s+|work\s+(?:visa|authorization)\s+)?sponsor/i,
  /not\s+(?:eligible|available)\s+for\s+(?:visa\s+|immigration\s+|employment[- ]based\s+)?sponsorship/i,
  /no\s+(?:visa\s+|immigration\s+)?sponsorship/i,
  /without\s+(?:the\s+need\s+for\s+)?(?:current\s+or\s+future\s+|future\s+)?(?:visa\s+|employer\s+|immigration\s+)?sponsorship/i,
  /(?:must|required to)\s+be\s+a\s+u\.?s\.?\s+citizen/i,
  /u\.?s\.?\s+citizenship\s+(?:is\s+)?required/i,
  /(?:active|current|ability to obtain)[^.]{0,40}security\s+clearance/i,
]
const YES_SPONSOR = [
  /(?:visa|h-?1b|immigration)\s+sponsorship\s+(?:is\s+)?(?:available|offered|provided)/i,
  /(?:we|will|can|able to)\s+(?:offer\s+|provide\s+)?sponsor\s+(?:visas|h-?1b|work\s+visas)/i,
  /open\s+to\s+(?:candidates\s+)?(?:requiring|who\s+require)\s+(?:visa\s+)?sponsorship/i,
]

/** Classify sponsorship wording; a refusal wins over an offer in the same text. */
export function scanSponsorship(text: string): { verdict: "no" | "yes" | null; quote: string | null } {
  for (const re of NO_SPONSOR) {
    const m = text.match(re)
    if (m && m.index !== undefined) return { verdict: "no", quote: snippet(text, m.index, m[0].length) }
  }
  for (const re of YES_SPONSOR) {
    const m = text.match(re)
    if (m && m.index !== undefined) return { verdict: "yes", quote: snippet(text, m.index, m[0].length) }
  }
  return { verdict: null, quote: null }
}

function snippet(text: string, index: number, len: number): string {
  return text.slice(Math.max(0, index - 60), Math.min(text.length, index + len + 60)).trim()
}

export function parseGreenhouse(json: string, company: Company): Job[] {
  if (!json) return []
  const data = JSON.parse(json) as { jobs?: Array<Record<string, unknown>> }
  return (data.jobs ?? []).map((j) => {
    const published = (j.first_published as string | undefined) ?? (j.updated_at as string | undefined) ?? null
    return {
      id: `greenhouse:${company.slug}:${j.id}`,
      title: String(j.title ?? "").trim(),
      company: company.name,
      location: ((j.location as { name?: string } | undefined)?.name ?? null) || null,
      date: published ? published.slice(0, 10) : null,
      url: String(j.absolute_url ?? ""),
      ats: "greenhouse" as const,
      sponsorship: null,
      sponsorshipQuote: null,
      text: typeof j.content === "string" ? stripHtml(j.content) : undefined,
    }
  })
}

export function parseLever(json: string, company: Company): Job[] {
  if (!json) return []
  const data = JSON.parse(json) as Array<Record<string, unknown>>
  return data.map((j) => {
    const cats = (j.categories ?? {}) as { location?: string; allLocations?: string[] }
    const created = typeof j.createdAt === "number" ? new Date(j.createdAt).toISOString().slice(0, 10) : null
    const lists = Array.isArray(j.lists) ? (j.lists as Array<{ content?: string }>).map((l) => stripHtml(l.content ?? "")).join(" ") : ""
    return {
      id: `lever:${company.slug}:${j.id}`,
      title: String(j.text ?? "").trim(),
      company: company.name,
      location: (cats.allLocations?.length ? cats.allLocations.join("; ") : cats.location) ?? null,
      date: created,
      url: String(j.hostedUrl ?? ""),
      ats: "lever" as const,
      sponsorship: null,
      sponsorshipQuote: null,
      text: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join(" "),
    }
  })
}

/** The board page embeds `window.__appData = {...}`; decode just that object. */
export function ashbyAppData(html: string): Record<string, unknown> | null {
  const at = html.indexOf("window.__appData")
  if (at < 0) return null
  const start = html.indexOf("{", at)
  let depth = 0
  let inString = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inString) {
      if (c === "\\") i++
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === "{") depth++
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1))
  }
  return null
}

export function parseAshby(html: string, company: Company): Job[] {
  if (!html) return []
  const data = ashbyAppData(html)
  const posts = ((data?.jobBoard as { jobPostings?: Array<Record<string, unknown>> } | undefined)?.jobPostings) ?? []
  return posts.map((p) => {
    const secondary = Array.isArray(p.secondaryLocations) ? (p.secondaryLocations as Array<{ locationName?: string }>).map((s) => s.locationName) : []
    const place = [p.locationName as string | undefined, ...secondary].filter(Boolean).join("; ")
    const type = p.workplaceType ? ` (${p.workplaceType})` : ""
    return {
      id: `ashby:${company.slug}:${p.id}`,
      title: String(p.title ?? "").trim(),
      company: company.name,
      location: place ? place + type : null,
      date: null,
      url: `${ASHBY_BOARD}${company.slug}/${p.id}`,
      ats: "ashby" as const,
      sponsorship: null,
      sponsorshipQuote: null,
    }
  })
}

/** Titles outside the 0-2 year scope (04-job-evaluation.md Experience Gate). */
export const SENIOR_TITLE =
  /\b(senior|sr\.?|staff|principal|lead|manager|director|head|architect|vp|chief|iii|iv|v|intern|internship|co-?op)\b|\bL[5-9]\b/i

/** A place naming another country is never a US match, whatever the term ("Remote - Canada"). */
export const NON_US =
  /\b(canada|toronto|vancouver|montreal|mexico|brazil|argentina|colombia|uk|united kingdom|london|ireland|dublin|germany|berlin|munich|france|paris|spain|madrid|barcelona|netherlands|amsterdam|poland|warsaw|portugal|lisbon|italy|switzerland|zurich|sweden|stockholm|denmark|copenhagen|israel|tel aviv|india|bangalore|bengaluru|hyderabad|pune|singapore|japan|tokyo|korea|seoul|china|hong kong|taiwan|australia|sydney|melbourne|new zealand|emea|apac|latam|europe)\b/i

/** Short all-caps terms ("CA", "NY", "WA") match whole words; others are case-insensitive substrings. */
export function locationMatcher(term: string): (place: string) => boolean {
  if (/^[A-Z]{2,3}$/.test(term)) {
    const re = new RegExp(`\\b${term}\\b`)
    return (place) => re.test(place)
  }
  const lower = term.toLowerCase()
  return (place) => place.toLowerCase().includes(lower)
}

export interface FilterOpts {
  query?: string
  locations?: string[]
  jobage?: number
  allLevels: boolean
  today?: Date
}

export function filterJobs(jobs: Job[], opts: FilterOpts): Job[] {
  const words = (opts.query ?? "").toLowerCase().split(/\s+/).filter(Boolean)
  const locs = (opts.locations ?? []).map((l) => l.trim()).filter(Boolean).map(locationMatcher)
  const today = opts.today ?? new Date()
  return jobs.filter((j) => {
    const title = j.title.toLowerCase()
    if (!words.every((w) => title.includes(w))) return false
    if (!opts.allLevels && SENIOR_TITLE.test(j.title)) return false
    if (locs.length) {
      const places = (j.location ?? "").split(/;|•|\|/).map((s) => s.trim())
      if (!places.some((p) => !NON_US.test(p) && locs.some((m) => m(p)))) return false
    }
    // Boards without a date (Ashby) stay in: age is a flag, never a reason to drop.
    if (opts.jobage !== undefined && j.date) {
      const age = (today.getTime() - new Date(j.date + "T00:00:00Z").getTime()) / 86400000
      if (age > opts.jobage) return false
    }
    return true
  })
}
