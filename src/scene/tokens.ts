export type SemanticColorName =
  | 'idle' | 'primary' | 'compare' | 'active' | 'success' | 'danger' | 'window'

export interface SemanticColor {
  stroke: string
  fill: string
  text: string
}

/** Observable/D3 编辑数据可视化风：低饱和分类配色、浅底细描边、状态一眼可辨。
 *  Scene 视觉单一事实源。配色取自 design-demos/algoviz-gallery.html 已定稿方向，
 *  迁移方案见 docs/observable-restyle-migration-plan.md。 */
export const SEMANTIC_COLORS: Record<SemanticColorName, SemanticColor> = {
  idle:    { stroke: '#CFCFCF', fill: '#F3F3F4', text: '#232323' },
  primary: { stroke: '#4E79A7', fill: '#E1E9F1', text: '#232323' }, // steelblue
  compare: { stroke: '#F28E2B', fill: '#FBE7D3', text: '#B45309' }, // orange
  active:  { stroke: '#4E79A7', fill: '#E1E9F1', text: '#232323' }, // 同 primary
  success: { stroke: '#59A14F', fill: '#E6EFE4', text: '#3C7A36' }, // green
  danger:  { stroke: '#E15759', fill: '#FBE9E9', text: '#C0413F' }, // Tableau red
  window:  { stroke: '#BCD0E4', fill: '#F4F8FC', text: '#232323' },
}

/**
 * Neutral slate scale for non-semantic structural chrome: muted labels, index
 * numbers, dashed container borders, panel shadows. Kept separate from
 * SEMANTIC_COLORS (which encodes algorithm state) so the two are never confused.
 * Additive to the shared contract — does not alter any existing export.
 */
export const NEUTRALS = {
  /** Index numbers / secondary muted text + standalone connector strokes. */
  mutedText: '#8A8A8A',
  /** Section / structure labels. */
  labelText: '#6B6B6B',
  /** Slightly stronger body text inside panels. */
  bodyText: '#444444',
  /** Dashed structural frames / dividers (a touch darker than idle stroke). */
  frameStroke: '#E2E2E2',
  /** Drop-shadow flood color. */
  shadow: '#0F172A',
  /** Pure white surface (panels, node bodies). */
  surface: '#FFFFFF',
} as const

export const SHAPE = {
  // Observable 风更小圆角、更细描边、近乎扁平。
  cellRadius: 3,
  ringRadius: 6,
  strokeWidth: { thin: 1, base: 1.2, bold: 2.4 },
  shadow: {
    soft: 'drop-shadow(0 1px 2px rgba(15,23,42,0.05))',
    raised: 'drop-shadow(0 2px 6px rgba(15,23,42,0.08))',
  },
} as const

export const TYPO = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  // 衬线给标签/注解/标题用（Observable 解释性图表气质）；数值仍用 mono(等宽对齐)。
  serif: 'Georgia, "Times New Roman", "Songti SC", serif',
  // UI/正文无衬线回退。
  sans: '"Helvetica Neue", Arial, "Noto Sans SC", sans-serif',
  size: { label: 11, index: 11, value: 14, title: 18 },
  weight: { normal: 400, medium: 500, bold: 600 },
} as const

export const MOTION = {
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  // 放慢整体补间节奏：交换/移动等位移动画在常速下约 0.6s,更易看清过程。
  duration: { fast: 320, base: 600, slow: 950 },
} as const
