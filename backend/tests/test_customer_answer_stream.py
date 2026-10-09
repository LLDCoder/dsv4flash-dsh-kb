import asyncio
from unittest.mock import AsyncMock

import pytest

from app.answer_stream import AnswerStream, cancelled_stream_notice
from app.customer_answer_stream import customer_generated_answer
from app.service import DSHService


class Model:
    def __init__(self, drafts):
        self.drafts = iter(drafts)
        self.calls = 0

    async def stream(self, messages, on_reasoning):
        self.calls += 1
        for token in next(self.drafts):
            if isinstance(token, Exception):
                raise token
            yield token


@pytest.mark.asyncio
@pytest.mark.parametrize('language,text', [('en', 'Verified guidance.\n\nNext step.'), ('ar', 'إرشادات موثوقة.\n\nالخطوة التالية.')])
async def test_generation_streams_before_model_finishes(language, text):
    packets = []

    async def publish(payload):
        packets.append(payload)

    class LiveModel:
        async def stream(self, messages, on_reasoning):
            yield text.split('\n\n')[0] + '\n\n'
            assert len(packets) == 1  # Before generation of the next paragraph.
            yield text.split('\n\n')[1]

    stream = AnswerStream(publish)
    content, _, status = await customer_generated_answer(stream, LiveModel(), [], language)
    assert content == ''.join(p['content'] for p in packets) == text
    assert status == 'complete'
    assert all(p['streamMode'] == 'guarded_generation' for p in packets)


@pytest.mark.asyncio
async def test_private_invalid_language_can_retry_without_disclosure():
    publish = AsyncMock()
    stream = AnswerStream(publish)
    content, _, status = await customer_generated_answer(stream, Model([['خطأ'], ['Verified answer.']]), [], 'en')
    assert content == 'Verified answer.'
    assert status == 'complete'
    assert len(publish.await_args_list) == 1


@pytest.mark.asyncio
async def test_failure_after_public_prefix_is_partial_not_rewritten():
    publish = AsyncMock()
    stream = AnswerStream(publish)
    model = Model([['Verified text.\n\n', RuntimeError('transport stopped')]])
    content, _, status = await customer_generated_answer(stream, model, [], 'en')
    assert status == stream.status == 'partial'
    assert model.calls == 1
    assert content.startswith('Verified text.\n\n')
    assert 'incomplete' in content
    assert ''.join(a.args[0]['content'] for a in publish.await_args_list) == content


@pytest.mark.asyncio
async def test_tool_protocol_is_never_published():
    publish = AsyncMock()
    stream = AnswerStream(publish)
    model = Model([['Visible prefix {"tool":"hidden","args":{}}'], ['Plain answer.']])
    content, _, status = await customer_generated_answer(stream, model, [], 'en')
    assert content == 'Plain answer.'
    assert status == 'complete'
    assert 'hidden' not in ''.join(a.args[0]['content'] for a in publish.await_args_list)


@pytest.mark.asyncio
async def test_internal_ids_sanitized_before_first_public_block():
    publish = AsyncMock()
    stream = AnswerStream(publish)
    content, _, status = await customer_generated_answer(
        stream, Model([['Check [detail](/my-requests/detail?id=42).\n\n', 'Next step.']]), [], 'en',
        sanitize=lambda text: DSHService.sanitize_customer_answer(text, 'en'),
    )
    assert status == 'complete'
    assert '?id=' not in content
    assert content == ''.join(a.args[0]['content'] for a in publish.await_args_list)
    assert '\n\nNext step.' in content


@pytest.mark.asyncio
async def test_cancellation_does_not_flush_private_tokens():
    publish = AsyncMock()
    stream = AnswerStream(publish)

    class CancelledModel:
        async def stream(self, messages, on_reasoning):
            yield 'Unfinished private fragment'
            raise asyncio.CancelledError()

    with pytest.raises(asyncio.CancelledError):
        await customer_generated_answer(stream, CancelledModel(), [], 'en')
    publish.assert_not_awaited()


@pytest.mark.asyncio
async def test_failed_draft_is_not_complete_business_answer():
    stream = AnswerStream(AsyncMock())
    _, _, status = await customer_generated_answer(stream, Model([['خطأ'], ['خطأ']]), [], 'en')
    assert status == stream.status == 'failed'


def test_stop_notice_is_localized():
    assert 'partial' in cancelled_stream_notice('en')
    assert 'جزئي' in cancelled_stream_notice('ar')
