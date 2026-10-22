import { describe, expect, test } from 'bun:test'
import { ClaudeProtocolHandler } from '@/engines/executors/claude'
import type { StdinWriter } from '@/engines/spawn'
import type { PermissionPolicy } from '@/engines/types'

function setPermissionModeRequest(policy: PermissionPolicy, skipPermissions?: boolean) {
  const written: string[] = []
  const stdin: StdinWriter = {
    write(data) {
      written.push(String(data))
    },
    end() {},
  }
  new ClaudeProtocolHandler(stdin).setPermissionMode(policy, skipPermissions)
  expect(written).toHaveLength(1)
  return JSON.parse(written[0]!) as { type: string, request: { subtype: string, mode: string } }
}

describe('ClaudeProtocolHandler.setPermissionMode', () => {
  test('sends bypassPermissions when permissions are skipped', () => {
    const msg = setPermissionModeRequest('auto', true)
    expect(msg.type).toBe('control_request')
    expect(msg.request).toEqual({ subtype: 'set_permission_mode', mode: 'bypassPermissions' })
  })

  test('maps the policy when permissions are not skipped', () => {
    expect(setPermissionModeRequest('auto', false).request.mode).toBe('auto')
    expect(setPermissionModeRequest('auto').request.mode).toBe('auto')
    expect(setPermissionModeRequest('plan').request.mode).toBe('plan')
    expect(setPermissionModeRequest('supervised').request.mode).toBe('default')
  })
})
