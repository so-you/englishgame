import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('introduces the English roguelike MVP', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '英语爬塔' })).toBeInTheDocument()
    expect(screen.getByText('在战斗中复习真正到期的英语内容。')).toBeInTheDocument()
  })
})
