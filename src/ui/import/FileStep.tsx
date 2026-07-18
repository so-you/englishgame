interface FileStepProps {
  readonly name: string
  readonly text: string
  readonly onNameChange: (name: string) => void
  readonly onTextChange: (text: string) => void
  readonly onContinue: () => void
  readonly onCancel: () => void
}

export function FileStep({
  name,
  text,
  onNameChange,
  onTextChange,
  onContinue,
  onCancel,
}: FileStepProps) {
  return (
    <section className="import-step" aria-labelledby="file-step-title">
      <p className="eyebrow">第 1 步，共 4 步</p>
      <h1 id="file-step-title">选择词表数据</h1>
      <p>支持 UTF-8 CSV、TSV，也可以直接粘贴带表头的文本；上限 5 MB、5000 行。</p>

      <label className="field-stack">
        <span>词表名称</span>
        <input
          value={name}
          maxLength={80}
          placeholder="例如：九年级 Unit 1"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>
      <label className="file-picker">
        <span>选择 CSV 或 TSV 文件</span>
        <input
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void file.text().then(onTextChange)
          }}
        />
      </label>
      <div className="import-or"><span>或粘贴文本</span></div>
      <label className="field-stack">
        <span>带表头的词表内容</span>
        <textarea
          value={text}
          rows={10}
          placeholder={'word,meaning,phonetic\nabandon,放弃,/əˈbændən/'}
          onChange={(event) => onTextChange(event.target.value)}
        />
      </label>

      <div className="import-actions">
        <button type="button" className="button button--quiet" onClick={onCancel}>
          返回主页
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={!name.trim() || !text.trim()}
          onClick={onContinue}
        >
          解析词表
        </button>
      </div>
    </section>
  )
}
