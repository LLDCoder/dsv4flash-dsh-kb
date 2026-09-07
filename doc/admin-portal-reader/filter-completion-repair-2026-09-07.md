# Generic Filter Completion Repair

## Scope

- Reported question: `I want to check the pending modification application tasks.`
- Surface: `/licensing/applications`, current Foreign Media Manager session.
- Deliverable: incremental generic Reader improvement, not a page manual or business-specific Skill.
- GetUserInfo confirmed the current identity and granted route before page work.
- No business mutations, knowledge uploads, remote database operations, or customer-system operations.

## Confirmed Failure Chain

1. The original request observed the default To Do sample rather than the requested status subset. The raw page already contained the nonzero requested category count.
2. The executor's default 1280x720 viewport collapsed the status controls into the responsive filter surface. The user's wide desktop page exposed them inline.
3. Observations omitted input combobox descriptors, options, ordinary filter buttons, and structured label/value metric pairs.
4. Planner results confused real default rows with relevant rows, or replaced a requested list with an overview or an unsupported zero.
5. Native input comboboxes were handled as text inputs. Placeholder-based locators also stopped matching after selection.
6. Hidden operation columns invalidated otherwise readable native row bindings.
7. A table refresh during multi-step collection could mix old and new rows even after the selected control value changed.

Live verification corrected an initial assumption: selecting this status automatically updates the list. The Filter button can open an additional submission-time dialog; its presence alone does not justify an apply action.

## Generic Changes

- Use a stable desktop viewport and bounded structured filter/metric observations.
- Inspect at most four identified filter-surface Ant combobox popups, without selecting values, and close them with Escape.
- Match one literal requested condition against actual observed options. A unique matching filter control can supply one bounded read continuation, not a prewritten answer.
- Keep ambiguous, complex, translated, and nonliteral conditions under semantic planning. Never automatically select arbitrary business-form controls.
- Correct invalid filter action contracts and invalid pre-observation/result phases before treating them as execution failures.
- Select actual options and read back the value through the original element handle.
- Support documented inline and overlay filter buttons without assuming every Filter button commits a selection.
- Preserve visible native fields when an excluded operation column is hidden.
- Compare table fingerprints before and after collection; retry changing tables rather than returning mixed records.
- Reject unrelated records and unsupported empty-result claims; retain bounded result semantics.

## Verification

- Full backend suite: 1055 passed.
- Real Chromium fixture: `docker exec -i dsh-admin-local-platform-gateway-1 python - < scripts/check_reader_filter_dom.py` passed. It covers paired metrics, hidden exclusions, option inspection without selection, virtual input combobox selection, readback after placeholder removal, and inline Filter execution.
- Successful original-question conversation at 17:19:38 Asia/Dubai: `conv_e7f2662da3c241d3b7a1`.
- Successful final deployed-build conversation at 17:22:16 Asia/Dubai: `conv_83d751107ce5431da4c5`.
- Both returned four matching application records. Final audit: `success`, `answerShape=list`, `completeness=bounded`, empty root cause; actions were `observe` followed by `filter`.
- The bounded result is not the complete 13-record list. No all-record pagination claim is made.
- Gateway runtime source SHA-256 matched the workspace: `37ee81b57f477818e58bb7cadc1678cafca1b8950a9dcac35e4db07f35eed5ec`.
- Local `/`, `/dsh-audit/`, and `/swagger` were reachable; audit CSS had 173 rules and its script loaded through the proxy.
- The local backend target was verified as `postgres:5432/dsh`, portal `admin`. Only the Admin gateway was rebuilt; the backend used its existing local reload configuration.

## Boundaries and Retrospective

- Missing generic capabilities and demonstrated incorrect answers were addressed in Reader code, the existing engineering contract, and regressions.
- No page manual was duplicated or changed. Manual completeness was not revalidated in this implementation stage.
- Permission and mutation checks were not relaxed. The pre-existing local network allowlist-disabled setting was not changed; this work does not certify that network configuration.
- Multi-account, broad module, complex predicate, full-pagination, and all five outcome-matrix acceptance remain outside this focused smoke.
- Unrelated startup, README, handoff, and backup changes were preserved. No commit or push was performed in this repair turn.
