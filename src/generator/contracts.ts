import type { RendererType } from '@/types/animation'

export const GENERATOR_ARTIFACT_VERSION = 1 as const
export const INPUT_CONTRACT_VERSION = 1 as const
export const BUILDER_PROTOCOL_VERSION = '1.0.0'
export const PROMPT_PROTOCOL_VERSION = '1.0.0'

export type AlgorithmCategory =
  | 'linear'
  | 'recursion'
  | 'grid'
  | 'graph'
  | 'tree'
  | 'dp'
  | 'structure'

export type InputValueKind = 'array' | 'object' | 'number' | 'string' | 'boolean' | 'null'

export interface InputContract {
  version: typeof INPUT_CONTRACT_VERSION
  acceptedKinds: InputValueKind[]
  requiredObjectKeys: string[]
  source: 'inferred' | 'legacy'
}

export interface GeneratorValidationIssue {
  code: string
  message: string
}

export interface GeneratorValidationReport {
  status: 'pending' | 'passed' | 'failed'
  checkedInputs: number
  issues: GeneratorValidationIssue[]
}

export interface GeneratorArtifact {
  artifactVersion: typeof GENERATOR_ARTIFACT_VERSION
  sourceHash: string
  cacheKey: string
  language: string
  category: AlgorithmCategory
  algorithm: string
  rendererType: RendererType
  inputContract: InputContract
  generatorSource: string
  builderVersion: string
  promptVersion: string
  validation: GeneratorValidationReport
  expectedResult?: string
  timeComplexity?: string
  spaceComplexity?: string
}

export interface CreateGeneratorArtifactArgs {
  sourceCode: string
  language: string
  category: AlgorithmCategory
  algorithm: string
  rendererType: RendererType
  generatorSource: string
  inputSamples?: unknown[]
  expectedResult?: string
  timeComplexity?: string
  spaceComplexity?: string
}

const ALL_INPUT_KINDS: InputValueKind[] = ['array', 'object', 'number', 'string', 'boolean', 'null']

export function createGeneratorArtifact(args: CreateGeneratorArtifactArgs): GeneratorArtifact {
  const sourceHash = hashSource(args.sourceCode)
  const language = args.language.trim().toLowerCase()
  return {
    artifactVersion: GENERATOR_ARTIFACT_VERSION,
    sourceHash,
    cacheKey: createGeneratorCacheKey({
      sourceHash,
      language,
      builderVersion: BUILDER_PROTOCOL_VERSION,
      promptVersion: PROMPT_PROTOCOL_VERSION,
    }),
    language,
    category: args.category,
    algorithm: args.algorithm,
    rendererType: args.rendererType,
    inputContract: inferInputContract(args.inputSamples ?? []),
    generatorSource: args.generatorSource,
    builderVersion: BUILDER_PROTOCOL_VERSION,
    promptVersion: PROMPT_PROTOCOL_VERSION,
    validation: { status: 'pending', checkedInputs: 0, issues: [] },
    ...(args.expectedResult !== undefined && { expectedResult: args.expectedResult }),
    ...(args.timeComplexity !== undefined && { timeComplexity: args.timeComplexity }),
    ...(args.spaceComplexity !== undefined && { spaceComplexity: args.spaceComplexity }),
  }
}

export function createLegacyGeneratorArtifact(args: {
  sourceCode: string
  language: string
  algorithm: string
  rendererType: RendererType
  generatorSource: string
}): GeneratorArtifact {
  return {
    ...createGeneratorArtifact({
      ...args,
      category: 'linear',
    }),
    inputContract: {
      version: INPUT_CONTRACT_VERSION,
      acceptedKinds: [...ALL_INPUT_KINDS],
      requiredObjectKeys: [],
      source: 'legacy',
    },
  }
}

export function createGeneratorCacheKey(input: {
  sourceHash: string
  language: string
  builderVersion: string
  promptVersion: string
}): string {
  return [
    input.sourceHash,
    input.language.trim().toLowerCase(),
    input.builderVersion,
    input.promptVersion,
  ].join(':')
}

export function inferInputContract(samples: unknown[]): InputContract {
  if (samples.length === 0) {
    return {
      version: INPUT_CONTRACT_VERSION,
      acceptedKinds: [...ALL_INPUT_KINDS],
      requiredObjectKeys: [],
      source: 'inferred',
    }
  }

  const acceptedKinds = [...new Set(samples.map(inputKind))]
  const objects = samples.filter(
    (sample): sample is Record<string, unknown> =>
      sample !== null && typeof sample === 'object' && !Array.isArray(sample),
  )
  // One sample cannot prove that every present field is mandatory. Require a
  // field only after it appears across at least two independently observed inputs.
  const requiredObjectKeys = objects.length < 2
    ? []
    : Object.keys(objects[0]).filter((key) => objects.every((object) => key in object)).sort()

  return {
    version: INPUT_CONTRACT_VERSION,
    acceptedKinds,
    requiredObjectKeys,
    source: 'inferred',
  }
}

export function validateInputContract(
  contract: InputContract,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const kind = inputKind(value)
  if (!contract.acceptedKinds.includes(kind)) {
    return {
      ok: false,
      error: `输入类型应为 ${contract.acceptedKinds.join(' / ')}，实际为 ${kind}`,
    }
  }

  if (kind === 'object') {
    const object = value as Record<string, unknown>
    const missing = contract.requiredObjectKeys.filter((key) => !(key in object))
    if (missing.length > 0) {
      return { ok: false, error: `输入缺少必需字段：${missing.join(', ')}` }
    }
  }

  return { ok: true, value }
}

export function isGeneratorArtifact(value: unknown): value is GeneratorArtifact {
  if (!value || typeof value !== 'object') return false
  const artifact = value as Partial<GeneratorArtifact>
  return artifact.artifactVersion === GENERATOR_ARTIFACT_VERSION
    && artifact.inputContract?.version === INPUT_CONTRACT_VERSION
    && typeof artifact.sourceHash === 'string'
    && typeof artifact.cacheKey === 'string'
    && typeof artifact.generatorSource === 'string'
    && typeof artifact.builderVersion === 'string'
    && typeof artifact.promptVersion === 'string'
}

/** Stable cache identity only; this is not used as a security checksum. */
export function hashSource(source: string): string {
  let first = 0xdeadbeef ^ source.length
  let second = 0x41c6ce57 ^ source.length
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 2654435761)
    second = Math.imul(second ^ code, 1597334677)
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909)
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909)
  return `${(second >>> 0).toString(16).padStart(8, '0')}${(first >>> 0).toString(16).padStart(8, '0')}`
}

function inputKind(value: unknown): InputValueKind {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}
