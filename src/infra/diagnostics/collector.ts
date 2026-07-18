import type { Result } from '../../core/shared/result'
import { requestToPromise, withTransaction } from '../indexeddb/database'
import type { StorageError } from '../indexeddb/schema'
import type {
  DiagnosticEvent,
  DiagnosticEventInput,
  DiagnosticPrimitive,
} from './model'

const SENSITIVE_KEY = /answer|response|input|raw|text|term|definition|meaning|example/i
const SAFE_STRING_KEYS = new Set([
  'phase',
  'encounter',
  'outcome',
  'exerciseKind',
])

function isPrimitive(value: unknown): value is DiagnosticPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/** Creates a local analytics event while dropping free-form or sensitive fields. */
export function createDiagnosticEvent(
  input: DiagnosticEventInput,
): DiagnosticEvent {
  const payload: Record<string, DiagnosticPrimitive> = {}
  for (const [key, value] of Object.entries(input.payload ?? {})) {
    const timingValue = key === 'responseMs' && typeof value === 'number'
    const safeString = typeof value !== 'string' || SAFE_STRING_KEYS.has(key)
    if (
      (timingValue || !SENSITIVE_KEY.test(key)) &&
      safeString &&
      isPrimitive(value)
    ) {
      payload[key] = value
    }
  }
  return {
    id: input.id,
    type: input.type,
    sessionId: input.sessionId,
    createdAt: input.createdAt,
    payload,
  }
}

export function recordDiagnosticEvents(
  database: IDBDatabase,
  events: readonly DiagnosticEvent[],
): Promise<Result<void, StorageError>> {
  return withTransaction(
    database,
    'diagnosticEvents',
    'readwrite',
    async (transaction) => {
      for (const event of events) {
        await requestToPromise(
          transaction.objectStore('diagnosticEvents').put(event),
        )
      }
    },
  )
}

export function listDiagnosticEvents(
  database: IDBDatabase,
): Promise<Result<readonly DiagnosticEvent[], StorageError>> {
  return withTransaction(
    database,
    'diagnosticEvents',
    'readonly',
    (transaction) =>
      requestToPromise<DiagnosticEvent[]>(
        transaction.objectStore('diagnosticEvents').getAll(),
      ),
  )
}

/** Future consented remote sinks can implement this port; the MVP has no network sink. */
export interface DiagnosticsSink {
  record(events: readonly DiagnosticEvent[]): Promise<Result<void, StorageError>>
}
