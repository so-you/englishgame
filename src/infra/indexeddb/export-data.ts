import type { ContentPack } from '../../core/learning/model'
import { err, type Result } from '../../core/shared/result'
import type { SessionState } from '../../core/session/model'
import type { RecallLog, SrsState } from '../../core/srs/model'
import { requestToPromise, withTransaction } from './database'
import {
  DATABASE_VERSION,
  STORE_NAMES,
  type DiagnosticEventRecord,
  type StorageError,
  type UserSettings,
} from './schema'

export interface UserDataExport {
  readonly schemaVersion: number
  readonly exportedAt: number
  readonly data: {
    readonly contentPacks: readonly ContentPack[]
    readonly srsStates: readonly SrsState[]
    readonly recallLogs: readonly RecallLog[]
    readonly sessionSnapshots: readonly SessionState[]
    readonly settings: readonly UserSettings[]
    readonly diagnosticEvents: readonly DiagnosticEventRecord[]
  }
}

export function exportUserData(
  database: IDBDatabase,
  exportedAt: number,
): Promise<Result<UserDataExport, StorageError>> {
  return withTransaction(database, STORE_NAMES, 'readonly', async (transaction) => {
    const [
      contentPacks,
      srsStates,
      recallLogs,
      sessionSnapshots,
      settings,
      diagnosticEvents,
    ] = await Promise.all([
      requestToPromise<ContentPack[]>(
        transaction.objectStore('contentPacks').getAll(),
      ),
      requestToPromise<SrsState[]>(transaction.objectStore('srsStates').getAll()),
      requestToPromise<RecallLog[]>(transaction.objectStore('recallLogs').getAll()),
      requestToPromise<SessionState[]>(
        transaction.objectStore('sessionSnapshots').getAll(),
      ),
      requestToPromise<UserSettings[]>(transaction.objectStore('settings').getAll()),
      requestToPromise<DiagnosticEventRecord[]>(
        transaction.objectStore('diagnosticEvents').getAll(),
      ),
    ])
    return {
      schemaVersion: DATABASE_VERSION,
      exportedAt,
      data: {
        contentPacks,
        srsStates,
        recallLogs,
        sessionSnapshots,
        settings,
        diagnosticEvents,
      },
    }
  })
}

export function resetAllData(
  database: IDBDatabase,
  confirmed: boolean,
): Promise<Result<void, StorageError>> {
  if (!confirmed) {
    return Promise.resolve(
      err({
        code: 'confirmation-required',
        message: '重置全部数据前必须获得用户确认。',
      }),
    )
  }
  return withTransaction(database, STORE_NAMES, 'readwrite', async (transaction) => {
    await Promise.all(
      STORE_NAMES.map((storeName) =>
        requestToPromise(transaction.objectStore(storeName).clear()),
      ),
    )
  })
}
