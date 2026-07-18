import { expect, test } from '@playwright/test'

import { openFreshApp } from './helpers'

test('system preference and app setting both suppress non-essential motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openFreshApp(page)
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByRole('checkbox', { name: /减少动画/ }).click()

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.reducedMotion)).toBe('true')
  const duration = await page.locator('.button').first().evaluate(
    (element) => getComputedStyle(element).animationDuration,
  )
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01)
})
