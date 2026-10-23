import { describe, expect, test } from "bun:test";
import { runCLI } from "./helpers";

describe("flag validation (no network)", () => {
  for (const args of [
    ["search", "--bogus", "x"],
    ["search", "--ats", "workday"],
    ["search", "--jobage", "0"],
    ["search", "-q"],
    ["search", "--format", "xml"],
    ["search", "--check-sponsorship", "yes"],
    ["search", "-c", "no-such-company-xyz"],
    ["detail", "not-a-url"],
  ]) {
    test(`${args.join(" ")} exits 1 with a JSON error`, async () => {
      const r = await runCLI(args);
      expect(r.exitCode).toBe(1);
      expect(["UNKNOWN_FLAG", "BAD_ARG"]).toContain(JSON.parse(r.stderr).code);
    });
  }

  test("companies lists the configured boards", async () => {
    const r = await runCLI(["companies"]);
    expect(r.exitCode).toBe(0);
    const list = JSON.parse(r.stdout);
    expect(list.length).toBeGreaterThan(10);
    for (const c of list) expect(["greenhouse", "lever", "ashby"]).toContain(c.ats);
  });
});
