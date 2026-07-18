import { useState } from 'react'

import { buildImportErrorCsv } from '../../core/import/error-report'
import { buildImportedPack } from '../../core/import/build-imported-pack'
import { autoMapColumns } from '../../core/import/map-columns'
import type {
  ColumnMapping,
  ImportedPackResult,
  ParsedTable,
} from '../../core/import/model'
import { parseTable } from '../../core/import/parse-table'
import type { ContentPack, VocabularyUnit } from '../../core/learning/model'
import { FileStep } from './FileStep'
import { ImportResult } from './ImportResult'
import { MappingStep } from './MappingStep'
import { PreviewStep } from './PreviewStep'
import { ResolveStep } from './ResolveStep'

interface SaveResult {
  readonly ok: boolean
  readonly error?: { readonly message: string }
}

interface ImportWizardProps {
  readonly dictionaryUnits: readonly VocabularyUnit[]
  readonly onSave: (pack: ContentPack) => Promise<SaveResult>
  readonly onDone: () => void
  readonly onCancel: () => void
}

type ImportStep = 'file' | 'mapping' | 'resolve' | 'preview' | 'result'

export function ImportWizard({
  dictionaryUnits,
  onSave,
  onDone,
  onCancel,
}: ImportWizardProps) {
  const [step, setStep] = useState<ImportStep>('file')
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedTable>()
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [identity, setIdentity] = useState<{ packId: string; importedAt: number }>()
  const [senseSelections, setSenseSelections] = useState<Record<number, string>>({})
  const [definitionOverrides, setDefinitionOverrides] = useState<Record<number, string>>({})
  const [result, setResult] = useState<ImportedPackResult>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()

  const buildResult = (): ImportedPackResult | undefined => {
    if (!parsed || !identity) return undefined
    return buildImportedPack({
      ...identity,
      name,
      parsed,
      mapping,
      dictionaryUnits,
      senseSelections,
      definitionOverrides,
    })
  }

  const downloadErrors = () => {
    if (!result) return
    const blob = new Blob([buildImportErrorCsv(result.errors)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'vocabulary-import-errors.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="screen import-screen">
      {step === 'file' ? (
        <FileStep
          name={name}
          text={text}
          onNameChange={setName}
          onTextChange={setText}
          onCancel={onCancel}
          onContinue={() => {
            const nextParsed = parseTable(text)
            setParsed(nextParsed)
            setMapping(autoMapColumns(nextParsed.headers))
            setIdentity({
              packId: `custom:${crypto.randomUUID()}`,
              importedAt: Date.now(),
            })
            setStep('mapping')
          }}
        />
      ) : null}

      {step === 'mapping' && parsed ? (
        <MappingStep
          parsed={parsed}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={() => setStep('file')}
          onContinue={() => {
            const next = buildResult()
            if (!next) return
            setResult(next)
            setStep(
              next.resolutionRequests.length > 0 || next.pendingRowCount > 0
                ? 'resolve'
                : 'preview',
            )
          }}
        />
      ) : null}

      {step === 'resolve' && result ? (
        <ResolveStep
          result={result}
          dictionaryUnits={dictionaryUnits}
          senseSelections={senseSelections}
          definitionOverrides={definitionOverrides}
          onSenseChange={(rowNumber, unitId) =>
            setSenseSelections((current) => ({ ...current, [rowNumber]: unitId }))
          }
          onDefinitionChange={(rowNumber, definition) =>
            setDefinitionOverrides((current) => ({
              ...current,
              [rowNumber]: definition,
            }))
          }
          onBack={() => setStep('mapping')}
          onContinue={() => {
            const next = buildResult()
            if (!next) return
            setResult(next)
            setStep('preview')
          }}
        />
      ) : null}

      {step === 'preview' && result ? (
        <PreviewStep
          result={result}
          saving={saving}
          saveError={saveError}
          onBack={() =>
            setStep(
              result.resolutionRequests.length > 0 || result.pendingRowCount > 0
                ? 'resolve'
                : 'mapping',
            )
          }
          onDownloadErrors={downloadErrors}
          onConfirm={() => {
            setSaving(true)
            setSaveError(undefined)
            void onSave(result.pack).then((saved) => {
              setSaving(false)
              if (!saved.ok) {
                setSaveError(saved.error?.message ?? '无法保存词表。')
                return
              }
              setStep('result')
            })
          }}
        />
      ) : null}

      {step === 'result' && result ? (
        <ImportResult
          name={result.pack.name}
          playableCount={result.importedRowCount - result.pendingRowCount}
          pendingCount={result.pendingRowCount}
          onDone={onDone}
        />
      ) : null}
    </main>
  )
}
