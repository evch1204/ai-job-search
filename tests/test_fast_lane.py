"""tools/fast_lane.py: variant copy, cover-letter template, upload files, tracker row."""
import csv
import json
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

REPO = Path(__file__).resolve().parent.parent
TOOL = REPO / "tools" / "fast_lane.py"
sys.path.insert(0, str(REPO / "tools"))
import fast_lane  # noqa: E402


class FastLane(unittest.TestCase):
    def setUp(self):
        self._tmp = TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)
        for d in ("cv", "cover_letters"):
            (self.root / d).mkdir()
        for v in ("baseline_general_swe", "variant_fullstack", "variant_ai_ml"):
            (self.root / "cv" / f"{v}.tex").write_text(f"% {v}\n", encoding="utf-8")
            (self.root / "cv" / f"{v}.pdf").write_bytes(b"%PDF " + v.encode())
        self.tracker = self.root / "job_search_tracker.csv"

    def run_tool(self, *args, expect=0):
        proc = subprocess.run([sys.executable, str(TOOL), "prepare", "--root", str(self.root), "--no-compile",
                               "--today", "2026-10-23", *args], capture_output=True, text=True)
        self.assertEqual(proc.returncode, expect, proc.stderr)
        return json.loads(proc.stdout) if expect == 0 else proc

    def rows(self):
        return list(csv.DictReader(self.tracker.open(encoding="utf-8")))

    def test_assembles_files_and_records_a_drafted_row(self):
        out = self.run_tool("--company", "Acme & Co", "--role", "Software Engineer I", "--variant", "ml",
                            "--url", "https://jobs.lever.co/acme/1", "--hook", "Acme ships 100% of its code in $TS_now.",
                            "--note", "likely sponsor, 40 LCAs")
        self.assertEqual(out["slug"], "acme_co_software_engineer_i")
        self.assertEqual((self.root / "cv/submit/acme_co_software_engineer_i/Tei_Chang_Resume.pdf").read_bytes(), b"%PDF variant_ai_ml")
        letter = (self.root / "cover_letters/cover_acme_co_software_engineer_i.tex").read_text()
        self.assertIn(r"Acme \& Co", letter)
        self.assertIn(r"100\% of its code in \$TS\_now", letter)
        self.assertIn("Claude Code", letter)
        self.assertIn("5,000+ conversation pairs", letter)  # ml proof points
        row = self.rows()[0]
        self.assertEqual(row["status"], "drafted")
        self.assertEqual(row["sponsorship"], "UNKNOWN")
        self.assertEqual(row["source"], "https://jobs.lever.co/acme/1")
        self.assertNotIn(",", row["notes"], "notes stay comma-free for the unquoted row rewriters")

    def test_rerun_refreshes_an_open_row_instead_of_duplicating(self):
        self.tracker.write_text(",".join(fast_lane.TRACKER_HEADER) + "\n2026-10-20,Acme,,Software Engineer I,,portal,sponsorship_check,,,check sponsorship,,,https://x,,UNKNOWN\n", encoding="utf-8")
        out = self.run_tool("--company", "acme", "--role", "software engineer i", "--variant", "swe")
        self.assertEqual(out["tracker"], "updated")
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["status"], "drafted")
        self.assertIn("fast lane", rows[0]["notes"])

    def test_parallel_runs_never_lose_a_tracker_row(self):
        procs = [subprocess.Popen([sys.executable, str(TOOL), "prepare", "--root", str(self.root), "--no-compile",
                                   "--today", "2026-10-23", "--company", f"Co{i}", "--role", "Engineer", "--variant", "swe"],
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE) for i in range(8)]
        for proc in procs:
            self.assertEqual(proc.wait(), 0, proc.stderr.read().decode())
        self.assertEqual(sorted(r["company"] for r in self.rows()), [f"Co{i}" for i in range(8)])

    def test_missing_variant_pdf_is_an_error(self):
        (self.root / "cv/variant_fullstack.pdf").unlink()
        proc = self.run_tool("--company", "A", "--role", "B", "--variant", "fullstack", expect=1)
        self.assertIn("variant fullstack", proc.stderr)

    def test_bullets_cover_every_variant(self):
        self.assertEqual(set(fast_lane.BULLETS), set(fast_lane.VARIANTS))


if __name__ == "__main__":
    unittest.main()
