import { describe, it, expect } from 'vitest'
import { runGeneratorSandboxed } from '../runGenerator'

// 测试环境无 Worker，runGeneratorSandboxed 走 executeGenerator 内联兜底。
// 用「不断产生步骤的死循环」触发 builder 的 MAX_STEPS 上限抛错，确定性地
// 模拟运行期崩溃，验证失败结果被归类为 kind=runtime。
describe('runGeneratorSandboxed', () => {
  it('死循环生成器在执行失败后返回 ok=false 且 kind=runtime', async () => {
    const src = 'b.arrayCreate(input); while (true) { b.compare(0, 1) }'
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
