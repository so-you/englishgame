import type { SessionState } from '../../core/session/model'
import { buildSettlementSummary } from './settlement-summary'

interface SettlementScreenProps {
  readonly session: SessionState
  readonly onFinish: () => void
}

function formatReviewTime(timestamp?: number): string {
  if (timestamp === undefined) return '完成更多回忆后生成'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export function SettlementScreen({
  session,
  onFinish,
}: SettlementScreenProps) {
  const summary = buildSettlementSummary(session)

  return (
    <main className="screen settlement-screen">
      <header className="settlement-header">
        <p className="eyebrow">探索完成</p>
        <h1>把今天记住的带回去</h1>
        <p>这里呈现学习事实，不给一次探索贴总分或等级。</p>
      </header>

      <section className="metric-grid" aria-label="本次学习概览">
        <article>
          <span>到期覆盖</span>
          <strong>{summary.dueCoveragePercent}%</strong>
          <small>{summary.dueAttempted} / {summary.dueTotal} 个到期项目</small>
        </article>
        <article>
          <span>专注使用</span>
          <strong>{summary.focusUsagePercent}%</strong>
          <small>{summary.focusUsed} / {summary.focusCapacity} 次回忆机会</small>
        </article>
        <article>
          <span>直接答对</span>
          <strong>{summary.directCorrect}</strong>
          <small>无需提示完成</small>
        </article>
        <article>
          <span>提示后答对</span>
          <strong>{summary.hintedCorrect}</strong>
          <small>仍记录真实学习表现</small>
        </article>
        <article>
          <span>未答对</span>
          <strong>{summary.incorrect}</strong>
          <small>已进入后续复习调度</small>
        </article>
        <article>
          <span>下次复习</span>
          <strong className="metric-date">{formatReviewTime(summary.nextReviewAt)}</strong>
          <small>由间隔复习状态决定</small>
        </article>
      </section>

      <section className="difficult-panel" aria-labelledby="difficult-title">
        <h2 id="difficult-title">本次易错项</h2>
        {summary.difficultUnits.length > 0 ? (
          <ul>
            {summary.difficultUnits.map((unit) => (
              <li key={unit.unitId}>
                <strong>{unit.label}</strong>
                <span>{unit.incorrectCount} 次未答对</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>本次没有未答对的回忆；继续按计划复习即可。</p>
        )}
      </section>

      <button
        type="button"
        className="button button--primary button--large"
        onClick={onFinish}
      >
        保存并返回主页
      </button>
    </main>
  )
}
