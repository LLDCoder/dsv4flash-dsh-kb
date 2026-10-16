from app.portal_reader import ReaderOutcome, ReaderResult, _guard_subject_record_substitution


def _outcome(rows):
    observation = {
        "readHealth": {"healthy": True},
        "sectionSummaries": [{
            "nodeId": "violations",
            "kind": "table",
            "columnHeaders": ["Violation No.", "Violator Name", "Violator Identifier"],
            "rowFields": rows,
        }],
    }
    result = ReaderResult(
        status="success",
        summary="The selected portal API response answered the request.",
        page="/inspection/violations",
        source_section="violations",
        answer_shape="list",
        completeness="bounded",
        facts=("VN-2026-5934829", "Ajman Commercial", "512498"),
    )
    return ReaderOutcome(result, {"observation": observation})


def test_subject_boundary_withholds_unrelated_rows():
    outcome = _outcome([
        {"Violation No.": "VN-2026-5934829", "Violator Name": "Ajman Commercial", "Violator Identifier": "512498"},
        {"Violation No.": "VN-2026-3717648", "Violator Name": "DUBAI MEDIA COMPANY", "Violator Identifier": "87654321"},
    ])
    guarded = _guard_subject_record_substitution(
        outcome,
        "查看该机构过去所有检查、处罚和联系人。本次指定检查对象 ren_jg1。",
    )
    assert guarded.result.status == "not_confirmed"
    assert guarded.result.facts == (
        "No visible record was verified as belonging to the requested subject.",
        "The current page rows are not used as a substitute for the requested subject.",
    )
    assert guarded.audit_evidence["subjectBoundaryGuard"]["matchedRows"] == 0


def test_subject_boundary_keeps_rows_when_every_row_matches():
    outcome = _outcome([
        {"Institution ID": "ren_jg1", "Violation No.": "VN-2026-0000001"},
    ])
    guarded = _guard_subject_record_substitution(
        outcome,
        "查看该机构过去所有检查。本次指定检查对象 ren_jg1。",
    )
    assert guarded == outcome


def test_subject_guard_does_not_change_unscoped_list_queries():
    outcome = _outcome([
        {"Violation No.": "VN-2026-5934829", "Violator Name": "Ajman Commercial"},
    ])
    guarded = _guard_subject_record_substitution(outcome, "显示当前违规列表。")
    assert guarded == outcome
