# 20261018-0858-rebase-patches-on-messages Rebase local patches onto the messages release

- **status**: completed
- **priority**: P1
- **owner**: rebase-20261018
- **createdAt**: 2026-10-18 08:58

## Description

Rebase the six local commits at `08b0024` onto main `286bced` (v0.3.22), retaining immediate SSE connection, automatic follow-up start tracking, system resources, and changes branch metadata. Adapt the SSE regression to message-updated and preserve missing-worktree behavior.

## ActiveForm

Rebased and validated local patches against the messages release.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

Full tier. The user explicitly authorized rebasing and necessary adaptation.
Original tip: `backup/event-stream-and-reconciler-pre-rebase-20261018`.
Acceptance: main is an ancestor; focused regressions and repository checks pass, or baseline failures are independently confirmed and recorded.

All six commits replayed onto `286bced`. SSE coverage now uses `message-updated`; changes coverage preserves branch metadata only for an available worktree. Focused tests (45), frontend tests (285), lint, typecheck, and build passed. Full API results: 935 passed, one skipped, one baseline failure independently reproduced on main and tracked as taskist #462. See the matching plan for verification details and evidence paths.

- complete: Rebased onto v0.3.22 and validated adaptations; the sole remaining API failure is reproduced on main and tracked as taskist #462.
