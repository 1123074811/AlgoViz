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
})
