import { useState } from 'react'

import type { ContentPack } from '../../core/learning/model'
import { statusOf, type SrsState } from '../../core/srs/model'

interface ExportResult {
  readonly ok: boolean
  readonly error?: { readonly message: string }
}

interface ProgressScreenProps {
  readonly packs: readonly ContentPack[]
  readonly states: readonly SrsState[]
  readonly now: number
  readonly onBack: () => void
  readonly onExport: () => Promise<ExportResult>
}

export function ProgressScreen({
  packs,
  states,
  now,
  onBack,
  onExport,
}: ProgressScreenProps) {
  const [exportStatus, setExportStatus] = useState<string>()
  const statesById = new Map(states.map((state) => [state.unitId, state]))

  const exportData = async () => {
    setExportStatus('正在准备导出…')
    const result = await onExport()
    setExportStatus(result.ok ? '学习数据已导出。' : result.error?.message ?? '导出失败。')
  }

  return (
    <main className="screen progress-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">本地学习档案</p>
          <h1>学习进度</h1>
          <p>掌握度来自间隔复习状态，不是一次战斗的分数。</p>
        </div>
        <button type="button" className="button button--quiet" onClick={onBack}>
          返回主页
        </button>
      </header>

      <div className="progress-pack-list">
        {packs.map((pack) => {
          const counts = { new: 0, learning: 0, review: 0, maintenance: 0 }
          let due = 0
          for (const unit of pack.units) {
            const state = statesById.get(unit.id)
            counts[statusOf(state?.mastery ?? 0)] += 1
            if (state?.dueAt !== undefined && state.dueAt <= now) due += 1
          }
          return (
            <section key={pack.id} className="progress-pack" aria-labelledby={`progress-${pack.id}`}>
              <div>
                <h2 id={`progress-${pack.id}`}>{pack.name}</h2>
                <p>{pack.units.length} 个学习项目 · {due} 个到期</p>
              </div>
              <dl>
                <div><dt>未学习</dt><dd>{counts.new}</dd></div>
                <div><dt>学习中</dt><dd>{counts.learning}</dd></div>
                <div><dt>复习中</dt><dd>{counts.review}</dd></div>
                <div><dt>长期保持</dt><dd>{counts.maintenance}</dd></div>
              </dl>
            </section>
          )
        })}
      </div>

      <section className="data-panel" aria-labelledby="data-title">
        <div>
          <h2 id="data-title">带走你的学习数据</h2>
          <p>导出内容包、复习状态、回忆日志、设置和未完成会话的 JSON 副本。</p>
          {exportStatus ? <p role="status">{exportStatus}</p> : null}
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void exportData()}
        >
          导出学习数据
        </button>
      </section>
    </main>
  )
}
