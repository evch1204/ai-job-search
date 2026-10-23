#!/usr/bin/env python3
"""Record one drafted application in job_search_tracker.csv - safe under parallel writers.

Batch apply (/apply "Batch apply") runs several writer agents at once, and each
records its own jobs. Every write takes an exclusive lock on a sidecar file, so
concurrent agents never interleave or drop rows:

    python3 tools/record_application.py --company "Acme" --role "Software Engineer I" \\
        --url https://... --cv cv/main_acme_software_engineer_i.tex \\
        --cover cover_letters/cover_acme_software_engineer_i.tex --sponsorship UNKNOWN \\
        --note "likely sponsor: ~40 H-1B LCAs in 2025 - confirm" --fit 78

It follows /apply Step 6b: a new row is `drafted`; an open row for the same
company+role is refreshed in place (files, source, sponsorship, a `redrafted`
marker) and a `sponsorship_check` row moves to `drafted`; a final row is left
alone and a new row is appended beside it.
"""

from __future__ import annotations

import argparse
import csv
import fcntl
import io
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rank_state import TRACKER_HEADER, migrate_tracker_header, norm  # noqa: E402

FINAL = {"hired", "rejected", "no_response", "no response", "offer_declined", "offer declined", "withdrawn"}


def record(tracker: Path, row: dict) -> str:
    """Append or refresh the row under an exclusive lock."""
    lock = tracker.with_name(tracker.name + ".lock")
    with lock.open("w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            return _record_locked(tracker, row)
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def _record_locked(tracker: Path, row: dict) -> str:
    header = migrate_tracker_header(tracker)
    text = tracker.read_text(encoding="utf-8")
    lines = text.split("\n")
    for i, line in enumerate(lines[1:], 1):
        if not line.strip():
            continue
        cells = next(csv.reader([line]))
        cells += [""] * (len(header) - len(cells))
        existing = dict(zip(header, cells))
        same = (norm(existing.get("company")), norm(existing.get("role"))) == (norm(row["company"]), norm(row["role"]))
        if same and existing.get("status", "").strip().lower() not in FINAL:
            for k in ("cv_file", "cover_letter_file", "source", "sponsorship", "fit_rating"):
                if row.get(k):
                    existing[k] = row[k]
            if existing.get("status") == "sponsorship_check":
                existing["status"] = "drafted"
            existing["notes"] = (existing.get("notes") + "; " if existing.get("notes") else "") + "redrafted"
            buf = io.StringIO()
            csv.writer(buf, lineterminator="").writerow([existing.get(h, "") for h in header])
            lines[i] = buf.getvalue()
            tracker.write_text("\n".join(lines), encoding="utf-8")
            return "updated"
    with tracker.open("a", encoding="utf-8", newline="") as fh:
        if text and not text.endswith("\n"):
            fh.write("\n")
        csv.DictWriter(fh, fieldnames=header, extrasaction="ignore", lineterminator="\n").writerow(row)
    return "added"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--company", required=True)
    ap.add_argument("--role", required=True)
    ap.add_argument("--url", default="")
    ap.add_argument("--cv", default="")
    ap.add_argument("--cover", default="")
    ap.add_argument("--sponsorship", default="UNKNOWN", choices=["PASS", "UNKNOWN"])
    ap.add_argument("--note", default="", help="why it was drafted (commas are replaced: the tracker is unquoted downstream)")
    ap.add_argument("--fit", default="")
    ap.add_argument("--deadline", default="")
    ap.add_argument("--today", default=date.today().isoformat())
    ap.add_argument("--tracker", type=Path, default=ROOT / "job_search_tracker.csv")
    a = ap.parse_args()
    row = {h: "" for h in TRACKER_HEADER}
    row.update({
        "date": a.today, "company": a.company, "role": a.role, "channel": "portal", "status": "drafted",
        "fit_rating": a.fit, "notes": ("batch apply; " + a.note.replace(",", ";")).rstrip("; "),
        "cv_file": a.cv, "cover_letter_file": a.cover, "source": a.url, "deadline": a.deadline,
        "sponsorship": a.sponsorship,
    })
    print(json.dumps({"tracker": record(a.tracker, row), "company": a.company, "role": a.role}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
