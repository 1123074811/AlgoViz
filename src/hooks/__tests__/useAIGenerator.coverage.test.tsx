import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { AnimationScript } from '@/types/animation'
import { createGeneratorArtifact } from '@/generator'

// The Hook only coordinates the application service and UI callbacks.
const compileArtifact = vi.fn()
const runArtifact = vi.fn()
const generatePreset = vi.fn()
const buildFallbackScene = vi.fn()

vi.mock('@/generator/compile', () => ({
  compileArtifact: (...args: unknown[]) => compileArtifact(...args),
  classifyFailure: () => 'runtime',
  inferSampleInputFromCode: () => undefined,
  toFallbackInitialState: () => ({ type: 'array', data: [] }),
}))
vi.mock('@/generator/runtime', () => ({
  runArtifact: (...args: unknown[]) => runArtifact(...args),
  verifyArtifact: vi.fn(),
}))
vi.mock('@/presets', () => ({
  generatePreset: (...a: unknown[]) => generatePreset(...a),
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

function makeArtifact(generatorSource = 'BODY') {
  return createGeneratorArtifact({
    sourceCode: 'function f(){}',
    language: 'javascript',
    category: 'linear',
    algorithm: 'custom',
    rendererType: 'array',
    generatorSource,
    inputSamples: [[1, 2, 3]],
  })
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
  compileArtifact.mockReset()
  runArtifact.mockReset()
  generatePreset.mockReset()
  buildFallbackScene.mockReset()
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

    const artifact = makeArtifact('x')
    act(() => result.current.setLive({ generator: { artifact } }))
    expect(result.current.liveAlgoId).toBeNull()
    expect(result.current.generator).toEqual({ artifact })

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
    compileArtifact.mockResolvedValue({
      ok: true,
      script,
      liveAlgoId: 'bubble-sort',
      usedInput: 'nums = [1,2,3]',
    })

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

  it('returns an error and fallback scene when a recognized preset cannot generate', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    compileArtifact.mockResolvedValue({
      ok: false,
      error: '内置算法 bubble-sort 无法根据当前输入生成动画',
      fallbackScript: makeScript('fallback'),
      usedInput: 'nums = [1,2,3]',
    })

    const { result } = renderHook(() => useAIGenerator(opts))
    let res: Awaited<ReturnType<typeof result.current.analyze>>
    await act(async () => {
      res = await result.current.analyze(
        { code: 'def bubble(): pass', language: 'python', inputData: 'nums = [1,2,3]' },
        true,
        vi.fn(),
      )
    })

    expect(res!.ok).toBe(false)
    expect(res!.error).toContain('无法根据当前输入生成动画')
    expect(result.current.liveAlgoId).toBeNull()
    expect(applyScript).toHaveBeenCalledWith(makeScript('fallback'))
    expect(setStatus).toHaveBeenCalledWith('error', expect.stringContaining('无法根据当前输入生成动画'), undefined)
  })
})

describe('useAIGenerator — analyze: AI generator (Phase 2)', () => {
  it('runs the sandbox and applies the produced script', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    const script = makeScript('custom')
    const artifact = {
      ...makeArtifact('BODY'),
      validation: { status: 'passed' as const, checkedInputs: 1, issues: [] },
    }
    compileArtifact.mockResolvedValue({
      ok: true,
      script,
      artifact,
      generator: { artifact, verify: { userCode: 'function f(){}' } },
    })

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
    expect(res!.artifact).toMatchObject({
      artifactVersion: 1,
      generatorSource: 'BODY',
      rendererType: 'array',
      validation: { status: 'passed', checkedInputs: 1 },
    })
    expect(result.current.generator).toMatchObject({
      artifact: {
        generatorSource: 'BODY',
        rendererType: 'array',
      },
      verify: { userCode: 'function f(){}' },
    })
    expect(applyScript).toHaveBeenCalledWith(script)
    expect(setStatus).toHaveBeenCalledWith('success')
  })

  it('falls back to a fallback scene when the sandbox fails (no repair)', async () => {
    const { opts, applyScript, setStatus } = makeOpts()
    const artifact = makeArtifact('BAD')
    compileArtifact.mockResolvedValue({
      ok: false,
      error: 'boom',
      artifact,
      generator: { artifact },
      rawResponse: 'BAD',
      fallbackScript: makeScript('fallback'),
    })

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
    expect(applyScript).toHaveBeenCalledWith(makeScript('fallback'))
    expect(setStatus).toHaveBeenCalledWith('error', 'boom', 'BAD')
  })
})

describe('useAIGenerator — analyze: top-level AI failure', () => {
  it('applies a fallback scene and reports the error', async () => {
    const { opts, setStatus } = makeOpts()
    compileArtifact.mockResolvedValue({
      ok: false,
      error: '分析失败',
      errorReport: { stage: 'network' },
      rawResponse: 'raw',
      fallbackScript: makeScript('fallback'),
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
    expect(setStatus).toHaveBeenCalledWith('error', '分析失败', 'raw')
    expect(result.current.liveAlgoId).toBeNull()
  })

  it('returns early without applying when the signal is aborted', async () => {
    const { opts, applyScript } = makeOpts()
    compileArtifact.mockResolvedValue({ ok: false, error: 'AbortError' })
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

  it('runs one artifact locally for five inputs without another LLM request', async () => {
    vi.useFakeTimers()
    const parseInput = vi.fn((raw: string) => ({ valid: true, value: JSON.parse(raw) }))
    const { opts, applyScript } = makeOpts({
      inputData: '[1]',
      parseInput,
    })
    const artifact = makeArtifact()
    runArtifact.mockResolvedValue({ ok: true, script: makeScript('local') })

    const { result, rerender } = renderHook(
      (props: UseAIGeneratorOptions) => useAIGenerator(props),
      { initialProps: opts },
    )

    act(() => result.current.setLive({ generator: { artifact } }))
    runArtifact.mockClear()
    compileArtifact.mockClear()
    applyScript.mockClear()

    const inputs = ['[]', '[1]', '[3,2,1]', '[2,2,2]', '[9,1,5,7]']
    for (const inputData of inputs) {
      rerender({ ...opts, inputData })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
    }

    expect(runArtifact).toHaveBeenCalledTimes(5)
    expect(runArtifact.mock.calls.map((call) => call[1])).toEqual(
      inputs.map((input) => JSON.parse(input)),
    )
    expect(compileArtifact).not.toHaveBeenCalled()
    expect(applyScript).toHaveBeenCalledTimes(5)
  })
})
