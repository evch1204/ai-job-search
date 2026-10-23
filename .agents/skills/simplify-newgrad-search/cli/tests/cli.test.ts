import { describe, expect, test } from "bun:test";
import { runCLI, runWithFixture } from "./helpers";

describe("search contract", () => {
  test("json output carries the portal contract fields for every result", async () => {
    const { result, requests } = await runWithFixture(["search", "-l", "CA,NYC,Remote in USA", "--format", "json"]);
    expect(result.exitCode).toBe(0);
    expect(requests).toHaveLength(1);
    const out = JSON.parse(result.stdout);
    expect(out.meta.count).toBe(out.results.length);
    for (const r of out.results) for (const k of ["id", "title", "company", "location", "date", "url"]) expect(r).toHaveProperty(k);
    expect(out.results.map((r: { company: string }) => r.company)).not.toContain("Gamma");
  });

  test("--include-no-sponsor keeps the flagged rows", async () => {
    const { result } = await runWithFixture(["search", "--include-no-sponsor", "--format", "json"]);
    const companies = JSON.parse(result.stdout).results.map((r: { company: string }) => r.company);
    expect(companies).toContain("Beta Defense");
  });

  test("detail finds a row by Simplify id", async () => {
    const { result } = await runWithFixture(["detail", "aaaaaaaa-1111-2222-3333-444444444444"]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).company).toBe("Acme");
  });
});

describe("flag validation (no network)", () => {
  for (const args of [["search", "--bogus", "x"], ["search", "--section", "art"], ["search", "--jobage", "0.5"], ["search", "-q"], ["search", "--format", "xml"]]) {
    test(`${args.join(" ")} exits 1 with a JSON error`, async () => {
      const r = await runCLI(args);
      expect(r.exitCode).toBe(1);
      expect(["UNKNOWN_FLAG", "BAD_ARG"]).toContain(JSON.parse(r.stderr).code);
    });
  }
});
