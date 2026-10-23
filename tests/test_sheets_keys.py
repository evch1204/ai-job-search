"""tools/sheets_keys.py: the Google Sheet's status and Reason columns."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
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


if __name__ == "__main__":
    unittest.main()
