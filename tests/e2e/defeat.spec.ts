import { expect, test } from '@playwright/test'

import type { RecallLog } from '../../src/core/srs/model'
import {
  endTurnAndWait,
  openFreshApp,
  overchargeTerm,
  readStore,
  startCet4Session,
} from './helpers'

test('defeat preserves recall logs already earned in the battle', async ({ page }) => {
  await openFreshApp(page)
  await startCet4Session(page)
  await overchargeTerm(page, 'abandon')

  for (let turn = 0; turn < 30; turn += 1) {
    if (await page.getByRole('heading', { name: '战斗失利，学习没有白费' }).count()) break
    await endTurnAndWait(page)
  }

  await expect(page.getByRole('heading', { name: '战斗失利，学习没有白费' })).toBeVisible()
  await expect(page.getByText(/学习记录已经保存/)).toBeVisible()
  const recalls = (await readStore<RecallLog>(page, 'recallLogs')).filter(
    (log) => log.kind !== 'teaching',
  )
  expect(recalls).toHaveLength(1)
})
