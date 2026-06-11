import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerificationNotice } from '../VerificationNotice'
import '@/i18n'

describe('VerificationNotice', () => {
  it('shows a green badge with source strength on pass', () => {
    render(<VerificationNotice verification={{ status: 'pass', source: 'js-exec' }} />)
    const badge = screen.getByRole('status')
    expect(badge.textContent).toMatch(/真实执行|real execution/i)
  })

  it('shows a neutral badge with the reason on skipped', () => {
    render(<VerificationNotice verification={{ status: 'skipped', message: '生成器未调用 b.result，无法比对' }} />)
    expect(screen.getByRole('status').textContent).toContain('b.result')
  })

  it('renders nothing when verification is absent', () => {
    const { container } = render(<VerificationNotice verification={undefined} />)
    expect(container.firstChild).toBeNull()
  })
  it('shows a warning with expected/actual on failure', () => {
    render(
      <VerificationNotice
        verification={{ status: 'fail', source: 'expect', expected: '[0,1]', actual: '[1,0]' }}
      />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('[0,1]')
    expect(screen.getByRole('alert').textContent).toContain('[1,0]')
  })
})
