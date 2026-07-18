import type { ImportedPackResult } from '../../core/import/model'

interface PreviewStepProps {
  readonly result: ImportedPackResult
  readonly saving: boolean
  readonly saveError?: string
  readonly onBack: () => void
  readonly onConfirm: () => void
  readonly onDownloadErrors: () => void
}

export function PreviewStep({
  result,
  saving,
  saveError,
  onBack,
  onConfirm,
  onDownloadErrors,
}: PreviewStepProps) {
  return (
    <section className="import-step" aria-labelledby="preview-step-title">
      <p className="eyebrow">第 4 步，共 4 步</p>
      <h1 id="preview-step-title">确认导入结果</h1>

      <div className="import-summary" aria-label="导入统计">
        <article><span>新增</span><strong>{result.importedRowCount}</strong></article>
        <article><span>重复跳过</span><strong>{result.duplicateRowCount}</strong></article>
        <article><span>Pending</span><strong>{result.pendingRowCount}</strong></article>
        <article><span>问题</span><strong>{result.errors.length}</strong></article>
      </div>

      <div className="table-scroll">
        <table>
          <caption>前 10 个导入结果</caption>
          <thead><tr><th>行</th><th>词汇</th><th>释义</th><th>状态</th></tr></thead>
          <tbody>
            {Object.entries(result.rowUnits).slice(0, 10).map(([rowNumber, unit]) => (
              <tr key={rowNumber}>
                <td>{rowNumber}</td><td>{unit.term}</td><td>{unit.definitionZh || '—'}</td>
                <td>{unit.enrichmentStatus === 'complete' ? '可学习' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.errors.length > 0 ? (
        <button type="button" className="button button--secondary" onClick={onDownloadErrors}>
          下载安全错误报告
        </button>
      ) : null}
      {saveError ? <p role="alert">{saveError}</p> : null}
      <div className="import-actions">
        <button type="button" className="button button--quiet" onClick={onBack}>上一步</button>
        <button
          type="button"
          className="button button--primary"
          disabled={saving || result.importedRowCount === result.pendingRowCount}
          onClick={onConfirm}
        >
          {saving ? '正在保存…' : '确认并保存词表'}
        </button>
      </div>
    </section>
  )
}
