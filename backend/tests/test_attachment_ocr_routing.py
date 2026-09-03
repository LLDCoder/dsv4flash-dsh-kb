import unittest

from app.service import DSHService


class AttachmentOcrRoutingTests(unittest.TestCase):
    def test_valid_uploaded_attachment_forces_locked_document_ocr(self):
        route = DSHService.attachment_ocr_route(
            {
                "fileRef": "uploads/customer-document.pdf",
                "fileName": "customer-document.pdf",
                "mimeType": "application/pdf",
                "fileType": 0,
            }
        )
        self.assertIsNotNone(route)
        self.assertEqual(route.skill_id, "document_ocr")
        self.assertEqual(route.category, "api_call")
        self.assertTrue(route.routing_locked)

    def test_missing_or_invalid_attachment_does_not_force_ocr(self):
        self.assertIsNone(DSHService.attachment_ocr_route(None))
        self.assertIsNone(DSHService.attachment_ocr_route({"fileRef": "  "}))


if __name__ == "__main__":
    unittest.main()
