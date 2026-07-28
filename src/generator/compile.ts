import { analyzeCodeGenerator, type AIErrorReport } from '@/ai'
import { classifyAlgorithm, CATEGORY_PROFILES } from '@/ai/categories'
import { buildFallbackScene, type FallbackKind } from '@/ai/fallbackScene'
import { formatVerifyValue } from '@/ai/verify'
import { runQualityGate } from '@/ai/quality'
import { repairGenerator } from '@/ai/repairGenerator'
import { generatePreset } from '@/presets'
import { recognizeAlgorithm } from '@/presets/recognize'
import type { AnimationScript, InitialState, RendererType } from '@/types/animation'
import {
  createGeneratorArtifact,
  generateBoundaryInputs,
  type GeneratorArtifact,
} from './contracts'
import { runArtifact, validateArtifactAcrossInputs } from './runtime'

export type LiveGenerator = {
  artifact: GeneratorArtifact
  verify?: { userCode: string }
}

export interface CompileArtifactParams {
  code: string
  language: string
  inputData: string
  algorithmName?: string
  signal?: AbortSignal
}

export interface CompileArtifactOptions {
  currentInputValid: boolean
  parseInput: (raw: string) => { valid: boolean; value: unknown }
}

export interface CompileArtifactResult {
  ok: boolean
  script?: AnimationScript
  fallbackScript?: AnimationScript
  artifact?: GeneratorArtifact
  liveAlgoId?: string
  generator?: LiveGenerator
  error?: string
  rawResponse?: string
  errorReport?: AIErrorReport
  usedInput?: string
  sampleInput?: string
}

export function classifyFailure(error: { stage?: string; kind?: string }): FallbackKind {
  if (error.kind === 'runtime') return 'runtime'
  const stage = error.stage ?? ''
  if (stage.includes('network') || stage.includes('auth') || stage.includes('rate') ||
    stage.includes('config') || stage.includes('request')) return 'unavailable'
  return 'parse'
}

const PARAM_SAMPLE_BY_NAME: Array<[RegExp, string]> = [
  [/(intervals?|ranges?|segments?)/i, 'intervals = [[1,3],[2,5],[3,6]]'],
  [/(target|targetSum|sum|k)\b/i, 'nums = [2, 7, 11, 15]; target = 9'],
  [/(nums?|arr|array|values|heights|temperatures|prices|stones|piles)/i, 'nums = [5, 3, 8, 1, 9, 2]'],
  [/(grid|board|matrix)/i, 'grid = [[1,0,1],[0,1,0],[1,0,1]]'],
  [/(text|word1|word2|pattern|s)\b/i, 's = "babad"'],
  [/(root|tree)/i, 'root = [8,3,10,1,6,null,14]'],
  [/(edges?|graph|nodes?)/i, 'n = 5; edges = [[0,1],[1,2],[2,3],[3,4]]'],
]

export function inferSampleInputFromCode(code: string, algorithmName?: string): string | undefined {
  const candidates = [algorithmName ?? '', code]
  const parameterList = extractFirstParameterList(code)
  if (parameterList) candidates.unshift(parameterList)
  const joined = candidates.join('\n')
  return PARAM_SAMPLE_BY_NAME.find(([pattern]) => pattern.test(joined))?.[1]
}

export async function compileArtifact(
  params: CompileArtifactParams,
  options: CompileArtifactOptions,
): Promise<CompileArtifactResult> {
  const analyzed = await analyzeCodeGenerator(
    { code: params.code, language: params.language, inputData: params.inputData, algorithmName: params.algorithmName },
    { signal: params.signal },
  )
  if (params.signal?.aborted) return { ok: false, error: 'AbortError' }

  if (!analyzed.success || !analyzed.generator) {
    const error = analyzed.error || '分析失败'
    const parsed = options.parseInput(params.inputData)
    return {
      ok: false,
      error,
      rawResponse: analyzed.rawResponse,
      errorReport: analyzed.errorReport,
      fallbackScript: buildFallbackScene(
        toFallbackInitialState(parsed.valid ? parsed.value : undefined),
        { kind: classifyFailure({ stage: analyzed.errorReport?.stage }), message: error },
      ),
    }
  }

  const generated = analyzed.generator
  const inferredSample = !options.currentInputValid && !generated.sampleInput
    ? inferSampleInputFromCode(params.code, params.algorithmName)
    : undefined
  const sampleInput = generated.sampleInput ?? inferredSample
  const effectiveInput = options.currentInputValid ? params.inputData : (sampleInput ?? params.inputData)
  let usedInput = effectiveInput
  const recognized = recognizeAlgorithm(generated.algorithm)

  if (recognized) {
    const parsed = options.parseInput(effectiveInput)
    let script: AnimationScript | null = null
    if (parsed.valid) {
      try { script = generatePreset(recognized, parsed.value) ?? null } catch { script = null }
    }
    if (!script) {
      const error = `内置算法 ${recognized} 无法根据当前输入生成动画`
      return {
        ok: false,
        error,
        usedInput,
        sampleInput,
        fallbackScript: buildFallbackScene(
          toFallbackInitialState(parsed.valid ? parsed.value : undefined),
          { kind: 'runtime', message: error },
        ),
      }
    }
    return { ok: true, script, liveAlgoId: recognized, usedInput, sampleInput }
  }

  const parsed = options.parseInput(effectiveInput)
  const sampleValues: unknown[] = parsed.valid ? [parsed.value] : []
  if (sampleInput && sampleInput !== effectiveInput) {
    const parsedSample = options.parseInput(sampleInput)
    if (parsedSample.valid) sampleValues.push(parsedSample.value)
  }
  const category = classifyAlgorithm({
    algorithm: generated.algorithm,
    type: generated.type,
    code: params.code,
  })
  let artifact = createGeneratorArtifact({
    sourceCode: params.code,
    language: params.language,
    category,
    algorithm: generated.algorithm,
    rendererType: (generated.type === 'matrix' ? 'array' : generated.type) as RendererType,
    generatorSource: generated.body,
    inputSamples: sampleValues,
    expectedResult: generated.expectedResult,
    timeComplexity: generated.timeComplexity,
    spaceComplexity: generated.spaceComplexity,
  })

  let input = parsed.valid ? parsed.value : undefined
  let run = parsed.valid
    ? await runArtifact(artifact, parsed.value, { sourceCode: params.code })
    : { ok: false as const, error: '输入数据无效', kind: 'runtime' as const }

  if (!run.ok && sampleInput && sampleInput !== effectiveInput) {
    const parsedSample = options.parseInput(sampleInput)
    if (parsedSample.valid) {
      const retry = await runArtifact(artifact, parsedSample.value, { sourceCode: params.code })
      if (retry.ok) {
        run = retry
        input = parsedSample.value
        usedInput = sampleInput
      }
    }
  }

  if (!run.ok && input !== undefined) {
    const repaired = await repairGenerator({
      body: artifact.generatorSource,
      sourceCode: params.code,
      language: params.language,
      category,
      issues: [{
        code: 'runtime-error',
        severity: 'error',
        message: '生成器在沙箱中执行报错: ' + (run.error || '未知错误'),
        hint: '按运行时报错修正输入解析并完整执行原算法；不得按动画长度截断计算。',
      }],
      inputData: usedInput,
      signal: params.signal,
    })
    if (repaired) {
      const candidate = { ...artifact, generatorSource: repaired.body }
      const retry = await runArtifact(candidate, input, { sourceCode: params.code })
      if (retry.ok) {
        artifact = candidate
        run = retry
      }
    }
  }

  if (run.ok && run.script && input !== undefined) {
    const gate = runQualityGate(run.script, category, CATEGORY_PROFILES[category].rules, params.code)
    const errors = gate.issues.filter(issue => issue.severity === 'error')
    if (errors.length > 0) {
      const repaired = await repairGenerator({
        body: artifact.generatorSource,
        sourceCode: params.code,
        language: params.language,
        category,
        issues: errors,
        inputData: usedInput,
        signal: params.signal,
      })
      if (repaired) {
        const candidate = { ...artifact, generatorSource: repaired.body }
        const retry = await runArtifact(candidate, input, { sourceCode: params.code })
        if (retry.ok && retry.script) {
          const remaining = runQualityGate(
            retry.script,
            category,
            CATEGORY_PROFILES[category].rules,
            params.code,
          ).issues.filter(issue => issue.severity === 'error')
          if (remaining.length < errors.length) {
            artifact = candidate
            run = retry
          }
        }
      }
    }
  }

  if (run.ok && run.script && run.script.verification?.status === 'fail' && input !== undefined) {
    const repaired = await repairGenerator({
      body: artifact.generatorSource,
      sourceCode: params.code,
      language: params.language,
      category,
      issues: [{
        code: 'result-mismatch',
        severity: 'error',
        message: `动画最终结果 ${formatVerifyValue(run.script.result)} 与原代码结果不一致`,
        hint: '严格按原代码语义重写生成器，确保 b.result(...) 等于原代码返回值；不要硬编码或截断计算。',
      }],
      inputData: usedInput,
      signal: params.signal,
    })
    if (repaired) {
      const candidate = { ...artifact, generatorSource: repaired.body }
      const retry = await runArtifact(candidate, input, { sourceCode: params.code })
      if (retry.ok && retry.script?.verification?.status !== 'fail') {
        artifact = candidate
        run = retry
      }
    }
  }

  if (run.ok && run.script && input !== undefined) {
    const boundaryCases = [{ id: 'current', input }, ...generateBoundaryInputs(artifact.inputContract)]
      .filter((testCase, index, cases) =>
        cases.findIndex(candidate => JSON.stringify(candidate.input) === JSON.stringify(testCase.input)) === index,
      )
    artifact = await validateArtifactAcrossInputs(artifact, {
      sourceCode: params.code,
      cases: boundaryCases,
    })
    return {
      ok: true,
      script: run.script,
      artifact,
      generator: { artifact, verify: { userCode: params.code } },
      usedInput,
      sampleInput,
    }
  }

  const error = run.error || '生成器执行失败'
  artifact = {
    ...artifact,
    validation: {
      status: 'failed',
      checkedInputs: input === undefined ? 0 : 1,
      issues: [{ code: 'runtime-error', message: error }],
      confidence: 'low',
    },
  }
  return {
    ok: false,
    error,
    artifact,
    generator: { artifact, verify: { userCode: params.code } },
    rawResponse: artifact.generatorSource,
    fallbackScript: buildFallbackScene(
      toFallbackInitialState(input),
      { kind: classifyFailure({ kind: run.kind }), message: error },
    ),
  }
}

function extractFirstParameterList(code: string): string | undefined {
  const patterns = [
    /\bdef\s+\w+\s*\(([^)]*)\)/,
    /\b(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\], ?]+\s+\w+\s*\(([^)]*)\)\s*[{;]/,
    /\bfunction\s+\w+\s*\(([^)]*)\)/,
  ]
  return patterns.map(pattern => pattern.exec(code)?.[1]).find(Boolean)
}

export function toFallbackInitialState(value: unknown): InitialState {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      data: value.map(item => typeof item === 'number' ? item : Number(item)).filter(item => !Number.isNaN(item)),
    }
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    const array = object.data ?? object.array
    if (Array.isArray(array)) return toFallbackInitialState(array)
  }
  return { type: 'array', data: [] }
}
