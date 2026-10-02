import { describe, expect, test } from 'bun:test'
import { countTextLines, isPathInsideRoot, parseBranchHeader } from '@/utils/changes'

describe('isPathInsideRoot', () => {
  test('allows simple relative paths', () => {
    expect(isPathInsideRoot('/repo', 'src/file.ts')).toBe(true)
  })

  test('allows nested paths', () => {
    expect(isPathInsideRoot('/repo', 'a/b/c/d.txt')).toBe(true)
  })

  test('rejects parent traversal', () => {
    expect(isPathInsideRoot('/repo', '../etc/passwd')).toBe(false)
  })

  test('rejects traversal via intermediate ..', () => {
    expect(isPathInsideRoot('/repo', 'src/../../etc/passwd')).toBe(false)
  })

  test('rejects absolute path outside root', () => {
    expect(isPathInsideRoot('/repo', '/etc/passwd')).toBe(false)
  })

  test('allows root itself', () => {
    expect(isPathInsideRoot('/repo', '.')).toBe(true)
  })

  test('handles root with trailing slash', () => {
    expect(isPathInsideRoot('/repo/', 'file.ts')).toBe(true)
    expect(isPathInsideRoot('/repo/', '../x')).toBe(false)
  })
})

describe('countTextLines', () => {
  test('counts simple lines', () => {
    expect(countTextLines('a\nb\nc')).toBe(3)
  })

  test('handles trailing newline', () => {
    expect(countTextLines('a\nb\nc\n')).toBe(3)
  })

  test('handles CRLF', () => {
    expect(countTextLines('a\r\nb\r\nc')).toBe(3)
  })

  test('returns 0 for empty string', () => {
    expect(countTextLines('')).toBe(0)
  })

  test('single line no newline', () => {
    expect(countTextLines('hello')).toBe(1)
  })

  test('single line with newline', () => {
    expect(countTextLines('hello\n')).toBe(1)
  })
})

// `git status --porcelain=v1 -b` starts with a `## ` header naming the branch.
describe('parseBranchHeader', () => {
  test('names the branch with or without an upstream and tracking info', () => {
    expect(parseBranchHeader('## main...origin/main [ahead 1, behind 2]')).toBe('main')
    expect(parseBranchHeader('## feature/x')).toBe('feature/x')
    expect(parseBranchHeader('## bkd/abc [gone]')).toBe('bkd/abc')
  })

  test('names the branch of a repository without commits', () => {
    expect(parseBranchHeader('## No commits yet on main')).toBe('main')
    expect(parseBranchHeader('## Initial commit on main')).toBe('main')
  })

  test('has no branch on a detached HEAD or a line that is not the header', () => {
    expect(parseBranchHeader('## HEAD (no branch)')).toBeNull()
    expect(parseBranchHeader(' M src/file.ts')).toBeNull()
  })
})
