export type SemanticColorName =
  | 'idle' | 'primary' | 'compare' | 'active' | 'success' | 'danger' | 'window'

export interface SemanticColor {
  stroke: string
  fill: string
  text: string
}

/** 精修学术浅色：克制配色、浅底深描边、状态一眼可辨。Scene 视觉单一事实源。 */
export const SEMANTIC_COLORS: Record<SemanticColorName, SemanticColor> = {
  idle:    { stroke: '#E2E8F0', fill: '#F8FAFC', text: '#1E293B' },
  primary: { stroke: '#3B82F6', fill: '#EFF6FF', text: '#1E293B' },
  compare: { stroke: '#F59E0B', fill: '#FFFBEB', text: '#B45309' },
  active:  { stroke: '#3B82F6', fill: '#EFF6FF', text: '#1E293B' },
  success: { stroke: '#10B981', fill: '#ECFDF5', text: '#047857' },
  danger:  { stroke: '#EF4444', fill: '#FEF2F2', text: '#EF4444' },
  window:  { stroke: '#BFDBFE', fill: '#F8FBFF', text: '#1E293B' },
}

export const SHAPE = {
  cellRadius: 8,
  ringRadius: 10,
  strokeWidth: { thin: 1.15, base: 1.5, bold: 3.4 },
  shadow: {
    soft: 'drop-shadow(0 2px 6px rgba(15,23,42,0.06))',
    raised: 'drop-shadow(0 8px 14px rgba(15,23,42,0.12))',
  },
} as const

export const TYPO = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  size: { label: 10, index: 11, value: 14, title: 16 },
  weight: { normal: 400, medium: 500, bold: 600 },
} as const

export const MOTION = {
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  duration: { fast: 180, base: 320, slow: 480 },
} as const
