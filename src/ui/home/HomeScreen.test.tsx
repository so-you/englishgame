import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CET4_MVP_PACK } from '../../data/packs'
import type { UserSettings } from '../../infra/indexeddb/schema'
import { HomeScreen } from './HomeScreen'

const settings: UserSettings = {
  id: 'app',
  newUnitQuota: 4,
  reducedMotion: false,
  showTimingHints: true,
  speechEnabled: true,
}

describe('HomeScreen', () => {
  it('selects a pack, changes quota, starts, resumes, and opens import', async () => {
    const user = userEvent.setup()
    const customPack = {
      ...CET4_MVP_PACK,
      id: 'custom:school-list',
      name: '本周课堂词表',
      stage: 'custom' as const,
      curriculumTags: ['custom'] as const,
    }
    const onStartPack = vi.fn()
    const onContinue = vi.fn()
    const onChangeQuota = vi.fn()
    const onNavigate = vi.fn()

    render(
      <HomeScreen
        packs={[CET4_MVP_PACK, customPack]}
        settings={settings}
        dueCountByPack={{ [CET4_MVP_PACK.id]: 3, [customPack.id]: 1 }}
        hasResumableSession
        onStartPack={onStartPack}
        onContinue={onContinue}
        onChangeQuota={onChangeQuota}
        onNavigate={onNavigate}
      />,
    )

    await user.click(screen.getByRole('radio', { name: /本周课堂词表/ }))
    await user.selectOptions(screen.getByLabelText('每局新词数量'), '2')
    await user.click(screen.getByRole('button', { name: '开始本次学习' }))
    await user.click(screen.getByRole('button', { name: '继续上次会话' }))
    await user.click(screen.getByRole('button', { name: '导入词表' }))

    expect(onStartPack).toHaveBeenCalledWith(customPack.id)
    expect(onChangeQuota).toHaveBeenCalledWith(2)
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onNavigate).toHaveBeenCalledWith('import')
    expect(
      screen.getByRole('radio', { name: /本周课堂词表/ }).closest('label'),
    ).toHaveTextContent('1 个到期项目')
  })
})
