#!/usr/bin/env python3
"""Preview or publish the local license-related Skills to a 77 DSH instance.

The script deliberately never changes the system Prompt. It uses the same
console session API as the 77 Skills screen and defaults to a dry run.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.skills import DEFAULT_SKILL_DEFINITIONS  # noqa: E402


DEFAULT_IDS = {"license_permit_status", "application_status", "license_renewal", "permit_download"}


def request(opener: urllib.request.OpenerDirector, method: str, url: str, body: dict | None = None) -> dict:
    payload = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method=method, headers={"Content-Type": "application/json"})
    with opener.open(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("DSH_77_BASE_URL", "http://77.242.240.158:18085"))
    parser.add_argument("--password", default=os.getenv("DSH_77_CONSOLE_PASSWORD"))
    parser.add_argument("--skill-id", action="append", dest="skill_ids", help="Limit sync to one or more Skill IDs")
    parser.add_argument("--publish", action="store_true", help="Publish and enable the selected Skills")
    args = parser.parse_args()
    if args.publish and not args.password:
        parser.error("--password or DSH_77_CONSOLE_PASSWORD is required with --publish")

    selected = set(args.skill_ids or DEFAULT_IDS)
    definitions = [item for item in DEFAULT_SKILL_DEFINITIONS if item["skill_id"] in selected]
    missing = selected - {item["skill_id"] for item in definitions}
    if missing:
        parser.error(f"unknown local Skill ID(s): {', '.join(sorted(missing))}")

    base = args.base_url.rstrip("/")
    cookies = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
    if args.password:
        request(opener, "POST", f"{base}/api/v1/console/login", {"password": args.password})
    current = request(opener, "GET", f"{base}/api/v1/skills?scope=system").get("items", [])
    current_by_id = {item.get("skillId"): item for item in current}

    for definition in definitions:
        skill_id = definition["skill_id"]
        existing = current_by_id.get(skill_id)
        payload = {
            "name": definition["name"],
            "version": int((existing or {}).get("version", 1)),
            "source": "ops",
            "status": "PUBLISHED" if args.publish else "DRAFT",
            "scope": "system",
            "enabled": bool(args.publish),
            "allowedTools": definition["allowed_tools"],
            "dependencies": definition["dependencies"],
            "content": definition["content"],
        }
        action = "PUT" if existing else "POST"
        print(json.dumps({"action": action, "skillId": skill_id, "publish": args.publish, "payload": payload}, ensure_ascii=False))
        if args.publish:
            if existing:
                request(opener, "PUT", f"{base}/api/v1/skills/{skill_id}", payload)
            else:
                body = {"skillId": skill_id, **payload}
                request(opener, "POST", f"{base}/api/v1/skills", body)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        print(f"HTTP {exc.code}: {detail}", file=sys.stderr)
        raise SystemExit(1)
