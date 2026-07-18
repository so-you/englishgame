import type { Result } from '../../core/shared/result'
import { requestToPromise, withTransaction } from './database'
import type { StorageError, UserSettings } from './schema'

export function saveSettings(
  database: IDBDatabase,
  settings: UserSettings,
): Promise<Result<void, StorageError>> {
  return withTransaction(database, 'settings', 'readwrite', async (transaction) => {
    await requestToPromise(transaction.objectStore('settings').put(settings))
  })
}

export function getSettings(
  database: IDBDatabase,
): Promise<Result<UserSettings | undefined, StorageError>> {
  return withTransaction(database, 'settings', 'readonly', (transaction) =>
    requestToPromise<UserSettings | undefined>(
      transaction.objectStore('settings').get('app'),
    ),
  )
}
