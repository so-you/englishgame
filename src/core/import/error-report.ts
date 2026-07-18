import type { ImportError } from './model'

const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/

export function sanitizeSpreadsheetCell(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value
}

function csvCell(value: string): string {
  return `"${sanitizeSpreadsheetCell(value).replaceAll('"', '""')}"`
}

export function buildImportErrorCsv(errors: readonly ImportError[]): string {
  const rows = errors.map((error) =>
    [
      error.rowNumber?.toString() ?? '',
      error.code,
      error.field ?? '',
      error.value ?? '',
      error.message,
    ]
      .map(csvCell)
      .join(','),
  )
  return `\uFEFF${[
    ['rowNumber', 'code', 'field', 'value', 'message'].map(csvCell).join(','),
    ...rows,
  ].join('\r\n')}`
}
