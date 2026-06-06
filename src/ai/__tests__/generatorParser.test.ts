import { describe, it, expect } from 'vitest'
import { parseGeneratorResponse } from '../generatorParser'

const goodResponse = '```js\n// @algorithm selection_sort\n// @type array\nb.arrayCreate(input)\nfor (let i=0;i<input.length;i++) b.compare(i,i)\n```'

describe('parseGeneratorResponse', () => {
  it('解析含指令的 js 代码块', () => {
    const r = parseGeneratorResponse(goodResponse)
    expect(r.success).toBe(true)
    expect(r.generator?.algorithm).toBe('selection_sort')
    expect(r.generator?.type).toBe('array')
    expect(r.generator?.body).toContain('b.arrayCreate(input)')
    // 指令注释行被剔除
    expect(r.generator?.body).not.toContain('@algorithm')
  })

  it('解析 @sample 示例输入（合法 JSON）', () => {
    const raw = '```js\n// @algorithm bubble_sort\n// @type array\n// @sample [5, 3, 8, 1]\nb.arrayCreate(input)\n```'
    const r = parseGeneratorResponse(raw)
    expect(r.success).toBe(true)
    expect(r.generator?.sampleInput).toBe('[5, 3, 8, 1]')
    // @sample 行也被从 body 剔除
    expect(r.generator?.body).not.toContain('@sample')
  })

  it('保留含 pointer builder 调用的生成器代码体', () => {
    const raw = [
      '```js',
      '// @algorithm two_pointer_scan',
      '// @type array',
      '// @sample {"nums":[1,2,3,4],"target":5}',
      'const nums = input.nums || input',
      'b.arrayCreate(nums)',
      "b.pointerCreate('left', 0, '左指针')",
      "b.pointerCreate('right', nums.length - 1, '右指针')",
      "b.pointerMove('left', 1)",
      "b.pointerHighlight('right')",
      "b.pointerClear('left')",
      '```',
    ].join('\n')

    const r = parseGeneratorResponse(raw)
    expect(r.success).toBe(true)
    expect(r.generator?.algorithm).toBe('two_pointer_scan')
    expect(r.generator?.type).toBe('array')
    expect(r.generator?.sampleInput).toBe('{"nums":[1,2,3,4],"target":5}')
    expect(r.generator?.body).toContain("b.pointerCreate('left', 0, '左指针')")
    expect(r.generator?.body).toContain("b.pointerMove('left', 1)")
    expect(r.generator?.body).toContain("b.pointerHighlight('right')")
    expect(r.generator?.body).toContain("b.pointerClear('left')")
    expect(r.generator?.body).not.toContain('@algorithm')
    expect(r.generator?.body).not.toContain('@type')
    expect(r.generator?.body).not.toContain('@sample')
  })

  it('@sample 不是合法 JSON 时忽略', () => {
    const raw = '```js\n// @type array\n// @sample 这不是JSON\nb.compare(0,1)\n```'
    const r = parseGeneratorResponse(raw)
    expect(r.success).toBe(true)
    expect(r.generator?.sampleInput).toBeUndefined()
  })

  it('无 @sample 时 sampleInput 为 undefined', () => {
    const r = parseGeneratorResponse(goodResponse)
    expect(r.generator?.sampleInput).toBeUndefined()
  })

  it('无代码块围栏时回退解析整段', () => {
    const raw = '// @algorithm x\n// @type array\nb.arrayCreate(input)'
    const r = parseGeneratorResponse(raw)
    expect(r.success).toBe(true)
    expect(r.generator?.body).toContain('b.arrayCreate')
  })

  it('缺指令时默认 algorithm=custom、type=array', () => {
    const r = parseGeneratorResponse('```js\nb.arrayCreate(input)\n```')
    expect(r.success).toBe(true)
    expect(r.generator?.algorithm).toBe('custom')
    expect(r.generator?.type).toBe('array')
  })

  it('非法 type 回退为 array', () => {
    const r = parseGeneratorResponse('```js\n// @type banana\nb.compare(0,1)\n```')
    expect(r.generator?.type).toBe('array')
  })

  it('代码体未调用 b 时报错', () => {
    const r = parseGeneratorResponse('```js\n// @type array\nconst x = 1\n```')
    expect(r.success).toBe(false)
  })

  it('空响应报错', () => {
    expect(parseGeneratorResponse('').success).toBe(false)
  })
})
