import { expect, test } from 'bun:test'
import app from '@/app'
import { appEvents } from '@/events'
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

test('message events are subscribed before the opening chunk is consumed', async () => {
  const controller = new AbortController()
  const res = await app.request('/api/events', { signal: controller.signal })
  const reader = res.body!.getReader()
  const event = {
    id: 'message-test',
    kind: 'decision' as const,
    expects: 'reply' as const,
    campaignId: 'campaign-test',
    status: 'open' as const,
  }
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    appEvents.emit('message-updated', event)
    const chunks = await Promise.race([
      (async () => {
        const decoder = new TextDecoder()
        let text = ''
        while (!text.includes(`data: ${JSON.stringify(event)}\n\n`)) {
          const chunk = await reader.read()
          if (chunk.done) throw new Error('stream ended before the message event')
          text += decoder.decode(chunk.value, { stream: true })
        }
        return text
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('no message event within 1 s')), 1000)
      }),
    ])
    expect(chunks).toStartWith(': connected\n\n')
    expect(chunks).toContain('event: message-updated\n')
  } finally {
    clearTimeout(timeout)
    controller.abort()
    await reader.cancel().catch(() => {})
  }
})
