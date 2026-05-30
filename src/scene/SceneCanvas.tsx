import type { AnimationScript } from '@/types/animation'
import { deriveSceneState } from './SceneEngine'
import CellView from './primitives/CellView'
import EdgeView from './primitives/EdgeView'
import LabelView from './primitives/LabelView'
import NodeView, { NodeStyles } from './primitives/NodeView'
import PointerView from './primitives/PointerView'
import type { SceneEntity } from './types'

interface SceneCanvasProps {
  script: AnimationScript
  currentStep: number
}

export default function SceneCanvas({ script, currentStep }: SceneCanvasProps) {
  const scene = deriveSceneState(script, currentStep)
  const entities = Object.values(scene.entities)
  const edges = Object.values(scene.edges)
  const pointers = Object.values(scene.pointers)
  const labels = Object.values(scene.labels)
  const latestNote = scene.notes?.[scene.notes.length - 1]
  const isEmpty = entities.length === 0 && edges.length === 0 && pointers.length === 0 && labels.length === 0
  const viewBox = computeViewBox(entities, labels)

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      <svg viewBox={viewBox} className="h-full w-full">
        <defs>
          <filter id="sceneShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0F172A" floodOpacity="0.12" />
          </filter>
          <marker id="sceneArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8" />
          </marker>
          <marker id="sceneDependencyArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="#F59E0B" />
          </marker>
          <marker id="scenePointerArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="#93C5FD" />
          </marker>
        </defs>
        <NodeStyles />
        {edges.map((edge) => <EdgeView key={edge.id} edge={edge} scene={scene} />)}
        {entities.map((entity) => entity.type === 'cell' ? <CellView key={entity.id} cell={entity} /> : null)}
        {entities.map((entity) => entity.type === 'node' ? <NodeView key={entity.id} node={entity} /> : null)}
        {labels.map((label) => <LabelView key={label.id} label={label} />)}
        {pointers.map((pointer, index) => <PointerView key={pointer.id} pointer={pointer} scene={scene} index={index} />)}
        <style>{`
          .scene-edge-flow {
            animation: scene-dash-flow 0.7s linear infinite;
          }
          @keyframes scene-dash-flow {
            to { stroke-dashoffset: -22; }
          }
        `}</style>
      </svg>
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-center text-sm text-slate-500 shadow-sm">
            当前步骤尚未生成场景对象
          </div>
        </div>
      )}
      {latestNote && (
        <div className="absolute bottom-5 left-1/2 max-w-xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg">
          {latestNote}
        </div>
      )}
    </div>
  )
}

function computeViewBox(entities: SceneEntity[], labels: SceneEntity[]): string {
  const positioned = [...entities, ...labels].filter(
    (e): e is SceneEntity & { position: { x: number; y: number } } =>
      'position' in e && !!e.position
  )
  if (positioned.length === 0) return '0 0 1000 620'

  const padding = 100
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const e of positioned) {
    const w = ('size' in e ? e.size?.width : 80) ?? 80
    const h = ('size' in e ? e.size?.height : 60) ?? 60
    const hw = w / 2; const hh = h / 2
    if (e.position.x - hw < minX) minX = e.position.x - hw
    if (e.position.y - hh < minY) minY = e.position.y - hh
    if (e.position.x + hw > maxX) maxX = e.position.x + hw
    if (e.position.y + hh > maxY) maxY = e.position.y + hh
  }

  const width = Math.max(1000, maxX - minX + padding * 2)
  const height = Math.max(620, maxY - minY + padding * 2)
  return `${minX - padding} ${minY - padding} ${width} ${height}`
}
