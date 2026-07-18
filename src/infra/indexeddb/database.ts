import { err, ok, type Result } from '../../core/shared/result'
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  STORE_NAMES,
  type StorageError,
  type StoreName,
} from './schema'

export interface OpenDatabaseOptions {
  readonly name?: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function createSchema(database: IDBDatabase): void {
  const contentPacks = database.createObjectStore('contentPacks', {
    keyPath: 'id',
  })
  contentPacks.createIndex('byStage', 'stage', { unique: false })
  database.createObjectStore('srsStates', { keyPath: 'unitId' })
  const recallLogs = database.createObjectStore('recallLogs', { keyPath: 'id' })
  recallLogs.createIndex('byUnitId', 'unitId', { unique: false })
  recallLogs.createIndex('bySessionId', 'sessionId', { unique: false })
  database.createObjectStore('sessionSnapshots', { keyPath: 'id' })
  database.createObjectStore('settings', { keyPath: 'id' })
  const diagnosticEvents = database.createObjectStore('diagnosticEvents', {
    keyPath: 'id',
  })
  diagnosticEvents.createIndex('byCreatedAt', 'createdAt', { unique: false })
}

export function openEnglishGameDatabase(
  options: OpenDatabaseOptions = {},
): Promise<Result<IDBDatabase, StorageError>> {
  const name = options.name ?? DATABASE_NAME
  return new Promise((resolve) => {
    const request = indexedDB.open(name, DATABASE_VERSION)
    let migrationFailure: unknown
    let settled = false
    const finish = (result: Result<IDBDatabase, StorageError>) => {
      if (!settled) {
        settled = true
        resolve(result)
      }
    }

    request.onupgradeneeded = (event) => {
      try {
        if (event.oldVersion === 0) createSchema(request.result)
      } catch (error) {
        migrationFailure = error
        request.transaction?.abort()
      }
    }
    request.onsuccess = () => {
      const database = request.result
      const missingStore = STORE_NAMES.find(
        (storeName) => !database.objectStoreNames.contains(storeName),
      )
      if (missingStore) {
        database.close()
        finish(
          err({
            code: 'migration-failed',
            message: `数据库缺少对象存储 ${missingStore}，数据未被清除。`,
          }),
        )
        return
      }
      finish(ok(database))
    }
    request.onerror = () => {
      const requestError = request.error
      if (requestError?.name === 'VersionError') {
        finish(
          err({
            code: 'unsupported-schema',
            message: '本地数据由更新版本创建，请升级应用后重试。',
            cause: requestError.message,
          }),
        )
      } else if (migrationFailure) {
        finish(
          err({
            code: 'migration-failed',
            message: '本地数据升级失败，原数据未被清除。',
            cause: errorMessage(migrationFailure),
          }),
        )
      } else {
        finish(
          err({
            code: 'open-failed',
            message: '无法打开本地数据库。',
            cause: requestError?.message,
          }),
        )
      }
    }
    request.onblocked = () => {
      finish(
        err({
          code: 'open-failed',
          message: '数据库升级被其他页面阻塞，请关闭其他页面后重试。',
        }),
      )
    }
  })
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'))
  })
}

export async function withTransaction<T>(
  database: IDBDatabase,
  stores: StoreName | readonly StoreName[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => Promise<T>,
): Promise<Result<T, StorageError>> {
  let transaction: IDBTransaction | undefined
  try {
    transaction = database.transaction(stores, mode)
    let completionError: unknown
    const completion = transactionToPromise(transaction).catch((error: unknown) => {
      completionError = error
    })
    const value = await operation(transaction)
    await completion
    if (completionError) throw completionError
    return ok(value)
  } catch (error) {
    try {
      transaction?.abort()
    } catch {
      // The transaction may already have aborted because a request failed.
    }
    return err({
      code: 'transaction-failed',
      message: '本地数据事务失败，未提交部分更新。',
      cause: errorMessage(error),
    })
  }
}

export function deleteEnglishGameDatabase(name = DATABASE_NAME): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Database deletion was blocked'))
  })
}
