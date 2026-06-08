import { useState, useCallback, useEffect, useRef } from 'react'
import { analyzeCodeGenerator } from '@/ai'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'
import { recognizeAlgorithm } from '@/presets/recognize'
import { generatePreset } from '@/presets'
import { classifyAlgorithm, CATEGORY_PROFILES } from '@/ai/categories'
import { runQualityGate } from '@/ai/quality'
import { repairGenerator } from '@/ai/repairGenerator'
import { buildFallbackScene, type FallbackKind } from '@/ai/fallbackScene'
import type { AnimationScript, InitialState } from '@/types/animation'
import type { AIStatus } from '@/store/algorithmStore'

export type GeneratorType = 'array' | 'graph' | 'tree' | 'linked_list'

/**
 * 把一次失败映射到三类可读兜底态：
 *  - runtime: 沙箱执行崩溃/超时（来自 GeneratorResult.kind）。
 *  - unavailable: 模型/网络/认证/限流不可用。
 *  - parse: 解析/schema/提取失败（默认兜底）。
 */
export function classifyFailure(err: { stage?: string; kind?: string }): FallbackKind {
  if (err.kind === 'runtime') return 'runtime'
  const s = err.stage ?? ''
  if (s.includes('network') || s.includes('auth') || s.includes('rate') || s.includes('config') || s.includes('request')) return 'unavailable'
  if (s.includes('json') || s.includes('schema') || s.includes('parse') || s.includes('extract')) return 'parse'
  return 'parse'
}

/** 从已解析输入构造一个尽量有内容的兜底 initialState（数组优先）。 */
function toFallbackInitialState(value: unknown): InitialState {
  if (Array.isArray(value)) {
    const data = value.map(v => (typeof v === 'number' ? v : Number(v))).filter(v => !Number.isNaN(v))
    return { type: 'array', data }
  }
  if (value && typeof value === 'object') {
    const arr = (value as Record<string, unknown>).data ?? (value as Record<string, unknown>).array
    if (Array.isArray(arr)) {
      const data = arr.map(v => (typeof v === 'number' ? v : Number(v))).filter(v => !Number.isNaN(v))
      return { type: 'array', data }
    }
  }
  return { type: 'array', data: [] }
}

/** Result of one AI analysis pass. The caller is responsible for translating
 *  this into history entries (Playground vs Visualizer store history differently). */
export interface AnalyzeResult {
  ok: boolean
  /** Generated/recognized animation (present on success when generation succeeded). */
  script?: AnimationScript
  /** Phase 2 only: the AI-written generator source. */
  generatorBody?: string
  generatorType?: GeneratorType
  error?: string
  /** Raw text to surface in "查看原始响应" — AI raw response or generator source. */
  rawResponse?: string
  /** AI structured error report (compilation/schema), if any. */
  errorReport?: import('@/ai').AIErrorReport
  /** The raw input string the returned script was actually generated from.
   *  Callers persist this to history so the input box never diverges from the animation. */
  usedInput?: string
}

interface AnalyzeParams {
  code: string
  language: string
  inputData: string
  algorithmName?: string
  signal?: AbortSignal
}

export interface UseAIGeneratorOptions {
  /** Current raw input box text (drives the live-regen effect). */
  inputData: string
  /** Page-specific input parser. Playground → parseInputData; Visualizer → parsedInput logic. */
  parseInput: (raw: string) => { valid: boolean; value: unknown }
  /** Apply a freshly generated script. Playground → setAnimationScript; Visualizer → setAnimationScript + loadScript. */
  applyScript: (script: AnimationScript) => void
  /** store.setAIStatus */
  setStatus: (status: AIStatus, error?: string, rawResponse?: string) => void
}

export interface UseAIGeneratorReturn {
  /** Recognized built-in algorithm id (Phase 1 live mode), or null. */
  liveAlgoId: string | null
  /** AI-generated generator (Phase 2 live mode), or null. */
  generator: { body: string; type: GeneratorType } | null
  /** Run one AI analysis pass: recognize → Phase 1 (preset) / Phase 2 (sandbox + @sample retry + complexity).
   *  Sets liveAlgoId/generator and (on success) applies the script. Returns a result for the caller's history.
   *  @param currentInputValid whether the current input box already holds valid input (skip @sample auto-fill).
   *  @param sampleFill called to auto-fill the AI sample input when the box is empty/invalid. */
  analyze: (
    params: AnalyzeParams,
    currentInputValid: boolean,
    sampleFill: (sample: string) => void,
  ) => Promise<AnalyzeResult>
  /** Clear live mode (no live regen until the next analyze). */
  reset: () => void
  /** Restore live mode directly (e.g. from a saved history entry). Pass null to clear. */
  setLive: (live: { algoId: string } | { generator: { body: string; type: GeneratorType } } | null) => void
}

export function useAIGenerator(opts: UseAIGeneratorOptions): UseAIGeneratorReturn {
  const { inputData, parseInput, applyScript, setStatus } = opts

  const [liveAlgoId, setLiveAlgoId] = useState<string | null>(null)
  const [generator, setGenerator] = useState<{ body: string; type: GeneratorType } | null>(null)

  // Keep the latest page-injected callbacks in refs so the live-regen effect
  // doesn't re-fire (and re-debounce) just because a parent re-render produced
  // new closure identities.
  const parseInputRef = useRef(parseInput)
  const applyScriptRef = useRef(applyScript)
  const setStatusRef = useRef(setStatus)
  useEffect(() => {
    parseInputRef.current = parseInput
    applyScriptRef.current = applyScript
    setStatusRef.current = setStatus
  })

  const reset = useCallback(() => {
    setLiveAlgoId(null)
    setGenerator(null)
  }, [])

  const setLive = useCallback(
    (live: { algoId: string } | { generator: { body: string; type: GeneratorType } } | null) => {
      if (live === null) {
        setLiveAlgoId(null)
        setGenerator(null)
      } else if ('algoId' in live) {
        setLiveAlgoId(live.algoId)
        setGenerator(null)
      } else {
        setLiveAlgoId(null)
        setGenerator(live.generator)
      }
    },
    [],
  )

  const analyze = useCallback(
    async (
      params: AnalyzeParams,
      currentInputValid: boolean,
      sampleFill: (sample: string) => void,
    ): Promise<AnalyzeResult> => {
      // Clear previous live mode so a stale result doesn't linger if this fails.
      setLiveAlgoId(null)
      setGenerator(null)

      const result = await analyzeCodeGenerator(
        { code: params.code, language: params.language, inputData: params.inputData, algorithmName: params.algorithmName },
        { signal: params.signal },
      )

      if (params.signal?.aborted) return { ok: false, error: 'AbortError' }

      if (!result.success || !result.generator) {
        const error = result.error || '分析失败'
        const kind = classifyFailure({ stage: result.errorReport?.stage })
        const parsedInput = parseInputRef.current(params.inputData)
        const initial = toFallbackInitialState(parsedInput.valid ? parsedInput.value : undefined)
        applyScriptRef.current(buildFallbackScene(initial, { kind, message: error }))
        setStatusRef.current('error', error, result.rawResponse)
        return { ok: false, error, rawResponse: result.rawResponse, errorReport: result.errorReport }
      }

      const gen = result.generator

      // The AI infers the expected input format and supplies a sample. Auto-fill
      // it only when the current input box is empty/invalid (respect user input).
      const effectiveInput = currentInputValid ? params.inputData : (gen.sampleInput ?? params.inputData)
      // Track the input the script is actually generated from, so the box and
      // history always mirror the animation (see the @sample retry below).
      let usedInput = effectiveInput
      if (!currentInputValid && gen.sampleInput) {
        sampleFill(gen.sampleInput)
      }

      const recognized = recognizeAlgorithm(gen.algorithm)

      if (recognized) {
        // Phase 1: built-in generator — generate locally from the effective input.
        setLiveAlgoId(recognized)
        setGenerator(null)
        const parsed = parseInputRef.current(effectiveInput)
        let script: AnimationScript | null = null
        if (parsed.valid) {
          try { script = generatePreset(recognized, parsed.value) ?? null } catch { script = null }
        }
        if (script) applyScriptRef.current(script)
        setStatusRef.current('success')
        return { ok: true, script: script ?? undefined, usedInput }
      }

      // Phase 2: AI generator — execute it in the sandbox.
      const genType: GeneratorType = gen.type === 'matrix' ? 'array' : gen.type
      setLiveAlgoId(null)
      setGenerator({ body: gen.body, type: genType })

      const parsed = parseInputRef.current(effectiveInput)
      let sandboxResult = parsed.valid
        ? await runGeneratorSandboxed(gen.body, parsed.value, { algorithm: gen.algorithm, type: genType })
        : { ok: false as const, error: '输入数据无效' }

      // If the generator crashed (often a stale/wrong-shaped leftover input),
      // retry with the AI's own sample input, which matches the expected format.
      if (!sandboxResult.ok && gen.sampleInput && gen.sampleInput !== effectiveInput) {
        const sp = parseInputRef.current(gen.sampleInput)
        if (sp.valid) {
          const retry = await runGeneratorSandboxed(gen.body, sp.value, { algorithm: gen.algorithm, type: genType })
          if (retry.ok) { sandboxResult = retry; sampleFill(gen.sampleInput); usedInput = gen.sampleInput }
        }
      }

      let activeBody = gen.body

      // 沙箱运行期报错(异常/崩溃):把真实错误回发 AI 修复一次。
      // 常见原因是对 input 形状的错误假设(如访问不存在的字段),让 AI 据实修正。
      if (!sandboxResult.ok) {
        const category = classifyAlgorithm({ algorithm: gen.algorithm, type: gen.type, code: params.code })
        const p = parseInputRef.current(usedInput)
        if (p.valid) {
          const repaired = await repairGenerator({
            body: gen.body, sourceCode: params.code, language: params.language, category,
            issues: [{
              code: 'runtime-error', severity: 'error',
              message: '生成器在沙箱中执行报错: ' + (sandboxResult.error || '未知错误'),
              hint: '按运行时报错修正:不要假设 input 上存在不存在的字段;先对 input 的真实形状做健壮解析(数组与对象都要兼容、带空值回退),再驱动 b。',
            }],
            inputData: usedInput, signal: params.signal,
          })
          if (repaired) {
            const retry = await runGeneratorSandboxed(repaired.body, p.value, { algorithm: gen.algorithm, type: genType })
            if (retry.ok && retry.script) { sandboxResult = retry; activeBody = repaired.body }
          }
        }
      }

      // 确定性质量门:检查生成动画的语义质量(空结构/全 0 网格/递归无栈/无操作等)。
      // 仅当存在 error 时,带具体问题清单回发 AI 修复一次,并且只有修复结果不劣化才采用。
      if (sandboxResult.ok && sandboxResult.script) {
        const category = classifyAlgorithm({ algorithm: gen.algorithm, type: gen.type, code: params.code })
        const gate = runQualityGate(sandboxResult.script, category, CATEGORY_PROFILES[category].rules, params.code)
        if (!gate.passed) {
          const errs = gate.issues.filter(i => i.severity === 'error')
          const repaired = await repairGenerator({
            body: gen.body, sourceCode: params.code, language: params.language, category, issues: errs,
            inputData: usedInput, signal: params.signal,
          })
          if (repaired) {
            const p = parseInputRef.current(usedInput)
            if (p.valid) {
              const retry = await runGeneratorSandboxed(repaired.body, p.value, { algorithm: gen.algorithm, type: genType })
              if (retry.ok && retry.script) {
                const errs2 = runQualityGate(retry.script, category, CATEGORY_PROFILES[category].rules, params.code)
                  .issues.filter(i => i.severity === 'error')
                if (errs2.length < errs.length) { sandboxResult = retry; activeBody = repaired.body }
              }
            }
          }
        }
      }

      if (sandboxResult.ok && sandboxResult.script) {
        // Fill in AI-provided complexity (the builder defaults to O(?)).
        if (gen.timeComplexity || gen.spaceComplexity) {
          const tc = gen.timeComplexity || 'O(?)'
          sandboxResult.script.complexity = {
            time: { best: tc, average: tc, worst: tc },
            space: gen.spaceComplexity || 'O(?)',
          }
        }
        applyScriptRef.current(sandboxResult.script)
        setStatusRef.current('success')
        return { ok: true, script: sandboxResult.script, generatorBody: activeBody, generatorType: genType, usedInput }
      }

      // 沙箱失败：用兜底场景保证渲染永不空白，并以 kind 区分超时/崩溃。
      const error = sandboxResult.error || '生成器执行失败'
      const kind = classifyFailure({ kind: sandboxResult.kind })
      const initial = parsed.valid ? toFallbackInitialState(parsed.value) : { type: 'array' as const, data: [] }
      applyScriptRef.current(buildFallbackScene(initial, { kind, message: error }))
      // Surface the generator source so diagnostics can show the AI code.
      setStatusRef.current('error', error, gen.body)
      return { ok: false, error, generatorBody: gen.body, generatorType: genType, rawResponse: gen.body }
    },
    [],
  )

  // 输入变化 → 本地重生成（Phase 1 内置生成器 或 Phase 2 AI 生成器），不调 AI。
  // 仅在做过 AI 分析（liveAlgoId/generator 非空）后才触发——预设选择流程不受影响。
  useEffect(() => {
    if (liveAlgoId) {
      const handle = setTimeout(() => {
        const parsed = parseInputRef.current(inputData)
        if (!parsed.valid) return
        let script: AnimationScript | null = null
        try { script = generatePreset(liveAlgoId, parsed.value) ?? null } catch { script = null }
        if (script) { applyScriptRef.current(script); setStatusRef.current('success') }
      }, 400)
      return () => clearTimeout(handle)
    }
    if (generator) {
      let cancelled = false
      const handle = setTimeout(async () => {
        const parsed = parseInputRef.current(inputData)
        if (!parsed.valid) return
        const result = await runGeneratorSandboxed(generator.body, parsed.value, { algorithm: 'custom', type: generator.type })
        if (cancelled) return
        if (result.ok && result.script) {
          applyScriptRef.current(result.script); setStatusRef.current('success')
        } else {
          // 输入变化后重生成失败：兜底场景，避免空白或残留旧动画。
          const error = result.error || '生成器执行失败'
          const kind = classifyFailure({ kind: result.kind })
          applyScriptRef.current(buildFallbackScene(toFallbackInitialState(parsed.value), { kind, message: error }))
          setStatusRef.current('error', error)
        }
      }, 400)
      return () => { cancelled = true; clearTimeout(handle) }
    }
  }, [inputData, liveAlgoId, generator])

  return { liveAlgoId, generator, analyze, reset, setLive }
}
