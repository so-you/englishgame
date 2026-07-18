import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { completeNextTeaching } from '../../core/session/complete-teaching'
import { createSession } from '../../core/session/create-session'
import type { PendingOvercharge } from '../../core/session/prepare-overcharge'
import { prepareOvercharge } from '../../core/session/prepare-overcharge'
import type { SessionState } from '../../core/session/model'
import { CET4_MVP_PACK } from '../../data/packs'
import { BattleScreen } from './BattleScreen'

function battleSession(): SessionState {
  const created = createSession({
    id: 'battle-ui-session',
    seed: 20260718,
    pack: CET4_MVP_PACK,
    states: new Map(),
    now: 1_800_000_000_000,
    newUnitQuota: 4,
  })
  if (!created.ok) throw new Error(created.error.message)
  let session = created.value
  while (session.phase === 'teaching') {
    const completed = completeNextTeaching({
      session,
      now: 1_800_000_000_000 + session.teachingIndex * 1_000,
      logId: `teaching-${session.teachingIndex}`,
    })
    if (!completed.ok) throw new Error(completed.error.message)
    session = completed.value
  }
  return session
}

function pendingFor(session: SessionState, cardId: string): PendingOvercharge {
  const result = prepareOvercharge({
    battle: session.currentBattle!,
    cardId,
    pack: session.contentPack,
    states: new Map(Object.entries(session.srsStates)),
    recentExerciseIds: [],
    listeningAvailable: false,
    startedAt: 1_800_000_010_000,
  })
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

describe('BattleScreen', () => {
  it('lets the player select a card and play its base effect directly', async () => {
    const user = userEvent.setup()
    const session = battleSession()
    const cardId = session.currentBattle!.hand[0]!
    const onPlayCard = vi.fn().mockResolvedValue({ ok: true })

    render(
      <BattleScreen
        session={session}
        onPlayCard={onPlayCard}
        onPrepareOvercharge={() => ({ ok: false, error: { message: 'unused' } })}
        onResolveOvercharge={vi.fn()}
        onEndTurn={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )

    await user.click(screen.getByTestId(`combat-card-${cardId}`))
    await user.click(screen.getByRole('button', { name: '直接打出' }))

    expect(onPlayCard).toHaveBeenCalledWith(cardId)
  })

  it('keeps an overcharge exercise and its feedback inside the battle screen', async () => {
    const user = userEvent.setup()
    const session = battleSession()
    const boundCardId = session.currentBattle!.hand.find((cardId) =>
      session.cards.some(
        (card) => card.id === cardId && card.learningUnitId !== undefined,
      ),
    )!
    const pending = pendingFor(session, boundCardId)
    const onResolveOvercharge = vi.fn().mockResolvedValue({ ok: true, value: undefined })

    render(
      <BattleScreen
        session={session}
        onPlayCard={vi.fn().mockResolvedValue({ ok: true })}
        onPrepareOvercharge={() => ({ ok: true, value: pending })}
        onResolveOvercharge={onResolveOvercharge}
        onEndTurn={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )

    await user.click(screen.getByTestId(`combat-card-${boundCardId}`))
    await user.click(screen.getByRole('button', { name: '过载后打出' }))
    expect(screen.getByRole('heading', { name: '过载回忆' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '放弃；抛弃' }))
    await user.click(screen.getByRole('button', { name: '提交答案' }))

    expect(onResolveOvercharge).toHaveBeenCalledWith({
      pending,
      response: pending.exercise.options?.find(
        (option) => option.text === '放弃；抛弃',
      )?.id,
      usedHint: false,
      confirmedNearMatch: false,
    })
    expect(screen.getByRole('status')).toHaveTextContent('回答正确')
    expect(screen.getByText(pending.exercise.explanation)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回战斗' }))
    expect(screen.queryByRole('heading', { name: '过载回忆' })).not.toBeInTheDocument()
    expect(screen.getByTestId(`combat-card-${session.currentBattle!.hand[0]}`)).toHaveFocus()
  })

  it('marks neutral cards and exhausted focus as unavailable for overload', async () => {
    const user = userEvent.setup()
    const original = battleSession()
    const neutral = original.cards.find((card) => !card.learningUnitId)!
    const session: SessionState = {
      ...original,
      currentBattle: {
        ...original.currentBattle!,
        hand: [neutral.id],
        player: { ...original.currentBattle!.player, focus: 0 },
      },
    }

    render(
      <BattleScreen
        session={session}
        onPlayCard={vi.fn().mockResolvedValue({ ok: true })}
        onPrepareOvercharge={vi.fn()}
        onResolveOvercharge={vi.fn()}
        onEndTurn={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )

    await user.click(screen.getByTestId(`combat-card-${neutral.id}`))
    expect(screen.getAllByText('中性卡 · 不可过载')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: '过载后打出' })).toBeDisabled()
  })
})
