import json

from app.portal_reader import observation_result_from_plan


def structured_observation(*, selected_state: str = "To Do") -> dict:
    return {
        "regionSummaries": [{
            "nodeId": "observation-region-001",
            "kind": "region",
            "heading": "Queue",
            "selectedState": selected_state,
        }],
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "parentRef": "observation-region-001",
            "heading": "Queue",
            "columnHeaders": ["Ticket No.", "Status", "Current Handler"],
            "rowSummaries": ["T-1 Open Alice"],
            "rowFields": [{"Ticket No.": "T-1", "Status": "Open", "Current Handler": "Alice"}],
        }],
    }


def list_plan(fact: str, *, selected_state: str = "") -> dict:
    plan = {
        "mode": "observation_result",
        "result": "success",
        "page": "/queue",
        "section": "Queue",
        "sourceSection": "observation-table-001",
        "answerShape": "list",
        "facts": [fact],
        "missing": [],
    }
    if selected_state:
        plan["selectedState"] = selected_state
    return plan


def resolve(plan: dict, observation: dict):
    return observation_result_from_plan(
        plan,
        observation,
        observed_page="/queue",
        permitted_paths=("/queue",),
    )


def test_claimed_selected_state_must_match_the_scoped_node_or_parent() -> None:
    fact = json.dumps({"Ticket No.": "T-1", "Status": "Open", "Current Handler": "Alice"})

    assert resolve(list_plan(fact, selected_state="Completed"), structured_observation()) is None


def test_missing_selected_state_inherits_the_verified_parent_state() -> None:
    fact = json.dumps({"Ticket No.": "T-1", "Status": "Open", "Current Handler": "Alice"})

    result = resolve(list_plan(fact), structured_observation())

    assert result is not None
    assert result.selected_state == "To Do"
    assert result.completeness == "bounded"


def test_unobserved_selected_state_is_not_kept_from_the_plan() -> None:
    observation = structured_observation(selected_state="")
    observation["regionSummaries"] = []
    fact = json.dumps({"Ticket No.": "T-1", "Status": "Open", "Current Handler": "Alice"})

    result = resolve(list_plan(fact, selected_state="Completed"), observation)

    assert result is not None
    assert result.selected_state == ""


def test_ambiguous_table_rejects_guessed_column_value_mapping() -> None:
    observation = {
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "Queue",
            "columnHeaders": ["Ticket No.", "Status", "Current Handler"],
            "rowSummaries": ["T-1 Open Alice"],
            "rowFields": [],
        }],
    }

    assert resolve(list_plan("Status: Alice; Current Handler: Open"), observation) is None


def test_ambiguous_table_allows_only_the_direct_unlabeled_row() -> None:
    observation = {
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "Queue",
            "columnHeaders": ["Ticket No.", "Status", "Current Handler"],
            "rowSummaries": ["T-1 Open Alice"],
            "rowFields": [],
        }],
    }

    result = resolve(list_plan("T-1 Open Alice"), observation)

    assert result is not None
    assert result.facts == ("T-1 Open Alice",)
    assert result.completeness == "bounded"
