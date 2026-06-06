import { describe, expect, it } from 'vitest'
import { compileAndValidateCode } from '../codeCompiler'

describe('compileAndValidateCode', () => {
  it('rejects empty code', () => {
    const result = compileAndValidateCode('   ', 'javascript')

    expect(result.success).toBe(false)
    expect(result.errors[0]).toMatchObject({
      severity: 'error',
      type: 'CompilationError',
      line: 1,
    })
  })

  it('reports JavaScript syntax errors from the parser path', () => {
    const result = compileAndValidateCode('const = 1', 'javascript')

    expect(result.success).toBe(false)
    expect(result.errors.some((error) => (
      error.type === 'SyntaxError' && error.message.includes('JavaScript')
    ))).toBe(true)
  })

  it('ignores brackets inside strings and comments', () => {
    const result = compileAndValidateCode(`
      const text = ')';
      // }
      /* [ */
      function ok() {
        return text;
      }
    `, 'javascript')

    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('warns about TypeScript any usage without failing compilation', () => {
    const result = compileAndValidateCode('const value: any = 1', 'typescript')

    expect(result.success).toBe(true)
    expect(result.warnings.some((warning) => warning.type === 'TypeWarning')).toBe(true)
  })
})
