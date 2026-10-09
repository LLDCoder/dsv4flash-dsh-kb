import asyncio
import json
from types import SimpleNamespace

from app.answer_stream import AnswerStream
from app.service import DSHService


def test_live_capability_answer_preserves_scope_before_model_finishes():
    async def run():
        events = []
        async def publish(value): events.append(value)
        stream = AnswerStream(publish)
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(llm_base_url="https://model.invalid", llm_api_key="fixture", system_prompt="")
        class Model:
            async def stream(self, messages):
                yield "I provide read-only help for your signed-in account; each page's permission is checked.\n\n"
                assert len(events) == 1 and events[0]["streamMode"] == "guarded_generation"
                yield "I can explain the current Dashboard view."
        service.llm = Model()
        answer, failed, strategy = await service._natural_reader_response(
            "What can you do for me?", {"result": "success", "presentationMode": "verified_profile",
                "facts": ["Read-only capability for the signed-in account; Dashboard permission checked per page."],
                "missing": []}, "en", answer_stream=stream)
        assert not failed and strategy == "guarded_stream_organized"
        assert answer == "".join(item["content"] for item in events)
    asyncio.run(run())


def test_identity_lookup_remains_deterministic_in_live_stream():
    async def run():
        service = object.__new__(DSHService)
        async def publish(value): raise AssertionError("Identity must not call the prose model")
        answer, failed, strategy = await service._natural_reader_response(
            "What is my current role?", {"result": "success", "presentationMode": "verified_profile",
                "facts": ["Business role: Inspector."], "missing": []},
            "en", answer_stream=AnswerStream(publish))
        assert not failed and strategy == "deterministic_verified_profile"
        assert "Inspector" in answer
    asyncio.run(run())


def test_capability_draft_without_read_only_permission_boundary_stays_private():
    async def run():
        events = []
        async def publish(value): events.append(value)
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(llm_base_url="https://model.invalid", llm_api_key="fixture", system_prompt="")
        class Model:
            async def stream(self, messages):
                yield "I can read every Dashboard record.\n\n"
        service.llm = Model()
        answer, failed, strategy = await service._natural_reader_response(
            "What can you do for me?", {"result": "success", "presentationMode": "verified_profile",
                "facts": ["Read-only capability for the signed-in account; each page requires permission."],
                "missing": []}, "en", answer_stream=AnswerStream(publish))
        assert not events and failed and strategy == "deterministic_formatting_fallback"
        assert "every Dashboard" not in answer
    asyncio.run(run())


def test_ordinary_live_answer_streams_before_model_finishes_with_card_default_off():
    async def run():
        events = []
        async def publish(value): events.append(value)
        stream = AnswerStream(publish)
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(llm_base_url="https://model.invalid", llm_api_key="fixture", system_prompt="")
        class Model:
            async def stream(self, messages):
                yield "There are 2 active licenses in the current view.\n\n"
                assert len(events) == 1
                assert events[0]["streamMode"] == "guarded_generation"
                yield "These values describe the current Licenses page."
        service.llm = Model()
        answer, failed, strategy = await service._natural_reader_response(
            "Summarize the license statuses", {"result": "success", "answerShape": "count",
                "facts": [json.dumps({"Active": 2})], "missing": []},
            "en", answer_stream=stream)
        assert not failed and strategy == "guarded_stream_organized"
        assert answer == "".join(item["content"] for item in events)
    asyncio.run(run())


def test_bounded_live_list_publishes_scope_then_generated_paragraphs_before_eos():
    async def run():
        events = []
        async def publish(value): events.append(value)
        stream = AnswerStream(publish)
        service = object.__new__(DSHService)
        service.settings = SimpleNamespace(llm_base_url="https://model.invalid", llm_api_key="fixture", system_prompt="")
        class Model:
            async def stream(self, messages):
                assert len(events) == 1 and events[0]["streamMode"] == "verified_projection"
                assert "not the complete queue" in events[0]["content"]
                yield "The visible license is Active.\n\n"
                assert len(events) == 2 and events[1]["streamMode"] == "guarded_generation"
                yield "Read the current Licenses page for this account."
        service.llm = Model()
        answer, failed, strategy = await service._natural_reader_response(
            "Show the visible licenses", {"result": "success", "page": "/licensing/licenses",
                "answerShape": "list", "completeness": "bounded",
                "facts": [json.dumps({"Status": "Active"})], "missing": []},
            "en", answer_stream=stream)
        assert not failed and strategy == "guarded_stream_organized"
        assert answer == "".join(item["content"] for item in events)
        assert "not the complete queue" in answer
    asyncio.run(run())


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
