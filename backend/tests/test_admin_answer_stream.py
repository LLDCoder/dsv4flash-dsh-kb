import asyncio
import json
from types import SimpleNamespace

from app.answer_stream import AnswerStream
from app.service import DSHService


def test_admin_model_stream_uses_existing_fact_guard_and_keeps_partial_receipt():
    async def run():
        events = []
        async def publish(value): events.append(value)
        stream = AnswerStream(publish)
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(llm_base_url="https://model.invalid", llm_api_key="fixture", system_prompt="")
        class Model:
            async def stream(self, messages):
                yield "Current records.\n\n"
                assert len(events) == 1
                yield "Unverified total: 987654321."
        service.llm = Model()
        answer, failed, strategy = await service._natural_reader_response(
            "Show the current records", {"result": "success", "presentationMode": "llm_localized",
                "facts": [json.dumps({"Name": "Sample", "Count": 2})], "missing": []},
            "en", answer_stream=stream)
        assert failed and strategy == "guarded_stream_incomplete"
        assert "987654321" not in answer and "987654321" not in str(events)
        assert answer.startswith(stream.content) and "partial" in answer
        await stream.verified(answer)
        assert "".join(item["content"] for item in events) == answer
    asyncio.run(run())


def test_admin_arabic_generation_rejects_english_prose_before_publication():
    async def run():
        events = []
        async def publish(value): events.append(value)
        stream = AnswerStream(publish)
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(llm_base_url="https://model.invalid", llm_api_key="fixture", system_prompt="")
        class Model:
            async def stream(self, messages):
                yield "The current task is available.\n\n"
        service.llm = Model()
        answer, failed, strategy = await service._natural_reader_response(
            "اعرض السجلات", {"result": "success", "presentationMode": "llm_localized",
                "facts": [json.dumps({"Count": 2})], "missing": []}, "ar", answer_stream=stream)
        assert not events and failed and strategy == "deterministic_formatting_fallback"
        assert "The current task" not in answer
    asyncio.run(run())
