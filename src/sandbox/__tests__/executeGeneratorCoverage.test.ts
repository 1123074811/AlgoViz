import { describe, it, expect } from 'vitest'
import { executeGenerator } from '@/sandbox/executeGenerator'

describe('executeGenerator — 漏声明变量恢复循环', () => {
  it('引用单个未声明变量时注入 `let name = 0` 并成功恢复', () => {
    // total 未声明；恢复后被注入为 0，循环累加得 6。
    const body = `
b.arrayCreate(input)
for (const n of input) {
  total += n
  b.varSet('total', total)
}
b.result(total)
`
    const result = executeGenerator(body, [1, 2, 3], { algorithm: 'sum', type: 'array' })
    expect(result.ok).toBe(true)
    // 注入的 total 从 0 起累加 1+2+3 = 6，证明确实注入为 0 而非其它值。
    expect(result.script?.result).toBe(6)
    // 修补痕迹必须暴露到脚本上,供 UI 提示动画可能不准确。
    expect(result.script?.generatorWarnings).toEqual(['total'])
  })

  it('未触发变量注入时不附加 generatorWarnings', () => {
    const body = `let total = 0
b.arrayCreate(input)
for (const n of input) { total += n }
b.result(total)`
    const result = executeGenerator(body, [1, 2, 3], { algorithm: 'sum', type: 'array' })
    expect(result.ok).toBe(true)
    expect(result.script?.generatorWarnings).toBeUndefined()
  })

  it('引用多个（≤4）不同未声明变量时逐个恢复', () => {
    // a, b2, c, d 四个未声明，恰好在 4 次重试上限内恢复。
    const body = `
b.arrayCreate(input)
a += 1
b2 += 2
c += 3
d += 4
b.note('a=' + a + ' b2=' + b2 + ' c=' + c + ' d=' + d)
b.result(a + b2 + c + d)
`
    const result = executeGenerator(body, [0], { algorithm: 'multi', type: 'array' })
    expect(result.ok).toBe(true)
    expect(result.script?.result).toBe(10) // 1+2+3+4，全部从 0 注入
  })

  it('引用过多（>4 个不同）未声明变量时失败，kind=runtime', () => {
    // 5 个不同未声明变量超出 4 次恢复上限。
    const body = `
b.arrayCreate(input)
v1 += 1; v2 += 1; v3 += 1; v4 += 1; v5 += 1
b.note('done')
`
    const result = executeGenerator(body, [0], { algorithm: 'toomany', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.kind).toBe('runtime')
    expect(result.error).toBe('生成器引用了过多未声明变量')
  })

  it('同一个未声明变量被多次引用只消耗一次恢复名额', () => {
    // 仅 acc 一个未声明变量，无论引用多少次都只恢复一次。
    const body = `
b.arrayCreate(input)
acc += 1; acc += 1; acc += 1; acc += 1; acc += 1; acc += 1
b.result(acc)
`
    const result = executeGenerator(body, [0], { algorithm: 'single', type: 'array' })
    expect(result.ok).toBe(true)
    expect(result.script?.result).toBe(6)
  })
})

describe('executeGenerator — 运行期错误归类', () => {
  it('显式 throw 归类 kind=runtime 并携带原始消息', () => {
    const result = executeGenerator('throw new Error("explode-123")', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.kind).toBe('runtime')
    expect(result.error).toContain('explode-123')
  })

  it('访问 undefined 属性时归类 kind=runtime（非 ReferenceError 不进恢复循环）', () => {
    const result = executeGenerator('b.arrayCreate(input); input.bogus.forEach(() => {})', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.kind).toBe('runtime')
    expect(result.error).toBeTruthy()
    expect(result.error).not.toBe('undefined')
  })

  it('TypeError（非 "X is not defined"）直接失败，不触发变量注入', () => {
    // null.foo 抛 TypeError，getMissingVariableName 返回 null，立即失败。
    const result = executeGenerator('const x = null; x.foo()', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.kind).toBe('runtime')
  })

  it('build 因零步骤抛错时也走 runtime 失败路径', () => {
    // 合法但什么都不画 —— build() 抛 "没有产生任何步骤"。
    const result = executeGenerator('const x = 1 + 1', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.kind).toBe('runtime')
    expect(result.error).toContain('没有产生任何步骤')
  })
})

describe('executeGenerator — happy path 真实输出', () => {
  it('成功路径返回 ok=true、无 error / kind，脚本含正确 initialState', () => {
    const result = executeGenerator(
      `b.arrayCreate(input); b.desc('比较').compare(0, 1)`,
      [9, 8, 7],
      { algorithm: 'demo', type: 'array' },
    )
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.kind).toBeUndefined()
    expect(result.script?.algorithm).toBe('demo')
    expect(result.script?.initialState.data).toEqual([9, 8, 7])
    expect(result.script?.steps).toHaveLength(2)
    expect(result.script?.steps[1].description.zh).toBe('比较')
  })
})
