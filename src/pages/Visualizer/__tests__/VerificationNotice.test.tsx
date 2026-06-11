import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerificationNotice } from '../VerificationNotice'
import '@/i18n'

describe('VerificationNotice', () => {
  it('shows a green badge with source strength on real-execution pass', () => {
    render(<VerificationNotice verification={{ status: 'pass', source: 'js-exec' }} />)
    const badge = screen.getByRole('status')
    expect(badge.textContent).toMatch(/真实执行|real execution/i)
    expect(badge.className).toContain('emerald')
  })

  it('does NOT show a green "verified" badge for AI-self-reported (@expect) pass', () => {
    render(<VerificationNotice verification={{ status: 'pass', source: 'expect' }} />)
    const badge = screen.getByRole('status')
    // @expect 是 AI 自证,不能给绿色"已验证"——必须用警告色 + 诚实措辞
    expect(badge.className).not.toContain('emerald')
    expect(badge.className).toContain('amber')
    expect(badge.textContent).toMatch(/未.*独立验证|AI 自查|not independently/i)
  })

  it('marks a degraded @expect pass (real execution attempted but unavailable)', () => {
    render(<VerificationNotice verification={{ status: 'pass', source: 'expect', degraded: true }} />)
    const badge = screen.getByRole('status')
    expect(badge.textContent).toMatch(/真实执行不可用|real execution unavailable/i)
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
