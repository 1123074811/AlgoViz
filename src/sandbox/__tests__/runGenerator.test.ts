import { describe, it, expect } from 'vitest'
import { executeGenerator } from '../executeGenerator'
import { runGeneratorSandboxed } from '../runGenerator'

describe('executeGenerator 错误信息清晰', () => {
  it('对错误的 input 形状返回具体错误(而非空)', () => {
    const src = `const { root } = input; b.treeCreate('binary', root, [], [])`
    const r = executeGenerator(src, null, { algorithm: 'x', type: 'tree' })
    expect(r.ok).toBe(false)
    expect(r.error && r.error.length).toBeTruthy()
    expect(r.error).not.toBe('undefined')
  })

  it('生成器抛错时携带原始消息', () => {
    const r = executeGenerator(`throw new Error('boom-xyz')`, [], { algorithm: 'x', type: 'array' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('boom-xyz')
  })
})

describe('runGeneratorSandboxed(测试环境走 inline 回退)', () => {
  it('把运行期错误作为非空、具体的 error 返回(不是字面量 "undefined")', async () => {
    const r = await runGeneratorSandboxed(`input.nope.forEach(() => {})`, {}, { algorithm: 'x', type: 'array' })
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
    expect(r.error).not.toBe('undefined')
    expect(r.error).not.toBe('生成器执行出错: undefined')
    expect(r.error).toMatch(/forEach|undefined \(reading/)
  })

  it('正常生成器返回脚本', async () => {
    const r = await runGeneratorSandboxed(`b.arrayCreate(input); b.compare(0,1)`, [3, 1, 2], { algorithm: 'x', type: 'array' })
    expect(r.ok).toBe(true)
    expect(r.script?.steps.length).toBeGreaterThan(0)
  })
})

describe('步骤描述兜底', () => {
  it('highlightNode 等 scene.* 事件有具体描述,不是 "步骤 N" 占位', () => {
    const src = `b.treeCreate('binary','a',[{id:'a',value:1},{id:'b',value:2}],[{parentId:'a',childId:'b'}])
b.highlightNode('b','warning')`
    const r = executeGenerator(src, {}, { algorithm: 'x', type: 'tree' })
    expect(r.ok).toBe(true)
    const descs = r.script!.steps.map(s => s.description.zh)
    expect(descs.some(d => /^步骤\s*\d+$/.test(d)), descs.join(' | ')).toBe(false)
    expect(descs.some(d => d.includes('高亮'))).toBe(true)
  })
})

// 测试环境无 Worker，runGeneratorSandboxed 走 executeGenerator 内联兜底（无 Worker
// 超时保护）。因此这里用「有界的运行期抛错」而非死循环来验证失败归类——死循环在
// 内联路径会真的卡死主线程（builder 的 MAX_STEPS 现为封顶不抛错）。
describe('runGeneratorSandboxed 失败归类 kind=runtime', () => {
  it('运行期访问 undefined 抛错时返回 ok=false 且 kind=runtime', async () => {
    const src = 'b.arrayCreate(input); input.nope.forEach(() => {})'
    const result = await runGeneratorSandboxed(
      src,
      [1, 2, 3],
      { algorithm: 'custom', type: 'array' },
      200,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('runtime')
  }, 2000)

  it('生成器抛出普通异常时也归类 kind=runtime', async () => {
    const src = 'throw new Error("boom")'
    const result = await runGeneratorSandboxed(
      src,
      [1, 2, 3],
      { algorithm: 'custom', type: 'array' },
      200,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('runtime')
  }, 2000)
})
