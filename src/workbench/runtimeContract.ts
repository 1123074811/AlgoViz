import type { AnimationResult } from '@/types/animation'

export type RuntimeLanguageCapability = 'worker' | 'static-only'

export function getRuntimeLanguageCapability(
  language: 'python' | 'javascript' | 'cpp' | 'java',
): RuntimeLanguageCapability {
  return language === 'python' || language === 'javascript' ? 'worker' : 'static-only'
}

export function normalizeRuntimeValue(value: unknown): AnimationResult | undefined {
  const seen = new WeakSet<object>()

  const normalize = (current: unknown): AnimationResult | undefined => {
    if (current === undefined) return undefined
    if (current === null || typeof current === 'string' || typeof current === 'boolean') return current
    if (typeof current === 'number') {
      if (Number.isNaN(current)) return 'NaN'
      if (current === Infinity) return 'Infinity'
      if (current === -Infinity) return '-Infinity'
      return current
    }
    if (typeof current === 'bigint') return current.toString()
    if (typeof current !== 'object') return String(current)
    if (seen.has(current)) return '[Circular]'
    seen.add(current)

    if (Array.isArray(current)) {
      return current.map(item => normalize(item) ?? null)
    }
    if (current instanceof Set) {
      return [...current].map(item => normalize(item) ?? null)
    }
    if (current instanceof Map) {
      return [...current.entries()].map(([key, item]) => [
        normalize(key) ?? null,
        normalize(item) ?? null,
      ])
    }

    return Object.fromEntries(
      Object.entries(current).map(([key, item]) => [key, normalize(item) ?? null]),
    )
  }

  return normalize(value)
}

export function formatRuntimeOutput(value: unknown): string {
  const normalized = normalizeRuntimeValue(value)
  if (normalized === undefined) return 'undefined'
  if (typeof normalized === 'string') return normalized
  return JSON.stringify(normalized, null, 2)
}
