"""tools/sheets_keys.py: the Google Sheet's status and Reason columns."""
import csv
import json
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

TOOL = Path(__file__).resolve().parent.parent / "tools" / "sheets_keys.py"
sys.path.insert(0, str(TOOL.parent))
import sheets_keys  # noqa: E402


class SheetStatusAndReason(unittest.TestCase):
    def test_pipeline_skip_shows_as_skipped_not_withdrawn(self):
        notes = "check sponsorship; skipped: first posted 2026-07-06 - over the 1-month limit"
        self.assertEqual(sheets_keys.sheet_status_for("withdrawn", notes), "Skipped")
        self.assertEqual(sheets_keys.status_reason("withdrawn", notes),
                         "skipped: first posted 2026-07-06 - over the 1-month limit")

    def test_user_withdrawal_stays_withdrawn(self):
        self.assertEqual(sheets_keys.sheet_status_for("withdrawn", "took another offer"), "Withdrawn")

    def test_sponsorship_check_gets_a_default_reason(self):
        self.assertIn("sponsorship", sheets_keys.status_reason("sponsorship_check", "check sponsorship"))

    def test_restored_row_shows_its_current_reason_not_the_old_skip(self):
        notes = "check sponsorship; skipped: too old; old posting: first posted 2026-07-06 (109 days ago)"
        reason = sheets_keys.status_reason("sponsorship_check", notes)
        self.assertIn("sponsorship", reason)
        self.assertIn("old posting: first posted 2026-07-06", reason)
        self.assertNotIn("skipped", reason)
        self.assertEqual(sheets_keys.sheet_status_for("sponsorship_check", notes), "Check sponsorship")

    def test_skipped_round_trips_to_withdrawn(self):
        self.assertEqual(sheets_keys.SHEET_TO_TRACKER["skipped"], "withdrawn")


class LocationFromSeenJobs(unittest.TestCase):
    """sponsorship_check rows have no archived posting; their place comes from seen_jobs.json."""

    URL = "https://amazon.jobs/en/jobs/1"
    MULTI = "Madison, WI; Boston, MA; Seattle, WA; Santa Clara, CA"

    def places(self, **entry):
        return sheets_keys.load_places(self.write_seen({"k": {"url": self.URL, **entry}}))

    def write_seen(self, seen):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        path = Path(tmp.name) / "seen_jobs.json"
        path.write_text(json.dumps({"seen": seen}), encoding="utf-8")
        return path

    def test_every_location_of_a_multi_city_posting_is_kept(self):
        row = {"company": "Amazon", "role": "SDE", "source": self.URL}
        self.assertEqual(sheets_keys.place_for(row, self.places(location=self.MULTI)), (self.MULTI, ""))

    def test_match_is_on_url_only_never_company_and_title(self):
        # An imported row with no URL must not borrow another posting's city.
        places = self.places(company="Amazon", title="SDE", location="Seattle, WA")
        self.assertEqual(sheets_keys.place_for({"company": "Amazon", "role": "SDE", "source": ""}, places), ("", ""))

    def test_stored_work_type_wins_over_inference(self):
        row = {"source": self.URL}
        self.assertEqual(sheets_keys.place_for(row, self.places(location="San Francisco, CA", work_type="Hybrid")),
                         ("San Francisco, CA", "Hybrid"))

    def test_legacy_verdict_in_location_is_not_a_place(self):
        self.assertEqual(sheets_keys.place_for({"source": self.URL}, self.places(location="PASS")), ("", ""))

    def test_missing_or_broken_state_file_gives_no_places(self):
        self.assertEqual(sheets_keys.load_places(Path("/nonexistent/seen_jobs.json")), {})
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        bad = Path(tmp.name) / "seen_jobs.json"
        bad.write_text("not json", encoding="utf-8")
        self.assertEqual(sheets_keys.load_places(bad), {})

    def test_work_type_inferred_only_when_every_place_agrees(self):
        infer = sheets_keys.work_type_from_location
        self.assertEqual(infer("Remote in USA"), "Remote")
        self.assertEqual(infer("Remote - Multiple Locations; United States; Canada (Remote)"), "Remote")
        self.assertEqual(infer("Seattle, WA; Remote"), "")  # office or remote: not knowable
        self.assertEqual(infer("New York, NY (Hybrid)"), "Hybrid")
        self.assertEqual(infer("San Jose, CA"), "")
        self.assertEqual(infer(""), "")

    def test_rows_command_emits_location_and_work_type(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        (root / "job_scraper").mkdir()
        (root / "job_scraper" / "seen_jobs.json").write_text(json.dumps(
            {"seen": {"k": {"url": self.URL, "location": self.MULTI}}}), encoding="utf-8")
        tracker = root / "job_search_tracker.csv"
        with tracker.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=sheets_keys.TRACKER_HEADER)
            w.writeheader()
            w.writerow({"date": "2026-10-23", "company": "Amazon", "role": "SDE",
                        "status": "sponsorship_check", "source": self.URL})
            w.writerow({"date": "2026-08-14", "company": "Apple", "role": "SWE", "status": "applied"})
        out = subprocess.run([sys.executable, str(TOOL), "rows", str(tracker)],
                             capture_output=True, text=True, check=True)
        rows = json.loads(out.stdout)
        self.assertEqual((rows[0]["location"], rows[0]["work_type"]), (self.MULTI, ""))
        self.assertEqual((rows[1]["location"], rows[1]["work_type"]), ("", ""))


if __name__ == "__main__":
    unittest.main()
