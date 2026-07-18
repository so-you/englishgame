import { describe, expect, it } from 'vitest'

import { MVP_BALANCE } from '../config/mvp-balance'
import { parseTable } from './parse-table'
import quotedMultilineCsv from './fixtures/quoted-multiline.csv?raw'
import vocabularyTsv from './fixtures/vocabulary.tsv?raw'

describe('parseTable', () => {
  it('parses a BOM, quoted commas, escaped quotes, and multiline fields', () => {
    const parsed = parseTable(`\uFEFF${quotedMultilineCsv}`)

    expect(parsed.delimiter).toBe(',')
    expect(parsed.headers).toEqual(['term', 'definition', 'example'])
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        values: ['abandon', '放弃, 抛弃', 'They said "stop".'],
      },
      {
        rowNumber: 3,
        values: ['benefit', '好处', 'Line one\nLine two'],
      },
    ])
    expect(parsed.previewRows).toEqual(parsed.rows)
    expect(parsed.errors).toEqual([])
  })

  it('detects TSV and reports rows whose column count differs from the header', () => {
    const parsed = parseTable(vocabularyTsv)

    expect(parsed.delimiter).toBe('\t')
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.errors).toContainEqual({
      code: 'column-count-mismatch',
      rowNumber: 3,
      message: '该行有 1 列，表头有 2 列。',
    })
  })

  it('reports an unterminated quoted field without throwing', () => {
    const parsed = parseTable('term,definition\nabandon,"放弃')

    expect(parsed.errors).toContainEqual({
      code: 'unterminated-quote',
      rowNumber: 2,
      message: '引号字段没有正确结束。',
    })
  })

  it('rejects input beyond the configured byte and row limits', () => {
    const oversized = parseTable('x'.repeat(MVP_BALANCE.importMaxBytes + 1))
    expect(oversized.errors[0]).toMatchObject({ code: 'file-too-large' })

    const tooManyRows = parseTable(
      `term\n${Array.from(
        { length: MVP_BALANCE.importMaxRows + 1 },
        (_, index) => `word-${index}`,
      ).join('\n')}`,
    )
    expect(tooManyRows.rows).toHaveLength(MVP_BALANCE.importMaxRows)
    expect(tooManyRows.errors.at(-1)).toMatchObject({ code: 'too-many-rows' })
  })
})
