import type { AnimationScript, RendererType } from '@/types/animation'
import { AnimationBuilder } from './builder'

export interface GeneratorMeta {
  algorithm: string
  type: RendererType
}

export interface GeneratorResult {
  ok: boolean
  script?: AnimationScript
  error?: string
}

/** Execute an AI-generated generator body against the given input. Pure — runs
 *  via `new Function`. In production this runs inside a Web Worker (see
 *  runGenerator.ts); in tests it can be called directly with trusted sources. */
export function executeGenerator(source: string, input: unknown, meta: GeneratorMeta): GeneratorResult {
  try {
    const b = new AnimationBuilder(meta.algorithm, meta.type)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('input', 'b', source) as (input: unknown, b: AnimationBuilder) => void
    fn(input, b)
    return { ok: true, script: b.build() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
