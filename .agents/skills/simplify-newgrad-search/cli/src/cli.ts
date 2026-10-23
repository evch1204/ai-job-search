#!/usr/bin/env bun
// Self-contained CLI for the SimplifyJobs New-Grad-Positions list (GitHub README).
// Zero runtime dependencies; runs anywhere `bun` is available.

import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { SECTIONS, writeError } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
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

const HELP = `simplify-newgrad-cli — search the SimplifyJobs New-Grad-Positions list

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <simplify-id|simplify-url|employer-url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>        Words that must all appear in role or company (e.g. "software engineer").
  --location, -l <terms>    Comma list; a row matches if any term is in its location
                            (e.g. "CA,NYC,New York,Seattle,WA,Los Angeles,Remote in USA").
                            Short all-caps terms (CA, WA, NYC) match whole words only.
  --jobage <days>           Posted within N days (from the list's Age column).
  --section <keys>          Comma list of ${Object.keys(SECTIONS).join("|")}. Default: swe,ml.
  --include-no-sponsor      Keep rows marked "does NOT offer sponsorship" / "requires US citizenship"
                            (dropped by default).
  --include-closed          Keep closed postings (dropped by default).
  --page <n>                1-indexed page of 25.
  --limit, -n <n>           Cap results emitted.
  --format <fmt>            json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "software engineer" -l "CA,NYC,New York,Seattle,WA,Los Angeles,Remote in USA" --jobage 7 --format table
  bun run src/cli.ts search --section ml --jobage 1
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "location", "jobage", "section", "include-no-sponsor", "include-closed", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function bad(error: string): number {
  writeError(error, "BAD_ARG")
  return 1
}

function wholeNumber(name: string, raw: string | boolean | string[]): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  return Number.isInteger(val) && val >= 1 ? val : null
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]
  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }
  const known = KNOWN_FLAGS[cmd]
  if (!known) return bad(`unknown command '${cmd}' - use search or detail`)
  for (const key of Object.keys(flags)) {
    if (key === "_" || known.has(key)) continue
    writeError(`unknown flag --${key} for '${cmd}' - flags are never silently ignored; see --help`, "UNKNOWN_FLAG")
    return 1
  }

  if (cmd === "detail") {
    const ref = (flags._ as string[])[1]
    if (!ref) return bad("detail needs a Simplify posting id or URL")
    const fmt = flags.format === undefined ? "json" : String(flags.format)
    if (fmt !== "json" && fmt !== "plain") return bad(`--format must be json|plain, got "${fmt}"`)
    return runDetail({ ref, format: fmt })
  }

  for (const name of ["query", "location", "section"]) {
    if (flags[name] !== undefined && (typeof flags[name] !== "string" || !String(flags[name]).trim())) {
      return bad(`--${name} requires a non-empty value`)
    }
  }
  const fmt = flags.format === undefined ? "json" : String(flags.format)
  if (!["json", "table", "plain"].includes(fmt)) return bad(`--format must be one of json|table|plain, got "${fmt}"`)
  const sections = typeof flags.section === "string" ? flags.section.split(",").map((s) => s.trim().toLowerCase()) : ["swe", "ml"]
  const unknownSection = sections.find((s) => !(s in SECTIONS))
  if (unknownSection) return bad(`--section must be a comma list of ${Object.keys(SECTIONS).join("|")}, got "${unknownSection}"`)
  const nums: Record<string, number | undefined> = {}
  for (const name of ["jobage", "page", "limit"]) {
    if (flags[name] === undefined) continue
    const v = wholeNumber(name, flags[name])
    if (v === null) return bad(`--${name} must be a whole number of at least 1, got "${flags[name]}"`)
    nums[name] = v
  }
  for (const name of ["include-no-sponsor", "include-closed"]) {
    if (flags[name] !== undefined && flags[name] !== true) return bad(`--${name} takes no value`)
  }
  return runSearch({
    query: typeof flags.query === "string" ? flags.query : undefined,
    locations: typeof flags.location === "string" ? flags.location.split(",") : undefined,
    jobage: nums.jobage,
    sections,
    includeNoSponsor: flags["include-no-sponsor"] === true,
    includeClosed: flags["include-closed"] === true,
    page: nums.page ?? 1,
    limit: nums.limit ?? 25,
    format: fmt as "json" | "table" | "plain",
  })
}

main().then((code) => process.exit(code))
