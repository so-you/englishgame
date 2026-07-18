export type EducationStage = 'junior' | 'senior' | 'university' | 'custom'

export type CurriculumTag =
  | 'junior'
  | 'senior'
  | 'cet4'
  | 'cet6'
  | 'postgraduate'
  | 'custom'

export interface SourceInfo {
  readonly kind: 'builtin' | 'import' | 'llm-enriched'
  readonly name?: string
  readonly license?: string
  readonly importedAt?: number
}

interface LearningUnitBase {
  readonly id: string
  readonly curriculumTags: readonly CurriculumTag[]
  readonly source: SourceInfo
}

export interface VocabularyUnit extends LearningUnitBase {
  readonly type: 'vocab'
  readonly term: string
  readonly normalizedTerm: string
  readonly senseId: string
  readonly definitionZh: string
  readonly acceptedMeanings?: readonly string[]
  readonly phonetic?: string
  readonly partOfSpeech?: string
  readonly example?: string
  readonly exampleZh?: string
  readonly roots?: string
  readonly frequencyRank?: number
  readonly tags?: readonly string[]
  readonly enrichmentStatus: 'complete' | 'pending' | 'incomplete'
}

export interface GrammarUnit extends LearningUnitBase {
  readonly type: 'grammar'
  readonly name: string
  readonly explanationZh: string
  readonly examples: readonly { readonly en: string; readonly zh: string }[]
  readonly exerciseIds: readonly string[]
}

export type LearningUnit = VocabularyUnit | GrammarUnit

export type ExerciseKind =
  | 'vocab-meaning-choice'
  | 'vocab-word-choice'
  | 'vocab-spelling'
  | 'vocab-listening-spelling'
  | 'grammar-cloze'
  | 'grammar-reorder'
  | 'grammar-error-correction'
  | 'grammar-transformation'

export type AnswerSpec =
  | { readonly kind: 'choice'; readonly correctOptionId: string }
  | {
      readonly kind: 'text'
      readonly accepted: readonly string[]
      readonly caseSensitive?: boolean
    }
  | {
      readonly kind: 'token-order'
      readonly acceptedOrders: readonly (readonly string[])[]
    }

export interface Exercise {
  readonly id: string
  readonly unitId: string
  readonly kind: ExerciseKind
  readonly prompt: string
  readonly options?: readonly { readonly id: string; readonly text: string }[]
  readonly answer: AnswerSpec
  readonly explanation: string
  readonly difficulty: 1 | 2 | 3 | 4
}

export interface ContentPack {
  readonly id: string
  readonly schemaVersion: number
  readonly name: string
  readonly stage: EducationStage
  readonly curriculumTags: readonly CurriculumTag[]
  readonly units: readonly LearningUnit[]
  readonly exercises: readonly Exercise[]
  readonly source: SourceInfo
}
