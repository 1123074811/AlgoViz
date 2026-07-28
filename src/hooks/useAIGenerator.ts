import { useCallback, useEffect, useRef, useState } from 'react'
import { buildFallbackScene } from '@/ai/fallbackScene'
import {
  classifyFailure,
  compileArtifact,
  inferSampleInputFromCode,
  toFallbackInitialState,
  type CompileArtifactParams,
  type LiveGenerator,
} from '@/generator/compile'
import { runArtifact, verifyArtifact } from '@/generator/runtime'
import { generatePreset } from '@/presets'
import type { AIStatus } from '@/store/algorithmStore'
import type { AnimationScript } from '@/types/animation'
import type { GeneratorArtifact } from '@/generator'

export { classifyFailure, inferSampleInputFromCode }
export { verifyArtifact as verifyAndTag }
export type { LiveGenerator }
export type GeneratorType = 'array' | 'graph' | 'tree' | 'linked_list' | 'union_find'

export interface AnalyzeResult {
  ok: boolean
  script?: AnimationScript
  artifact?: GeneratorArtifact
  error?: string
  rawResponse?: string
  errorReport?: import('@/ai').AIErrorReport
  usedInput?: string
}

export interface UseAIGeneratorOptions {
  inputData: string
  parseInput: (raw: string) => { valid: boolean; value: unknown }
  applyScript: (script: AnimationScript) => void
  setStatus: (status: AIStatus, error?: string, rawResponse?: string) => void
}

export interface UseAIGeneratorReturn {
  liveAlgoId: string | null
  generator: LiveGenerator | null
  analyze: (
    params: CompileArtifactParams,
    currentInputValid: boolean,
    sampleFill: (sample: string) => void,
  ) => Promise<AnalyzeResult>
  reset: () => void
  setLive: (live: { algoId: string } | { generator: LiveGenerator } | null) => void
}

export function useAIGenerator(options: UseAIGeneratorOptions): UseAIGeneratorReturn {
  const { inputData, parseInput, applyScript, setStatus } = options
  const [liveAlgoId, setLiveAlgoId] = useState<string | null>(null)
  const [generator, setGenerator] = useState<LiveGenerator | null>(null)
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

  const setLive = useCallback((live: { algoId: string } | { generator: LiveGenerator } | null) => {
    if (!live) {
      setLiveAlgoId(null)
      setGenerator(null)
    } else if ('algoId' in live) {
      setLiveAlgoId(live.algoId)
      setGenerator(null)
    } else {
      setLiveAlgoId(null)
      setGenerator(live.generator)
    }
  }, [])

  const analyze = useCallback(async (
    params: CompileArtifactParams,
    currentInputValid: boolean,
    sampleFill: (sample: string) => void,
  ): Promise<AnalyzeResult> => {
    setLiveAlgoId(null)
    setGenerator(null)
    const result = await compileArtifact(params, {
      currentInputValid,
      parseInput: raw => parseInputRef.current(raw),
    })
    if (result.error === 'AbortError') return { ok: false, error: 'AbortError' }

    if (result.sampleInput &&
      (!currentInputValid || (result.usedInput === result.sampleInput && params.inputData !== result.sampleInput))) {
      sampleFill(result.sampleInput)
    }
    if (!result.ok || !result.script) {
      if (result.generator) setGenerator(result.generator)
      if (result.fallbackScript) applyScriptRef.current(result.fallbackScript)
      setStatusRef.current('error', result.error || '分析失败', result.rawResponse)
      return {
        ok: false,
        error: result.error,
        artifact: result.artifact,
        rawResponse: result.rawResponse,
        errorReport: result.errorReport,
        usedInput: result.usedInput,
      }
    }

    setLiveAlgoId(result.liveAlgoId ?? null)
    setGenerator(result.generator ?? null)
    applyScriptRef.current(result.script)
    setStatusRef.current('success')
    return {
      ok: true,
      script: result.script,
      artifact: result.artifact,
      usedInput: result.usedInput,
    }
  }, [])

  useEffect(() => {
    if (liveAlgoId) {
      const handle = setTimeout(() => {
        const parsed = parseInputRef.current(inputData)
        if (!parsed.valid) return
        let script: AnimationScript | null = null
        try { script = generatePreset(liveAlgoId, parsed.value) ?? null } catch { script = null }
        if (script) {
          applyScriptRef.current(script)
          setStatusRef.current('success')
        }
      }, 400)
      return () => clearTimeout(handle)
    }

    if (generator) {
      let cancelled = false
      const handle = setTimeout(async () => {
        const parsed = parseInputRef.current(inputData)
        if (!parsed.valid) return
        const result = await runArtifact(generator.artifact, parsed.value, {
          sourceCode: generator.verify?.userCode,
        })
        if (cancelled) return
        if (result.ok && result.script) {
          applyScriptRef.current(result.script)
          setStatusRef.current('success')
          return
        }
        const error = result.error || '生成器执行失败'
        applyScriptRef.current(buildFallbackScene(
          toFallbackInitialState(parsed.value),
          { kind: classifyFailure({ kind: result.kind }), message: error },
        ))
        setStatusRef.current('error', error)
      }, 400)
      return () => {
        cancelled = true
        clearTimeout(handle)
      }
    }
  }, [inputData, liveAlgoId, generator])

  return { liveAlgoId, generator, analyze, reset, setLive }
}
