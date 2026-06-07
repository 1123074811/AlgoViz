import { describe, expect, it } from 'vitest'
import { compileAndValidateCode } from '../codeCompiler'
import { getAllCodeTemplates } from '@/pages/Visualizer/codeTemplates'

/**
 * 回归保证：所有内置算法代码模板都不应触发校验器的「错误」（warning 允许）。
 * 误报的语法/缩进/括号错误会在编辑器里显示红色波浪线，影响体验。
 */
describe('内置代码模板不应产生校验错误', () => {
  const templates = getAllCodeTemplates()

  it('至少存在若干模板', () => {
    expect(templates.length).toBeGreaterThan(10)
  })

  for (const { algoId, lang, code } of templates) {
    it(`[${algoId}/${lang}] 无校验错误`, () => {
      const result = compileAndValidateCode(code, lang)
      const errors = result.errors.map(e => `L${e.line} [${e.type}] ${e.message}`)
      expect(errors, errors.join('\n')).toEqual([])
    })
  }
})
