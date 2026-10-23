#!/usr/bin/env bun
// Self-contained CLI for employers' own job boards (Greenhouse, Lever, Ashby).
// Zero runtime dependencies; runs anywhere `bun` is available.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { loadCompanies, writeError, type Ats } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", c: "companies" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `company-boards-cli — search employers' own job boards (Greenhouse, Lever, Ashby)

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <greenhouse|lever|ashby job URL> [--format json|plain]
  bun run src/cli.ts companies

The company list lives in ../companies.json ({name, ats, slug}); add a company there.

SEARCH FLAGS
  --query, -q <text>        Words that must all appear in the job title (e.g. "software engineer").
  --location, -l <terms>    Comma list; a job matches if any of its locations contains any term.
                            Short all-caps terms (CA, NY, WA) match whole words only.
  --jobage <days>           Posted within N days (original date). Boards with no date (Ashby) are kept.
  --companies, -c <names>   Comma list of slugs or names to search (default: all in companies.json).
  --ats <list>              Comma list of greenhouse|lever|ashby.
  --all-levels              Keep senior/staff/lead/manager/intern titles (dropped by default: 0-2 years scope).
  --check-sponsorship       Read descriptions (Greenhouse, Lever) and drop jobs that refuse sponsorship;
                            others get sponsorship "yes" or null with the quoted wording.
  --page <n>, --limit, -n <n>   Paging (default 25 per page).
  --format <fmt>            json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q engineer -l "CA,San Francisco,New York,NY,Seattle,WA,Los Angeles,Remote" --jobage 7 --check-sponsorship --format table
  bun run src/cli.ts detail https://boards.greenhouse.io/figma/jobs/5426468004 --format plain
`

const KNOWN: Record<string, Set<string>> = {
  search: new Set(["query", "location", "jobage", "companies", "ats", "all-levels", "check-sponsorship", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
  companies: new Set(["help", "h"]),
}

function bad(error: string): number {
  writeError(error, "BAD_ARG")
  return 1
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]
  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }
  if (!KNOWN[cmd]) return bad(`unknown command '${cmd}' - use search, detail or companies`)
  for (const key of Object.keys(flags)) {
    if (key === "_" || KNOWN[cmd].has(key)) continue
    writeError(`unknown flag --${key} for '${cmd}' - flags are never silently ignored; see --help`, "UNKNOWN_FLAG")
    return 1
  }
  const all = loadCompanies()
  if (cmd === "companies") {
    process.stdout.write(JSON.stringify(all, null, 1) + "\n")
    return 0
  }
  if (cmd === "detail") {
    const ref = (flags._ as string[])[1]
    if (!ref || !/^https?:\/\//.test(ref)) return bad("detail needs a Greenhouse, Lever or Ashby job URL")
    const fmt = flags.format === undefined ? "json" : String(flags.format)
    if (fmt !== "json" && fmt !== "plain") return bad(`--format must be json|plain, got "${fmt}"`)
    return runDetail({ ref, format: fmt })
  }
  for (const name of ["query", "location", "companies", "ats"]) {
    if (flags[name] !== undefined && (typeof flags[name] !== "string" || !String(flags[name]).trim())) return bad(`--${name} requires a non-empty value`)
  }
  for (const name of ["all-levels", "check-sponsorship"]) {
    if (flags[name] !== undefined && flags[name] !== true) return bad(`--${name} takes no value`)
  }
  const fmt = flags.format === undefined ? "json" : String(flags.format)
  if (!["json", "table", "plain"].includes(fmt)) return bad(`--format must be one of json|table|plain, got "${fmt}"`)
  const nums: Record<string, number> = {}
  for (const name of ["jobage", "page", "limit"]) {
    if (flags[name] === undefined) continue
    const v = typeof flags[name] === "string" ? Number(String(flags[name]).trim()) : NaN
    if (!Number.isInteger(v) || v < 1) return bad(`--${name} must be a whole number of at least 1, got "${flags[name]}"`)
    nums[name] = v
  }
  let companies = all
  if (typeof flags.ats === "string") {
    const want = flags.ats.split(",").map((s) => s.trim().toLowerCase())
    const unknown = want.find((a) => !["greenhouse", "lever", "ashby"].includes(a))
    if (unknown) return bad(`--ats must be a comma list of greenhouse|lever|ashby, got "${unknown}"`)
    companies = companies.filter((c) => want.includes(c.ats as Ats))
  }
  if (typeof flags.companies === "string") {
    const want = flags.companies.split(",").map((s) => s.trim().toLowerCase())
    companies = companies.filter((c) => want.includes(c.slug.toLowerCase()) || want.includes(c.name.toLowerCase()))
    if (!companies.length) return bad(`no company in companies.json matches "${flags.companies}" - run 'companies' to list them`)
  }
  return runSearch({
    companies,
    query: typeof flags.query === "string" ? flags.query : undefined,
    locations: typeof flags.location === "string" ? flags.location.split(",") : undefined,
    jobage: nums.jobage,
    allLevels: flags["all-levels"] === true,
    checkSponsorship: flags["check-sponsorship"] === true,
    page: nums.page ?? 1,
    limit: nums.limit ?? 25,
    format: fmt as "json" | "table" | "plain",
  })
}

main().then((code) => process.exit(code))
