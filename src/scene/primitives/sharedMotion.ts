import { MOTION } from '../tokens'

/**
 * Shared keyframe/animation CSS for scene primitives. Kept as plain strings so
 * each primitive can inline them in a local <style>, while the timing/easing
 * stays a single source of truth via the MOTION token.
 */
export const CELL_KEYFRAMES = `
  .cell-pulse { animation: cell-pop 0.5s ${MOTION.easing}; transform-box: fill-box; transform-origin: center; }
  .cell-current-ring { animation: cell-ring 0.9s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes cell-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
  @keyframes cell-ring { from { opacity: 0.15; transform: scale(0.94); } to { opacity: 0.02; transform: scale(1.12); } }
`

export const EDGE_FLOW_KEYFRAMES = `
  .scene-edge-flow { animation: scene-dash-flow 0.7s linear infinite; }
  @keyframes scene-dash-flow { to { stroke-dashoffset: -22; } }
`
