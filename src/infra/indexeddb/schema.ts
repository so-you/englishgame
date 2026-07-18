export const DATABASE_NAME = 'english-roguelike'
export const DATABASE_VERSION = 1

export const STORE_NAMES = [
  'contentPacks',
  'srsStates',
  'recallLogs',
  'sessionSnapshots',
  'settings',
  'diagnosticEvents',
] as const

export type StoreName = (typeof STORE_NAMES)[number]

export interface UserSettings {
  readonly id: 'app'
  readonly newUnitQuota: number
  readonly reducedMotion: boolean
  readonly showTimingHints: boolean
  readonly speechEnabled: boolean
}

export interface DiagnosticEventRecord {
  readonly id: string
  readonly type: string
  readonly sessionId?: string
  readonly createdAt: number
  readonly payload: Readonly<Record<string, unknown>>
}

export type StorageErrorCode =
  | 'open-failed'
  | 'unsupported-schema'
  | 'migration-failed'
  | 'transaction-failed'
  | 'confirmation-required'

export interface StorageError {
  readonly code: StorageErrorCode
  readonly message: string
  readonly cause?: string
}
