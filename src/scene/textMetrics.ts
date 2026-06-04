/** Estimate rendered text width (px) for monospace SVG text. */
export function measureTextWidth(text: string, fontSize = 14): number {
  // monospace char advance ≈ 0.6 × fontSize
  return text.length * fontSize * 0.6
}

/** Adaptive width for a rectangular node holding the given text. */
export function measureNodeWidth(
  text: string,
  opts: { fontSize?: number; padding?: number; min?: number; max?: number } = {}
): number {
  const { fontSize = 14, padding = 20, min = 48, max = 260 } = opts
  return Math.max(min, Math.min(max, Math.ceil(measureTextWidth(text, fontSize) + padding)))
}

/**
 * Estimate the rendered width of a rectangular node from its fields.
 * Mirrors NodeView.renderRect: each field gets a slot sized to its longest text;
 * total = sum of per-field widths, floored by an optional base width.
 */
export function measureNodeRenderWidth(
  fields: { value?: string | number | boolean | null; label?: string; id?: string }[],
  baseWidth = 96
): number {
  const count = Math.max(fields.length, 1)
  const perField = fields.reduce((max, f) => {
    const text = (f.value ?? f.label ?? f.id ?? '').toString()
    return Math.max(max, measureNodeWidth(text, { padding: 14, min: 36, max: 180 }))
  }, 0)
  return Math.max(baseWidth, perField * count)
}

/** Truncate text to fit a max width, adding an ellipsis. */
export function truncateToWidth(text: string, maxWidth: number, fontSize = 12): string {
  const charW = fontSize * 0.6
  const maxChars = Math.max(1, Math.floor(maxWidth / charW))
  return text.length <= maxChars ? text : text.slice(0, Math.max(1, maxChars - 1)) + '…'
}
