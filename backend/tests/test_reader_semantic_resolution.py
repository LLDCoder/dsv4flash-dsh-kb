from test_admin_portal_reader import Gateway, Planner, portal_plan_for, run_reader, user_info_for_paths


def test_service_application_observation_uses_validated_llm_overview_without_fallback() -> None:
    observation = {
        "regionSummaries": [
            {
                "nodeId": "observation-region-001",
                "kind": "region",
                "heading": "My Tasks",
                "controls": ["Service Application 14", "Enquiries & Complaints 2"],
            },
            {
                "nodeId": "observation-region-002",
                "kind": "region",
                "heading": "Service Application",
                "controls": ["Pending Review 12", "External Approval 2"],
            },
        ]
    }
    planner = Planner(
        portal_plan_for("/dashboard", [{"type": "observe"}]),
        {
            "mode": "observation_result",
            "result": "success",
            "page": "/dashboard",
            "section": "Service Application",
            "sourceSection": "observation-region-002",
            "answerShape": "overview",
            "facts": ["Pending Review 12"],
            "missing": [],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/dashboard")},
        portal_result={"ok": True, "result": {"result": "success", "observation": observation}},
    )

    outcome = run_reader(gateway, planner, question="How about the service application tasks?")

    assert outcome.result.facts == ("Pending Review 12",)
    assert outcome.result.answer_shape == "overview"
    assert outcome.audit_evidence["semanticResolution"]["decision"] == "llm_result"
    assert outcome.audit_evidence["semanticResolution"]["fallbackUsed"] is False
    assert len(planner.calls) == 2
    assert planner.calls[1][2]["chunks"] == [{"content": "Admin Portal manual"}]
    assert "knowledge" not in planner.calls[1][2]


def test_enquiries_post_action_observation_is_resolved_by_llm_as_a_list() -> None:
    observations = [
        {
            "regionSummaries": [{
                "nodeId": "observation-region-001",
                "kind": "region",
                "heading": "My Tasks",
                "controls": ["Service Application 14", "Enquiries & Complaints 2"],
            }],
        },
        {
            "sectionSummaries": [{
                "nodeId": "observation-table-001",
                "kind": "table",
                "parentRef": "observation-region-001",
                "heading": "Enquiries & Complaints",
                "selectedState": "Enquiries & Complaints",
                "rowSummaries": ["EC-101 Open", "EC-102 In Progress"],
            }],
        },
    ]

    class SequencedGateway(Gateway):
        async def invoke(self, current_principal, tool_name, arguments, *, allowed_tools=None):
            if tool_name == "knowledge.search":
                return await super().invoke(
                    current_principal, tool_name, arguments, allowed_tools=allowed_tools
                )
            self.events.append(tool_name)
            self.calls.append((tool_name, arguments, allowed_tools))
            observation = observations.pop(0)
            return {"ok": True, "result": {"result": "success", "observation": observation}}

    planner = Planner(
        portal_plan_for("/dashboard", [{"type": "observe"}]),
        portal_plan_for("/dashboard", [{"type": "switch_tab", "role": "tab", "name": "Enquiries & Complaints"}]),
        {
            "mode": "observation_result",
            "result": "success",
            "page": "/dashboard",
            "section": "Enquiries & Complaints",
            "sourceSection": "observation-table-001",
            "answerShape": "list",
            "selectedState": "Enquiries & Complaints",
            "facts": ["EC-101 Open", "EC-102 In Progress"],
            "missing": [],
        },
    )
    gateway = SequencedGateway(info={"ok": True, "result": user_info_for_paths("/dashboard")})

    outcome = run_reader(gateway, planner, question="What about Enquiries & Complaints items?")

    assert outcome.result.facts == ("EC-101 Open", "EC-102 In Progress")
    assert outcome.result.answer_shape == "list"
    assert outcome.audit_evidence["stage"] == "completed_after_read_state_change"
    assert outcome.audit_evidence["semanticResolution"]["decision"] == "llm_result"
    assert len(planner.calls) == 3
    assert planner.calls[2][2]["chunks"] == [{"content": "Admin Portal manual"}]
    assert "knowledge" not in planner.calls[2][2]


def test_named_collection_parent_count_forces_child_read_before_success() -> None:
    observations = [
        {
            "regionSummaries": [{
                "nodeId": "observation-region-001",
                "kind": "region",
                "heading": "My Tasks",
                "controls": ["Service Application 14", "Enquiries & Complaints 2"],
            }],
        },
        {
            "regionSummaries": [{
                "nodeId": "observation-region-001",
                "kind": "region",
                "heading": "My Tasks",
                "selectedState": "Enquiries & Complaints",
                "cardSummaries": ["EC-101 Escalated Due in 4h", "EC-102 Escalated Due in 1d"],
            }],
        },
    ]

    class SequencedGateway(Gateway):
        async def invoke(self, current_principal, tool_name, arguments, *, allowed_tools=None):
            if tool_name == "knowledge.search":
                return await super().invoke(
                    current_principal, tool_name, arguments, allowed_tools=allowed_tools
                )
            self.events.append(tool_name)
            self.calls.append((tool_name, arguments, allowed_tools))
            observation = observations.pop(0)
            return {"ok": True, "result": {"result": "success", "observation": observation}}

    planner = Planner(
        portal_plan_for("/dashboard", [{"type": "observe"}]),
        {
            "mode": "observation_result",
            "result": "success",
            "page": "/dashboard",
            "section": "My Tasks",
            "sourceSection": "observation-region-001",
            "answerShape": "count",
            "facts": ["Enquiries & Complaints 2"],
            "missing": [],
        },
        portal_plan_for(
            "/dashboard",
            [{"type": "switch_tab", "role": "tab", "name": "Enquiries & Complaints"}],
        ),
        {
            "mode": "observation_result",
            "result": "success",
            "page": "/dashboard",
            "section": "My Tasks",
            "sourceSection": "observation-region-001",
            "answerShape": "list",
            "selectedState": "Enquiries & Complaints",
            "facts": ["EC-101 Escalated Due in 4h", "EC-102 Escalated Due in 1d"],
            "missing": [],
        },
    )
    gateway = SequencedGateway(
        info={"ok": True, "result": user_info_for_paths("/dashboard")}
    )

    outcome = run_reader(
        gateway,
        planner,
        question="How are the Enquiries & Complaints tasks?",
    )

    assert outcome.result.status == "success"
    assert outcome.result.answer_shape == "list"
    assert outcome.result.facts == (
        "EC-101 Escalated Due in 4h",
        "EC-102 Escalated Due in 1d",
    )
    directive = planner.calls[2][2]["planningDirective"]
    assert directive["reason"] == "named_collection_requires_child_evidence"
    assert directive["categoryControl"] == "Enquiries & Complaints"
    assert directive["parentCountNotSufficient"] is True


def test_not_confirmed_llm_result_uses_structured_fallback_after_llm_validation() -> None:
    observation = {
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "Assigned Items",
            "rowSummaries": ["REF-101 Open"],
        }]
    }
    planner = Planner(
        portal_plan_for("/work", [{"type": "observe"}]),
        {
            "mode": "observation_result",
            "result": "not_confirmed",
            "page": "/work",
            "section": "Assigned Items",
            "sourceSection": "observation-table-001",
            "answerShape": "list",
            "facts": [],
            "missing": ["semantic_choice_not_confirmed"],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/work")},
        portal_result={"ok": True, "result": {"result": "success", "observation": observation}},
    )

    outcome = run_reader(gateway, planner, question="List my assigned items")

    assert outcome.result.facts == ("REF-101 Open",)
    assert outcome.audit_evidence["stage"] == "completed_from_observation_fallback"
    resolution = outcome.audit_evidence["semanticResolution"]
    assert resolution["decision"] == "fallback"
    assert resolution["reason"] == "llm_not_confirmed"
    assert resolution["llmMode"] == "observation_result"
    assert resolution["llmSelection"] == {
        "resultStatus": "not_confirmed",
        "section": "Assigned Items",
        "sourceSection": "observation-table-001",
        "answerShape": "list",
    }
    assert resolution["validation"] == "not_applicable"
    assert resolution["fallbackUsed"] is True
    assert resolution["fallbackStrategy"] == "structured_unique_evidence"


def test_invalid_llm_evidence_reference_falls_back_but_valid_result_does_not() -> None:
    observation = {
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "Assigned Items",
            "rowSummaries": ["REF-101 Open", "REF-102 Pending"],
        }]
    }
    planner = Planner(
        portal_plan_for("/work", [{"type": "observe"}]),
        {
            "mode": "observation_result",
            "result": "success",
            "page": "/work",
            "section": "Assigned Items",
            "sourceSection": "observation-table-001",
            "answerShape": "list",
            "facts": ["REF-999 Missing"],
            "missing": [],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/work")},
        portal_result={"ok": True, "result": {"result": "success", "observation": observation}},
    )

    outcome = run_reader(gateway, planner, question="List my assigned items")

    assert outcome.result.facts == ("REF-101 Open", "REF-102 Pending")
    assert outcome.audit_evidence["semanticResolution"]["decision"] == "fallback"
    assert outcome.audit_evidence["semanticResolution"]["reason"] == "invalid_observation_references"
    assert outcome.audit_evidence["semanticResolution"]["validation"] == "failed"


def test_post_observe_knowledge_only_is_invalid_schema_not_a_compatibility_result() -> None:
    observation = {
        "sectionSummaries": [{
            "nodeId": "observation-table-001",
            "kind": "table",
            "heading": "Assigned Items",
            "rowSummaries": ["REF-101 Open", "REF-102 Pending"],
        }]
    }
    planner = Planner(
        portal_plan_for("/work", [{"type": "observe"}]),
        {
            "mode": "knowledge_only",
            "result": "success",
            "page": "/work",
            "section": "Assigned Items",
            "facts": ["REF-101 Open"],
            "missing": [],
        },
    )
    gateway = Gateway(
        info={"ok": True, "result": user_info_for_paths("/work")},
        portal_result={"ok": True, "result": {"result": "success", "observation": observation}},
    )

    outcome = run_reader(gateway, planner, question="List my assigned items")

    assert outcome.result.facts == ("REF-101 Open", "REF-102 Pending")
    resolution = outcome.audit_evidence["semanticResolution"]
    assert resolution["decision"] == "fallback"
    assert resolution["reason"] == "invalid_semantic_schema"
    assert resolution["llmMode"] == "knowledge_only"
    assert resolution["llmSelection"] == {}
    assert resolution["validation"] == "failed"
    assert resolution["fallbackUsed"] is True


def test_observation_result_rejects_unpermitted_or_different_page_reference() -> None:
    # The orchestration test above proves the positive path; this guards the
    # deterministic permission check independently of planner behavior.
    from app.portal_reader import observation_result_from_plan

    plan = {
        "mode": "observation_result",
        "result": "success",
        "page": "/other",
        "section": "Queue",
        "facts": ["Open 1"],
        "missing": [],
    }
    observation = {"regionSummaries": [{"heading": "Queue", "controls": ["Open 1"]}]}

    assert observation_result_from_plan(
        plan,
        observation,
        observed_page="/work",
        permitted_paths=("/work",),
    ) is None
