# 20261001-0952-event-stream-opens-at-once Open the event stream as soon as a client connects

- **status**: draft
- **createdAt**: 2026-10-01 09:52
- **approvedAt**: (pending)
- **relatedTask**: (created on approval)

## Context

### Symptom

A client of `GET /api/events` gets nothing back until something is written to the stream: the first event, or the first heartbeat, which comes after 15 s. Over HTTP, this means neither the status line nor the headers. A client therefore cannot tell an accepted connection from a slow one, and on an idle server it waits up to 15 s to learn that it is connected.

### Cause

`apps/api/src/routes/events.ts` returns `streamSSE(c, ...)`. The callback subscribes to the app events, starts a 15 s heartbeat interval, and then waits. The response body produces its first chunk only at the first `writeSSE()`, and the server sends the response with that chunk. Nothing is written when the stream opens, so the response waits for the first event or heartbeat.

`apps/api/test/events-stream-opens-at-once.test.ts` reads the first chunk of `/api/events` with a 1 s limit:

- Against the current route, it fails with `no first chunk within 1 s`.
- With the change below, it passes.

### Effect on clients

The wait is long even on a busy server, because the stream carries few events: it sends only finished log entries, not the streaming ones. On 2026-10-01, with 13 executions active:

- **Measured opens:** three opens timed at the socket received the headers, together with the first event, after 3.0 s, 5.8 s and 2.1 s.
- **Two-minute sample:** the stream carried 30 events and 7 heartbeats. A connection opened at a random moment in that sample would wait more than 2 s 64% of the time, and more than 5 s 33% of the time; the longest gap was 15 s.

On an idle server the wait is always the full 15 s, because the heartbeat interval starts when the connection opens.

- **Web client** (`apps/frontend/src/lib/event-bus.ts`):
  - **Connection icon:** `EventSource.onopen` fires only when the response arrives. Until then the sidebar connection icon (`AppSidebar` and `MobileSidebar`) shows the red `WifiOff`, for up to 15 s after the page loads and after every reconnect.
  - **Late refetch:** the refetch that `main.tsx` runs on connect (`invalidateQueries()`) and the 35 s heartbeat watchdog both start late.
  - **What still works:** page data loads through its own queries and does not wait. An event published while the response is pending opens the response itself, so no event is lost. Comments are ignored by `EventSource`.
- **Other clients:**
  - `fetch()` resolves only when the headers arrive, so a client that waits for the response before reading its initial state waits up to 15 s at start. bkd-tui did this until it began reading the lists without waiting for the stream.
  - A client or proxy with a response-header timeout shorter than 15 s drops an idle stream before it ever opens, then reconnects into the same wait.

## Proposal

### Change

Write an SSE comment right after the subscriptions are in place, before the heartbeat interval starts:

```ts
// The response is sent with its first write; a comment opens it at once, after the
// subscriptions above, instead of at the first event or heartbeat.
stream.write(': connected\n\n').catch(stop)
```

- **Order:** the comment is written after every `appEvents.on(...)`, so an event published after the client sees the response is always delivered.
- **Why a comment:** lines starting with `:` are comments in the SSE format. `EventSource` and every SSE parser ignore them, so no client sees a new event type, and none changes behaviour beyond receiving the response earlier.
- **Failure:** a failed write ends the stream through the existing `stop`, as a failed event write does.

### Test

Add `apps/api/test/events-stream-opens-at-once.test.ts`. It opens `/api/events` and expects the first chunk to be `: connected\n\n` within 1 s. It fails on the current route and passes with the change.

## Risks

- **Clients that treat any data as an event:** a hand-written SSE reader that does not skip comment lines would see one extra block with no `event` or `data` field. The SSE specification requires ignoring it, and the web client and bkd-tui both do.
- **Proxies:** nothing changes for proxies that buffer `text/event-stream`. They delay events and heartbeats alike, which the comment does not fix; they need buffering turned off, for example `proxy_buffering off` or `X-Accel-Buffering: no`.

## Scope

- `apps/api/src/routes/events.ts`: one write and its comment.
- `apps/api/test/events-stream-opens-at-once.test.ts`: the new test.
- There is no change to the event types, the heartbeat or the client.

## Alternatives

- **A named `connected` event.** This adds an event type that clients must ignore or handle. Readers that reject unknown event names would report an error. Rejected.
- **An immediate heartbeat.** Clients that measure heartbeat intervals would see an extra one. It also gives the heartbeat a second meaning. Rejected.
- **A `retry:` field as the first write.** This also opens the response, but it changes how the client reconnects, which this fix has no reason to touch. Rejected.
- **Flushing headers without a body write.** `streamSSE` exposes no way to send the headers alone, and the comment is the standard way to do this in SSE. Rejected.

## Annotations

The change and its test sit uncommitted in this checkout: `apps/api/src/routes/events.ts` and `apps/api/test/events-stream-opens-at-once.test.ts`. The write-up doubles as the upstream issue text.
