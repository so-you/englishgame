import { expect, test } from '@playwright/test'

import { openFreshApp } from './helpers'

test('the core path can be operated with keyboard focus and activation', async ({ page }) => {
  await openFreshApp(page)
  await expect(page.getByRole('heading', { name: '英语爬塔' })).toBeFocused()

  await page.getByRole('button', { name: '开始本次学习' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '先认识新内容，再进入战斗' })).toBeFocused()
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: '我已理解，继续' }).focus()
    await page.keyboard.press('Enter')
    if (index < 3) {
      await expect(page.getByLabel(new RegExp(`教学进度 ${index + 2} / 4`))).toBeVisible()
    }
  }
  await expect(page.getByRole('heading', { name: '墨团' })).toBeFocused()
  const card = page.locator('.combat-card:not(:disabled)').first()
  await card.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: '直接打出' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '结束回合' })).toBeVisible()
})
