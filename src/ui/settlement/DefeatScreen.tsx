import type { SessionState } from '../../core/session/model'
import { buildSettlementSummary } from './settlement-summary'

interface DefeatScreenProps {
  readonly session: SessionState
  readonly onFinish: () => void
}

export function DefeatScreen({ session, onFinish }: DefeatScreenProps) {
  const summary = buildSettlementSummary(session)

  return (
    <main className="screen centered-panel defeat-screen">
      <section className="defeat-card" aria-labelledby="defeat-title">
        <p className="eyebrow">探索在这里结束</p>
        <h1 id="defeat-title">战斗失利，学习没有白费</h1>
        <p>
          本次 {summary.focusUsed} 次回忆及其学习记录已经保存，不会附加降级或惩罚。
        </p>
        <button
          type="button"
          className="button button--primary button--large"
          onClick={onFinish}
        >
          返回主页
        </button>
      </section>
    </main>
  )
}
