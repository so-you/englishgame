import { useEffect, useRef, useState } from 'react'

import {
  selectCanPlayCard,
  selectCardTemplate,
} from '../../core/battle/battle-selectors'
import type { SessionState } from '../../core/session/model'
import type {
  PendingOvercharge,
  PrepareOverchargeError,
} from '../../core/session/prepare-overcharge'
import type { Result } from '../../core/shared/result'
import { BattleHud } from './BattleHud'
import { CombatCard } from './CombatCard'
import { EnemyIntent } from './EnemyIntent'
import {
  OverchargeDock,
  type ResolveOverchargeRequest,
} from './OverchargeDock'

interface ActionResult {
  readonly ok: boolean
  readonly error?: { readonly message: string }
}

interface BattleScreenProps {
  readonly session: SessionState
  readonly showTimingHints?: boolean
  readonly speechAvailable?: boolean
  readonly onSpeak?: (term: string) => Promise<ActionResult>
  readonly onPlayCard: (cardId: string) => Promise<ActionResult>
  readonly onPrepareOvercharge: (
    cardId: string,
  ) => Result<PendingOvercharge, PrepareOverchargeError | { message: string }>
  readonly onResolveOvercharge: (
    request: ResolveOverchargeRequest,
  ) => Promise<ActionResult>
  readonly onOverchargeFeedbackDone?: () => void
  readonly onEndTurn: () => Promise<ActionResult>
}

export function BattleScreen({
  session,
  showTimingHints = false,
  speechAvailable = false,
  onSpeak,
  onPlayCard,
  onPrepareOvercharge,
  onResolveOvercharge,
  onOverchargeFeedbackDone,
  onEndTurn,
}: BattleScreenProps) {
  const battle = session.currentBattle!
  const [selectedCardId, setSelectedCardId] = useState<string>()
  const [pending, setPending] = useState<PendingOvercharge>()
  const [error, setError] = useState<string>()
  const [acting, setActing] = useState(false)
  const handRef = useRef<HTMLDivElement>(null)
  const selectedCard = battle.hand.includes(selectedCardId ?? '')
    ? session.cards.find((card) => card.id === selectedCardId)
    : undefined
  const selectedUnit = session.contentPack.units.find(
    (unit) => unit.id === selectedCard?.learningUnitId,
  )
  const selectedUnitLabel =
    selectedUnit?.type === 'vocab'
      ? selectedUnit.term
      : selectedUnit?.type === 'grammar'
        ? selectedUnit.name
        : undefined
  const canOverload =
    selectedCard?.learningUnitId !== undefined && battle.player.focus > 0
  const pendingUnit = session.contentPack.units.find(
    (unit) => unit.id === pending?.unitId,
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCardId(undefined)
        setPending(undefined)
        queueMicrotask(() =>
          handRef.current
            ?.querySelector<HTMLButtonElement>('.combat-card:not(:disabled)')
            ?.focus(),
        )
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const beginOvercharge = () => {
    if (!selectedCardId) return
    const prepared = onPrepareOvercharge(selectedCardId)
    if (!prepared.ok) {
      setError(prepared.error.message)
      return
    }
    setPending(prepared.value)
    setError(undefined)
  }

  return (
    <div className="screen battle-screen">
      <BattleHud battle={battle} />
      <EnemyIntent battle={battle} />

      <section className="hand-zone" aria-labelledby="hand-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">你的手牌</p>
            <h2 id="hand-title">选择一张牌</h2>
          </div>
          <button
            type="button"
            className="button button--secondary"
            disabled={acting}
            onClick={() => {
              setActing(true)
              setError(undefined)
              void onEndTurn().then((result) => {
                if (!result.ok) setError(result.error?.message ?? '无法结束回合。')
                setActing(false)
              })
            }}
          >
            结束回合
          </button>
        </div>
        <div className="combat-hand" ref={handRef}>
          {battle.hand.map((cardId) => {
            const card = session.cards.find((candidate) => candidate.id === cardId)!
            const template = selectCardTemplate(battle, cardId)!
            const unit = session.contentPack.units.find(
              (candidate) => candidate.id === card.learningUnitId,
            )
            return (
              <CombatCard
                key={cardId}
                card={card}
                template={template}
                unit={unit}
                selected={selectedCardId === cardId}
                playable={!acting && selectCanPlayCard(battle, cardId)}
                onSelect={() => {
                  setSelectedCardId(cardId)
                  setError(undefined)
                }}
              />
            )
          })}
        </div>
      </section>

      {selectedCard && !pending ? (
        <section className="card-actions" aria-label="出牌方式">
          <div>
            <strong>{selectedUnitLabel ?? '中性卡 · 不可过载'}</strong>
            <span>
              {selectedUnit
                ? '直接打出只执行基础效果；过载会消耗专注并开始回忆。'
                : '中性卡 · 不可过载'}
            </span>
          </div>
          <button
            type="button"
            className="button button--secondary"
            disabled={acting}
            onClick={() => {
              setActing(true)
              setError(undefined)
              void onPlayCard(selectedCard.id).then((result) => {
                if (!result.ok) setError(result.error?.message ?? '无法打出卡牌。')
                setActing(false)
              })
            }}
          >
            直接打出
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={acting || !canOverload}
            onClick={beginOvercharge}
          >
            过载后打出
          </button>
        </section>
      ) : null}

      {error ? <p className="battle-error" role="alert">{error}</p> : null}
      {pending ? (
        <OverchargeDock
          pending={pending}
          showTimingHints={showTimingHints}
          speechTerm={pendingUnit?.type === 'vocab' ? pendingUnit.term : undefined}
          speechAvailable={speechAvailable}
          onSpeak={onSpeak}
          onResolve={onResolveOvercharge}
          onCancel={() => {
            setPending(undefined)
            queueMicrotask(() =>
              handRef.current
                ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
                ?.focus(),
            )
          }}
          onDone={() => {
            setPending(undefined)
            setSelectedCardId(undefined)
            onOverchargeFeedbackDone?.()
            queueMicrotask(() =>
              handRef.current
                ?.querySelector<HTMLButtonElement>('.combat-card:not(:disabled)')
                ?.focus(),
            )
          }}
        />
      ) : null}
    </div>
  )
}
