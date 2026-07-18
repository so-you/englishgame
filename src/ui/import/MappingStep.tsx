import type {
  ColumnMapping,
  ImportField,
  ParsedTable,
} from '../../core/import/model'

const FIELDS: readonly { field: ImportField; label: string; required?: boolean }[] = [
  { field: 'term', label: '英文词汇', required: true },
  { field: 'definition', label: '中文释义' },
  { field: 'phonetic', label: '音标' },
  { field: 'partOfSpeech', label: '词性' },
  { field: 'example', label: '英文例句' },
  { field: 'exampleZh', label: '例句翻译' },
  { field: 'tags', label: '标签' },
]

interface MappingStepProps {
  readonly parsed: ParsedTable
  readonly mapping: ColumnMapping
  readonly onMappingChange: (mapping: ColumnMapping) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}

export function MappingStep({
  parsed,
  mapping,
  onMappingChange,
  onBack,
  onContinue,
}: MappingStepProps) {
  return (
    <section className="import-step" aria-labelledby="mapping-step-title">
      <p className="eyebrow">第 2 步，共 4 步</p>
      <h1 id="mapping-step-title">确认列对应关系</h1>
      <p>
        已按 UTF-8 读取并识别为 {parsed.delimiter === '\t' ? 'TSV（制表符）' : 'CSV（逗号）'}；
        请确认至少一列映射为英文词汇。
      </p>

      {parsed.errors.length > 0 ? (
        <div className="import-warning" role="alert">
          解析发现 {parsed.errors.length} 个问题，确认页可下载逐行报告。
        </div>
      ) : null}

      <div className="mapping-grid">
        {FIELDS.map(({ field, label, required }) => (
          <label key={field}>
            <span>{label}{required ? '（必填）' : ''}</span>
            <select
              value={mapping[field] ?? ''}
              onChange={(event) => {
                const value = event.target.value
                onMappingChange({
                  ...mapping,
                  [field]: value === '' ? undefined : Number(value),
                })
              }}
            >
              <option value="">不导入</option>
              {parsed.headers.map((header, index) => (
                <option key={`${header}-${index}`} value={index}>{header || `第 ${index + 1} 列`}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="table-scroll">
        <table>
          <caption>前 {parsed.previewRows.length} 行预览</caption>
          <thead><tr>{parsed.headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead>
          <tbody>
            {parsed.previewRows.map((row) => (
              <tr key={row.rowNumber}>
                {parsed.headers.map((_, index) => <td key={index}>{row.values[index] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="import-actions">
        <button type="button" className="button button--quiet" onClick={onBack}>上一步</button>
        <button
          type="button"
          className="button button--primary"
          disabled={mapping.term === undefined}
          onClick={onContinue}
        >
          检查与补全
        </button>
      </div>
    </section>
  )
}
