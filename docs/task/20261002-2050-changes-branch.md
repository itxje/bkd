# 20261002-2050-changes-branch Name the branch in an issue's changes

- **status**: completed
- **priority**: P2
- **owner**: claude/session-main
- **createdAt**: 2026-10-02 20:50

## Description

Clients cannot tell which branch an issue's working directory is on. A worktree issue's branch can only be guessed from BKD's naming, and an issue in the project directory shows none. `GET .../issues/:id/changes` already runs `git status --porcelain` there. Adding `-b` makes git print a `## <branch>...` header first, so the response can name the branch without another git run.

## ActiveForm

Naming the branch in an issue's changes

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- **Code:**
  - `listChangedFiles` runs `git status --porcelain=v1 -b -uall`, parses the header with `parseBranchHeader` (`utils/changes.ts`), and keeps it out of the file list.
  - The changes response carries `branch`: a string, `null` on a detached HEAD, absent outside a git repository.
  - The field is added to the schema, the shared type and `docs/api/changes.md`.
- **Tests:** both failed first.
  - `parseBranchHeader` covers the upstream, plain, unborn and detached forms.
  - `test/changes-branch.test.ts` checks a real repository on a feature branch, then detached.
