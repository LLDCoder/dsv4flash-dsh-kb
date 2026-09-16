import json
import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.service import DSHService


class LicenseEvidenceTests(unittest.TestCase):
    def test_customer_visible_document_fields_survive_evidence_masking(self):
        evidence = json.loads(
            DSHService.answer_tool_evidence(
                "umc.licenses.list",
                {
                    "ok": True,
                    "code": "ok",
                    "toolName": "umc.licenses.list",
                    "result": {
                        "data": {
                            "items": [
                                {
                                    "documentId": "DOC-42",
                                    "documentName": "Media License",
                                    "documentStatus": "Generated",
                                    "showLicenseNumber": "7777777",
                                    "documentContent": "raw private document text",
                                    "documentBase64": "sensitive bytes",
                                    "accessToken": "secret-token",
                                    "emailAddress": "private@example.test",
                                }
                            ],
                            "total": 1,
                        }
                    },
                },
                "default",
            )
        )
        item = evidence["result"]["data"]["items"][0]
        self.assertEqual(item["documentId"], "DOC-42")
        self.assertEqual(item["documentName"], "Media License")
        self.assertEqual(item["documentStatus"], "Generated")
        self.assertEqual(item["showLicenseNumber"], "7777777")
        self.assertNotIn("documentContent", item)
        self.assertNotIn("documentBase64", item)
        self.assertNotIn("accessToken", item)
        self.assertNotIn("emailAddress", item)


if __name__ == "__main__":
    unittest.main()
