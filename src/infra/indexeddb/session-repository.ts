import type { Result } from '../../core/shared/result'
import type { SessionState } from '../../core/session/model'
import type { RecallLog, SrsState } from '../../core/srs/model'
import { requestToPromise, withTransaction } from './database'
import type { StorageError } from './schema'

export function saveSessionSnapshot(
  database: IDBDatabase,
  session: SessionState,
): Promise<Result<void, StorageError>> {
  return withTransaction(
    database,
    'sessionSnapshots',
    'readwrite',
    async (transaction) => {
      await requestToPromise(
        transaction.objectStore('sessionSnapshots').put(session),
      )
    },
  )
}

export function getSessionSnapshot(
  database: IDBDatabase,
  sessionId: string,
): Promise<Result<SessionState | undefined, StorageError>> {
  return withTransaction(
    database,
    'sessionSnapshots',
    'readonly',
    (transaction) =>
      requestToPromise<SessionState | undefined>(
        transaction.objectStore('sessionSnapshots').get(sessionId),
      ),
  )
}

export function listSessionSnapshots(
  database: IDBDatabase,
): Promise<Result<readonly SessionState[], StorageError>> {
  return withTransaction(
    database,
    'sessionSnapshots',
    'readonly',
    (transaction) =>
      requestToPromise<SessionState[]>(
        transaction.objectStore('sessionSnapshots').getAll(),
      ),
  )
}

export function deleteSessionSnapshot(
  database: IDBDatabase,
  sessionId: string,
): Promise<Result<void, StorageError>> {
  return withTransaction(
    database,
    'sessionSnapshots',
    'readwrite',
    async (transaction) => {
      await requestToPromise(
        transaction.objectStore('sessionSnapshots').delete(sessionId),
      )
    },
  )
}

export function saveSessionProgressAtomically(
  database: IDBDatabase,
  session: SessionState,
  recall?: { readonly state: SrsState; readonly log: RecallLog },
): Promise<Result<void, StorageError>> {
  const stores = recall
    ? (['sessionSnapshots', 'srsStates', 'recallLogs'] as const)
    : (['sessionSnapshots'] as const)
  return withTransaction(database, stores, 'readwrite', async (transaction) => {
    if (recall) {
      await requestToPromise(
        transaction.objectStore('srsStates').put(recall.state),
      )
      await requestToPromise(
        transaction.objectStore('recallLogs').add(recall.log),
      )
    }
    await requestToPromise(
      transaction.objectStore('sessionSnapshots').put(session),
    )
  })
}
