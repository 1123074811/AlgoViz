export const PLANE = { width: 800, height: 500, pad: 48 } as const

export interface Projector {
  (x: number, y: number): { x: number; y: number }
}

/** 数据坐标 → 场景坐标的线性映射。Y 轴翻转(数据上为正)。零宽度范围退化为居中。 */
export function makeProjector(xRange: [number, number], yRange: [number, number]): Projector {
  const [x0, x1] = xRange
  const [y0, y1] = yRange
  const innerW = PLANE.width - 2 * PLANE.pad
  const innerH = PLANE.height - 2 * PLANE.pad
  const dx = x1 - x0
  const dy = y1 - y0
  return (x, y) => ({
    x: PLANE.pad + (dx === 0 ? innerW / 2 : ((x - x0) / dx) * innerW),
    y: PLANE.pad + (dy === 0 ? innerH / 2 : ((y1 - y) / dy) * innerH),
  })
}
