import { MVP_BALANCE } from '../config/mvp-balance'
import type {
  ImportError,
  ParsedTable,
  ParsedTableRow,
  TableDelimiter,
} from './model'

function detectDelimiter(text: string): TableDelimiter {
  let commas = 0
  let tabs = 0
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (!inQuotes && (character === '\n' || character === '\r')) {
      break
    } else if (!inQuotes && character === ',') {
      commas += 1
    } else if (!inQuotes && character === '\t') {
      tabs += 1
    }
  }

  return tabs > commas ? '\t' : ','
}

interface RawParseResult {
  readonly rows: readonly ParsedTableRow[]
  readonly errors: readonly ImportError[]
}

function parseRows(text: string, delimiter: TableDelimiter): RawParseResult {
  const rows: ParsedTableRow[] = []
  const errors: ImportError[] = []
  let values: string[] = []
  let field = ''
  let inQuotes = false
  let physicalLine = 1
  let rowStartLine = 1

  const finishRow = () => {
    values.push(field)
    if (values.some((value) => value.length > 0)) {
      rows.push({ rowNumber: rowStartLine, values })
    }
    values = []
    field = ''
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && text[index + 1] === '\n') index += 1
        field += '\n'
        physicalLine += 1
      } else {
        field += character
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true
    } else if (character === delimiter) {
      values.push(field)
      field = ''
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      finishRow()
      physicalLine += 1
      rowStartLine = physicalLine
    } else {
      field += character
    }
  }

  if (inQuotes) {
    errors.push({
      code: 'unterminated-quote',
      rowNumber: rowStartLine,
      message: '引号字段没有正确结束。',
    })
  }
  if (field.length > 0 || values.length > 0) finishRow()

  return { rows, errors }
}

export function parseTable(input: string): ParsedTable {
  const text = input.startsWith('\uFEFF') ? input.slice(1) : input
  const delimiter = detectDelimiter(text)
  const errors: ImportError[] = []

  if (new TextEncoder().encode(input).byteLength > MVP_BALANCE.importMaxBytes) {
    return {
      delimiter,
      headers: [],
      rows: [],
      previewRows: [],
      errors: [
        {
          code: 'file-too-large',
          message: `文件不能超过 ${MVP_BALANCE.importMaxBytes} 字节。`,
        },
      ],
    }
  }

  const parsed = parseRows(text, delimiter)
  errors.push(...parsed.errors)
  const headerRow = parsed.rows[0]
  if (!headerRow) {
    return {
      delimiter,
      headers: [],
      rows: [],
      previewRows: [],
      errors: [
        ...errors,
        { code: 'missing-header', message: '导入表格必须包含表头。' },
      ],
    }
  }

  const headers = headerRow.values.map((header) => header.trim())
  const allDataRows = parsed.rows.slice(1)
  const rows = allDataRows.slice(0, MVP_BALANCE.importMaxRows)
  if (allDataRows.length > MVP_BALANCE.importMaxRows) {
    errors.push({
      code: 'too-many-rows',
      rowNumber: allDataRows[MVP_BALANCE.importMaxRows]?.rowNumber,
      message: `一次最多导入 ${MVP_BALANCE.importMaxRows} 行。`,
    })
  }
  for (const row of rows) {
    if (row.values.length !== headers.length) {
      errors.push({
        code: 'column-count-mismatch',
        rowNumber: row.rowNumber,
        message: `该行有 ${row.values.length} 列，表头有 ${headers.length} 列。`,
      })
    }
  }

  return {
    delimiter,
    headers,
    rows,
    previewRows: rows.slice(0, 10),
    errors,
  }
}
