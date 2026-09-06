import asyncio
import copy
import json
from pathlib import Path

import pytest
from fastapi import HTTPException

from test_platform_portal_reader import FakeRoute, gateway, read_request


@pytest.fixture(autouse=True)
def enforce_whitelist_for_test(monkeypatch):
    monkeypatch.setattr(gateway, "READER_WHITELIST_ENABLED", True)


@pytest.mark.parametrize("value,expected", [("true", True), ("1", True), ("false", False), ("0", False), (" FALSE ", False)])
def test_whitelist_boolean_is_explicit(monkeypatch, value, expected):
    monkeypatch.setenv("PORTAL_READER_WHITELIST_ENABLED", value)
    assert gateway._reader_whitelist_enabled() is expected


def test_missing_switch_defaults_to_enforcement(monkeypatch):
    monkeypatch.delenv("PORTAL_READER_WHITELIST_ENABLED", raising=False)
    assert gateway._reader_whitelist_enabled() is True


@pytest.mark.parametrize("value", ["", "offf", "yes", "disabled", "2"])
def test_invalid_switch_never_silently_disables_policy(monkeypatch, value):
    monkeypatch.setenv("PORTAL_READER_WHITELIST_ENABLED", value)
    with pytest.raises(ValueError, match="PORTAL_READER_WHITELIST_ENABLED"):
        gateway._reader_whitelist_enabled()


def test_bundled_policy_is_the_runtime_source():
    policy = gateway._load_reader_network_policy(gateway.READER_NETWORK_POLICY_FILE)
    assert frozenset(policy["allowedMethods"]["GET"]) == gateway.READER_READ_ONLY_GET_PATHS
    assert frozenset(policy["allowedMethods"]["POST"]) == gateway.READER_READ_ONLY_POST_PATHS
    assert frozenset(policy["blockedExactPaths"]) == gateway.READER_BLOCKED_EXACT_PATHS
    assert frozenset(policy["staticFetchPaths"]) == gateway.READER_STATIC_FETCH_PATHS


def test_policy_can_be_loaded_from_an_independent_file(tmp_path):
    policy = copy.deepcopy(gateway.READER_NETWORK_POLICY)
    policy["allowedMethods"]["POST"].append("/api/example/search")
    path = tmp_path / "policy.json"
    path.write_text(json.dumps(policy))
    loaded = gateway._load_reader_network_policy(path)
    assert "/api/example/search" in loaded["allowedMethods"]["POST"]
    assert "/api/example/search" not in gateway.READER_READ_ONLY_POST_PATHS


@pytest.mark.parametrize("bad_path", ["/api/*", "/api/items?all=true", "/api/items#all", "https://elsewhere/api/items", "//elsewhere/api/items", "/api/items/../export", "/api/%2e%2e/items", "/api/items\\export", "/outside/items", "/api/items/"])
def test_policy_rejects_broad_or_ambiguous_paths(tmp_path, bad_path):
    policy = copy.deepcopy(gateway.READER_NETWORK_POLICY)
    policy["allowedMethods"]["GET"].append(bad_path)
    path = tmp_path / "policy.json"
    path.write_text(json.dumps(policy))
    with pytest.raises(ValueError):
        gateway._load_reader_network_policy(path)


@pytest.mark.parametrize("change", ["version", "unknown_key", "method", "duplicate", "conflict", "not_list", "post_template"])
def test_invalid_policy_fails_closed(tmp_path, change):
    policy = copy.deepcopy(gateway.READER_NETWORK_POLICY)
    if change == "version":
        policy["version"] = True
    elif change == "unknown_key":
        policy["allowAll"] = True
    elif change == "method":
        policy["allowedMethods"]["DELETE"] = ["/api/items"]
    elif change == "duplicate":
        policy["allowedMethods"]["GET"] *= 2
    elif change == "conflict":
        policy["allowedMethods"]["GET"].append(policy["blockedExactPaths"][0])
    elif change == "not_list":
        policy["allowedMethods"]["GET"] = "/api/items"
    else:
        policy["allowedMethods"]["POST"].append("/api/items/:id")
    path = tmp_path / "policy.json"
    path.write_text(json.dumps(policy))
    with pytest.raises(ValueError):
        gateway._load_reader_network_policy(path)


def test_missing_or_malformed_policy_never_becomes_allow_all(tmp_path):
    with pytest.raises(FileNotFoundError):
        gateway._load_reader_network_policy(tmp_path / "missing.json")
    path = tmp_path / "policy.json"
    path.write_text("{")
    with pytest.raises(ValueError):
        gateway._load_reader_network_policy(path)


@pytest.mark.parametrize("method,path", [
    ("GET", "/api/admin/inspection/appeals/customer-happiness/todo"),
    ("POST", "/api/unknown/query"),
    ("POST", "/api/admin/inspection/tasks"),
    ("PUT", "/api/example/42"),
    ("PATCH", "/api/example/42"),
    ("DELETE", "/api/example/42"),
    ("OPTIONS", "/api/example/42"),
    ("GET", "/api/Document/Download"),
    ("POST", "/api/clientlog/report"),
    ("GET", "/runtime.json"),
])
def test_disabled_whitelist_bypasses_method_path_policy_only_in_mock(monkeypatch, method, path):
    route = FakeRoute(method, "https://admin.example.test" + path, "fetch")
    asyncio.run(gateway._guard_reader_request(route, "https://admin.example.test"))
    assert route.result[0] == "abort"
    monkeypatch.setattr(gateway, "READER_WHITELIST_ENABLED", False)
    asyncio.run(gateway._guard_reader_request(route, "https://admin.example.test"))
    assert route.result == ("continue", None)


@pytest.mark.parametrize("enabled", [True, False])
def test_guard_health_uses_actual_switch_decision(monkeypatch, enabled):
    monkeypatch.setattr(gateway, "READER_WHITELIST_ENABLED", enabled)
    path = "/api/admin/inspection/appeals/customer-happiness/todo"
    route = FakeRoute("GET", "https://admin.example.test" + path)
    health = {"blocked": [], "pending": {}}
    asyncio.run(gateway._guard_reader_request(route, "https://admin.example.test", reader_health=health))
    assert health["blocked"] == ([path] if enabled else [])
    assert health["pending"] == ({} if enabled else {id(route.request): path})


@pytest.mark.parametrize("enabled", [True, False])
def test_cross_origin_navigation_and_stream_guards_remain(monkeypatch, enabled):
    monkeypatch.setattr(gateway, "READER_WHITELIST_ENABLED", enabled)
    for url, resource_type in [
        ("https://outside.example.test/api/items", "fetch"),
        ("https://admin.example.test/unauthorized-page", "document"),
        ("https://admin.example.test/events", "eventsource"),
        ("wss://admin.example.test/socket", "websocket"),
    ]:
        route = FakeRoute("GET", url, resource_type)
        asyncio.run(gateway._guard_reader_request(route, "https://admin.example.test", frozenset({"/licensing"})))
        assert route.result[0] == "abort"


@pytest.mark.parametrize("action", ["approve", "submit", "delete", "assign", "send", "export", "upload", "download"])
def test_network_opt_out_does_not_authorize_mutating_reader_actions(monkeypatch, action):
    monkeypatch.setattr(gateway, "READER_WHITELIST_ENABLED", False)
    with pytest.raises(HTTPException):
        gateway._validate_reader_request(read_request([{"type": action}]))


@pytest.mark.parametrize("enabled", [True, False])
def test_health_exposes_active_mode_and_config(monkeypatch, enabled):
    monkeypatch.setattr(gateway, "READER_WHITELIST_ENABLED", enabled)
    health = asyncio.run(gateway.healthz())
    assert health["readerWhitelistEnabled"] is enabled
    assert health["readerNetworkMode"] == ("allowlist" if enabled else "same-origin-unrestricted")
    assert Path(health["readerWhitelistFile"]).name == "reader-network-policy.json"
