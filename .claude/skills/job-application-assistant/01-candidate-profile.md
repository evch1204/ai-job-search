---
framework_version: 1.3.0
---

# Candidate Profile

<!-- Populated from the candidate's current general SWE resume (Chang_Tei_CV.pdf, Oct 2026).
This is the factual source of truth: every CV/cover-letter claim must trace back to a line here. -->

## Identity
- **Name:** Tei (Evan) Chang
- **Location:** Santa Clara, CA, USA
- **Phone:** +1 (301) 768-8151
- **Email:** changtei1204@gmail.com
- **Mailing address (cover letter sender block):** 1261 Normandy Way, Santa Clara, CA 95050
- **LinkedIn:** linkedin.com/in/evan-chang1
- **GitHub:** github.com/evch1204
- **Status:** Software engineer, available now (most recent role ended Sep 2026)
- **Constraints:** US-based roles only - on-site/hybrid within ~50 miles of Santa Clara (SF Bay Area), New York City, Seattle, Los Angeles, or fully remote in the US

### Work Authorization
- **Current status:** F-1 STEM OPT (24-month extension)
- **Needs:** an employer enrolled in **E-Verify** (a STEM OPT requirement) and willing to **sponsor H-1B**
- **Never claim** US citizenship, permanent residency, or "no sponsorship required" in any document or form answer
- This drives the Sponsorship Gate in `04-job-evaluation.md`

### Languages
<!-- Every language you can work in professionally, with your honest level. Used by the
Language Gate in 04-job-evaluation.md and by job-scraper/search-queries.md's query-language
generation. Omit any language you don't actually work in - an undeclared language is treated as
a hard no, not a gap to smooth over. -->

| Language | Level | Notes |
|----------|-------|-------|
| English | Professional working proficiency | Working language for all roles |

## Education

| Degree | Period | Institution | Key Topics |
|--------|--------|-------------|------------|
| B.S. Computer Science (Data Science/ML); Minors in Computer Engineering and Mathematics | Sep 2021 - Jun 2025 | Santa Clara University | Machine Learning, Algorithms, Data Structures, Databases, Operating Systems, Computer Architecture, Linear Algebra, Probability & Statistics, Software Engineering |

## Professional Experience

### Software Engineer - Eudaimonic Inc. (DeepSpace) (Jan 2026 - Sep 2026)
New York, NY (Remote)
<!-- Actual progression: Software Engineer Intern Jan-Apr 2026, then full-time Software Engineer May-Sep 2026 (confirmed by the candidate 2026-10-23). On resumes, show the single most recent title for the whole span, as the candidate prefers. For a "professional experience excluding internships" cap, the full-time part is May-Sep 2026 (~5 months). -->
- Shipped **Create Mode** (TypeScript, React, Next.js), owning the full pipeline from plain-English chat through code generation, dependency resolution, and one-click deployment; adopted by **300+ users** after launch
- Built per-session **Cloudflare Containers** from custom Docker images to sandbox AI-generated code, giving each project an isolated Node.js runtime and sustaining **50 concurrent sessions** without cross-project failures
- Maintained **macOS/Windows compatibility** for the **DeepSpace SDK**, fixing shell and build-script bugs that broke Windows installs, and testing and reviewing every cross-platform change before it reached production

### AI/Machine Learning Intern - Paidwork (Sep 2025 - Dec 2025)
Sacramento, CA
- Built the testing framework for the AI service's data pipeline and inference API from scratch, reaching **85%+ coverage** and catching **10+ integration failures** before each production rollout reached users
- Added language detection and fallback routing to the chat assistant's inference path, extending coverage to **100+ languages** and increasing the share of successfully handled queries by **15%** in production
- Curated fine-tuning data for the team's **Hugging Face** chat assistant, auditing **5,000+ conversation pairs** and repairing mismatched or malformed examples to raise response quality before retraining

### Software Engineering Intern - DuPont (Jun 2023 - Aug 2023)
Hsinchu, Taiwan
- **Placed 1st** among 20+ interns company-wide in the Internship Program Competition for internal automation and AI tooling, then presented the work to **500+ employees** at a company-wide engineering session
- Automated recurring reporting for a 20-person team with Python scripts that pull source data and generate formatted Excel deliverables, eliminating **5 hrs/week** of manual data entry and formatting across the team
- Prototyped a computer-vision safety monitor (**OpenCV**) that flagged workers missing required PPE on live lab camera feeds, as a proof of concept for automating the team's manual safety inspection rounds

### Additional DeepSpace work (usable on resumes when it fits better)
- Shipped **5+ full-stack web applications** end-to-end (TypeScript, React, Next.js) during the intern phase, owning system design, development and production deployment
- Integrated **20+ third-party services across 100+ API endpoints**, keeping data flow reliable and fault-tolerant across production apps
- Built several of the public **app.space** tools (owned by DeepSpace, built by the candidate):
  - **RunningMap** (runningmap.app.space) - browser route planner for runners: tap-to-draw routes with draggable waypoints, live distance and pacing modes, place search, saved routes with an anonymous mode; React, TypeScript, MapLibre GL with OpenFreeMap tiles (no per-tile billing key)
  - **DrawSpace** (drawspace.app.space) - infinite diagramming canvas with pen/shape/arrow/text tools rendered in a hand-drawn style, files and folders, search, undo/redo, account sync; React, TypeScript, Canvas API + SVG
  - **Docs** (docs.app.space) - document workspace: searchable library, folders, templates, sharing, block editor with live formatting and autosave; React, TypeScript
  - **BookWithMe** (bookwithme.app.space) - see Independent Projects; also Google Calendar sync with generated Meet links, host dashboard with event types, availability and analytics

### Additional Paidwork work
- Built an internal **integration-testing page** that let the team validate endpoints and inspect responses in the browser, replacing the manual Postman workflow

### Technical Service Student Assistant - Santa Clara University (May 2024 - Jun 2025)
Santa Clara, CA - part-time. **Optional: use only when it fits the posting better (data / SQL / database roles).**
- Optimized library database systems managing **50,000+ records**
- Used **SQL** to maintain data integrity and archival compliance

## Independent Projects
- **NotchDeveloper** (Swift, SwiftUI, C#, .NET, Git): native macOS developer tool that turns the MacBook notch into an interactive workspace for running Git commands and reviewing diffs in place, ported to Windows in C#/.NET. Adds an AI-assisted Git workflow that calls the Claude and Codex APIs to explain diffs and draft commit messages, with a live view of model usage alongside code changes so developers review AI output before committing.
- **notchcode / NotchDeveloper** (Swift, SwiftUI; Windows port in C#/.NET): the MacBook notch as a companion for **Claude Code** - shows every Claude Code session's state from any app, allow/deny permission requests with one key with the real diff open, Git commit/push/pull, and 5-hour/weekly usage; works only through Claude Code's own hooks and session logs (repo: github.com/evch1204/notchcode)
- **Ergonomic injury-risk classification from EMG** (Python, scikit-learn, pandas; group course project EMGT 311 / ENGR 184): windowed surface-EMG and IMU features (StandardScaler, 3-sigma clipping, 100-sample windows); **random forest 0.83 accuracy / F1 0.83** vs logistic regression 0.58 on EMG; IMU model failed (collapsed to one class) and the report names the overlapping-window leakage caveat
- **hand_tracker** (Python, MediaPipe, OpenCV, NumPy): real-time 3D cube control from 21 MediaPipe hand landmarks per hand - palm orientation drives rotation, two-hand pinch drives scale, exponential-moving-average smoothing removes jitter
- **NBA ranking model** (pandas, scikit-learn; CSCI 184): DecisionTreeRegressor (max_depth 5) and KNN on 14 per-game stats; next-season test R^2 0.65, MAE 58.6; tiers and a trade simulator
- **Valorant leaderboard analysis** (Python, requests, BeautifulSoup; CSCI 185): scraped ~900 players, hand-written Pearson correlation; K/D 0.47 vs headshot % 0.02 correlation with win rate
- **mow-your-commits** (JavaScript, three.js, Canvas, GitHub Actions): GitHub contribution graph as a mowable lawn, 2D canvas and cel-shaded three.js renderers over one pure simulation core; nightly GitHub Action renders an SVG into the profile README (evch1204.github.io/mow-your-commits)
- **Portfolio site** (TypeScript, React, Vite, Tailwind, Motion): evch1204.github.io
- **BookWithMe** (TypeScript, Cloudflare Workers, React, Google Calendar API): open-sourced Calendly-style scheduling app, the DeepSpace SDK's public reference implementation, owned end-to-end; adopted by **30 users** who have booked **150+ meetings**. Secure Google Calendar sync with OAuth token refresh and scoped access; Cloudflare Worker endpoints for booking, rescheduling, cancellation, and automated confirmation emails.

## Technical Skills

### Languages
- Python, TypeScript, JavaScript, Java, C++, C, Swift, C#, SQL, HTML/CSS

### Frameworks & Tools
- React, Next.js, Node.js, .NET, SwiftUI, REST APIs, Docker, AWS, Cloudflare Workers and Containers, PostgreSQL, Git, CI/CD

### Domain Expertise
- Full-stack web development, AI/LLM application engineering, sandboxed code execution, developer tooling, ML data pipelines and testing

### AI Tooling
- **Claude Code** - daily agentic-coding tool ("most of my code with AI in the loop"); built notchcode on Claude Code's hooks and session logs
- Claude and Codex APIs (NotchDeveloper); Hugging Face fine-tuning data curation (Paidwork)

### Data & ML libraries (from projects)
- scikit-learn, pandas, NumPy, Jupyter, MediaPipe, OpenCV, BeautifulSoup, matplotlib, seaborn

### Web & tooling (from projects)
- Vite, Tailwind, three.js, MapLibre GL, Canvas API, GitHub Actions, Vercel

## Publications
- None

## Awards
- 1st place (of 20+ interns) - DuPont Internship Program Competition (2023)

## References
- Not listed on US resumes; provide on request during the interview process
