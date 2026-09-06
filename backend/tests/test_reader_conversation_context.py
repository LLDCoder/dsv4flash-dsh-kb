import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app.config import Settings
from app.llm import LLMAdapter
from app.portal_reader import reader_answer_shape
from app.service import _reader_conversation_context


def event(seq: int, event_type: str, payload: dict[str, object]):
    return SimpleNamespace(seq=seq, event_type=event_type, event_json=payload)


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("Give me a task overview", "overview"),
        ("Show me my tasks?", "overview"),
        ("显示我的任务", "overview"),
        ("How many tasks are there?", "count"),
        ("List the tasks", "list"),
        ("What needs my attention?", "attention"),
        ("Which tasks are overdue?", "due"),
        ("Show details for this task", "detail"),
        ("How about enquiries?", "unspecified"),
    ],
)
def test_answer_shape_is_generic_and_preserves_elliptical_follow_ups(question: str, expected: str) -> None:
    assert reader_answer_shape(question) == expected


def test_conversation_context_keeps_previous_shape_category_and_reader_location() -> None:
    previous_user = event(1, "user.message", {"content": "Show my service application tasks list"})
    previous_result = event(
        2,
        "reader.result",
        {
            "result": "success",
            "page": "/work/items",
            "section": "Assigned work",
            "scope": "personal",
            "workflowState": "Open",
            "facts": ["must not enter follow-up context"],
        },
    )
    current_user = event(4, "user.message", {"content": "How about enquiries?"})

    context = _reader_conversation_context(
        [previous_user, previous_result, event(3, "assistant.message", {"content": "answer"}), current_user],
        current_user,
    )

    assert context == {
        "previousIntent": {
            "question": "Show my service application tasks list",
            "answerShape": "list",
            "category": "service application",
            "resultStatus": "success",
            "page": "/work/items",
            "section": "Assigned work",
            "scope": "personal",
            "workflowState": "Open",
        }
    }


def test_conversation_context_is_empty_without_a_previous_user_turn() -> None:
    current_user = event(1, "user.message", {"content": "Show my tasks"})

    assert _reader_conversation_context([current_user], current_user) == {}


def test_conversation_context_redacts_credentials_and_does_not_copy_facts() -> None:
    previous_user = event(1, "user.message", {"content": "List tasks; access_token=secret-value"})
    previous_result = event(2, "reader.result", {"result": "success", "facts": ["private row"]})
    current_user = event(3, "user.message", {"content": "What about the next page?"})

    context = _reader_conversation_context([previous_user, previous_result, current_user], current_user)

    assert "secret-value" not in json.dumps(context)
    assert context["previousIntent"]["question"] == "List tasks; access_token=[redacted]"
    assert "facts" not in context["previousIntent"]


def test_planner_receives_bounded_conversation_context(monkeypatch) -> None:
    captured: dict[str, object] = {}
    original_client = httpx.AsyncClient

    async def handler(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": '{"mode":"portal_read","portalRequest":{}}'}}]},
        )

    def client_factory(**kwargs):
        return original_client(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", client_factory)
    adapter = LLMAdapter(
        Settings(_env_file=None, llm_base_url="https://llm.example.test", llm_api_key="test-key")
    )
    context = {
        "previousIntent": {
            "question": "List my tasks",
            "answerShape": "list",
            "category": "",
            "resultStatus": "success",
            "page": "/work/items",
            "section": "Assigned work",
            "scope": "personal",
            "workflowState": "",
        }
    }

    asyncio.run(adapter.plan_admin_portal_read("How about enquiries?", {}, {}, context))

    messages = captured["messages"]
    planner_input = json.loads(messages[1]["content"])
    assert planner_input["conversationContext"] == context
    assert "untrusted user-conversation metadata" in messages[0]["content"]
    assert "explicit wording in the current question always wins" in messages[0]["content"]
