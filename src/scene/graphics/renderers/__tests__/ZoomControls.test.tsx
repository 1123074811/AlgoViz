import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import ZoomControls from '../ZoomControls'
import '@/i18n'

it('dispatches every viewport action', () => {
  const actions = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onReset: vi.fn(),
    onToggleFullscreen: vi.fn(),
  }
  render(<ZoomControls {...actions} />)

  fireEvent.click(screen.getByTitle('Zoom In'))
  fireEvent.click(screen.getByTitle('Zoom Out'))
  fireEvent.click(screen.getByTitle('Reset View'))
  fireEvent.click(screen.getByTitle(/全屏|Fullscreen/))

  expect(actions.onZoomIn).toHaveBeenCalledOnce()
  expect(actions.onZoomOut).toHaveBeenCalledOnce()
  expect(actions.onReset).toHaveBeenCalledOnce()
  expect(actions.onToggleFullscreen).toHaveBeenCalledOnce()
})
