import { expect, test } from '@playwright/test'

import type { RecallLog, SrsState } from '../../src/core/srs/model'
import {
  openFreshApp,
  overchargeTerm,
  readStore,
  startCet4Session,
} from './helpers'

test('a due window grades once and remains protected after refresh and resume', async ({ page }) => {
  await openFreshApp(page)
  await startCet4Session(page)
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('english-roguelike')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction(
      ['srsStates', 'sessionSnapshots'],
      'readwrite',
    )
    const states = transaction.objectStore('srsStates')
    const all = await new Promise<SrsState[]>((resolve, reject) => {
      const request = states.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    for (const state of all) {
      states.put({ ...state, dueAt: Date.now() - 1_000, lastGradedDueAt: undefined })
    }
    transaction.objectStore('sessionSnapshots').clear()
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
  })

  await page.reload()
  await page.getByLabel('每局新词数量').evaluate((element) => {
    const select = element as HTMLSelectElement
    select.value = '0'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(page.getByLabel('每局新词数量')).toHaveValue('0')
  await page.getByRole('button', { name: '开始本次学习' }).click()
  await expect(page.getByRole('heading', { name: '墨团' })).toBeVisible()
  await overchargeTerm(page, 'abandon')
  const first = (await readStore<SrsState>(page, 'srsStates')).find(
    (state) => state.unitId === 'cet4:abandon:leave',
  )!
  expect(first.mastery).toBe(2)

  await page.reload()
  await page.getByRole('button', { name: '继续上次会话' }).click()
  await overchargeTerm(page, 'abandon')
  const second = (await readStore<SrsState>(page, 'srsStates')).find(
    (state) => state.unitId === 'cet4:abandon:leave',
  )!
  expect(second).toEqual(first)
  const attempts = (await readStore<RecallLog>(page, 'recallLogs')).filter(
    (log) => log.unitId === 'cet4:abandon:leave' && log.kind !== 'teaching',
  )
  expect(attempts).toHaveLength(2)
  expect(attempts.map((log) => log.graded).sort()).toEqual([false, true])
})
