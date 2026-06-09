import type { AnimationScript, RendererType } from '@/types/animation'
import { AnimationBuilder } from './builder'

export interface GeneratorMeta {
  algorithm: string
  type: RendererType
}

/** Structured failure classification, used by callers to pick a fallback state. */
export type GeneratorFailureKind = 'runtime'

export interface GeneratorResult {
  ok: boolean
  script?: AnimationScript
  error?: string
  /** Present only on failure: why the generator failed (e.g. runtime crash/timeout). */
  kind?: GeneratorFailureKind
}

/** Execute an AI-generated generator body against the given input. Pure — runs
 *  via `new Function`. In production this runs inside a Web Worker (see
 *  runGenerator.ts); in tests it can be called directly with trusted sources. */
export function executeGenerator(source: string, input: unknown, meta: GeneratorMeta): GeneratorResult {
  const recoveredGlobals = new Set<string>()
  try {
    return executeGeneratorAttempt(source, input, meta, recoveredGlobals)
  } catch (e) {
    const missingName = getMissingVariableName(e)
    if (!missingName) return { ok: false, error: e instanceof Error ? e.message : String(e), kind: 'runtime' }
    recoveredGlobals.add(missingName)
  }

  for (let i = 0; i < 4; i++) {
    try {
      return executeGeneratorAttempt(source, input, meta, recoveredGlobals)
    } catch (e) {
      const missingName = getMissingVariableName(e)
      if (!missingName || recoveredGlobals.has(missingName)) {
        return { ok: false, error: e instanceof Error ? e.message : String(e), kind: 'runtime' }
      }
      recoveredGlobals.add(missingName)
    }
  }
  return { ok: false, error: '生成器引用了过多未声明变量', kind: 'runtime' }
}

function executeGeneratorAttempt(
  source: string,
  input: unknown,
  meta: GeneratorMeta,
  recoveredGlobals: Set<string>,
): GeneratorResult {
  const b = new AnimationBuilder(meta.algorithm, meta.type)
  const prefix = [...recoveredGlobals]
    .map(name => `let ${name} = 0;`)
    .join('\n')
  const fn = new Function('input', 'b', prefix ? `${prefix}\n${source}` : source) as (input: unknown, b: AnimationBuilder) => void
  fn(input, b)
  return { ok: true, script: b.build() }
}

function getMissingVariableName(error: unknown): string | null {
  if (!(error instanceof ReferenceError)) return null
  const match = /^([A-Za-z_$][\w$]*) is not defined$/.exec(error.message)
  return match?.[1] ?? null
}
