import type { ContentPack } from '../../core/learning/model'
import type { Result } from '../../core/shared/result'
import { requestToPromise, withTransaction } from './database'
import type { StorageError } from './schema'

export function saveContentPack(
  database: IDBDatabase,
  pack: ContentPack,
): Promise<Result<void, StorageError>> {
  return withTransaction(database, 'contentPacks', 'readwrite', async (transaction) => {
    await requestToPromise(transaction.objectStore('contentPacks').put(pack))
  })
}

export function listContentPacks(
  database: IDBDatabase,
): Promise<Result<readonly ContentPack[], StorageError>> {
  return withTransaction(database, 'contentPacks', 'readonly', (transaction) =>
    requestToPromise<ContentPack[]>(
      transaction.objectStore('contentPacks').getAll(),
    ),
  )
}
