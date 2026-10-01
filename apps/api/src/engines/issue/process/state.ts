import type { EngineContext } from '@/engines/issue/context'
import type { ManagedProcess } from '@/engines/issue/types'
import type { ProcessStatus } from '@/engines/types'

// ---------- Starts in flight ----------

/**
 * Mark an issue as starting for the duration of `fn` (see IssueEngine.trackStart).
 * The counter is raised synchronously, before `fn` runs, so a reconciler pass
 * either observes it or starts after the start's own write.
 */
export async function trackStart<T>(ctx: EngineContext, issueId: string, fn: () => Promise<T>): Promise<T> {
  const depth = ctx.startsInFlight.get(issueId) ?? 0
  ctx.startsInFlight.set(issueId, depth + 1)
  try {
    return await fn()
  } finally {
    const current = ctx.startsInFlight.get(issueId) ?? 1
    if (current > 1) {
      ctx.startsInFlight.set(issueId, current - 1)
    } else {
      ctx.startsInFlight.delete(issueId)
    }
  }
}

// ---------- Active process queries ----------

export function getActiveProcesses(ctx: EngineContext): ManagedProcess[] {
  return ctx.pm.getActive().map(e => e.meta)
}

export function getActiveProcessForIssue(
  ctx: EngineContext,
  issueId: string,
): ManagedProcess | undefined {
  return ctx.pm.getFirstActiveInGroup(issueId)?.meta
}

// ---------- Domain data cleanup ----------

export function cleanupDomainData(ctx: EngineContext, executionId: string): void {
  ctx.entryCounters.delete(executionId)
  ctx.turnIndexes.delete(executionId)
}

/**
 * Sync ProcessManager state with the domain state set by IssueEngine.
 *  PM's transitionState is idempotent, so double-sets are safe.
 */
export function syncPmState(ctx: EngineContext, executionId: string, state: ProcessStatus): void {
  if (state === 'completed') ctx.pm.markCompleted(executionId)
  else if (state === 'failed') ctx.pm.markFailed(executionId)
  // 'cancelled' is handled by pm.terminate() in cancel()
}
