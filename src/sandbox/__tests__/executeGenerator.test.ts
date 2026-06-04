import { describe, it, expect } from 'vitest'
import { executeGenerator } from '../executeGenerator'

const bubbleBody = `
b.arrayCreate(input)
for (let i = 0; i < input.length; i++)
  for (let j = 0; j < input.length - 1 - i; j++) {
    b.desc('比较 ' + j + ',' + (j+1)).compare(j, j+1)
    if (input[j] > input[j+1]) {
      const t = input[j]; input[j] = input[j+1]; input[j+1] = t
      b.desc('交换').swap(j, j+1)
    }
  }
`

describe('executeGenerator', () => {
  it('合法生成器体对输入产出脚本', () => {
    const result = executeGenerator(bubbleBody, [3, 1, 2], { algorithm: 'bubble_sort', type: 'array' })
    expect(result.ok).toBe(true)
    expect(result.script?.initialState.data).toEqual([3, 1, 2])
    expect(result.script!.steps.length).toBeGreaterThan(1)
    // 第一步必为 array.create
    expect(result.script!.steps[0].events?.[0]).toEqual({ type: 'array.create', values: [3, 1, 2] })
  })

  it('换输入产出不同长度的脚本', () => {
    const small = executeGenerator(bubbleBody, [2, 1], { algorithm: 'x', type: 'array' })
    const large = executeGenerator(bubbleBody, [5, 4, 3, 2, 1], { algorithm: 'x', type: 'array' })
    expect(large.script!.steps.length).toBeGreaterThan(small.script!.steps.length)
  })

  it('生成器抛错时返回 ok:false + error', () => {
    const result = executeGenerator('throw new Error("boom")', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('boom')
  })

  it('语法错误的生成器体返回 ok:false', () => {
    const result = executeGenerator('this is not valid js {{{', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
  })
})
