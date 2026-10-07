"""Copy one existing audit password between explicitly named runtimes.

Run on the deployment host. Secrets remain in captured subprocess streams and
the root-only rollback file; stdout contains no password or password hash.
This does not create accounts, copy roles, migrate tables, or restart services.
"""

import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile


READ_ACCOUNT = r'''
import asyncio,json,sys
from urllib.parse import urlsplit
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import get_settings
from app.audit_auth import PASSWORD_SCHEME
p=json.load(sys.stdin)
s=get_settings()
assert s.umc_portal == p['portal']
assert urlsplit(s.database_url).path.lstrip('/') == p['database']
async def main():
 e=create_async_engine(s.database_url)
 async with e.connect() as c:
  await c.execute(text('SET TRANSACTION READ ONLY'))
  r=(await c.execute(text('SELECT id,username,password_hash,role,disabled,failed_login_attempts,locked_until,password_changed_at,updated_at FROM audit_operator WHERE username=:u'),{'u':p['username']})).mappings().one()
  assert not r['disabled'] and r['locked_until'] is None
  print(json.dumps({'portal':s.umc_portal,'database':p['database'],'scheme':PASSWORD_SCHEME,'account':dict(r)},default=str))
 await e.dispose()
asyncio.run(main())
'''

UPDATE_ACCOUNT = r'''
import asyncio,json,sys
from datetime import datetime,timezone
from urllib.parse import urlsplit
from sqlalchemy import select,update
from app.config import get_settings
from app.db import engine,SessionLocal,AuditOperator,AuditOperatorSession,AuditOperatorEvent
p=json.load(sys.stdin)
s=get_settings()
assert s.umc_portal == p['portal'] == 'admin'
assert urlsplit(s.database_url).path.lstrip('/') == p['database']
async def main():
 async with SessionLocal() as db:
  async with db.begin():
   a=(await db.execute(select(AuditOperator).where(AuditOperator.username==p['username']).with_for_update())).scalar_one()
   old=p['original']
   assert a.id==old['id'] and a.password_hash==old['password_hash']
   assert a.role==old['role'] and not a.disabled and a.locked_until is None
   now=datetime.now(timezone.utc)
   a.password_hash=p['password_hash']
   a.password_changed_at=now
   a.updated_at=now
   revoked=await db.execute(update(AuditOperatorSession).where(AuditOperatorSession.operator_id==a.id,AuditOperatorSession.revoked_at.is_(None)).values(revoked_at=now))
   db.add(AuditOperatorEvent(target_operator_id=a.id,username=a.username,event_type='password.reset',detail={'source':'customer-audit-existing-credential','reason':'explicit-user-request','role_unchanged':True}))
  print(json.dumps({'updated':True,'username':a.username,'role_unchanged':a.role==old['role'],'revoked_sessions':revoked.rowcount}))
 await engine.dispose()
asyncio.run(main())
'''


def validate_hash(encoded, scheme):
    actual, rounds, salt, digest = encoded.split('$', 3)
    if actual != scheme or actual != 'pbkdf2_sha256':
        raise ValueError('Unsupported password scheme')
    if not 1 <= int(rounds) <= 10_000_000:
        raise ValueError('Invalid iteration count')
    decode = lambda value: base64.urlsafe_b64decode(value + '=' * (-len(value) % 4))
    if len(decode(salt)) < 16 or len(decode(digest)) != 32:
        raise ValueError('Invalid password hash encoding')


def run_container(container, code, payload):
    result = subprocess.run(
        ['docker', 'exec', '-i', container, 'python', '-c', code],
        input=json.dumps(payload), text=True, capture_output=True, check=False,
    )
    if result.returncode:
        # Never print a traceback that might include SQL bind parameters.
        raise RuntimeError(f'Container operation failed: {container}, code {result.returncode}')
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-container', required=True)
    parser.add_argument('--destination-container', required=True)
    parser.add_argument('--source-database', required=True)
    parser.add_argument('--destination-database', required=True)
    parser.add_argument('--username', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    username = args.username.strip().casefold()
    if args.source_container == args.destination_container:
        raise ValueError('Source and destination must differ')
    source_request = {'portal': 'customer', 'database': args.source_database, 'username': username}
    destination_request = {'portal': 'admin', 'database': args.destination_database, 'username': username}
    source = run_container(args.source_container, READ_ACCOUNT, source_request)
    before = run_container(args.destination_container, READ_ACCOUNT, destination_request)
    if source['scheme'] != before['scheme']:
        raise ValueError('Runtime password schemes differ')
    credential = source['account']['password_hash']
    validate_hash(credential, before['scheme'])
    identical = credential == before['account']['password_hash']
    summary = {'username': username, 'same_stored_credential': identical, 'compatible': True, 'applied': False}
    if args.apply and not identical:
        if os.geteuid() != 0:
            raise PermissionError('Apply requires root for private rollback storage')
        folder = Path(tempfile.mkdtemp(prefix='audit-credential-rollback-', dir='/root'))
        backup = folder / 'original-account.json'
        with backup.open('x', encoding='utf-8') as handle:
            os.chmod(backup, 0o600)
            json.dump(before, handle, default=str)
        print(json.dumps({'backup_created': str(backup)}), flush=True)
        update_request = dict(destination_request, original=before['account'], password_hash=credential)
        result = run_container(args.destination_container, UPDATE_ACCOUNT, update_request)
        after = run_container(args.destination_container, READ_ACCOUNT, destination_request)
        final_source = run_container(args.source_container, READ_ACCOUNT, source_request)
        summary.update(result)
        summary.update({
            'applied': True,
            'destination_credential_matches_source': after['account']['password_hash'] == credential,
            'source_unchanged': final_source == source,
            'destination_role_unchanged': after['account']['role'] == before['account']['role'],
            'backup_path': str(backup),
        })
        if not all(summary[key] for key in ('destination_credential_matches_source', 'source_unchanged', 'destination_role_unchanged')):
            raise RuntimeError('Post-write verification failed; protected rollback file retained')
    print(json.dumps(summary))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'error_type': type(error).__name__}))
        raise SystemExit(1)
