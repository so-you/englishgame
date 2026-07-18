import type { RecallLog, SrsState } from '../../core/srs/model'
import type { Result } from '../../core/shared/result'
import {
  requestToPromise,
  withTransaction,
} from './database'
import type { StorageError } from './schema'

export function saveRecallAtomically(
  database: IDBDatabase,
  state: SrsState,
  log: RecallLog,
): Promise<Result<void, StorageError>> {
  return withTransaction(
    database,
    ['srsStates', 'recallLogs'],
    'readwrite',
    async (transaction) => {
      await requestToPromise(transaction.objectStore('srsStates').put(state))
      await requestToPromise(transaction.objectStore('recallLogs').add(log))
    },
  )
}

export function getSrsState(
  database: IDBDatabase,
  unitId: string,
): Promise<Result<SrsState | undefined, StorageError>> {
  return withTransaction(database, 'srsStates', 'readonly', (transaction) =>
    requestToPromise<SrsState | undefined>(
      transaction.objectStore('srsStates').get(unitId),
    ),
  )
}

export function listSrsStates(
  database: IDBDatabase,
): Promise<Result<readonly SrsState[], StorageError>> {
  return withTransaction(database, 'srsStates', 'readonly', (transaction) =>
    requestToPromise<SrsState[]>(
      transaction.objectStore('srsStates').getAll(),
    ),
  )
}

export function listRecallLogs(
  database: IDBDatabase,
): Promise<Result<readonly RecallLog[], StorageError>> {
  return withTransaction(database, 'recallLogs', 'readonly', (transaction) =>
    requestToPromise<RecallLog[]>(
      transaction.objectStore('recallLogs').getAll(),
    ),
  )
}
