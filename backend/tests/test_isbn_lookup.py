import unittest

from app.customer_record_listing import isbn_lookup_answer
from app.customer_answer_stream import customer_generated_answer
from app.answer_stream import AnswerStream


class ISBNLookupTests(unittest.IsolatedAsyncioTestCase):
    isbn = "9781302000011"
    rows = [
        {"isbn": isbn, "title": "Sample A | A", "authorName": "Author",
         "versionNumber": 1, "printYear": 2025, "language": ["الإنجليزية"],
         "subjectCategory": "أدب", "subjectSubCategory": "شعر",
         "nationalDepositoryNo": "DEPOSIT-1", "privateField": "SECRET"},
        {"isbn": isbn, "title": "Sample A | A", "authorName": "Author",
         "versionNumber": 2, "printYear": 2026, "language": ["الإنجليزية"],
         "subjectCategory": "أدب", "subjectSubCategory": "شعر"},
    ]

    async def test_verified_mixed_language_records_remain_complete(self):
        blocks = []
        async def publish(event):
            blocks.append(event)

        class MixedDraft:
            async def stream(self, *args, **kwargs):
                yield "Two records matched.\n\n"
                yield "Subject category: أدب"
        _, _, prior_status = await customer_generated_answer(AnswerStream(publish), MixedDraft(), [], "en")
        self.assertEqual(prior_status, "partial")

        blocks.clear()
        result = {"ok": True, "result": {"isSuccess": True, "data": self.rows}}
        text = isbn_lookup_answer(self.isbn, result, "en")
        stream = AnswerStream(publish)
        self.assertEqual(await stream.verified(text), text)
        self.assertEqual("".join(block["content"] for block in blocks), text)
        self.assertEqual(stream.status, "complete")
        self.assertIn("Matching records: 2", text)
        self.assertEqual(text.count("| Title | Sample A \\| A |"), 2)
        self.assertIn("| Version | 1 |", text)
        self.assertIn("| Version | 2 |", text)
        self.assertIn("| Language | الإنجليزية |", text)
        self.assertIn("| National deposit number | Not available |", text)
        self.assertNotIn("SECRET", text)
        self.assertIn("السجل 2", isbn_lookup_answer(self.isbn, result, "ar"))

    def test_distinguishes_empty_and_failed_reads(self):
        self.assertIn("no matching records", isbn_lookup_answer(self.isbn, {"ok": True, "result": {"isSuccess": True, "data": []}}, "en"))
        for result in (
            {"ok": False},
            {"ok": True, "result": {"isSuccess": False, "data": []}},
            {"ok": True, "result": {"isSuccess": True, "data": [{}]}},
        ):
            self.assertIn("couldn’t verify", isbn_lookup_answer(self.isbn, result, "en"))
