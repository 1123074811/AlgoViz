import { hasGenerator } from './generators'

/**
 * Normalize an AI-provided algorithm identifier to match the built-in generator
 * registry keys (snake_case). Handles common variations like "Selection-Sort",
 * "selectionSort", "selection sort".
 */
export function normalizeAlgoId(id: string): string {
  return id
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // camelCase → camel_Case
    .toLowerCase()
    .replace(/[\s-]+/g, '_') // spaces / hyphens → underscore
    .replace(/_+/g, '_') // collapse repeats
}

/**
 * If the AI-identified algorithm corresponds to a built-in generator, return its
 * canonical id so the frontend can drive the animation locally from input data
 * (live mode). Returns null for unrecognized / custom algorithms.
 */
export function recognizeAlgorithm(algorithm: string | undefined | null): string | null {
  if (!algorithm) return null
  const id = normalizeAlgoId(algorithm)
  return hasGenerator(id) ? id : null
}
