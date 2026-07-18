export type DiagnosticEventType =
  | 'session_started'
  | 'teaching_completed'
  | 'battle_started'
  | 'battle_completed'
  | 'card_played_direct'
  | 'overcharge_started'
  | 'overcharge_resolved'
  | 'due_unit_attempted'
  | 'session_completed'
  | 'session_abandoned'
  | 'import_completed'

export type DiagnosticPrimitive = string | number | boolean | null

export interface DiagnosticEvent {
  readonly id: string
  readonly type: DiagnosticEventType
  readonly sessionId?: string
  readonly createdAt: number
  readonly payload: Readonly<Record<string, DiagnosticPrimitive>>
}

export interface DiagnosticEventInput {
  readonly id: string
  readonly type: DiagnosticEventType
  readonly sessionId?: string
  readonly createdAt: number
  readonly payload?: Readonly<Record<string, unknown>>
}
