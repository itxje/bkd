import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expectSuccess, get, post } from './helpers'
/**
 * The changes of an issue name the branch its working directory is on.
 */
import './setup'

let dir: string
let projectId: string

function git(...args: string[]) {
  const result = Bun.spawnSync(['git', '-C', dir, ...args])
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
}

beforeAll(async () => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'changes-branch-')))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'fixture@example.test')
  git('config', 'user.name', 'Fixture')
  writeFileSync(join(dir, 'README.md'), 'hello\n')
  git('add', '.')
  git('commit', '-qm', 'first')
  git('checkout', '-qb', 'feature/branch-name')
  writeFileSync(join(dir, 'README.md'), 'hello again\n')
  projectId = expectSuccess(await post<{ id: string }>('/api/projects', { name: 'Branch Project', directory: dir })).id
})

afterAll(() => rmSync(dir, { recursive: true, force: true }))

test('the changes name the current branch, and none on a detached HEAD', async () => {
  const issue = expectSuccess(await post<{ id: string }>(`/api/projects/${projectId}/issues`, { title: 'Branch', statusId: 'todo' }))
  const changes = expectSuccess(await get<{ branch: string | null, files: Array<{ path: string }> }>(`/api/projects/${projectId}/issues/${issue.id}/changes`))
  expect(changes.branch).toBe('feature/branch-name')
  // The header line is not taken for a changed file.
  expect(changes.files.map(file => file.path)).toEqual(['README.md'])
  git('checkout', '-q', '--detach')
  const detached = expectSuccess(await get<{ branch: string | null }>(`/api/projects/${projectId}/issues/${issue.id}/changes`))
  expect(detached.branch).toBeNull()
})
