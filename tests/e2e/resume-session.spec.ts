import { expect, test } from '@playwright/test'

import { openFreshApp, startCet4Session } from './helpers'

test('refreshing restores the unfinished battle at the correct screen', async ({ page }) => {
  await openFreshApp(page)
  await startCet4Session(page)
  await page.reload()
  await page.getByRole('button', { name: '继续上次会话' }).click()
  await expect(page.getByRole('heading', { name: '墨团' })).toBeVisible()
  await expect(page.getByRole('button', { name: '结束回合' })).toBeVisible()
})
