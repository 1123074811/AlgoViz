import type { Point, SceneState } from '../types'

export function layoutGraph(scene: SceneState): Record<string, Point> {
  const vertices = Object.values(scene.entities)
    .filter(e => e.type === 'node' && e.variant === 'graph.vertex')
  if (vertices.length === 0) return {}

  const cx = 500
  const cy = 300
  const radius = Math.max(120, Math.min(280, vertices.length * 32))
  const positions: Record<string, Point> = {}

  vertices.forEach((v, i) => {
    const angle = (2 * Math.PI * i) / vertices.length - Math.PI / 2
    positions[v.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })
  return positions
}
