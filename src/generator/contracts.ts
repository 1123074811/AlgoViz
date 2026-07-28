import type { RendererType } from '@/types/animation'

export const GENERATOR_ARTIFACT_VERSION = 1 as const
export const INPUT_CONTRACT_VERSION = 1 as const
export const BUILDER_PROTOCOL_VERSION = '1.1.0'
export const PROMPT_PROTOCOL_VERSION = '1.1.0'

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
  arrayItemKind?: InputValueKind
  objectPropertyKinds?: Record<string, InputValueKind>
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
  confidence?: 'high' | 'medium' | 'low' | 'unverified'
  cases?: Array<{
    id: string
    status: 'passed' | 'failed' | 'skipped'
    message?: string
  }>
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
  const arrayItems = samples
    .filter(Array.isArray)
    .flat()
  const arrayItemKinds = [...new Set(arrayItems.map(inputKind))]
  const objectPropertyKinds = Object.fromEntries(
    [...new Set(objects.flatMap(object => Object.keys(object)))]
      .sort()
      .map((key) => {
        const values = objects.filter(object => key in object).map(object => object[key])
        const kinds = [...new Set(values.map(inputKind))]
        return kinds.length === 1 ? [key, kinds[0]] : null
      })
      .filter((entry): entry is [string, InputValueKind] => entry !== null),
  )

  return {
    version: INPUT_CONTRACT_VERSION,
    acceptedKinds,
    requiredObjectKeys,
    ...(arrayItemKinds.length === 1 && { arrayItemKind: arrayItemKinds[0] }),
    ...(Object.keys(objectPropertyKinds).length > 0 && { objectPropertyKinds }),
    source: 'inferred',
  }
}

export interface BoundaryInput {
  id: string
  input: unknown
}

/** Small deterministic smoke set. Domain-specific no-solution/tie cases may be
 * supplied by callers because they cannot be inferred safely from shape alone. */
export function generateBoundaryInputs(contract: InputContract): BoundaryInput[] {
  const cases: BoundaryInput[] = []
  for (const kind of contract.acceptedKinds) {
    if (kind === 'array') {
      const item = seedValue(contract.arrayItemKind ?? 'number')
      cases.push(
        { id: 'empty', input: [] },
        { id: 'minimal', input: [item] },
        { id: 'duplicate', input: [item, item] },
      )
    } else if (kind === 'object') {
      const propertyKinds = contract.objectPropertyKinds ?? {}
      const keys = Object.keys(propertyKinds)
      const required = Object.fromEntries(
        contract.requiredObjectKeys.map(key => [key, seedValue(propertyKinds[key] ?? 'number')]),
      )
      const representative = Object.fromEntries(
        keys.map(key => [key, seedValue(propertyKinds[key])]),
      )
      cases.push(
        { id: 'empty-object', input: required },
        { id: 'minimal-object', input: { ...required, ...representative } },
      )
    } else if (kind === 'number') {
      cases.push({ id: 'zero', input: 0 }, { id: 'minimal', input: 1 }, { id: 'negative', input: -1 })
    } else if (kind === 'string') {
      cases.push({ id: 'empty', input: '' }, { id: 'minimal', input: 'a' }, { id: 'duplicate', input: 'aa' })
    } else if (kind === 'boolean') {
      cases.push({ id: 'false', input: false }, { id: 'true', input: true })
    } else {
      cases.push({ id: 'null', input: null })
    }
  }
  return cases.filter((item, index) =>
    cases.findIndex(candidate => stableValue(candidate.input) === stableValue(item.input)) === index,
  )
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

function seedValue(kind: InputValueKind): unknown {
  if (kind === 'array') return []
  if (kind === 'object') return {}
  if (kind === 'number') return 0
  if (kind === 'string') return ''
  if (kind === 'boolean') return false
  return null
}

function stableValue(value: unknown): string {
  return JSON.stringify(value, Object.keys(value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}).sort())
}
