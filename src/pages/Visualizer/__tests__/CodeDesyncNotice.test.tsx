import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeDesyncNotice } from '../CodeDesyncNotice'
import '@/i18n'

describe('CodeDesyncNotice', () => {
  it('renders the message and both action buttons', () => {
    render(<CodeDesyncNotice analyzing={false} onAnalyze={() => {}} onRestore={() => {}} />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
  it('fires callbacks', () => {
    const onAnalyze = vi.fn()
    const onRestore = vi.fn()
    render(<CodeDesyncNotice analyzing={false} onAnalyze={onAnalyze} onRestore={onRestore} />)
    const [analyzeBtn, restoreBtn] = screen.getAllByRole('button')
    fireEvent.click(analyzeBtn)
    fireEvent.click(restoreBtn)
    expect(onAnalyze).toHaveBeenCalledTimes(1)
    expect(onRestore).toHaveBeenCalledTimes(1)
  })
  it('disables the analyze button while analyzing', () => {
    render(<CodeDesyncNotice analyzing={true} onAnalyze={() => {}} onRestore={() => {}} />)
    const [analyzeBtn] = screen.getAllByRole('button')
    expect((analyzeBtn as HTMLButtonElement).disabled).toBe(true)
  })
})
