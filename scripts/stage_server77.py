"""Run on authorized server 77. New isolated Admin DSH test stack only.

No customer containers, shared database, production mounts or entry routes are
changed. Private runtime config is generated on the server with mode 0600.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

ROOT=Path(__file__).resolve().parents[1]
PREFIX='admin77-parallel-20261016'
NETWORK='dsh-admin-service_default'
PRIVATE=ROOT/'private-stage'
PRIVATE.mkdir(mode=0o700,exist_ok=True)


def sh(args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(sh(['docker','inspect',name]))[0]
def env_of(d):return dict(s.split('=',1) for s in d['Config']['Env'] if '=' in s)
def env_file(name,env):
    p=PRIVATE/(name+'.env');p.write_text('\n'.join(k+'='+str(v).replace('\n',' ') for k,v in env.items())+'\n');p.chmod(0o600);return str(p)
def run(name,image,env=None,mounts=(),cmd=(),ports=(),extra=()):
    # Idempotency never removes or replaces a previously running version.
    try:
        old=inspect(name)
        return old['Id']
    except subprocess.CalledProcessError:pass
    args=['docker','run','-d','--name',name,'--network',NETWORK,'--restart','unless-stopped']
    if env:args+=['--env-file',env_file(name,env)]
    for a,b in mounts:args+=['-v',str(a)+':'+b+':ro']
    for value in ports:args+=['-p',value]
    args+=list(extra)+[image]+list(cmd)
    return sh(args).strip()

backend=inspect('dsh-admin-service-backend-1')
platform=inspect('dsh-admin-service-platform-gateway-1')
knowledge=inspect('dsh-admin-service-knowledge-gateway-1')
before={x:inspect(x)['Id'] for x in ['dsh-admin-service-backend-1','dsh-admin-service-platform-gateway-1',
    'dsh-admin-service-knowledge-gateway-1','umc-admin-gateway','umc-admin-portal']}
# Copy only current DSH model/read configuration, without printing credentials.
program='''
import asyncio,json
from app.db import SessionLocal,ConfigEntry
from sqlalchemy import select
async def main():
 async with SessionLocal() as s:
  rows=(await s.execute(select(ConfigEntry).where(ConfigEntry.scope=='system'))).scalars().all()
  allowed={'llm_base_url','llm_api_key','llm_model','llm_timeout_seconds','knowledge_default_folder_id',
   'knowledge_top_k','knowledge_timeout_seconds','knowledge_retry_attempts','platform_timeout_seconds',
   'umc_admin_base_url','reader_total_timeout_seconds','system_prompt'}
  print(json.dumps({x.key:(x.value.get('value') if isinstance(x.value,dict) and set(x.value)=={'value'} else x.value) for x in rows if x.key in allowed}))
asyncio.run(main())
'''
config=json.loads(sh(['docker','exec','dsh-admin-service-backend-1','python','-c',program]))
pgname=PREFIX+'-postgres'
password=secrets.token_urlsafe(24)
pg_env={'POSTGRES_USER':'parallel_test','POSTGRES_PASSWORD':password,'POSTGRES_DB':'admin_parallel_test'}
pgid=run(pgname,inspect('dsh-admin-service-postgres-1')['Image'],pg_env,extra=['--tmpfs','/var/lib/postgresql/data:rw,size=256m'])
# Existing env files are used after an interrupted run, preserving its DB identity.
if (PRIVATE/(pgname+'.env')).exists():
    saved=dict(s.split('=',1) for s in (PRIVATE/(pgname+'.env')).read_text().splitlines() if '=' in s)
    password=saved['POSTGRES_PASSWORD']
for _ in range(30):
    try:sh(['docker','exec',pgname,'pg_isready','-U','parallel_test','-d','admin_parallel_test']);break
    except subprocess.CalledProcessError:time.sleep(.5)
else:raise RuntimeError('isolated_postgres_not_ready')
pname=PREFIX+'-platform'
pid=run(pname,platform['Image'],env_of(platform),
        mounts=[(ROOT/'platform-gateway/app.py','/app/app.py'),(ROOT/'platform-gateway/timing.py','/app/timing.py'),
                (ROOT/'reader-network-policy.production.json','/app/config/reader-network-policy.json')])
kname=PREFIX+'-knowledge'
# The knowledge image was removed from the store. Reuse the preserved Python
# backend image's identical FastAPI/httpx dependencies, not a production export.
kid=run(kname,backend['Image'],env_of(knowledge),
        mounts=[(ROOT/'knowledge-gateway/app.py','/app/knowledge_server.py'),(ROOT/'knowledge-gateway/timing.py','/app/timing.py')],
        cmd=['uvicorn','knowledge_server:app','--host','0.0.0.0','--port','8101'])
# KB upstream names live on a second existing network. No upstream is restarted.
try:sh(['docker','network','connect','ff-ai-platform-server_default',kname])
except subprocess.CalledProcessError:pass
benv=env_of(backend)
benv.update({k.upper():str(v) for k,v in config.items() if v is not None})
benv.update({'READER_PIPELINE':'parallel_v1','DATABASE_INIT_ENABLED':'true','AUDIT_CLEANUP_ENABLED':'false',
    'DATABASE_URL':f'postgresql+asyncpg://parallel_test:{password}@{pgname}:5432/admin_parallel_test',
    'PLATFORM_GATEWAY_URL':f'http://{pname}:8102','KNOWLEDGE_GATEWAY_URL':f'http://{kname}:8101'})
bname=PREFIX+'-backend'
bid=run(bname,backend['Image'],benv,mounts=[(ROOT/'backend/app','/app/app')],ports=['127.0.0.1:18201:8000'])
nginx=Path('/data/deploy/umc-admin-gateway/nginx.conf').read_text()
nginx=nginx.replace('dsh-admin-service-backend-1:8000',bname+':8000')
nginx=nginx.replace('http://host.docker.internal:18113','http://10.255.1.157:18081')
nginx=nginx.replace('    listen 80;', '    listen 80;\n    location = /dsh-health { proxy_pass http://'+bname+':8000/healthz; }')
ng=PRIVATE/'nginx.conf';ng.write_text(nginx)
eid=run(PREFIX+'-entry','nginx:alpine',mounts=[(ng,'/etc/nginx/conf.d/default.conf')],ports=['18281:80'])
assert before=={x:inspect(x)['Id'] for x in before},'production_container_changed'
receipt={'testEntry':'http://77.242.240.158:18281','swagger':'http://77.242.240.158:18281/dsh-api/docs',
 'productionUnchanged':True,'businessMode':'read-only','database':'isolated ephemeral admin_parallel_test',
 'containers':{'backend':bid,'platform':pid,'knowledge':kid,'postgres':pgid,'entry':eid},
 'llmConfigured':bool(benv.get('LLM_API_KEY') and benv.get('LLM_BASE_URL'))}
(ROOT/'stage-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
