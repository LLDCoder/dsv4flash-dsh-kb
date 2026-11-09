import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.service import DSHService


class MessageAcceptanceReplayTests(unittest.IsolatedAsyncioTestCase):
    async def test_duplicate_returns_original_request_not_retry_request(self):
        service=DSHService.__new__(DSHService)
        service._writer_locks={}
        service.get_owned_conversation=AsyncMock(return_value=SimpleNamespace(owner_account=''))
        db=AsyncMock()
        db.execute.side_effect=[
            SimpleNamespace(scalar_one_or_none=lambda:SimpleNamespace(user_event_seq=3)),
            SimpleNamespace(scalar_one_or_none=lambda:SimpleNamespace(event_json={'requestId':'original-request'})),
        ]
        session=AsyncMock()
        session.__aenter__.return_value=db
        principal=SimpleNamespace(audit_account='',request_id='retry-request')
        with patch('app.service.SessionLocal',return_value=session):
            result=await service.submit_message(principal,'owned-conversation','question','same-client-id')
        self.assertTrue(result['duplicate'])
        self.assertFalse(result['accepted'])
        self.assertEqual(result['requestId'],'original-request')
        db.add.assert_not_called()
        db.commit.assert_not_called()


if __name__=='__main__':unittest.main()
