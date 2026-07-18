interface ImportResultProps {
  readonly name: string
  readonly playableCount: number
  readonly pendingCount: number
  readonly onDone: () => void
}

export function ImportResult({
  name,
  playableCount,
  pendingCount,
  onDone,
}: ImportResultProps) {
  return (
    <section className="import-step import-success centered-panel" aria-labelledby="import-result-title">
      <p className="eyebrow">导入完成</p>
      <h1 id="import-result-title">“{name}”已保存</h1>
      <p>{playableCount} 个词条可以立即学习，{pendingCount} 个词条等待补全。</p>
      <button type="button" className="button button--primary button--large" onClick={onDone}>
        返回主页选择词表
      </button>
    </section>
  )
}
