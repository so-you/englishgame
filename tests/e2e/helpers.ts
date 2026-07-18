import { expect, type Page } from '@playwright/test'

const DEFINITIONS = new Map([
  ['abandon', '放弃；抛弃'],
  ['achieve', '实现；达到（目标）'],
  ['approach', '方法；处理方式'],
  ['available', '可获得的；可使用的'],
])

export async function openFreshApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto)
    Object.defineProperty(crypto, 'getRandomValues', {
      configurable: true,
      value: <T extends ArrayBufferView | null>(array: T): T => {
        if (array instanceof Uint32Array && array.length === 1) {
          array[0] = 20260718
          return array
        }
        return original(array)
      },
    })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '英语爬塔' })).toBeVisible()
}

export async function startCet4Session(page: Page): Promise<void> {
  await page.getByRole('button', { name: '开始本次学习' }).click()
  await expect(page.getByRole('heading', { name: '先认识新内容，再进入战斗' })).toBeVisible()
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: '我已理解，继续' }).dispatchEvent('click')
    if (index < 3) {
      await expect(page.getByLabel(new RegExp(`教学进度 ${index + 2} / 4`))).toBeVisible()
    }
  }
  await expect(page.getByRole('heading', { name: /墨团|回声蝠|遗忘守卫/ })).toBeVisible()
}

export async function answerOvercharge(page: Page, term: string): Promise<void> {
  const dock = page.getByRole('complementary', { name: '过载回忆' })
  const radios = dock.getByRole('radio')
  if ((await radios.count()) > 0) {
    const definition = DEFINITIONS.get(term)
    const definitionOption = definition
      ? dock.getByRole('radio', { name: definition })
      : radios.first()
    const termOption = dock.getByRole('radio', { name: term })
    const correct =
      (await definitionOption.count()) > 0
        ? definitionOption
        : (await termOption.count()) > 0
          ? termOption
          : radios.first()
    await correct.check()
  } else {
    await dock.getByRole('textbox').fill(term)
  }
  await dock.getByRole('button', { name: '提交答案' }).click()
  await expect(dock.getByRole('status')).toBeVisible()
  await dock.getByRole('button', { name: '返回战斗' }).click()
}

export async function endTurnAndWait(page: Page): Promise<void> {
  const turnText = await page.locator('.enemy-panel .eyebrow').textContent()
  await page.getByRole('button', { name: '结束回合' }).click()
  await expect
    .poll(async () => {
      if (
        (await page.getByRole('heading', {
          name: '战斗失利，学习没有白费',
        }).count()) > 0
      ) {
        return 'screen-changed'
      }
      const turn = page.locator('.enemy-panel .eyebrow')
      if (!(await turn.count())) return 'screen-changed'
      const current = await turn.textContent()
      return current === turnText ? 'pending' : current
    }, { timeout: 10_000 })
    .not.toBe('pending')
}

export async function overchargeTerm(
  page: Page,
  term: string,
): Promise<void> {
  for (let turn = 0; turn < 12; turn += 1) {
    const target = page.locator('.combat-card:not(:disabled)').filter({
      has: page.locator('.combat-card__inscription', { hasText: new RegExp(`^${term}$`) }),
    })
    if ((await target.count()) > 0) {
      await target.first().click()
      await page.getByRole('button', { name: '过载后打出' }).click()
      await answerOvercharge(page, term)
      return
    }
    await endTurnAndWait(page)
  }
  throw new Error(`Could not draw the learning card for ${term}.`)
}

async function playableCard(page: Page) {
  const playable = page.locator('.combat-card:not(:disabled)')
  const intentText = (await page.locator('.intent-card p').textContent()) ?? ''
  const blockText = await page
    .getByLabel('战斗资源')
    .locator('div')
    .filter({ hasText: /^格挡/ })
    .locator('strong')
    .textContent()
  const currentBlock = Number(blockText ?? 0)
  const damageMatch = intentText.match(/造成 (\d+)(?:×(\d+))? 点伤害/)
  const incomingDamage = damageMatch
    ? Number(damageMatch[1]) * Number(damageMatch[2] ?? 1)
    : 0
  const defense = playable.filter({ hasText: /防御|固守/ }).first()
  if (incomingDamage > currentBlock && (await defense.count()) > 0) {
    return defense
  }
  const attack = playable.filter({ hasText: /打击|重击/ }).first()
  return (await attack.count()) > 0 ? attack : playable.first()
}

export async function playBattle(
  page: Page,
  options: { readonly useOvercharge?: boolean } = {},
): Promise<'won' | 'lost'> {
  for (let turn = 0; turn < 60; turn += 1) {
    if (await page.getByRole('heading', { name: '选择一件学习遗物' }).count()) return 'won'
    if (await page.getByRole('heading', { name: '整备恢复' }).count()) return 'won'
    if (await page.getByRole('heading', { name: '把今天记住的带回去' }).count()) return 'won'
    if (await page.getByRole('heading', { name: '战斗失利，学习没有白费' }).count()) return 'lost'

    let plays = 0
    while ((await page.locator('.combat-card:not(:disabled)').count()) > 0 && plays < 12) {
      const card = await playableCard(page)
      const cardTestId = await card.getAttribute('data-testid')
      const term = (await card.locator('.combat-card__inscription').textContent())?.trim() ?? ''
      await card.click()
      const overload = page.getByRole('button', { name: '过载后打出' })
      if (
        options.useOvercharge !== false &&
        term !== '中性卡' &&
        (await overload.isEnabled())
      ) {
        await overload.click()
        await answerOvercharge(page, term)
      } else {
        await page.getByRole('button', { name: '直接打出' }).click()
        if (cardTestId) {
          await expect(page.getByTestId(cardTestId)).toHaveCount(0)
        }
      }
      plays += 1
      if (!(await page.getByRole('button', { name: '结束回合' }).count())) break
    }
    if (await page.getByRole('button', { name: '结束回合' }).count()) {
      await endTurnAndWait(page)
    }
  }
  throw new Error('Battle did not finish within 60 turns.')
}

export async function readStore<T>(page: Page, storeName: string): Promise<T[]> {
  return page.evaluate(async (name) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('english-roguelike')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const values = await new Promise<T[]>((resolve, reject) => {
      const request = database.transaction(name, 'readonly').objectStore(name).getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
    database.close()
    return values
  }, storeName)
}
