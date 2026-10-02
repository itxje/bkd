# 20261002-2017-host-resources-endpoint Report the host's load, memory and disk

- **status**: completed
- **priority**: P2
- **owner**: claude/session-main
- **createdAt**: 2026-10-02 20:17

## Description

Clients that follow a remote BKD cannot see what the machine running its agents has left. `GET /api/status` reports only the BKD process's own memory. Add `GET /api/system`, which reports:

- the 1-minute load average and the CPU count;
- available and total memory;
- free and total space on the filesystem holding `ROOT_DIR`.

Inside a container, the cgroup v2 limits cap memory and CPUs.

## ActiveForm

Reporting the host's load, memory and disk

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- **Code:**
  - `apps/api/src/utils/system-stats.ts` reads `/proc/meminfo` capped by `memory.max`, counting `inactive_file` as available, plus `cpu.max` and statfs.
  - The route is `R.getSystem` in `openapi/routes.ts`, served in `routes/api.ts`.
  - `docs/api/system.md` documents it.
- **Tests:** `test/system-stats.test.ts` covers the reader against a fake `/proc` and cgroup tree (with and without limits) and the route. Both failed first.
- 2026-10-02 20:21 Disk space counts fundamental blocks (statfs frsize), as df does; bsize is only the preferred I/O size and is 1 MiB on virtiofs. The installed @types/bun does not declare frsize, so statfs is narrowed with a comment. Test failed first.
