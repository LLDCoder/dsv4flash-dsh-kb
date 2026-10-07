"""Read-only, bounded Reader diagnostics; never prints tokens or full payloads."""
import asyncio
import json
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as conn:
        await conn.execute(text('SET TRANSACTION READ ONLY'))
        rows = (await conn.execute(text("""
            SELECT payload FROM audit_record
            WHERE record_type='reader.evidence'
            ORDER BY id DESC LIMIT 6
        """))).scalars().all()
        for event in rows:
            if isinstance(event, str):
                event = json.loads(event)
            result = event.get('result', event)
            if not isinstance(result, dict):
                result = event
            observation = event.get('observation') or {}
            permission = event.get('permission') or {}
            print(json.dumps({
                'keys': list(event.keys()),
                'stage': event.get('stage'),
                'role': permission.get('currentRole'),
                'page': result.get('page'), 'scope': result.get('scope'),
                'missing': result.get('missing'),
                'tabControls': observation.get('tabControls'),
                'observationKeys': list(observation.keys()),
                'observationsKeys': list((event.get('observations') or {}).keys()) if isinstance(event.get('observations'), dict) else [],
                'operations': [{
                    'operation': c.get('operationKey'), 'status': c.get('status'),
                    'topKeys': list((c.get('responseEvidence') or {}).keys())[:8],
                } for c in (observation.get('apiDiscovery') or {}).get('candidates', [])
                if isinstance(c.get('responseEvidence'), dict)],
                'rootCause': event.get('rootCause'),
            }, ensure_ascii=False))
    await engine.dispose()


asyncio.run(main())
