import { describe, expect, it } from 'vitest'

import { getPlayableUnits, validateContentPack } from '../content/validate-pack'
import type { VocabularyUnit } from '../learning/model'
import { CET4_MVP_PACK } from '../../data/packs'
import { buildImportedPack } from './build-imported-pack'
import { autoMapColumns } from './map-columns'
import { parseTable } from './parse-table'

const bankCandidates: readonly VocabularyUnit[] = [
  {
    id: 'dictionary:bank:finance',
    type: 'vocab',
    term: 'bank',
    normalizedTerm: 'bank',
    senseId: 'finance',
    definitionZh: '银行',
    acceptedMeanings: ['银行'],
    phonetic: '/bæŋk/',
    partOfSpeech: 'noun',
    example: 'She went to the bank.',
    exampleZh: '她去了银行。',
    curriculumTags: ['cet4'],
    enrichmentStatus: 'complete',
    source: { kind: 'builtin', name: 'test dictionary', license: 'CC0-1.0' },
  },
  {
    id: 'dictionary:bank:river-side',
    type: 'vocab',
    term: 'bank',
    normalizedTerm: 'bank',
    senseId: 'river-side',
    definitionZh: '河岸',
    acceptedMeanings: ['河岸'],
    phonetic: '/bæŋk/',
    partOfSpeech: 'noun',
    example: 'They sat on the river bank.',
    exampleZh: '他们坐在河岸上。',
    curriculumTags: ['cet4'],
    enrichmentStatus: 'complete',
    source: { kind: 'builtin', name: 'test dictionary', license: 'CC0-1.0' },
  },
]

const csv = `Term,Definition,phonetic,part_of_speech,example,example_zh,tags
 Abandon , 放弃 ,/əˈbændən/,verb,We abandoned it.,我们放弃了它。,cet4;important
ABANDON,放弃,,verb,,,cet4
abandon,遗弃,,verb,,,cet4
Benefit,,,,,,cet4
bank,,,,,,custom
mystery,,,,,,custom`

describe('custom vocabulary import', () => {
  it('auto-maps common English and Chinese header aliases', () => {
    expect(
      autoMapColumns([
        '单词',
        '释义',
        '音标',
        '词性',
        '例句',
        '例句翻译',
        '标签',
      ]),
    ).toEqual({
      term: 0,
      definition: 1,
      phonetic: 2,
      partOfSpeech: 3,
      example: 4,
      exampleZh: 5,
      tags: 6,
    })
  })

  it('normalizes matching keys, preserves display text, deduplicates senses, and enriches unique matches', () => {
    const parsed = parseTable(csv)
    const mapping = autoMapColumns(parsed.headers)
    const result = buildImportedPack({
      packId: 'custom:test-pack',
      name: '我的词表',
      parsed,
      mapping,
      dictionaryUnits: [
        ...CET4_MVP_PACK.units.filter((unit): unit is VocabularyUnit => unit.type === 'vocab'),
        ...bankCandidates,
      ],
      importedAt: 1_800_000_000_000,
    })

    expect(result.importedRowCount).toBe(5)
    expect(result.duplicateRowCount).toBe(1)
    expect(result.pendingRowCount).toBe(2)
    expect(result.resolutionRequests).toEqual([
      {
        rowNumber: 6,
        normalizedTerm: 'bank',
        candidateUnitIds: [
          'dictionary:bank:finance',
          'dictionary:bank:river-side',
        ],
      },
    ])
    expect(result.errors).toContainEqual({
      code: 'duplicate-row',
      rowNumber: 3,
      value: 'ABANDON',
      message: '该词义与第 2 行重复，已跳过。',
    })

    const abandon = result.rowUnits[2]!
    expect(abandon).toMatchObject({
      term: 'Abandon',
      normalizedTerm: 'abandon',
      definitionZh: '放弃',
      enrichmentStatus: 'complete',
      tags: ['cet4', 'important'],
    })
    const benefit = result.rowUnits[5]!
    expect(benefit).toMatchObject({
      term: 'Benefit',
      normalizedTerm: 'benefit',
      definitionZh: '益处；好处',
      enrichmentStatus: 'complete',
    })
    expect(result.rowUnits[6]).toMatchObject({ enrichmentStatus: 'pending' })
    expect(result.rowUnits[7]).toMatchObject({ enrichmentStatus: 'pending' })
    expect(getPlayableUnits(result.pack)).toHaveLength(3)
    expect(result.pack.exercises).toHaveLength(12)
    expect(validateContentPack(result.pack)).toEqual([])
  })

  it('uses an explicit sense selection instead of merging ambiguous dictionary meanings', () => {
    const parsed = parseTable(csv)
    const result = buildImportedPack({
      packId: 'custom:resolved-pack',
      name: '已消歧词表',
      parsed,
      mapping: autoMapColumns(parsed.headers),
      dictionaryUnits: bankCandidates,
      senseSelections: { 6: 'dictionary:bank:river-side' },
      importedAt: 1_800_000_000_000,
    })

    expect(result.rowUnits[6]).toMatchObject({
      definitionZh: '河岸',
      senseId: 'river-side',
      enrichmentStatus: 'complete',
    })
    expect(result.resolutionRequests).toEqual([])
    expect(result.pendingRowCount).toBe(2)
  })

  it('accepts a manual definition for a row that cannot be enriched', () => {
    const parsed = parseTable('word,meaning\nmystery,')
    const result = buildImportedPack({
      packId: 'custom:manual-definition',
      name: '手工补全',
      parsed,
      mapping: autoMapColumns(parsed.headers),
      dictionaryUnits: [],
      definitionOverrides: { 2: '谜；神秘事物' },
      importedAt: 1_800_000_000_000,
    })

    expect(result.pendingRowCount).toBe(0)
    expect(result.rowUnits[2]).toMatchObject({
      definitionZh: '谜；神秘事物',
      enrichmentStatus: 'complete',
    })
    expect(result.pack.exercises).toHaveLength(4)
  })
})
