import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { diskSpace, readSystemStats } from '@/utils/system-stats'
import { expectSuccess, get } from './helpers'
/**
 * Host resources: the reader against a fake /proc and cgroup tree, and GET /api/system.
 */
import './setup'

const GB = 2 ** 30
const meminfo = 'MemTotal:       31876000 kB\nMemFree:         1000000 kB\nMemAvailable:   15000000 kB\n'

function fakeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'system-stats-'))
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  return root
}

describe('readSystemStats', () => {
  test('without a cgroup limit, memory is the host\'s available memory', async () => {
    const root = fakeRoot({ 'proc/meminfo': meminfo, 'sys/fs/cgroup/memory.max': 'max\n', 'sys/fs/cgroup/cpu.max': 'max 100000\n' })
    try {
      const stats = await readSystemStats({ root, disk: '/' })
      expect(stats.memTotal).toBe(31876000 * 1024)
      expect(stats.memAvailable).toBe(15000000 * 1024)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  // In a container the cgroup limit is the memory there is; reclaimable page cache does not count as used.
  test('a cgroup limit caps memory, counting inactive file cache as available, and a CPU quota sets the CPUs', async () => {
    const root = fakeRoot({
      'proc/meminfo': meminfo,
      'sys/fs/cgroup/memory.max': `${24 * GB}\n`,
      'sys/fs/cgroup/memory.current': `${20 * GB}\n`,
      'sys/fs/cgroup/memory.stat': `anon 1\ninactive_file ${4 * GB}\n`,
      'sys/fs/cgroup/cpu.max': '200000 100000\n',
    })
    try {
      const stats = await readSystemStats({ root, disk: '/' })
      expect(stats.memTotal).toBe(24 * GB)
      expect(stats.memAvailable).toBe(8 * GB)
      expect(stats.cpus).toBe(2)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

// Block counts are in fundamental blocks, as df counts them; virtiofs reports a 1 MiB preferred I/O size.
test('disk space counts fundamental blocks, not the preferred I/O size', () => {
  const reported = { frsize: 4096, bsize: 1048576, blocks: 1000, bavail: 250 }
  expect(diskSpace(reported)).toEqual({ diskFree: 250 * 4096, diskTotal: 1000 * 4096 })
})

describe('GET /api/system', () => {
  test('reports load, CPUs, memory and the disk holding the data', async () => {
    const data = expectSuccess(await get<Record<string, number>>('/api/system'))
    for (const key of ['load', 'cpus', 'memAvailable', 'memTotal', 'diskFree', 'diskTotal']) expect(typeof data[key]).toBe('number')
    expect(data.cpus).toBeGreaterThan(0)
    expect(data.memAvailable).toBeLessThanOrEqual(data.memTotal!)
    expect(data.diskFree).toBeLessThanOrEqual(data.diskTotal!)
    expect(data.diskTotal).toBeGreaterThan(0)
  })
})
