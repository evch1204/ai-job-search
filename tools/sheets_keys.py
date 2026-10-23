#!/usr/bin/env python3
"""Deterministic keys and status mapping for /sheets-sync.

The Google Sheet mirror matches rows on a stored Key (column L), never on fuzzy
company/role comparison. This module is the single place that derives that key
and translates between the tracker CSV's canonical status vocabulary and the
sheet's dropdown values, so /sheets-sync and the one-time import never diverge.

Key rule: `<company>_<role>` slugged by the documents/README.md "Subfolder
naming" rule. The tracker legitimately holds repeat applications to the same
company+role (a final row is never overwritten - /apply appends a new one), so
the Nth occurrence in tracker order (N >= 2) gets a `__N` suffix. Tracker rows
are append-only and never reordered, so an existing row's key never changes.

Usage:
    python3 tools/sheets_keys.py rows [job_search_tracker.csv]
        -> JSON list of tracker rows with `key` and `sheet_status`, one per row
    python3 tools/sheets_keys.py import <sheet_export.csv> [job_search_tracker.csv]
        -> one-time: build the tracker from a CSV export of the JOB APPLICATIONS
           tab (header row: #,Company,Role,Date applied,...). Refuses to
           overwrite an existing tracker that has data rows.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path

TRACKER_HEADER = [
    "date", "company", "sector", "role", "role_type", "channel", "status",
    "contact_person", "fit_rating", "notes", "cv_file", "cover_letter_file",
    "source", "deadline", "sponsorship",
]

# Sheet dropdown (column G) -> tracker canonical status.
SHEET_TO_TRACKER = {
    "to apply": "drafted",
    "check sponsorship": "sponsorship_check",
    "skipped": "withdrawn",
    "applied": "applied",
    "phone screen": "interview",
    "interviewing": "interview",
    "offer": "offer",
    "rejected": "rejected",
    "withdrawn": "withdrawn",
    "no response": "no_response",
}

# Tracker canonical status -> sheet dropdown value.
TRACKER_TO_SHEET = {
    "drafted": "To apply",
    "sponsorship_check": "Check sponsorship",
    "applied": "Applied",
    "interview": "Interviewing",
    "offer": "Offer",
    "hired": "Offer",
    "offer_declined": "Withdrawn",
    "rejected": "Rejected",
    "withdrawn": "Withdrawn",
    "no_response": "No response",
    # legacy space spellings, read-only per /outcome's vocabulary
    "no response": "No response",
    "offer declined": "Withdrawn",
}


# A `withdrawn` row the pipeline skipped (too old, ineligible) - rather than one the
# user withdrew - carries a "skipped: <why>" note; the sheet shows it as Skipped.
SKIP_PREFIX = "skipped:"
# Note segments that explain a row's current status, newest wins.
REASON_PREFIXES = ("skipped:", "withdrawn:", "rejected", "user override:", "user approved:")


def note_segments(notes: str) -> list[str]:
    return [s.strip() for s in (notes or "").split(";") if s.strip()]


def sheet_status_for(status: str, notes: str) -> str:
    status = (status or "").strip().lower()
    if status == "withdrawn" and any(s.lower().startswith(SKIP_PREFIX) for s in note_segments(notes)):
        return "Skipped"
    return TRACKER_TO_SHEET.get(status, "Applied")


def status_reason(status: str, notes: str) -> str:
    """Why the row has its status, for the sheet's Reason column."""
    for seg in reversed(note_segments(notes)):
        if seg.lower().startswith(REASON_PREFIXES):
            return seg
    if (status or "").strip().lower() == "sponsorship_check":
        return "posting does not mention visa sponsorship - check before applying"
    return ""


def slug(text: str) -> str:
    s = (text or "").strip().lower().replace(" ", "_")
    s = re.sub(r"[^a-z0-9_]", "", s)
    s = re.sub(r"_+", "_", s)
    return s.strip("_")


def base_key(company: str, role: str) -> str:
    return "_".join(p for p in (slug(company), slug(role)) if p) or "unnamed"


def assign_keys(rows: list[dict]) -> list[str]:
    seen: dict[str, int] = {}
    keys = []
    for r in rows:
        b = base_key(r.get("company", ""), r.get("role", ""))
        seen[b] = seen.get(b, 0) + 1
        keys.append(b if seen[b] == 1 else f"{b}__{seen[b]}")
    return keys


def sheet_status_equivalent(sheet_value: str, tracker_status: str) -> bool:
    """True when the sheet already says the same thing as the tracker.

    'Phone screen' and 'Interviewing' both mean `interview`, so a sheet row
    showing 'Phone screen' is left alone rather than flattened.
    """
    return SHEET_TO_TRACKER.get((sheet_value or "").strip().lower()) == \
        (tracker_status or "").strip().lower().replace(" ", "_")


def read_tracker(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def cmd_rows(tracker: Path) -> None:
    rows = read_tracker(tracker)
    out = []
    for i, (r, k) in enumerate(zip(rows, assign_keys(rows))):
        status = (r.get("status") or "").strip()
        out.append({
            "row_index": i,
            "key": k,
            "company": r.get("company", ""),
            "role": r.get("role", ""),
            "date": r.get("date", ""),
            "status": status,
            "sheet_status": sheet_status_for(status, r.get("notes", "")),
            "status_reason": status_reason(status, r.get("notes", "")),
            "source": r.get("source", ""),
            "sponsorship": r.get("sponsorship") or "",
            "channel": r.get("channel", ""),
            "notes": r.get("notes", ""),
        })
    json.dump(out, sys.stdout, indent=1)
    print()


def to_iso(us_date: str) -> str:
    us_date = (us_date or "").strip()
    if not us_date:
        return ""
    try:
        return datetime.strptime(us_date, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return ""


def cmd_import(export: Path, tracker: Path) -> None:
    if read_tracker(tracker):
        sys.exit(f"refusing to overwrite {tracker}: it already has data rows")
    with export.open(newline="", encoding="utf-8") as f:
        raw = list(csv.reader(f))
    try:
        start = next(i for i, r in enumerate(raw) if r and r[0].strip() == "#") + 1
    except StopIteration:
        sys.exit("no header row starting with '#' found in export")

    out_rows, warnings = [], []
    for r in raw[start:]:
        r = [c.strip() for c in r] + [""] * (12 - len(r))
        num, company, role, date, loc, wtype, status, i1, i2, link, notes = r[:11]
        if not (company or role or num):
            continue
        if company.upper().startswith("TEST ROW"):
            continue
        if num and not num.isdigit():
            # e.g. company name typed into the # column - keep the fuller name
            warnings.append(f"# column held {num!r}; using it as company (was {company!r})")
            company = num
        mapped = SHEET_TO_TRACKER.get(status.lower())
        if mapped is None:
            warnings.append(f"{company} / {role}: unknown status {status!r}, imported as applied")
            mapped = "applied"
        note_parts = [notes] if notes else []
        if status.lower() == "phone screen":
            note_parts.append("sheet status: Phone screen")
        for label, d in (("1st interview", i1), ("final interview", i2)):
            if to_iso(d):
                note_parts.append(f"{label} {to_iso(d)}")
        source = link if link.startswith("http") and "mail.google.com" not in link else ""
        channel = "portal" if link.lower() == "handshake" or "handshake" in link.lower() else ""
        out_rows.append({
            "date": to_iso(date), "company": company, "sector": "", "role": role,
            "role_type": "", "channel": channel, "status": mapped,
            "contact_person": "", "fit_rating": "",
            "notes": "; ".join(note_parts) + ("; imported from Google Sheet" if note_parts else "imported from Google Sheet"),
            "cv_file": "", "cover_letter_file": "", "source": source, "deadline": "",
            "sponsorship": "",
        })

    with tracker.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=TRACKER_HEADER)
        w.writeheader()
        w.writerows(out_rows)
    keys = assign_keys(out_rows)
    print(json.dumps({"imported": len(out_rows), "warnings": warnings,
                      "duplicate_keys": sorted(k for k in keys if "__" in k)}, indent=1))


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in {"rows", "import"}:
        sys.exit(__doc__)
    if sys.argv[1] == "rows":
        cmd_rows(Path(sys.argv[2] if len(sys.argv) > 2 else "job_search_tracker.csv"))
    else:
        if len(sys.argv) < 3:
            sys.exit(__doc__)
        cmd_import(Path(sys.argv[2]), Path(sys.argv[3] if len(sys.argv) > 3 else "job_search_tracker.csv"))
