import { expect, test } from '@playwright/test'

import { openFreshApp, playBattle, startCet4Session } from './helpers'

test('a first-time learner completes teaching, three battles, and settlement', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await openFreshApp(page)
  await startCet4Session(page)

  expect(await playBattle(page)).toBe('won')
  await page.locator('.relic-card').first().click()
  await expect(page.getByRole('heading', { name: '回声蝠' })).toBeVisible()
  expect(await playBattle(page)).toBe('won')
  await expect(page.getByRole('heading', { name: '整备恢复' })).toBeVisible()
  await page.getByRole('button', { name: '领取恢复并挑战首领' }).click()
  await expect(page.getByRole('heading', { name: '遗忘守卫' })).toBeVisible()
  expect(await playBattle(page)).toBe('won')

  await expect(page.getByRole('heading', { name: '把今天记住的带回去' })).toBeVisible()
  await expect(page.getByText('到期覆盖')).toBeVisible()
  await expect(page.getByText('专注使用')).toBeVisible()
  expect(browserErrors).toEqual([])
})
