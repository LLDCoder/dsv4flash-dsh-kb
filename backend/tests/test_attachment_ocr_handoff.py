import unittest
import inspect

from app.service import DSHService


class AttachmentOcrHandoffTests(unittest.TestCase):
    def test_reference_hints_keep_only_identifiers(self):
        result = {
            "result": {
                "text": "Customer Daisy Wang submitted refund MC-2-1102-3953893 for AED 500.",
            }
        }
        hints = DSHService.attachment_ocr_reference_hints(result)
        self.assertIn("MC-2-1102-3953893", hints)
        self.assertNotIn("Daisy Wang", " ".join(hints))

    def test_handoff_text_combines_user_intent_with_safe_references(self):
        result = {"result": {"text": "Refund No: MC-2-1102-3953893"}}
        text = DSHService.attachment_ocr_handoff_text("Show this refund status", result)
        self.assertIn("Show this refund status", text)
        self.assertIn("MC-2-1102-3953893", text)

    def test_write_or_confirmation_tools_are_not_eligible(self):
        self.assertTrue(DSHService.is_read_only_tool_definition({"sideEffect": "read", "confirmationRequired": False}))
        self.assertFalse(DSHService.is_read_only_tool_definition({"sideEffect": "write", "confirmationRequired": True}))

    def test_explicit_business_words_select_published_read_only_domains(self):
        catalog = [
            {"skillId": "refund_status"},
            {"skillId": "complaints_status"},
            {"skillId": "application_status"},
            {"skillId": "profile_status"},
        ]
        self.assertEqual(DSHService.attachment_ocr_explicit_skill("Show this refund status", catalog), "refund_status")
        self.assertEqual(DSHService.attachment_ocr_explicit_skill("Show this complaint status", catalog), "complaints_status")
        self.assertEqual(DSHService.attachment_ocr_explicit_skill("Show this application status", catalog), "application_status")
        self.assertEqual(DSHService.attachment_ocr_explicit_skill("Show this profile status", catalog), "profile_status")

    def test_ocr_audit_event_never_keeps_document_text(self):
        result = {
            "ok": True,
            "toolName": "ocr.layout_parsing",
            "result": {
                "text": "Daisy Wang passport 123456 refund MC-2-1102-3953893",
                "pages": [{"raw": "same sensitive OCR text"}],
            },
        }
        event = DSHService.attachment_ocr_event_result(result)
        self.assertTrue(event["ocrProcessedLocally"])
        self.assertIn("MC-2-1102-3953893", event["referenceHints"])
        self.assertNotIn("Daisy Wang", str(event))
        self.assertNotIn("passport", str(event).casefold())

    def test_local_response_excludes_ocr_text_and_formats_read_only_result(self):
        ocr = {"ok": True, "result": {"text": "Daisy Wang refund MC-2-1102-3953893"}}
        business = {
            "ok": True,
            "result": {
                "applicationNo": "MC-2-1102-3953893",
                "status": "Under Processing",
                "attachmentText": "must not be shown",
                "token": "must not be shown",
            },
        }
        response = DSHService.attachment_ocr_local_response(
            response_language="en",
            ocr_result=ocr,
            handoff_skill_id="refund_status",
            handoff_result=business,
        )
        self.assertIn("MC-2-1102-3953893", response)
        self.assertIn("Under Processing", response)
        self.assertNotIn("Daisy Wang", response)
        self.assertNotIn("must not be shown", response)
        self.assertIn("No document text was sent to any external language model", response)

    def test_attachment_turn_does_not_append_ocr_evidence_to_llm_messages(self):
        source = inspect.getsource(DSHService._run_turn)
        start = source.index('if latest_attachment and tool_result.get("ok") and latest_content.strip():')
        end = source.index("if forced_response_message:", start)
        attachment_block = source[start:end]
        self.assertNotIn("messages.append", attachment_block)
        self.assertNotIn("self.llm", attachment_block)
        self.assertIn("attachment_ocr_local_response", attachment_block)


if __name__ == "__main__":
    unittest.main()
