import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaybackControls from '../PlaybackControls'

const baseProps = {
  isPlaying: false,
  currentStep: 3,
  totalSteps: 10,
  speed: 1,
  onReset: () => {},
  onStepBackward: () => {},
  onTogglePlay: () => {},
  onStepForward: () => {},
  onGoToEnd: () => {},
  onSpeedChange: () => {},
}

describe('PlaybackControls seek bar', () => {
  it('renders a scrubbable slider when onSeek is provided', () => {
    const onSeek = vi.fn()
    render(<PlaybackControls {...baseProps} onSeek={onSeek} />)
    const slider = screen.getByRole('slider', { name: /progress|进度/i })
    expect(slider).toBeTruthy()
    fireEvent.change(slider, { target: { value: '7' } })
    expect(onSeek).toHaveBeenCalledWith(7)
  })

  it('slider reflects currentStep / totalSteps', () => {
    render(<PlaybackControls {...baseProps} onSeek={() => {}} />)
    const slider = screen.getByRole('slider', { name: /progress|进度/i }) as HTMLInputElement
    expect(slider.value).toBe('3')
    expect(slider.max).toBe('10')
  })

  it('falls back to the display-only bar without onSeek', () => {
    render(<PlaybackControls {...baseProps} />)
    expect(screen.queryByRole('slider', { name: /progress|进度/i })).toBeNull()
  })
})
