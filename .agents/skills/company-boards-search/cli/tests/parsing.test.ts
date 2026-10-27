import { describe, expect, test } from "bun:test";
import { join } from "path";
import { filterJobs, futureClassTitle, locationMatcher, parseAshby, parseGreenhouse, parseLever, scanSponsorship, stripHtml } from "../src/helpers";

const fx = (f: string) => Bun.file(join(import.meta.dir, "fixtures", f)).text();
const acme = { name: "Acme", ats: "greenhouse" as const, slug: "acme" };
const beta = { name: "Beta", ats: "lever" as const, slug: "beta" };
const gamma = { name: "Gamma", ats: "ashby" as const, slug: "gamma" };
const gh = parseGreenhouse(await fx("greenhouse.json"), acme);
const lv = parseLever(await fx("lever.json"), beta);
const ab = parseAshby(await fx("ashby.html"), gamma);
const TODAY = new Date("2026-10-23T12:00:00Z");

describe("parsers", () => {
  test("greenhouse uses first_published as the date and keeps description text", () => {
    expect(gh[0].date).toBe("2026-10-22");
    expect(gh[0].url).toBe("https://boards.greenhouse.io/acme/jobs/1");
    expect(gh[0].text).toContain("unable to sponsor");
  });
  test("lever converts createdAt and joins all locations", () => {
    expect(lv[0].date).toBe("2026-10-23");
    expect(lv[0].location).toBe("Los Angeles, CA");
    expect(lv[0].text).toContain("without sponsorship");
  });
  test("ashby decodes window.__appData even with braces inside strings; no date on the board", () => {
    expect(ab).toHaveLength(2);
    expect(ab[0].location).toBe("San Francisco, California; New York, New York (Hybrid)");
    expect(ab[0].date).toBeNull();
    expect(ab[0].url).toBe("https://jobs.ashbyhq.com/gamma/g-1");
  });
  test("stripHtml decodes escaped markup", () => {
    expect(stripHtml("&lt;p&gt;Hi &amp; bye&lt;/p&gt;")).toBe("Hi & bye");
  });
});

describe("sponsorship scan", () => {
  test("refusals, citizenship and clearance are 'no'", () => {
    expect(scanSponsorship("We are unable to sponsor visas.").verdict).toBe("no");
    expect(scanSponsorship("Must be authorized to work in the US without sponsorship now or in the future").verdict).toBe("no");
    expect(scanSponsorship("This role is not eligible for employment based sponsorship").verdict).toBe("no");
    expect(scanSponsorship("You must be a U.S. citizen.").verdict).toBe("no");
    expect(scanSponsorship("Requires an active security clearance.").verdict).toBe("no");
  });
  test("explicit offers are 'yes'; silence is null", () => {
    expect(scanSponsorship("Visa sponsorship is available for this position.").verdict).toBe("yes");
    expect(scanSponsorship("We will sponsor H-1B for qualified candidates.").verdict).toBe("yes");
    expect(scanSponsorship("Must be authorized to work in the United States.").verdict).toBeNull();
  });
});

describe("filterJobs", () => {
  const all = [...gh, ...lv, ...ab];
  const locs = ["CA", "San Francisco", "New York", "NY", "Seattle", "WA", "Los Angeles", "Remote"];
  test("drops senior and intern titles and non-US places by default", () => {
    const titles = filterJobs(all, { locations: locs, allLevels: false, today: TODAY }).map((j) => j.title);
    expect(titles).not.toContain("Senior Software Engineer");
    expect(titles).not.toContain("Software Engineering Intern");
    expect(titles).not.toContain("Staff Engineer");
    expect(titles).not.toContain("Software Engineer I"); // Remote - Canada only
    expect(titles).toContain("Software Engineer, Early Career");
  });
  test("drops titles naming this year's or a later graduating class unless all levels", () => {
    expect(futureClassTitle("Software Engineer, 2027 New Grad", TODAY)).toBe(true);
    expect(futureClassTitle("New Grad Software Engineer (Class of 2026)", TODAY)).toBe(true);
    expect(futureClassTitle("Software Engineer, Early Career", TODAY)).toBe(false);
    const grad = { ...all[0], title: "Software Engineer - 2027 New Grad" };
    expect(filterJobs([grad], { allLevels: false, today: TODAY })).toHaveLength(0);
    expect(filterJobs([grad], { allLevels: true, today: TODAY })).toHaveLength(1);
  });
  test("jobage drops old dated jobs but keeps undated (Ashby) ones", () => {
    const titles = filterJobs(all, { jobage: 7, allLevels: false, today: TODAY }).map((j) => j.title);
    expect(titles).not.toContain("Backend Software Engineer");
    expect(titles).toContain("Software Engineer, Early Career");
  });
  test("short codes match whole words", () => {
    expect(locationMatcher("CA")("Los Angeles, CA")).toBe(true);
    expect(locationMatcher("CA")("Canada")).toBe(false);
  });
});
