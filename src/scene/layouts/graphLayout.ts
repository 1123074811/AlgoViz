import type { Point, SceneState } from '../types'

export function layoutGraph(scene: SceneState): Record<string, Point> {
  const vertices = Object.values(scene.entities)
    .filter(e => e.type === 'node' && e.variant === 'graph.vertex')
  if (vertices.length === 0) return {}

  const hasQueue = Object.keys(scene.entities).some(k => k.startsWith('queue_'))
  const hasStack = Object.keys(scene.entities).some(k => k.startsWith('stack_'))

  let cx = 500
  let cy = 300

  if (hasQueue) {
    cy = 220 // Shift graph up to make room for Queue at bottom
  }
  if (hasStack) {
    cx = 400 // Shift graph left to make room for Stack on right
  }

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
