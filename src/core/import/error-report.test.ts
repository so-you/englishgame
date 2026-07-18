import { describe, expect, it } from 'vitest'

import type { ImportError } from './model'
import { buildImportErrorCsv, sanitizeSpreadsheetCell } from './error-report'

describe('import error report', () => {
  it('neutralizes cells that spreadsheet software could execute as formulas', () => {
    expect(sanitizeSpreadsheetCell('=SUM(1,1)')).toBe("'=SUM(1,1)")
    expect(sanitizeSpreadsheetCell(' +cmd')).toBe("' +cmd")
    expect(sanitizeSpreadsheetCell('-1+2')).toBe("'-1+2")
    expect(sanitizeSpreadsheetCell('@evil')).toBe("'@evil")
    expect(sanitizeSpreadsheetCell('ordinary text')).toBe('ordinary text')
  })

  it('produces an escaped UTF-8 CSV with line numbers and reasons', () => {
    const errors: readonly ImportError[] = [
      {
        code: 'missing-term',
        rowNumber: 4,
        field: 'term',
        value: '=HYPERLINK("https://example.invalid")',
        message: 'term 不能为空，必须修正。',
      },
    ]

    expect(buildImportErrorCsv(errors)).toBe(
      '\uFEFF"rowNumber","code","field","value","message"\r\n' +
        '"4","missing-term","term","\'=HYPERLINK(""https://example.invalid"")","term 不能为空，必须修正。"',
    )
  })
})
