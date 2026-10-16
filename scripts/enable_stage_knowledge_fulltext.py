"""Run only on authorized isolated77. Mount only the two requested KB objects ro.

Original 18081, upstream knowledge API/volumes and business services are untouched.
Old isolated knowledge container is retained stopped for rollback.
"""
import json
from pathlib import Path
import subprocess

ROOT=Path('/data/project/admin77-parallel-20261016')
NAME='admin77-parallel-20261016-knowledge'
DIGESTS=['8c4642b0bce6e9b2ee5609006fe046ece415979db0f6b30914a17e2109f76f14',
         '95d912da18d5ab89823fc8a35e9564580d6591dfaac5803ee09e5e4043ff442d']
OBJECTS=Path('/knowledge-from-43-20260928/volumes/ff77clone_mailgraph-data/_data/knowledge_files/objects')
def run(args):return subprocess.check_output(args,text=True).strip()
def inspect(name):return json.loads(run(['docker','inspect',name]))[0]
old=inspect(NAME)
protected=['dsh-admin-service-backend-1','dsh-admin-service-platform-gateway-1',
           'dsh-admin-service-knowledge-gateway-1','umc-admin-gateway','umc-admin-portal']
before={n:(inspect(n)['Id'],inspect(n)['State']['StartedAt']) for n in protected}
backup=ROOT/'private-stage/knowledge-before-fulltext.json'
assert not backup.exists(),'already_applied_or_requires_explicit_rollback'
backup.write_text(json.dumps(old));backup.chmod(0o600)
assert all((OBJECTS/d[:2]/d).is_file() for d in DIGESTS)
env=dict(x.split('=',1) for x in old['Config']['Env'])
env.update(KNOWLEDGE_DOCUMENT_FOLDER_ID='34a89aa7b43b473d8326cf6540fc3894',
           KNOWLEDGE_DOCUMENT_OBJECT_ROOT='/app/document_objects')
envfile=ROOT/'private-stage/knowledge-fulltext.env'
envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');envfile.chmod(0o600)
saved=NAME+'-before-fulltext'
run(['docker','stop',NAME]);run(['docker','rename',NAME,saved])
networks=list(old['NetworkSettings']['Networks'])
for n in networks:run(['docker','network','disconnect',n,saved])
args=['docker','run','-d','--name',NAME,'--network',networks[0],'--restart','unless-stopped',
      '--env-file',str(envfile)]
for mount in old['Mounts']:
    assert not mount['RW'];args+=['-v',mount['Source']+':'+mount['Destination']+':ro']
for d in DIGESTS:args+=['-v',str(OBJECTS/d[:2]/d)+':/app/document_objects/'+d[:2]+'/'+d+':ro']
args+=[old['Image']]+old['Config']['Cmd']
try:
    run(args)
    for n in networks[1:]:run(['docker','network','connect',n,NAME])
except Exception:
    subprocess.run(['docker','rm','-f',NAME],capture_output=True)
    run(['docker','rename',saved,NAME])
    for n in networks:run(['docker','network','connect',n,NAME])
    run(['docker','start',NAME]);raise
assert before=={n:(inspect(n)['Id'],inspect(n)['State']['StartedAt']) for n in protected}
receipt={'productionUnchanged':True,'readOnlyObjectMounts':DIGESTS,'rollbackContainer':saved,
         'knowledgeVersion':'0.4.0','businessMutations':False}
(ROOT/'KNOWLEDGE-FULLTEXT-DEPLOY.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt))
