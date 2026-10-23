# Company boards - endpoint reference

| ATS | List endpoint | Detail endpoint | Date field | Description |
|---|---|---|---|---|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs` (`?content=true` adds HTML content) | `.../boards/<slug>/jobs/<id>` | `first_published` (original), `updated_at` | `content` (HTML-escaped) |
| Lever | `https://api.lever.co/v0/postings/<slug>?mode=json` | `.../postings/<slug>/<id>` | `createdAt` (ms) | `descriptionPlain`, `lists[].content`, `additionalPlain` |
| Ashby | `https://jobs.ashbyhq.com/<slug>` (HTML; `window.__appData.jobBoard.jobPostings`) | `https://jobs.ashbyhq.com/<slug>/<id>` (`window.__appData.posting`) | none on the board; posting page `publishedDate` | posting `descriptionHtml` |

robots.txt (checked 2026-10-23): boards-api.greenhouse.io ALLOWED, api.lever.co ALLOWED, jobs.ashbyhq.com ALLOWED. `api.ashbyhq.com` publishes no readable robots.txt (401), so it is **not** used.

Parsing anchors: `cli/src/helpers.ts` `parseGreenhouse`, `parseLever`, `parseAshby` / `ashbyAppData`; fixtures in `cli/tests/fixtures/`.
