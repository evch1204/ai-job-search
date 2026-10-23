# /sheets-sync - Mirror the Application Tracker into a Google Sheet

You are publishing a **mirror** of `job_search_tracker.csv` into the user's existing Google Sheet: one sheet row per tracker row, matched on a stored Key. The repo stays the system of record - `/apply` and `/outcome` change the tracker, this command makes the sheet catch up. This is the Google Sheets binding of the tool-agnostic sync contract in `/notion-sync` ("Adapting to Another Tool"), adapted to a sheet the user already owns and formats by hand.

This command requires a **Google Sheets MCP server**. It reads state, upserts rows, and stops - it never ranks, applies, or edits `job_search_tracker.csv`.

Follow these steps **in order**.

---

## Step 0: Parse Input

`$ARGUMENTS` may contain:

- Nothing → sync every tracker row
- `--dry-run` → do Steps 1-4 read-only and print the plan (rows to append, cells to update, conflicts) without writing anything

---

## Step 1: Preflight the Connection *(Google Sheets binding)*

The command is **silently optional**: when the sheet is not reachable, the outcome is one clear message and a clean exit.

1. Check that Google Sheets MCP tools are in this session's tool list (names containing `Google_Sheets`, `google_sheets`, or `google-sheets`, exposing `get_values` / `update_values` / `append_values`). Decide from the tool list **only** - never by running `claude mcp list`. If absent, stop and say:
   > Google Sheets isn't connected in this session. If you use Claude with this account, the claude.ai Google Sheets connector is picked up automatically - check `/mcp` for it. Otherwise run `claude mcp add --transport http google-sheets https://sheetsmcp.googleapis.com/mcp/v1`, start a **new session**, complete the login via `/mcp`, and re-run `/sheets-sync`.
2. Read `job_scraper/sheets_sync.json` (gitignored personal state):
   ```json
   {
     "spreadsheet_id": "...",
     "tab": "JOB APPLICATIONS",
     "header_row": 3,
     "key_column": "L",
     "last_sync": "YYYY-MM-DD",
     "written_status": { "<key>": "<sheet status value last written by this command>" }
   }
   ```
   If missing, ask the user for the sheet URL (the ID is the string between `/d/` and `/edit`), confirm the tab name, and write the file.
3. One cheap verification call: `get_values` on `<tab>!A<header_row>:M<header_row>`. An auth error → tell the user to re-authenticate via `/mcp` and stop. Never retry in a loop, never start an OAuth flow from this command.

---

## Step 2: Build the Sync Set (local only)

> **Windows:** run these tools as `python`, not `python3`. A python.org install ships no `python3`, so that name reaches the Microsoft Store alias, which either exits 49 with no output (#669) or starts a separate Store Python without the packages `pip` installed (such as pypdf). `.claude/settings.json` allows both spellings.

Run:

```bash
python3 tools/sheets_keys.py rows job_search_tracker.csv
```

It prints one JSON object per tracker row with a stable `key` and the `sheet_status` to show. **Always take keys from this tool - never derive them by hand**, or a repeat application gets the same key as the earlier one. If the tracker is missing or empty, say "Nothing to sync - run `/apply` first" and stop with zero side effects.

---

## Step 3: Read the Sheet

`get_values` on `<tab>!A<header_row+1>:M` (all data rows). Build a map `Key (column L) → sheet row number`. Note the highest numeric value in column A for numbering new rows.

**Sheet layout** (the user's own columns - never rename, reorder, or reformat them):

| Col | Header | Owner |
|---|---|---|
| A | # | sync on append only |
| B | Company | sync on append only |
| C | Role | sync on append only |
| D | Date applied | sync - fills when blank or when status leaves `drafted` |
| E | Location | **user** - sync writes only on append, from the posting |
| F | Work type | **user** - sync writes only on append: `Remote` / `Hybrid` / `Onsite` / `Unknown` |
| G | Status | sync - see Step 4 |
| H | 1st interview | **user** - never written |
| I | Final interview | **user** - never written |
| J | Link / email | sync - fills only when blank, from tracker `source` |
| K | Notes | **user** - sync writes only on append |
| L | Key | sync - dedup anchor, never edited by hand |
| M | Sponsorship | sync - tracker `sponsorship` (`PASS` / `UNKNOWN`, blank when unrecorded); fills when blank or when the tracker value changed |

First run only: if L`<header_row>` is empty, write `Key` there; if M`<header_row>` is empty, write `Sponsorship` there. If the Status column's dropdown has no `No response` option, tell the user once that `/outcome stale` can produce that status and offer to add it to the dropdown; add it only on yes. The same applies to a missing `Check sponsorship` option, which `sponsorship_check` rows (US postings with unconfirmed sponsorship, recorded for the user to check and apply to manually) need.

---

## Step 4: Upsert

For each sync-set row:

1. **Key not in the sheet → append** a row to `<tab>!A:M`: `#` = max + 1, Company, Role, Date applied (`MM/DD/YYYY`; blank while `drafted`), Location and Work type from the archived posting at `documents/applications/<company>_<role>/job_posting.md` when it states them (else blank / `Unknown`), Status = `sheet_status`, Link = `source`, Notes blank, Key, Sponsorship = `sponsorship`. The Link is what the user applies through, so never drop it. Use `USER_ENTERED` so the date becomes a real date the dashboard formulas can count.
2. **Key found → update cells only where needed:**
   - **Status (G):** if the sheet value already means the same thing as the tracker (`Phone screen` and `Interviewing` both mean `interview` - leave `Phone screen` alone), skip. Otherwise, **manual-edit guard:** if the current sheet value differs from `written_status[key]` (the user changed it by hand since the last sync), **do not overwrite** - list it under Conflicts and suggest `/outcome <company>` to record the change properly. Else write `sheet_status`.
   - **Date applied (D):** write when blank, or when the tracker row just moved out of `drafted` (date = the tracker `date`).
   - **Link (J):** write only when blank and `source` is non-empty.
   - **Sponsorship (M):** write when blank and `sponsorship` is non-empty, or when it differs from the tracker (`UNKNOWN` -> `PASS` after the user confirmed sponsorship and re-ran `/apply`).
   - Never touch E, F, H, I, K on an existing row.
3. Record every Status value you write (or found already equivalent) in `written_status[key]`.
4. Batch writes (`update_values` with several ranges per call). Rows the user added by hand (empty Key) are invisible to this command - never modify or number-shift them.

---

## Step 5: Report

```
## Sheet Sync - YYYY-MM-DD
Synced <N> tracker rows: <A> appended, <U> updated, <S> unchanged, <C> conflicts.

| | Company | Role | Sheet status |
|---|---|---|---|
| ✚ | ... | ... | To apply |
| ↻ | ... | ... | Interviewing |

Conflicts (left as-is in the sheet):
- Kabi - Forward Deployed Engineer: sheet says Offer, tracker says interview → run `/outcome kabi`
```

Update `last_sync` and `written_status` in `job_scraper/sheets_sync.json`.

---

## Important Rules

1. **Tracker → sheet only.** Nothing in the sheet flows back into repo files. The sync-state file is this command's only local write.
2. **Idempotent on Key.** Re-running appends nothing twice. Keys come from `tools/sheets_keys.py`, never from fuzzy matching.
3. **The sheet is the user's.** Formatting, formulas, the DASHBOARD tab, other tabs, and the user-owned columns are never modified; hand edits to Status are reported, not overwritten.
4. **Job data only.** No CV text, cover letter text, profile, or evaluation notes ever go into the sheet - filenames at most.
