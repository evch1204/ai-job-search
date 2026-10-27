// Data source: the SimplifyJobs New-Grad-Positions README on GitHub. It is one
// HTML table per section (Company | Role | Location | Application | Age), kept
// current by the community, with markers for sponsorship and closed postings.
// raw.githubusercontent.com publishes no robots.txt, so reading it is allowed.

export const LIST_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md"
export const SIMPLIFY_POSTING = "https://simplify.jobs/p/"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; simplify-newgrad-cli/1.0)"

/** Fetch text with exponential backoff on 429/5xx. */
export async function textFetch(url: string): Promise<string> {
  const maxRetries = 4
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/plain,text/markdown,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      await new Promise((r) => setTimeout(r, delay + Math.floor(Math.random() * 300)))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

/** Section keys accepted by --section, matched against the README's H2 titles. */
export const SECTIONS: Record<string, RegExp> = {
  swe: /Software Engineering/i,
  ml: /Data Science|Machine Learning/i,
  pm: /Product Management/i,
  quant: /Quantitative/i,
  hw: /Hardware/i,
}

export interface Posting {
  id: string
  title: string
  company: string
  location: string | null
  date: string | null // approximate: today minus the list's Age column
  url: string | null // the employer's own posting / application link
  ageDays: number | null
  sponsorship: "no" | "citizenship" | null // 🛂 / 🇺🇸 markers; null = not flagged
  closed: boolean
  advancedDegree: boolean
  section: string
  simplifyUrl: string | null
}

function stripTags(html: string): string {
  return html
    .replace(/<\/?br\s*\/?>/gi, "; ")
    .replace(/<summary>[\s\S]*?<\/summary>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

/** "3d" -> 3, "2mo" -> 60, "1w" -> 7; null when unparseable. */
export function parseAge(text: string): number | null {
  const m = text.trim().match(/^(\d+)\s*(d|w|mo|y)$/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  return unit === "d" ? n : unit === "w" ? n * 7 : unit === "mo" ? n * 30 : n * 365
}

function cleanUrl(href: string): string {
  try {
    const u = new URL(href.replace(/&amp;/g, "&"))
    for (const k of [...u.searchParams.keys()]) {
      if (k.startsWith("utm_") || k === "ref") u.searchParams.delete(k)
    }
    return u.toString()
  } catch {
    return href
  }
}

function isoDaysAgo(days: number, today: Date): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Parse every table row in the README into postings, section by section. */
export function parseList(markdown: string, today: Date = new Date()): Posting[] {
  const out: Posting[] = []
  const parts = markdown.split(/\n## /)
  for (const part of parts) {
    const heading = part.split("\n", 1)[0]
    const section = Object.keys(SECTIONS).find((k) => SECTIONS[k].test(heading))
    if (!section) continue
    let lastCompany = ""
    for (const row of part.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const cells = [...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1])
      if (cells.length < 5) continue
      const [companyCell, roleCell, locationCell, appCell, ageCell] = cells
      const companyText = stripTags(companyCell).replace(/🔥/g, "").trim()
      const company = companyText === "↳" || companyText === "" ? lastCompany : companyText
      lastCompany = company
      const roleRaw = stripTags(roleCell)
      const markers = roleRaw + " " + companyText
      const sponsorship = markers.includes("🇺🇸") ? "citizenship" : markers.includes("🛂") ? "no" : null
      const title = roleRaw.replace(/[🛂🇺🇸🔒🎓🔥]/gu, "").replace(/\s+/g, " ").trim()
      const hrefs = [...appCell.matchAll(/href="([^"]+)"/g)].map((h) => h[1])
      const simplifyHref = hrefs.find((h) => h.startsWith(SIMPLIFY_POSTING)) ?? null
      const employerHref = hrefs.find((h) => !h.startsWith("https://simplify.jobs/")) ?? null
      const closed = appCell.includes("🔒") || hrefs.length === 0
      const ageDays = parseAge(stripTags(ageCell))
      const url = employerHref ? cleanUrl(employerHref) : null
      const simplifyUrl = simplifyHref ? cleanUrl(simplifyHref) : null
      const idMatch = simplifyUrl?.match(/\/p\/([0-9a-f-]{8,})/)
      out.push({
        id: idMatch ? idMatch[1] : `${company}|${title}|${url ?? ""}`,
        title: title,
        company: company,
        location: stripTags(locationCell).replace(/^\d+ locations\s*/i, "") || null,
        date: ageDays === null ? null : isoDaysAgo(ageDays, today),
        url: url,
        ageDays,
        sponsorship,
        closed,
        advancedDegree: (roleRaw + " " + companyText).includes("🎓"),
        section,
        simplifyUrl,
      })
    }
  }
  return out
}

export interface FilterOpts {
  query?: string
  locations?: string[]
  jobage?: number
  sections: string[]
  includeNoSponsor: boolean
  includeClosed: boolean
  today?: Date
}

/**
 * A title naming this year or a later one ("2027 New Grad", "Class of 2026") is a
 * program for students still graduating, never for someone who already has.
 */
export function futureClassTitle(title: string, today: Date): boolean {
  return (title.match(/\b20\d\d\b/g) ?? []).some((y) => Number(y) >= today.getUTCFullYear())
}

/**
 * A short all-caps term ("CA", "WA", "NYC") must match as a whole word, so "CA"
 * never matches "Canada"; any other term is a case-insensitive substring.
 */
export function locationMatcher(term: string): (place: string) => boolean {
  if (/^[A-Z]{2,3}$/.test(term)) {
    const re = new RegExp(`\\b${term}\\b`)
    return (place) => re.test(place)
  }
  const lower = term.toLowerCase()
  return (place) => place.toLowerCase().includes(lower)
}

/** All query words must appear in title or company; a row matches if any of its locations matches any term. */
export function filterPostings(postings: Posting[], opts: FilterOpts): Posting[] {
  const words = (opts.query ?? "").toLowerCase().split(/\s+/).filter(Boolean)
  const locs = (opts.locations ?? []).map((l) => l.trim()).filter(Boolean).map(locationMatcher)
  const today = opts.today ?? new Date()
  return postings.filter((p) => {
    if (!opts.sections.includes(p.section)) return false
    if (futureClassTitle(p.title, today)) return false
    if (!opts.includeClosed && p.closed) return false
    if (!opts.includeNoSponsor && p.sponsorship !== null) return false
    if (opts.jobage !== undefined && (p.ageDays === null || p.ageDays > opts.jobage)) return false
    const hay = `${p.title} ${p.company}`.toLowerCase()
    if (!words.every((w) => hay.includes(w))) return false
    const places = (p.location ?? "").split(/;\s*/)
    if (locs.length && !places.some((place) => locs.some((match) => match(place)))) return false
    return true
  })
}
