# 20261022-1348-patched-releases Publish patched releases automatically

- **status**: in_progress
- **priority**: P1
- **owner**: claude/session-main
- **createdAt**: 2026-10-22 13:48

## Description

Keep the local patches on `dev` applied to every upstream BKD release and publish the result in the patch repository, so that lode can install patched versions from there.

Acceptance criteria:

- A workflow on `dev` runs on a schedule, on pushes to `dev`, and by hand. It does the following:
  - It rebases the patches onto the latest upstream release tag.
  - It runs `bun run check` and builds the package.
  - It force-pushes the rebased `dev`.
  - It publishes a release `v<upstream>-p<n>` with the `bkd-server.tar.gz` asset.
- No release is published when nothing outside `docs/` and `.github/` changed since the last patched release of that upstream version.
- A rebase conflict or a failed check publishes nothing and fails the run.
- A manual dry run builds and checks without pushing or publishing.

## ActiveForm

Publishing patched releases automatically

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Plan: [../plan/20261022-1348-patched-releases.md](../plan/20261022-1348-patched-releases.md)
- **2026-10-22 progress:**
  - `.github/scripts/patched-release.sh` was tested locally in six cases: no release yet, unchanged, docs-only change, code change, rebase onto a new release, and conflict. The conflict case exits 1 and leaves the branch untouched.
  - The workflow passes actionlint and shellcheck. `oven-sh/setup-bun` is pinned to a commit SHA, and `GH_TOKEN` is scoped to the steps that call `gh`.
  - The patch repository disables the upstream `Release` workflow. `v0.3.23-p2` was published from the package built at `f3e8d39`.
  - CI results:
    - A push run decided nothing was due.
    - A manual dry run passed `bun run check` (942 pass) and built the package.
- The deploy key is stored as an environment secret: the token can manage environment secrets but not repository secrets. The `patched-release` environment admits only `dev`.
- **Remaining:**
  - The lode source switch, which needs a read-only token and a restart of the whole container: lode-group exits with any lode, and the container's restart policy brings it back.
