# System

## GET /api

API status check.

**Response:**

```json
{
  "success": true,
  "data": { "name": "bkd-api", "status": "ok", "routes": ["GET /api", "GET /api/health", "GET /api/runtime"] }
}
```

## GET /api/health

Health check with database status.

**Response:**

```json
{
  "success": true,
  "data": { "status": "ok", "version": "0.0.6", "commit": "abc1234", "db": "ok", "timestamp": "..." }
}
```

## GET /api/status

Detailed status with memory metrics.

**Response:**

```json
{
  "success": true,
  "data": {
    "uptime": 12345,
    "memory": { "rss": 0, "heapUsed": 0, "heapTotal": 0 },
    "db": { "ok": true }
  }
}
```

## GET /api/system

What the machine running BKD and its agents has left: the 1-minute load average and the CPU count, available and total memory, and free and total space on the filesystem holding `ROOT_DIR` (data and worktrees). Inside a container, the cgroup v2 limits cap memory and CPUs; reclaimable page cache counts as available memory. Sizes are in bytes. Disk space needs Bun 1.4 or later, the runtime `docs/bkd.lode.toml` pins: Bun 1.3's `statfs` has no `frsize`, and the two disk values are then `null`.

**Response:**

```json
{
  "success": true,
  "data": {
    "load": 4.13,
    "cpus": 8,
    "memAvailable": 16320000000,
    "memTotal": 25769803776,
    "diskFree": 103079215104,
    "diskTotal": 528280977408
  }
}
```

## GET /api/runtime

Runtime information including Bun/Node versions, process details, and platform info. Requires `ENABLE_RUNTIME_ENDPOINT=true` environment variable; returns `404` otherwise.

Sensitive fields (e.g. `execPath`) are stripped from the response.
