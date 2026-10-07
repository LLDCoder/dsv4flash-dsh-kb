"""Read-only shape diagnostic for the last observed application queue."""
import asyncio
import json
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as conn:
        await conn.execute(text('SET TRANSACTION READ ONLY'))
        events = (await conn.execute(text("SELECT payload FROM audit_record WHERE record_type='reader.evidence' ORDER BY id DESC LIMIT 8"))).scalars().all()
        for event in events:
            if isinstance(event, str):
                event = json.loads(event)
            for c in (event.get('observation', {}).get('apiDiscovery', {}).get('candidates') or []):
                if c.get('operationKey') != 'POST /api/Content/MyTodoPage':
                    continue
                payload = c.get('responseEvidence', {}).get('data') or {}
                print(json.dumps({'stage': event.get('stage'), 'plan': event.get('plan'),
                    'collectionContext': c.get('collectionContext'),
                    'keys': list(payload), 'statusCount': payload.get('statusCount'),
                    'rows': [{k: v for k, v in row.items() if k in ('applicationNumber','taskId','status','statusId')}
                             for row in (payload.get('page') or {}).get('items', [])[:3]]}, ensure_ascii=False))
                await engine.dispose()
                return
    await engine.dispose()


asyncio.run(main())
