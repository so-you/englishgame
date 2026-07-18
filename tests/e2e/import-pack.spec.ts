import { expect, test } from '@playwright/test'

import { openFreshApp } from './helpers'

test('an imported CSV appears on home and can start a teaching session', async ({ page }) => {
  await openFreshApp(page)
  await page.getByRole('button', { name: '导入词表' }).click()
  await page.getByLabel('词表名称').fill('班级词表')
  await page.getByLabel('带表头的词表内容').fill(
    'word,meaning\nplanet,行星\nforest,森林\nbridge,桥梁\nenergy,能量',
  )
  await page.getByRole('button', { name: '解析词表' }).click()
  await page.getByRole('button', { name: '检查与补全' }).click()
  await page.getByRole('button', { name: '确认并保存词表' }).click()
  await page.getByRole('button', { name: '返回主页选择词表' }).click()

  await page.getByRole('radio', { name: /班级词表/ }).check()
  await page.getByRole('button', { name: '开始本次学习' }).click()
  await expect(page.getByRole('heading', { name: 'planet' })).toBeVisible()
})
