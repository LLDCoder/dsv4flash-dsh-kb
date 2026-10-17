"""Isolated77 only: verify and mount discovered inspection/reference KB objects ro.

No UMC business service, original18081, shared DB, upstream code or source object
is modified. Current stopped container and its private configuration are retained.
"""
import hashlib,json,subprocess,time
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path('/data/project/admin77-parallel-20261016')
NAME='admin77-parallel-20261016-knowledge'
SCOPE='34a89aa7b43b473d8326cf6540fc3894'
IDS=['9042228eff9e440fb01364dd217378f3','ccc09d0548ba4dc4aee8e64f969201d9',
 'c7819ce2626c47f49380d1811caee5c8','45e24c910b754ac3867f6342c9d83cda',
 '475cf8b5dd904926a5f24cff4185ad51','aa78e83e070e497880f4436a1cafe351',
 '9c18983b364b42fc8be6339d895af062','50ef4695c6ff4770bfc8f1ceaf6a5dec',
 '70dbf49d64de4535afb8ed0934aeaa29']
OBJECTS=Path('/knowledge-from-43-20260928/volumes/ff77clone_mailgraph-data/_data/knowledge_files/objects')
def run(a):return subprocess.check_output(a,text=True).strip()
def inspect(n):return json.loads(run(['docker','inspect',n]))[0]
old=inspect(NAME)
protected=['dsh-admin-service-backend-1','dsh-admin-service-platform-gateway-1',
 'dsh-admin-service-knowledge-gateway-1','umc-admin-gateway','umc-admin-portal']
before={n:(inspect(n)['Id'],inspect(n)['State']['StartedAt']) for n in protected}
backup=ROOT/'private-stage/knowledge-before-inspection-docs.json'
assert not backup.exists(),'already_applied_or_requires_explicit_rollback'
program='''
import json,urllib.request,urllib.error,os,time,datetime,sys
ids=json.loads(sys.argv[1]);scope=sys.argv[2]
url=os.environ['KNOWLEDGE_BASE_URL'].rstrip('/')+os.environ['KNOWLEDGE_PUBLIC_PATH']+'/files?folder_id='+scope+'&recursive=true'
items=json.load(urllib.request.urlopen(url))['items'];rows=[]
for id in ids:
 matches=[x for x in items if x.get('id')==id];assert len(matches)==1
 x={k:matches[0].get(k) for k in ['id','folder_id','folder_path','name','extension','size','sha256','status','updated_at']}
 x['beforeStartUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat();start=time.monotonic()
 try:
  r=urllib.request.urlopen('http://127.0.0.1:8101/files/'+id+'/content?folder_id='+scope);r.read();x['beforeStatus']=r.status
 except urllib.error.HTTPError as e:x['beforeStatus']=e.code;x['beforeError']=json.load(e)
 x['beforeElapsedMs']=round((time.monotonic()-start)*1000,3);rows.append(x)
print(json.dumps({'manifestCount':len(items),'documents':rows},ensure_ascii=False))
'''
preflight=json.loads(run(['docker','exec',NAME,'python','-c',program,json.dumps(IDS),SCOPE]))
digests={}
for d in preflight['documents']:
 h=d['sha256'];assert len(h)==64 and all(c in '0123456789abcdef' for c in h)
 assert d['status']=='done' and d['extension'] in {'.json','.md','.txt'} and 0<d['size']<=1024*1024
 p=OBJECTS/h[:2]/h;assert p.is_file() and not p.is_symlink()
 data=p.read_bytes();assert len(data)==d['size'] and hashlib.sha256(data).hexdigest()==h
 data.decode('utf-8',errors='strict');digests[h]=p
backup.write_text(json.dumps(old));backup.chmod(0o600)
env=dict(x.split('=',1) for x in old['Config']['Env'])
assert env['KNOWLEDGE_DOCUMENT_FOLDER_ID']==SCOPE
envfile=ROOT/'private-stage/knowledge-inspection-docs.env'
envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');envfile.chmod(0o600)
saved=NAME+'-before-inspection-docs';networks=list(old['NetworkSettings']['Networks'])
run(['docker','stop',NAME]);run(['docker','rename',NAME,saved])
for n in networks:run(['docker','network','disconnect',n,saved])
args=['docker','run','-d','--name',NAME,'--network',networks[0],'--restart','unless-stopped','--env-file',str(envfile)]
for m in old['Mounts']:
 assert not m['RW']
 if not m['Destination'].startswith('/app/document_objects/'):
  args+=['-v',m['Source']+':'+m['Destination']+':ro']
for h,p in digests.items():args+=['-v',str(p)+':/app/document_objects/'+h[:2]+'/'+h+':ro']
try:
 run(args+[old['Image']]+old['Config']['Cmd'])
 for n in networks[1:]:run(['docker','network','connect',n,NAME])
 # Readiness is checked before sending document probes, not inferred from start.
 for attempt in range(30):
  check=subprocess.run(['docker','exec',NAME,'python','-c','import urllib.request;assert urllib.request.urlopen("http://127.0.0.1:8101/healthz").status==200'],capture_output=True)
  if check.returncode==0:break
  time.sleep(.25)
 else:raise RuntimeError('isolated_knowledge_readiness_failed')
except Exception:
 subprocess.run(['docker','rm','-f',NAME],capture_output=True);run(['docker','rename',saved,NAME])
 for n in networks:run(['docker','network','connect',n,NAME])
 run(['docker','start',NAME]);raise
assert before=={n:(inspect(n)['Id'],inspect(n)['State']['StartedAt']) for n in protected}
receipt={**preflight,'readOnlyMountedUniqueObjects':len(digests),'fileRecords':len(IDS),
 'originalServices':{n:{'id':v[0],'startedAt':v[1]} for n,v in before.items()},
 'original18081Unchanged':True,'rollbackContainer':saved,'businessWrites':False}
(ROOT/'INSPECTION-DOCUMENTS-DEPLOY.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2))
print(json.dumps(receipt,ensure_ascii=False))
