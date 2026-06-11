import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StepListPanel from '../StepListPanel'
import type { AnimationStep } from '@/types/animation'

function makeSteps(n: number): AnimationStep[] {
  return Array.from({ length: n }, (_, i) => ({
    stepId: i + 1,
    codeLine: 0,
    description: { zh: `中文说明 ${i + 1}`, en: `English desc ${i + 1}` },
    action: { type: 'highlight' as const, targets: [], color: 'primary' as const },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  }))
}

describe('StepListPanel', () => {
  it('renders one row per step in the requested language', () => {
    render(<StepListPanel steps={makeSteps(5)} currentStep={2} lang="zh" onJump={() => {}} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('中文说明 3')).toBeTruthy()
  })

  it('renders English descriptions when lang="en"', () => {
    render(<StepListPanel steps={makeSteps(2)} currentStep={1} lang="en" onJump={() => {}} />)
    expect(screen.getByText('English desc 1')).toBeTruthy()
  })

  it('marks the current step row and jumps on click', () => {
    const onJump = vi.fn()
    render(<StepListPanel steps={makeSteps(5)} currentStep={2} lang="zh" onJump={onJump} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[1].getAttribute('aria-current')).toBe('step')
    fireEvent.click(rows[4])
    expect(onJump).toHaveBeenCalledWith(5)
  })

  it('renders a phase header row before steps that carry a phase marker', () => {
    const steps = makeSteps(4)
    steps[0] = { ...steps[0], phase: { zh: '建堆', en: 'Build heap' } }
    steps[2] = { ...steps[2], phase: { zh: '排序', en: 'Sort' } }
    render(<StepListPanel steps={steps} currentStep={1} lang="zh" onJump={() => {}} />)
    expect(screen.getByText('建堆')).toBeTruthy()
    expect(screen.getByText('排序')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })
})
