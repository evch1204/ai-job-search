#!/usr/bin/env python3
"""Fast-lane applications: a ready-made resume variant plus a fill-in cover letter.

/apply's full path researches the company, tailors every bullet and runs a
reviewer agent - right for a top match, too slow for volume. The fast lane
reuses one of three pre-verified 1-page resumes and writes a short cover letter
from a fixed, profile-grounded template, so a job is ready to submit in seconds:

    python3 tools/fast_lane.py prepare --company "Acme" --role "Software Engineer I" \\
        --variant fullstack --url https://... --hook "<one sentence from the posting>" \\
        --sponsorship UNKNOWN --note "likely sponsor: ~40 H-1B LCAs in 2025"

It writes cv/main_<slug>.tex, cover_letters/cover_<slug>.tex(+.pdf), copies the
upload files to cv/submit/<slug>/Tei_Chang_Resume.pdf and Tei_Chang_Cover_Letter.pdf,
and appends (or refreshes) the tracker row as `drafted`. Gates, fit and the
sponsorship decision happen before this runs (/apply "Fast lane"); this tool
only assembles documents and records them.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rank_state import TRACKER_HEADER, migrate_tracker_header, norm  # noqa: E402

VARIANTS = {
    "swe": "cv/baseline_general_swe",
    "fullstack": "cv/variant_fullstack",
    "ml": "cv/variant_ai_ml",
}

# Proof points per variant, each traceable to 01-candidate-profile.md.
BULLETS = {
    "swe": [
        "At DeepSpace I owned Create Mode from plain-English chat through code generation, dependency resolution and one-click deployment; 300+ users adopted it after launch.",
        "I built per-session Cloudflare Containers that sandboxed AI-generated code and sustained 50 concurrent sessions without cross-project failures.",
        "At Paidwork I built the test framework for an AI service's data pipeline and inference API, reaching 85%+ coverage and catching 10+ integration failures before rollout.",
    ],
    "fullstack": [
        "At DeepSpace I shipped 5+ full-stack web applications end to end in TypeScript, React and Next.js, integrating 20+ third-party services across 100+ API endpoints.",
        "I owned Create Mode from plain-English chat through code generation and one-click deployment; 300+ users adopted it after launch.",
        "I built and open-sourced BookWithMe, a scheduling app with Google Calendar sync and OAuth token refresh; 30 users have booked 150+ meetings with it.",
    ],
    "ml": [
        "At Paidwork I audited 5,000+ conversation pairs of fine-tuning data for a Hugging Face chat assistant, repairing mismatched and malformed examples before retraining.",
        "I added language detection and fallback routing to that assistant's inference path, raising handled queries by 15% across 100+ languages, and built its 85%+ coverage test framework.",
        "In a university project I built windowed features from raw EMG signals; a random forest reached 0.83 accuracy against 0.58 for logistic regression.",
    ],
}
CLOSER = ("I use Claude Code every day and built notchcode, a macOS companion on Claude Code's own hooks, "
          "so I am used to moving fast with AI while reviewing what it produces.")

TEX_SPECIAL = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
               "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}


def tex(text: str) -> str:
    return "".join(TEX_SPECIAL.get(c, c) for c in text).replace("\u2014", ", ").replace("\u2013", "-")


def slug(company: str, role: str) -> str:
    """documents/README.md "Subfolder naming"."""
    s = f"{company}_{role}".strip().lower().replace(" ", "_")
    s = re.sub(r"[^a-z0-9_]", "", s)
    s = re.sub(r"_+", "_", s).strip("_")
    if not s:
        sys.exit("company and role produce an empty name - give at least one letter or digit")
    return s


def cover_tex(company: str, role: str, variant: str, hook: str, greeting: str) -> str:
    items = "\n".join(f"    \\item {{{tex(b)}}}" for b in BULLETS[variant])
    hook_line = f"\\lettercontent{{{tex(hook)}}}\n\n" if hook.strip() else ""
    return rf"""\documentclass[]{{cover}}
\usepackage{{fancyhdr}}
\pagestyle{{fancy}}
\fancyhf{{}}
\thispagestyle{{empty}}
\renewcommand{{\headrulewidth}}{{0pt}}
\begin{{document}}

\namesection{{}}{{\Huge{{Tei (Evan) Chang}}}}{{  \href{{mailto:changtei1204@gmail.com}}{{changtei1204@gmail.com}} | +1 (301) 768-8151 |  \urlstyle{{same}}\href{{https://linkedin.com/in/evan-chang1}}{{LinkedIn}}
}}

\currentdate{{\today}}
\lettercontent{{{tex(greeting)}}}

\lettercontent{{I am applying for the {tex(role)} role at {tex(company)}, and I can start full-time right away. Over the past year I have shipped production software end to end, and these are the closest matches to what you are hiring for:}}

{{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{{Raleway-Medium}}\fontsize{{11pt}}{{13pt}}\selectfont
\begin{{itemize}}
{items}
\end{{itemize}}\par}}

{hook_line}\lettercontent{{{tex(CLOSER)}}}

\lettercontent{{I look forward to hearing from you.}}

\begin{{flushright}}
\closing{{Best regards,}}

\signature{{Tei (Evan) Chang}}
\end{{flushright}}
\end{{document}}
"""


def compile_cover(root: Path, name: str) -> None:
    """tectonic per the active cover-letter template block; exactly 1 page."""
    folder = root / "cover_letters"
    build = folder / "build"
    (folder / f"{name}.pdf").unlink(missing_ok=True)
    build.mkdir(exist_ok=True)
    proc = subprocess.run(["tectonic", "-X", "compile", "--outdir", "build", f"{name}.tex"],
                          cwd=folder, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"cover letter compile failed:\n{proc.stderr[-1500:]}")
    shutil.move(str(build / f"{name}.pdf"), str(folder / f"{name}.pdf"))
    shutil.rmtree(build, ignore_errors=True)
    check = subprocess.run([sys.executable, str(ROOT / "tools" / "verify_pdf.py"), str(folder / f"{name}.pdf"), "--pages", "1"],
                           capture_output=True, text=True)
    if check.returncode != 0:
        sys.exit(f"cover letter is not exactly 1 page - shorten --hook: {check.stdout}{check.stderr}")


def record(tracker: Path, row: dict) -> str:
    """Append or refresh the row under an exclusive lock, so parallel fast-lane runs never clobber each other."""
    import fcntl

    lock = tracker.with_name(tracker.name + ".lock")
    with lock.open("w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            return _record_locked(tracker, row)
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def _record_locked(tracker: Path, row: dict) -> str:
    """Append a drafted row, or refresh the files on an open row for the same company+role."""
    header = migrate_tracker_header(tracker)
    text = tracker.read_text(encoding="utf-8")
    lines = text.split("\n")
    final = {"hired", "rejected", "no_response", "no response", "offer_declined", "offer declined", "withdrawn"}
    for i, line in enumerate(lines[1:], 1):
        if not line.strip():
            continue
        cells = next(csv.reader([line]))
        cells += [""] * (len(header) - len(cells))
        existing = dict(zip(header, cells))
        if (norm(existing.get("company")), norm(existing.get("role"))) == (norm(row["company"]), norm(row["role"])) \
                and existing.get("status", "").strip().lower() not in final:
            for k in ("cv_file", "cover_letter_file", "source", "sponsorship"):
                if row.get(k):
                    existing[k] = row[k]
            if existing.get("status") == "sponsorship_check":
                existing["status"] = "drafted"
            existing["notes"] = (existing.get("notes") + "; " if existing.get("notes") else "") + "redrafted (fast lane)"
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


def cmd_prepare(a: argparse.Namespace) -> int:
    root = a.root
    name = slug(a.company, a.role)
    base = root / VARIANTS[a.variant]
    if not base.with_suffix(".tex").is_file() or not base.with_suffix(".pdf").is_file():
        sys.exit(f"variant {a.variant} needs {base}.tex and a compiled {base}.pdf")
    cv_tex = root / "cv" / f"main_{name}.tex"
    shutil.copyfile(base.with_suffix(".tex"), cv_tex)
    cover = root / "cover_letters" / f"cover_{name}.tex"
    cover.write_text(cover_tex(a.company, a.role, a.variant, a.hook or "", a.greeting), encoding="utf-8")
    if not a.no_compile:
        compile_cover(root, f"cover_{name}")
    submit = root / "cv" / "submit" / name
    submit.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(base.with_suffix(".pdf"), submit / "Tei_Chang_Resume.pdf")
    if not a.no_compile:
        shutil.copyfile(cover.with_suffix(".pdf"), submit / "Tei_Chang_Cover_Letter.pdf")
    note = f"fast lane: {a.variant} resume"
    if a.note:
        note += "; " + a.note.replace(",", ";")
    row = {h: "" for h in TRACKER_HEADER}
    row.update({
        "date": a.today, "company": a.company, "role": a.role, "channel": "portal", "status": "drafted",
        "fit_rating": a.fit or "", "notes": note, "cv_file": str(cv_tex.relative_to(root)),
        "cover_letter_file": str(cover.relative_to(root)), "source": a.url or "", "sponsorship": a.sponsorship,
    })
    result = record(a.tracker or root / "job_search_tracker.csv", row)
    print(json.dumps({"slug": name, "tracker": result, "variant": a.variant,
                      "upload": [str((submit / f).relative_to(root)) for f in sorted(p.name for p in submit.iterdir())]}, indent=2))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("prepare", help="assemble resume + cover letter for one job and record it")
    p.add_argument("--company", required=True)
    p.add_argument("--role", required=True)
    p.add_argument("--variant", required=True, choices=sorted(VARIANTS))
    p.add_argument("--url", default="")
    p.add_argument("--hook", default="", help="one or two sentences about the company, taken from the posting text")
    p.add_argument("--greeting", default="Dear Hiring Team,")
    p.add_argument("--sponsorship", default="UNKNOWN", choices=["PASS", "UNKNOWN"])
    p.add_argument("--note", default="", help="why it is being drafted, e.g. the H-1B filing history")
    p.add_argument("--fit", default="", help="triage score 0-100, if /rank produced one")
    p.add_argument("--today", default=date.today().isoformat())
    p.add_argument("--root", type=Path, default=ROOT)
    p.add_argument("--tracker", type=Path)
    p.add_argument("--no-compile", action="store_true", help="skip tectonic (tests)")
    p.set_defaults(func=cmd_prepare)
    a = ap.parse_args()
    return a.func(a)


if __name__ == "__main__":
    sys.exit(main())
