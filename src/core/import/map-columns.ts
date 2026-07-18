import { normalizeDisplayText } from '../learning/normalize-text'
import type {
  ColumnMapping,
  ImportError,
  ImportField,
  MappedImportRow,
  ParsedTableRow,
} from './model'

const HEADER_ALIASES: Readonly<Record<ImportField, readonly string[]>> = {
  term: ['term', 'word', 'phrase', '单词', '词汇', '短语'],
  definition: ['definition', 'meaning', '释义', '含义', '中文释义'],
  phonetic: ['phonetic', 'ipa', '音标'],
  partOfSpeech: ['partofspeech', 'pos', '词性'],
  example: ['example', 'sentence', '例句', '英文例句'],
  exampleZh: ['examplezh', 'translation', '例句翻译', '中文例句'],
  tags: ['tags', 'tag', '标签'],
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[\s_-]+/g, '')
}

export function autoMapColumns(headers: readonly string[]): ColumnMapping {
  const mapping: Partial<Record<ImportField, number>> = {}
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
      [ImportField, readonly string[]]
    >) {
      if (mapping[field] === undefined && aliases.includes(normalized)) {
        mapping[field] = index
        break
      }
    }
  })
  return mapping
}

export function validateColumnMapping(
  headers: readonly string[],
  mapping: ColumnMapping,
): readonly ImportError[] {
  if (
    mapping.term === undefined ||
    !Number.isInteger(mapping.term) ||
    mapping.term < 0 ||
    mapping.term >= headers.length
  ) {
    return [
      {
        code: 'invalid-column-mapping',
        field: 'term',
        message: '必须把一列表头映射为 term。',
      },
    ]
  }
  return []
}

function valueAt(
  row: ParsedTableRow,
  mapping: ColumnMapping,
  field: ImportField,
): string {
  const index = mapping[field]
  return index === undefined ? '' : normalizeDisplayText(row.values[index] ?? '')
}

export function mapTableRow(
  row: ParsedTableRow,
  mapping: ColumnMapping,
): MappedImportRow {
  const tags = valueAt(row, mapping, 'tags')
    .split(/[,;|]/)
    .map(normalizeDisplayText)
    .filter(Boolean)
  return {
    rowNumber: row.rowNumber,
    term: valueAt(row, mapping, 'term'),
    definition: valueAt(row, mapping, 'definition'),
    phonetic: valueAt(row, mapping, 'phonetic'),
    partOfSpeech: valueAt(row, mapping, 'partOfSpeech'),
    example: valueAt(row, mapping, 'example'),
    exampleZh: valueAt(row, mapping, 'exampleZh'),
    tags,
  }
}
