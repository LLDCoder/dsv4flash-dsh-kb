"""Public engineering receipt: durations are inclusive and in milliseconds."""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class TimingSpan(BaseModel):
    model_config = ConfigDict(extra='allow')
    version: str
    requestId: str
    traceId: str
    spanId: str
    parentSpanId: str | None = None
    agent: str
    owner: str
    stage: str
    startUtc: str
    endUtc: str
    durationMs: float = Field(ge=0)
    status: str


class TimingReceipt(BaseModel):
    model_config = ConfigDict(extra='allow')
    version: str
    requestId: str
    traceId: str
    totalMs: float | None = None
    firstVerifiedAnswerMs: float | None = None
    criticalBranch: str | None = None
    agentWallMs: dict[str, float]
    longestHttp: dict[str, Any] | None = None
    spans: list[TimingSpan]
    missing: list[str]
    measurement: str
    droppedSpans: int


class ConversationTimings(BaseModel):
    conversationId: str
    turns: list[TimingReceipt]
    units: str = 'milliseconds'
    warning: str = 'Parent durations include children. Parallel durations overlap. Do not add all rows.'


def report(payload):
    spans=payload.get('spans',[])
    roots=[s for s in spans if s.get('stage')=='turn.end_to_end']
    answer=[s for s in spans if s.get('stage')=='answer.first_verified_block']
    branches={}
    # Broker worker spans also carry agent.knowledge, but are nested under a
    # caller stage. They are not the independently dispatched root KB task.
    dispatch_parents={s.get('parentSpanId') for s in spans if s.get('stage') in {'agent.api','agent.page'}}
    for s in spans:
        if (s.get('stage') in {'agent.api','agent.page','agent.knowledge'}
                and s.get('parentSpanId') in dispatch_parents):
            branches[s['agent']]=max(branches.get(s['agent'],0),s['durationMs'])
    calls=[s for s in spans if s.get('stage') in {'http.request','browser.http.request'}]
    longest=max(calls,key=lambda x:x['durationMs']) if calls else None
    return {**payload,'totalMs':roots[-1]['durationMs'] if roots else None,
            'firstVerifiedAnswerMs':answer[0].get('sinceMessageReceivedMs') if answer else None,
            'agentWallMs':branches,'criticalBranch':max(branches,key=branches.get) if branches else None,
            'longestHttp':{k:longest[k] for k in ('spanId','owner','method','route','durationMs') if k in longest} if longest else None,
            'missing':['UMC_server_internal_database_domain_and_serialization_times_unavailable'],
            'measurement':payload.get('measurement','inclusive_monotonic_ms'),
            'droppedSpans':payload.get('droppedSpans',0)}
