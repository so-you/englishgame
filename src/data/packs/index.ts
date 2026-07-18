import type {
  ContentPack,
  Exercise,
  VocabularyUnit,
} from '../../core/learning/model'
import rawContent from './cet4-mvp.json'

interface RawVocabularyUnit {
  readonly id: string
  readonly term: string
  readonly senseId: string
  readonly definitionZh: string
  readonly acceptedMeanings: readonly string[]
  readonly phonetic: string
  readonly partOfSpeech: string
  readonly example: string
  readonly exampleZh: string
  readonly frequencyRank: number
}

const SOURCE = {
  kind: 'builtin' as const,
  name: 'English Roguelike original CET4 MVP content',
  license: 'CC0-1.0',
}

function rotate<T>(items: readonly T[], offset: number): readonly T[] {
  const pivot = offset % items.length
  return [...items.slice(pivot), ...items.slice(0, pivot)]
}

function choiceUnitsFor(
  unit: VocabularyUnit,
  units: readonly VocabularyUnit[],
  unitIndex: number,
): readonly VocabularyUnit[] {
  const peers = units.filter(
    (candidate) => candidate.partOfSpeech === unit.partOfSpeech,
  )
  const peerIndex = peers.findIndex((candidate) => candidate.id === unit.id)
  const choices = Array.from(
    { length: 4 },
    (_, offset) => peers[(peerIndex + offset) % peers.length]!,
  )
  return rotate(choices, unitIndex % choices.length)
}

function exercisesFor(
  unit: VocabularyUnit,
  units: readonly VocabularyUnit[],
  unitIndex: number,
): readonly Exercise[] {
  const choices = choiceUnitsFor(unit, units, unitIndex)
  return [
    {
      id: `${unit.id}:meaning-choice`,
      unitId: unit.id,
      kind: 'vocab-meaning-choice',
      prompt: `“${unit.term}”在本单元中的核心含义是？`,
      options: choices.map((candidate) => ({
        id: candidate.id,
        text: candidate.definitionZh,
      })),
      answer: { kind: 'choice', correctOptionId: unit.id },
      explanation: `${unit.term}：${unit.definitionZh}。${unit.example}`,
      difficulty: 1,
    },
    {
      id: `${unit.id}:word-choice`,
      unitId: unit.id,
      kind: 'vocab-word-choice',
      prompt: `哪个词最符合“${unit.definitionZh}”？`,
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
      explanation: `${unit.term} ${unit.phonetic}：${unit.definitionZh}。`,
      difficulty: 3,
    },
    {
      id: `${unit.id}:listening-spelling`,
      unitId: unit.id,
      kind: 'vocab-listening-spelling',
      prompt: '听音后拼写目标词。',
      answer: { kind: 'text', accepted: [unit.term] },
      explanation: `${unit.term} ${unit.phonetic}：${unit.definitionZh}。`,
      difficulty: 4,
    },
  ]
}

export function buildCet4MvpPack(): ContentPack {
  const rawUnits = rawContent.units as readonly RawVocabularyUnit[]
  const units: readonly VocabularyUnit[] = rawUnits.map((unit) => ({
    ...unit,
    type: 'vocab',
    normalizedTerm: unit.term.normalize('NFC').toLocaleLowerCase('en-US'),
    curriculumTags: ['cet4'],
    enrichmentStatus: 'complete',
    source: SOURCE,
  }))
  const exercises = units.flatMap((unit, index) =>
    exercisesFor(unit, units, index),
  )

  return {
    id: 'builtin:cet4-mvp-v1',
    schemaVersion: 1,
    name: 'CET4 核心 30 词',
    stage: 'university',
    curriculumTags: ['cet4'],
    units,
    exercises,
    source: SOURCE,
  }
}

export const CET4_MVP_PACK = buildCet4MvpPack()
export const BUILTIN_PACKS: readonly ContentPack[] = [CET4_MVP_PACK]
