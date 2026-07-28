import { describe, it, expect, afterEach } from 'vitest'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'

/**
 * 测试环境允许 inline 执行纯逻辑；生产模式显式关闭后必须 fail-closed。
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

  it('生产模式 Worker 缺失时拒绝执行，不回退主线程', async () => {
    ;(globalThis as { Worker?: unknown }).Worker = undefined
    const r = await runGeneratorSandboxed(
      'globalThis.__unsafeGeneratorRan = true',
      [],
      { algorithm: 'x', type: 'array' },
      5000,
      false,
    )
    expect(r).toMatchObject({ ok: false, kind: 'runtime' })
    expect(r.error).toContain('已拒绝执行生成器')
    expect((globalThis as { __unsafeGeneratorRan?: boolean }).__unsafeGeneratorRan).toBeUndefined()
  })
})
