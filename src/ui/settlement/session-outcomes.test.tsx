import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { completeNextTeaching } from '../../core/session/complete-teaching'
import { createSession } from '../../core/session/create-session'
import type { SessionState } from '../../core/session/model'
import type { RecallLog, SrsState } from '../../core/srs/model'
import { CET4_MVP_PACK } from '../../data/packs'
import { ProgressScreen } from '../progress/ProgressScreen'
import { HealRewardScreen } from '../reward/HealRewardScreen'
import { RelicRewardScreen } from '../reward/RelicRewardScreen'
import { DefeatScreen } from './DefeatScreen'
import { SettlementScreen } from './SettlementScreen'

const NOW = 1_800_000_000_000

function completedTeachingSession(): SessionState {
  const created = createSession({
    id: 'outcome-session',
    seed: 20260718,
    pack: CET4_MVP_PACK,
    states: new Map(),
    now: NOW,
    newUnitQuota: 4,
  })
  if (!created.ok) throw new Error(created.error.message)
  let session = created.value
  while (session.phase === 'teaching') {
    const completed = completeNextTeaching({
      session,
      now: NOW,
      logId: `teaching-${session.teachingIndex}`,
    })
    if (!completed.ok) throw new Error(completed.error.message)
    session = completed.value
  }
  return session
}

function recallLog(
  id: string,
  unitId: string,
  correct: boolean,
  usedHint: boolean,
): RecallLog {
  return {
    id,
    unitId,
    exerciseId: `${unitId}:meaning-choice`,
    sessionId: 'outcome-session',
    encounterId: 'outcome-session:battle-1',
    kind: 'vocab-meaning-choice',
    correct,
    usedHint,
    eligible: true,
    graded: true,
    grade: correct ? 'good' : 'again',
    createdAt: NOW,
  }
}

function outcomeSession(phase: 'settlement' | 'defeat'): SessionState {
  const session = completedTeachingSession()
  const [first, second, third] = session.learningSet.unitIds
  return {
    ...session,
    phase,
    learningSet: {
      ...session.learningSet,
      dueUnitIds: [first!, second!],
    },
    srsStates: {
      ...session.srsStates,
      [first!]: { ...session.srsStates[first!]!, dueAt: NOW + 86_400_000 },
    },
    logs: [
      ...session.logs,
      recallLog('direct', first!, true, false),
      recallLog('hinted', third!, true, true),
      recallLog('wrong', third!, false, false),
    ],
  }
}

describe('reward and outcome screens', () => {
  it('offers three relics and applies the chosen reward', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<RelicRewardScreen ownedRelicIds={[]} onChoose={onChoose} />)

    expect(screen.getAllByRole('button')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: /词根罗盘/ }))
    expect(onChoose).toHaveBeenCalledWith('root-compass')
  })

  it('caps the fixed heal at maximum health', async () => {
    const user = userEvent.setup()
    const onClaim = vi.fn()
    render(<HealRewardScreen hp={45} maxHp={50} onClaim={onClaim} />)

    expect(screen.getByText('45 → 50 生命')).toBeInTheDocument()
    expect(screen.getByText(/恢复 5 点生命/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /挑战首领/ }))
    expect(onClaim).toHaveBeenCalledOnce()
  })

  it('reports learning facts without a total score or shame grade', () => {
    render(<SettlementScreen session={outcomeSession('settlement')} onFinish={vi.fn()} />)

    expect(screen.getByText('到期覆盖').closest('article')).toHaveTextContent('50%')
    expect(screen.getByText('专注使用').closest('article')).toHaveTextContent('33%')
    expect(screen.getByText('直接答对').closest('article')).toHaveTextContent('1')
    expect(screen.getByText('提示后答对').closest('article')).toHaveTextContent('1')
    expect(screen.getByText('未答对').closest('article')).toHaveTextContent('1')
    expect(
      screen.queryByRole('heading', { name: /总分|评级|失败者/ }),
    ).not.toBeInTheDocument()
  })

  it('states that learning records survive a defeat without punishment', () => {
    render(<DefeatScreen session={outcomeSession('defeat')} onFinish={vi.fn()} />)
    expect(screen.getByText(/3 次回忆及其学习记录已经保存/)).toBeInTheDocument()
    expect(screen.getByText(/不会附加降级或惩罚/)).toBeInTheDocument()
  })
})

describe('ProgressScreen', () => {
  it('groups mastery by content pack and exports local data', async () => {
    const user = userEvent.setup()
    const [first, second, third] = CET4_MVP_PACK.units
    const states: readonly SrsState[] = [
      {
        unitId: first!.id,
        mastery: 1,
        intervalDays: 1,
        dueAt: NOW - 1,
        consecutiveCorrect: 0,
        lapses: 0,
      },
      {
        unitId: second!.id,
        mastery: 3,
        intervalDays: 7,
        dueAt: NOW + 1,
        consecutiveCorrect: 2,
        lapses: 0,
      },
      {
        unitId: third!.id,
        mastery: 5,
        intervalDays: 30,
        dueAt: NOW + 1,
        consecutiveCorrect: 4,
        lapses: 0,
      },
    ]
    const onExport = vi.fn().mockResolvedValue({ ok: true })
    render(
      <ProgressScreen
        packs={[CET4_MVP_PACK]}
        states={states}
        now={NOW}
        onBack={vi.fn()}
        onExport={onExport}
      />,
    )

    const pack = screen.getByRole('heading', { name: CET4_MVP_PACK.name }).closest('section')!
    expect(within(pack).getByText(/1 个到期/)).toBeInTheDocument()
    expect(within(pack).getByText('学习中').parentElement).toHaveTextContent('1')
    expect(within(pack).getByText('复习中').parentElement).toHaveTextContent('1')
    expect(within(pack).getByText('长期保持').parentElement).toHaveTextContent('1')
    await user.click(screen.getByRole('button', { name: '导出学习数据' }))
    expect(onExport).toHaveBeenCalledOnce()
    expect(await screen.findByRole('status')).toHaveTextContent('学习数据已导出')
  })
})
