import { describe, expect, test } from "bun:test";
import { runSearchFixture } from "./helpers";

const LOCATION = "San Francisco Bay Area";

// experienceFlag() maps an unknown level to null; without the up-front
// rejection the request would carry no f_E and search every seniority while
// exiting 0, the same silent-filter failure --remote guards against.
describe("--experience levels", () => {
  for (const args of [["--experience", "junior"], ["--experience", "entry,senior"], ["--experience"]]) {
    test(`${args.join(" ")} exits 1 with BAD_ARG before any request`, async () => {
      const { result, requests } = await runSearchFixture(["search", "-l", LOCATION, ...args]);
      expect(result.exitCode).toBe(1);
      const error = JSON.parse(result.stderr);
      expect(error.code).toBe("BAD_ARG");
      expect(error.error).toContain("--experience");
      expect(requests).toHaveLength(0);
    });
  }

  for (const [spec, fE] of [["entry", "2"], ["entry,associate", "2,3"], ["Associate, internship", "1,3"], ["entry,entry", "2"]]) {
    test(`--experience "${spec}" sends f_E=${fE}`, async () => {
      const { result, requests } = await runSearchFixture(["search", "-l", LOCATION, "--experience", spec]);
      expect(result.exitCode).toBe(0);
      expect(requests[0].searchParams.get("f_E")).toBe(fE);
    });
  }

  test("omitting --experience searches every level", async () => {
    const { result, requests } = await runSearchFixture(["search", "-l", LOCATION]);
    expect(result.exitCode).toBe(0);
    expect(requests[0].searchParams.has("f_E")).toBe(false);
  });
});
