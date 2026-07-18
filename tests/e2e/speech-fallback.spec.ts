import { expect, test } from '@playwright/test'

import { openFreshApp, playBattle } from './helpers'

test('the full run remains playable when Web Speech API is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: undefined,
    })
  })
  await openFreshApp(page)
  await page.getByRole('button', { name: '开始本次学习' }).click()
  await expect(page.getByRole('button', { name: '播放发音' })).toBeDisabled()
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: '我已理解，继续' }).dispatchEvent('click')
    if (index < 3) {
      await expect(page.getByLabel(new RegExp(`教学进度 ${index + 2} / 4`))).toBeVisible()
    }
  }

  expect(await playBattle(page)).toBe('won')
  await page.locator('.relic-card').first().click()
  await expect(page.getByRole('heading', { name: '回声蝠' })).toBeVisible()
  expect(await playBattle(page)).toBe('won')
  await page.getByRole('button', { name: '领取恢复并挑战首领' }).click()
  await expect(page.getByRole('heading', { name: '遗忘守卫' })).toBeVisible()
  expect(await playBattle(page)).toBe('won')
  await expect(page.getByRole('heading', { name: '把今天记住的带回去' })).toBeVisible()
})
