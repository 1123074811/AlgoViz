import { render, screen } from '@testing-library/react'
import { VerificationNotice } from '../VerificationNotice'
import '@/i18n'

describe('VerificationNotice', () => {
  it('renders nothing when verification passed', () => {
    const { container } = render(<VerificationNotice verification={{ status: 'pass' }} />)
    expect(container.firstChild).toBeNull()
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
