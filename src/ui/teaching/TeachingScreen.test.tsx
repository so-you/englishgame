import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createSession } from '../../core/session/create-session'
import { CET4_MVP_PACK } from '../../data/packs'
import { TeachingScreen } from './TeachingScreen'

function sessionFixture() {
  const result = createSession({
    id: 'teaching-session',
    seed: 7,
    pack: CET4_MVP_PACK,
    states: new Map(),
    now: 1_800_000_000_000,
    newUnitQuota: 4,
  })
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

describe('TeachingScreen', () => {
  it('shows complete teaching context and advances only on confirmation', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onAbandon = vi.fn()

    render(
      <TeachingScreen
        session={sessionFixture()}
        speechAvailable={false}
        onComplete={onComplete}
        onAbandon={onAbandon}
      />,
    )

    expect(screen.getByRole('heading', { name: 'abandon' })).toBeInTheDocument()
    expect(screen.getByText('放弃；抛弃')).toBeInTheDocument()
    expect(screen.getByText('/əˈbændən/')).toBeInTheDocument()
    expect(screen.getByText(/They abandoned the plan/)).toBeInTheDocument()
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放发音' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '我已理解，继续' }))
    expect(onComplete).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: '退出本次会话' }))
    expect(onAbandon).toHaveBeenCalledOnce()
  })

  it('surfaces playback failure without blocking teaching', async () => {
    const user = userEvent.setup()
    render(
      <TeachingScreen
        session={sessionFixture()}
        speechAvailable
        onSpeak={vi.fn().mockResolvedValue({
          ok: false,
          error: { message: '设备拒绝播放。' },
        })}
        onComplete={vi.fn()}
        onAbandon={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '播放发音' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('设备拒绝播放')
    expect(screen.getByRole('button', { name: '我已理解，继续' })).toBeEnabled()
  })
})
