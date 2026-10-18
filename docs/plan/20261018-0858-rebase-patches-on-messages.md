# 20261018-0858-rebase-patches-on-messages Rebase local patches onto the messages release

- **status**: completed
- **createdAt**: 2026-10-18 08:58
- **approvedAt**: 2026-10-18 08:58
- **relatedTask**: 20261018-0858-rebase-patches-on-messages

## Context

Main renamed decision-event-updated to message-updated, added worktreeMissing to changes responses, and introduced message storage and upload changes. The patch branch carries six commits based on v0.3.19. Existing in-progress tasks belong to other work and remain untouched.

## Proposal

Replay the six commits onto v0.3.22. Preserve message subscription before the opening SSE comment, update the integration regression to the new event contract, and retain the missing-worktree early return. Merge both sides of documentation conflicts. Verify focused tests, lint, typecheck, full test suites, and build.

## Risks

History is rewritten; a backup retains the original tip. SSE event shape and missing-worktree semantics must remain compatible with main. Main records existing order-dependent API test timeouts.

## Scope

Local patch branch, minimal integration adaptations, regression coverage, and tracking records. No deployment, package rebuild, or remote push.

## Alternatives

A merge would preserve old history but does not match the requested rebase.

## Annotations

The user approved the rebase in the current request.

## Result

Replayed all six commits onto `286bced` (v0.3.22). Resolved documentation append conflicts and combined branch metadata with upstream worktree state. Updated the SSE regression for `message-updated`, including its `kind` and `expects` fields. Added assertions that an existing worktree reports its own branch and a missing worktree omits branch metadata.

## Verification

- Frozen dependency install, lint, API/frontend typecheck, and build passed. Lint retains two existing frontend warnings.
- Focused regressions: 45 passed across six files. Frontend: 285 passed across 45 files.
- Full API suite: 935 passed, one skipped, one failed. The failure at `api-messages.test.ts:248` is independently reproduced on clean main `286bced`: the decision and message tests share `camp-list` fixtures in the same table. Follow-up: taskist #462.
- Clean-main comparison covering decision routes, message routes, and migrations: 39 passed, one failed with the same two unexpected decision records.
- The first migration run used a symlink for the runtime migration directory. The migration fixture copier preserved that link and modified the source journal. Restored the journal and reran with a physical directory copy; migration tests passed and the source journal has no diff.
- Reviewed the replay and integration diff; no rebase-introduced issue found. Main is an ancestor and the original tip remains on the backup branch.

Check logs: `/home/alan/warehouse/bkd-rebase-20261018/{focused,check,api-final,baseline,build}.log`.
