import type { StatsFs } from 'node:fs'
import { readFile, statfs } from 'node:fs/promises'
import { availableParallelism, freemem, loadavg, totalmem } from 'node:os'
import { join } from 'node:path'

// What the machine running BKD and its agents has left: the 1-minute load over the CPUs, and available memory and
// disk. Inside a container the cgroup limits are what there is, so they cap the host's figures.
export interface SystemStats {
  load: number
  cpus: number
  memAvailable: number
  memTotal: number
  diskFree: number
  diskTotal: number
}

async function text(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

// Memory from /proc/meminfo, capped by the cgroup v2 limit when there is one; the cgroup's inactive file cache can
// be reclaimed, so it counts as available. Without /proc the runtime's view of the machine is used.
async function memory(root: string): Promise<{ available: number, total: number }> {
  const info = await text(join(root, 'proc/meminfo'))
  const field = (name: string) => Number(info?.match(new RegExp(`^${name}:\\s+(\\d+) kB`, 'm'))?.[1] ?? Number.NaN) * 1024
  let total = info ? field('MemTotal') : totalmem()
  let available = info ? field('MemAvailable') : freemem()
  const limit = Number((await text(join(root, 'sys/fs/cgroup/memory.max')))?.trim())
  if (Number.isFinite(limit) && limit > 0) {
    const current = Number((await text(join(root, 'sys/fs/cgroup/memory.current')))?.trim() ?? 0)
    const inactive = Number((await text(join(root, 'sys/fs/cgroup/memory.stat')))?.match(/^inactive_file (\d+)/m)?.[1] ?? 0)
    total = Math.min(total, limit)
    available = Math.min(available, Math.max(0, limit - (current - inactive)))
  }
  return { available, total }
}

// The cgroup's CPU quota in CPUs when it has one, else the CPUs the process may use.
async function cpus(root: string): Promise<number> {
  const [quota, period] = ((await text(join(root, 'sys/fs/cgroup/cpu.max'))) ?? '').trim().split(/\s+/).map(Number)
  return quota && period && Number.isFinite(quota) ? quota / period : availableParallelism()
}

// Block counts are in fundamental blocks (frsize), as df counts them; bsize is only the preferred I/O size, which
// differs on some filesystems (1 MiB on virtiofs).
export function diskSpace(disk: { frsize: number, blocks: number, bavail: number }): { diskFree: number, diskTotal: number } {
  return { diskFree: disk.bavail * disk.frsize, diskTotal: disk.blocks * disk.frsize }
}

// `disk` is a path on the filesystem to measure; `root` relocates /proc and /sys for tests.
export async function readSystemStats(options: { root?: string, disk: string }): Promise<SystemStats> {
  const root = options.root ?? '/'
  // Bun's statfs reports frsize, which the installed @types/bun does not declare yet.
  const [mem, cpuCount, disk] = await Promise.all([
    memory(root),
    cpus(root),
    statfs(options.disk) as Promise<StatsFs & { frsize: number }>,
  ])
  return {
    load: loadavg()[0]!,
    cpus: cpuCount,
    memAvailable: mem.available,
    memTotal: mem.total,
    ...diskSpace(disk),
  }
}
