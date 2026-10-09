"""Exercise the real cancel method with isolated in-memory transport/session doubles."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

import app.service as service_module
from app.answer_stream import AnswerStream
from app.service import DSHService


@pytest.mark.asyncio
async def test_cancel_preserves_prefix_and_orders_terminal_events(monkeypatch):
    db = SimpleNamespace(commit=AsyncMock(), scalar=AsyncMock(return_value=SimpleNamespace(
        event_json={"requestId": "original-turn-request"})))

    class Session:
        async def __aenter__(self): return db
        async def __aexit__(self, *args): pass

    monkeypatch.setattr(service_module, 'SessionLocal', Session)
    old = SimpleNamespace(last_seq=6)
    packets = []

    async def publish(payload):
        old.last_seq += 1
        packets.append((old.last_seq, payload))
        return {'seq': old.last_seq}

    stream = AnswerStream(publish)
    await stream.verified('Verified prefix.\n\n')
    fresh = SimpleNamespace(last_seq=1, runtime_id='test-runtime', status='RUNNING')
    service = object.__new__(DSHService)
    service._turn_tasks = {}
    service._answer_streams = {'test-conversation': (stream, 'en')}
    service.get_owned_conversation = AsyncMock(return_value=fresh)
    lock = asyncio.Lock()
    service.writer_lock_for = lambda _: lock
    service.append_audit = AsyncMock()
    terminal = []

    async def append_event(db, conversation, kind, payload):
        conversation.last_seq += 1
        terminal.append((conversation.last_seq, kind, payload))

    service.append_event = append_event
    await service.cancel(SimpleNamespace(request_id='test-request'), 'test-conversation')
    assert terminal[0][0] > packets[-1][0]
    assert terminal[0][1] == 'assistant.message'
    assert terminal[0][2]['streamStatus'] == 'cancelled'
    assert terminal[0][2]['requestId'] == 'original-turn-request'
    assert terminal[0][2]['content'].startswith('Verified prefix.\n\n')
    assert terminal[0][2]['content'] == ''.join(p['content'] for _, p in packets)
    assert terminal[1][1] == 'turn.cancelled'
    assert terminal[1][2]['requestId'] == 'original-turn-request'
    assert fresh.status == 'READY'
    assert not service._answer_streams


@pytest.mark.asyncio
async def test_unowned_cancel_never_interrupts_task(monkeypatch):
    class Session:
        async def __aenter__(self): return object()
        async def __aexit__(self, *args): pass

    monkeypatch.setattr(service_module, 'SessionLocal', Session)
    task = SimpleNamespace(done=lambda: False, cancel=Mock())
    service = object.__new__(DSHService)
    service._turn_tasks = {'other-conversation': task}
    service.get_owned_conversation = AsyncMock(side_effect=PermissionError('not owned'))
    with pytest.raises(PermissionError):
        await service.cancel(SimpleNamespace(request_id='test'), 'other-conversation')
    task.cancel.assert_not_called()
