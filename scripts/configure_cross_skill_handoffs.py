#!/usr/bin/env python3
"""Back up and publish the read-only Refund/Complaint → My Requests handoffs.

The script uses the same DSH Skill API as the console.  It intentionally
preserves every existing Skill field and only adds ``crossSkillHandoffs`` to
the two source Skill workflows.  It cannot register a write Tool or call UMC.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _request(
    opener: urllib.request.OpenerDirector,
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    request = urllib.request.Request(url, data=payload, method=method, headers={"Content-Type": "application/json", **headers})
    with opener.open(request, timeout=30) as response:
        value = json.loads(response.read().decode("utf-8"))
    return value if isinstance(value, dict) else {}


HANDOFFS: dict[str, list[dict[str, Any]]] = {
    "refund_status": [
        {
            "targetSkillId": "application_status",
            "when": {
                "anyTerms": [
                    "related application",
                    "linked application",
                    "application linked to this refund",
                    "what application is this",
                    "show the application",
                    "show my application",
                    "application status",
                    "status of the application",
                ],
                "exactTerms": ["application"],
            },
            "sourceTool": "umc.refund-detail",
            "lookups": [
                {
                    "sourcePaths": [
                        "result.data.relatedApplicationInfo.applicationId",
                        "data.relatedApplicationInfo.applicationId",
                        "result.data.relatedApplication.applicationId",
                        "data.relatedApplication.applicationId",
                    ],
                    "toolName": "umc.application_detail",
                    "argumentName": "applicationId",
                    "argumentValueType": "integer",
                },
                {
                    "sourcePaths": [
                        "result.data.relatedApplicationInfo.applicationNo",
                        "data.relatedApplicationInfo.applicationNo",
                        "result.data.applicationNumber",
                        "data.applicationNumber",
                    ],
                    "filter": "keyword",
                },
            ],
        }
    ],
    "complaints_status": [
        {
            "targetSkillId": "application_status",
            "when": {
                "anyTerms": [
                    "related application",
                    "linked application",
                    "application linked to this complaint",
                    "what application is this",
                    "show the application",
                    "show my application",
                    "application status",
                    "status of the application",
                ],
                "exactTerms": ["application"],
            },
            "sourceTool": "umc.enquiry-detail",
            "lookups": [
                {
                    "sourcePaths": [
                        "result.data.applicationNo",
                        "data.applicationNo",
                        "result.data.applicationNumber",
                        "data.applicationNumber",
                    ],
                    "filter": "keyword",
                }
            ],
        }
    ],
}


def _payload(skill: dict[str, Any]) -> dict[str, Any]:
    """Convert the console's response representation back to its PUT schema."""

    return {
        "name": skill["name"],
        "version": int(skill.get("version", 1)),
        "source": skill.get("source", "ops"),
        "status": "PUBLISHED",
        "scope": skill.get("scope", "system"),
        "enabled": True,
        "allowedTools": list(skill.get("allowedTools") or []),
        "dependencies": list(skill.get("dependencies") or []),
        "domain": skill.get("domain", "general"),
        "aliases": list(skill.get("aliases") or []),
        "positiveExamples": list(skill.get("positiveExamples") or []),
        "negativeExamples": list(skill.get("negativeExamples") or []),
        "workflow": dict(skill.get("workflow") or {}),
        "content": skill.get("content", ""),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("DSH_77_BASE_URL", "http://77.242.240.158:18085"))
    parser.add_argument("--password", default=os.getenv("DSH_77_CONSOLE_PASSWORD"))
    parser.add_argument("--backup-dir", default="outputs/cross_skill_handoff_backup")
    parser.add_argument("--publish", action="store_true", help="Perform the PUT requests. Default is a dry run.")
    args = parser.parse_args()
    if args.publish and not args.password:
        parser.error("--password or DSH_77_CONSOLE_PASSWORD is required with --publish")

    base_url = args.base_url.rstrip("/")
    cookies = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
    if args.password:
        _request(opener, "POST", f"{base_url}/api/v1/console/login", headers={}, body={"password": args.password})
    headers = {"X-User-Id": "console-operator", "X-Tenant-Id": "system", "X-Request-Id": "cross-skill-handoff-config"}
    items = _request(opener, "GET", f"{base_url}/api/v1/skills?scope=system", headers=headers).get("items", [])
    by_id = {str(item.get("skillId")): item for item in items if isinstance(item, dict)}
    missing = sorted(set(HANDOFFS) - set(by_id))
    if missing:
        raise RuntimeError(f"published source Skill(s) not found: {', '.join(missing)}")
    if "application_status" not in by_id:
        raise RuntimeError("published target Skill application_status not found")

    backup_dir = Path(args.backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for skill_id, rules in HANDOFFS.items():
        original = by_id[skill_id]
        backup_path = backup_dir / f"{skill_id}.before-cross-skill-handoff.{timestamp}.json"
        backup_path.write_text(json.dumps(original, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        payload = _payload(original)
        workflow = payload["workflow"]
        workflow["crossSkillHandoffs"] = rules
        print(json.dumps({"skillId": skill_id, "backup": str(backup_path), "publish": args.publish, "targetSkillId": "application_status"}))
        if args.publish:
            _request(opener, "PUT", f"{base_url}/api/v1/skills/{skill_id}", headers=headers, body=payload)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, urllib.error.HTTPError, urllib.error.URLError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
