import { expect, test } from 'bun:test'
import app from '@/app'
import './setup'

// Without an immediate write, clients see no response bytes until the first event or heartbeat.
test('the event stream sends a first chunk as soon as it opens', async () => {
  const controller = new AbortController()
  const res = await app.request('/api/events', { signal: controller.signal })
  expect(res.status).toBe(200)
  const reader = res.body!.getReader()
  try {
    const first = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no first chunk within 1 s')), 1000)),
    ])
    expect(new TextDecoder().decode(first.value)).toBe(': connected\n\n')
  } finally {
    controller.abort()
    await reader.cancel().catch(() => {})
  }
})
