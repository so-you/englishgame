import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { UserSettings } from '../../infra/indexeddb/schema'
import { SettingsScreen } from './SettingsScreen'

const settings: UserSettings = {
  id: 'app',
  newUnitQuota: 4,
  reducedMotion: false,
  showTimingHints: true,
  speechEnabled: true,
}

describe('SettingsScreen', () => {
  it('updates accessibility options, exports, and double-confirms reset', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue({ ok: true })
    const onExport = vi.fn().mockResolvedValue({ ok: true })
    const onReset = vi.fn().mockResolvedValue({ ok: true })
    render(
      <SettingsScreen
        settings={settings}
        onUpdate={onUpdate}
        onExport={onExport}
        onReset={onReset}
        onBack={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: /减少动画/ }))
    expect(onUpdate).toHaveBeenCalledWith({ reducedMotion: true })
    await user.click(screen.getByRole('button', { name: '导出全部数据' }))
    expect(onExport).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: '重置全部数据' }))
    expect(onReset).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认永久删除' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.getByRole('button', { name: '重置全部数据' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: '重置全部数据' }))
    await user.click(screen.getByRole('button', { name: '确认永久删除' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
