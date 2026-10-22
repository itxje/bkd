# 20261022-1323-claude-skip-permissions-bypass Put Claude sessions in bypassPermissions when skip permissions is on

- **status**: completed
- **priority**: P1
- **owner**: claude/session-main
- **createdAt**: 2026-10-22 13:23

## Description

The `engine:claude:dangerouslySkipPermissions` setting has no effect. The executor adds `--dangerously-skip-permissions` to the CLI, but `spawnProcess` then sends `set_permission_mode` with the `auto` policy. Since `mapPermissionMode` maps `auto` to Claude's classifier-driven `auto` mode, that request moves the session out of bypass mode.

Acceptance criteria:

- With skip permissions on, the `set_permission_mode` control request carries `bypassPermissions`.
- With skip permissions off, the mode is `mapPermissionMode(policy)`, unchanged.
- A protocol test with a fake stdin writer covers both cases and fails before the fix.

## ActiveForm

Making skip permissions put Claude sessions in bypassPermissions mode

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- **Code:**
  - `ClaudeProtocolHandler.setPermissionMode(policy, skipPermissions = false)` sends `bypassPermissions` when `skipPermissions` is true, and `mapPermissionMode(policy)` otherwise.
  - `spawnProcess` passes the skip-permissions setting through.
- **Tests:** `test/claude-permission-mode.test.ts` uses a fake stdin writer. The bypass case failed before the fix (it received `auto`); it covers skip on and off, plus the `plan` and `supervised` mappings.
- **Verification:** API suite 942 pass, 1 skip, 0 fail. Lint and typecheck pass.

- complete: skip permissions now sends bypassPermissions; see notes
