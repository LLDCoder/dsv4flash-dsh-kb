"""Regression checks for licence pagination and exact Finance application reads."""

import json
import unittest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.portal_reader import (
    _application_numbers,
    _finance_application_result,
    _finance_application_rows,
    _license_expiry_window,
    _license_expiry_window_result,
    _license_module_focus,
)
from app.service import reader_evidence_only_response


def observed_rows(operation, rows):
    return {"apiDiscovery": {"candidates": [{
        "operationKey": operation, "status": 200,
        "responseEvidence": {"data": {"pageIndex": 1, "pageSize": 10,
                                      "total": len(rows), "items": rows}},
    }]}}


class AdminReader194143Tests(unittest.TestCase):
    def test_license_window_uses_dates_across_pages_not_expire_soon_status(self):
        today = datetime.now(ZoneInfo("Asia/Dubai")).date()
        page1 = observed_rows("POST /api/LicenseManagement/list", [
            {"licenseNumber": "L-1", "applicationNumber": "A-1", "status": "201",
             "expirationTime": (today + timedelta(days=10)).isoformat()},
            {"licenseNumber": "L-2", "status": "205",
             "expirationTime": (today + timedelta(days=45)).isoformat()},
        ])
        page1["sectionSummaries"] = [{"nodeId": "license-list", "kind": "table", "columnHeaders": ["License No.", "Status"],
                                      "rowFields": [{"License No.": "L-1", "Status": "Active"},
                                                    {"License No.": "L-2", "Status": "Expire Soon"}]}]
        page2 = observed_rows("POST /api/LicenseManagement/list", [
            {"licenseNumber": "L-3", "status": "Active",
             "expirationTime": (today + timedelta(days=30)).isoformat()},
        ])
        result = _license_expiry_window_result(
            (page1, page2), question="Which licenses will expire within 30 days?",
            page_count=2, total_rows=3, complete=True, scope="team",
        )
        facts = " ".join(result.facts)
        self.assertEqual(_license_expiry_window("Which licenses will expire within 30 days?"), 30)
        self.assertEqual(_license_expiry_window("ما هي التراخيص التي ستنتهي خلال 30 يومًا؟"), 30)
        self.assertEqual(_license_module_focus("ما هي التراخيص التي ستنتهي خلال 30 يومًا؟"), "expiry")
        self.assertIn("L-1", facts)
        self.assertIn("L-3", facts)
        self.assertNotIn("L-2", facts)
        self.assertIn('"Status":"Active"', facts)
        self.assertNotIn('"Status":"201"', facts)
        self.assertEqual(result.completeness, "complete")

    def test_license_number_prefers_the_page_display_number_over_internal_number(self):
        expiry = (datetime.now(ZoneInfo("Asia/Dubai")).date() + timedelta(days=15)).isoformat()
        observation = observed_rows("POST /api/LicenseManagement/list", [
            {"licenseNumber": "1277614", "showLicenseNumber": "0102995",
             "applicationNumber": "ML-1-1801-3094923", "licenseType": "Press Card",
             "expirationTime": expiry, "status": "201"},
        ])
        observation["sectionSummaries"] = [{
            "nodeId": "license-list", "kind": "table",
            "columnHeaders": ["License No.", "Application No.", "Status", "Expiry Date"],
            "rowFields": [{"License No.": "0102995", "Application No.": "ML-1-1801-3094923",
                           "Status": "Active", "Expiry Date": expiry}],
        }]
        result = _license_expiry_window_result(
            (observation,), question="Which licenses will expire within 30 days?",
            page_count=1, total_rows=1, complete=True, scope="team",
        )
        facts = " ".join(result.facts)
        self.assertIn('"License No.":"0102995"', facts)
        self.assertNotIn('"License No.":"1277614"', facts)

    def test_finance_exact_reference_is_not_an_unrelated_transaction(self):
        observation = observed_rows("GET /api/admin/finance/transactions", [
            {"referenceNumber": "ML-2-804-9226243", "transactionNo": "T-1",
             "statusObj": {"nameEn": "Completed"}},
            {"referenceNumber": "OTHER", "transactionNo": "T-2"},
        ])
        matches = _finance_application_rows(observation, "ML-2-804-9226243")
        self.assertEqual([row["transactionNo"] for row in matches], ["T-1"])
        question = "What is the licensing status, payment status, and complaint status for ML-2-804-9226243?"
        result = _finance_application_result(
            {"ML-2-804-9226243": matches}, question=question, scope="team", complete=True,
        )
        rendered = reader_evidence_only_response(result.public_json(), "en", question=question)
        self.assertIn("Completed", rendered)
        self.assertIn("does not prove license approval", rendered)
        self.assertIn("does not show the complaint status", rendered)
        self.assertNotIn("T-2", rendered)
        arabic = _finance_application_result(
            {"ML-2-804-9226243": matches},
            question="ما حالة الترخيص والدفع والشكوى للطلب ML-2-804-9226243؟",
            scope="team", complete=True,
        )
        self.assertIn("حالة الشكوى", " ".join(arabic.facts))

    def test_two_applications_keep_distinct_transactions(self):
        ids = _application_numbers(
            "What are the statuses and business types of ML-2-804-9226243 and ML-2-804-0460740?"
        )
        self.assertEqual(len(ids), 2)
        self.assertEqual(_application_numbers(
            "ما حالتا ونوعا العمل للطلبين ML-2-804-9226243 وML-2-804-0460740؟"
        ), ids)
        found = {
            ids[0]: ({"referenceNumber": ids[0], "transactionNo": "T-1",
                      "statusObj": {"nameEn": "Completed"}},),
            ids[1]: ({"referenceNumber": ids[1], "transactionNo": "T-2",
                      "statusObj": {"nameEn": "Completed"}},),
        }
        result = _finance_application_result(
            found, question="What are the statuses and business types of " + " and ".join(ids) + "?",
            scope="team", complete=True,
        )
        records = [json.loads(fact) for fact in result.facts if fact.startswith("{")]
        self.assertEqual([record["Transaction No."] for record in records], ["T-1", "T-2"])
        self.assertIn("not the license business type", " ".join(result.facts))
        self.assertIn("does not show the license status", " ".join(result.facts))
        arabic = _finance_application_result(
            found, question="ما حالتا ونوعا العمل للطلبين " + " و".join(ids) + "؟",
            scope="team", complete=True,
        )
        self.assertIn("حالة الترخيص", " ".join(arabic.facts))
        self.assertIn("نوع عمل الترخيص غير متاح", " ".join(arabic.facts))


if __name__ == "__main__":
    unittest.main()
