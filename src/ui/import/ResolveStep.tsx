import type { ImportedPackResult } from '../../core/import/model'
import type { VocabularyUnit } from '../../core/learning/model'

interface ResolveStepProps {
  readonly result: ImportedPackResult
  readonly dictionaryUnits: readonly VocabularyUnit[]
  readonly senseSelections: Readonly<Record<number, string>>
  readonly definitionOverrides: Readonly<Record<number, string>>
  readonly onSenseChange: (rowNumber: number, unitId: string) => void
  readonly onDefinitionChange: (rowNumber: number, definition: string) => void
  readonly onBack: () => void
  readonly onContinue: () => void
}

export function ResolveStep({
  result,
  dictionaryUnits,
  senseSelections,
  definitionOverrides,
  onSenseChange,
  onDefinitionChange,
  onBack,
  onContinue,
}: ResolveStepProps) {
  const pendingRows = Object.entries(result.rowUnits)
    .map(([rowNumber, unit]) => ({ rowNumber: Number(rowNumber), unit }))
    .filter(({ unit }) => unit.enrichmentStatus === 'pending')

  return (
    <section className="import-step" aria-labelledby="resolve-step-title">
      <p className="eyebrow">第 3 步，共 4 步</p>
      <h1 id="resolve-step-title">处理多义词与缺失释义</h1>
      <p>多义词不会自动合并。选择目标词义或手工填写释义；未补全项会以 pending 保存，暂不进入战斗。</p>

      <div className="resolve-list">
        {pendingRows.map(({ rowNumber, unit }) => {
          const request = result.resolutionRequests.find(
            (candidate) => candidate.rowNumber === rowNumber,
          )
          return (
            <article key={rowNumber}>
              <div>
                <span>第 {rowNumber} 行</span>
                <h2>{unit.term}</h2>
              </div>
              {request ? (
                <label className="field-stack">
                  <span>选择目标词义</span>
                  <select
                    value={senseSelections[rowNumber] ?? ''}
                    onChange={(event) => onSenseChange(rowNumber, event.target.value)}
                  >
                    <option value="">暂不选择</option>
                    {request.candidateUnitIds.map((candidateId) => {
                      const candidate = dictionaryUnits.find((item) => item.id === candidateId)
                      return (
                        <option key={candidateId} value={candidateId}>
                          {candidate?.definitionZh ?? candidateId}
                          {candidate?.partOfSpeech ? ` · ${candidate.partOfSpeech}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </label>
              ) : null}
              <label className="field-stack">
                <span>或手工填写中文释义</span>
                <input
                  value={definitionOverrides[rowNumber] ?? ''}
                  placeholder="留空则保存为 pending"
                  onChange={(event) => onDefinitionChange(rowNumber, event.target.value)}
                />
              </label>
            </article>
          )
        })}
      </div>

      <div className="import-actions">
        <button type="button" className="button button--quiet" onClick={onBack}>上一步</button>
        <button type="button" className="button button--primary" onClick={onContinue}>生成确认预览</button>
      </div>
    </section>
  )
}
