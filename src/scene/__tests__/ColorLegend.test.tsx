import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ColorLegend from '../ColorLegend'
import '@/i18n'

describe('ColorLegend', () => {
  it('renders the five core semantic swatches', () => {
    render(<ColorLegend />)
    expect(screen.getAllByTestId('legend-swatch')).toHaveLength(5)
  })

  it('collapses to an icon button and expands back', () => {
    render(<ColorLegend />)
    const toggle = screen.getByRole('button')
    fireEvent.click(toggle)
    expect(screen.queryAllByTestId('legend-swatch')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getAllByTestId('legend-swatch')).toHaveLength(5)
  })
})
