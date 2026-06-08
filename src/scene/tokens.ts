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

/**
 * Neutral slate scale for non-semantic structural chrome: muted labels, index
 * numbers, dashed container borders, panel shadows. Kept separate from
 * SEMANTIC_COLORS (which encodes algorithm state) so the two are never confused.
 * Additive to the shared contract — does not alter any existing export.
 */
export const NEUTRALS = {
  /** Index numbers / secondary muted text + standalone connector strokes. */
  mutedText: '#94A3B8',
  /** Section / structure labels. */
  labelText: '#64748B',
  /** Slightly stronger body text inside panels. */
  bodyText: '#475569',
  /** Dashed structural frames / dividers (a touch darker than idle stroke). */
  frameStroke: '#CBD5E1',
  /** Drop-shadow flood color. */
  shadow: '#0F172A',
  /** Pure white surface (panels, node bodies). */
  surface: '#FFFFFF',
} as const

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
  // 放慢整体补间节奏：交换/移动等位移动画在常速下约 0.6s,更易看清过程。
  duration: { fast: 320, base: 600, slow: 950 },
} as const
