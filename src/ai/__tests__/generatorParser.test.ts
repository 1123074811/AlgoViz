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
