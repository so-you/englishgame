import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FocusManager } from './FocusManager'

describe('FocusManager', () => {
  it('moves focus to the primary heading after a page change', () => {
    const { rerender } = render(
      <FocusManager focusKey="home"><main><h1>主页</h1></main></FocusManager>,
    )
    expect(screen.getByRole('heading', { name: '主页' })).toHaveFocus()

    rerender(
      <FocusManager focusKey="battle"><main><h1>战斗</h1></main></FocusManager>,
    )
    expect(screen.getByRole('heading', { name: '战斗' })).toHaveFocus()
  })
})
