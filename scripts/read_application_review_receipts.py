"""Read-only acceptance receipts; omit credentials and internal task IDs."""
import asyncio
import json
import os
from collections import Counter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as conn:
        await conn.execute(text('SET TRANSACTION READ ONLY'))
        events = (await conn.execute(text("SELECT payload FROM audit_record WHERE record_type='reader.evidence' ORDER BY id DESC LIMIT 12"))).scalars().all()
        for event in events:
            if isinstance(event, str):
                event = json.loads(event)
            if event.get('stage') != 'application_review_collection':
                continue
            receipt = event.get('collection') or {}
            print(json.dumps({'stage': event['stage'], 'page': event.get('result', {}).get('page'),
                'result': event.get('result', {}).get('result'),
                'receipt': {key: receipt.get(key) for key in ('completeness','stablePasses','total','rowCount',
                    'pagesRead','startedAt','finishedAt','operationRef','comparison')},
                'statusCounts': dict(Counter(row.get('status') for row in receipt.get('rows') or [])),
                'publicRows': [{key: row.get(key) for key in ('applicationNumber','status')}
                               for row in receipt.get('rows') or []]}, ensure_ascii=False))
            break
    await engine.dispose()


asyncio.run(main())
