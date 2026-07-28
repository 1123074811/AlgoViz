import {
  formatVerifyValue,
  sanitizeLineMapping,
  verifyAgainstExpect,
  verifyAgainstGroundTruth,
  type VerifyOutcome,
} from '@/ai/verify'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'
import { runUserJsSandboxed } from '@/sandbox/runUserCode'
import { runUserPySandboxed } from '@/sandbox/runUserPython'
import type { AnimationScript } from '@/types/animation'
import {
  generateBoundaryInputs,
  validateInputContract,
  type BoundaryInput,
  type GeneratorArtifact,
  type GeneratorValidationReport,
} from './contracts'

export interface VerifyArtifactArgs {
  expectRaw?: string
  language: string
  userCode: string
  input: unknown
  sourceCode: string
}

export async function verifyArtifact(
  script: AnimationScript,
  args: VerifyArtifactArgs,
): Promise<VerifyOutcome> {
  let outcome: VerifyOutcome | null = null
  const language = args.language.toLowerCase()
  const realExecCapable = language === 'javascript' || language === 'python'

  if (language === 'javascript') {
    const truth = await runUserJsSandboxed(args.userCode, args.input)
    if (truth.ok) outcome = verifyAgainstGroundTruth(script, truth.value)
  } else if (language === 'python') {
    const truth = await runUserPySandboxed(args.userCode, args.input)
    if (truth.ok) outcome = { ...verifyAgainstGroundTruth(script, truth.value), source: 'py-exec' }
  }

  if (!outcome || outcome.status === 'skipped') {
    const expected = verifyAgainstExpect(script, args.expectRaw)
    if (!outcome || expected.status !== 'skipped') outcome = expected
  }
  if (realExecCapable && outcome.source === 'expect' && outcome.status !== 'skipped') {
    outcome = { ...outcome, degraded: true }
  }

  script.verification = {
    status: outcome.status,
    ...(outcome.source && { source: outcome.source }),
    ...(outcome.expected !== undefined && { expected: formatVerifyValue(outcome.expected) }),
    ...(outcome.actual !== undefined && { actual: formatVerifyValue(outcome.actual) }),
    ...(outcome.message && { message: outcome.message }),
    ...(outcome.degraded && { degraded: true }),
  }
  sanitizeLineMapping(script, args.sourceCode)
  return outcome
}

export interface RunArtifactOptions {
  sourceCode?: string
  eventBudget?: number
}

export async function runArtifact(
  artifact: GeneratorArtifact,
  input: unknown,
  options: RunArtifactOptions = {},
) {
  const validated = validateInputContract(artifact.inputContract, input)
  if (!validated.ok) {
    return { ok: false as const, error: validated.error, kind: 'runtime' as const }
  }

  const result = await runGeneratorSandboxed(
    artifact.generatorSource,
    validated.value,
    {
      algorithm: artifact.algorithm,
      type: artifact.rendererType,
      eventBudget: options.eventBudget,
    },
  )
  if (!result.ok || !result.script) return result

  if (artifact.timeComplexity || artifact.spaceComplexity) {
    const time = artifact.timeComplexity || 'O(?)'
    result.script.complexity = {
      time: { best: time, average: time, worst: time },
      space: artifact.spaceComplexity || 'O(?)',
    }
  }
  if (options.sourceCode) {
    await verifyArtifact(result.script, {
      expectRaw: artifact.expectedResult,
      language: artifact.language,
      userCode: options.sourceCode,
      input: validated.value,
      sourceCode: options.sourceCode,
    })
  } else if (artifact.expectedResult !== undefined) {
    const outcome = verifyAgainstExpect(result.script, artifact.expectedResult)
    result.script.verification = {
      status: outcome.status,
      ...(outcome.source && { source: outcome.source }),
      ...(outcome.expected !== undefined && { expected: formatVerifyValue(outcome.expected) }),
      ...(outcome.actual !== undefined && { actual: formatVerifyValue(outcome.actual) }),
      ...(outcome.message && { message: outcome.message }),
    }
  }
  return result
}

export async function validateArtifactAcrossInputs(
  artifact: GeneratorArtifact,
  options: {
    sourceCode?: string
    cases?: BoundaryInput[]
    eventBudget?: number
  } = {},
): Promise<GeneratorArtifact> {
  const cases = options.cases ?? generateBoundaryInputs(artifact.inputContract)
  const results: NonNullable<GeneratorValidationReport['cases']> = []
  let degraded = false

  for (const testCase of cases) {
    const run = await runArtifact(artifact, testCase.input, {
      sourceCode: options.sourceCode,
      eventBudget: options.eventBudget,
    })
    if (!run.ok || !run.script) {
      results.push({ id: testCase.id, status: 'failed', message: run.error || '生成器执行失败' })
      continue
    }
    const verification = run.script.verification
    degraded ||= verification?.degraded === true
    if (verification?.status === 'fail') {
      results.push({
        id: testCase.id,
        status: 'failed',
        message: verification.message || `结果不一致：${verification.actual} != ${verification.expected}`,
      })
    } else if (!options.sourceCode || !['javascript', 'python'].includes(artifact.language.toLowerCase()) || verification?.status === 'skipped') {
      results.push({ id: testCase.id, status: 'skipped', message: verification?.message || '当前语言未执行真实代码差分' })
    } else {
      results.push({ id: testCase.id, status: 'passed' })
    }
  }

  const failed = results.filter(result => result.status === 'failed')
  const passed = results.filter(result => result.status === 'passed')
  const realExecCapable = ['javascript', 'python'].includes(artifact.language.toLowerCase())
  const report: GeneratorValidationReport = {
    status: failed.length > 0 ? 'failed' : 'passed',
    checkedInputs: cases.length,
    issues: failed.map(result => ({
      code: 'boundary-validation',
      message: `${result.id}: ${result.message || '验证失败'}`,
    })),
    confidence: failed.length > 0
      ? 'low'
      : !realExecCapable || !options.sourceCode
        ? 'unverified'
        : degraded || passed.length !== cases.length
          ? 'medium'
          : 'high',
    cases: results,
  }
  return { ...artifact, validation: report }
}
