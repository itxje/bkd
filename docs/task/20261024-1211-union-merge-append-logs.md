# 20261024-1211-union-merge-append-logs Merge the append-only logs by union when rebasing patches

- **status**: completed
- **priority**: P2
- **owner**: claude/session-main
- **createdAt**: 2026-10-24 12:11

## Description

The patched release rebase failed three times in a row on `v0.3.25`. Upstream and a patch had both appended a line to the end of `docs/task/index.md`. These logs (`docs/task/index.md`, `docs/plan/index.md`, `docs/changelog.md`) only grow at the end, so almost every upstream release would conflict there.

Acceptance criteria:

- `.github/scripts/patched-release.sh` merges these three files with git's built-in `union` driver during the rebase.
- The driver is set for the checkout only, in `info/attributes`, and the repository files stay unchanged.
- The `v0.3.25` rebase completes on its own, with the same tree as the manual resolution.
- A conflict in code still fails the run and leaves the branch untouched.

## ActiveForm

Merging the append-only logs by union when rebasing patches

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Related plan: `20261022-1348-patched-releases`.
- Tests ran in a scratch clone:
  - The pre-`v0.3.25` branch rebased without a conflict, and its tree matches the manual resolution.
  - A second run does not duplicate the attribute lines.
  - A conflicting code patch still exits 1 with the branch unchanged.
  - The script passes shellcheck.

- complete: union merge for append-only logs in the prepare script
