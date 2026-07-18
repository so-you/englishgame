import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { openFreshApp } from './helpers'

test('home has no automatically detectable critical accessibility violations at 200% zoom', async ({ page }) => {
  await openFreshApp(page)
  await page.evaluate(() => {
    document.body.style.zoom = '2'
  })
  await expect(page.getByRole('button', { name: '开始本次学习' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious',
  )
  expect(serious).toEqual([])
})
