import type { AnimationScript, AnimationStep } from '@/types/animation'

const VALID_ACTION_TYPES = new Set([
  'highlight', 'swap', 'compare', 'move', 'insert', 'delete', 'mark', 'annotate', 'edge',
])

const VALID_COLORS = new Set(['primary', 'success', 'warning', 'danger', 'muted'])

const VALID_RENDERER_TYPES = new Set(['array', 'graph', 'tree', 'matrix'])

export function parseAIResponse(raw: string): AnimationScript | null {
  // Try multiple extraction strategies
  let json: unknown

  // Strategy 1: Direct JSON parse
  try {
    json = JSON.parse(raw.trim())
  } catch {
    // Strategy 2: Extract from markdown code block ```json ... ```
    const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (blockMatch) {
      try {
        json = JSON.parse(blockMatch[1].trim())
      } catch {
        // Strategy 3: Find first { and last } to extract JSON object
        const firstBrace = raw.indexOf('{')
        const lastBrace = raw.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            json = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
          } catch {
            return null
          }
        } else {
          return null
        }
      }
    } else {
      // Try strategy 3 directly
      const firstBrace = raw.indexOf('{')
      const lastBrace = raw.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          json = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
        } catch {
          return null
        }
      } else {
        return null
      }
    }
  }

  // Validate and sanitize
  return validateAndSanitize(json)
}

function validateAndSanitize(raw: unknown): AnimationScript | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // Required top-level fields
  if (typeof obj.algorithm !== 'string') return null
  if (!obj.complexity || typeof obj.complexity !== 'object') return null
  if (!obj.initialState || typeof obj.initialState !== 'object') return null
  if (!Array.isArray(obj.steps)) return null

  // Validate complexity
  const complexity = obj.complexity as Record<string, unknown>
  const time = complexity.time as Record<string, string> | undefined
  if (!time) return null
  const best = time.best || 'O(?)'
  const average = time.average || 'O(?)'
  const worst = time.worst || 'O(?)'
  const space = typeof complexity.space === 'string' ? complexity.space : 'O(?)'

  // Validate initialState
  const is = obj.initialState as Record<string, unknown>
  const rendererType = VALID_RENDERER_TYPES.has(String(is.type)) ? String(is.type) : 'array'
  const data = Array.isArray(is.data) ? (is.data as number[]).map(Number) : []
  if (data.length === 0) return null

  // Validate and sanitize steps
  const steps: AnimationStep[] = []
  for (let i = 0; i < (obj.steps as unknown[]).length; i++) {
    const step = sanitizeStep((obj.steps as unknown[])[i], i + 1)
    if (step) {
      steps.push(step)
    }
  }

  if (steps.length === 0) return null

  return {
    algorithm: obj.algorithm,
    complexity: { time: { best, average, worst }, space },
    initialState: { type: rendererType as AnimationScript['initialState']['type'], data },
    steps,
  }
}

function sanitizeStep(raw: unknown, fallbackId: number): AnimationStep | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>

  const stepId = typeof s.stepId === 'number' ? s.stepId : fallbackId
  const codeLine = typeof s.codeLine === 'number' ? Math.max(0, s.codeLine) : 0

  // Validate description
  const desc = s.description as Record<string, string> | undefined
  const zh = desc?.zh || `步骤 ${stepId}`
  const en = desc?.en || `Step ${stepId}`

  // Validate action
  const action = s.action as Record<string, unknown> | undefined
  if (!action) return null

  const actionType = VALID_ACTION_TYPES.has(String(action.type))
    ? String(action.type)
    : 'highlight'

  const targets: number[] = Array.isArray(action.targets)
    ? (action.targets as unknown[]).map(Number).filter((n) => !isNaN(n))
    : []

  const color = VALID_COLORS.has(String(action.color))
    ? String(action.color)
    : 'primary'

  // Validate stats
  const stats = s.stats as Record<string, number> | undefined
  const comparisons = typeof stats?.comparisons === 'number' ? stats.comparisons : 0
  const swaps = typeof stats?.swaps === 'number' ? stats.swaps : 0
  const accesses = typeof stats?.accesses === 'number' ? stats.accesses : 0

  return {
    stepId,
    codeLine,
    description: { zh, en },
    action: {
      type: actionType as AnimationStep['action']['type'],
      targets,
      color: color as AnimationStep['action']['color'],
    },
    stats: { comparisons, swaps, accesses },
  }
}
