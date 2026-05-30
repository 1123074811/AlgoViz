import { useState, useRef, useEffect } from 'react'
import type { AnimationScript } from '@/types/animation'
import { deriveSceneState } from './SceneEngine'
import CellView from './primitives/CellView'
import ContainerView from './primitives/ContainerView'
import EdgeView from './primitives/EdgeView'
import LabelView from './primitives/LabelView'
import NodeView, { NodeStyles } from './primitives/NodeView'
import PointerView from './primitives/PointerView'
import type { SceneCell, SceneEntity } from './types'

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

  // 1. Zoom and Pan state
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const initialPanOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom and pan when script changes
  useEffect(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }, [script])

  // 2. Compute viewBox dimensions (centered on content with 1.6 aspect ratio)
  const { xStart, yStart, width, height } = computeViewBoxDimensions(entities, labels)

  // Apply zoom to width/height
  const viewBoxWidth = width / zoom
  const viewBoxHeight = height / zoom

  // Apply pan to start position
  const viewBoxX = xStart + (width - viewBoxWidth) / 2 + panOffset.x
  const viewBoxY = yStart + (height - viewBoxHeight) / 2 + panOffset.y

  const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`

  // 3. Zoom / Pan handlers
  const handleZoomIn = () => {
    setZoom(z => Math.min(4.0, z * 1.2))
  }

  const handleZoomOut = () => {
    setZoom(z => Math.max(0.5, z / 1.2))
  }

  const handleReset = () => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click drags
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    initialPanOffset.current = panOffset
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    const rect = containerRef.current.getBoundingClientRect()
    const ratioX = viewBoxWidth / (rect.width || 1)
    const ratioY = viewBoxHeight / (rect.height || 1)

    setPanOffset({
      x: initialPanOffset.current.x - dx * ratioX,
      y: initialPanOffset.current.y - dy * ratioY
    })
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    // We prevent default wheel scrolling to avoid page jumping
    e.preventDefault()
    const zoomFactor = 1.15
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor
    setZoom(Math.max(0.5, Math.min(4.0, nextZoom)))
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onWheel={handleWheel}
      className={`relative h-full w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <svg viewBox={viewBox} className="h-full w-full pointer-events-none">
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
        {renderContainers(entities)}
        <g className="pointer-events-auto">
          {edges.map((edge) => <EdgeView key={edge.id} edge={edge} scene={scene} />)}
          {entities.map((entity) => entity.type === 'cell' ? <CellView key={entity.id} cell={entity} /> : null)}
          {entities.map((entity) => entity.type === 'node' ? <NodeView key={entity.id} node={entity} /> : null)}
          {labels.map((label) => <LabelView key={label.id} label={label} />)}
          {pointers.map((pointer, index) => <PointerView key={pointer.id} pointer={pointer} scene={scene} index={index} />)}
        </g>
        <style>{`
          .scene-edge-flow {
            animation: scene-dash-flow 0.7s linear infinite;
          }
          @keyframes scene-dash-flow {
            to { stroke-dashoffset: -22; }
          }
        `}</style>
      </svg>

      {/* Floating Zoom / Pan Controls */}
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className="absolute top-4 right-4 flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md z-10 select-none"
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <div className="h-4 w-px bg-slate-200 mx-0.5" />
        <button
          onClick={handleReset}
          title="Reset View"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
          </svg>
        </button>
      </div>

      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-center text-sm text-slate-500 shadow-sm pointer-events-auto">
            当前步骤尚未生成场景对象
          </div>
        </div>
      )}
      {latestNote && (
        <div className="absolute bottom-5 left-1/2 max-w-xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg pointer-events-none">
          {latestNote}
        </div>
      )}
    </div>
  )
}

function renderContainers(entities: SceneEntity[]) {
  const cells = entities.filter(e => e.type === 'cell') as SceneCell[]
  const stackCells = cells.filter(c => c.id.startsWith('stack_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const queueCells = cells.filter(c => c.id.startsWith('queue_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  return (
    <>
      {stackCells.length > 0 && <ContainerView type="stack" cells={stackCells} />}
      {queueCells.length > 0 && <ContainerView type="queue" cells={queueCells} />}
    </>
  )
}

function computeViewBoxDimensions(
  entities: SceneEntity[],
  labels: SceneEntity[]
): { xStart: number; yStart: number; width: number; height: number } {
  const positioned = [...entities, ...labels].filter(
    (e): e is SceneEntity & { position: { x: number; y: number } } =>
      'position' in e && !!e.position
  )
  
  if (positioned.length === 0) {
    return { xStart: 0, yStart: 0, width: 1000, height: 620 }
  }

  const padding = 60
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const e of positioned) {
    const w = ('size' in e ? e.size?.width : 80) ?? 80
    const h = ('size' in e ? e.size?.height : 60) ?? 60
    const hw = w / 2
    const hh = h / 2
    if (e.position.x - hw < minX) minX = e.position.x - hw
    if (e.position.y - hh < minY) minY = e.position.y - hh
    if (e.position.x + hw > maxX) maxX = e.position.x + hw
    if (e.position.y + hh > maxY) maxY = e.position.y + hh
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const contentWidth = maxX - minX
  const contentHeight = maxY - minY

  // Target aspect ratio of 1.6 (approx 16:10 or 1000:620)
  const targetRatio = 1.6
  
  let viewBoxWidth = contentWidth + padding * 2
  let viewBoxHeight = contentHeight + padding * 2

  if (viewBoxWidth / viewBoxHeight > targetRatio) {
    // Width is the limiting dimension, grow height to match aspect ratio
    viewBoxHeight = viewBoxWidth / targetRatio
  } else {
    // Height is the limiting dimension, grow width to match aspect ratio
    viewBoxWidth = viewBoxHeight * targetRatio
  }

  // Minimum dimensions to prevent excessive zoom-in on tiny contents
  const minWidth = 720
  const minHeight = minWidth / targetRatio // 450

  const finalWidth = Math.max(minWidth, viewBoxWidth)
  const finalHeight = Math.max(minHeight, viewBoxHeight)

  const xStart = centerX - finalWidth / 2
  const yStart = centerY - finalHeight / 2

  return { xStart, yStart, width: finalWidth, height: finalHeight }
}
