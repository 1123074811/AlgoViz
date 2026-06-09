import { describe, it, expect, afterEach } from 'vitest'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'

/**
 * 覆盖 runGenerator.ts 的 inline 回退分支：当全局 `Worker` 不存在时，
 * runGeneratorSandboxed 应同步委托给 executeGenerator 并 resolve 其结果。
 * jsdom 下 Worker 通常未定义，但为稳健起见我们显式 stub 为 undefined，
 * 并在 afterEach 恢复。
 */
describe('runGeneratorSandboxed — Worker 缺失时走 inline 回退', () => {
  const originalWorker = (globalThis as { Worker?: unknown }).Worker

  afterEach(() => {
    if (originalWorker === undefined) {
      delete (globalThis as { Worker?: unknown }).Worker
    } else {
      ;(globalThis as { Worker?: unknown }).Worker = originalWorker
    }
  })

  it('合法生成器经 inline 回退 resolve 出真实脚本', async () => {
    ;(globalThis as { Worker?: unknown }).Worker = undefined
    const r = await runGeneratorSandboxed(
      `b.arrayCreate(input); b.desc('比较').compare(0, 1); b.swap(0, 1)`,
      [3, 1, 2],
      { algorithm: 'bubble', type: 'array' },
    )
    expect(r.ok).toBe(true)
    expect(r.script?.algorithm).toBe('bubble')
    expect(r.script?.initialState.data).toEqual([3, 1, 2])
    expect(r.script?.steps).toHaveLength(3)
    expect(r.script?.steps[0].events?.[0]).toEqual({ type: 'array.create', values: [3, 1, 2] })
  })

  it('运行期抛错经 inline 回退 resolve 出 ok=false、kind=runtime', async () => {
    ;(globalThis as { Worker?: unknown }).Worker = undefined
    const r = await runGeneratorSandboxed(
      'throw new Error("inline-boom")',
      [1],
      { algorithm: 'x', type: 'array' },
    )
    expect(r.ok).toBe(false)
    expect(r.kind).toBe('runtime')
    expect(r.error).toContain('inline-boom')
  })

  it('inline 回退同样触发漏声明变量恢复', async () => {
    ;(globalThis as { Worker?: unknown }).Worker = undefined
    const r = await runGeneratorSandboxed(
      `b.arrayCreate(input)
for (const n of input) { total += n }
b.result(total)`,
      [2, 4],
      { algorithm: 'sum', type: 'array' },
    )
    expect(r.ok).toBe(true)
    expect(r.script?.result).toBe(6)
  })

  it('返回的是 Promise 且确实 resolve（非 reject）', async () => {
    ;(globalThis as { Worker?: unknown }).Worker = undefined
    const p = runGeneratorSandboxed('b.arrayCreate(input)', [1], { algorithm: 'x', type: 'array' })
    expect(p).toBeInstanceOf(Promise)
    await expect(p).resolves.toMatchObject({ ok: true })
  })
})
