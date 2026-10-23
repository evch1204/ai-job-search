"""tools/record_application.py: drafted rows, in-place refresh, and parallel safety."""
import csv
import json
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

REPO = Path(__file__).resolve().parent.parent
TOOL = REPO / "tools" / "record_application.py"
sys.path.insert(0, str(REPO / "tools"))
from rank_state import TRACKER_HEADER  # noqa: E402


class RecordApplication(unittest.TestCase):
    def setUp(self):
        self._tmp = TemporaryDirectory()
        self.tracker = Path(self._tmp.name) / "job_search_tracker.csv"
        self.addCleanup(self._tmp.cleanup)

    def run_tool(self, *args):
        proc = subprocess.run([sys.executable, str(TOOL), "--tracker", str(self.tracker), "--today", "2026-10-23", *args],
                              capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return json.loads(proc.stdout)

    def rows(self):
        return list(csv.DictReader(self.tracker.open(encoding="utf-8")))

    def test_new_row_is_drafted_with_files_and_comma_free_note(self):
        out = self.run_tool("--company", "Acme", "--role", "Software Engineer, New Grad", "--url", "https://jobs.lever.co/acme/1",
                            "--cv", "cv/main_acme.tex", "--cover", "cover_letters/cover_acme.tex", "--note", "likely sponsor, 40 LCAs", "--fit", "81")
        self.assertEqual(out["tracker"], "added")
        row = self.rows()[0]
        self.assertEqual((row["status"], row["fit_rating"], row["sponsorship"]), ("drafted", "81", "UNKNOWN"))
        self.assertEqual(row["role"], "Software Engineer, New Grad")
        self.assertNotIn(",", row["notes"])

    def test_open_row_is_refreshed_and_sponsorship_check_moves_to_drafted(self):
        self.tracker.write_text(",".join(TRACKER_HEADER) + "\n2026-10-20,Acme,,SWE I,,portal,sponsorship_check,,,check sponsorship,,,https://x,,UNKNOWN\n", encoding="utf-8")
        self.assertEqual(self.run_tool("--company", "acme", "--role", "swe i", "--cv", "cv/a.tex")["tracker"], "updated")
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]["status"], rows[0]["cv_file"]), ("drafted", "cv/a.tex"))

    def test_final_row_is_left_alone(self):
        self.tracker.write_text(",".join(TRACKER_HEADER) + "\n2026-09-01,Acme,,SWE I,,portal,rejected,,,,,,,,\n", encoding="utf-8")
        self.assertEqual(self.run_tool("--company", "Acme", "--role", "SWE I")["tracker"], "added")
        self.assertEqual([r["status"] for r in self.rows()], ["rejected", "drafted"])

    def test_parallel_writers_never_lose_a_row(self):
        procs = [subprocess.Popen([sys.executable, str(TOOL), "--tracker", str(self.tracker), "--company", f"Co{i}", "--role", "Engineer"],
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE) for i in range(10)]
        for p in procs:
            self.assertEqual(p.wait(), 0, p.stderr.read().decode())
        self.assertEqual(sorted(r["company"] for r in self.rows()), sorted(f"Co{i}" for i in range(10)))


if __name__ == "__main__":
    unittest.main()
