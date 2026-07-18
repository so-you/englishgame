import type { ContentPack, VocabularyUnit } from '../learning/model'

export type TableDelimiter = ',' | '\t'

export type ImportErrorCode =
  | 'file-too-large'
  | 'too-many-rows'
  | 'missing-header'
  | 'unterminated-quote'
  | 'column-count-mismatch'
  | 'missing-term'
  | 'invalid-column-mapping'
  | 'duplicate-row'

export interface ImportError {
  readonly code: ImportErrorCode
  readonly rowNumber?: number
  readonly field?: string
  readonly value?: string
  readonly message: string
}

export interface ParsedTableRow {
  readonly rowNumber: number
  readonly values: readonly string[]
}

export interface ParsedTable {
  readonly delimiter: TableDelimiter
  readonly headers: readonly string[]
  readonly rows: readonly ParsedTableRow[]
  readonly previewRows: readonly ParsedTableRow[]
  readonly errors: readonly ImportError[]
}

export type ImportField =
  | 'term'
  | 'definition'
  | 'phonetic'
  | 'partOfSpeech'
  | 'example'
  | 'exampleZh'
  | 'tags'

export type ColumnMapping = Readonly<Partial<Record<ImportField, number>>>

export interface MappedImportRow {
  readonly rowNumber: number
  readonly term: string
  readonly definition: string
  readonly phonetic: string
  readonly partOfSpeech: string
  readonly example: string
  readonly exampleZh: string
  readonly tags: readonly string[]
}

export interface ImportResolutionRequest {
  readonly rowNumber: number
  readonly normalizedTerm: string
  readonly candidateUnitIds: readonly string[]
}

export interface ImportedPackResult {
  readonly pack: ContentPack
  readonly errors: readonly ImportError[]
  readonly importedRowCount: number
  readonly pendingRowCount: number
  readonly duplicateRowCount: number
  readonly resolutionRequests: readonly ImportResolutionRequest[]
  readonly rowUnits: Readonly<Record<number, VocabularyUnit>>
}
