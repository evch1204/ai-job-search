import { describe, expect, test } from "bun:test";
import { join } from "path";
import { filterPostings, locationMatcher, parseAge, parseList } from "../src/helpers";

const LIST = await Bun.file(join(import.meta.dir, "fixtures/list.md")).text();
const TODAY = new Date("2026-10-23T12:00:00Z");
const all = parseList(LIST, TODAY);
const base = { sections: ["swe", "ml"], includeNoSponsor: false, includeClosed: false };

describe("parseList", () => {
  test("reads every row of known sections and skips unknown ones", () => {
    expect(all.filter((p) => p.section === "swe")).toHaveLength(6);
    expect(all.filter((p) => p.section === "pm")).toHaveLength(1);
  });

  test("continuation rows inherit the company and multi-location cells split", () => {
    const infra = all.find((p) => p.title.endsWith("Infra"))!;
    expect(infra.company).toBe("Acme");
    expect(infra.location).toBe("NYC; Vancouver, BC, Canada");
  });

  test("markers become fields and are stripped from titles", () => {
    expect(all.find((p) => p.company === "Beta Defense")!.sponsorship).toBe("no");
    expect(all.find((p) => p.company === "Gamma")!.sponsorship).toBe("citizenship");
    expect(all.find((p) => p.company === "Delta")!.closed).toBe(true);
    const eps = all.find((p) => p.company === "Epsilon")!;
    expect(eps.advancedDegree).toBe(true);
    expect(eps.title).toBe("Software Engineer New Grad");
    expect(all.find((p) => p.company === "Acme")!.company).toBe("Acme");
  });

  test("employer URL has tracking params removed and the date is derived from Age", () => {
    const acme = all.find((p) => p.title === "Software Engineer New Grad" && p.company === "Acme")!;
    expect(acme.url).toBe("https://jobs.lever.co/acme/1111/apply");
    expect(acme.id).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(acme.date).toBe("2026-10-23");
    expect(all.find((p) => p.title.endsWith("Infra"))!.ageDays).toBe(60);
  });

  test("parseAge handles d/w/mo and rejects junk", () => {
    expect(parseAge("3d")).toBe(3);
    expect(parseAge("2w")).toBe(14);
    expect(parseAge("1mo")).toBe(30);
    expect(parseAge("soon")).toBeNull();
  });
});

describe("filterPostings", () => {
  test("drops no-sponsorship, citizenship-only and closed rows by default", () => {
    const names = filterPostings(all, base).map((p) => p.company);
    expect(names).not.toContain("Beta Defense");
    expect(names).not.toContain("Gamma");
    expect(names).not.toContain("Delta");
  });

  test("short codes match whole words only, so CA never matches Canada", () => {
    expect(locationMatcher("CA")("San Jose, CA")).toBe(true);
    expect(locationMatcher("CA")("Vancouver, BC, Canada")).toBe(false);
    const hits = filterPostings(all, { ...base, locations: ["NYC", "Remote in USA"] }).map((p) => p.title);
    expect(hits).toEqual(["Software Engineer New Grad - Infra", "Software Engineer New Grad"]);
  });

  test("jobage and query narrow the results", () => {
    const fresh = filterPostings(all, { ...base, jobage: 7 });
    expect(fresh.every((p) => (p.ageDays ?? 999) <= 7)).toBe(true);
    expect(filterPostings(all, { ...base, query: "infra" })).toHaveLength(1);
  });
});
