import type { DiagnosticEvent } from './model'

export interface MvpDiagnosticsMetrics {
  readonly sessionsStarted: number
  readonly sessionsCompleted: number
  readonly sessionCompletionPercent: number
  readonly averageFocusUsagePercent: number
  readonly averageDueCoveragePercent: number
  readonly abandonedByPhase: Readonly<Record<string, number>>
}

function numericPayload(event: DiagnosticEvent, key: string): number {
  const value = event.payload[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function calculateMvpMetrics(
  events: readonly DiagnosticEvent[],
): MvpDiagnosticsMetrics {
  const starts = events.filter((event) => event.type === 'session_started')
  const completed = events.filter((event) => event.type === 'session_completed')
  const abandonedByPhase: Record<string, number> = {}
  for (const event of events.filter(
    (candidate) => candidate.type === 'session_abandoned',
  )) {
    const phase =
      typeof event.payload.phase === 'string' ? event.payload.phase : 'unknown'
    abandonedByPhase[phase] = (abandonedByPhase[phase] ?? 0) + 1
  }

  return {
    sessionsStarted: starts.length,
    sessionsCompleted: completed.length,
    sessionCompletionPercent:
      starts.length === 0 ? 0 : Math.round((completed.length / starts.length) * 100),
    averageFocusUsagePercent: average(
      completed.map((event) => numericPayload(event, 'focusUsagePercent')),
    ),
    averageDueCoveragePercent: average(
      completed.map((event) => numericPayload(event, 'dueCoveragePercent')),
    ),
    abandonedByPhase,
  }
}
