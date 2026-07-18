import type {
  ContentPack,
  CurriculumTag,
  Exercise,
  SourceInfo,
  VocabularyUnit,
} from '../learning/model'
import {
  normalizeDisplayText,
  normalizeMatchText,
} from '../learning/normalize-text'
import type {
  ColumnMapping,
  ImportedPackResult,
  ImportError,
  ImportResolutionRequest,
  ParsedTable,
} from './model'
import {
  mapTableRow,
  validateColumnMapping,
} from './map-columns'

export interface BuildImportedPackInput {
  readonly packId: string
  readonly name: string
  readonly parsed: ParsedTable
  readonly mapping: ColumnMapping
  readonly dictionaryUnits: readonly VocabularyUnit[]
  readonly senseSelections?: Readonly<Record<number, string>>
  readonly definitionOverrides?: Readonly<Record<number, string>>
  readonly importedAt: number
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function curriculumTags(tags: readonly string[]): readonly CurriculumTag[] {
  const recognized = tags.filter((tag): tag is CurriculumTag =>
    ['junior', 'senior', 'cet4', 'cet6', 'postgraduate', 'custom'].includes(tag),
  )
  return [...new Set<CurriculumTag>(['custom', ...recognized])]
}

function exercisesFor(
  unit: VocabularyUnit,
  units: readonly VocabularyUnit[],
): readonly Exercise[] {
  const unitIndex = units.findIndex((candidate) => candidate.id === unit.id)
  const choices = Array.from(
    { length: Math.min(4, units.length) },
    (_, offset) => units[(unitIndex + offset) % units.length]!,
  )
  return [
    {
      id: `${unit.id}:meaning-choice`,
      unitId: unit.id,
      kind: 'vocab-meaning-choice',
      prompt: `“${unit.term}”的目标含义是？`,
      options: choices.map((candidate) => ({
        id: candidate.id,
        text: candidate.definitionZh,
      })),
      answer: { kind: 'choice', correctOptionId: unit.id },
      explanation: `${unit.term}：${unit.definitionZh}。`,
      difficulty: 1,
    },
    {
      id: `${unit.id}:word-choice`,
      unitId: unit.id,
      kind: 'vocab-word-choice',
      prompt: `哪个词表示“${unit.definitionZh}”？`,
      options: choices.map((candidate) => ({
        id: candidate.id,
        text: candidate.term,
      })),
      answer: { kind: 'choice', correctOptionId: unit.id },
      explanation: `${unit.term} 表示“${unit.definitionZh}”。`,
      difficulty: 2,
    },
    {
      id: `${unit.id}:spelling`,
      unitId: unit.id,
      kind: 'vocab-spelling',
      prompt: `根据中文义拼写英文：${unit.definitionZh}`,
      answer: { kind: 'text', accepted: [unit.term] },
      explanation: `${unit.term}：${unit.definitionZh}。`,
      difficulty: 3,
    },
    {
      id: `${unit.id}:listening-spelling`,
      unitId: unit.id,
      kind: 'vocab-listening-spelling',
      prompt: '听音后拼写目标词。',
      answer: { kind: 'text', accepted: [unit.term] },
      explanation: `${unit.term}：${unit.definitionZh}。`,
      difficulty: 4,
    },
  ]
}

export function buildImportedPack(
  input: BuildImportedPackInput,
): ImportedPackResult {
  const errors: ImportError[] = [
    ...input.parsed.errors,
    ...validateColumnMapping(input.parsed.headers, input.mapping),
  ]
  const units: VocabularyUnit[] = []
  const rowUnits: Record<number, VocabularyUnit> = {}
  const resolutionRequests: ImportResolutionRequest[] = []
  const seenKeys = new Map<string, number>()
  let duplicateRowCount = 0

  if (!input.mapping.term && input.mapping.term !== 0) {
    return {
      pack: {
        id: input.packId,
        schemaVersion: 1,
        name: normalizeDisplayText(input.name),
        stage: 'custom',
        curriculumTags: ['custom'],
        units: [],
        exercises: [],
        source: {
          kind: 'import',
          name: normalizeDisplayText(input.name),
          importedAt: input.importedAt,
        },
      },
      errors,
      importedRowCount: 0,
      pendingRowCount: 0,
      duplicateRowCount: 0,
      resolutionRequests,
      rowUnits,
    }
  }

  for (const parsedRow of input.parsed.rows) {
    const row = mapTableRow(parsedRow, input.mapping)
    if (!row.term) {
      errors.push({
        code: 'missing-term',
        rowNumber: row.rowNumber,
        field: 'term',
        message: 'term 不能为空。',
      })
      continue
    }

    const normalizedTerm = normalizeMatchText(row.term)
    const candidates = input.dictionaryUnits.filter(
      (candidate) => candidate.normalizedTerm === normalizedTerm,
    )
    const selectedId = input.senseSelections?.[row.rowNumber]
    const selectedCandidate = row.definition
      ? undefined
      : candidates.find((candidate) => candidate.id === selectedId) ??
        (candidates.length === 1 ? candidates[0] : undefined)
    const definition = normalizeDisplayText(
      row.definition ||
        input.definitionOverrides?.[row.rowNumber] ||
        selectedCandidate?.definitionZh ||
        '',
    )
    if (!definition && candidates.length > 1 && !selectedCandidate) {
      resolutionRequests.push({
        rowNumber: row.rowNumber,
        normalizedTerm,
        candidateUnitIds: candidates.map((candidate) => candidate.id),
      })
    }

    const matchKey = `${normalizedTerm}\u0000${normalizeMatchText(definition)}`
    const duplicateOf = seenKeys.get(matchKey)
    if (duplicateOf !== undefined) {
      duplicateRowCount += 1
      errors.push({
        code: 'duplicate-row',
        rowNumber: row.rowNumber,
        value: row.term,
        message: `该词义与第 ${duplicateOf} 行重复，已跳过。`,
      })
      continue
    }
    seenKeys.set(matchKey, row.rowNumber)

    const identityHash = stableHash(matchKey)
    const source: SourceInfo = {
      kind: 'import',
      name: selectedCandidate?.source.name
        ? `${input.name}; enriched from ${selectedCandidate.source.name}`
        : input.name,
      license: selectedCandidate?.source.license,
      importedAt: input.importedAt,
    }
    const unit: VocabularyUnit = {
      id: `${input.packId}:vocab:${identityHash}`,
      type: 'vocab',
      term: row.term,
      normalizedTerm,
      senseId: selectedCandidate?.senseId ?? `import-${identityHash}`,
      definitionZh: definition,
      acceptedMeanings:
        selectedCandidate?.acceptedMeanings ?? (definition ? [definition] : []),
      phonetic: row.phonetic || selectedCandidate?.phonetic,
      partOfSpeech: row.partOfSpeech || selectedCandidate?.partOfSpeech,
      example: row.example || selectedCandidate?.example,
      exampleZh: row.exampleZh || selectedCandidate?.exampleZh,
      curriculumTags: curriculumTags(row.tags),
      tags: row.tags,
      enrichmentStatus: definition ? 'complete' : 'pending',
      source,
    }
    units.push(unit)
    rowUnits[row.rowNumber] = unit
  }

  const playableUnits = units.filter(
    (unit) => unit.enrichmentStatus === 'complete',
  )
  const source: SourceInfo = {
    kind: 'import',
    name: normalizeDisplayText(input.name),
    importedAt: input.importedAt,
  }
  const pack: ContentPack = {
    id: input.packId,
    schemaVersion: 1,
    name: normalizeDisplayText(input.name),
    stage: 'custom',
    curriculumTags: ['custom'],
    units,
    exercises: playableUnits.flatMap((unit) =>
      exercisesFor(unit, playableUnits),
    ),
    source,
  }

  return {
    pack,
    errors,
    importedRowCount: units.length,
    pendingRowCount: units.length - playableUnits.length,
    duplicateRowCount,
    resolutionRequests,
    rowUnits,
  }
}
