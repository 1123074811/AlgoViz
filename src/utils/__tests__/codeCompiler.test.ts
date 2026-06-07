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

  it('does not require semicolons after Java line comments', () => {
    const result = compileAndValidateCode(`
      class Solution {
        int ans;
        public int diameterOfBinaryTree(TreeNode root) {
          ans = 1;
          depth(root);
          return ans - 1; // 返回直径
        }
        public int depth(TreeNode node) {
          if (node == null) {
            return 0; // 访问到空节点了，返回0
          }
          int L = depth(node.left); // 左子树深度
          int R = depth(node.right); // 右子树深度
          ans = Math.max(ans, L + R + 1); // 更新答案
          return Math.max(L, R) + 1; // 返回深度
        }
      }
    `, 'java')

    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts Python inline compound statements (colon mid-line)', () => {
    const code = [
      'def counting_sort_for_radix(arr, exp):',
      '    n = len(arr); output = [0] * n; count = [0] * 10',
      '    for i in range(n): count[(arr[i] // exp) % 10] += 1',
      '    for i in range(1, 10): count[i] += count[i - 1]',
      '    return output',
      '',
      'def radix_sort(arr):',
      '    if not arr: return arr',
      '    max_val = max(arr); exp = 1',
      '    while max_val // exp > 0:',
      '        arr = counting_sort_for_radix(arr, exp); exp *= 10',
      '    return arr',
    ].join('\n')
    const result = compileAndValidateCode(code, 'python')
    expect(result.errors.filter(e => e.type === 'SyntaxError' || e.type === 'IndentationError')).toEqual([])
  })

  it('still flags a genuinely missing colon on a Python block statement', () => {
    const result = compileAndValidateCode('for i in range(10)\n    print(i)', 'python')
    expect(result.errors.some(e => e.type === 'SyntaxError' && e.message.includes('冒号'))).toBe(true)
  })
})
