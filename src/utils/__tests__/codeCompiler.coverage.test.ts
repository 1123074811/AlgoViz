import { describe, expect, it } from 'vitest'
import { compileAndValidateCode } from '@/utils/codeCompiler'

// ─── Bracket matching ───────────────────────────────────────────────────────
describe('compileAndValidateCode — bracket matching', () => {
  it('reports unclosed bracket', () => {
    const result = compileAndValidateCode('function f() {', 'javascript')
    expect(result.success).toBe(false)
    expect(result.errors.some(e => e.message.includes('未闭合的括号'))).toBe(true)
  })

  it('reports stray closing bracket', () => {
    const result = compileAndValidateCode('let x = 1)', 'typescript')
    expect(result.errors.some(e => e.message.includes('多余的闭括号'))).toBe(true)
  })

  it('reports mismatched bracket pair', () => {
    const result = compileAndValidateCode('let x = (1]', 'typescript')
    expect(result.errors.some(e => e.message.includes('括号不匹配'))).toBe(true)
  })

  it('treats // as floor division in python (not a comment) for brackets', () => {
    // In python `//` is not a comment, so brackets after it still count
    const result = compileAndValidateCode('x = a // (b', 'python')
    expect(result.errors.some(e => e.message.includes('未闭合的括号'))).toBe(true)
  })
})

// ─── Non-code prose detection ───────────────────────────────────────────────
describe('compileAndValidateCode — prose detection', () => {
  it('flags bare CJK text outside strings/comments', () => {
    const result = compileAndValidateCode('这是一段中文说明', 'javascript')
    expect(result.success).toBe(false)
    expect(result.errors.some(e => e.message.includes('非代码文本'))).toBe(true)
  })

  it('allows CJK inside cpp block comments', () => {
    const result = compileAndValidateCode('int x = 1; /* 中文注释 */', 'cpp')
    expect(result.errors.filter(e => e.message.includes('非代码文本'))).toEqual([])
  })

  it('allows CJK inside python triple single quote docstring', () => {
    const code = ["def f():", "    '''中文文档'''", "    return 1"].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.errors.filter(e => e.message.includes('非代码文本'))).toEqual([])
  })
})

// ─── Style warnings ─────────────────────────────────────────────────────────
describe('compileAndValidateCode — style warnings', () => {
  it('warns on tabs in python indentation', () => {
    const result = compileAndValidateCode('def f():\n\treturn 1', 'python')
    expect(result.warnings.some(w => w.message.includes('制表符'))).toBe(true)
  })

  it('warns on trailing whitespace', () => {
    const result = compileAndValidateCode('let x = 1 ', 'typescript')
    expect(result.warnings.some(w => w.message.includes('行末尾'))).toBe(true)
  })

  it('warns on overly long lines', () => {
    const longLine = 'let x = ' + '1 + '.repeat(40) + '1'
    const result = compileAndValidateCode(longLine, 'typescript')
    expect(result.warnings.some(w => w.message.includes('代码行过长'))).toBe(true)
  })
})

// ─── JavaScript / TypeScript ────────────────────────────────────────────────
describe('compileAndValidateCode — JS/TS', () => {
  it('accepts valid JavaScript', () => {
    const result = compileAndValidateCode('function add(a, b) { return a + b; }', 'javascript')
    expect(result.success).toBe(true)
  })

  it('warns on eval() as a security risk', () => {
    const result = compileAndValidateCode('function f(s) { return eval(s); }', 'javascript')
    expect(result.warnings.some(w => w.type === 'SecurityWarning' && w.message.includes('eval'))).toBe(true)
  })

  it('skips eval warning on commented-out lines', () => {
    const result = compileAndValidateCode('// eval(x)\nlet y = 1;', 'javascript')
    expect(result.warnings.some(w => w.message.includes('eval'))).toBe(false)
  })

  it('accepts js alias', () => {
    const result = compileAndValidateCode('const x = 1;', 'js')
    expect(result.success).toBe(true)
  })

  it('warns on TypeScript as any', () => {
    const result = compileAndValidateCode('const x = y as any;', 'typescript')
    expect(result.warnings.some(w => w.type === 'TypeWarning')).toBe(true)
  })

  it('warns on TypeScript <any> cast', () => {
    const result = compileAndValidateCode('const x = <any>y;', 'ts')
    expect(result.warnings.some(w => w.type === 'TypeWarning')).toBe(true)
  })

  it('does not run new Function parse on TypeScript', () => {
    // TS-only syntax would break new Function; should not produce JS compile error
    const result = compileAndValidateCode('let x: number = 1;', 'typescript')
    expect(result.errors.some(e => e.message.includes('JavaScript 编译错误'))).toBe(false)
  })
})

// ─── Python ─────────────────────────────────────────────────────────────────
describe('compileAndValidateCode — Python', () => {
  it('accepts well-formed python', () => {
    const code = ['def f(x):', '    if x > 0:', '        return x', '    return 0'].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.errors).toEqual([])
  })

  it('reports missing indented block after colon', () => {
    const code = ['def f():', 'return 1'].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.errors.some(e => e.type === 'IndentationError' && e.message.includes('期望增加缩进'))).toBe(true)
  })

  it('reports unexpected indentation', () => {
    const code = ['x = 1', '    y = 2'].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.errors.some(e => e.type === 'IndentationError' && e.message.includes('意外的多余缩进'))).toBe(true)
  })

  it('reports dedent that matches no outer block', () => {
    const code = ['def f():', '    if x:', '        y = 1', '      z = 2'].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.errors.some(e => e.message.includes('回退缩进时不匹配'))).toBe(true)
  })

  it('warns on bare except', () => {
    const code = ['try:', '    x = 1', 'except:', '    pass'].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.warnings.some(w => w.message.includes('裸 except'))).toBe(true)
  })

  it('does not warn on except Exception', () => {
    const code = ['try:', '    x = 1', 'except Exception:', '    pass'].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.warnings.some(w => w.message.includes('裸 except'))).toBe(false)
  })

  it('warns on mutable default list argument', () => {
    const result = compileAndValidateCode('def f(a=[]):\n    return a', 'python')
    expect(result.warnings.some(w => w.type === 'BugRisk')).toBe(true)
  })

  it('warns on mutable default dict argument', () => {
    const result = compileAndValidateCode('def f(a={}):\n    return a', 'python')
    expect(result.warnings.some(w => w.type === 'BugRisk')).toBe(true)
  })

  it('accepts py alias', () => {
    const result = compileAndValidateCode('x = 1', 'py')
    expect(result.success).toBe(true)
  })
})

// ─── C++ / Java ─────────────────────────────────────────────────────────────
describe('compileAndValidateCode — C++ / Java', () => {
  it('reports missing semicolon', () => {
    const result = compileAndValidateCode('int main() {\n    int x = 1\n    return 0;\n}', 'cpp')
    expect(result.errors.some(e => e.type === 'CompilationError' && e.message.includes('缺少分号'))).toBe(true)
  })

  it('does not require semicolon on function header lines', () => {
    const code = ['void f()', '{', '    return;', '}'].join('\n')
    const result = compileAndValidateCode(code, 'cpp')
    expect(result.errors.some(e => e.message.includes('缺少分号'))).toBe(false)
  })

  it('ignores import and package lines (Java)', () => {
    const code = ['import java.util.List', 'package com.x', 'class A {}'].join('\n')
    const result = compileAndValidateCode(code, 'java')
    expect(result.errors.some(e => e.message.includes('缺少分号'))).toBe(false)
  })

  it('ignores preprocessor # lines (C++)', () => {
    const result = compileAndValidateCode('#include <vector>\nint x = 1;', 'cpp')
    expect(result.errors.some(e => e.message.includes('缺少分号'))).toBe(false)
  })

  it('warns on scanf as security risk', () => {
    const result = compileAndValidateCode('int x;\nscanf("%d", &x);', 'cpp')
    expect(result.warnings.some(w => w.type === 'SecurityWarning' && w.message.includes('scanf'))).toBe(true)
  })

  it('warns on gets as security risk', () => {
    const result = compileAndValidateCode('char buf[10];\ngets(buf);', 'cpp')
    expect(result.warnings.some(w => w.type === 'SecurityWarning' && w.message.includes('gets'))).toBe(true)
  })

  it('does not flag missing semicolon when next line opens a brace', () => {
    const code = ['if (x > 0)', '{', '    y = 1;', '}'].join('\n')
    const result = compileAndValidateCode(code, 'cpp')
    expect(result.errors.some(e => e.message.includes('缺少分号'))).toBe(false)
  })

  it('handles cpp block comments spanning content', () => {
    const code = ['int x = 1; /* multi', 'line comment */', 'int y = 2;'].join('\n')
    const result = compileAndValidateCode(code, 'cpp')
    expect(result.errors.some(e => e.message.includes('缺少分号'))).toBe(false)
  })

  it('does not flag line ending in backslash continuation', () => {
    const code = ['int x = 1 + \\', '2;'].join('\n')
    const result = compileAndValidateCode(code, 'cpp')
    expect(result.errors.some(e => e.message.includes('缺少分号'))).toBe(false)
  })
})
