import type { DiagnosticEvent } from './model'
import { calculateMvpMetrics, type MvpDiagnosticsMetrics } from './metrics'

export interface DiagnosticsExport {
  readonly schemaVersion: 1
  readonly exportedAt: number
  readonly notice: string
  readonly metrics: MvpDiagnosticsMetrics
  readonly events: readonly DiagnosticEvent[]
}

export function buildDiagnosticsExport(
  events: readonly DiagnosticEvent[],
  exportedAt: number,
): DiagnosticsExport {
  return {
    schemaVersion: 1,
    exportedAt,
    notice: '仅包含本地匿名状态和数值；不包含作答文本或导入原文。',
    metrics: calculateMvpMetrics(events),
    events,
  }
}
