import { MOTION } from '../tokens'

/**
 * Shared keyframe/animation CSS for scene primitives. Kept as plain strings so
 * each primitive can inline them in a local <style>, while the timing/easing
 * stays a single source of truth via the MOTION token.
 */
// Observable 风克制：当前单元的强调环改为「静态柔光」(元素自带 opacity 0.08)，
// 去掉无限脉冲动画；保留一次性 pop 落定。
export const CELL_KEYFRAMES = `
  .cell-pulse { animation: cell-pop 0.5s ${MOTION.easing}; transform-box: fill-box; transform-origin: center; }
  @keyframes cell-pop { 0% { transform: scale(0.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
`

export const EDGE_FLOW_KEYFRAMES = `
  .scene-edge-flow { animation: scene-dash-flow 0.7s linear infinite; }
  @keyframes scene-dash-flow { to { stroke-dashoffset: -22; } }
`

// 落定 bump(对齐 demo .bump/@keyframes bump)：元素就位时一次性轻微放大回弹。
// 与 cell-pop 区别：bump 不带初始缩小,用于"已存在元素被强调/落位"。
export const BUMP_KEYFRAMES = `
  .scene-bump { animation: scene-bump 0.5s ${MOTION.easing}; transform-box: fill-box; transform-origin: center; }
  @keyframes scene-bump { 0% { transform: scale(1); } 35% { transform: scale(1.05); } 100% { transform: scale(1); } }
`

// lens 聚焦光斑跟随当前元素的过渡(对齐 demo .focusdot 的 transition:cx/cy)。
// 集中时长到 MOTION,供 FocusLens 内联到 style。
export const LENS_TRANSITION = `cx ${MOTION.duration.fast}ms ${MOTION.easing}, cy ${MOTION.duration.fast}ms ${MOTION.easing}, opacity 0.3s`
