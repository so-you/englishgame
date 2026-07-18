import { expect, test } from '@playwright/test'

import type { RecallLog, SrsState } from '../../src/core/srs/model'
import { openFreshApp, readStore, startCet4Session } from './helpers'

test('direct card play creates no recall log and changes no SRS state', async ({ page }) => {
  await openFreshApp(page)
  await startCet4Session(page)
  const statesBefore = await readStore<SrsState>(page, 'srsStates')
  const logsBefore = await readStore<RecallLog>(page, 'recallLogs')

  const card = page.locator('.combat-card:not(:disabled)').first()
  await card.click()
  await page.getByRole('button', { name: '直接打出' }).click()

  expect(await readStore<SrsState>(page, 'srsStates')).toEqual(statesBefore)
  expect(await readStore<RecallLog>(page, 'recallLogs')).toEqual(logsBefore)
})
