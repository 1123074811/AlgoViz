import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { AnimationScript } from '@/types/animation'

// ── Mock every external dependency so no network/worker is hit ──────────────
const analyzeCodeGenerator = vi.fn()
const runGeneratorSandboxed = vi.fn()
const recognizeAlgorithm = vi.fn()
const generatePreset = vi.fn()
const buildFallbackScene = vi.fn()
const repairGenerator = vi.fn()

vi.mock('@/ai', () => ({
  analyzeCodeGenerator: (...a: unknown[]) => analyzeCodeGenerator(...a),
}))
vi.mock('@/sandbox/runGenerator', () => ({
  runGeneratorSandboxed: (...a: unknown[]) => runGeneratorSandboxed(...a),
}))
vi.mock('@/presets/recognize', () => ({
  recognizeAlgorithm: (...a: unknown[]) => recognizeAlgorithm(...a),
}))
vi.mock('@/presets', () => ({
  generatePreset: (...a: unknown[]) => generatePreset(...a),
}))
vi.mock('@/ai/categories', () => ({
  classifyAlgorithm: () => 'sorting',
  CATEGORY_PROFILES: { sorting: { rules: [] } },
}))
vi.mock('@/ai/quality', () => ({
  runQualityGate: () => ({ passed: true, issues: [] }),
}))
vi.mock('@/ai/repairGenerator', () => ({
  repairGenerator: (...a: unknown[]) => repairGenerator(...a),
}))
vi.mock('@/ai/fallbackScene', () => ({
  buildFallbackScene: (...a: unknown[]) => buildFallbackScene(...a),
}))

import { useAIGenerator, type UseAIGeneratorOptions } from '@/hooks/useAIGenerator'

function makeScript(algorithm = 'mock'): AnimationScript {
  return {
    algorithm,
    initialState: { type: 'array', data: [1, 2, 3] },
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    steps: [],
  }
}

function makeOpts(overrides: Partial<UseAIGeneratorOptions> = {}): {
  opts: UseAIGeneratorOptions
  applyScript: ReturnType<typeof vi.fn>
  setStatus: ReturnType<typeof vi.fn>
  parseInput: ReturnType<typeof vi.fn>
} {
  const applyScript = vi.fn()
  const setStatus = vi.fn()
  const parseInput = vi.fn((raw: string) => ({ valid: raw.trim().length > 0, value: [1, 2, 3] }))
  const opts: UseAIGeneratorOptions = {
    inputData: 'nums = [1,2,3]',
    parseInput,
    applyScript,
    setStatus,
    ...overrides,
  }
  return { opts, applyScript, setStatus, parseInput }
}

beforeEach(() => {
  analyzeCodeGenerator.mockReset()
  runGeneratorSandboxed.mockReset()
  recognizeAlgorithm.mockReset()
  generatePreset.mockReset()
  buildFallbackScene.mockReset()
  repairGenerator.mockReset()
  buildFallbackScene.mockReturnValue(makeScript('fallback'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAIGenerator — initial state and reset/setLive', () => {
  it('starts with no live mode', () => {
    const { opts } = makeOpts()
    const { result } = renderHook(() => useAIGenerator(opts))
    expect(result.current.liveAlgoId).toBeNull()
    expect(result.current.generator).toBeNull()
  })

  it('setLive can install an algoId, a generator, or clear', () => {
    const { opts } = makeOpts()
    const { result } = renderHook(() => useAIGenerator(opts))

    act(() => result.current.setLive({ algoId: 'bubble-sort' }))
    expect(result.current.liveAlgoId).toBe('bubble-sort')
    expect(result.current.generator).toBeNull()

    act(() => result.current.setLive({ generator: { body: 'x', type: 'array' } }))
    expect(result.current.liveAlgoId).toBeNull()
    expect(result.current.generator).toEqual({ body: 'x', type: 'array' })

    act(() => result.current.setLive(null))
    expect(result.current.liveAlgoId).toBeNull()
    expect(result.current.generator).toBeNull()
  })

  it('reset clears live mode', () => {
    const { opts } = makeOpts()
    const { result } = renderHook(() => useAIGenerator(opts))
    act(() => result.current.setLive({ algoId: 'merge-sort' }))
    expect(result.current.liveAlgoId).toBe('merge-sort')
    act(() => result.current.reset())
    expect(result.current.liveAlgoId).toBeNull()
  })
})

describe('useAIGenerator — analyze: recognized built-in (Phase 1)', () => {
  it('sets liveAlgoId, generates a preset, and applies the script', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    const script = makeScript('bubble')
    analyzeCodeGenerator.mockResolvedValue({
      success: true,
      generator: { algorithm: 'bubble sort', type: 'array', body: 'gen' },
    })
    recognizeAlgorithm.mockReturnValue('bubble-sort')
    generatePreset.mockReturnValue(script)

    const { result } = renderHook(() => useAIGenerator(opts))

    let res: Awaited<ReturnType<typeof result.current.analyze>>
    await act(async () => {
      res = await result.current.analyze(
        { code: 'def bubble(): pass', language: 'python', inputData: 'nums = [1,2,3]' },
        true,
        vi.fn(),
      )
    })

    expect(res!.ok).toBe(true)
    expect(res!.script).toBe(script)
    expect(result.current.liveAlgoId).toBe('bubble-sort')
    expect(result.current.generator).toBeNull()
    expect(applyScript).toHaveBeenCalledWith(script)
    expect(setStatus).toHaveBeenCalledWith('success')
  })
})

describe('useAIGenerator — analyze: AI generator (Phase 2)', () => {
  it('runs the sandbox and applies the produced script', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    const script = makeScript('custom')
    analyzeCodeGenerator.mockResolvedValue({
      success: true,
      generator: { algorithm: 'some-unknown-algo', type: 'array', body: 'BODY' },
    })
    recognizeAlgorithm.mockReturnValue(null) // not a built-in → Phase 2
    runGeneratorSandboxed.mockResolvedValue({ ok: true, script })

    const { result } = renderHook(() => useAIGenerator(opts))

    let res: Awaited<ReturnType<typeof result.current.analyze>>
    await act(async () => {
      res = await result.current.analyze(
        { code: 'function f(){}', language: 'javascript', inputData: 'nums = [1,2,3]' },
        true,
        vi.fn(),
      )
    })

    expect(res!.ok).toBe(true)
    expect(res!.generatorBody).toBe('BODY')
    expect(res!.generatorType).toBe('array')
    expect(result.current.generator).toEqual({ body: 'BODY', type: 'array' })
    expect(applyScript).toHaveBeenCalledWith(script)
    expect(setStatus).toHaveBeenCalledWith('success')
  })

  it('falls back to a fallback scene when the sandbox fails (no repair)', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    analyzeCodeGenerator.mockResolvedValue({
      success: true,
      generator: { algorithm: 'unknown', type: 'array', body: 'BAD' },
    })
    recognizeAlgorithm.mockReturnValue(null)
    runGeneratorSandboxed.mockResolvedValue({ ok: false, error: 'boom', kind: 'runtime' })
    repairGenerator.mockResolvedValue(null) // repair gives up

    const { result } = renderHook(() => useAIGenerator(opts))

    let res: Awaited<ReturnType<typeof result.current.analyze>>
    await act(async () => {
      res = await result.current.analyze(
        { code: 'function f(){}', language: 'javascript', inputData: 'nums = [1,2,3]' },
        true,
        vi.fn(),
      )
    })

    expect(res!.ok).toBe(false)
    expect(res!.error).toBe('boom')
    expect(buildFallbackScene).toHaveBeenCalled()
    expect(applyScript).toHaveBeenCalledWith(makeScript('fallback'))
    expect(setStatus).toHaveBeenCalledWith('error', 'boom', 'BAD')
  })
})

describe('useAIGenerator — analyze: top-level AI failure', () => {
  it('applies a fallback scene and reports the error', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    analyzeCodeGenerator.mockResolvedValue({
      success: false,
      error: '分析失败',
      errorReport: { stage: 'network' },
      rawResponse: 'raw',
    })

    const { result } = renderHook(() => useAIGenerator(opts))

    let res: Awaited<ReturnType<typeof result.current.analyze>>
    await act(async () => {
      res = await result.current.analyze(
        { code: 'x', language: 'javascript', inputData: 'nums = [1,2,3]' },
        true,
        vi.fn(),
      )
    })

    expect(res!.ok).toBe(false)
    expect(res!.error).toBe('分析失败')
    expect(res!.rawResponse).toBe('raw')
    expect(buildFallbackScene).toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('error', '分析失败', 'raw')
    expect(result.current.liveAlgoId).toBeNull()
  })

  it('returns early without applying when the signal is aborted', async () => {
    const { opts, applyScript } = makeOpts()
    analyzeCodeGenerator.mockResolvedValue({ success: true, generator: { algorithm: 'a', type: 'array', body: 'b' } })
    const ctrl = new AbortController()
    ctrl.abort()

    const { result } = renderHook(() => useAIGenerator(opts))

    let res: Awaited<ReturnType<typeof result.current.analyze>>
    await act(async () => {
      res = await result.current.analyze(
        { code: 'x', language: 'javascript', inputData: 'n', signal: ctrl.signal },
        true,
        vi.fn(),
      )
    })

    expect(res!.ok).toBe(false)
    expect(res!.error).toBe('AbortError')
    expect(applyScript).not.toHaveBeenCalled()
  })
})

describe('useAIGenerator — live regen on input change', () => {
  it('regenerates a preset (debounced) after a built-in is live', async () => {
    vi.useFakeTimers()
    const { opts, applyScript, setStatus } = makeOpts({ inputData: 'nums = [1]' })
    const regen = makeScript('regen')
    generatePreset.mockReturnValue(regen)

    const { result, rerender } = renderHook(
      (props: UseAIGeneratorOptions) => useAIGenerator(props),
      { initialProps: opts },
    )

    act(() => result.current.setLive({ algoId: 'bubble-sort' }))
    applyScript.mockClear()

    // Change input → schedules a 400ms debounced regen.
    rerender({ ...opts, inputData: 'nums = [9,8,7]' })
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(generatePreset).toHaveBeenCalledWith('bubble-sort', expect.anything())
    expect(applyScript).toHaveBeenCalledWith(regen)
    expect(setStatus).toHaveBeenLastCalledWith('success')
  })
})
